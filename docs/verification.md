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

Final package correction: excluded development `.bin` symlinks referring to the intentionally omitted Electron package. The packaging script now performs strict deep signature verification and succeeds. Initial GitHub CI passed all type, unit and production-build checks.

## Windows adaptation — 16 November 2026

The Windows helper was exercised on GitHub's Windows runner against a disposable WinForms application, not against the owner's data. Native observation excluded the password value; text replacement was verified through UI Automation; a button invocation was verified by observing the changed label. Reusing the action snapshot was refused. Native speech synthesized an actual WAV. The packaged Electron app launched and retained an idea across a complete quit/relaunch. A deterministic planner fixture selected the real native tool and its result was retained. This tests integration, not live Windows LLM quality.

The Windows screenshots were visually reviewed. The first capture revealed that unconditional conversation scrolling clipped the welcome header on a shorter Windows desktop. Scrolling now occurs only when messages exist, and compact-height spacing keeps the character, suggestions, composer and shortcut visible together.

Interventions:
- The first Windows compiler attempt treated a slash-separated source path incorrectly. Passing an absolute native path fixed compilation.
- The browser test initially timed out despite a successful real navigation. Inspection of persisted receipts revealed that the current Playwright version writes automatic snapshots to a file and returns its link. Alfred now requests the explicit read-only snapshot through MCP after such results, so the planner receives real page content and element references. It never opens a tool-provided file path or retries the original action. Additional tests cover that observation and failure handling.

The Windows package is an unsigned x64 portable preview. Live microphone input, audible output on the friend's speakers, ElevenLabs account access, Console sign-in/task execution, and real-model Windows planning still need device/account verification. No paid speech requests were made. The test runner's recognition language inventory is recorded in its evidence. The Windows helper supports accessible controls rather than arbitrary pixel input, elevated windows or the secure desktop.

Final Windows run [43883018777](https://github.com/openexec/alfred/actions/runs/43883018777), implementation commit `7c09144`, passed both jobs: type checks, all 16 automated tests, production build, Windows packaging, native UIA/speech tests and the packaged Electron/browser smoke journey. The browser test verified both rejected navigation (no execution) and approved navigation with actual page-heading content. The workflow produced the `Alfred-windows-x64` ZIP/checksum artifact and `windows-test-evidence` screenshots/summary. The downloadable package is built from this tested implementation; subsequent documentation-only changes do not alter its binaries.
