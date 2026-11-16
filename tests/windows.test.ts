import test from 'node:test';
import assert from 'node:assert/strict';
import { WindowsDesktop, windowsTools } from '../electron/windows';
import { desktopFor } from '../electron/desktop';
import { browserChannel } from '../electron/browser-channel';

const observation={window_id:42,process_id:7,process_start:'12345',window_name:'Sample',root_id:'root.42',elements:[{id:'field.1',name:'Note'}]};
test('platform catalogs expose only the active desktop backend',()=>{
  assert(desktopFor('darwin').tools().every(t=>t.name.startsWith('mac_')));
  assert(desktopFor('win32','/resources').tools().every(t=>t.name.startsWith('win_')));
  assert.deepEqual(desktopFor('linux').tools(),[]);
  assert(windowsTools.filter(t=>['win_click','win_type'].includes(t.name)).every(t=>!t.readOnly));
});
test('Windows actions bind observed window, process generation, and element, then consume the receipt',async()=>{
  const requests:any[]=[];const desktop=new WindowsDesktop('helper',async(_bin,r)=>{requests.push(r);return r.operation==='observe'?observation:{verified:true};});
  const seen=await desktop.call('win_observe',{window_id:42});
  await assert.rejects(()=>desktop.call('win_click',{window_id:43,snapshot:seen.snapshot,element:'field.1'}),/mismatched/);
  await assert.rejects(()=>desktop.call('win_click',{window_id:42,snapshot:seen.snapshot,element:'not-observed'}),/mismatched/);
  await desktop.call('win_type',{window_id:42,snapshot:seen.snapshot,element:'field.1',text:'$(do not execute); "literal"',process_id:999,process_start:'forged'});
  assert.equal(requests.at(-1).process_id,7);assert.equal(requests.at(-1).process_start,'12345');assert.equal(requests.at(-1).text,'$(do not execute); "literal"');
  await assert.rejects(()=>desktop.call('win_type',{window_id:42,snapshot:seen.snapshot,element:'field.1',text:'again'}),/stale/);
  assert.equal(requests.length,2);
});
test('re-observing invalidates previous snapshots and failed actions cannot replay',async()=>{
  const desktop=new WindowsDesktop('helper',async(_b,r)=>{if(r.operation==='observe')return observation;throw new Error('Uncertain action');});
  const first=await desktop.call('win_observe',{window_id:42});const second=await desktop.call('win_observe',{window_id:42});
  await assert.rejects(()=>desktop.call('win_click',{window_id:42,snapshot:first.snapshot,element:'field.1'}),/stale/);
  await assert.rejects(()=>desktop.call('win_click',{window_id:42,snapshot:second.snapshot,element:'field.1'}),/Uncertain/);
  await assert.rejects(()=>desktop.call('win_click',{window_id:42,snapshot:second.snapshot,element:'field.1'}),/stale/);
});
test('expired Windows observations and invalid identifiers are refused without native calls',async()=>{
  const oldNow=Date.now;let now=1000;Date.now=()=>now;let calls=0;
  try{
    const desktop=new WindowsDesktop('helper',async()=>{calls++;return observation;});const seen=await desktop.call('win_observe',{window_id:42});now+=121000;
    await assert.rejects(()=>desktop.call('win_click',{window_id:42,snapshot:seen.snapshot,element:'field.1'}),/stale/);
    await assert.rejects(()=>desktop.call('win_windows',{process_id:'7'}),/identifier/);assert.equal(calls,1);
  }finally{Date.now=oldNow;}
});
test('Windows browser uses installed Chrome, otherwise Edge, without changing Mac choice',()=>{
  assert.equal(browserChannel('win32',()=>false,{PROGRAMFILES:'C:\\Program Files'}),'msedge');
  assert.equal(browserChannel('win32',p=>p==='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',{PROGRAMFILES:'C:\\Program Files'}),'chrome');
  assert.equal(browserChannel('darwin',()=>false,{}),'chrome');
});
