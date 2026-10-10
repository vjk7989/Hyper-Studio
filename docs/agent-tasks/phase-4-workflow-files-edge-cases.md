# Phase 4: workflow file edge cases

You are the OpenCode coding agent for this bounded task. Use `opencode/space-bunny-free` and the configured repository-local codebase-memory-mcp snapshot. The snapshot may predate these new files, so read the two owned files directly. Do not download dependencies, models, or media.

## Ownership

Edit only:

- `apps/desktop/electron/workflow-files.ts`
- `apps/desktop/electron/workflow-files.test.ts`

Do not edit project-workspace, shared types, IPC, frontend, configuration, or other source files. Write test logs only under `docs/agent-tasks/reports/phase-4-workflow-files/`. Use `scripts/with-local-env.ps1` for Node/pnpm commands. Do not delete or clean unrelated files.

## Work

Add meaningful tests and fix concrete failures in the owned workflow helper. Cover:

1. Import, save, open, and export preserve raw valid JSON bytes and numeric as well as string node IDs; do not reinterpret node identifiers.
2. Import name collisions choose a new filename and preserve existing workflow contents.
3. Malformed, non-object, and oversized JSON are rejected without leaving partial files or overwriting an existing workflow.
4. Filename validation and symlink/path containment prevent reading or writing outside the selected project. If Windows cannot create a symlink in the test environment, skip only that symlink-specific assertion with an explicit reason.
5. A failed export leaves any existing destination intact. Export must not follow a destination symlink to an outside file. Use atomic replacement where possible.

Keep compatibility with existing callers and existing workflow JSON. Do not add broad abstractions. Verify error paths as well as success paths.

## Gates and report

Run focused workflow tests first. Fix failures before proceeding. Then run the full desktop test suite and TypeScript check from `apps/desktop` using:

```powershell
..\..\scripts\with-local-env.ps1 corepack pnpm scripts:test
..\..\scripts\with-local-env.ps1 corepack pnpm typecheck:ts
```

Save full command output to repository-local logs and write a concise report with commands, pass/fail counts, root causes, exact changed files, and remaining risks. Do not claim a gate passed without its exit code. Stop and report if the free model cannot reliably complete the task. Do not call live video APIs.
