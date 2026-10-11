# Phase 5.4 control inventory — pending

## Status

The Windows Phase 5.3 gate passed in Actions run 38125371341. Phase 5.4 has **not** passed. G: reached 0 free bytes during local fixture preparation, and automatic approval review rejected deletion of the verified ignored desktop build output and an extracted Node archive. On 2026-10-11 the user freed space manually; G: now has about 74 GiB available. No Phase 5.4 controls are checked off.

The OpenCode inventory is recorded in `docs/agent-tasks/reports/phase-5-control-inventory-v2/report.md` (138 focused desktop passes, 479 Workflow Manager passes, no OpenCode source edit). Earlier Windows failures and read-only triage are recorded in `docs/agent-tasks/reports/phase-5-windows-ci-triage/report.md`, `phase-5-editor-move-ci-triage/report.md`, and `phase-5-workflow-queue-triage/report.md`. Run `38163020280` exposed clip move, import readiness, and Manager review faults. In run `38164420755`, the native-image drag and import-readiness fixes passed their installed assertions: clip movement persisted, and Workflow import/save/export kept original node IDs. Five later installed checks still failed: blade split, Workflow active cancel, Workflow widget dialog, Workflow run isolation, and Manager review Cancel. No Phase 5.4 control is counted complete until its rerun passes.

## Partial work

| Area | Observed | Still required |
| --- | --- | --- |
| Editor | Run 38164420755 passed real asset drop, clip move, and 8/8 track/Clip menu controls. | Fix the subsequent blade split and rerun trim, shortcuts, local render, cancel/error checks. |
| Workflow | Run 38164420755 passed JSON import/save/export with stable IDs, mouse port wiring, and widget edit/Undo/Redo. Linked local execution wrote a PNG. | Fix active queue-cancel test, widget dialog handling, and run-isolation overlay; rerun their later controls and missing-node guidance. |
| Shared media and theme | Run 38164420755 passed provider cross-mode, full process cold reopen, and ten warm switches at 79 ms p95 with unsaved IDs preserved. Earlier checks passed theme persistence and bidirectional media. | Keep these controls in the final rerun and inspect optional light/dark states in Phase 5.5. |
| Manager | Run 38164420755 found the local fixture and displayed the reviewed source but still timed out locating review Cancel. | Verify actual dialog control, reviewed install/update/uninstall, and restart. External source installation remains unverified. |
| OpenCode inventory | Bounded read-only tasks and reviewed reports are complete with full repository-local logs. The queue-cancel triage found 25 tiny prompts completed in about 1.46 seconds; cause is likely fixture timing, not yet confirmed. | Reconcile the fresh installed failures with the control matrix and use a deterministic active-job fixture for Cancel. |

## Working tree and limit

The new smokes are committed and wired into the Windows job, but their local passes are not a completed installed gate. Do not use stale local installers to infer current regressions. Model inference, live hosted providers, and external pack installation remain unverified.
