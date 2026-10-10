# OpenCode assignment 1: Phase 3 test investigation

## Phase and boundary

Phase 3, shared provider profiles and job broker. This is **investigation only**. Do not edit source, tests, configuration, or documentation. Do not commit, download model packs, or invoke live video provider jobs. Run from the Hyper-Studio repository root with the repository-local OpenCode launcher. Codex owns any later fix.

## Owned files

No source files. The Codex runner owns the report and full command logs under `docs/agent-tasks/reports/phase-3-investigation/`. OpenCode may read the repository and inspect test output.

## Commands to investigate

Use the exact local environment wrapper for test processes:

1. From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm scripts:test`.
2. From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm typecheck:ts`.
3. From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm build:frontend`.
4. From `apps/desktop/backend`: `..\..\..\scripts\with-local-env.ps1 python -m unittest tests.test_provider_key_safety_isolated -v`.
5. From repository root: `.\scripts\with-local-env.ps1 python services/workflow/tests-unit/test_hyper_studio_nodes_stdlib.py`.

If a command fails, reproduce that command once and identify the likely cause from code and log evidence. Do not alter files to fix it. Skip any command that would require a missing large dependency, and report the exact dependency.

## Acceptance checks

- Every attempted command has an exit code and pass/fail count when the test runner provides one.
- Failing tests have names and a likely cause; no live provider calls or model downloads occur.
- `git status --short` shows no OpenCode source edits attributable to this assignment.
- The report contains no credentials, tokens, or full command output.

## Report format

Save `report.md` with sections: Commands run; Pass/fail counts; Failing tests; Root cause; Changed files (expected: none); Remaining risks. Save full console output as separate `.log` files in the same report directory. Keep the report concise.
