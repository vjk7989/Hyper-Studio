# OpenCode assignment: Phase 4 test investigation

## Phase and boundary

Phase 4, integrated Workflow mode and shared provider jobs. Use `opencode/space-bunny-free` as the read-only `plan` agent. Investigate tests only. Do not edit source, tests, configuration, documentation, or task files; do not commit. Do not install dependencies, download model packs, use live provider credentials, or clean existing files. The Codex runner owns this task and its report.

## Owned files

OpenCode owns **no files**. Codex writes `docs/agent-tasks/reports/phase-4-investigation/report.md` and keeps complete OpenCode/command logs in that directory. Temporary test state must remain under the repository through `scripts/with-local-env.ps1`.

## Code discovery

The repository-local `codebase-memory-mcp` server should connect to the snapshot project `G-Hyper-Studio-hyper-studio`. Check connection and use `search_graph` before text/file search for code definitions. This is a fixed repo-local snapshot that may omit newer Phase 4 files; say when it is stale. You may use the repo-local Graft CLI `map --max-dirs 12` to orient yourself. Do not reindex either graph during this investigation.

## Commands and acceptance checks

Run from the stated working directory, through the local wrapper. Capture complete output and exit status for each attempt in separate `.log` files under the report directory. Use a timeout when launching packaged smoke.

1. From `apps/desktop`: `..\..\scripts\with-local-env.ps1 node --experimental-strip-types --test --test-reporter=spec electron/workflow-runtime-config.test.ts electron/workflow-engine-config.test.ts electron/provider-jobs/broker.test.ts electron/provider-jobs/adapters.test.ts electron/workflow-files.test.ts`.
2. From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm scripts:test`.
3. From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm typecheck:ts`.
4. From repository root: `.\scripts\with-local-env.ps1 python services/workflow/tests-unit/test_hyper_studio_nodes_stdlib.py`.
5. From repository root, only if the unpacked Windows executable and existing managed runtime marker are present: `.\scripts\with-local-env.ps1 node scripts/smoke-provider-cross-mode.mjs`. This uses a keyless localhost mock and no model pack.

If a command fails, reproduce it once, identify the failing test and likely cause from local evidence, then stop before the next phase. Do not fix it. If the packaged prerequisite is absent, mark step 5 skipped with the exact missing file. Check the repository status before and after to confirm this assignment made no source edit. Never print credential values.

## Report format

Keep `report.md` concise: commands run with exit codes; pass/fail/skipped counts; failing tests; root cause; changed source files (expected: none); remaining risks and environment limits. Link full command logs by filename rather than copying output into the report. State whether the MCP and Graft tools connected and whether the graph snapshot was stale.
