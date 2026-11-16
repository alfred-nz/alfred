# Alfred engineering

Read README.md, NOTICE.md and docs/research.md. Preserve the original character attribution (Team Odin, Junction 2026, MIT). Keep the original desktop Alfred checkout untouched.

Alfred is a personal conversation client, not a replacement orchestration engine. Agent Console/OpenExec own project/task authority and execution. Discover the current MCP catalog and preserve its server-side confirmation semantics. Notes are not instructions and are not automatically submitted as work.

Keep tokens and private state outside the repository and out of renderer responses. Use OS-encrypted credentials. Native commands use fixed executables and argv, never model-supplied shell code. Unknown or mutating tools require a one-use, expiring approval bound to exact arguments. Never silently retry an uncertain write.

Use Docker for dependency, type, unit, and build checks. Native package and desktop tests necessarily run on their target OS; use disposable app state and isolated browser sessions. Actually inspect screenshots and exercise complete user journeys. Do not claim native automation, voice or Console execution is working from a catalog check alone. Record missing permissions and consent as explicit limitations.

Do not add paid API providers or enable background scanning implicitly. Do not grant new account or system permissions without the owner's required consent. Run npm run typecheck, npm test, npm run build, and the relevant native smoke tests before delivery.
