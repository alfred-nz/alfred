# Windows support research — 16 November 2026

The owner wants to demonstrate Alfred to a teammate on Windows. Preserve the shared character, conversation, Console MCP, optional ElevenLabs, local model and capture inbox. Add platform-specific desktop/speech adapters and deliver a downloadable Windows x64 package; do not describe cross-compilation as a tested Windows user journey.

Sources consulted before implementation:
- Microsoft UI Automation overview: https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-uiautomationoverview
- UI Automation client overview: https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-clientsoverview
- Windows integrity-level limitations: https://learn.microsoft.com/en-us/troubleshoot/power-platform/power-automate/desktop-flows/ui-automation/uipi-issues
- Installed offline speech recognizers: https://learn.microsoft.com/en-us/dotnet/api/system.speech.recognition.speechrecognitionengine.installedrecognizers?view=netframework-4.8.1
- Electron safeStorage uses Windows DPAPI: https://www.electronjs.org/docs/latest/api/safe-storage

Decision: bundle a small .NET Framework helper using the OS UI Automation API and System.Speech. It exposes only fixed typed operations over JSON stdin/stdout. It does not run model-supplied scripts, launch arbitrary command lines, request elevation, or send unscoped global mouse/keyboard input. This avoids introducing an additional agent framework or a separately authenticated paid provider. Windows 10/11 x64 includes the .NET Framework runtime; speech recognition additionally depends on installed offline speech language packs.

Each Windows observation produces a short-lived Node-side receipt binding the exact window, process generation, and observed element runtime IDs. Actions require both the existing owner approval and a fresh receipt, and the native helper revalidates the target. Prefer Invoke/Selection/Value patterns; custom canvases or applications with poor accessibility may not expose usable controls. Elevated applications and secure desktops are outside this implementation.

Package on a Windows GitHub Actions runner, test the compiled helper against a disposable WinForms fixture, then test the actual Electron UI and archive the portable package and screenshots. No personal credentials or Mac state are included. Native speech availability must be reported truthfully; the optional ElevenLabs route remains available when an offline recognizer is absent.
