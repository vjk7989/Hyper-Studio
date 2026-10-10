# OpenCode assignment: project controls and interaction smoke investigation

## Phase and boundary

Project lifecycle and Windows functional smoke gate, before implementation acceptance. Use `opencode/space-bunny-free` with the read-only `plan` agent. Investigate only: do not edit source, tests, scripts, configuration, docs, or task files; do not commit, install dependencies, download models, call live providers, or delete any project. Do not print secrets. A Codex runner owns this task and reviews the report and diff.

## Owned files

OpenCode owns **no files**. The runner saves the full transcript under `docs/agent-tasks/reports/project-controls-investigation/` and writes a concise `report.md` there. Keep all other test state inside the repository via `scripts/with-local-env.ps1`.

## Discovery and commands

From the repository root, check `git status --short` before and after. Prefer `codebase-memory-mcp search_graph` for code definitions; its snapshot can be stale. Use repository-local Graft `map --max-dirs 12` if helpful, without reindexing. Inspect the current implementation and tests of Recent projects, Projects, project registry/workspace, and the packaged smoke scripts. Do not edit them.

Run these existing read-only tests, recording exit codes and complete output in the transcript:

1. `scripts/with-local-env.ps1 node --experimental-strip-types --test --test-reporter=spec apps/desktop/electron/project-workspace.test.ts`
2. `scripts/with-local-env.ps1 node --experimental-strip-types --test --test-reporter=spec apps/desktop/frontend/lib/home-recent-projects-preference.test.ts apps/desktop/frontend/lib/project-navigation.test.ts`

If an invocation fails due to module aliases or working directory, rerun it from `apps/desktop` with relative paths; do not modify tests. Do not run packaged app, trash, or external network actions in this assignment.

## Deliverable and acceptance

Report the commands and exit codes, pass/fail/skipped counts, failing tests and reproducible cause, and changed source files (expected: none). Provide a compact first-party control coverage matrix for onboarding, Projects/Recent, Home, Explore Tools, Connections, Settings, Editor, Workflow, Manager review, and export: existing automated or packaged coverage, missing smoke actions, and safest local fixture/mock approach. Highlight exact gaps for create/open/rename, app-only remove/reopen, Trash success/failure/guards, active jobs, restart, and sidebar consistency. Say if the graph was stale. Do not claim every upstream feature works from this investigation.
