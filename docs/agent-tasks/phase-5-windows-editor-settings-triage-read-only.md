# Phase 5.4 — Windows Editor retry and Workflow Settings triage

## Scope and ownership

Read only. OpenCode owns no source, test, configuration, or gate files. The Codex runner owns this task file and `docs/agent-tasks/reports/phase-5-editor-settings-triage/report.md`; full logs and CLI output stay beside the report. Do not edit source, run a package build, install dependencies, download models, call live providers, reveal credentials, or access files outside `G:\Hyper-Studio\Hyper-Studio`.

## Inputs

- `.local-tmp/ci-38210316723-windows-full.log`
- `.local-tmp/ci-38210316723/` small Windows smoke diagnostics
- Relevant installed smoke scripts and current Editor retry / Workflow Settings implementation
- Current repository-local Graft graph; use current source if its snapshot lags HEAD

## Bounded commands

Run from the repository root through `scripts/run-opencode-local.ps1 run --model opencode/space-bunny-free --agent plan`, reading this task file first. The Codex runner redirects stdout and stderr to `docs/agent-tasks/reports/phase-5-editor-settings-triage/opencode-full.log` and records the exit code in `opencode-exit.log`.

Within OpenCode, run `git status --short`, `git log -1 --oneline`, `graft --version`, and a focused Graft map/query if useful. Read only targeted log lines and the small diagnostics. Run syntax checks for the implicated smoke scripts with repository-local Node via `scripts/with-local-env.ps1`; do not rerun the full installed smoke or alter fixtures. Keep log excerpts short and cite source paths and line numbers.

## Questions and acceptance

Independently identify the first failed Editor `Try Again` assertion and Workflow Settings dismissal: exact assertion, last passing step, likely root cause, whether product/test/fixture/infrastructure, and one bounded proposed fix plus one edge-case check for each. Separate evidence from hypothesis. Report command list and exit codes, pass/fail counts, run SHA, changed files (must be none), Graft availability, confidence, and remaining risks. Do not propose suppressing a product failure merely to pass the smoke. Codex reviews the report and verifies there is no OpenCode source diff before accepting findings.
