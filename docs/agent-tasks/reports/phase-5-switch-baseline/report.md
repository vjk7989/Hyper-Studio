# Phase 5.1 OpenCode read-only investigation

Runner: repository-local OpenCode 2.0.26, `opencode/space-bunny-free`, read-only `plan` agent. Exit 0. [Bounded task](../../phase-5-switch-baseline-read-only.md); full transcript is `opencode-full.log` in this directory. Codex reviewed the findings and diff.

| Command group | Result |
| --- | --- |
| Desktop scripted tests through `scripts/with-local-env.ps1` | 1,483 passed, 0 failed; additional groups 6/6 and 2/2 |
| Vue bridge unit test | 7 passed, 0 failed |
| Desktop TypeScript | Failed on transient concurrent edits in `Project.tsx`; the owners subsequently fixed the object-shaped prewarm argument and idle-timer typing. Rerun required for the gate. |

**Measurement gap:** prior installed smokes switched once and slept; none measured ten click-to-usable toggles. Codex added `scripts/smoke-mode-switch-timing.mjs` with monotonic timestamps and nearest-rank p95. It has not yet run against a newly installed build. Ten samples make nearest-rank p95 equal to the maximum; the gate uses the requested ten, with that limitation recorded.

**Existing installed build baseline:** the new script measured 2,899 ms to first window DOM readiness, 4,039 ms through first-run storage to Projects, 64,870 ms from the first Workflow click to usable canvas, and warm switches of 67, 1,029, 69, 739, 62, 1,014, 58, 1,063, 107, and 1,188 ms. Nearest-rank p95 was **1,188 ms**, above the 1,000 ms target. Full output is `.local-cache/phase-5-switch-baseline.log`; JSON is under `.local-tmp/mode-switch-timing-1791701982976/timings.json`. This older installed executable does not include the current source edits.

**Changed files by OpenCode:** no intentional source edits. Its pnpm test invocation automatically pruned `apps/workflow-ui/pnpm-lock.yaml` and `pnpm-workspace.yaml` through `verifyDepsBeforeRun`; Codex inspected and restored only those two changes. Future Vue tests should invoke checked-in Vitest directly to avoid that mutation.

**Remaining risks:** baseline tests were sampled while agents edited the tree, so they do not close the performance gate. Cold launch, first Workflow readiness, ten warm switches, state retention, and installed-app behavior require a fresh Windows build and rerun. No live provider calls or model downloads occurred.
