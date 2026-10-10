# OpenCode assignment: remaining installed-control investigation

## Boundary

Current post-final5 functional smoke gate. Run repository-local OpenCode V2 with `opencode/space-bunny-free` and its read-only `plan` agent. Own no source files. Do not edit, format, commit, install, download model packs, call live providers, or move folders to Trash. All files, caches, logs, sessions, and temporary data stay under `G:\Hyper-Studio\Hyper-Studio`. The Codex runner reviews the report and source before accepting any finding.

## Inspect

1. Editor Undo history after an overlay edit and autosave: `apps/desktop/frontend/views/editor/editor-actions.ts`, `editor-state.ts`, `VideoEditorView.tsx` and related state hooks. Prior installed smoke passed immediate Undo/Redo, but an earlier harness saw Undo disabled after waiting for persistence. Determine whether a real state reset exists or the harness crossed a project reload. Do not assert a defect from timing alone.
2. Embedded Workflow local Run: `scripts/smoke-workflow-controls.mjs`, `scripts/smoke-workflow-run-isolation.mjs`, relevant Vue graph/queue code. A multi-tab sequence once displayed `Required input missing: Save Image ... images` alongside a produced output; a clean isolated Run passed. Identify a reproducible cause or mark unresolved.
3. Review remaining first-party control coverage in `docs/gates/project-controls-interaction-audit.md` and the installed reports. Rank three feasible next local fixture checks that need no model pack or live API.

Prefer the codebase-memory graph for definitions, but verify against current source because its fast index crashed. Graft is under `graft/`; use its existing graph if useful. Record `git status --short` before and after.

## Non-destructive commands

From the repository root, use `scripts/with-local-env.ps1` and the repository-local Node binary. Run the focused Editor history regression (`apps/desktop/frontend/views/editor/editor-actions.test.mjs` with its loader) and the focused Vue `useConflictDetection.test.ts`. Capture exit codes and pass/fail counts. Do not launch installed-app smoke; analyze its saved logs/reports only. No source edits.

## Report

Write a concise report under `docs/agent-tasks/reports/project-controls-deeper-review/report.md`: commands and results, reproduced failures (if any), root cause with file/line evidence, proposed minimal fix or new assertion, changed files (expected none), and remaining risks. Keep the full transcript in a sibling `.log` file. Codex will review findings and diff before any implementation.
