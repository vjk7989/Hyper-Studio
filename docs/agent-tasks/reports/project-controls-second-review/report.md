# Project controls: second OpenCode read-only review

Runner: repository-local OpenCode 2.0.26, `opencode/space-bunny-free`, read-only `plan` agent. Exit code 0. [Bounded task](../../project-controls-second-read-only-review.md); [full transcript](opencode-full.log). Codex checked the reported findings against current source and the working-tree diff. OpenCode made no source edit; concurrent Codex edits occurred during the run.

| Check through `scripts/with-local-env.ps1` | Result |
| --- | --- |
| `project-removal.test.ts` + `project-workspace.test.ts` | 14 passed, 0 failed |
| `home-sidebar-items.test.ts` + `home-recent-projects-preference.test.ts` | 30 passed, 0 failed |

**Confirmed interaction gap:** Create and Rename overlays in `apps/desktop/frontend/views/Projects.tsx` (approximately lines 442–550 at review time) lack `role="dialog"`, `aria-modal`, Escape handling, and a focus trap. The Remove dialog has those behaviors. Add an installed-app keyboard assertion that Tab remains inside each dialog and Escape closes it with focus restored to the opener. Existing unit tests do not cover those interactions.

**Persistence risk to gate:** Rename changes local state immediately and queues the workspace write; `apps/desktop/electron/project-workspace.ts` updates the manifest name when that write completes. `apps/desktop/frontend/contexts/ProjectContext.tsx` now waits for queued writes before an in-app reopen. An app exit before a pending write settles could still lose the rename. Extend `scripts/smoke-project-controls.mjs` with rename → close/relaunch → reopen → assert the renamed title. This is a static risk, not a reproduced failure.

**Smoke gap:** The Windows project-controls script exercises create, rename visibility, app-only removal/reopen, failed/successful Trash on a disposable folder, and restart persistence, but it had not been run in this assignment. It lacks a keyboard/focus pass and active-job UI rejection. The real OS Trash and packaged interactions remain pending the Windows gate.

**Review corrections:** OpenCode also suggested registry stranding and an orphaned registry after create rollback; current code does not support those claims. The IPC handler resumes the project after opening its manifest, and rollback unbinds the registry before deleting the local entry. Those suggestions are excluded from this accepted report. The codebase-memory snapshot HEAD matched the reviewed commit, but concurrent edits require source verification. No source diff from OpenCode was accepted.
