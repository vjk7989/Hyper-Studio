# Hyper-Studio phase to-do list

Status: `[x]` completed with its phase gate passing; `[·]` in progress or awaiting a gate; `[ ]` not started. A feature can be implemented while its phase remains `[·]` until the whole gate passes.

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

- [ ] Manage the local workflow engine inside the desktop app with project-scoped paths and shared provider bridge.
- [ ] Pin and brand the Vue canvas; embed it in the Electron window with the host header and mode switch.
- [ ] Open, save, import, and export compatible workflow JSON without renaming node identifiers.
- [ ] Show missing third-party nodes and require a reviewed install action.
- [ ] Verify workflow output in Editor, Editor media in Workflow, restart, mode changes during jobs, and the full phase gate.
- [ ] Update architecture record, handoff, code map, and Graft graph.

## Phase 5 — Surface rebrand and release

- [ ] Apply the supplied Vercel theme tokens to React and Vue and prepare rounded light/dark logo and desktop icons.
- [ ] Replace shipped app-owned branding in UI, assets, metadata, links, errors, filenames, and installers; retain compatibility IDs and legal attribution.
- [ ] Scan shipped strings and visual assets; inspect light/dark, loading, error, and empty states.
- [ ] Build and smoke-test Windows, macOS, and Linux packages; pass all gates.
- [ ] Update architecture record, handoff, code map, and Graft graph; publish the release checkpoint.

## Managed OpenCode V2 worker

- [x] Verify the official stable V2 version and any existing installation; install a separate Windows CLI under `.tools/opencode`.
- [x] Confirm its configured database, state, cache, log, download, and temporary paths and observed writes stay inside this repository.
- [·] Have a Codex runner write a bounded read-only Phase 3 test task under `docs/agent-tasks/`, run it, and save concise findings plus full logs.
- [ ] Codex reviews the findings; assign one non-overlapping coding task only after the investigation works.
