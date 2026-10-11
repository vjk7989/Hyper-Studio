# Phase 5.4 — Windows installed control gate triage

## Scope and ownership

Read only. The Codex OpenCode runner owns only `docs/agent-tasks/reports/phase-5-windows-ci-triage/` for the concise report and full logs. OpenCode must not edit source, tests, workflow YAML, `todo.md`, or gate records. Use repository-local OpenCode V2 through `scripts/run-opencode-local.ps1` with `opencode/space-bunny-free`; keep its config, sessions, caches, and temporary files under this repository.

## Task

1. Inspect Windows Actions run `38129399057` and the relevant installed smoke scripts. Download only its small failure diagnostics into `.local-tmp` if the run fails. Do not download the installer, model weights, or live provider media.
2. Identify the first failing command, exact assertion and source/test path, prior passed controls, and whether the cause is the product, fixture, test timing, or infrastructure. Cite local log lines and artifacts in the report.
3. Run only focused repository-local checks through `scripts/with-local-env.ps1` that clarify the failure. Do not run a package build, call hosted providers, or write to user data outside the checkout.
4. Review the current Graft map and codebase-memory graph status; use current source when a graph snapshot lags HEAD.

## Acceptance and report

Report the run URL/SHA, command list, pass/fail counts, first failure, root cause with evidence, proposed bounded fix, changed files (must be none), and remaining risks. Distinguish OpenCode findings from commands run by its Codex runner. Keep the full transcript and CLI outputs in the report folder as ignored local logs. Codex reviews the report and any proposed fix before changing source.
