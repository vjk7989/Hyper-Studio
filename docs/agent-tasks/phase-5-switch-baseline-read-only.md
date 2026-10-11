# OpenCode assignment: Phase 5 switch baseline and test investigation

## Phase and boundary

Phase 5.1 performance gate. This is **read-only investigation and test execution**. Do not edit source, tests, configuration, or documentation; do not commit, download runtimes/models, or call live providers. Existing Codex agents own implementation. Use the repository-local OpenCode runner and `opencode/space-bunny-free`.

## Owned files

No source files. The Codex runner owns `docs/agent-tasks/reports/phase-5-switch-baseline/` and its concise report plus full local logs. OpenCode may read relevant files and test output. Do not inspect or print credentials.

## Commands and evidence

1. From the repository root, run `git status --short` and read `docs/gates/first-party-installed-interaction-audit.md` for the existing baseline and gaps.
2. From `apps/desktop`, run `..\..\scripts\with-local-env.ps1 corepack pnpm scripts:test -- --runInBand` only if that flag is supported; otherwise use `..\..\scripts\with-local-env.ps1 corepack pnpm scripts:test`. Record exit code and pass/fail counts. Do not repeat a passing full suite.
3. From `apps/desktop`, run `..\..\scripts\with-local-env.ps1 corepack pnpm typecheck:ts` and record exit code.
4. Run the focused Workflow bridge tests through the checked-in local environment command found in `apps/workflow-ui/package.json`; do not install dependencies. Record exit code and counts.
5. Inspect, without editing, the existing installed-app smoke harness and report how it measures launch and ten repeated mode switches; if no timing hooks exist, specify precise event boundaries for cold launch, first Workflow canvas ready, and warm click-to-usable toggle. Do not attempt a large installer build locally.
6. If a test fails, reproduce only the failing command once, identify the test and likely root cause with file/line evidence, and propose a narrow fix.

## Acceptance checks

- Every command has an exit code and pass/fail count when available.
- Report states whether p95 can currently be measured and the exact missing instrumentation, without inventing a timing number.
- No source changes, live calls, model downloads, or secrets in report/logs; `git diff --name-only` remains unchanged by this assignment.

## Report format

Save `report.md` under the report directory with: Commands run; Pass/fail counts; Failing tests; Root cause or measurement gap; Changed files (expected none); Remaining risks. Keep it short. Save full command outputs in separate `.log` files in the same directory, never in the Codex conversation.
