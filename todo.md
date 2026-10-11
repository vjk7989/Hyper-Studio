# Hyper-Studio phase to-do list

Status: `[x]` verified complete; `[·]` in progress or only partly verified; `[ ]` not started. Phase 4's scoped integration gate and Phase 5 final7 Windows installed/macOS/Linux packaged gates passed. The later project-controls Windows refresh passes its focused checks; its macOS/Linux rerun and broader release checks remain open.

## Phase 5 continuation — experience and functional gates

The numbered steps below are sequential gates. A subtask stays `[·]` after implementation until its focused tests and installed-app check pass; only then is it `[x]`. Prior scoped platform gates do not close these broader checks.

### 5.1 Fast, stable mode switching — Windows gate

- [x] 5.1.1 Measure cold launch, first Workflow entry, and ten warm Editor↔Workflow switches on one Windows runner; retain raw timing logs and report p95. Installed run 38120631024: warm p95 66 ms.
- [x] 5.1.2 Add a trusted Vue canvas-ready handshake; gate Workflow Open, Save, and Extensions until the canvas restores its tabs.
- [x] 5.1.3 Keep Editor and Workflow mounted for the active project, suspend hidden playback and shortcuts, and dispose both on project change.
- [x] 5.1.4 Prestart the installed Workflow runtime and canvas after project open during idle time; never implicitly download a runtime or models.
- [x] 5.1.5 Replace the blocking PyTorch probe with an asynchronous, per-runtime cached check.
- [x] 5.1.6 Pass unsaved-work, Undo, running-job, focus, project-isolation, and ten-toggle p95 ≤ 1 second checks on the same installed Windows runner; fix and rerun failures. Run 38121218674 passed Editor Undo/focus after toggle, unsaved Workflow IDs, project B isolation, existing mock job checks, and warm p95 80 ms.
- [x] 5.1.7 Refresh architecture record, handoff, code map, Graft graph, and codebase-memory status after the gate passes. Graft is current; codebase-memory reports indexed but has stale symbols and no portable artifact, as recorded in handoff.

### 5.2 Skippable first-run connection choice — Windows gate

- [x] 5.2.1 After shared-storage setup, offer Connect a video API, Explore without a connection, and optional local-model setup once when no profile exists.
- [x] 5.2.2 Reuse Connections and its secure profile store; persist Explore, bypass the choice for existing profiles, and keep basic editing available without a key.
- [x] 5.2.3 Consolidate duplicate shared-storage picker; handle locked vault, picker cancel, validation error, restart, keyboard focus, and reduced motion.
- [x] 5.2.4 Pass focused tests and a fresh installed Windows onboarding smoke; refresh architecture record, handoff, code map, Graft graph, and codebase-memory status. [Run 38123552292](https://github.com/vjk7989/Hyper-Studio/actions/runs/38123552292) passed after the reduced-motion failure and fix.

### 5.3 Shared shell polish — Windows gate

- [·] 5.3.1 Review Projects, Recent, Home, Explore Tools, Connections, and Settings labels, empty/busy/error states, focus return, and keyboard operation. Source audit and scoped fixes are ready; installed checks pending.
- [·] 5.3.2 Fix proven defects without changing safe project removal rules or the Vercel-derived theme. Project menus, Connections action isolation, Settings focus, and slash shortcut are implemented; gate pending.
- [ ] 5.3.3 Pass focused and installed interaction checks; refresh phase records and graphs.

### 5.4 Reachable-control inventory — Windows gate

- [ ] 5.4.1 Record each reachable first-party control, expected result, fixture, test, evidence, and defect status.
- [ ] 5.4.2 Exercise Editor timeline actions and export with disposable media, plus Workflow wiring, run/cancel, JSON IDs, Manager review, shared media, and appearance.
  - [ ] 5.4.2a Exercise real Editor clip drag, blade/trim, tool shortcuts, and a short rendered local video with cancel/failure handling.
  - [ ] 5.4.2b Exercise Workflow mouse port wiring, node edit/Undo, active queue cancel, and JSON roundtrip with stable node IDs.
  - [ ] 5.4.2c Exercise Manager review/update/uninstall with a local fixture, cross-mode media after restart, and light/dark persistence.
- [ ] 5.4.3 Use mocked providers and the local engine where live services are unnecessary; fix each failed control and rerun its group before proceeding.
- [ ] 5.4.4 Pass relevant upstream suites and fresh installed Windows interaction checks; refresh phase records and graphs.

### 5.5 Brand and platform release gate

- [ ] 5.5.1 Inspect remaining light/dark, loading, empty, and error states plus inherited cloud/account paths; fix residual app-owned branding.
- [ ] 5.5.2 Pass full relevant unit suites, typechecks, builds, brand scan, unsigned Windows NSIS installation and smoke.
- [ ] 5.5.3 After Windows passes, pass macOS and Linux packaged smokes in GitHub Actions; fix and rerun affected jobs.
- [ ] 5.5.4 Refresh architecture record, handoff, code map, Graft graph, and codebase-memory status; record live provider/model/external-pack limits without claiming verification.

## Current checkpoint — project controls and functional smoke

- [x] Expose Extensions from embedded Workflow and route its search through the managed local catalog. Focused tests and Windows installed/macOS/Linux packaged gate passed in run 38100244801; the installed Manager dialog found an Impact pack without a public registry/Algolia request.
- [·] Exercise real external pack download, update/uninstall, every Manager panel, live hosted video providers, model inference, and the remaining specialized Editor/Workflow controls; the passing scoped gate does not cover them.

- [x] Show New Project from an empty Recent projects list; provide one remove dialog from Recent and Projects with app-only and OS Trash choices.
- [x] Verify app-only removal preserves files and can be reopened; pass installed OS Trash/failure recovery, manifest/path guards, and active-job blocking.
- [x] Verify create, open, rename, initial mode, close/reopen, and restart persistence in the final5 installed app.
- [·] Run the Windows first-party interaction audit across Home, Explore Tools, Connections, Settings, Editor, Workflow, Manager, and export. A later installed refresh passed first-party controls, Editor 17/17, local Workflow Run, project lifecycle 7/7, and 1,483/1,483 desktop tests; untested upstream controls and optional visual states remain in the gate report.
- [x] Remove inherited Gen Space retirement copy and duplicate LTX/fal key-entry controls; verify light/dark Settings selection and delayed Editor Undo after autosave in the rebuilt Windows installer.
- [x] In the Windows unpacked app, verify SRT export and exported PNG FCPXML reimport; fix FCPXML media type detection when the asset name is generic. Editor smoke now passes 19/19.
- [x] Build and freshly install the latest unsigned Windows NSIS on a GitHub Actions Windows runner; upload the installer artifact in run 38098445173. The local partial NSIS remains unusable because G: ran out of space.
- [x] Confirm FCPXML image reimport on a clean installed Windows runner. The Editor smoke passed 19/19 after replacing the optional Pillow dependency.
- [x] Rerun macOS/Linux packaged gates for the latest source. All three platform jobs passed in run 38098445173.
- [x] After the scoped Windows gate, pass macOS and Linux packaged smokes in GitHub Actions run 38093974210; both jobs also passed the embedded-account, local node-pack, desktop, and brand-audit steps.
- [·] At each completed gate, refresh the architecture record, handoff, code map, codebase-memory snapshot, and Graft graph. The latest Manager gate documents and Graft are refreshed; codebase-memory fast index now has the new symbols, but did not produce a compressed repository artifact, so portable snapshot synchronization remains unverified.

## Phase 1 — Baseline and containment

- [x] Import desktop and workflow source with provenance and licenses.
- [x] Establish repository-local dependency, cache, and temporary paths; avoid model-pack downloads.
- [x] Disable inherited telemetry, updates, downloads, and support destinations.
- [x] Checkpoint the first project-folder and mode-switch UI slice.
- [x] Pass desktop tests, TypeScript, and frontend build; update architecture record, handoff, code map, and Graft graph.

## Phase 2 — One project workspace

- [x] Select shared storage once and choose a folder for each project.
- [x] Create versioned project metadata and `assets/`, `outputs/`, and `workflows/` directories.
- [x] Route generated output into the project, maintain a durable media index, and watch for changes in either mode.
- [x] Offer non-destructive legacy import and verify path containment and reopen behavior.
- [x] Pass the workspace and desktop gates; update architecture record, handoff, code map, and Graft graph.

## Phase 3 — Shared providers and jobs

- [x] Secure global named profiles, multiple URLs and keys, project defaults, and per-job model choice.
- [x] LTX, Runway, Google Veo, fal.ai, and Custom HTTP adapters with direct and polling output mappings.
- [x] Concurrent broker jobs, normalized progress/output, secret-safe IPC, and first-party workflow nodes.
- [x] Editor and settings controls for setup, switching, and job submission.
- [x] Fix security findings; rerun mocked submit/poll/failure/cancel, vault, node, full desktop, TypeScript, and build gates.
- [x] Checkpoint the phase and update architecture record, handoff, code map, and Graft graph.

## Phase 4 — Integrated workflow UI

- [x] Manage the local workflow engine inside the desktop app with project-scoped paths and shared provider bridge.
- [x] Pin and brand the Vue canvas for the integration slice; embed it in the Electron window with the host header and mode switch.
- [x] Open, save, import, and export workflow JSON without renaming node identifiers; verify packaged toolbar byte roundtrip and narrow unknown-node compatibility.
- [x] Show missing third-party nodes with visible guidance and review UI tests.
- [·] Exercise manager-backed reviewed installation and broader real-world third-party workflows.
- [x] Verify Workflow output in Editor, Editor media in Workflow, restart, mode changes during a local-mock job, Windows installed app, and macOS/Linux packaged gates.
- [x] Fix generated-thumbnail recursion and mode autosave regression; rerun the desktop and cross-platform gates.
- [x] Update architecture record, handoff, code map, and Graft graph (7,058 files; 64,373 nodes; 158,848 edges). Codebase-memory reindex still needs verification.

## Phase 5 — Surface rebrand and release

- [·] Apply the supplied Vercel theme tokens to React and Vue and prepare rounded light/dark logo and desktop icons; remaining platform/state review is open.
- [·] Replace shipped app-owned branding in UI, assets, metadata, links, errors, filenames, and installers; retain compatibility IDs and legal attribution.
- [·] Scan shipped strings and visual assets; inspect light/dark, loading, error, and empty states. All 178 unallowlisted source candidates were classified; five optional paths and remaining visual states need verification.
- [x] Build, freshly install, and smoke the prior Windows NSIS under repository-local paths; verify media, Workflow Settings branding/account/pricing/contrast, three workflow compatibility variants, reviewed queue interception, and removed cloud node ID 91001.
- [x] Run the prior Windows read-only brand inventory with zero legacy visual filenames in tracked source and three built trees; record installer hash, size, and `NotSigned` status.
- [x] Build and freshly install the final4 Windows NSIS; pass cold-start media/Settings smoke, three compatibility variants, reviewed queue interception, and removed cloud node ID 91001 on that embedded bundle.
- [x] Verify the final4 Windows installer size/hash/unsigned status and read-only brand audit with zero legacy visual filenames in three built trees.
- [x] Pass macOS arm64 and Linux x64 Phase 5 package smoke and brand-audit jobs in GitHub Actions run 38067616426.
- [x] Freshly install final7 Windows NSIS; pass cold-start media/Settings smoke, three compatibility variants, and real Manager queue/install/restart using a repository-local ImpactInt fixture. Host Import/Open waits for canvas tab restoration after restart. Post-restart dark screenshot confirms legible Overview/favorites, minimap zoom/menu icons and 100%, and Run toolbar “0 active” after contrast fixes `29680d8` and `6003ba8`.
- [x] Verify final7 unsigned Windows installer artifact (419,861,344 bytes; SHA-256 `920590668D80F52CB973CDB6D4FACB4BFE33ADC3DB6EEDF9B2A562CDE38E60D2`) and read-only brand inventory with zero legacy visual filenames in three built trees.
- [x] Pass macOS arm64 and Linux x64 final7 package smoke and brand-audit jobs in GitHub Actions run 38073188574.
- [·] Review generic auth compatibility chunks, 178 source string candidates, light/dark and optional visual states, and individual PSD/error-report interactions.
- [·] Complete release packaging checks: scoped Windows installed and macOS/Linux packaged gates passed; macOS/Linux installer installation/uninstall, full rebrand review, installation from a real external third-party source, and live provider acceptance remain.
- [x] Update architecture record, handoff, code map, and Graft graph (final7: 7,073 files; 64,447 nodes; 159,003 edges).
- [·] Produce and verify a portable codebase-memory snapshot and finish the broader release checkpoint. The latest fast index succeeded in its live graph (655,150 nodes, 976,907 edges), but reported no compressed repository artifact.

## Managed OpenCode V2 worker

- [x] Verify the official stable V2 version and any existing installation; install a separate Windows CLI under `.tools/opencode`.
- [x] Confirm its configured database, state, cache, log, download, and temporary paths and observed writes stay inside this repository.
- [x] Have a Codex runner write a bounded read-only Phase 3 test task under `docs/agent-tasks/`, run it, and save concise findings plus full logs.
- [x] Codex reviewed the passing investigation and the separate Phase 4 workflow-file coding task; focused 20/20, desktop 1,467/1,467, and TypeScript checks passed.
