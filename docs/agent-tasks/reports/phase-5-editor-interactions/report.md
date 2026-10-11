# Phase 5.4a Editor interaction gate report

## Current result

- **Installed checks against current source:** Windows Actions run `38128889578` passed 20 Editor assertions, then timed out waiting for the dragged image clip. The failure is a smoke target selection error: the first `[data-track-bg]` is the subtitle row, whose `onDrop` intentionally ignores media. The updated smoke computes the first video row from persisted track metadata and records `drag-evidence.json` with target kind, geometry, and drag events. This correction has not yet run in Actions.
- **Smoke additions:** persisted/UI checks for imported asset drag, clip movement, Blade split, Selection shortcut with right-edge trim, trim Undo/Redo, native missing-source failure and Try Again, save-dialog cancellation, active ffmpeg cancellation, and H.264 MP4 rendering with `ftyp`/`moov` atom checks. The missing-source check temporarily moves only the disposable project copy of the imported PNG and restores it before rendering. The active-cancel check waits for an ffmpeg spawn in the isolated profile log, then requires a logged process stop and idle UI without a late done/error state.
- **Earlier installed evidence:** the pre-Phase-5.1 final5 binary is stale. Its Undo-after-mode-toggle failure is excluded from this gate. The prior Editor control smoke had reached 10 checks before that stale failure. The root Windows run `38125371341` passed current Undo/focus behavior.

The CI artifact for run `38128889578` was inspected at `.local-tmp/editor-ci-38128889578/editor-controls-1791711603409/failure.png`. `VideoEditorTimelineEditingPanel.tsx` builds display rows as subtitles, reversed video tracks, then audio tracks (lines 1035–1048); its subtitle row drop handler prevents and returns (lines 2384–2388). No product defect is indicated by this failure.

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
- The drag probe now targets the first video display row and writes `drag-evidence.json` before waiting for persistence, so a later failure retains dragstart/dragover/drop coordinates and data-transfer types.
- This report.

## Remaining limits

- The new gesture/export assertions need execution on the current installed Windows build. A green script run should produce `.local-tmp/editor-controls-*/results.json`, `editor-local-render.mp4`, and screenshots; a failed run writes `failure.png` and a failing result.
- Render atom checks establish a nonempty MP4 container; full audiovisual decode is not checked here.
- The missing-source/Try Again and active-cancel checks need execution on a newly packaged build. Neither has passed in Actions yet. The active-cancel test uses a 4K setting only until its first ffmpeg process starts, then stops it; the normal output check uses 720p.
- Source review found that `ExportModal.handleCancel` sets status to idle and calls `exportCancel`, while the pending `handleExportVideo` continuation does not check its `abortRef` before setting done/error after `exportNative` resolves. The root agent owns a run-token fix. The active-cancel assertion will verify that fix in an installed build; no app source was changed in this task.
- Slip, slide, ripple, roll, multitrack link behavior, and model-backed output remain untested.
