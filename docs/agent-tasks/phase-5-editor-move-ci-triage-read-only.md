# Phase 5.4 — Windows Editor clip-move failure triage

## Phase, boundary, and owned files

Read-only investigation of [Windows Actions run 38161000701](https://github.com/vjk7989/Hyper-Studio/actions/runs/38161000701). Use repository-local OpenCode V2 `opencode/space-bunny-free`, `plan` agent, via `scripts/run-opencode-local.ps1`. OpenCode owns **no source, test, configuration, or documentation files**. The Codex runner writes only `docs/agent-tasks/reports/phase-5-editor-move-ci-triage/report.md` and its local logs. Do not edit source/tests, commit, install, build, download models, call live providers, print secrets, or access data outside the repository.

## Read-only input files

- `.local-tmp/ci-38161000701-job.log`
- `.local-tmp/ci-38161000701/editor-controls-*/clip-move-evidence.json`, `drag-evidence.json`, and `failure.png`
- `scripts/smoke-editor-controls.mjs` at the run SHA (`git show`) and current HEAD; current Editor clip drag/move source reached through Graft and targeted reads
- Existing `docs/gates/editor-control-smoke.md`, if relevant

## Commands and investigation

1. Run `git status --short`, `git log -1 --oneline`, and inspect the run SHA from the local job log. Record the initial tracked diff and do not alter it.
2. Query `graft map` using the Graft binary now on the repository-local runner PATH. Trace the Editor clip move handler and state mutation with targeted source reads. If codebase-memory is available, state its indexed head and treat a lagging graph as stale.
3. Read the CI smoke step in the local job log. Identify the first failing command and assertion, exact path/line, last passing assertion, and which later controls did not run. Parse the move evidence and drag evidence. Inspect the screenshot; compare coordinates, event targets, track/clip IDs, before/after positions, and the expected timeline mutation. Distinguish a fixture timing/selector problem from a product bug; do not infer causation beyond evidence.
4. Run only `& ./scripts/with-local-env.ps1 -Executable ./.tools/node-v26.8.2-win-x64/node.exe -Arguments @('--check','scripts/smoke-editor-controls.mjs')` and, if a pure focused test exists for the move algorithm, run just that test through the wrapper. Record exit codes and counts. Do not run installed smoke or packaging.
5. Propose one bounded fix and one assertion/evidence improvement. Codex owns source changes and will review the proposal.

## Acceptance and report format

Return a concise report with run URL/SHA, OpenCode commands and exit codes, pass/fail counts, first failure and prior passes, evidence from the JSON and screenshot, root-cause confidence, proposed fix, changed files (expected none), and remaining risks. Name any Codex runner commands separately from OpenCode commands. Full transcript stays in `opencode-full.log`; exit code in `opencode-exit.log`, both inside the report folder and ignored by Git.
