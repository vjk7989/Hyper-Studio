# Phase 5.4 — Workflow queue-cancel smoke triage

## Phase and ownership

Investigate the current Windows installed-app Workflow queue-cancel failure. This is **read-only**: OpenCode owns no source, test, configuration, or documentation files. The Codex runner owns this task file and `docs/agent-tasks/reports/phase-5-workflow-queue-triage/report.md`; full logs remain in that report folder, ignored by Git. Do not edit files, commit, build packages, install dependencies, download models, call live providers, print credentials, or access outside `G:\Hyper-Studio\Hyper-Studio`.

## Inputs

- `.local-tmp/workflow-control-smoke-1791743508554/electron.log`
- `.local-tmp/workflow-control-smoke-1791743508554/workflow-project/.hyper-studio/workflow/user/comfyui_53005.log`
- `scripts/smoke-workflow-controls.mjs`, especially queue/cancel around line 159 and its fixture setup
- Relevant first-party Workflow queue/cancel UI and managed engine source, using the repository-local Graft graph first

## Exact bounded commands

Run from the repository root. Use only the repository-local OpenCode 2.0.26 runner with `opencode/space-bunny-free` and `plan`: `& ./scripts/run-opencode-local.ps1 run --model opencode/space-bunny-free --agent plan '<read this task and investigate read-only>'`. The Codex runner redirects its full stdout/stderr to `docs/agent-tasks/reports/phase-5-workflow-queue-triage/opencode-full.log` and records its exit code in `opencode-exit.log`.

Within OpenCode, run `git status --short`, `git log -1 --oneline`, `graft --version`, and `graft map` (or state if unavailable). Read only targeted lines from the listed logs and source. Filter the large Electron log to queue/cancel/interrupt, errors, timestamps, and requests; do not dump it into the conversation or report. Run `& ./scripts/with-local-env.ps1 -Executable ./.tools/node-v26.8.2-win-x64/node.exe -Arguments @('--check','scripts/smoke-workflow-controls.mjs')` and record exit code. Do not run the full installed smoke, tests that create files, or packaging.

## Questions and acceptance

Identify the exact failed assertion, last passing step, and whether cancel was disabled because no job was active, a timing/selector issue, or a product defect. Reconcile the engine's prompt start/completion timestamps with the UI and any `/interrupt` request. Separate evidence from hypothesis. Propose one bounded fix and one edge-case test, naming the source owner for Codex. Report commands and exit codes, pass/fail counts, root-cause confidence, changed files (expected none), Graft availability, and remaining risks. No source diff attributable to OpenCode is acceptable.
