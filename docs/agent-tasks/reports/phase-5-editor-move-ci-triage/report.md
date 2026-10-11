# Phase 5.4 Editor clip-move CI triage

[Windows Actions run 38161000701](https://github.com/vjk7989/Hyper-Studio/actions/runs/38161000701) at `8a77de58920f40fd9aea912e83bbe25a673ff0f8` failed in the installed Editor smoke. Repository-local OpenCode 2.0.26 (`opencode/space-bunny-free`, read-only `plan`) exited **0**. [Bounded task](../../phase-5-editor-move-ci-triage-read-only.md); full transcript and exit code are local ignored logs beside this report. OpenCode made **no source edit**.

## First failure and prior passes

The Editor smoke passed **21 controls**, including FCPXML reimport and `Drag imported asset onto video track — V1; clip … at 1.20s`. Its next check failed after 15 seconds: `Timed out waiting for moved image clip` at the run version of `scripts/smoke-editor-controls.mjs:357` (`.local-tmp/ci-38161000701-job.log:3955-3965`). Seven later Editor controls, including blade, trim, export failure/cancel, and H.264 render, did not run. The subsequent Workflow, Manager, and cross-mode smokes were skipped by the CI step's fail-fast guard.

OpenCode ran `git status/log/show`, repository-local Graft `map/ask/skeleton`, targeted source reads, and `scripts/with-local-env.ps1` with the local Node binary for `node --check scripts/smoke-editor-controls.mjs`: **exit 0**. No installed app or package build ran in this investigation. The Codex runner separately read the local CI log and JSON evidence and inspected `failure.png`.

## Evidence and diagnosis

`clip-move-evidence.json` records clip start **1.2s**, box **x820 y405 w500 h48**, and mouse movement **(865,429) → (905,429)**. The 5-second clip occupies 500 pixels, so the requested 40-pixel move corresponds to **0.4s**, above the smoke's 0.2-second threshold. The 984-pixel-wide failure screenshot shows the clip still at the original position. `drag-evidence.json` records the preceding successful asset-card → V1 drop, including dragstart, dragenter, dragover, drop, and dragend. It does not record the later clip mouse gesture.

The source path is clip `onMouseDown` → `useTimelineDrag.handleClipMouseDown` → selected/dragging state → window mousemove preview → mouseup commit. The run-version evidence contains **no hit-target or mouse-event trace**, so it cannot prove whether mousedown missed the clip or the subsequent listener/commit failed. The screenshot appears to lack selected-clip styling, making a missed clip handler the leading **hypothesis**, not a confirmed product bug. The fixture's pointer coordinates were inside the window and its requested move was large enough; simple out-of-window and too-small-delta explanations are unsupported here.

Codex's later `1940211` script change adds `elementFromPoint` hit probing and mousedown/mousemove/mouseup evidence with stages. **Run that diagnostic installed smoke and inspect its stage before editing the product drag handler.** A bounded follow-up assertion is to check selection and dragging visual state immediately after mouse down; record the hit element's ancestor chain if the event misses. `page.viewportSize()` was null in this connected Electron session, so the smoke fell back to 984 pixels; a future window size change could make that fallback wrong.

## Remaining risks

- Product-versus-fixture cause is **undetermined** until the new mouse-event evidence runs on an installed app. Syntax checking passed; it is not a functional test.
- The later Editor and downstream Windows gates remain unverified.
- The installed Electron log separately shows an attempted upstream Comfy release-check URL blocked by CSP. This is a **cloud-call residual** for the broader Phase 5 audit, not the clip-move cause.
- No live provider, model inference, or external pack install was tested. Codebase-memory reported head `1940211` during this audit; Graft map was available on the repository-local runner PATH.

**Changed files by OpenCode:** none. Codex created this task and report; unrelated untracked workspace files were untouched.
