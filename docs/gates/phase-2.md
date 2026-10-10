# Phase 2 gate: one project workspace

## Identity

- **Date / host:** 2026-10-10, Windows x64, `G:\Hyper-Studio\Hyper-Studio`.
- **Base checkpoint:** Phase 1 baseline commit `df6e295`; Phase 2 changes remain in the working tree at this report.
- **Scope checked:** Shared-storage setup, project manifest/editor file, registry containment, media index/watch, legacy import, tagged Editor generation output, SQLite path migration, and desktop build.
- **Not in this gate:** Provider profile broker, runnable workflow canvas, model-backed inference, installers, macOS/Linux packages.

## Checks

| Check | Exact command or inspection | Result | Evidence / limit |
| --- | --- | --- | --- |
| Desktop script tests | From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm scripts:test` | **Passed** | 1,415 passed, 0 failed. Includes new Electron project and frontend workspace tests. |
| TypeScript | From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm typecheck:ts` | **Passed** | Exit 0. |
| Frontend build | From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm build:frontend` | **Passed** | Exit 0; package script includes desktop frontend, Electron main/preload, and remote Vite build. No installer build was run. |
| Python workspace/SQL gate | From `apps/desktop`: `..\..\scripts\with-local-env.ps1 python backend/tests/stdlib_check_project_workspace.py` | **Passed** | 2/2: registry/manifest mismatch and traversal rejection; fresh and legacy SQLite migration to version 2. |
| Python asset store | Copied `backend/tests/test_store.py` to `.local-tmp/test_store_isolated.py`; with `PYTHONPATH` pointing to `backend` and repository-local `.tools/python-test-deps`, ran `..\..\scripts\with-local-env.ps1 python -m pytest ..\..\.local-tmp\test_store_isolated.py -q` | **Passed** | 108/108, including project output persistence after reopen and safe deletion. Only small imageio dependencies were installed under this repository. |
| Python syntax | From `apps/desktop`: `..\..\scripts\with-local-env.ps1 python -m compileall -q backend/ltx2_server.py backend/handlers backend/services/project_workspace.py backend/services/sqlite_store.py` | **Passed** | Exit 0. |
| Full backend pytest | From `apps/desktop`: `..\..\scripts\with-local-env.ps1 python -m pytest backend/tests/test_store.py -q -x` | **Unverified** | Test collection stopped on `ModuleNotFoundError: ltx_core`; full Torch/LTX runtime and model packs were intentionally not downloaded. This is an environment limit, not a passing test. |
| Graft refresh | From repo root: `.\scripts\with-local-env.ps1 node .tools\graft\node_modules\@nanonets\graft\dist\cli.js build .` then `map --max-dirs 12` | **Passed** | 2,270 files, 33,404 wiring nodes, 75,468 edges, 2,270 cards; 48 files parsed and 2,222 replayed from cache. Graft remains ignored local state. |
| Mode and media | Source/test review of `electron/project-workspace.ts`, `electron/ipc/project-workspace-handlers.ts`, `frontend/lib/workspace-media.ts`, and new tests | **Code-level passed** | Editor and Workflow placeholder read the same project index; watcher polls every 2 seconds. A real workflow graph was not executed. |
| Installer and OS smoke | Not run | **Unverified** | Windows installer and macOS/Linux packaging remain Phase 5 work. |

## Failures and fixes

| Failure | Root cause | Resolution | Re-run evidence |
| --- | --- | --- | --- |
| Full backend suite could not collect | Available Python lacks `ltx_core` and the large inference stack | Kept model packs off this phase; ran isolated asset-store and dependency-free workspace/migration checks | 108/108 store tests, 2/2 workspace checks, compileall exit 0. Full suite remains unverified. |
| Project output could cross C/G volumes | Queue in-flight file and selected project can be on different drives | Copy to destination-side `.partial`, rename atomically, then remove source; rollback handles moved outputs | Project output store test and 108/108 isolated store suite passed. |

## Gate decision

- **Status:** Workspace checkpoint passed on available code-level checks. Full application acceptance remains open.
- **Reason:** No available Phase 2 automated check failed. Manifest/media persistence, containment, legacy migration, and tagged output paths have focused coverage. The workflow engine is not yet integrated, and model-backed Python execution was not verified.
- **Next entry:** Phase 3 may implement secure global provider profiles and jobs on top of this workspace boundary. Phase 4 must wire workflow engine project paths and run the cross-mode execution gate; Phase 5 must package and smoke-test all target OSes.
- **Architecture/code-map/handoff:** Updated with the exact checkpoint, trust boundary, known absolute queue-path limit, and Graft result.
