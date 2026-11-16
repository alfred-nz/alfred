import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { Vault } from './mcp';
import { Settings } from '../shared/contract';
export class Voice {
  private speech?:ChildProcess;private recognition?:ChildProcess;private silence?:NodeJS.Timeout;
  private transcript='';private finished=false;
  constructor(private helper:string,private vault:Vault,private settings:()=>Settings,private event:(e:any)=>void){}
  listen(){
    if(this.recognition)return;
    this.stopSpeaking();this.transcript='';this.finished=false;
    if(!fs.existsSync(this.helper))throw new Error('Native speech helper is missing. Reinstall the complete Alfred package.');
    const child=spawn(this.helper,process.platform==='win32'?['listen']:[],{windowsHide:true,stdio:['ignore','pipe','pipe']});this.recognition=child;
    let buffer='';
    child.stdout?.on('data',chunk=>{
      buffer+=chunk.toString();let index;
      while((index=buffer.indexOf('\n'))>=0){
        const line=buffer.slice(0,index);buffer=buffer.slice(index+1);
        try{const e=JSON.parse(line);
          if(e.text){this.transcript=e.text;clearTimeout(this.silence);this.silence=setTimeout(()=>this.stopListening(),1800);}
          if(e.final){this.finished=true;clearTimeout(this.silence);}
          this.event(e);
        }catch{}
      }
    });
    child.on('error',()=>{this.event({error:'Could not start native speech recognition.'});});
    child.on('exit',()=>{if(this.recognition===child)this.recognition=undefined;clearTimeout(this.silence);this.event({listening:false});});
  }
  stopListening(){
    clearTimeout(this.silence);const child=this.recognition;this.recognition=undefined;
    if(!this.finished&&this.transcript){this.finished=true;this.event({text:this.transcript,final:true});}
    child?.kill('SIGTERM');this.event({listening:false});
  }
  stopSpeaking(){this.speech?.kill();this.speech=undefined;}
  async speak(text:string):Promise<string|undefined>{
    this.stopSpeaking();if(!this.settings().speakReplies)return;
    if(this.settings().voice==='elevenlabs'){
      const key=this.vault.get('elevenlabs');if(!key)throw new Error('Add your existing ElevenLabs key in Settings.');
      const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(this.settings().elevenVoice)}`,{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,4000),model_id:'eleven_multilingual_v2'}),signal:AbortSignal.timeout(45000)});
      if(!r.ok)throw new Error(`ElevenLabs speech failed (${r.status}).`);
      return Buffer.from(await r.arrayBuffer()).toString('base64');
    }
    await new Promise<void>((resolve,reject)=>{
      const windows=process.platform==='win32';
      if(windows&&!fs.existsSync(this.helper)){reject(new Error('Windows speech helper is missing. Re-extract the complete ZIP.'));return;}
      this.speech=spawn(windows?this.helper:'/usr/bin/say',windows?['request']:['-r','175'],{windowsHide:true,stdio:['pipe','ignore','ignore']});
      this.speech.stdin?.on('error',()=>{});
      this.speech.stdin?.end(windows?JSON.stringify({operation:'speak',text:text.slice(0,4000)}):text.slice(0,4000));
      this.speech.once('error',reject);this.speech.once('exit',(code,signal)=>code===0||signal?resolve():reject(new Error('System speech is unavailable. Check your audio device or select ElevenLabs.')));
    });
  }
  async transcribe(audio:ArrayBuffer,mime:string){
    const key=this.vault.get('elevenlabs');if(!key)throw new Error('Add your existing ElevenLabs key or select the system voice.');
    if(audio.byteLength>20*1024*1024)throw new Error('Recording exceeds 20 MiB.');
    const form=new FormData();form.append('file',new Blob([audio],{type:mime}),'speech.webm');form.append('model_id','scribe_v1');
    const r=await fetch('https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:{'xi-api-key':key},body:form,signal:AbortSignal.timeout(60000)});
    if(!r.ok)throw new Error(`ElevenLabs transcription failed (${r.status}).`);
    return String((await r.json() as any).text||'');
  }
  close(){this.stopListening();this.stopSpeaking();}
}
