# Phase 5.4 — read-only reachable-control inventory

## Scope and ownership

Read only. Do not edit source, tests, `todo.md`, or gate records. Inspect the existing first-party installed smoke scripts, relevant React/Vue controls, and the repository-local Graft map. Write only the concise report and full tool log under `docs/agent-tasks/reports/phase-5-control-inventory-v2/`.

## Task

1. Inventory reachable first-party controls in first run, Projects/Recent, Home/Explore, Connections/Settings, Editor, Workflow, Manager, and export. For each category, state expected result, disposable or mocked fixture, current test evidence, and an uncovered control or defect. Prioritize actual user actions over hidden internals.
2. Identify controls still lacking installed Windows evidence, especially Editor drag/blade/trim/render, Workflow mouse wiring/edit/Undo/cancel/JSON IDs, Manager review/update/uninstall, cross-mode media after restart, and theme persistence.
3. Run bounded read-only relevant tests through `scripts/with-local-env.ps1`; record exact commands and pass/fail counts. Do not invoke model downloads or live providers. Do not run full package build.
4. Use the existing repository-local Graft graph (`map`) and note when codebase-memory is stale. Do not rebuild either graph.

## Report

Write `report.md` with a compact control table: surface, expected result, fixture, test/evidence, status (`pass`, `gap`, `fail`), defect reference. Include commands, pass/fail counts, root cause for any reproduced failure, changed files (must be none), and remaining risks. Keep verbose output only in the full log.
