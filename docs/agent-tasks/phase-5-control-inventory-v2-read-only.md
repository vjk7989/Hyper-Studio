# Phase 5.4 — read-only reachable-control inventory

## Scope and ownership

Read only. Use repository-local OpenCode V2 `opencode/space-bunny-free` with the `plan` agent through `scripts/run-opencode-local.ps1`. Do not edit source, tests, `todo.md`, or gate records. Inspect the existing first-party installed smoke scripts, relevant React/Vue controls, and the repository-local Graft map. The Codex runner writes only the concise report and full tool log under `docs/agent-tasks/reports/phase-5-control-inventory-v2/`. No source files are owned.

## Task

1. Inventory reachable first-party controls in first run, Projects/Recent, Home/Explore, Connections/Settings, Editor, Workflow, Manager, and export. For each category, state expected result, disposable or mocked fixture, current test evidence, and an uncovered control or defect. Prioritize actual user actions over hidden internals.
2. Identify controls still lacking installed Windows evidence, especially Editor drag/blade/trim/render, Workflow mouse wiring/edit/Undo/cancel/JSON IDs, Manager review/update/uninstall, cross-mode media after restart, and theme persistence.
3. Run bounded read-only relevant tests through `scripts/with-local-env.ps1`; record exact commands and pass/fail counts. Do not invoke model downloads or live providers. Do not run full package build.
4. Use the existing repository-local Graft graph (`map`) and note when codebase-memory is stale. Do not rebuild either graph.

## Acceptance

- Run focused existing tests with `& ./scripts/with-local-env.ps1 -Executable ./.tools/node-v26.8.2-win-x64/node.exe -Arguments @(...)`; record exact arguments, exit code, and pass/fail counts. Use the checked-in Vitest binary with one worker for bounded Vue tests.
- Do not install packages, build an installer, download model packs, call live providers, or move files to Trash.
- No tracked diff attributable to OpenCode. Distinguish concurrent Codex edits and prior installed-gate evidence from tests run in this assignment.
- Treat smoke-script syntax checks as syntax only; do not mark a user control passed without executed evidence.

## Report

Write `report.md` with a compact control table: surface, expected result, fixture, test/evidence, status (`pass`, `gap`, `fail`), defect reference. Include commands, pass/fail counts, root cause for any reproduced failure, changed files (must be none), and remaining risks. Keep verbose output only in the full log.
