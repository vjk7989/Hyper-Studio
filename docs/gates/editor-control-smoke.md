# Installed Editor control smoke — Windows

## Rebuilt installed build verification

The tracked [Editor control smoke](../../scripts/smoke-editor-controls.mjs) passed **16/16 asserted steps** against `.local-tmp/installed-project-controls-final4/Hyper-Studio.exe`. It created an isolated Editor project, verified `Timeline 2` for the New Timeline fix and `Timeline 2 Copy` for Duplicate, added video/audio/subtitle tracks, imported SRT/PNG/WAV fixtures, reopened and verified media and timeline persistence, added a text overlay and observed Undo/Redo (`1 → 0 → 1` clips), toggled zoom/snapping/Properties/Clip Viewer, observed playback timecode `00:00:00:00 → 00:00:00:14`, and opened the Export settings dialog. It then placed the imported PNG on a new timeline and saved a local [FCPXML package](../../.local-tmp/editor-controls-1791672657378/timeline-package.fcpxml). Browser `DOMParser` accepted the XML with root `fcpxml`, one `asset`, one `asset-clip`, and an asset source containing `red.png`. [Final results and screenshots](../../.local-tmp/editor-controls-1791672657378/) and [run log](../../.local-tmp/smoke-editor-controls-package-rerun.log) are repository-local. No video render or model-backed operation was attempted.

The first two final-build attempts exposed harness assumptions: waiting for project autosave before Undo let history availability change, and the displayed zoom minimum rose from 100% to 102%; the Export dialog's uppercase heading was visual styling rather than exact DOM text. The final assertions use visible clip counts immediately for Undo/Redo, allow the zoom control's dynamic minimum, and check stable dialog content. These are harness corrections; no new Editor source fix was made. The smoke does not establish whether Undo remains available after a longer idle period.

The first Package attempt showed **Export failed — Error: Error: Failed to get 'downloads' path** in the UI. The smoke's isolated Windows profile had no Downloads directory, while the save handler validates against Electron's Downloads path. Creating that directory inside the repository-local profile resolved the setup error; the next attempt saved and parsed the FCPXML. No desktop source was changed.

**Build:** `.local-tmp/installed-project-controls-final/Hyper-Studio.exe` (the pre-fix installed binary).  **Scope:** Editor mode → Video Editor, in an isolated repository-local user profile and project.  The run used a 70-byte PNG, a 1-second generated WAV, and a one-cue SRT. No model packs, hosted providers, or live keys were used. This is a bounded control smoke, not a phase-gate pass.

Evidence: [main results](../../.local-tmp/editor-control-smoke-1791671433560/results.json), [main screenshots and UI snapshots](../../.local-tmp/editor-control-smoke-1791671433560/), [reopen follow-up results](../../.local-tmp/editor-control-smoke-1791671433560/followup/results.json), and the [persisted Editor model](../../.local-tmp/editor-control-smoke-1791671433560/project/.hyper-studio/editor.json). The scripts and Electron logs remain under `.local-tmp`; fixture files remain under that run's `fixture` directory.

| Control and exact action | Expected | Observed / evidence |
|---|---|---|
| Create an Editor project, click **Video Editor** tab | Timeline editor opens | Opened with asset bin, `Timeline 1`, monitor, timeline, menus, and toolbar. `initial.json/png`. |
| Click **File** | File actions appear | `New Timeline`, import, and export actions appeared. `file-menu.json/png`. |
| **File → New Timeline** | A separate timeline with an unambiguous default name | A separate active timeline was created and persisted, but it was also named `Timeline 1`. `fail-3.json`, `editor.json`. **Confirmed defect; source fix described below.** |
| **File → Duplicate Active Timeline** | Duplicate timeline | A third timeline named `Timeline 1 Copy` appeared and persisted. The harness expected `Timeline 2 Copy` because of the preceding naming assumption, so its `FAIL` label is an assertion error, not a duplicate failure. `fail-4.json`, `editor.json`. |
| **Sequence → Add Video Track**, then **Add Audio Track** | Track headers added | `V4` and `A3` appeared. `added-video-track.json/png`, `added-audio-track.json/png`. |
| **Sequence → Add Subtitle Track** | Subtitle track and SRT controls appear | `Subtitles`, **Import SRT**, and **Export SRT** appeared. `added-subtitle-track.json/png`. |
| Set hidden `.srt` file input to one-cue fixture | Caption imported | `Smoke caption` appeared on subtitle track and in persisted model. `import-srt.json/png`, `editor.json`. |
| Set media input to PNG and WAV fixtures | Assets copied into project and listed | `assets/red.png` and `assets/tone.wav` were copied; both entries persisted in `media.json` and survived reopening. The harness searched for `Imported: red.png` text, which this asset view does not render, so its `FAIL` is an assertion error. `media.json`, `followup/reopened.json`. |
| Click **Add Text Overlay** | Text clip appears on timeline | A `Title Text` clip appeared; active timeline reported one clip. `text-overlay.json/png`, `editor.json`. |
| **Edit → Undo**, then **Edit → Redo** | Text clip removed, then restored | Active timeline changed from one clip to zero after Undo, then back to one and `Title Text` after Redo. `undo.json/png`, `redo.json/png`, `editor.json`. |
| Click **Blade Tool (B)**, **Ripple Trim (R)**, then **Selection Tool (V)** | Tool selection changes | All three controls accepted clicks; final tool was selection. `tools.json/png`. No trim or blade gesture was performed. |
| **View → Zoom In**, then **Zoom Out** | Timeline zoom changes and returns | Slider value moved `102 → 127 → 102`. `zoom.json/png`. |
| **Sequence → Disable Snapping**, then **Enable Snapping** | Menu label/state toggles | Both menu actions were reachable. `snap.json/png`. No drag was used to verify snapping geometry. |
| **View → Show Properties Panel**, then **Hide Properties Panel** after reopening | Panel and menu state toggle | Both labels switched and panel appeared in `followup/properties-on.json/png`. Initial-run `FAIL` expected **Hide** while the initial state was **Show**; that was a harness mistake. |
| **View → Show Clip Viewer**, then **Hide Clip Viewer** after reopening | Viewer and menu state toggle | Both labels switched. `followup/viewer-on.json/png`. Initial-run `FAIL` was the same inverted-label harness mistake. |
| **File → Import Timeline (XML)…** | Import dialog opens | Dialog showed XML/FCPXML affordance and format guidance. `import-xml.json/png`. No XML file was imported. |
| Click timeline toolbar **Export** after reopening | Export settings dialog opens | Dialog showed package/FCPXML and video export choices (H.264, ProRes, VP9, resolution, frame rate, quality, burn-in subtitles). `followup/export-open.json/png`. No file was rendered or exported. |
| Press **Space**, wait about 600 ms, press **Space** | Playback starts, playhead advances, pauses | Visible timecode changed `00:00:00:00 → 00:00:00:12`. `followup/playback.json/png`. This proves transport movement, not video decode or synchronized audio. |

## Confirmed defect and fix

`createTimeline` called `createDefaultTimeline()` without a name, so every new timeline received the constructor default `Timeline 1`. It now picks the first unused `Timeline N` name from the current Editor model. A focused regression test covers existing `Timeline 1` and `Timeline 2`, checks the next timeline is `Timeline 3`, and checks the existing timeline objects and active ID transition. The test passes with Node's TypeScript stripper and the Editor-local resolution loader. `pnpm run typecheck:ts` also passes.

This changes only names assigned to newly created timelines. It does not rename or migrate existing projects, and explicit timeline names continue through the existing path. The rebuilt final4 installed build verified the fixed menu behavior as described above.

## Limits

- The first run's toolbar **Export** click was blocked by the XML import dialog overlay after the harness sent Escape without confirming closure. The follow-up reached the Export settings dialog. Playback resolution and asset context-menu clicks in that follow-up were then blocked by its still-open Export overlay; these remain **untested**, not product failures.
- No media asset was dragged onto a timeline. Blade cuts, ripple/roll/slip/slide edits, trimming, clip effects, transitions, track mute/solo, clip speed, copy/paste, XML round-trip, SRT export, and rendered video export remain untested.
- No model-backed generation, local Python processing, hosted provider call, long-duration playback, audio output, or GPU decode was exercised.
- This report does not mark the Editor or phase gate complete.
