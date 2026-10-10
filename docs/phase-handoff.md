# Phase handoff

## Current checkpoint: project controls, Windows final5 (2026-10-11)

The project lifecycle and scoped Windows installed-app gate passed; macOS/Linux packaged project-controls gates and the wider feature/release audit remain open. The final5 unsigned installer is 419,861,488 bytes, SHA-256 `68A98957838B9B2287865A81E4FAA4409A456E8BD41767E7A32486D469382341`, and installed at `.local-tmp/installed-project-controls-final5/`. Read [gates/project-controls-windows.md](gates/project-controls-windows.md) before extending the work.

- Recent projects always offers New Project and per-row removal. Projects and Recent use the same full-path confirmation dialog with app-only and OS Trash choices. `electron/project-removal.ts` enforces active-job, manifest, shared-storage, drive-root, symlink/junction, and nested-project guards. The app-only choice preserves files and supports reopening the same project; Trash clears records only after Electron OS Trash succeeds. Focused and installed lifecycle checks passed, including failure recovery and restart.
- Installed Editor controls passed 16/16, including parseable FCPXML package export of an imported PNG. Workflow local zero-model Run, JSON byte roundtrip, ordinary toolbar shortcut click, and missing-node guidance passed. Custom HTTP local mock used one connection in both modes. Manager installed a reviewed local ImpactInt fixture, restarted, and preserved ID 90909. A compatibility smoke held that fixture outside the engine directory, verified missing-node guidance and preserved IDs, then restored it.
- A final5 installed smoke with the local pack present exposed an idle upstream Registry bulk lookup. Embedded `useConflictDetection` now uses local pack/import-failure data without that call; focused Vue 12/12, scoped typecheck/build, and fresh packaged no-cloud/account smoke passed. Existing explicit Manager version/update UI Registry callers are hidden in embedded mode; a broader audit of optional paths remains.
- Full desktop tests passed 1,483/1,483 before final5 packaging. Brand audit found zero legacy visual filenames in 253 tracked visual assets and three built trees, with 178 previously classified source candidates. OpenCode V2 performed bounded read-only investigations; Codex reviewed its reports and accepted no source diff from it. Full logs remain under repository-local `docs/agent-tasks/reports/` and `.local-cache/`.
- Graft build/map refreshed successfully at 7,084 files, 64,492 nodes, and 161,122 edges. The separate codebase-memory snapshot still needs verification.
- Limits: Rendered video export, live hosted providers, model inference, Workflow active cancellation/mouse port connection/theme persistence, Manager browse/update/uninstall/external install, and optional visual states remain unverified. Do not mark the wider all-controls or release gate complete. Next run macOS/Linux packaged smokes on GitHub Actions, fix observed failures, then retry the codebase-memory snapshot if its indexer is stable.

## Current checkpoint: Phase 5 brand and containment (open, 2026-10-10)

Phase 4 passed its scoped gate. Phase 5 final7 freshly installed Windows cold/compatibility/Manager/visual checks and macOS/Linux packaged jobs passed. Both platform jobs succeeded in [GitHub Actions run 38073188574](https://github.com/vjk7989/Hyper-Studio/actions/runs/38073188574). Broader Phase 5 release work remains open; see [gates/phase-5-brand-audit.md](gates/phase-5-brand-audit.md).

### Implemented in this checkpoint

- Desktop and embedded Workflow use the rounded Hyper-Studio mark, bundled Geist, neutral light/dark colors, and 8 px primary corners. PrimeVue's primary scale is neutral. This is a token mapping; a full screen-by-screen visual review remains pending.
- Embedded Workflow hides or blocks inherited account, billing, cloud promotion, upstream help, and telemetry paths. Managed engine projects do not register the 43 account-proxy node modules. The bridge to desktop provider jobs remains available to the first-party `HyperStudioGenerateVideo` node. Imported IDs stay byte-for-byte in workflow JSON, including missing cloud/third-party nodes.
- A local `GET /hyper-studio/node-packs?id=<id>` endpoint reads the installed manager's bundled `custom-node-list.json`. The embedded canvas does not use the upstream registry for missing-pack lookup. Install guidance shows name/source and requires explicit confirmation before submitting a local manager task. Final7 completed a real Manager install of a repository-local ImpactInt fixture; installation from the external Impact Pack source remains unverified.
- The old OG image, cloud video references, upstream help links, optional icon artwork, and template labels were replaced or excluded from the embedded build. Embedded Workflow settings now display Hyper-Studio while preserving `Comfy.*` IDs, hide inherited account/billing and cloud-pricing controls, and use semantic foreground colors for dark Settings labels.
- Layer Editor PSD downloads now use `hyper-studio-layers-*`, and embedded Workflow error reports show Hyper-Studio headings while preserving the engine version field. Focused tests and the latest package gates passed; not every export/error state was manually inspected.
- The embedded Vue build now guards account/billing dialog and route imports at compile time, substitutes inert placeholders for inherited account UI, and rejects forbidden account asset chunks. An embedded-only signed-out identity shim replaces Firebase SDK imports; the build rejects bundled Firebase SDK modules and identity chunks. Local build inspection still finds generic auth compatibility chunks (`auth-*`, `authStore-*`, `workspaceAuthStore-*`); their presence is not evidence of an active account UI, and this is not a claim that all auth code was removed.

### Verified evidence and open gates

- Earlier focused managed-cloud Python tests: 10 passed; upstream compatibility: 65 passed, 2 skipped; provider adapters: 8 passed; server/CSP: 8 passed. Embedded-account Vue suite: 79 passed across five files. Local node-pack Vue tests: 32 passed across two files. Direct `apps/workflow-ui/node_modules/.bin/vue-tsc --noEmit -p tsconfig.hyper-studio.json` passed on Windows; the later final account-free Vue build passed. `pnpm typecheck` itself was not a valid gate here because pnpm 11 attempted an install in the noninteractive shell; use the direct binary after a local install.
- The final7 read-only brand audit (`.local-cache/phase5-brand-audit-final7.log`) found 232 tracked-source matches, 178 unallowlisted review candidates, 253 visual assets, and **zero** legacy visual filenames in tracked source and three built trees. All 178 source candidates were classified; five optional paths remain uncertain. The scan does not prove every rendered frame or state.
- Final7 NSIS `apps/desktop/release/Hyper-Studio-Setup.exe` is 419,861,344 bytes; SHA-256 `920590668D80F52CB973CDB6D4FACB4BFE33ADC3DB6EEDF9B2A562CDE38E60D2`; Authenticode `NotSigned`. Fresh repo-local install `.local-tmp/installed-phase5-final7` passed cold-start canvas/JSON/media/Settings smoke and three workflow compatibility variants. Host Import/Open waits for GraphCanvas startup tab restoration (`f66fa25`). A reviewed Manager action installed a repository-local ImpactInt fixture, restarted the engine, registered the node, and retained imported ID `90909` on the active canvas. The smoke redirects only the exact reviewed Git URL to a local fixture and blocks other HTTP clones; it does not install the real external Impact Pack. The post-restart screenshot `.local-tmp/manager-install-smoke-1791655049134/installed-node-after-restart.png` shows Overview/favorites, minimap zoom/menu icons and 100%, and Run toolbar “0 active” legible on the dark canvas after contrast fixes `29680d8` and `6003ba8`. Evidence: `.local-cache/phase5-windows-installed-smoke-final7-cold.log`, `.local-cache/phase5-windows-installed-compat-final7.log`, `.local-cache/phase5-manager-install-local-smoke-final7.log`, and `.local-tmp/packaged-electron-smoke-final7-cold/`.
- GitHub Actions run 38073188574 completed successfully for macOS arm64 and Linux x64 package smoke and brand audit. Final7 Graft build/map passed at 7,073 files, 64,447 nodes, and 159,003 edges (`.local-cache/phase5-graft-{build,map}-final7.log`). The separate codebase-memory MCP fast reindex crashed twice; its snapshot is unverified.
- Limits: No live LTX/Runway/Veo/fal.ai credential acceptance, model-pack inference, install from the real external Impact Pack source, macOS/Linux installer installation/uninstall, or broker restart recovery. Remaining optional visual states and five uncertain source paths still need review. Keep license notices and internal workflow identifiers.

### Next agent entry points

1. Read [gates/phase-5-brand-audit.md](gates/phase-5-brand-audit.md) and use final7 Windows logs plus GitHub Actions run 38073188574 as the scoped checkpoint. The final7 installer is unsigned.
2. Resolve the five uncertain source paths and inspect remaining light/dark, loading, error, empty, installer/icon, and optional-overlay states. Zero legacy filenames does not settle all visual checks.
3. Exercise a reviewed install from a real external third-party source and real hosted provider acceptance when credentials/test infrastructure are available; test macOS/Linux installer installation/uninstall separately. Refresh the codebase-memory MCP snapshot when its worker is stable. Keep installs, caches, temp, and generated media under the repository/shared project folder.

## Prior checkpoint: Phase 4 managed Workflow integration (passed 2026-10-10)

Phase 3 is checkpointed at `6859617`. The scoped Phase 4 integration gate passed on Windows locally and on macOS/Linux in [GitHub Actions run 38057082762](https://github.com/vjk7989/Hyper-Studio/actions/runs/38057082762). Phase 4 Graft build/map passed (7,058 files, 64,373 nodes, 158,848 edges); the separate codebase-memory MCP fast reindex is unverified and may be stale. The release rebrand remains Phase 5. See [gates/phase-4.md](gates/phase-4.md) for exact checks and limits.

### What works

- Electron starts one project-scoped workflow engine from the shared-storage Python environment. Its input, output, user, temp, and database paths belong to the selected project; models and runtime caches belong to shared storage. No model packs were downloaded.
- The pinned Vue canvas from frontend v1.55.14 runs inside the React Workflow view. The Electron host owns project selection, header, mode switch, settings, workflow file actions, and shared media. An embedded-only storage fallback lets the canvas mount in the opaque iframe. Exact engine-origin navigation and a random token protect the cross-site iframe GET; an unrelated cross-site iframe request returned 403.
- Workflow JSON Open/Import/Save/Export preserves raw bytes and node IDs. A packaged compatibility smoke retained a known ID 37 and unknown third-party ID 90909/type with visible missing-node guidance. An installed Windows app passed the same narrow check. A reviewed extension-manager install action and broad third-party workflow variants remain unverified.
- Packaged Windows smoke executed EmptyImage → SaveImage and consumed an Editor-imported PNG with LoadImage → SaveImage. The generated PNG appeared in Workflow shared files and Video Editor; the Editor PNG appeared in Workflow after a header toggle without reopening. Reopen restored workflow bytes and nine indexed media entries and restarted the engine/node API.
- A local Custom HTTP mock used one saved profile in Editor and a first-party Workflow node, kept an Editor job running across the mode toggle, and indexed two videos. This proves the shared broker contract across modes, not live hosted API acceptance.
- The media scanner excludes generated big/small PNG thumbnails when their source exists, preventing recursive thumbnail discovery. Mode changes update the latest project state so autosave and reopen preserve the selected mode.

### Verification

- The reviewed OpenCode workflow-file task passed 20/20 focused tests, 1,467/1,467 desktop tests, and desktop TypeScript locally; report and full logs are in `docs/agent-tasks/reports/phase-4-workflow-files/`. Vue embedded build, scoped typecheck, 3/3 bridge tests, and 63/63 focused frontend tests passed. Full upstream Vue typecheck exhausted memory on this 15 GB Windows host.
- Windows unpacked and NSIS builds passed. The NSIS artifact installed silently under repo-local storage; installed canvas/JSON/media and provider-mock smokes passed. The inherited VC++ hook was removed, and `selectPerMachineByDefault: true` resolved a local silent-install System.dll crash. Authenticode reported `NotSigned`; the user accepted unsigned delivery for this scope.
- GitHub Actions run 38057082762 passed on macOS arm64 and Linux x64. Each desktop suite reported 1,472 passed, 0 failed, 1 skipped. macOS packaged smoke opened the managed canvas and passed JSON and bidirectional media flows after bounded first-use runtime setup. Linux packaged smoke opened the Hyper-Studio window, ran EmptyImage → SaveImage, and indexed the PNG. The Linux test keeps TMPDIR under a short repo-local path because Chromium's single-instance Unix socket exceeded the 108-byte path limit at the former deep path; the production lock remains enabled. Temporary crash probes were removed before this passing run.
- No model packs or live provider credentials were used in these gates. Platform installer installation/uninstall, in-flight hosted job recovery, live LTX/Runway/Veo/fal.ai requests, and the full Python inference suite remain unverified.

### Next agent entry points

1. Start Phase 5 with [architecture-decision-record.md](architecture-decision-record.md), [codebase-map.md](codebase-map.md), [gates/phase-4.md](gates/phase-4.md), and the refreshed Graft graph. Verify the separate codebase-memory MCP snapshot before relying on its Phase 4 edges.
2. Complete the React/Vue Vercel theme, rounded mark/icon variants, app-owned string/asset/link audit, light/dark and loading/error/empty states, OS package identity, and legal attribution. Preserve workflow schema IDs and legitimate provider/model names.
3. Keep all downloads, runtimes, caches, and temporary files under this repository via `scripts/with-local-env.ps1`. Test and fix each subsequent gate before marking its todo items complete.
## Current checkpoint: Phase 3 provider profiles and broker (2026-10-10)

Phase 3 builds on the Phase 2 project workspace. The current working tree has named encrypted provider profiles, a shared Electron job broker, a first-party workflow node bridge, and a provider composer in the desktop UI. These are code-level features, not a live API or integrated workflow-canvas release. See [gates/phase-3.md](gates/phase-3.md) for exact verification.

### What works in this slice

- Settings → Connections creates multiple named LTX, Runway, Google Veo, fal.ai, or Custom HTTP profiles. The renderer sees metadata without API keys. A key is held only in a transient password input during entry; OS encryption or a passphrase vault protects the local store. Legacy key import requires an explicit confirmation. The old API Keys tab/deep links route to Connections; backend legacy key setters return 410 and new settings saves scrub keys.
- A project can store a default profile and model ID. The Editor, Workflow placeholder, and Home text-to-video form can submit a job with a per-job model override. Other existing specialized feature forms still use project-scoped Python generation.
- Electron brokers jobs by project/profile/model, snapshots the submitted profile, allows concurrent profiles with a two-job per-profile cap, normalizes progress/results, and registers generated files in the project media index. LTX, Runway, Veo, fal.ai, and Custom HTTP direct/async adapters have mocked coverage.
- A first-party Hyper-Studio workflow node uses an authenticated loopback bridge to this same broker. Its token is process-local, never a node input or serialized workflow field. The node source and unit tests exist, but desktop process integration and canvas execution remain Phase 4 work.

### Verified and pending

- Desktop `scripts:test`: **1,436/1,436**; `typecheck:ts` and `build:frontend`: exit 0. Isolated Python key-safety **3/3**, first-party workflow-node standard-library suite **5/5**, and mocked broker **15/15** passed. Graft refreshed at 2,292 files; see the gate report.
- Live provider API smoke, local image uploads, restart recovery for in-flight broker jobs, remote provider cancellation, managed workflow-engine integration, and the full backend pytest suite remain pending. “Stop tracking” cancels local observation/download; a remote job may continue.
- The hosted-provider composer currently covers text-to-video. The Vue workflow canvas is not yet embedded. Existing branded assets and app copy remain for the release rebrand phase.

### Next agent entry points

1. Read [architecture-decision-record.md](architecture-decision-record.md), [codebase-map.md](codebase-map.md), and [gates/phase-3.md](gates/phase-3.md). Use the codebase-memory graph and Graft to jump to narrow symbols.
2. For Phase 4, wire the managed workflow process to the project folder, bridge token, and first-party node registration; embed the pinned branded Vue canvas. Confirm workflow output enters the Editor media index and Editor media is available to workflow inputs.
3. Add broker persistence/restart recovery and provider-specific remote cancellation only when supported by each API. Cover local media uploads and real hosted API smoke before claiming provider acceptance.
4. Run checks through `scripts/with-local-env.ps1` to keep caches and temp files on G. Fix failed checks before advancing.

## Prior checkpoint: Phase 2 project workspace (2026-10-10)

The imported baseline is committed as `df6e295`. Phase 2 workspace changes are in the current working tree; see [gates/phase-2.md](gates/phase-2.md) for exact checks. Workflow mode still displays a placeholder, not the runnable node canvas.

### What works in the current workspace slice

- The first-run screen asks for one shared storage folder. Electron records the choice in a small private `shared_storage.json` and creates `models/`, `runtimes/`, and `caches/` there. The Python launcher points app data/in-flight files at `<shared root>/backend`, and the backend honors `HYPER_STUDIO_MODELS_DIR` for large model files. Python setup is gated until storage is chosen.
- Opening or creating a project validates a schema-v1 `.hyper-studio/project.json` and creates `assets/`, `outputs/`, `workflows/`, and `.hyper-studio/media.json`; `.hyper-studio/editor.json` is written on save or import. The editor data and project-owned media references survive reopen. The manifest/editor file take precedence over the renderer's older localStorage listing.
- Electron's private `project_registry.json` binds a project ID to a canonical folder. The backend receives its path through `HYPER_STUDIO_PROJECT_REGISTRY`; tagged generation requests are checked against the matching project manifest. Invalid tags fail instead of silently writing elsewhere.
- All current queued video create requests and direct Editor video, image, retake, extend, and IC-LoRA routes accept optional `projectId`. Tagged outputs go to that project's `outputs/`. Untagged legacy calls retain their existing path. Queued output paths persist through SQLite migration `0002_project_output_path.sql`; old rows continue to work. Cross-volume writes copy to a destination-side temporary file and publish atomically.
- Electron scans project `assets/` and `outputs/`, stores relative media references in `.hyper-studio/media.json`, and polls for changes every two seconds. Editor assets and the Workflow placeholder read the same indexed media. Legacy project import is explicit and non-destructive.

### Verification and limits

- Desktop script tests: **1,415 passed, 0 failed**. TypeScript check and frontend build exited 0 on Windows, as recorded in the gate report.
- The isolated Python asset store suite passed **108/108** using small dependencies installed under this repository. The dependency-free workspace/migration gate passed **2/2**. Python `compileall` passed.
- Full backend pytest could not import `ltx_core` in the available Python environment. No model packs or full Torch/LTX stack were downloaded. Python generation with a real model, Electron plus Python end-to-end execution, and macOS/Linux packages remain unverified.
- At this Phase 2 checkpoint, Workflow mode displayed indexed project media but did not launch the engine, execute a graph, or embed the Vue canvas. The secure provider registry and broker arrived in the later Phase 3 slice above; existing legacy keys require an explicit confirmed import.
- Queue asset rows record absolute output paths even though project `media.json` uses relative paths. Moving an already used project folder requires a queue-history rebind; do not assume old queue links travel with it.

### Next agent entry points

1. Read [architecture-decision-record.md](architecture-decision-record.md) and [codebase-map.md](codebase-map.md). Use codebase-memory graph and Graft to jump to symbols, then inspect the narrow files listed there.
2. Build Phase 3 profiles in a global secure store. Return only redacted metadata to the renderer, ask before importing legacy LTX/fal/Gemini keys, and snapshot profile settings per job. Route Editor and first-party workflow nodes through one broker.
3. Preserve Phase 2 boundaries: project IDs come from the renderer, but folder resolution belongs to Electron/Python's verified registry; the backend must not write `media.json` beside Electron's index writer.
4. Run phase checks through `scripts/with-local-env.ps1`; all caches and temporary state stay under this repository. Avoid model-pack downloads for mock/provider gates. Refresh Graft after code changes.

## Prior checkpoint: Phase 1 baseline and containment

Imported editor and workflow source, license files, local build wrapper, preliminary rounded logo/theme, folder selection and mode switch, and upstream endpoint containment were checkpointed in `df6e295`. Exact upstream source commits are not established because imported copies lack `.git` history. Preserve Apache-2.0 and GPL-3.0 notices. The branded Vue frontend source pinned to engine package `1.55.14` has not yet been imported.
