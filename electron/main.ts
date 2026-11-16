import { app, BrowserWindow, ipcMain, safeStorage, shell, dialog, globalShortcut, Menu, Tray, nativeImage, session } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, validateEndpoint } from './store';
import { MCP, Vault } from './mcp';
import { Engine } from './engine';
import { Voice } from './voice';
import { macPermissions } from './mac';
import { Settings, Status } from '../shared/contract';

app.setName('Alfred');
app.setPath('userData',path.join(app.getPath('appData'),'OpenExec Alfred'));
if(process.env.ALFRED_DATA_DIR)app.setPath('userData',process.env.ALFRED_DATA_DIR);
let window:BrowserWindow;let tray:Tray;let store:Store;let engine:Engine;let mcp:MCP;let voice:Voice;
let status={model:'Not checked',console:'Not connected',mac:'Not checked',browser:'Not connected'};
const root=path.resolve(__dirname,'../..');
class EncryptedVault implements Vault {
  private file=path.join(app.getPath('userData'),'credentials.bin');
  get(key:string){
    if(!fs.existsSync(this.file))return undefined;
    if(!safeStorage.isEncryptionAvailable())throw new Error('Unlock your Mac Keychain to use saved connections.');
    return JSON.parse(safeStorage.decryptString(fs.readFileSync(this.file)))[key];
  }
  set(key:string,value:any){
    if(!safeStorage.isEncryptionAvailable())throw new Error('Mac Keychain encryption is unavailable; credentials were not saved.');
    const all=fs.existsSync(this.file)?JSON.parse(safeStorage.decryptString(fs.readFileSync(this.file))):{};
    all[key]=value;
    fs.writeFileSync(this.file+'.tmp',safeStorage.encryptString(JSON.stringify(all)),{mode:0o600});fs.renameSync(this.file+'.tmp',this.file);
  }
}
function state():Status{return {...status,console:mcp.clients.has('console')?'Connected':status.console,browser:mcp.clients.has('browser')?'Connected':status.browser,voice:store.data.settings.voice==='system'?'On-device Mac speech':'ElevenLabs',busy:engine.busy,pending:engine.approval.pending,toolCount:engine.tools().length,settings:store.data.settings,messages:store.data.messages.slice(-200),ideas:store.data.ideas,tools:engine.tools()};}
function changed(){if(window&&!window.isDestroyed())window.webContents.send('alfred:state',state());}
async function check(){
  const [mac,model]=await Promise.all([macPermissions(),fetch(store.data.settings.ollamaUrl+'/api/tags',{signal:AbortSignal.timeout(4000)}).then(r=>r.json()).then((d:any)=>d.models?.some((m:any)=>m.name===store.data.settings.model)?'Ready':`Model ${store.data.settings.model} not installed`).catch(()=>'Ollama is not running')]);
  status.mac=mac;status.model=model;changed();
}
function handle(name:string,fn:(...args:any[])=>any){ipcMain.handle('alfred:'+name,async(event,...args)=>{
  if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw new Error('Untrusted caller.');
  return fn(...args);
});}
async function main(){
  store=new Store(app.getPath('userData'));const vault=new EncryptedVault();
  mcp=new MCP(vault,async url=>{const u=new URL(url);if(u.protocol!=='https:')throw new Error('Sign-in requires HTTPS.');await shell.openExternal(url);},changed);
  engine=new Engine(store,mcp,changed);
  voice=new Voice(path.join(process.resourcesPath,'Alfred Speech.app/Contents/MacOS/AlfredSpeech'),vault,()=>store.data.settings,e=>window?.webContents.send('alfred:speech',e));
  window=new BrowserWindow({width:1100,height:800,minWidth:780,minHeight:620,title:'Alfred',backgroundColor:'#f8f6f1',titleBarStyle:'hiddenInset',trafficLightPosition:{x:20,y:22},webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event)=>event.preventDefault());
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback)=>callback(contents===window.webContents&&permission==='media'));
  handle('state',()=>state());handle('send',(text,source)=>engine.send(text,source));handle('decide',(id,approve)=>engine.decide(id,approve));
  handle('stop',()=>{engine.stop();voice.close();});
  handle('saveIdea',(text,source)=>{const idea=store.idea(text,source);changed();return idea;});
  handle('deleteIdea',id=>{store.data.ideas=store.data.ideas.filter(i=>i.id!==id);store.save();changed();});
  handle('configure',async(patch:Partial<Settings>,elevenKey?:string)=>{
    if(engine.busy||engine.approval.pending)throw new Error('Finish or cancel the current action before changing connections.');
    const clean:Partial<Settings>={};
    if(patch.model!==undefined){if(typeof patch.model!=='string'||!patch.model.trim()||patch.model.length>120)throw new Error('Invalid model.');clean.model=patch.model.trim();}
    if(patch.ollamaUrl!==undefined)clean.ollamaUrl=validateEndpoint(patch.ollamaUrl,true);
    if(patch.consoleUrl!==undefined){clean.consoleUrl=validateEndpoint(patch.consoleUrl);if(clean.consoleUrl!==store.data.settings.consoleUrl){await mcp.disconnect('console');status.console='Not connected';}}
    if(patch.voice==='system'||patch.voice==='elevenlabs')clean.voice=patch.voice;
    if(patch.speakReplies!==undefined)clean.speakReplies=!!patch.speakReplies;
    if(patch.elevenVoice!==undefined){if(!/^[a-zA-Z0-9_-]{1,100}$/.test(patch.elevenVoice))throw new Error('Invalid voice ID.');clean.elevenVoice=patch.elevenVoice;}
    if(elevenKey?.trim())vault.set('elevenlabs',elevenKey.trim());
    store.data.settings={...store.data.settings,...clean};store.save();changed();await check();
  });
  handle('connectConsole',async()=>{try{status.console='Connecting…';changed();await mcp.console(store.data.settings.consoleUrl);}catch(e){status.console=(e as Error).message;throw e;}finally{changed();}});
  handle('connectBrowser',async()=>{try{await mcp.browser(root,app.getPath('userData'));}catch(e){status.browser='Could not start browser tools';throw e;}finally{changed();}});
  handle('check',check);
  handle('addFolder',async()=>{const result=await dialog.showOpenDialog(window,{properties:['openDirectory'],title:'Choose a folder Alfred may read'});if(!result.canceled){store.data.settings.roots=[...new Set([...store.data.settings.roots,...result.filePaths.map(p=>fs.realpathSync(p))])];store.save();changed();}});
  handle('listen',()=>voice.listen());handle('stopListening',()=>voice.stopListening());handle('transcribe',(audio,mime)=>voice.transcribe(audio,mime));handle('speak',text=>voice.speak(text));handle('silence',()=>voice.stopSpeaking());handle('hide',()=>window.hide());
  await window.loadFile(path.join(root,'dist/index.html'));
  const icon=nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
  tray=new Tray(icon);tray.setTitle('🎩');tray.setToolTip('Alfred · ⌥ Space to talk');tray.setContextMenu(Menu.buildFromTemplate([{label:'Talk to Alfred',click:()=>{window.show();window.webContents.send('alfred:speech',{toggle:true});}},{label:'Show Alfred',click:()=>window.show()},{label:'Stop',click:()=>{engine.stop();voice.close();}},{type:'separator'},{label:'Quit Alfred',click:()=>app.quit()}]));
  globalShortcut.register('Alt+Space',()=>{window.show();window.webContents.send('alfred:speech',{toggle:true});});
  window.on('close',e=>{if(!(app as any).isQuitting){e.preventDefault();window.hide();}});
  app.on('activate',()=>window.show());
  await check();
  if(vault.get(`console:${store.data.settings.consoleUrl}`)?.tokens){
    try{await mcp.console(store.data.settings.consoleUrl,false);}catch{status.console='Sign in again in Connections';changed();}
  }
}
if(!app.requestSingleInstanceLock())app.quit();
else {app.on('second-instance',()=>{window?.show();window?.focus();});app.whenReady().then(main).catch(e=>{dialog.showErrorBox('Alfred could not start',String(e));app.quit();});}
app.on('before-quit',()=>{(app as any).isQuitting=true;globalShortcut.unregisterAll();voice?.close();engine?.stop();void mcp?.close();});
