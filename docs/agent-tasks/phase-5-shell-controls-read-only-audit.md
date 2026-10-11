# OpenCode assignment: Phase 5.3 shared-shell control audit

## Phase and boundary

Phase 5.3, after the shared-shell controls commit `20c16c0`. Use repository-local OpenCode V2 `opencode/space-bunny-free` with the read-only `plan` agent. Inspect likely installed-app regressions in menus, Settings focus, and Connections busy states. Do not edit source, tests, docs, configuration, or lockfiles; do not commit, install dependencies, run an installer, download models, access live providers, or read credentials.

## Owned files

No source or test files. The Codex runner alone writes the concise report and full local log under `docs/agent-tasks/reports/phase-5-shell-controls-audit/`.

## Commands and scope

1. From repository root, run `git status --short`, `git show --format= --name-only 20c16c0`, and inspect only the relevant `git show 20c16c0 -- <path>` hunks. Note the exact commit and whether the working tree changes during your run.
2. Query the existing repository-local Graft graph through `& ./scripts/with-local-env.ps1 -Executable ./.tools/node-v26.8.2-win-x64/node.exe -Arguments @('./.tools/graft/node_modules/@nanonets/graft/dist/cli.js','map')`. Do not rebuild it. Use targeted source reads where the graph is stale.
3. Trace each changed first-party control from UI handler to expected behavior: Home recent menu and Projects actions, Settings modal focus/return and shortcut handoff, Quick Search keyboard behavior, and Connections save/delete/test disabled or busy states. Inspect `scripts/smoke-first-party-controls.mjs`, `scripts/smoke-project-controls.mjs`, and `scripts/smoke-settings-shortcuts.mjs` for what they actually assert. Cite exact file/line evidence and distinguish observed test failure from a static risk.
4. Run only focused, stable tests from repository root with `& ./scripts/with-local-env.ps1 -Executable ./.tools/node-v26.8.2-win-x64/node.exe -Arguments @('--experimental-strip-types','--test','--test-reporter=spec','apps/desktop/frontend/components/settings/connection-action-gate.test.ts','apps/desktop/frontend/lib/home-shell.test.ts')`. Record exit code and pass/fail counts. If the command fails, reproduce only that failure once; do not run the full suite or build.
5. Identify at most eight concrete installed-smoke risks or missing assertions, each with a small proposed verification. Do not declare all controls functional based on static inspection.

## Acceptance checks

- OpenCode makes no tracked diff, no lockfile or dependency changes.
- Commands, exit codes, pass/fail counts, failing tests, cause, and changed files (expected none) are explicit.
- Findings prioritize real event sequencing, keyboard/focus, busy/disabled behavior, and error recovery. No secrets or full logs in the concise report.
- Codex independently reviews the source evidence and `git diff` before using any proposed fix.

## Report format

Return a concise table of commands/results, prioritized findings with evidence and verification, and remaining risks. The runner saves that as `report.md`; complete OpenCode output stays in `opencode-full.log` with `opencode-exit.log` in the same repository folder.
