# Alfred for Mac and Windows

A voice-first personal companion for OpenExec on macOS and Windows 10/11 x64. Keep the Alfred character; replace the hackathon's social and payment demos with conversation, local desktop tools, your existing Agent Console, and a durable ideas inbox.

Built by Team Odin at Junction 2026; MIT licensed. See [NOTICE.md](NOTICE.md).

## Use

Open **Alfred.app** on Mac or extract the Windows ZIP and open **Alfred.exe**. Click Alfred or **Talk to Alfred**; the global shortcut is **Option–Space** on Mac and **Ctrl–Shift–Space** on Windows. System speech uses the platform’s offline recognizer and voice; Windows requires an installed speech language. **Conversation mode** listens again after each spoken reply. You can always type instead.

- “Remember this: collect receipts every Friday.” saves a local idea immediately, even without a model.
- “Which apps are running?” asks the local model to inspect your computer through its native desktop tools.
- Connect Agent Console, then ask about the projects available to that connection.
- Connect browser tools, then ask to visit a page. Actions present the exact arguments and require “yes” or the Confirm button.

The menu-bar/system-tray hat shows/hides Alfred and provides Stop and Quit. Closing the window hides it; quitting stops the app and its MCP children. Stop cannot undo an already completed external action.

## Connections

**Agent Console:** defaults to `https://connect.perttu.ai/mcp`. Sign in through the Console's OAuth/PKCE flow and choose projects. Alfred dynamically registers as a public client and uses loopback callback `http://127.0.0.1:17843/callback`. Your grant determines the catalog; read/advisory access is not execution authority. No credential from another client is copied. Tokens are encrypted with Electron safeStorage backed by Mac Keychain or Windows DPAPI.

**Mac:** install Peekaboo from its official Homebrew tap. Allow the actual Peekaboo host in System Settings → Privacy & Security → Accessibility. Screen capture uses Screen Recording permission. Alfred performs app/window discovery and structured accessibility observation; clicks, typing, key presses and app launches require approval. It does not invoke a shell for model-generated commands.

**Windows:** the portable ZIP bundles a .NET Framework helper using Windows UI Automation. It discovers running applications/windows, reads accessible controls, invokes/selects/focuses observed elements and replaces text in editable fields. Each action requires confirmation plus a fresh, single-use snapshot bound to its exact window and process. It excludes password fields. No global mouse/keyboard injection, UAC/elevated-app control, shell execution or administrator mode. Custom canvases may not expose usable controls. See [Windows quick start](docs/windows-quickstart.txt).

**Browser:** bundled Playwright MCP starts on demand and uses an isolated Chrome profile (or Edge on Windows when Chrome is not installed). Sign in separately when needed; your regular Chrome profile is not copied. Browser tools are conservatively confirmation-gated, including navigation. There is no browser process when no browser task has opened one.

**Local model:** install Ollama, run `ollama serve`, then `ollama pull qwen3:8b`. The default model is Qwen3 8B with thinking disabled and a bounded eight-step loop. Configure another tool-capable model in Connections. Only loopback inference endpoints are allowed in this version. The model may remain resident for five minutes after a request. Ollama is a separate process; quitting Alfred does not stop a shared Ollama server.

**Speech:** on Windows, the bundled helper uses System.Speech with an installed offline recognizer and system voice. Missing language/audio devices produce an actionable error; ElevenLabs remains optional. On Mac, the native Swift helper requires Microphone and Speech Recognition consent. It refuses to fall back to remote Apple recognition if on-device recognition is unavailable. English (UK) is the initial recognition locale. Optional ElevenLabs speech input/output uses your explicitly configured existing key and account allowance; recording is manually ended in this version. No paid model API is configured.

**Files:** choose allowed folders in Connections. Tools list directories and read bounded text documents. Hidden and credential paths and symlink escapes are rejected. PDFs, receipt OCR, email and WhatsApp connectors are not implemented in this first version; they require a suitable connected tool or a tested browser/native-app workflow.

## Data and second brain

State lives outside the checkout in `~/Library/Application Support/OpenExec Alfred/` on Mac or `%APPDATA%\OpenExec Alfred\` on Windows:

- `workspace.json`: conversation, tool receipts, preferences and ideas.
- `credentials.bin`: OS-encrypted credentials.

Files are written atomically; Unix files use owner-only modes, while Windows relies on the account’s AppData directory ACLs and DPAPI for credentials. The ideas inbox is local storage with text search, not a complete second-brain knowledge graph or phone sync. Notes remain data and do not become standing instructions or executable tasks. Activity retains tool results locally, so it may contain private app/document content. It is never committed or uploaded by the app.

## Build and test

Node 22+, Docker for isolated tests, Xcode command-line tools for the Mac helper. The Windows CI job builds on a fresh Windows runner and exercises the native helper and packaged Electron app.

```sh
docker run --rm -v "$PWD":/work -w /work node:22-bookworm npm ci --ignore-scripts
docker run --rm -v "$PWD":/work -w /work node:22-bookworm sh -c 'npm run typecheck && npm test && npm run build'
node node_modules/electron/install.js
npm run package:mac
npm run test:desktop
```

The last three commands run on the Mac because they package/test a native desktop app. The desktop smoke test uses disposable app data and an isolated browser. It runs the actual local model and records screenshots beneath ignored `test-results/`.

The packaged app is locally/ad-hoc signed, not Apple-notarized or auto-updating. Launch at login is not enabled automatically. No background email/bill scanning, payment automation, messaging, merge or deployment is scheduled.

See [research](docs/research.md) and [verification](docs/verification.md) for actual evidence and remaining limits.

## Windows build and download

The `Check Alfred` workflow produces an `Alfred-windows-x64` artifact only after the Windows native and packaged-app smoke tests pass. It contains a portable ZIP and SHA-256 checksum. Download/extract it and run `Alfred.exe`; see `START-HERE.txt` inside. No Node installation is required to run the package. The package contains no personal Mac settings, credentials or models.

To build on Windows x64 with Node and .NET Framework 4.x available:

```powershell
npm ci --ignore-scripts
node node_modules/electron/install.js
npm run build
npm run package:windows
npm run test:windows
```

The Windows test uses an actual disposable WinForms application and browser. Its model planner is a deterministic test fixture, not live model inference. Native speech synthesis is tested to a WAV; live microphone transcription and ElevenLabs account access still require a user's device/account test. Windows previews are unsigned (not Authenticode-signed); do not disable Windows security protections to run them.
