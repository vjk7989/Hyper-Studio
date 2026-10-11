# Phase 5.4 Workflow interaction smoke

## Commands and result

| Command | Result |
| --- | --- |
| `node --check scripts/smoke-workflow-controls.mjs` | Pass |
| `node --check scripts/smoke-workflow-run-isolation.mjs` | Pass |
| `node scripts/smoke-workflow-controls.mjs` | Pass: import, original IDs `17,29`, mouse port wiring, save, export, active cancel POST |
| `node scripts/smoke-workflow-run-isolation.mjs` | Pass: linked local workflow produced PNG; imported missing-node JSON kept IDs `1,2,99` and showed guidance |
| `git diff --check` on owned scripts | Pass |

Full local execution logs: `.local-tmp/workflow-controls-gate.log` and `.local-tmp/workflow-run-isolation-gate.log`. Both smokes used a repository-local packaged Windows executable and disposable project homes under `.local-tmp`. They did not download models or call hosted providers.

## Investigation and changes

- The canvas DOM appeared before the actual graph initialized. Both scripts now wait for the graph before using the host snapshot bridge.
- Save updates the imported workflow file in place; the old smoke incorrectly expected a new `workflow.json`.
- The control smoke now asserts a real mouse-created graph link, JSON ID preservation through import/save/export, and an active cancel request to the managed engine.
- The execution smoke now asserts a local PNG and checks missing-node guidance while preserving the imported JSON and its node IDs.
- A canvas widget edit/Undo probe was attempted but its locator did not address the rendered widget, so it is not claimed as passed here.

## Remaining risks

These local passes used the existing packaged build. A fresh Windows installed-app CI gate must run both scripts on the new package before Phase 5.4 is checked off. Widget editing/Undo and other deeper Workflow controls remain outside these two smokes; relevant Vue tests and the control inventory should cover them. The missing-node snapshot bridge did not respond after importing an unknown node, so preservation is asserted from the imported project JSON and visible guidance, not from a canvas snapshot.
