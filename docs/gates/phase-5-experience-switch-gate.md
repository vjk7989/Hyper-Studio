# Phase 5.1 — mode switching and startup gate

## Scope and target

Windows first. Measure launch to first window, first usable Workflow entry, and ten same-project warm Editor↔Workflow toggles. The warm nearest-rank p95 target is at most 1,000 ms; with ten samples this statistic is the maximum. The installed smoke also checks an unsaved Workflow node's IDs survive toggling and that leaving the project stops its managed engine. Focused tests cover the installed-runtime guard, asynchronous PyTorch probe, and trusted canvas-ready handshake.

## Existing installed baseline

`scripts/smoke-mode-switch-timing.mjs` ran against the prior installed Windows executable with the existing managed runtime under the repository. It measured 2,899 ms to first window DOM readiness, 4,039 ms through shared-storage setup to Projects, 64,870 ms from first Workflow click to usable canvas, and ten warm toggles of 67, 1,029, 69, 739, 62, 1,014, 58, 1,063, 107, and 1,188 ms. Warm p95 was **1,188 ms**. This is a baseline, not the new-build result. Full log: `.local-cache/phase-5-switch-baseline.log`.

## Focused source checks on the updated tree

- Desktop TypeScript: pass.
- Desktop Node test group: 1,486 passed, 0 failed; extra editor and native groups: 2/2 and 6/6.
- Vue bridge: 7/7; scoped Vue typecheck: pass.
- Engine probe and runtime checks: 8/8.
- `git diff --check` and the timing script syntax check: pass.

## Installed Windows failure and rerun

[Run 38120194777](https://github.com/vjk7989/Hyper-Studio/actions/runs/38120194777) built the unsigned installer and passed source checks, then failed in the earlier packaged smoke at `scripts/smoke-packaged-electron.mjs:204`. The smoke had opened Shared files before switching to Editor, then clicked the same button on return. The new retained Workflow surface preserves the open panel, so that click closed it; the subsequent image locator timed out. Commit `acd1d2d` makes the smoke open the panel only when collapsed and captures a screenshot on failure.

[Rerun 38120631024](https://github.com/vjk7989/Hyper-Studio/actions/runs/38120631024) passed its fresh installed unsigned Windows build, the earlier packaged smoke, project/first-party/Editor smokes, brand audit, and the new timing smoke. It measured **669 ms** from launch to first window DOM readiness, **1,712 ms** through storage setup to Projects, **11,772 ms** from first Workflow click to usable canvas, and ten warm switches of **37, 66, 38, 56, 54, 52, 43, 49, 44, 53 ms**. The warm p95 was **66 ms**. The timing smoke retained unsaved Workflow node IDs and confirmed project close stopped the engine. These numbers come from a different Windows runner than the older installed baseline, so they are not a controlled before/after comparison of cold launch.

[Final Windows rerun 38121218674](https://github.com/vjk7989/Hyper-Studio/actions/runs/38121218674) passed the added checks: Editor Undo after Workflow→Editor return, Editor mode selection/focus state, unsaved Workflow IDs, project A engine shutdown, project B isolation, and the existing local mock job and control smokes. Ten warm switches were **62, 68, 47, 80, 43, 78, 52, 73, 47, 76 ms**, giving p95 **80 ms**. First Workflow click to usable canvas was 15,221 ms on that runner. The one-second warm target passed; cold entry remains dominated by managed engine startup and varies by runner. The unsigned installer was built and freshly installed on the runner. The broader release gate remains open.

## Limits

The existing baseline's first Workflow time includes managed engine startup. Live video providers and model inference are outside this no-credential performance gate. Do not infer later-phase UI or release acceptance from these focused checks.
