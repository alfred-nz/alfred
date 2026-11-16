import { app, BrowserWindow, ipcMain, safeStorage, shell, dialog, globalShortcut, Menu, Tray, nativeImage, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, validateEndpoint } from './store';
import { MCP, Vault } from './mcp';
import { Engine } from './engine';
import { Voice } from './voice';
import { desktopFor } from './desktop';
import { Keys, Pending, Settings, Status } from '../shared/contract';

app.setName('Alfred');
app.setPath('userData',path.join(app.getPath('appData'),'OpenExec Alfred'));
if(process.env.ALFRED_DATA_DIR)app.setPath('userData',process.env.ALFRED_DATA_DIR);
let window:BrowserWindow;let tray:Tray;let store:Store;let engine:Engine;let mcp:MCP;let voice:Voice;let vault:EncryptedVault;
let status={model:'Not checked',console:'Not connected',mac:'Not checked',browser:'Not connected'};
const root=path.resolve(__dirname,'../..');
const desktop=desktopFor();
const shortcut=process.platform==='darwin'?'Alt+Space':'Control+Shift+Space';
const shortcutLabel=process.platform==='darwin'?'⌥ Space':'Ctrl+Shift+Space';
class EncryptedVault implements Vault {
  private file=path.join(app.getPath('userData'),'credentials.bin');
  get(key:string){
    if(!fs.existsSync(this.file))return undefined;
    if(!safeStorage.isEncryptionAvailable())throw new Error('Unlock your operating-system credential store to use saved connections.');
    return JSON.parse(safeStorage.decryptString(fs.readFileSync(this.file)))[key];
  }
  set(key:string,value:any){
    if(!safeStorage.isEncryptionAvailable())throw new Error('Operating-system credential encryption is unavailable; credentials were not saved.');
    const all=fs.existsSync(this.file)?JSON.parse(safeStorage.decryptString(fs.readFileSync(this.file))):{};
    all[key]=value;
    fs.writeFileSync(this.file+'.tmp',safeStorage.encryptString(JSON.stringify(all)),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);
  }
}
function state():Status{return {...status,platform:process.platform,shortcut:shortcutLabel,console:mcp.clients.has('console')?'Connected':status.console,browser:mcp.clients.has('browser')?'Connected':status.browser,voice:store.data.settings.voice==='system'?(process.platform==='win32'?'Offline Windows speech':'On-device Mac speech'):store.data.settings.voice==='agent'?'ElevenLabs agent':'ElevenLabs',busy:engine.busy,pending:engine.approval.pending,toolCount:engine.tools().length,settings:store.data.settings,messages:store.data.messages.slice(-200),ideas:store.data.ideas,tools:engine.tools()};}
function changed(){if(window&&!window.isDestroyed())window.webContents.send('alfred:state',state());}
async function check(){
  const s=store.data.settings;
  const model=s.provider==='openai'?checkEndpoint(s):fetch(s.ollamaUrl+'/api/tags',{signal:AbortSignal.timeout(4000)}).then(r=>r.json()).then((d:any)=>d.models?.some((m:any)=>m.name===s.model)?'Ready':`Model ${s.model} not installed`).catch(()=>'Ollama is not running');
  const [mac,modelStatus]=await Promise.all([desktop.status(),model]);
  status.mac=mac;status.model=modelStatus;changed();
}
async function checkEndpoint(s:Settings){
  if(!s.openaiModel)return 'Choose a model in Settings';
  try{
    const key=vault.get('openai');
    const r=await fetch(s.openaiUrl+'/models',{headers:key?{Authorization:'Bearer '+key}:{},signal:AbortSignal.timeout(6000)});
    if(r.status===401||r.status===403)return 'The endpoint refused the API key';
    if(!r.ok)return `The endpoint returned HTTP ${r.status}`;
    const d:any=await r.json();
    return d.data?.some((m:any)=>m.id===s.openaiModel||String(m.id).endsWith('/'+s.openaiModel))?'Ready':`Model ${s.openaiModel} is not listed`;
  }catch{return 'Cannot reach the model endpoint';}
}
function handle(name:string,fn:(...args:any[])=>any){ipcMain.handle('alfred:'+name,async(event,...args)=>{
  if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted caller.');
  return fn(...args);
});}
async function main(){
  store=new Store(app.getPath('userData'));vault=new EncryptedVault();
  mcp=new MCP(vault,async url=>{const u=new URL(url);if(u.protocol!=='https:')throw new Error('Sign-in requires HTTPS.');await shell.openExternal(url);},changed);
  engine=new Engine(store,mcp,changed,desktop,name=>vault.get(name));
  voice=new Voice(path.join(process.resourcesPath,process.platform==='win32'?'AlfredNative.exe':'Alfred Speech.app/Contents/MacOS/AlfredSpeech'),vault,()=>store.data.settings,e=>window?.webContents.send('alfred:speech',e));
  window=new BrowserWindow({width:1100,height:800,minWidth:780,minHeight:620,title:'Alfred',backgroundColor:'#f8f6f1',...(process.platform==='darwin'?{titleBarStyle:'hiddenInset' as const,trafficLightPosition:{x:20,y:22}}:{}),webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event)=>event.preventDefault());
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===window.webContents&&permission==='media'));
  handle('state',()=>state());handle('send',(text,source)=>engine.send(text,source));handle('decide',(id,approve)=>engine.decide(id,approve));
  handle('stop',()=>{engine.stop();voice.close();});
  handle('saveIdea',(text,source)=>{const idea=store.idea(text,source);changed();return idea;});
  handle('deleteIdea',id=>{store.data.ideas=store.data.ideas.filter(i=>i.id!==id);store.save();changed();});
  handle('configure',async(patch:Partial<Settings>,keys?:Keys)=>{
    if(engine.busy||engine.approval.pending)throw new Error('Finish or cancel the current action before changing connections.');
    const clean:Partial<Settings>={};
    if(patch.model!==undefined){if(typeof patch.model!=='string'||!patch.model.trim()||patch.model.length>120)throw new Error('Invalid model.');clean.model=patch.model.trim();}
    if(patch.ollamaUrl!==undefined)clean.ollamaUrl=validateEndpoint(patch.ollamaUrl,true);
    if(patch.consoleUrl!==undefined){clean.consoleUrl=validateEndpoint(patch.consoleUrl);if(clean.consoleUrl!==store.data.settings.consoleUrl){await mcp.disconnect('console');status.console='Not connected';}}
    if(patch.provider==='ollama'||patch.provider==='openai')clean.provider=patch.provider;
    if(patch.openaiUrl!==undefined)clean.openaiUrl=validateEndpoint(patch.openaiUrl);
    if(patch.openaiModel!==undefined){if(typeof patch.openaiModel!=='string'||patch.openaiModel.length>200)throw new Error('Invalid model.');clean.openaiModel=patch.openaiModel.trim();}
    if(patch.voice==='system'||patch.voice==='elevenlabs'||patch.voice==='agent')clean.voice=patch.voice;
    if(patch.elevenAgent!==undefined){if(!/^[a-zA-Z0-9_-]{0,100}$/.test(patch.elevenAgent))throw new Error('Invalid agent ID.');clean.elevenAgent=patch.elevenAgent;}
    if(patch.speakReplies!==undefined)clean.speakReplies=!!patch.speakReplies;
    if(patch.elevenVoice!==undefined){if(!/^[a-zA-Z0-9_-]{1,100}$/.test(patch.elevenVoice))throw new Error('Invalid voice ID.');clean.elevenVoice=patch.elevenVoice;}
    if(keys?.elevenlabs?.trim())vault.set('elevenlabs',keys.elevenlabs.trim());
    if(keys?.openai?.trim())vault.set('openai',keys.openai.trim());
    store.data.settings={...store.data.settings,...clean};store.save();changed();await check();
  });
  handle('connectConsole',async()=>{try{status.console='Connecting…';changed();await mcp.console(store.data.settings.consoleUrl);}catch(e){status.console=(e as Error).message;throw e;}finally{changed();}});
  handle('connectBrowser',async()=>{try{await mcp.browser(root,app.getPath('userData'));}catch(e){status.browser='Could not start browser tools';throw e;}finally{changed();}});
  handle('check',check);
  // ElevenLabs agent mode: the key stays here; the window only gets a short-lived signed URL.
  handle('agentUrl',async()=>{
    const agent=store.data.settings.elevenAgent;const key=vault.get('elevenlabs');
    if(!agent||!key)throw new Error('Add your ElevenLabs key and agent ID in Settings.');
    const r=await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agent)}`,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(15000)});
    if(!r.ok)throw new Error(`ElevenLabs could not start the agent (${r.status}).`);
    const url=new URL(((await r.json()) as any).signed_url);
    if(url.protocol!=='wss:'||!url.hostname.endsWith('.elevenlabs.io'))throw new Error('ElevenLabs returned an unexpected address.');
    return url.toString();
  });
  // The agent's one client tool. Approvals are on-screen only here: the agent's model must not be able to say yes.
  handle('agentTask',async(request:string)=>{
    if(typeof request!=='string'||!request.trim())return 'Tell Alfred what to do.';
    if(engine.approval.pending)return 'An action is waiting. Ask the owner to press Confirm or Cancel on screen; spoken approval is not accepted in this mode.';
    if(engine.busy)return 'Alfred is still working on the previous request.';
    const before=store.data.messages.length;
    await engine.send(request,'voice');
    const pending=engine.approval.pending as Pending|undefined; // set by send(); TS narrowed it before the await
    if(pending)return `Alfred wants to run ${pending.tool} with ${JSON.stringify(pending.arguments)}. Ask the owner to press Confirm or Cancel on screen; spoken approval is not accepted in this mode.`;
    return store.data.messages.slice(before).filter(m=>m.role==='assistant').at(-1)?.text||'Done.';
  });
  handle('addFolder',async()=>{const result=await dialog.showOpenDialog(window,{properties:['openDirectory'],title:'Choose a folder Alfred may read'});if(!result.canceled){store.data.settings.roots=[...new Set([...store.data.settings.roots,...result.filePaths.map(p=>fs.realpathSync(p))])];store.save();changed();}});
  handle('listen',()=>voice.listen());handle('stopListening',()=>voice.stopListening());handle('transcribe',(audio,mime)=>voice.transcribe(audio,mime));handle('speak',text=>voice.speak(text));handle('silence',()=>voice.stopSpeaking());handle('hide',()=>window.hide());
  await window.loadFile(path.join(root,'dist/index.html'));
  const pixels=Buffer.alloc(24*24*4);
  for(let y=0;y<24;y++)for(let x=0;x<24;x++){const i=(y*24+x)*4;const hat=(x>=7&&x<=16&&y>=5&&y<=15)||(x>=3&&x<=20&&y>=16&&y<=18);pixels[i]=hat?70:0;pixels[i+1]=hat?95:0;pixels[i+2]=hat?65:0;pixels[i+3]=hat?255:0;}
  const icon=nativeImage.createFromBitmap(pixels,{width:24,height:24});
  tray=new Tray(icon);if(process.platform==='darwin')tray.setTitle('🎩');tray.setToolTip('Alfred · '+shortcutLabel+' to talk');tray.setContextMenu(Menu.buildFromTemplate([{label:'Talk to Alfred',click:()=>{window.show();window.webContents.send('alfred:speech',{toggle:true});}},{label:'Show Alfred',click:()=>window.show()},{label:'Stop',click:()=>{engine.stop();voice.close();}},{type:'separator'},{label:'Quit Alfred',click:()=>app.quit()}]));
  globalShortcut.register(shortcut,()=>{window.show();window.webContents.send('alfred:speech',{toggle:true});});
  window.on('close',e=>{if(!(app as any).isQuitting){e.preventDefault();window.hide();}});
  app.on('activate',()=>window.show());
  await check();
  if(vault.get(`console:${store.data.settings.consoleUrl}`)?.tokens){
    try{await mcp.console(store.data.settings.consoleUrl,false);}catch{status.console='Sign in again in Settings';changed();}
  }
}
if(!app.requestSingleInstanceLock())app.quit();
else {app.on('second-instance',()=>{window?.show();window?.focus();});app.whenReady().then(main).catch(e=>{dialog.showErrorBox('Alfred could not start',String(e));app.quit();});}
app.on('before-quit',()=>{(app as any).isQuitting=true;globalShortcut.unregisterAll();voice?.close();engine?.stop();void mcp?.close();});
