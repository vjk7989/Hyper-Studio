# Hyper-Studio phase to-do list

Status: `[x]` verified complete; `[·]` in progress or only partly verified; `[ ]` not started. Phase 4's scoped integration gate and Phase 5 final7 Windows installed/macOS/Linux packaged gates passed. Broader release checks remain open.

## Current checkpoint — project controls and functional smoke

- [x] Show New Project from an empty Recent projects list; provide one remove dialog from Recent and Projects with app-only and OS Trash choices.
- [x] Verify app-only removal preserves files and can be reopened; pass installed OS Trash/failure recovery, manifest/path guards, and active-job blocking.
- [x] Verify create, open, rename, initial mode, close/reopen, and restart persistence in the final5 installed app.
- [·] Run the Windows first-party interaction audit across Home, Explore Tools, Connections, Settings, Editor, Workflow, Manager, and export. The final5 scoped installed checks pass; untested upstream controls and optional visual states remain in the gate report.
- [ ] After the Windows gate passes, run macOS and Linux packaged smokes in GitHub Actions and fix any failures.
- [·] At each completed gate, refresh the architecture record, handoff, code map, codebase-memory snapshot, and Graft graph. Final5 Windows documents and Graft are refreshed; codebase-memory reindex is pending verification.

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
- [·] Verify the separate codebase-memory snapshot after two fast-reindex worker crashes and finish the broader release checkpoint.

## Managed OpenCode V2 worker

- [x] Verify the official stable V2 version and any existing installation; install a separate Windows CLI under `.tools/opencode`.
- [x] Confirm its configured database, state, cache, log, download, and temporary paths and observed writes stay inside this repository.
- [x] Have a Codex runner write a bounded read-only Phase 3 test task under `docs/agent-tasks/`, run it, and save concise findings plus full logs.
- [x] Codex reviewed the passing investigation and the separate Phase 4 workflow-file coding task; focused 20/20, desktop 1,467/1,467, and TypeScript checks passed.
