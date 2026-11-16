# Alfred for Mac

A voice-first personal companion for OpenExec. Keep the Alfred character; replace the hackathon's social and payment demos with conversation, local Mac tools, your existing Agent Console, and a durable ideas inbox.

Private adaptation of the team's Alfred. See [NOTICE.md](NOTICE.md) before distributing any source or artwork.

## Use

Open **Alfred.app**. Click Alfred or **Talk to Alfred**, or press **Option–Space**. Mac speech uses on-device English recognition and the system voice. **Conversation mode** listens again after each spoken reply. You can always type instead.

- “Remember this: collect receipts every Friday.” saves a local idea immediately, even without a model.
- “Which apps are running?” asks the local model to inspect your Mac through Peekaboo.
- Connect Agent Console, then ask about the projects available to that connection.
- Connect browser tools, then ask to visit a page. Actions present the exact arguments and require “yes” or the Confirm button.

The menu-bar hat shows/hides Alfred and provides Stop and Quit. Closing the window hides it; quitting stops the app and its MCP children. Stop cannot undo an already completed external action.

## Connections

**Agent Console:** defaults to `https://connect.perttu.ai/mcp`. Sign in through the Console's OAuth/PKCE flow and choose projects. Alfred dynamically registers as a public client and uses loopback callback `http://127.0.0.1:17843/callback`. Your grant determines the catalog; read/advisory access is not execution authority. No credential from another client is copied. Tokens are encrypted with Electron safeStorage backed by the Mac Keychain.

**Mac:** install Peekaboo from its official Homebrew tap. Allow the actual Peekaboo host in System Settings → Privacy & Security → Accessibility. Screen capture uses Screen Recording permission. Alfred performs app/window discovery and structured accessibility observation; clicks, typing, key presses and app launches require approval. It does not invoke a shell for model-generated commands.

**Browser:** bundled Playwright MCP starts on demand and uses an isolated Chrome profile. Sign in separately when needed; your regular Chrome profile is not copied. Browser tools are conservatively confirmation-gated, including navigation. There is no browser process when no browser task has opened one.

**Local model:** install Ollama, run `ollama serve`, then `ollama pull qwen3:8b`. The default model is Qwen3 8B with thinking disabled and a bounded eight-step loop. Configure another tool-capable model in Connections. Only loopback inference endpoints are allowed in this version. The model may remain resident for five minutes after a request. Ollama is a separate process; quitting Alfred does not stop a shared Ollama server.

**Speech:** the native Swift helper requires Microphone and Speech Recognition consent. It refuses to fall back to remote Apple recognition if on-device recognition is unavailable. English (UK) is the initial recognition locale. Optional ElevenLabs speech input/output uses your explicitly configured existing key and account allowance; recording is manually ended in this version. No paid model API is configured.

**Files:** choose allowed folders in Connections. Tools list directories and read bounded text documents. Hidden and credential paths and symlink escapes are rejected. PDFs, receipt OCR, email and WhatsApp connectors are not implemented in this first version; they require a suitable connected tool or a tested browser/native-app workflow.

## Data and second brain

State lives outside the checkout in `~/Library/Application Support/OpenExec Alfred/`:

- `workspace.json`: conversation, tool receipts, preferences and ideas.
- `credentials.bin`: OS-encrypted credentials.

Files are written atomically with owner-only permissions. The ideas inbox is local storage with text search, not a complete second-brain knowledge graph or phone sync. Notes remain data and do not become standing instructions or executable tasks. Activity retains tool results locally, so it may contain private app/document content. It is never committed or uploaded by the app.

## Build and test

Node 22+, Docker for isolated tests, Xcode command-line tools for the Mac helper.

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
