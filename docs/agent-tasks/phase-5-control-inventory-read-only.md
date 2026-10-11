# OpenCode assignment: Phase 5 control inventory preparation

## Phase and boundary

Prepare Phase 5.4 while the Phase 5.1 Windows gate runs. This is a **read-only inventory**, not permission to implement Phase 5.4 yet. Do not edit source, tests, docs, or configuration; do not run package managers, installers, model downloads, live providers, or OS Trash. Use repository-local OpenCode V2 `opencode/space-bunny-free` with the `plan` agent.

## Owned files

No source files. The Codex runner writes the concise report and full log under `docs/agent-tasks/reports/phase-5-control-inventory/`. OpenCode only reads existing documents and code.

## Commands and scope

1. From repository root, run `git status --short` and read `docs/gates/first-party-installed-interaction-audit.md`, `docs/gates/editor-control-smoke.md`, and `docs/gates/workflow-control-smoke.md`.
2. Query the existing repository-local Graft graph through `scripts/with-local-env.ps1` and `.tools/graft/node_modules/@nanonets/graft/dist/cli.js map`; do not rebuild it during this read-only assignment. Use the graph map to locate the shared shell, Editor, Workflow bridge, and relevant smoke scripts before targeted source reads.
3. Build a short candidate list of reachable first-party controls not yet exercised in an installed build. For each, give the user action, expected observable result, local disposable fixture, existing test or gap, and likely source/test files. Prioritize ten high-value controls, including Editor timeline/export, Workflow graph wiring/run/cancel/JSON IDs, Manager review, project switching, keyboard/focus, and appearance.
4. Call out any control that requires live provider credentials, model weights, or a real third-party pack, and keep it separate from local-fixture work. Do not claim that static inspection proves functionality.

## Acceptance checks

- No tracked diff attributable to OpenCode; no dependency or lockfile writes.
- The list is evidence-based, with exact existing report/test references and clear gaps; avoid duplicating already passing controls.
- No credentials or full logs in the concise report.

## Report format

Final response: commands run, pass/fail counts (if any), ten candidate controls with expected result/fixture/test gap/file path, root cause for any inventory obstruction, changed files (none), remaining risks. Codex writes `report.md`; full output stays in `opencode-full.log`.
