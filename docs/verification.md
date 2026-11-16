# Verification — 16 November 2026

## Demonstrated on the owner's Mac

- Packaged Electron app launched, rendered the redesigned interface, and was visually reviewed from screenshots.
- A typed "Remember this" saved a real idea. It remained visible after quitting and reopening with the same disposable test state.
- Local Qwen3 8B selected the native `mac_apps` tool; Peekaboo returned actual running applications. The result was stored as a tool receipt and summarized in the conversation.
- Playwright MCP started and advertised 25 browser tools.
- A model-proposed browser navigation paused for confirmation. Cancelling produced no navigation receipt. Repeating and approving navigated an isolated browser to example.com and returned its Example Domain content.
- Nine automated tests cover durable state, corrupt state refusal, approval binding/expiry/replay, conservative remote-tool authority, file-root traversal and symlinks, local-only inference endpoints, native argv construction, offline idea capture, and end-to-end model-write approval/rejection.
- TypeScript checks and production build pass. Dependency audit reports zero known vulnerabilities after updating Electron and Zod.

Screenshots and machine-readable smoke results are in ignored `test-results/`; they are not published because later runs may contain private app data.

## Integration availability versus outcomes

- Live `https://connect.perttu.ai` OAuth discovery advertises dynamic registration, PKCE, refresh tokens, and the expected MCP scopes. Alfred implements this flow with an encrypted token store and an exact loopback callback. Discovery alone is not proof of completed sign-in or task execution.
- Native permission inspection reports Screen Recording available, Accessibility missing. Running-app discovery works without full UI control. Native clicking/typing have not been demonstrated until the owner grants the correct host Accessibility access.
- Native on-device speech helper compiles and is packaged with microphone/speech usage descriptions. Successful transcription still requires permission and an actual speech test. No microphone-to-task outcome is claimed from compilation alone.
- ElevenLabs adapter is implemented but no account key was imported and no paid speech request was made.
- Local ideas are a working capture inbox, not a completed second-brain service or phone synchronization.

## Interventions and failed attempts

- The initial guessed MCP host `mcp.openexec.io` returned 404 for discovery. The owner supplied the correct `connect.perttu.ai/mcp` endpoint.
- Original Alfred working tree contained unrelated changes and was left intact. Only selected character components and types were copied with provenance.
- First Mac packaging attempt failed code signing because generic directory copying changed framework symlinks. Packaging now uses macOS `ditto` for the Electron bundle and preserves dependency symlinks.
- First native test observed state before the asynchronous model/tool turn completed. It was corrected to poll actual app state and require the successful persisted tool receipt; the complete rerun passed.
- Original Electron/Zod versions had advisories; both were updated and the dependency audit rerun successfully.
- UI critique found leftover demo controls, a heavy character shadow and a redundant status badge. They were removed; the original character art remains.

No production Console tasks, private messages, financial actions, merges or deployments were issued during testing. Local inference usage consumes this Mac's resources; monetary cost was not measured.

## Installed handoff

Installed at `~/Applications/Alfred.app`; source checkout at `~/projects/alfred-openexec`. The final attempted interactive sign-in/voice inspection was blocked because the Mac was locked and the computer-use tool could not unlock it. No account or macOS permission was bypassed. The app is built and installed, but Console sign-in, microphone transcription, and native clicks remain pending owner interaction.
