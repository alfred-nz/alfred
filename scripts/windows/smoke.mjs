import { _electron as electron } from 'playwright';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {WindowsDesktop}=require('../../dist-electron/electron/windows.js');
const {nativeRequest}=require('../../dist-electron/electron/native-process.js');
if(process.platform!=='win32')throw new Error('This test requires Windows.');
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const packaged=path.resolve(`release/Alfred-${version}-windows-x64`);
const helper=path.join(packaged,'resources/AlfredNative.exe');
const evidence=path.resolve('test-results/windows');fs.mkdirSync(evidence,{recursive:true});
const passed=[];let app,fixture;let fixtureWindow;
const server=http.createServer(async(req,res)=>{
  if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Alfred browser test</title><h1>Browser tool completed</h1>');return;}
  res.setHeader('Content-Type','application/json');
  if(req.url==='/api/tags'){res.end(JSON.stringify({models:[{name:'test-model'}]}));return;}
  if(req.url!=='/api/chat'){res.statusCode=404;res.end('{}');return;}
  let body='';for await(const chunk of req)body+=chunk;
  const request=JSON.parse(body);const last=request.messages.at(-1);
  // Deterministic planner fixture; native desktop/browser effects below are real.
  let message={role:'assistant',content:'The requested tool returned a result.'};
  if(last.role==='user'){
    if(last.content.includes('running apps'))message={role:'assistant',content:'',tool_calls:[{function:{name:'win_apps',arguments:{}}}]};
    else if(last.content.includes('sample window'))message={role:'assistant',content:'',tool_calls:[{function:{name:'win_observe',arguments:{window_id:fixtureWindow}}}]};
    else if(last.content.includes('browser page'))message={role:'assistant',content:'',tool_calls:[{function:{name:'browser__browser_navigate',arguments:{url:`http://127.0.0.1:${server.address().port}/fixture`}}}]};
  }
  res.end(JSON.stringify({message}));
});
const desktop=new WindowsDesktop(helper);
async function waitFor(fn,timeout=45000){const end=Date.now()+timeout;while(Date.now()<end){const result=await fn();if(result)return result;await new Promise(r=>setTimeout(r,250));}throw new Error('Timed out waiting for the real outcome.');}
async function launch(data){
  const env={...process.env,ALFRED_DATA_DIR:data};delete env.ELECTRON_RUN_AS_NODE;
  app=await electron.launch({executablePath:path.join(packaged,'Alfred.exe'),env,timeout:60000});
  const page=await app.firstWindow();await page.getByRole('heading',{name:'Make room for your day.'}).waitFor();
  await waitFor(()=>page.evaluate(async()=>!!(await window.alfred.state()).platform));return page;
}
try{
  const health=await nativeRequest(helper,{operation:'health'});assert.equal(health.platform,'windows');passed.push('compiled native helper health');
  fixture=spawn(helper,['fixture'],{stdio:['ignore','pipe','pipe']});
  fixtureWindow=await new Promise((resolve,reject)=>{let text='';const timeout=setTimeout(()=>reject(new Error('No fixture window')),30000);fixture.once('error',reject);fixture.stdout.on('data',chunk=>{text+=chunk;const line=text.split('\n')[0];try{const result=JSON.parse(line);if(result.window_id){clearTimeout(timeout);resolve(result.window_id);}}catch{}});});
  let seen=await desktop.call('win_observe',{window_id:fixtureWindow});
  assert(!JSON.stringify(seen).includes('test-only-password'));
  const input=seen.elements.find(e=>e.name==='Sample note');assert(input,'Native editable field must be visible');
  const request={window_id:fixtureWindow,snapshot:seen.snapshot,element:input.id,text:'Windows native test'};
  const changed=await desktop.call('win_type',request);assert.equal(changed.verified,true);
  await assert.rejects(()=>desktop.call('win_type',request),/stale/);
  seen=await desktop.call('win_observe',{window_id:fixtureWindow});assert(seen.elements.some(e=>e.name==='Sample note'&&e.value==='Windows native test'));
  const button=seen.elements.find(e=>e.name==='Confirm test');assert(button);
  await desktop.call('win_click',{window_id:fixtureWindow,snapshot:seen.snapshot,element:button.id});
  await waitFor(async()=>{const s=await desktop.call('win_observe',{window_id:fixtureWindow});return s.elements.some(e=>e.name==='Clicked: Windows native test'||e.value==='Clicked: Windows native test');});
  passed.push('native UIA observation, protected-value exclusion, text replacement, one-use receipt, button invocation and observed outcome');
  const wav=await nativeRequest(helper,{operation:'speech_wav',text:'Alfred Windows speech test.'});assert(Buffer.from(wav.audio,'base64').length>1000);passed.push('native speech synthesis to WAV');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const data=fs.mkdtempSync(path.join(os.tmpdir(),'alfred-win-test-'));let page=await launch(data);
  await page.evaluate(base=>window.alfred.configure({speakReplies:false,model:'test-model',ollamaUrl:base}),`http://127.0.0.1:${server.address().port}`);
  assert.equal((await page.evaluate(()=>window.alfred.state())).platform,'win32');
  await page.screenshot({path:path.join(evidence,'01-welcome.png')});
  await page.getByLabel('Message Alfred').fill('Remember this: demonstrate Alfred on Windows.');await page.getByLabel('Send message',{exact:true}).click();
  await page.getByText('Saved to your ideas inbox. It is a note, not a task.').waitFor();await page.getByRole('button',{name:/Ideas inbox/}).click();await page.getByText('demonstrate Alfred on Windows.',{exact:true}).waitFor();
  await page.screenshot({path:path.join(evidence,'02-ideas.png')});await app.close();page=await launch(data);
  await page.getByRole('button',{name:/Ideas inbox/}).click();await page.getByText('demonstrate Alfred on Windows.',{exact:true}).waitFor();passed.push('packaged Electron launch, UI capture, inbox persistence across relaunch');
  await page.getByRole('button',{name:'Conversation',exact:true}).click();await page.evaluate(()=>window.alfred.send('List running apps.'));
  assert((await page.evaluate(()=>window.alfred.state())).messages.some(m=>m.tool==='win_apps'&&!m.error));passed.push('planner fixture → real native tool → stored receipt');
  await page.evaluate(()=>window.alfred.connectBrowser());assert((await page.evaluate(()=>window.alfred.state())).tools.some(t=>t.source==='browser'));
  await page.evaluate(()=>window.alfred.send('Open the browser page.'));let s=await page.evaluate(()=>window.alfred.state());assert(s.pending);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await waitFor(()=>page.evaluate(async()=>!(await window.alfred.state()).pending));
  assert(!(await page.evaluate(()=>window.alfred.state())).messages.some(m=>m.tool==='browser__browser_navigate'));
  await page.evaluate(()=>window.alfred.send('Open the browser page.'));await page.getByRole('button',{name:'Confirm action',exact:true}).click();
  await waitFor(()=>page.evaluate(async()=>{const s=await window.alfred.state();return !s.busy&&s.messages.some(m=>m.tool==='browser__browser_navigate'&&!m.error&&m.text.includes('Browser tool completed'));}),90000);
  passed.push('real Windows browser tools with rejected and approved navigation');
  await page.getByLabel('Connections',{exact:true}).click();await page.screenshot({path:path.join(evidence,'03-connections.png')});
  const metrics=await app.evaluate(({app})=>app.getAppMetrics().map(p=>({type:p.type,memory:p.memory}))); 
  fs.writeFileSync(path.join(evidence,'summary.json'),JSON.stringify({passed,recognizers:health.speech_recognizers,liveMicrophoneTested:false,realLLMTested:false,metrics},null,2));
  console.log(JSON.stringify({passed,recognizers:health.speech_recognizers},null,2));
}catch(error){fs.writeFileSync(path.join(evidence,'failure.json'),JSON.stringify({passed,error:String(error)},null,2));throw error;}
finally{await app?.close();fixture?.kill();server.closeAllConnections();server.close();}
