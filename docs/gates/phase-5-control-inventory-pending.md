# Phase 5.4 control inventory — pending

## Status

The Windows Phase 5.3 gate passed in Actions run 38125371341. Phase 5.4 has **not** passed. G: reached 0 free bytes during local fixture preparation, and automatic approval review rejected deletion of the verified ignored desktop build output and an extracted Node archive. On 2026-10-11 the user freed space manually; G: now has about 74 GiB available. No Phase 5.4 controls are checked off.

The OpenCode inventory is recorded in `docs/agent-tasks/reports/phase-5-control-inventory-v2/report.md` (138 focused desktop passes, 479 Workflow Manager passes, no OpenCode source edit). Runs `38127664347`, `38128205485`, `38128889578`, and `38129399057` exposed smoke-fixture timing and track-selection faults. The read-only OpenCode triage is in `docs/agent-tasks/reports/phase-5-windows-ci-triage/report.md` and `docs/agent-tasks/reports/phase-5-editor-move-ci-triage/report.md`. Run `38161977224` stopped at first-run connection-form focus. Run `38163020280` passed the repaired first run, packaged no-cloud check, project/shell/settings controls, Editor track commands, provider cross-mode, cold reopen, and mode-switch timing. It exposed five remaining installed failures: Editor clip move, three Workflow JSON imports yielding no nodes, and Manager review Cancel not found. The Editor mouse trace reaches the thumbnail IMG and enters dragging state, but subsequent mouse events stop after 5 pixels; a native image drag is under investigation. No Phase 5.4 control is counted complete until its rerun passes.

## Partial work

| Area | Observed | Still required |
| --- | --- | --- |
| Editor | Run 38163020280 passed 21 controls through real asset drop on source-patched V1; track routing and Clip menu smoke passed 8/8. | Fix thumbnail clip move, then rerun blade/trim, shortcuts, local render, cancel/error checks. |
| Workflow | Local packaged interaction checks passed earlier. All three fresh installed scripts in run 38163020280 saw an empty graph after importing representative JSON. | Diagnose the common import/bridge cause and rerun stable-ID, widget Undo, mouse wiring, run/cancel, and missing-node checks. |
| Shared media and theme | Run 38163020280 passed provider cross-mode, full process cold reopen, and mode-switch timing. Earlier checks passed theme persistence and bidirectional media after renderer reload. | Keep these controls in the final rerun and inspect optional light/dark states in Phase 5.5. |
| Manager | Run 38163020280 reached the local fixture and then timed out finding review Cancel. | Restore/verify reviewed install, update, uninstall, and restart. External source installation remains unverified. |
| OpenCode inventory | Bounded tasks and reviewed reports are complete with full repository-local logs. The last task confirmed the source-patch fixture cause; OpenCode made no source changes. | Reconcile the fresh installed failure with the control matrix. |

## Working tree and limit

The new smokes are committed and wired into the Windows job, but their local passes are not a completed installed gate. Do not use stale local installers to infer current regressions. Model inference, live hosted providers, and external pack installation remain unverified.
