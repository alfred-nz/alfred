import React, { useEffect, useState } from 'react';
import { Check, Command, Download, Globe, HardDrive, Lightbulb, Lock, Monitor, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { AlfredCharacter } from '../src/components/AlfredCharacter';
import type { ButlerState } from '../shared/types';

// Fill in when builds are published (the source repository is private today).
const DOWNLOAD_MAC = '#download';
const DOWNLOAD_WINDOWS = '#download';

const noop = () => {};
function Butler({ state, onClick }: { state: ButlerState; onClick?: () => void }) {
  return <AlfredCharacter state={state} prop="none" audioLevel={state === 'speaking' ? 0.35 : 0} registerVolumeListener={() => noop}
    liveConnected={state === 'listening'} isWalking={false} stayPut walkDirection="left" onSummonClick={onClick || noop}
    onOpenSettingsDoubleClick={noop} onRightClickPreview={noop} onPerformAction={noop} onToggleStayPut={noop}
    onMinimizeToTaskbar={noop} onQuickListen={noop} onDragDelta={noop}/>;
}

type Step = 'asked' | 'thinking' | 'approval' | 'done' | 'cancelled';
const butlerFor: Record<Step, ButlerState> = { asked: 'listening', thinking: 'thinking', approval: 'awaiting_approval', done: 'speaking', cancelled: 'idle' };

export function Site() {
  const [hero, setHero] = useState<ButlerState>('idle');
  const [step, setStep] = useState<Step>('asked');
  useEffect(() => {
    if (step === 'asked') { const t = setTimeout(() => setStep('thinking'), 1200); return () => clearTimeout(t); }
    if (step === 'thinking') { const t = setTimeout(() => setStep('approval'), 1600); return () => clearTimeout(t); }
  }, [step]);
  const bow = () => { setHero('bowing'); setTimeout(() => setHero('idle'), 1800); };

  return <div className="site">
    <nav className="top"><a className="brand" href="#"><span className="hat">🎩</span>alfred</a>
      <div className="links"><a href="#how">How it works</a><a href="#limits">Limits</a><a className="pill dark" href="#download">Download</a></div></nav>

    <header className="hero">
      <div className="hero-copy">
        <span className="eyebrow">A LITTLE LESS SCREEN TIME</span>
        <h1>Your butler on screen.<br/>He asks first.</h1>
        <p className="lede">Talk or type. Alfred works on your computer, keeps your thoughts, and nothing happens without your yes.</p>
        <div className="buttons">
          <a className="pill dark" href={DOWNLOAD_MAC}><Download size={18}/>Download for Mac</a>
          <a className="pill" href={DOWNLOAD_WINDOWS}><Download size={18}/>Download for Windows</a>
        </div>
        <p className="fine">Free, MIT licensed. Early preview for macOS and Windows 10/11.</p>
        <p className="fine">Runs privately on Apple Silicon with 16 GB memory, or a PC with a 6 GB graphics card. Smaller computers work with your own AI API key. Alfred checks yours on first launch.</p>
      </div>
      <div className="hero-butler" title="Click Alfred"><Butler state={hero} onClick={bow}/></div>
    </header>

    <section className="moment">
      <span className="eyebrow">THE ONE THING TO KNOW</span>
      <h2>Alfred shows the exact action, then waits for you.</h2>
      <p className="lede narrow">Every click, keystroke and page visit is shown with its exact details before it happens. Try it.</p>
      <div className="demo">
        <div className="demo-butler"><Butler state={butlerFor[step]}/></div>
        <div className="demo-chat">
          <article className="msg you"><div className="label">YOU</div><p>Open the Junction results page.</p></article>
          {step === 'thinking' && <div className="working"><span className="dot pulse"/>Alfred is working · results will appear here</div>}
          {step === 'approval' && <section className="approval">
            <strong>Ready for your go-ahead</strong>
            <p>browser · browser_navigate</p>
            <pre>{'{\n  "url": "https://www.hackjunction.com"\n}'}</pre>
            <div className="approval-actions">
              <button onClick={() => setStep('cancelled')}><X size={16}/>Cancel</button>
              <button className="primary" onClick={() => setStep('done')}><Check size={16}/>Confirm action</button>
            </div>
          </section>}
          {step === 'done' && <article className="msg alfred"><div className="label">ALFRED</div><p>Done. The page is open in my own browser window, separate from yours.</p></article>}
          {step === 'cancelled' && <article className="msg alfred"><div className="label">ALFRED</div><p>Very well. I opened nothing.</p></article>}
          {(step === 'done' || step === 'cancelled') && <button className="replay" onClick={() => setStep('asked')}><RotateCcw size={15}/>Play again</button>}
        </div>
      </div>
      <p className="fine center">A replay of the app’s confirm step. In the app, saying “yes” works too.</p>
    </section>

    <section className="three">
      <span className="eyebrow">WHAT HE DOES</span>
      <h2>Three things, done properly.</h2>
      <div className="cards">
        <div className="card"><Lightbulb size={26}/><h3>Keeps a thought</h3><p className="say">“Remember this: collect receipts every Friday.”</p><p>Saved at once to an ideas inbox on your computer, even with no AI model running. A note never turns into a task on its own.</p></div>
        <div className="card"><Monitor size={26}/><h3>Looks around your computer</h3><p className="say">“Which apps are running?”</p><p>A local model reads your open apps and windows through the system’s accessibility tools. Looking needs no approval; acting does.</p></div>
        <div className="card"><Globe size={26}/><h3>Works the browser</h3><p className="say">“Find the opening hours and read them to me.”</p><p>In a separate browser profile, step by step, each step approved. Your own browser and its logins are never touched.</p></div>
      </div>
    </section>

    <section className="trust">
      <div className="trust-item"><HardDrive size={28}/><h3>Local</h3><p>By default the AI model runs on your computer through Ollama, and speech uses your system’s offline voice. Cloud models are your choice, never the default.</p></div>
      <div className="trust-item"><ShieldCheck size={28}/><h3>Asks first</h3><p>Each action needs a yes, bound to its exact details. Used once, then it expires.</p></div>
      <div className="trust-item"><Lock size={28}/><h3>Yours</h3><p>Notes and history stay on your computer. Keys are encrypted by your Keychain or Windows.</p></div>
    </section>

    <section className="video">
      <span className="eyebrow">SEE IT</span>
      <h2>A morning with Alfred, in two minutes.</h2>
      <div className="video-slot">Film coming soon</div>
    </section>

    <section className="how" id="how">
      <span className="eyebrow">HOW IT WORKS</span>
      <h2>For the curious.</h2>
      <div className="how-grid">
        <div><h3>Thinking</h3><p>Qwen3 8B through Ollama on your machine by default, in a bounded eight-step loop. Or choose any OpenAI-compatible endpoint, or an ElevenLabs voice agent, in Settings.</p></div>
        <div><h3>Seeing and doing</h3><p>Mac: Peekaboo with Accessibility permission. Windows: UI Automation, never in password fields or admin apps. No shell commands from the model.</p></div>
        <div><h3>Browser</h3><p>Playwright in an isolated Chrome or Edge profile, started only when a task needs it.</p></div>
        <div><h3>Your work</h3><p>Connects to OpenExec Agent Console over MCP with your own sign-in. Reading a project is not permission to run it.</p></div>
      </div>
    </section>

    <section className="limits" id="limits">
      <span className="eyebrow">HONEST LIMITS</span>
      <h2>What Alfred doesn’t do yet.</h2>
      <ul>
        <li>The builds are not yet signed by Apple or Microsoft, so your computer will warn you when you first open him.</li>
        <li>You need Ollama installed for anything beyond saving notes.</li>
        <li>No email, payments or messaging.</li>
        <li><b>Stop</b> halts what is running; it can’t undo an action that has already happened.</li>
        <li>Apps that draw their own controls, like some games and design tools, may not be readable.</li>
      </ul>
    </section>

    <section className="download" id="download">
      <Butler state="bowing"/>
      <div>
        <h2>Make room for your day.</h2>
        <div className="buttons">
          <a className="pill dark" href={DOWNLOAD_MAC}><Download size={18}/>Alfred for Mac</a>
          <a className="pill" href={DOWNLOAD_WINDOWS}><Download size={18}/>Alfred for Windows</a>
        </div>
        <p className="fine">Mac: macOS with Ollama. Shortcut ⌥ Space. Windows 10/11 x64: portable ZIP, an installed speech language, Ollama. Shortcut Ctrl Shift Space.</p>
      </div>
    </section>

    <footer className="foot"><span>🎩 alfred</span><span>Built by Team Odin at Junction 2026 · MIT licensed</span><span><Command size={13}/> Works with OpenExec</span></footer>
  </div>;
}
