# Project controls: OpenCode read-only investigation

Runner: repository-local OpenCode 2.0.26, `opencode/space-bunny-free`, `plan` agent. Exit code 0. [Bounded task](../../phase-5-project-controls-read-only-investigation.md); [full transcript](opencode-full.log). Codex reviewed the transcript and working-tree status; OpenCode made no source edit. Other Codex agents were editing project removal and smoke files concurrently, so this is an investigation snapshot, not a phase gate.

| Check through `scripts/with-local-env.ps1` | Result |
| --- | --- |
| `project-workspace.test.ts` | 9/9 passed |
| `home-recent-projects-preference.test.ts` + `project-navigation.test.ts` | 15/15 passed |
| New concurrent `project-removal.test.ts` | Initially 4/5: shared-storage fixture path absent, causing `realpathSync` ENOENT; owner corrected fixture and OpenCode reran 5/5 passed |
| `provider-jobs/broker.test.ts` | 11/11 passed |

No failed test remains in these focused runs. OpenCode attempted a disposable probe in its local temp directory, but its read-only plan permission rejected the write; no file was created. A few one-line `node --eval` probes also failed due to PowerShell/wrapper quoting; they were not gate tests. The codebase-memory snapshot was not used. Graft mapped the repository from its ignored repository-local cache and self-refreshed during concurrent edits, so the map is not a settled snapshot.

## First-party control coverage and next smoke additions

| Surface | Existing evidence | Missing installed-app action |
| --- | --- | --- |
| Onboarding | Shared-storage gate tests and packaged setup via IPC | Fresh UI step-through, cancel/error states |
| Projects and Recent | Create/open unit and package smokes; recent ordering and removal guards in unit tests | Rename persistence, app-only remove/reopen, Trash success/failure, active-job UI block, sidebar/Projects consistency |
| Home and Explore Tools | Home navigation and Explore seed unit tests | Click-through of reachable tiles and tool launch |
| Connections | Profile tests and localhost mocked cross-mode provider smoke | UI profile create/edit/select/delete and restart persistence |
| Settings | Settings navigation tests; Workflow theme setting in package smoke | Desktop settings save/reopen, keyboard/focus, light/dark states |
| Editor | Media index and asset render in package smoke | Timeline editing, undo/redo, save/reopen, video export |
| Workflow | Packaged save/import/export, simple local execution, cross-mode media; compatibility import and missing-node review | Broader first-party canvas controls and failure/empty states |
| Manager | Reviewed install through repository-local Git fixture | Failure/cancel/retry states |

Use disposable project folders under `.local-tmp` and a localhost mock provider. For Trash, unit-test injected `trashItem` behavior and failure without touching a real user folder; reserve one installed-app Trash exercise for an explicitly created disposable folder. The current IPC implementation lacks a direct Trash injection seam. Export needs a local output fixture and mock or controlled renderer for native export. These gaps must be exercised and defects fixed before a claim that every reachable first-party control works. Live provider calls and arbitrary third-party nodes remain unverified without credentials/downloads.

**Review:** The first failed removal test was a concurrent fixture error. Its owner added the required directory and the rerun passed. No OpenCode diff was accepted because there was no source diff. Full command output stays in the ignored transcript; this report is the concise tracked artifact.
