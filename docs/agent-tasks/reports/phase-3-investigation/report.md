# Phase 3 OpenCode test investigation

OpenCode 2.0.26 ran as the read-only `plan` agent with `opencode/space-bunny-free`. Its complete session is in `opencode-space-bunny-full.log`; the five command outputs are in numbered `.log` files here. Earlier authentication probes are retained in separate redacted logs.

## Commands run

| Command | Working directory | Exit | Result |
| --- | --- | ---: | --- |
| `..\..\scripts\with-local-env.ps1 corepack pnpm scripts:test` | `apps/desktop` | 0 | 1,447 passed, 0 failed; `01-desktop-tests.log` |
| `..\..\scripts\with-local-env.ps1 corepack pnpm typecheck:ts` | `apps/desktop` | 0 | TypeScript and internal checks passed; `02-typescript.log` |
| `..\..\scripts\with-local-env.ps1 corepack pnpm build:frontend` | `apps/desktop` | 0 | Desktop and remote frontend builds passed; `03-frontend-build.log` |
| `..\..\..\scripts\with-local-env.ps1 python -m unittest tests.test_provider_key_safety_isolated -v` | `apps/desktop/backend` | 0 | 3 passed, 0 failed; `04-backend-key-safety.log` |
| `.\scripts\with-local-env.ps1 python services/workflow/tests-unit/test_hyper_studio_nodes_stdlib.py` | repository root | 0 | 5 passed, 0 failed; `05-workflow-nodes.log` |

## Pass/fail counts

**1,455 tests passed; 0 failed; 0 skipped.** Desktop: 1,447 tests in 389 suites. Backend isolated: 3. Workflow node isolated: 5. Typecheck and build exited 0.

## Failing tests

None.

## Root cause

No test failure. The frontend build emitted non-blocking stale `caniuse-lite` and large-chunk warnings. Earlier paid-provider OpenCode probes failed before tools (invalid OpenAI/Anthropic credentials and insufficient OpenRouter credits); the free model completed this investigation.

## Changed files (expected: none)

OpenCode's tool trace contains shell and read/search calls, with no source edit call. The tracked diff hash changed during the run while other Codex work continued; `apps/desktop/index.html` and `scripts/smoke-packaged-electron.mjs` appeared or changed in `git status` across snapshots. These cannot be attributed to OpenCode from status alone. OpenCode's test shell generated one untracked PowerShell `ModuleAnalysisCache` under `apps/desktop/Microsoft/`. A scoped cleanup command was rejected by automatic approval review, so it remains for the root agent to assess. Snapshots of status and diff hashes are saved here.

OpenCode configuration, sessions, cache, logs, and temporary files were directed under this repository. The codebase-memory MCP connected to a **fixed repo-local snapshot** of project `G-Hyper-Studio-hyper-studio`; it is not the live Codex graph. The snapshot passed SQLite `PRAGMA quick_check`, with auto-index and auto-watch disabled. OpenCode did not need graph lookup to diagnose a failure.

## Remaining risks

- Full backend `pytest`, Python typecheck, dependency installation, and live provider calls were outside this bounded task. The isolated Python commands used system Python 3.13.6 because the backend virtual environment is absent.
- The graph snapshot may omit recent Phase 4 edits. It consumes about 792 MB in `.local-cache/codebase-memory-mcp` within the repository.
- The generated PowerShell cache directory remains untracked after automatic cleanup review rejected its removal. No source changes from OpenCode were observed in its tool trace.
