# Phase 5.4a Editor interaction gate report

## Follow-up: track routing and selection commands

`scripts/smoke-editor-track-commands.mjs` is a separate installed-app smoke with an isolated repository-local profile, project, PNG, and one-second WAV. It tests eight behavior-based steps: create Editor project; import both assets; unpatch V1 and verify an image drop produces no clip, then repatch; lock V1 and verify the drop produces no clip, then unlock and verify a clip is placed on V1; place WAV on A1; select the image clip and use **Clip → Duplicate Clip**, **Flip Horizontal**, and **Mute Clip**, checking persisted clip fields after each command. A capture-phase drop listener requires an actual asset drop on the track and writes `drag-evidence.json` to the run directory, so rejected drops cannot pass solely because no drag occurred.

Local packaged sanity command: set `HYPER_STUDIO_EDITOR_SMOKE_EXE` to `.local-tmp/installed-project-controls-final7/Hyper-Studio.exe`, then run `./scripts/with-local-env.ps1 -Executable node -Arguments @('scripts/smoke-editor-track-commands.mjs')`. Result: **8 pass, 0 fail**; full log `.local-tmp/editor-track-commands-local.log`, results `.local-tmp/editor-track-commands-1791739968674/results.json`. This final7 binary predates current source, so a fresh Windows installed run is still required. `node --check scripts/smoke-editor-track-commands.mjs` and `git diff --check` pass.

Still untested by this new smoke: audible playback, track mute/solo/output, audio source patch gating, clip Cut/Copy/Paste/Delete, speed/reverse, and multitrack link behavior. It does not render or invoke any model.

## Current result

- **Latest installed run:** Windows Actions `38159838424` passed the asset drop onto patched V1, then the smoke timed out waiting for a moved image clip. Its clip was near the right edge of the 984px window, while the harness moved the pointer 120px beyond the viewport. The smoke now bounds the move to at most 40px with a 20px right margin, requires at least 25px of visible travel, and writes `clip-move-evidence.json` before the gesture. This is a harness geometry correction; it awaits installed validation.
- **Earlier drag runs:** Windows Actions run `38128889578` passed 20 Editor assertions, then timed out waiting for the dragged image clip because the first `[data-track-bg]` is a subtitle row. Run `38129399057` reached the same drag wait after targeting the first displayed video row: this row is source unpatched, so dropping an image creates no clip. The smoke now selects an unlocked, source-patched video track from persisted metadata, maps it to reversed video display order, and records `drag-evidence.json` with target patch state, geometry, and drag events. That target selection passed in run `38159838424`.
- **Smoke additions:** persisted/UI checks for imported asset drag, clip movement, Blade split, Selection shortcut with right-edge trim, trim Undo/Redo, native missing-source failure and Try Again, save-dialog cancellation, active ffmpeg cancellation, and H.264 MP4 rendering with `ftyp`/`moov` atom checks. The missing-source check temporarily moves only the disposable project copy of the imported PNG and restores it before rendering. The active-cancel check waits for an ffmpeg spawn in the isolated profile log, then requires a logged process stop and idle UI without a late done/error state.
- **Earlier installed evidence:** the pre-Phase-5.1 final5 binary is stale. Its Undo-after-mode-toggle failure is excluded from this gate. The prior Editor control smoke had reached 10 checks before that stale failure. The root Windows run `38125371341` passed current Undo/focus behavior.

The CI artifact for run `38128889578` was inspected at `.local-tmp/editor-ci-38128889578/editor-controls-1791711603409/failure.png`. `VideoEditorTimelineEditingPanel.tsx` builds display rows as subtitles, reversed video tracks, then audio tracks (lines 1035–1048); its subtitle row drop handler prevents and returns (lines 2384–2388). `project-model.ts` defaults V1 to `sourcePatched: true` and V2/V3 to false (lines 145–150). `editor-actions.ts` creates an image clip only when the target video track is patched (lines 217–243). These are smoke fixture errors; no product defect is indicated.

## Commands and results

| Command | Result |
| --- | --- |
| `./scripts/with-local-env.ps1 node --check scripts/smoke-editor-controls.mjs` | Pass |
| `./scripts/with-local-env.ps1 node --experimental-loader ./apps/desktop/frontend/views/editor/editor-test-loader.mjs --test apps/desktop/frontend/views/editor/editor-actions.test.mjs` | 1 pass, 0 fail |
| `./scripts/with-local-env.ps1 node apps/desktop/node_modules/typescript/bin/tsc --noEmit --project apps/desktop/tsconfig.json` | Blocked: native Windows exit `-1073741571` before diagnostics |
| `./scripts/with-local-env.ps1 node apps/desktop/node_modules/vite/bin/vite.js build` (from `apps/desktop`) | Blocked: Node `Fatal process out of memory: Zone` during transform; exit `-2147483645` |
| `git diff --check -- scripts/smoke-editor-controls.mjs` | Pass |

Full local build log: `.local-tmp/editor-current-build.log`. The direct Vite crash output was kept in the tool transcript; the same crash prevents creating a fresh unpacked package on this host. Repo-local Corepack's pnpm cache was also missing when rerun, so direct Node entry points were used for diagnosis.

## Changed files

- `scripts/smoke-editor-controls.mjs`: make onboarding skip optional for compatible binary probing; add bounded Editor gesture and local video export assertions. No desktop source file was changed.
- The drag probe now targets an unlocked, source-patched video display row and writes `drag-evidence.json` before waiting for persistence, so a later failure retains track state, dragstart/dragover/drop coordinates, and data-transfer types.
- This report.

## Remaining limits

- The new gesture/export assertions need execution on the current installed Windows build. A green script run should produce `.local-tmp/editor-controls-*/results.json`, `editor-local-render.mp4`, and screenshots; a failed run writes `failure.png` and a failing result.
- Render atom checks establish a nonempty MP4 container; full audiovisual decode is not checked here.
- The missing-source/Try Again and active-cancel checks need execution on a newly packaged build. Neither has passed in Actions yet. The active-cancel test uses a 4K setting only until its first ffmpeg process starts, then stops it; the normal output check uses 720p.
- Source review found that `ExportModal.handleCancel` sets status to idle and calls `exportCancel`, while the pending `handleExportVideo` continuation does not check its `abortRef` before setting done/error after `exportNative` resolves. The root agent owns a run-token fix. The active-cancel assertion will verify that fix in an installed build; no app source was changed in this task.
- Slip, slide, ripple, roll, multitrack link behavior, and model-backed output remain untested.
