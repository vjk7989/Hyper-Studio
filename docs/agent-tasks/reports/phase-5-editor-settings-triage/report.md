# Phase 5.4 Windows installed smoke triage

OpenCode 2.0.26 (`opencode/space-bunny-free`, plan agent) completed the bounded read-only investigation with exit **0**. Its full transcript is `opencode-full.log`; `opencode-exit.log` records the exit. Codex reviewed the transcript, CI log, diagnostics, and working-tree diff. OpenCode made **no source edits**. The tracked Workflow modifications visible during its run belong to concurrent Codex work; this task file and report were written by the Codex runner.

## Commands and counts

- `git status --short`, `git log -1 --oneline`, `graft --version`, focused `graft ask`: pass. Graft 0.21.1 was available.
- `scripts/with-local-env.ps1 node --check scripts/smoke-editor-controls.mjs`: pass.
- `scripts/with-local-env.ps1 node --check scripts/smoke-workflow-run-isolation.mjs`: pass.
- CI Windows run [38210316723](https://github.com/vjk7989/Hyper-Studio/actions/runs/38210316723), SHA `f88ec8081b781fac6c440065ac7ff9e710ce3d0b`: **two installed smoke scripts failed**. Other installed smoke categories, including Manager install/update/uninstall and native export setup, reached their recorded pass markers. The exact CI SHA was unavailable as a local Git object during this investigation.

## Failures and proposed fixes

| Control | Evidence and root-cause assessment | Bounded next check |
| --- | --- | --- |
| Editor export **Try Again** | `scripts/smoke-editor-controls.mjs:518` timed out for 30 s waiting for an accessible `button` named `Try Again`. The saved `native-export-failure.txt` contains the missing-source error and `Try Again`, so the failure dialog rendered immediately before the click. The mechanism remains **unproven**: the button may have become inaccessible through a modal layer or the modal may have unmounted after the media watcher observed the renamed source. Classification: test timing or product accessibility defect; confidence low to medium. | Use the current diagnostic probe added in `e3ff126` to capture button/ancestor visibility, accessibility, and modal lifetime at the failure point. Fix the identified cause, then assert mouse and keyboard retry return to export settings. Do not remove the control assertion. |
| Workflow Settings **Extension** via Enter | `scripts/smoke-workflow-run-isolation.mjs:135` timed out for `.extension-panel`; the preceding settings-dialog visibility assertion passed, then diagnostic `settingsCount: 0` showed the dialog closed. The CI version of `NavItem.vue` handled Enter with `.prevent` but no `.stop`, allowing the key event to reach the enclosing dialog. Commit `4e8d802` added event propagation protection and a focused NavItem test **after** the tested SHA. Concurrent Codex work is testing the full dialog behavior. Confidence high that keyboard dismissal caused this run's failure, but a focus-outside path is still possible. | Rerun the focused Reka dialog keyboard test and fresh installed smoke on the new build. If it still closes, capture focus and dialog close reason, then fix the production dialog path. |

**Changed files by OpenCode:** none. **Remaining risk:** neither fix is accepted by the Windows gate until the installed smoke reruns successfully. No provider credentials, model packs, or live generation were used.
