# Project controls and Windows functional gate — 2026-10-11

Status: **project gate and scoped Windows installed controls passed on final5; broader feature audit remains open**. This checkpoint uses repository-local fixtures. Live hosted generation and model-backed local generation have no credentials or model packs and are not claimed.

## Final5 installed checkpoint

The unsigned NSIS is 419,861,488 bytes, SHA-256 `68A98957838B9B2287865A81E4FAA4409A456E8BD41767E7A32486D469382341`, Authenticode `NotSigned`. It installed successfully to `.local-tmp/installed-project-controls-final5/`. The final5 smoke logs are `.local-cache/project-controls-{packaged-smoke,installed,editor-smoke,workflow-smoke-final5-rerun,workflow-isolation,provider-cross-mode,manager,first-party,workflow-compat-final5-held,brand-audit}-final5*.log` (the Workflow rerun log is `.local-cache/project-controls-workflow-smoke-final5-rerun.log`).

- Project lifecycle: seven installed checks passed, including app-only removal/reopen, simulated Trash failure, real OS Trash of a disposable project folder, and restart persistence. Focused backend path/manifest/job guards passed earlier. The first-party sweep held a local mock provider job and confirmed both removal choices were blocked while it was active.
- Editor: 16/16 installed controls passed, including New Timeline naming, duplicate, imported media across reopen, immediate Undo/Redo, zoom, snapping, playback, and a parseable FCPXML package containing the imported asset. No video render or model-backed operation was claimed. The harness creates a repository-local Downloads folder because an isolated Electron profile without one makes `app.getPath('downloads')` fail.
- Workflow: Save/Import/Export retained bytes; a local `EmptyImage` → `SaveImage` graph produced a PNG; Keyboard Shortcuts opened by ordinary click; missing-node guidance remained visible. A clean isolated run passed. The broad exploratory script initially exited during an unsaved-tab Playwright shutdown dialog race; the harness now destroys test windows before `app.close()` and its final5 rerun exits zero. The transient validation toast in a multi-tab sequence remains unexplained and is not counted as a clean control pass.
- Provider and Manager: one Custom HTTP mock profile worked in both modes through a mode switch and indexed two videos. A reviewed install of the exact repository-local ImpactInt fixture completed the Manager queue, restarted the engine, and retained imported node ID 90909. A compatibility run with that fixture temporarily held outside the engine extension directory preserved three workflow JSON variants and node IDs/links, showed missing-node review, and intercepted install before download; the fixture was restored in the same command.
- Embedded Workflow with a locally installed pack no longer requests `api.comfy.org/bulk/nodes/versions`. `useConflictDetection` now retains local conflict/import-failure analysis without the upstream Registry lookup. Its focused Vue suite passed 12/12, Vue TypeScript and embedded build passed, and the fresh installed packaged smoke observed no account button or upstream Comfy/LTX cloud request. Desktop full tests passed 1,483/1,483 after the desktop source changes.
- Read-only brand audit: 232 source matches, 178 classified review candidates, 253 tracked visuals, and zero legacy visual filenames in three built trees. The scan does not prove all rendered states or optional artwork.

The scoped Windows package gate is ready for macOS/Linux packaged smoke. The broader all-controls/release gate remains open: render/video export, active Workflow cancellation and mouse port dragging, theme persistence, broader Manager browse/update/uninstall, external third-party install, live provider acceptance, and remaining visual states were not established by these tests.

## Project lifecycle

The installed build at `.local-tmp/installed-project-controls-final/Hyper-Studio.exe` passed `scripts/smoke-project-controls.mjs` with a long disposable project path. Full outputs: `.local-cache/project-controls-installed-final.log` and `.local-cache/project-controls-installed-visual.log`. Screenshots in `.local-tmp/project-controls-smoke-1791671595612/` show the long-path Create dialog, the shared removal dialog, and Projects after removal. The inspected Create dialog keeps its action buttons in view; the removal dialog shows the project name and full path.

The rebuilt `.local-tmp/installed-project-controls-final4/Hyper-Studio.exe` passed the same seven lifecycle checks in `.local-cache/project-controls-installed-final4.log` after the Editor and status-overlay fixes.

| Action | Result |
| --- | --- |
| Empty Recent projects → New Project → name, folder, Editor mode | Passed; managed manifest created. |
| Rename → manifest update → renderer reload | Passed; renamed title persisted. |
| Recent row → Remove from Hyper-Studio | Passed; sidebar/card entry removed and original files retained. |
| Open project folder after app-only removal | Passed; same project ID restored. |
| Simulated OS Trash failure | Passed; project entry and folder remained, error shown. |
| Confirmed OS Trash of disposable folder | Passed; entire folder left its original location and app entry cleared. |
| Restart after removal | Passed; project did not reappear. |

Focused backend tests cover manifest ID mismatch, root/shared-storage/symlink/junction guards, registered child projects, and active jobs; see [project-removal-review.md](project-removal-review.md). The installed [first-party interaction audit](first-party-installed-interaction-audit.md) then held a loopback provider job and confirmed that both Trash and app-only removal were blocked without losing the project. Create, Rename, and Remove dialogs passed Escape, Shift+Tab containment, and focus restoration checks.

## Windows package and deeper smokes

- Full desktop TypeScript and Vite desktop/remote builds passed; `1,483/1,483` desktop tests passed after the final source fixes in `.local-cache/project-controls-desktop-tests-final4.log`. The separate Editor timeline regression passed `1/1`. Native copy helper passed `6/6`; scoped Vue passed `166/166`; managed Python pack catalog passed `2/2`.
- Repository-local OpenCode V2 ran bounded read-only project-control investigations under `docs/agent-tasks/`; its second run passed `44/44` focused tests and made no source edits. Codex reviewed its report, rejected two unsupported registry claims, and fixed the confirmed dialog keyboard/persistence gaps. See `docs/agent-tasks/reports/project-controls-second-review/report.md`.
- Fresh installed `scripts/smoke-packaged-electron.mjs` passed canvas startup, JSON roundtrip, Editor↔Workflow usable media, and cloud/account checks. Log: `.local-cache/project-controls-packaged-smoke.log`.
- `scripts/smoke-provider-cross-mode.mjs` passed one Custom profile used by Editor and Workflow, a mode switch during a running mock job, two provider calls, and two indexed videos. Log: `.local-cache/project-controls-provider-cross-mode.log`.
- `scripts/smoke-workflow-compat.mjs` passed three imported workflow variants, preserved node IDs/links, missing-node guidance, reviewed install request, and removed cloud-node preservation. Log: `.local-cache/project-controls-workflow-compat.log`.
- `scripts/smoke-manager-local-install.mjs` passed reviewed install from an exact repository-local fixture commit, Manager queue completion, managed-engine restart, ImpactInt registration, and preservation of imported node ID 90909. Log: `.local-cache/project-controls-manager-install.log`.
- `scripts/smoke-first-party-controls.mjs` passed an installed UI sweep of Home, Explore VFX/result, Settings tabs, Custom HTTP create/check/delete, Editor tabs, Workflow canvas Save/byte-identical Export/Node Library, dialog keyboard behavior, and active-job removal blocking. See [the control-by-control report](first-party-installed-interaction-audit.md) and `.local-cache/first-party-controls-final.log`. Deeper Editor/Workflow controls are under separate smoke review.
- Final4 installer: `apps/desktop/release/Hyper-Studio-Setup.exe`, 419,867,835 bytes, SHA-256 `0D490784FFA1B581157D5F9CF3353BF844923643A6A0015D6CA0FCB34CEB110A`, Authenticode `NotSigned`. `scripts/install-windows-local.ps1` installed it under the repository with exit 0 and matching unpacked executable.
- Brand audit found zero legacy visual filenames in 253 tracked visual assets and three built trees. The existing 178 source-string candidates remain classified in the prior Phase 5 audit; that count is not evidence that every visual state has been inspected. Final4 log: `.local-cache/project-controls-brand-audit-final4.log`.

## Limits and next gate

The deeper [Editor smoke](editor-control-smoke.md) exposed duplicate default names after **File → New Timeline**. Source commit `b6be973` assigns the first unused numbered name and adds a focused passing regression; a rebuilt installed run is pending. The deeper Workflow smoke exposed a persistent host status overlay blocking the canvas Keyboard Shortcuts control. The host status now allows pointer events through and auto-dismisses after eight seconds; ordinary-click verification on the rebuilt package is pending. Workflow canvas controls and Manager reachability are still under review. Keep `todo.md` current items pending until defect reruns pass. Only then push the validation branch and run macOS/Linux package smokes in GitHub Actions. No live LTX, Runway, Veo, fal.ai, or custom hosted API generation was attempted.
