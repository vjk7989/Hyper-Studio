# OpenCode assignment: second read-only project controls review

## Boundary

Current Windows project-controls gate. Use repository-local OpenCode V2 `opencode/space-bunny-free` with the read-only `plan` agent. Own no source files. Do not edit, format, commit, install, download models, launch the packaged smoke, or move any folder to Trash. A Codex runner captures logs and writes the concise report. All command state must stay inside this repository.

## Inspect

Review the latest, changing working tree, with priority on `apps/desktop/frontend/views/Projects.tsx`, `apps/desktop/frontend/components/home/HomeSidebarMenu.tsx`, `apps/desktop/frontend/contexts/ProjectContext.tsx`, `apps/desktop/electron/project-removal.ts`, `apps/desktop/electron/ipc/project-workspace-handlers.ts`, and `scripts/smoke-project-controls.mjs`. Check the IPC contract and broker active-job guard only as needed. Prefer codebase-memory graph for code definitions, but verify every finding against current source because the snapshot may be stale. Graft is repository-local; do not reindex manually. Record `git status --short` before and after.

## Non-destructive checks

From the repository root, through `scripts/with-local-env.ps1`, run:

1. `node --experimental-strip-types --test --test-reporter=spec apps/desktop/electron/project-removal.test.ts apps/desktop/electron/project-workspace.test.ts`
2. `node --experimental-strip-types --test --test-reporter=spec apps/desktop/frontend/components/home/home-sidebar-items.test.ts apps/desktop/frontend/lib/home-recent-projects-preference.test.ts`

If a concurrent edit causes a failure, capture the exact stack, reread the changed file, and rerun once. Do not fix it. Do not run Windows package smoke or real Trash.

## Report

Return commands, exit codes, pass/fail counts, failing tests and root causes. Identify only concrete likely runtime failures or interaction gaps in create, rename, app-only remove/reopen, Trash, recent sidebar menu, dialog focus/keyboard, restart, active jobs, or error recovery. Cite file paths and approximate lines, distinguish reproduced failures from static risks, and suggest one minimal smoke assertion per gap. State whether the graph was stale. Changed source files: expected none. The full transcript goes to `docs/agent-tasks/reports/project-controls-second-review/opencode-full.log`; Codex writes a short `report.md` there and reviews the working-tree diff.
