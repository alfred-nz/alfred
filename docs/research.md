# Research before implementation — 16 November 2026

Outcome: speak to Alfred on this Mac, inspect and operate local applications, use the existing Agent Console MCP contract, and save ideas without confusing notes with authorized execution.

Inspected the local desktop Alfred, its modified working tree, Agent Console external MCP code and OAuth documentation. The original desktop code has Electron + React character art, Playwright browser actions, desktop screenshots and ElevenLabs STT/TTS. It does not contain general native Mac control. The Junction review repository is a different product. Original desktop checkout is left untouched.

The available OpenExec connector answered diagnostic_ping with 27 advertised tools; this session's grant is advisory/read oriented. Do not manufacture execution permissions or assume the Grok connection has the same scope. Live mcp.openexec.io OAuth discovery returned HTTP 404; the correct owner endpoint/client registration remains to be established.

Candidates examined:
- https://github.com/openclaw/Peekaboo : native Mac accessibility, screenshots and input; CLI/MCP; macOS 15+. Selected as replaceable native helper, with observation before interaction.
- https://github.com/microsoft/playwright-mcp : structured browser tool access. Selected as optional local MCP helper, started on demand.
- https://github.com/browser-use/browser-use : capable browser agent but adds a second planning loop; not necessary for this first implementation.
- https://github.com/ml-explore/mlx-lm : local Apple Silicon inference option. Ollama selected for the first simple local tool-calling endpoint.

Mac: Apple Silicon, macOS 26.6.2, 64 GiB memory. Peekaboo and Ollama initially absent. No plaintext ElevenLabs key found in existing settings. No credentials are copied implicitly.

Decisions: retain the character artwork, replace demo-specific bills/social workflows with conversation and explicit tool receipts. Keep model, Mac helper and Console adapters outside the renderer. Store data outside source control, use OS-encrypted credentials, and discover actual MCP tools. Unknown or mutating tools require an exact-action approval, including native clicks. Save user ideas as data, not automatic system instructions. Local model first, no added paid model APIs.

Verification: isolated container builds/tests; native desktop smoke tests are necessary and explicitly requested by the owner. Permission dialogs cannot be bypassed. Report actual tested outcomes separately from available integrations.
