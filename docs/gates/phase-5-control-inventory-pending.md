# Phase 5.4 control inventory — pending

## Status

The Windows Phase 5.3 gate passed in Actions run 38125371341. Phase 5.4 has **not** passed. G: reached 0 free bytes during local fixture preparation, and automatic approval review rejected deletion of the verified ignored desktop build output and an extracted Node archive. On 2026-10-11 the user freed space manually; G: now has about 74 GiB available. No Phase 5.4 controls are checked off.

The OpenCode inventory is recorded in `docs/agent-tasks/reports/phase-5-control-inventory-v2/report.md` (138 focused desktop passes, 479 Workflow Manager passes, no OpenCode source edit). Fresh Windows run `38127664347` stopped in first-run onboarding after Escape was sent before the connection form's input had focus; the smoke now waits for that focus. Run `38128205485` passed onboarding and baseline shell checks, then stopped at the new Editor drag assertion. Its screenshot showed the first timeline track partly clipped at the fixed drop point. The smoke now scrolls that target fully into view. Neither failure is counted as a completed control; run `38128889578` is the rerun at `00f0662`.

## Partial work

| Area | Observed | Still required |
| --- | --- | --- |
| Editor | Baseline installed Editor actions pass; new gesture/export smoke reached the drag step in run 38128205485. | Rerun the adjusted target scroll, blade/trim, shortcuts, local render, and cancel/error checks. |
| Workflow | Local packaged mouse wiring, node edit/Undo/Redo, active cancel, local PNG run, missing-node guidance, and JSON ID roundtrip pass. An embedded Vue desktop-preload mismatch was fixed for the next build. | Run all new scripts in a fresh installed package. |
| Shared media and theme | Run 38127087010 passed bidirectional media after renderer reload and UI-selected theme persistence. | Check full process cold reopen in the new smoke. |
| Manager | Local fixture and reviewed install/restart passed previously; the new smoke covers review cancel, local update, and uninstall. | Run all checks in the fresh installed package. External source installation remains unverified. |
| OpenCode inventory | Bounded task and reviewed report are complete with full repository-local logs. | Reconcile any installed failure with the control matrix. |

## Working tree and limit

The new smokes are committed and wired into the Windows job, but their local passes are not a completed installed gate. Do not use stale local installers to infer current regressions. Model inference, live hosted providers, and external pack installation remain unverified.
