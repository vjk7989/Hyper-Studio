# Phase 5.4 control inventory — pending

## Status

The Windows Phase 5.3 gate passed in Actions run 38125371341. Phase 5.4 has **not** passed. G: reached 0 free bytes during local fixture preparation, and automatic approval review rejected deletion of the verified ignored desktop build output and an extracted Node archive. The user freed space manually. No Phase 5.4 controls are checked off.

The OpenCode inventory is recorded in `docs/agent-tasks/reports/phase-5-control-inventory-v2/report.md` (138 focused desktop passes, 479 Workflow Manager passes, no OpenCode source edit). Earlier Windows failures and read-only triage are recorded in `docs/agent-tasks/reports/phase-5-windows-ci-triage/report.md`, `phase-5-editor-move-ci-triage/report.md`, `phase-5-workflow-queue-triage/report.md`, and `phase-5-editor-settings-triage/report.md`. Run `38209076260` passed native local H.264 render (29,006 bytes, MP4 `ftyp` and `moov` atoms) and found Workflow Settings keyboard and offline font failures. Run `38210316723` passed the offline Manager network assertion and Manager install/update/uninstall, but found two further controls: an incoming media event remounted Editor and removed Export's retry state; the Workflow Settings smoke fired Enter before the newly mounted Vue listener was ready. The Editor remount fix passed 30/30 controls in a locally rebuilt installed app, and the full Workflow dialog timing test passed 4/4. A fresh Windows gate at `e4f1a00` is running; Phase 5.4 remains open.

## Partial work

| Area | Observed | Still required |
| --- | --- | --- |
| Editor | Run 38209076260 passed asset drop, clip move, blade split, trim Undo/Redo and Escape, track/Clip menu controls, native export failure and cancel, save-dialog cancel, and inspected the rendered MP4 bytes. Run 38210316723 exposed an Editor remount when Workflow media arrived during Export. The local rebuilt app now passes 30/30 controls, including that cross-mode event and retry. | Retain these in the final Windows rerun. |
| Workflow | Run 38210316723 passed JSON IDs, mouse wiring, active cancel, widget edit/Undo/Redo, local PNG execution, and missing-node guidance. The full-dialog integration test found that immediate same-task Enter precedes Vue listener readiness; a settled Enter selects Extension and keeps Settings open. | Verify the settled navigation smoke in the fresh Windows installer; inspect optional light/dark states in Phase 5.5. |
| Shared media and theme | Run 38209076260 passed provider cross-mode and full process cold reopen. | Retain warm toggle and cross-mode checks in the final rerun. |
| Manager | Run 38210316723 passed review Cancel, exact-source fixture install, queue completion, restart, update, uninstall, and imported node ID 90909; its renderer made no external request. | Retain these in the final Windows rerun. External source installation remains unverified. |
| OpenCode inventory | Bounded read-only tasks and reviewed reports are complete with full repository-local logs. Its queue-cancel timing hypothesis was confirmed by the deterministic offline delay fixture. | Reconcile the final Windows results with the control matrix. |

## Working tree and limit

The new smokes are committed and wired into the Windows job, but their local passes are not a completed installed gate. Do not use stale local installers to infer current regressions. Model inference, live hosted providers, and external pack installation remain unverified.
