import { contextBridge,ipcRenderer } from 'electron';
const api:Record<string,unknown>={};
for(const name of ['state','send','decide','stop','saveIdea','deleteIdea','configure','connectConsole','connectBrowser','check','addFolder','listen','stopListening','transcribe','speak','silence','hide'])api[name]=(...args:unknown[])=>ipcRenderer.invoke('alfred:'+name,...args);
for(const [method,channel] of [['onState','alfred:state'],['onSpeech','alfred:speech']])api[method]=(fn:(value:unknown)=>void)=>{const listener=(_event:unknown,value:unknown)=>fn(value);ipcRenderer.on(channel,listener);return()=>ipcRenderer.removeListener(channel,listener);};
contextBridge.exposeInMainWorld('alfred',api);
