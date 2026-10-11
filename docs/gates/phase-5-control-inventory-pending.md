# Phase 5.4 control inventory — pending

## Status

The Windows Phase 5.3 gate passed in Actions run 38125371341. Phase 5.4 has **not** passed. G: reached 0 free bytes during local fixture preparation, and automatic approval review rejected deletion of the verified ignored desktop build output and an extracted Node archive. On 2026-10-11 the user freed space manually; G: now has about 74 GiB available. No Phase 5.4 controls are checked off.

The OpenCode inventory is recorded in `docs/agent-tasks/reports/phase-5-control-inventory-v2/report.md` (138 focused desktop passes, 479 Workflow Manager passes, no OpenCode source edit). Runs `38127664347`, `38128205485`, `38128889578`, and `38129399057` exposed smoke-fixture timing and track-selection faults. The read-only OpenCode triage for the last run is in `docs/agent-tasks/reports/phase-5-windows-ci-triage/report.md`. Run `38159838424` passed the corrected asset drag onto source-patched V1, then stopped when the smoke attempted to move that clip beyond the visible window. The screenshot and event log support a test-target fault; the move, blade, trim, native export, Workflow, Manager, and cold-reopen checks remain unpassed on a fresh installed package. No Phase 5.4 control is counted complete until its rerun passes.

## Partial work

| Area | Observed | Still required |
| --- | --- | --- |
| Editor | Baseline installed Editor actions pass; run 38159838424 reached and passed real asset drag onto source-patched V1 before the clip-move assertion. A separate packaged run passed 8/8 track-routing and Clip menu actions. | Keep clip movement inside the visible timeline, then rerun blade/trim, shortcuts, local render, cancel/error checks, and the new track smoke in a fresh installed package. |
| Workflow | Local packaged mouse wiring, node edit/Undo/Redo, active cancel, local PNG run, missing-node guidance, and JSON ID roundtrip pass. An embedded Vue desktop-preload mismatch was fixed for the next build. | Run all new scripts in a fresh installed package. |
| Shared media and theme | Run 38127087010 passed bidirectional media after renderer reload and UI-selected theme persistence. | Check full process cold reopen in the new smoke. |
| Manager | Local fixture and reviewed install/restart passed previously; the new smoke covers review cancel, local update, and uninstall. | Run all checks in the fresh installed package. External source installation remains unverified. |
| OpenCode inventory | Bounded tasks and reviewed reports are complete with full repository-local logs. The last task confirmed the source-patch fixture cause; OpenCode made no source changes. | Reconcile the fresh installed failure with the control matrix. |

## Working tree and limit

The new smokes are committed and wired into the Windows job, but their local passes are not a completed installed gate. Do not use stale local installers to infer current regressions. Model inference, live hosted providers, and external pack installation remain unverified.
