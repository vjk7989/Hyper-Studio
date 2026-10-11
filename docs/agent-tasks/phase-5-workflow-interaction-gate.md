# Phase 5.4b — Workflow interaction gate

## Ownership

Own `scripts/smoke-workflow-controls.mjs`, `scripts/smoke-workflow-run-isolation.mjs`, and focused Workflow canvas/bridge source/tests under `apps/workflow-ui/src/` or `apps/desktop/frontend/views/WorkflowWorkspace.tsx`. Do not edit Editor or `todo.md`; coordinate any shared bridge file first.

## Work

1. Add deterministic installed-app checks for mouse port wiring, node edit and Undo, active queue cancel, and import/save/export JSON roundtrip with original node IDs. Use the managed engine and zero-model graph; never download model packs.
2. Reproduce and fix failed first-party controls without changing compatibility node IDs or weakening the engine token/origin boundary.
3. Report under `docs/agent-tasks/reports/phase-5-workflow-interactions/report.md`: commands, pass/fail counts, root cause, changed files, remaining limits. Full logs stay in the repository.

## Checks

Run relevant Vue/bridge tests through repository-local wrappers, TypeScript, `node --check` on changed smoke scripts, and `git diff --check`. The fresh installed Windows gate follows Codex diff review. Do not mark items `[x]` yourself.
