import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, AudioLines, Check, ChevronRight, CircleHelp, Command, Folder, Headphones, Lightbulb, Link, MessageCircle, Mic, Monitor, Plus, Settings2, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { AlfredCharacter } from './components/AlfredCharacter';
import type { Status, Settings, Message } from '../shared/contract';
import './index.css';

export function App(){
  const [state,setState]=useState<Status>();const [page,setPage]=useState<'talk'|'ideas'|'activity'>('talk');
  const [settings,setSettings]=useState(false);const [draft,setDraft]=useState('');const [error,setError]=useState('');
  const [listening,setListening]=useState(false);const [speaking,setSpeaking]=useState(false);const [handsFree,setHandsFree]=useState(false);
  const [partial,setPartial]=useState('');const [form,setForm]=useState<Partial<Settings>>({});const [key,setKey]=useState('');
  const lastSpoken=useRef('');const initialized=useRef(false);const scroll=useRef<HTMLDivElement>(null);const busy=useRef(false);
  const stateRef=useRef(state);stateRef.current=state;const handsFreeRef=useRef(handsFree);handsFreeRef.current=handsFree;
  const listeningRef=useRef(listening);listeningRef.current=listening;
  const recorder=useRef<MediaRecorder|undefined>(undefined);const stream=useRef<MediaStream|undefined>(undefined);const playback=useRef<HTMLAudioElement|undefined>(undefined);
  const toggleRef=useRef<()=>void>(()=>{});
  const attempt=async(fn:()=>Promise<any>)=>{setError('');try{return await fn();}catch(e){setError(String((e as Error).message).replace(/^Error invoking remote method '[^']+': Error: /,''));}};
  async function send(text=draft,source:'voice'|'text'='text'){
    if(!text.trim())return;setDraft('');setPartial('');await attempt(()=>window.alfred.send(text,source));
  }
  async function stopAudio(){playback.current?.pause();setSpeaking(false);await window.alfred.silence();}
  async function listen(){
    await stopAudio();setError('');setPartial('');
    if(stateRef.current?.settings.voice==='elevenlabs'){
      await attempt(async()=>{
        stream.current=await navigator.mediaDevices.getUserMedia({audio:true});
        const media=new MediaRecorder(stream.current);recorder.current=media;const chunks:Blob[]=[];
        media.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        media.onstop=async()=>{stream.current?.getTracks().forEach(t=>t.stop());setListening(false);const blob=new Blob(chunks,{type:media.mimeType});await attempt(async()=>{const text=await window.alfred.transcribe(await blob.arrayBuffer(),media.mimeType);if(text)await send(text,'voice');});};
        media.start();setListening(true);
      });
    }else await attempt(()=>window.alfred.listen());
  }
  async function toggleListen(){
    if(listeningRef.current){if(recorder.current?.state==='recording')recorder.current.stop();else await window.alfred.stopListening();setListening(false);}
    else await listen();
  }
  toggleRef.current=toggleListen;
  useEffect(()=>{
    if(!window.alfred){setError('Open the Alfred desktop app to use its tools.');return;}
    window.alfred.state().then(s=>{setState(s);lastSpoken.current=s.messages.filter(m=>m.role==='assistant').at(-1)?.id||'';initialized.current=true;});
    const unState=window.alfred.onState(setState);
    const unSpeech=window.alfred.onSpeech((e:any)=>{
      if(e.toggle){void toggleRef.current();return;}
      if(e.error){setError(e.error);setListening(false);setHandsFree(false);}
      if(e.listening!==undefined)setListening(e.listening);
      if(e.text)setPartial(e.text);
      if(e.final&&e.text){setListening(false);void send(e.text,'voice');}
    });
    return()=>{unState();unSpeech();stream.current?.getTracks().forEach(t=>t.stop());};
  },[]);
  useEffect(()=>{
    if(state?.messages.length)scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:'smooth'});
    if(!state||!initialized.current)return;
    const message=state.messages.filter(m=>m.role==='assistant').at(-1);
    if(!message||lastSpoken.current===message.id)return;
    lastSpoken.current=message.id;
    if(!state.settings.speakReplies)return;
    void(async()=>{
      setSpeaking(true);
      try{const audio=await window.alfred.speak(message.text);
        if(audio){const player=new Audio('data:audio/mpeg;base64,'+audio);playback.current=player;await new Promise<void>((resolve,reject)=>{player.onended=()=>resolve();player.onerror=()=>reject(new Error('Audio playback failed.'));player.play().catch(reject);});}
      }catch(e){setError((e as Error).message);}
      finally{setSpeaking(false);if(handsFreeRef.current&&!stateRef.current?.busy)void listen();}
    })();
  },[state?.messages.length]);
  useEffect(()=>{busy.current=!!state?.busy;},[state?.busy]);
  const openSettings=()=>{setForm(state?.settings||{});setSettings(true);};
  const messages=state?.messages.filter(m=>m.role!=='tool')||[];
  const activity=state?.messages.filter(m=>m.role==='tool').slice().reverse()||[];
  const isWindows=state?.platform==='win32';
  const computer=isWindows?'PC':'Mac';
  const current=listening?'Listening to you':speaking?'Speaking':state?.pending?'Your confirmation':state?.busy?'Working on it':'Here when you need me';
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="hat">🎩</span><span>alfred<span className="brand-note">BY OPENEXEC</span></span></div>
      <div className="workspace-label">YOUR PERSONAL ASSISTANT</div>
      <nav>
        <button className={page==='talk'?'selected':''} onClick={()=>setPage('talk')}><MessageCircle size={18}/>Conversation</button>
        <button className={page==='ideas'?'selected':''} onClick={()=>setPage('ideas')}><Lightbulb size={18}/>Ideas inbox<span className="count">{state?.ideas.length||0}</span></button>
        <button className={page==='activity'?'selected':''} onClick={()=>setPage('activity')}><AudioLines size={18}/>Activity</button>
      </nav>
      <div className="connection-list"><div className="workspace-label">AT YOUR SERVICE</div>
        <Connection icon={<Monitor size={16}/>} name={isWindows?"This PC":"This Mac"} value={state?.mac} onClick={openSettings}/>
        <Connection icon={<Command size={16}/>} name="Agent Console" value={state?.console} onClick={openSettings}/>
        <Connection icon={<Lightbulb size={16}/>} name="Your memory" value="Local ideas inbox" onClick={()=>setPage('ideas')}/>
      </div>
      <div className="sidebar-bottom"><div className="local-badge"><span className="dot"/> Local-first · on your {computer}</div><button onClick={openSettings}><Settings2 size={17}/>Connections & voice</button><div className="shortcut"><kbd>{state?.shortcut||'⌥ Space'}</kbd><span>Talk to Alfred</span></div></div>
    </aside>
    <main>
      <header><div><span className="eyebrow">A LITTLE LESS SCREEN TIME</span><h1>{page==='talk'?'Make room for your day.':page==='ideas'?'A place for the next thought.':'What actually happened.'}</h1></div><button className="icon-button" aria-label="Connections" onClick={openSettings}><Settings2 size={20}/></button></header>
      {error&&<div className="error" role="alert"><CircleHelp size={18}/><span>{error}</span><button aria-label="Dismiss error" onClick={()=>setError('')}><X size={16}/></button></div>}
      {page==='talk'&&<>
        <div className="conversation" ref={scroll}>
          <section className={'welcome '+(messages.length?'compact':'')}>
            <div className="character"><AlfredCharacter state={listening?'listening':speaking?'speaking':state?.busy?'thinking':state?.pending?'awaiting_approval':'idle'} prop="none" audioLevel={speaking?0.35:0} registerVolumeListener={()=>()=>{}} liveConnected={listening} isWalking={false} stayPut={true} walkDirection="left" onSummonClick={()=>void toggleListen()} onOpenSettingsDoubleClick={openSettings} onRightClickPreview={()=>{}} onPerformAction={()=>{}} onToggleStayPut={()=>{}} onMinimizeToTaskbar={()=>void window.alfred.hide()} onQuickListen={()=>void toggleListen()} onDragDelta={()=>{}}/></div>
            <div className="welcome-copy"><div className="status-pill"><span className={'dot '+(listening?'pulse':'')}/>{current}</div><h2>{messages.length?'At your service.':'Good ideas shouldn’t wait\nfor a keyboard.'}</h2><p>{messages.length?'Tell me what’s next.':`Tell me what’s on your mind. We can save a thought, look into something on your ${computer}, or pick up work with Agent Console.`}</p></div>
          </section>
          {!messages.length&&<div className="suggestions">
            <Suggestion icon={<Lightbulb size={20}/>} title="Keep a thought" text="Remember this: build a simpler receipts routine." onClick={()=>void send('Remember this: build a simpler receipts routine.')}/>
            <Suggestion icon={<Monitor size={20}/>} title={'Look around my '+computer} text="Which apps are running?" onClick={()=>void send('Which apps are running on my '+computer+'?')}/>
            <Suggestion icon={<Command size={20}/>} title="Pick up my projects" text="What can Agent Console help me with?" onClick={()=>void send('List my Agent Console projects using the connected tools.')}/>
          </div>}
          <div className="messages">{messages.map(m=><article key={m.id} className={'message '+m.role+(m.error?' failed':'')}><div className="message-label">{m.role==='user'?'YOU':'ALFRED'}<time>{new Date(m.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</time></div><p>{m.text}</p></article>)}{state?.busy&&<div className="working"><span className="dot pulse"/>Alfred is working · results will appear here</div>}</div>
        </div>
        {state?.pending&&<section className="approval"><div><strong>Ready for your go-ahead</strong><p>{state.pending.tool.replace('__',' · ')}</p><pre>{JSON.stringify(state.pending.arguments,null,2)}</pre></div><div className="approval-actions"><button onClick={()=>void attempt(()=>window.alfred.decide(state.pending!.id,false))}>Cancel</button><button className="primary" onClick={()=>void attempt(()=>window.alfred.decide(state.pending!.id,true))}><Check size={16}/>Confirm action</button></div></section>}
        <footer className="composer-area"><div className="voice-controls"><button className={'listen '+(listening?'active':'')} disabled={state?.busy} onClick={()=>void toggleListen()}>{listening?<Square size={17}/>:<Mic size={19}/>} {listening?'Finish speaking':'Talk to Alfred'}</button><button className={'quiet '+(handsFree?'enabled':'')} onClick={()=>{setHandsFree(!handsFree);if(!handsFree)void listen();}}><Headphones size={17}/>{handsFree?'Conversation on':'Conversation mode'}</button><button className="icon-button" aria-label="Stop speech" onClick={()=>void stopAudio()}>{speaking?<Volume2 size={18}/>:<VolumeX size={18}/>}</button>{state?.busy&&<button className="quiet" onClick={()=>void attempt(()=>window.alfred.stop())}><Square size={14}/>Stop</button>}</div>
          {listening&&<div className="transcript">{partial||'I’m listening…'}</div>}
          <form className="composer" onSubmit={e=>{e.preventDefault();void send();}}><input aria-label="Message Alfred" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Or write a thought here…"/><button aria-label="Send message" disabled={!draft.trim()||state?.busy}><ArrowUp size={20}/></button></form><div className="composer-note">{state?.settings.voice==='system'?'System voice uses this computer.':'Voice uses your ElevenLabs account.'} You decide what gets done.</div>
        </footer>
      </>}
      {page==='ideas'&&<section className="page-content"><p className="intro">Your thoughts, saved on this {computer}. Nothing here starts work automatically. This inbox is the first piece of your second brain.</p><form className="idea-form" onSubmit={e=>{e.preventDefault();void attempt(async()=>{await window.alfred.saveIdea(draft);setDraft('');});}}><input aria-label="New idea" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Something worth remembering…"/><button className="primary" disabled={!draft.trim()}><Plus size={16}/>Save idea</button></form>{!state?.ideas.length&&<div className="empty"><Lightbulb size={32}/><h2>Make space for a thought.</h2><p>Say “Remember this…” or add your first idea above.</p></div>}<div className="ideas">{state?.ideas.map(i=><article className="idea" key={i.id}><div className="eyebrow">{i.source==='voice'?'SPOKEN THOUGHT':'SAVED THOUGHT'} · {new Date(i.at).toLocaleDateString()}</div><p>{i.text}</p><div className="idea-actions"><button onClick={()=>{setPage('talk');setDraft('Help me turn this saved idea into a task. First discuss the scope: '+i.text);}}>Discuss next steps <ChevronRight size={15}/></button><button aria-label="Delete idea" onClick={()=>void attempt(()=>window.alfred.deleteIdea(i.id))}><Trash2 size={15}/></button></div></article>)}</div></section>}
      {page==='activity'&&<section className="page-content"><p className="intro">Tool receipts from this {computer} and your connected services. A saved idea is not a completed task.</p>{!activity.length&&<div className="empty"><AudioLines size={32}/><h2>No actions yet.</h2><p>Completed tool calls will appear here, including failures.</p></div>}{activity.map(m=><details className="receipt" key={m.id}><summary><span className={'dot '+(m.error?'bad':'')}/><strong>{m.tool}</strong><time>{new Date(m.at).toLocaleTimeString()}</time><span>{m.error?'Failed':'Returned'}</span></summary><pre>{m.text}</pre></details>)}</section>}
    </main>
    {settings&&<div className="modal-backdrop"><section className="settings" role="dialog" aria-label="Connections and voice"><div className="modal-title"><div><span className="eyebrow">MAKE YOURSELF AT HOME</span><h2>Connections & voice</h2></div><button aria-label="Close settings" className="icon-button" onClick={()=>setSettings(false)}><X/></button></div>
      <div className="settings-body"><section><h3><Command size={18}/>Agent Console</h3><p>Sign in to discover your granted projects and tools.</p><label>MCP address<input value={form.consoleUrl||''} onChange={e=>setForm({...form,consoleUrl:e.target.value})}/></label><button className="secondary" onClick={()=>void attempt(async()=>{await window.alfred.configure({consoleUrl:form.consoleUrl});await window.alfred.connectConsole();})}><Link size={16}/>Connect Agent Console</button><small>{state?.console}</small></section>
      <section><h3><Monitor size={18}/>Your {computer} & browser</h3><p>{state?.mac}. {isWindows?'App control uses Windows UI Automation. Keep the target app open in this session; elevated and locked desktops are not supported.':'App control uses Peekaboo.'} Browser tools start only when connected.</p><div className="row"><button className="secondary" onClick={()=>void attempt(()=>window.alfred.check())}>Check permissions</button><button className="secondary" onClick={()=>void attempt(()=>window.alfred.connectBrowser())}>Connect browser tools</button></div><small>{state?.browser}</small><label>Folders Alfred may read</label>{state?.settings.roots.map(p=><small key={p}>{p}</small>)}<button className="secondary" onClick={()=>void attempt(()=>window.alfred.addFolder())}><Folder size={16}/>Choose a folder</button></section>
      <section><h3><AudioLines size={18}/>Local intelligence</h3><label>Ollama address<input value={form.ollamaUrl||''} onChange={e=>setForm({...form,ollamaUrl:e.target.value})}/></label><label>Model<input value={form.model||''} onChange={e=>setForm({...form,model:e.target.value})}/></label><small>{state?.model}</small></section>
      <section><h3><Mic size={18}/>Voice</h3><label>Voice service<select value={form.voice||'system'} onChange={e=>setForm({...form,voice:e.target.value as Settings['voice']})}><option value="system">{isWindows?'Windows speech · offline':'Mac speech · on-device'}</option><option value="elevenlabs">My ElevenLabs account</option></select></label><p>{isWindows?'Windows speech needs an installed offline speech language and microphone access. ElevenLabs is also available.':'Mac speech needs Microphone and Speech Recognition permission.'} Conversation mode listens again after Alfred finishes replying.</p>{form.voice==='elevenlabs'&&<><label>Existing ElevenLabs key<input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder="Leave blank to keep the saved key"/></label><label>Voice ID<input value={form.elevenVoice||''} onChange={e=>setForm({...form,elevenVoice:e.target.value})}/></label><small>Audio is sent to ElevenLabs and uses your account’s allowance. Keys are encrypted with {isWindows?'Windows DPAPI':'your Mac Keychain'}.</small></>}<label className="checkbox"><input type="checkbox" checked={form.speakReplies??true} onChange={e=>setForm({...form,speakReplies:e.target.checked})}/>Speak Alfred’s replies</label></section></div>
      <div className="modal-footer"><button className="primary" onClick={()=>void attempt(async()=>{await window.alfred.configure(form,key);setKey('');setSettings(false);})}>Save preferences <Check size={17}/></button></div>
    </section></div>}
  </div>;
}
function Connection({icon,name,value,onClick}:{icon:React.ReactNode;name:string;value?:string;onClick:()=>void}){return <button className="connection" onClick={onClick}>{icon}<span><strong>{name}</strong><small>{value||'Checking…'}</small></span><span className={'dot '+(['Ready','Connected','Local ideas inbox'].includes(value||'')?'':'pending')}/></button>;}
function Suggestion({icon,title,text,onClick}:{icon:React.ReactNode;title:string;text:string;onClick:()=>void}){return <button className="suggestion" onClick={onClick}>{icon}<strong>{title}</strong><span>{text}</span><ChevronRight size={16}/></button>;}
