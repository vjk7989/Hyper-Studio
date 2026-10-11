# Phase 5.4 control inventory — pending

## Status

The Windows Phase 5.3 gate passed in Actions run 38125371341. Phase 5.4 has **not** passed. G: reached 0 free bytes during local fixture preparation, and automatic approval review rejected deletion of the verified ignored desktop build output and an extracted Node archive. On 2026-10-11 the user freed space manually; G: now has about 74 GiB available and the bounded OpenCode inventory is retrying. No Phase 5.4 controls are checked off.

## Partial work

| Area | Observed | Still required |
| --- | --- | --- |
| Editor | A stale final5 installer passed ten earlier Editor smoke steps, then showed disabled Undo after a mode toggle. It predates the Phase 5.1 retained-surface fix; the current installed run 38125371341 passed Undo/focus, so this is not a current-source defect. | Fresh installed clip drag, blade/trim, shortcuts, local render, cancel/error checks. |
| Workflow | A stale final7 installer lacked the later onboarding helper and its managed engine exited during startup. Diagnostic screenshot failed with `ENOSPC`; this does not establish a current-source defect. | Fresh installed mouse wiring, node edit/Undo, active queue cancel, JSON ID roundtrip. |
| Shared media and theme | Existing installed gate passed bidirectional media and appearance toggles. Uncommitted smoke additions now assert media after renderer restart and UI-selected light/dark persistence. | Run those additions in a fresh installer and debug any failure. |
| Manager | Existing local fixture passed reviewed install and restart with node ID 90909. An uncommitted smoke addition checks canceling review leaves queue/storage untouched. | Run cancel check; cover local-fixture update and uninstall through reviewed controls. External source install remains unverified. |
| OpenCode inventory | Bounded task exists at `docs/agent-tasks/phase-5-control-inventory-v2-read-only.md`; storage is available again. | Run OpenCode and review its report/diff. |

## Working tree and limit

The pending smoke edits are in `scripts/smoke-editor-controls.mjs`, `smoke-workflow-controls.mjs`, `smoke-workflow-run-isolation.mjs`, `smoke-first-party-controls.mjs`, `smoke-packaged-electron.mjs`, and `smoke-manager-local-install.mjs`. They are uncommitted and **not gate evidence**. No source feature change was made in Phase 5.4. Do not use the stale local installers to infer regressions in the current build. Model inference, live hosted providers, and external pack installation remain unverified.
