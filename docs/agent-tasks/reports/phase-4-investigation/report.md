# Phase 4 OpenCode read-only test investigation

**Runner:** repository-local OpenCode v2.0.26, `opencode/space-bunny-free`, plan agent. Exit code: 0. OpenCode made no source edits. Full session and command output: [opencode-full.log](opencode-full.log). Bounded assignment: [phase-4-read-only-test-investigation.md](../../phase-4-read-only-test-investigation.md).

| Check (through `scripts/with-local-env.ps1`) | Result |
| --- | --- |
| Five focused desktop test files: workflow runtime/config/files and provider broker/adapters | 43 passed, 0 failed |
| Desktop `corepack pnpm scripts:test` | 1,470 passed across 390 suites, 0 failed |
| Desktop `corepack pnpm typecheck:ts` | Passed |
| Python first-party workflow node tests | 5 passed, 0 failed |
| Packaged Custom provider cross-mode smoke | Passed: one saved profile, Editor and Workflow jobs, mode switch during pending job, two indexed outputs |

OpenCode ran the checks again after concurrent source changes and found no failing tests. No fix was proposed. The smoke used a keyless localhost mock; no credentials or model packs were used.

**Review:** The OpenCode trace contains test/read commands and no source-edit command. `git status` changed during the session because other Codex agents were committing Phase 4 work: HEAD moved from `3dd6b29` through `2b0263e` to `518e19d`. The final focused run passed at `518e19d`; the full suite, typecheck, Python test, and smoke were rerun just before that final commit, with the parent-agent test correction committed during the investigation. A fresh phase-gate run on a settled tree remains necessary before declaring Phase 4 complete.

**Graph/Graft:** Repository-local codebase-memory MCP connected to `G-Hyper-Studio-hyper-studio`; repository-local Graft `map` ran. The MCP snapshot reports 631,399 nodes and 891,823 edges but lacks new Phase 4 workflow/provider symbols, so its recorded HEAD is not a reliable freshness check. Reindex after concurrent edits settle. Graft displayed an anonymous telemetry notice; review its telemetry setting before future runs.

**Remaining risks:** Native macOS/Linux package smoke is pending CI. A PowerShell `Microsoft/Windows/PowerShell/ModuleAnalysisCache` appeared inside the repository during the session. Its origin is uncertain; it is untracked and should be removed before packaging. An automatic command review rejected my cleanup command, so I left it untouched.
