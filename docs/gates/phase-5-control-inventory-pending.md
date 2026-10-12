# Phase 5.4 control inventory — pending

## Status

The Windows Phase 5.3 gate passed in Actions run 38125371341. Phase 5.4 has **not** passed. G: reached 0 free bytes during local fixture preparation, and automatic approval review rejected deletion of the verified ignored desktop build output and an extracted Node archive. The user freed space manually. No Phase 5.4 controls are checked off.

The OpenCode inventory is recorded in `docs/agent-tasks/reports/phase-5-control-inventory-v2/report.md` (138 focused desktop passes, 479 Workflow Manager passes, no OpenCode source edit). Earlier Windows failures and read-only triage are recorded in `docs/agent-tasks/reports/phase-5-windows-ci-triage/report.md`, `phase-5-editor-move-ci-triage/report.md`, and `phase-5-workflow-queue-triage/report.md`. Run `38209076260` passed desktop tests, TypeScript, installer build, native local H.264 render (29,006 bytes, MP4 `ftyp` and `moov` atoms), Workflow PNG execution, Manager fixture install/update/uninstall, cross-mode media, and the other installed smokes. Its Workflow Settings keyboard smoke found that pressing Enter on the Extension nav closed the dialog; its offline Manager smoke found an external Google Fonts request from the desktop HTML. Both defects require a fresh installed gate after repair.

## Partial work

| Area | Observed | Still required |
| --- | --- | --- |
| Editor | Run 38209076260 passed asset drop, clip move, blade split, trim Undo/Redo and Escape, track/Clip menu controls, native export failure and cancel, save-dialog cancel, and inspected the rendered MP4 bytes. | Retain these in the final Windows rerun. |
| Workflow | Run 38209076260 passed JSON IDs, mouse wiring, active cancel, widget edit/Undo/Redo, local PNG execution, and missing-node guidance. Enter on the focused Extension Settings navigation unexpectedly closed the dialog. | Fix keyboard navigation and rerun Settings in the installed build; inspect optional light/dark states in Phase 5.5. |
| Shared media and theme | Run 38209076260 passed provider cross-mode and full process cold reopen. | Retain warm toggle and cross-mode checks in the final rerun. |
| Manager | Run 38209076260 passed review Cancel, exact-source fixture install, queue completion, restart, update, uninstall, and imported node ID 90909. Its offline network assertion found the Google Fonts request. | Confirm the desktop HTML font-link removal in a fresh installed build. External source installation remains unverified. |
| OpenCode inventory | Bounded read-only tasks and reviewed reports are complete with full repository-local logs. Its queue-cancel timing hypothesis was confirmed by the deterministic offline delay fixture. | Reconcile the final Windows results with the control matrix. |

## Working tree and limit

The new smokes are committed and wired into the Windows job, but their local passes are not a completed installed gate. Do not use stale local installers to infer current regressions. Model inference, live hosted providers, and external pack installation remain unverified.
