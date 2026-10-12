# Phase 5.4 control inventory — pending

## Status

The Windows Phase 5.3 gate passed in Actions run 38125371341. Phase 5.4 has **not** passed. G: reached 0 free bytes during local fixture preparation, and automatic approval review rejected deletion of the verified ignored desktop build output and an extracted Node archive. On 2026-10-11 the user freed space manually; G: now has about 74 GiB available. No Phase 5.4 controls are checked off.

The OpenCode inventory is recorded in `docs/agent-tasks/reports/phase-5-control-inventory-v2/report.md` (138 focused desktop passes, 479 Workflow Manager passes, no OpenCode source edit). Earlier Windows failures and read-only triage are recorded in `docs/agent-tasks/reports/phase-5-windows-ci-triage/report.md`, `phase-5-editor-move-ci-triage/report.md`, and `phase-5-workflow-queue-triage/report.md`. Run `38163020280` exposed clip move, import readiness, and Manager review faults. Run `38164420755` passed native clip movement and JSON import/save/export with original node IDs. Run `38166178000` passed blade split and trim, Workflow active cancel/widget Undo/Redo/local execution/missing-node guidance, Manager reviewed installation and restart, and shared provider/cold-reopen checks. Three later installed checks still failed: Editor Undo after trim, Manager fixture update, and a mode-switch timing smoke selector. No Phase 5.4 control is counted complete until its rerun passes.

## Partial work

| Area | Observed | Still required |
| --- | --- | --- |
| Editor | Run 38166178000 passed real asset drop, clip move, blade split, right-edge trim, and 8/8 track/Clip menu controls. | Fix the subsequent Undo trim failure and rerun shortcuts, local render, cancel/error checks. |
| Workflow | Run 38166178000 passed JSON IDs, mouse wiring, active cancel POST 200, widget edit/Undo/Redo, local PNG execution, and missing-node guidance. | Keep these in the final rerun; inspect optional light/dark states in Phase 5.5. |
| Shared media and theme | Run 38166178000 passed provider cross-mode and full process cold reopen. An earlier ten-toggle run measured 79 ms warm p95 with unsaved IDs preserved; the latest timing smoke timed out waiting for its Shared files (0) selector. | Diagnose the timing smoke's state/selector and rerun the ten toggles. |
| Manager | Run 38166178000 passed review Cancel, exact-source fixture install, queue completion, restart, and imported node ID 90909. Its later local-fixture update batch failed. | Diagnose update, then rerun update/uninstall and restart. External source installation remains unverified. |
| OpenCode inventory | Bounded read-only tasks and reviewed reports are complete with full repository-local logs. Its queue-cancel timing hypothesis was confirmed by the deterministic offline delay fixture: run 38166178000 reached the managed engine's active Cancel endpoint. | Reconcile the three later failures with the control matrix. |

## Working tree and limit

The new smokes are committed and wired into the Windows job, but their local passes are not a completed installed gate. Do not use stale local installers to infer current regressions. Model inference, live hosted providers, and external pack installation remain unverified.
