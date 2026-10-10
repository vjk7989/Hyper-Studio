# Phase handoff

## Current checkpoint: Phase 4 managed Workflow integration (passed 2026-10-10)

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
