# Phase 5.6 — final Windows gate log audit

## Scope and ownership

Read only. Own no source files. The Codex runner may write only the concise report and full OpenCode logs under `docs/agent-tasks/reports/phase-5-final-polish/`. Use `scripts/run-opencode-local.ps1` with `opencode/space-bunny-free`; all homes, sessions, caches, and temporary files remain inside this repository. Do not download models or contact hosted providers.

## Task and commands

1. Read the `final-polish-*` logs in `.local-cache/`, especially desktop tests, Vue tests/typecheck/build, Python tests, the fresh installed smoke logs, launch baseline/after, and brand audit.
2. Use Graft (`.tools/graft/node_modules/.bin/graft.cmd`) and the existing codebase-memory status before inspecting source. Check the diff only for the dark-default, splash, Projects, and Connections edits; do not modify it.
3. Run focused read-only checks only when a log does not establish an outcome, using `scripts/with-local-env.ps1`. Do not rerun the installer or full smoke sweep.
4. Identify any silent failure, skipped assertion, stale package evidence, or unsafe claim about startup improvement.

## Acceptance and report format

Save a short `report.md` with commands reviewed, pass/fail counts, first failing test if any, root cause or evidence gap, changed files (must be none), and remaining risks. Save the full OpenCode transcript and any command output as local log files in the same report folder. The Codex runner must review OpenCode's report and the git diff before reporting findings to the primary agent.
