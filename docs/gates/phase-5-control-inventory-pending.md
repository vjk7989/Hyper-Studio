# Phase 5.4 control inventory — pending

## Status

The Windows Phase 5.3 gate passed in Actions run 38125371341. Phase 5.4 has **not** passed. G: reached 0 free bytes during local fixture preparation, and automatic approval review rejected deletion of the verified ignored desktop build output and an extracted Node archive. The user freed space manually. No Phase 5.4 controls are checked off.

The OpenCode inventory is recorded in `docs/agent-tasks/reports/phase-5-control-inventory-v2/report.md` (138 focused desktop passes, 479 Workflow Manager passes, no OpenCode source edit). Earlier Windows failures and read-only triage are recorded in `docs/agent-tasks/reports/phase-5-windows-ci-triage/report.md`, `phase-5-editor-move-ci-triage/report.md`, and `phase-5-workflow-queue-triage/report.md`. Run `38206159103` confirmed Editor trim Undo/Redo, cold reopen, cross-mode provider/media, and ten warm switches at 76 ms p95. Its fresh Editor export failed because FFmpeg was absent. Run `38206538882` packaged FFmpeg and passed the native export failure/cancel paths, Workflow controls, Workflow execution and Settings, cross-mode media, and ten warm switches at 57 ms p95. The Editor render smoke then hit an ambiguous duplicate completion label; the Manager fixture update still failed. The code and smoke repairs are committed; a fresh installed gate is required before completion.

## Partial work

| Area | Observed | Still required |
| --- | --- | --- |
| Editor | Run 38206538882 passed asset drop, clip move, blade split, trim Undo/Redo and Escape, track/Clip menu controls, native export failure and cancel, and save-dialog cancel. A packaged FFmpeg binary reached the render completion UI. | The smoke locator accepted two completion labels and failed before inspecting the MP4 bytes. Rerun that final assertion and verify the packaged binary from first launch. |
| Workflow | Run 38206538882 passed JSON IDs, mouse wiring, active cancel, widget edit/Undo/Redo, local PNG execution, missing-node guidance, and Workflow Settings. | Retain these in the final Windows rerun; inspect optional light/dark states in Phase 5.5. |
| Shared media and theme | Run 38206538882 passed provider cross-mode and full process cold reopen; ten warm toggles measured 57 ms p95 with unsaved IDs and project isolation preserved. | Retain the same checks in the final rerun. |
| Manager | Run 38206538882 passed review Cancel, exact-source fixture install, queue completion, restart, and imported node ID 90909. The update failed because Manager's Git-only install lives in `unknown_active_nodes` but the UI sent its catalog `nightly` version. | Verify the committed installed-identity fix, then rerun update/uninstall and restart. External source installation remains unverified. |
| OpenCode inventory | Bounded read-only tasks and reviewed reports are complete with full repository-local logs. Its queue-cancel timing hypothesis was confirmed by the deterministic offline delay fixture. | Reconcile the final Windows results with the control matrix. |

## Working tree and limit

The new smokes are committed and wired into the Windows job, but their local passes are not a completed installed gate. Do not use stale local installers to infer current regressions. Model inference, live hosted providers, and external pack installation remain unverified.
