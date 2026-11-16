import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store, allowedFile, validateEndpoint } from '../electron/store';
import { Approval, remoteReadOnly } from '../electron/policy';
import { macArgs } from '../electron/mac';
import { Engine } from '../electron/engine';

test('ideas and conversation survive restart without becoming tasks',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alfred-test-'));
  const store=new Store(dir);const idea=store.idea('Keep receipt source links','voice');store.message('user','hello');
  const reopened=new Store(dir);assert.equal(reopened.data.ideas[0].id,idea.id);assert.equal(reopened.data.messages[0].text,'hello');assert.equal(reopened.data.ideas[0].source,'voice');assert.equal(fs.statSync(path.join(dir,'workspace.json')).mode&0o777,0o600);
});
test('corrupt storage refuses to silently erase memory',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alfred-test-'));fs.writeFileSync(path.join(dir,'workspace.json'),'bad json');assert.throws(()=>new Store(dir));
});
test('approval binds exact arguments, rejects stale IDs, expires, and cannot replay',()=>{
  const gate=new Approval();const args={text:'original'};const p=gate.propose('mac_type',args);args.text='changed';
  assert.throws(()=>gate.consume('wrong'));assert.equal(gate.consume(p.id).arguments.text,'original');assert.throws(()=>gate.consume(p.id));
  const expired=gate.propose('mac_type',{});expired.expires=0;assert.throws(()=>gate.consume(expired.id),/expired/);
});
test('remote annotations cannot authorize actions or browser execution',()=>{
  assert.equal(remoteReadOnly('console','list_projects'),true);assert.equal(remoteReadOnly('console','run_task'),false);assert.equal(remoteReadOnly('console','capture'),false);assert.equal(remoteReadOnly('browser','browser_evaluate'),false);assert.equal(remoteReadOnly('console','read_and_delete_everything'),false);
});
test('file roots reject traversal, symlink escape, and hidden credentials',()=>{
  const dir=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'alfred-test-')));const root=path.join(dir,'root');fs.mkdirSync(root);fs.writeFileSync(path.join(root,'note.txt'),'hello');fs.writeFileSync(path.join(dir,'outside.txt'),'private');fs.symlinkSync(path.join(dir,'outside.txt'),path.join(root,'link.txt'));fs.mkdirSync(path.join(root,'.ssh'));fs.writeFileSync(path.join(root,'.ssh','id_rsa'),'secret');
  assert.equal(allowedFile([root],path.join(root,'note.txt')),path.join(root,'note.txt'));assert.throws(()=>allowedFile([root],path.join(root,'../outside.txt')));assert.throws(()=>allowedFile([root],path.join(root,'link.txt')));assert.throws(()=>allowedFile([root],path.join(root,'.ssh','id_rsa')));
});
test('local models cannot silently send private context to an external endpoint',()=>{
  assert.equal(validateEndpoint('http://127.0.0.1:11434',true),'http://127.0.0.1:11434');assert.throws(()=>validateEndpoint('https://example.com',true));assert.throws(()=>validateEndpoint('http://example.com'));assert.throws(()=>validateEndpoint('https://secret@example.com'));assert.equal(validateEndpoint('https://connect.perttu.ai/mcp'),'https://connect.perttu.ai/mcp');
});
test('Mac actions use explicit targets and argv, never a shell',()=>{
  assert.throws(()=>macArgs('mac_type',{text:'hello'}));assert.throws(()=>macArgs('mac_click',{window_id:23,element:'--foreground',snapshot:'abc'}));assert.throws(()=>macArgs('run_shell',{window_id:23}));assert.deepEqual(macArgs('mac_type',{window_id:23,text:'$(touch /tmp/should-not-run)'}),['type','$(touch /tmp/should-not-run)','--window-id','23','--json']);
});
test('explicit memory capture works without a model or connected services',async()=>{
  const store=new Store(fs.mkdtempSync(path.join(os.tmpdir(),'alfred-test-')));const engine=new Engine(store,{tools:[]} as any,()=>{});
  await engine.send('Remember this: collect receipts every Friday.','voice');assert.equal(store.data.ideas[0].text,'collect receipts every Friday.');assert.equal(engine.busy,false);assert.equal(engine.approval.pending,undefined);
});
test('model-requested writes wait for exact owner approval; rejection performs no call',async()=>{
  const original=global.fetch;let calls=0;let reply=0;
  const fake={tools:[{name:'console__run_task',source:'console',readOnly:false,description:'Run task',parameters:{type:'object'}}],call:async()=>{calls++;return {ok:true};}};
  global.fetch=async()=>new Response(JSON.stringify({message:reply++%2===0?{role:'assistant',content:'',tool_calls:[{function:{name:'console__run_task',arguments:{project:'test',task:'task one'}}}]}:{role:'assistant',content:'The tool reported success.'}}),{status:200});
  try{
    const store=new Store(fs.mkdtempSync(path.join(os.tmpdir(),'alfred-test-')));const engine=new Engine(store,fake as any,()=>{});
    await engine.send('Run task one');assert.equal(calls,0);assert(engine.approval.pending);await engine.decide(engine.approval.pending.id,false);assert.equal(calls,0);
    reply=0;await engine.send('Run task one');const id=engine.approval.pending!.id;await engine.decide(id,true);assert.equal(calls,1);await assert.rejects(()=>engine.decide(id,true));assert(store.data.messages.some(m=>m.tool==='console__run_task'));
  }finally{global.fetch=original;}
});
test('OpenAI-compatible reasoning models: empty content falls back to reasoning_content; a reply cut off while thinking is an error',async()=>{
  const original=global.fetch;let body:any;
  global.fetch=async()=>new Response(JSON.stringify(body),{status:200});
  try{
    const store=new Store(fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'alfred-test-'))));
    Object.assign(store.data.settings,{provider:'openai',openaiUrl:'https://inference.verda.com/v1',openaiModel:'deepseek-4-1-flash-1017'});
    const engine=new Engine(store,{tools:[]} as any,()=>{});
    body={choices:[{finish_reason:'stop',message:{role:'assistant',content:null,reasoning_content:'Try Suomenlinna at sunset.'}}]};
    await engine.send('What is the best viewpoint in Helsinki?');
    assert.equal(store.data.messages.at(-1)?.text,'Try Suomenlinna at sunset.');
    body={choices:[{finish_reason:'length',message:{role:'assistant',content:'',reasoning_content:'Let me think'}}]};
    await engine.send('And another?');
    assert.match(store.data.messages.at(-1)?.text||'',/reply budget/);
  }finally{global.fetch=original;}
});
test('OpenAI-compatible tool calls send reasoning_content back on the next request',async()=>{
  const original=global.fetch;const bodies:any[]=[];let reply=0;
  const fake={tools:[{name:'local__list_apps',source:'local',readOnly:true,description:'List apps',parameters:{type:'object'}}],call:async()=>({apps:['Finder']})};
  global.fetch=async(_url:any,init:any)=>{bodies.push(JSON.parse(init.body));return new Response(JSON.stringify({choices:[reply++===0
    ?{finish_reason:'tool_calls',message:{role:'assistant',content:null,reasoning_content:'I should list the apps.',tool_calls:[{id:'call_1',type:'function',function:{name:'local__list_apps',arguments:'{}'}}]}}
    :{finish_reason:'stop',message:{role:'assistant',content:'Finder is running.'}}]}),{status:200});};
  try{
    const store=new Store(fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'alfred-test-'))));
    Object.assign(store.data.settings,{provider:'openai',openaiUrl:'https://inference.verda.com/v1',openaiModel:'kimi-k3-1-pro'});
    await new Engine(store,fake as any,()=>{}).send('Which apps are running?');
    const assistant=bodies[1].messages.find((m:any)=>m.tool_calls);
    assert.equal(assistant.reasoning_content,'I should list the apps.');assert.equal(assistant.tool_calls[0].id,'call_1');
    assert.equal(bodies[1].messages.at(-1).tool_call_id,'call_1');assert.equal(store.data.messages.at(-1)?.text,'Finder is running.');
  }finally{global.fetch=original;}
});
test('OpenAI-compatible errors show the provider\'s message when it sends one',async()=>{
  const original=global.fetch;let reply:Response;
  global.fetch=async()=>reply;
  try{
    const store=new Store(fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'alfred-test-'))));
    Object.assign(store.data.settings,{provider:'openai',openaiUrl:'https://inference.verda.com/v1',openaiModel:'kimi-k3-1-pro'});
    const engine=new Engine(store,{tools:[]} as any,()=>{});
    reply=new Response(JSON.stringify({error:{type:'permission_error',code:'subscription_required',message:'this project is not subscribed to model "kimi-k3-1-pro"'}}),{status:403});
    await engine.send('Hello');
    assert.match(store.data.messages.at(-1)?.text||'',/HTTP 403 \(“this project is not subscribed to model "kimi-k3-1-pro"”\)\. Check the model/);
    reply=new Response('<html>Bad gateway</html>',{status:502});
    await engine.send('Hello again');
    assert.equal(store.data.messages.at(-1)?.text,'The model endpoint returned HTTP 502. Check the model and key in Settings.');
  }finally{global.fetch=original;}
});
