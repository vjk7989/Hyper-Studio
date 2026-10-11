# OpenCode assignment: Phase 5.2 first-run edge cases and smoke coverage

## Phase and boundary

Phase 5.2, first-run connection choice and shared-storage shell. Use repository-local OpenCode V2 with `opencode/space-bunny-free` and the read-only `plan` agent. This is a snapshot during active Codex implementation. Do not edit source, tests, docs, configuration, or lockfiles; do not run package installation, builds, packaged apps, model downloads, live providers, or OS Trash. Do not read or print credentials.

## Owned files

None. The Codex runner alone writes `docs/agent-tasks/reports/phase-5-first-run-audit/report.md`, `opencode-full.log`, and `opencode-exit.log`. OpenCode may read files only.

## Commands and scope

1. From repository root run `git status --short` and record the current implementation snapshot. Read the Phase 5.2 rows of `todo.md` and `docs/gates/phase-5-experience-switch-gate.md`.
2. Query the existing Graft map with `./scripts/with-local-env.ps1 -Executable ./.tools/node-v26.8.2-win-x64/node.exe -Arguments @('./.tools/graft/node_modules/@nanonets/graft/dist/cli.js','map')`. Do not rebuild or modify the graph. Use it to locate first-run and shared-shell control paths; targeted source reads are allowed when the graph is stale.
3. Inspect `apps/desktop/frontend/App.tsx`, `apps/desktop/frontend/components/first-run/`, `apps/desktop/frontend/components/projects/`, `apps/desktop/electron/app-state.ts`, the matching typed IPC schema/handlers, and their focused tests as they exist now. Trace storage selection, no-profile connection choice, Explore persistence, existing-profile bypass, locked-vault/list error, picker cancellation, keyboard focus, and reduced motion. Identify only concrete gaps or untested edge cases with file/line evidence.
4. Inspect the Windows installed-app smoke entry points and CI workflow. List exactly which smoke scripts will be blocked by a fresh first-run connection choice and where to add an assertion or dismiss action. Check how CI handles package build, shared storage, app profile isolation, and the unsigned installer. Do not run the large smoke or CI jobs.
5. Do not run tests while Codex agents are editing these same files. Report existing focused tests and proposed commands through `scripts/with-local-env.ps1` that Codex should run once edits settle. If a safe, already-stable focused test is available, run it once and report exit code/count; otherwise state no tests run.

## Acceptance checks

- Read-only: no tracked diff attributable to OpenCode, no dependency/lockfile writes.
- Name at most ten prioritized findings; distinguish reproduced failures, code-observed risks, and coverage gaps.
- Cite exact smoke/test and implementation files; include a minimum verification action per issue.
- State pass/fail counts honestly; do not infer functioning from static inspection.
- Full output remains in the repository log, concise report contains no secrets.

## Report format

Return: commands run with exit codes; pass/fail counts; failing tests, if any; prioritized findings with root cause, evidence and proposed verification; changed files (expected none); remaining risks. Keep it concise. Codex reviews the report and `git diff` before accepting a finding.
