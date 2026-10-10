# Phase handoff

## Current checkpoint: Phase 0 in progress (2026-10-10)

The public repository began as a scaffold. The local working tree now contains imported desktop editor and workflow engine source, plus an uncommitted first UI slice. This is not a releasable integrated app. Follow [phase-plan.md](phase-plan.md) and fill a gate report before advancing.

### Implemented locally, not yet checkpointed by this document

- Desktop and workflow engine source are present under `apps/desktop/` and `services/workflow/`, with Apache-2.0 and GPL-3.0 license files respectively. They are local copies without upstream `.git` history.
- A project creation flow asks for a folder and Editor/Workflow starting mode; an Electron mapping records project ID to folder, and imported assets can be copied under the chosen folder.
- The desktop has a mode toggle and a Workflow placeholder. This does not launch the node canvas or share generated output.
- `assets/logo-rounded.png` and partial desktop theme/logo changes exist. The logo is not a complete light/dark/icon asset set.
- `scripts/with-local-env.ps1` redirects common package, Python, model, Electron, and temp caches into this repository. Graft is installed locally under `.tools/graft/` and its graph under `graft/` is ignored.
- Graft `build` completed on 2026-10-10 over 2,257 source files, producing 33,332 wiring nodes, 75,177 edges, and 2,257 cards. `graft map --max-dirs 10` then showed the workflow core and desktop backend/frontend clusters, with `SqliteStore` among desktop hotspots. The graph is regenerable local state and may need a refresh after concurrent code edits.

### Baseline evidence and gate state

An earlier local agent reported 1,402 desktop script tests passing, TypeScript checks passing, and a Vite build passing for the first UI slice. That result must be rerun and recorded by the active implementation turn before Phase 0 is marked passed or committed. Python backend tests, workflow execution, and packaged Windows/macOS/Linux smoke tests have not been reported as passing. The `comfyui-frontend-package` version is pinned to `1.55.14`, but editable Vue frontend source has not been imported at this snapshot.

### Immediate next work

1. Inspect the local diff and provenance, check for secrets/large generated files, then remove upstream telemetry/update/download/signing destinations from the desktop release path.
2. Run repository-local desktop tests, TypeScript check, and frontend/Electron build; fix failures and record commands/results in `docs/gates/phase-0.md`.
3. Commit the baseline only after gate passes. Refresh Graft and codebase-memory indexes after source changes.
4. Begin Phase 1 project manifest, durable media index, and safe legacy import. Do not claim media is shared until both modes read the same index and restart/reopen works.

### Known risks and decisions for next agents

- Desktop project records currently use `frontend/lib/project-storage.ts` and renderer `localStorage`; `electron/app-state.ts` only maps project folders. Editor generation and the asset DB still use global paths.
- Legacy provider keys appear in backend settings. Move only with explicit user confirmation into secure global profile storage; never copy into project files or renderer state.
- The workflow engine accepts project-specific CLI paths, but startup, port, crash recovery, canvas build, and job/media bridging are not integrated.
- Preserve internal workflow node identifiers and `Comfy.*` settings IDs. Surface branding can change without changing workflow compatibility fields.
- Imported source licenses and required legal notices stay in release artifacts. Exact source commits and Vue frontend provenance are still unknown.
- Run all installs and builds through the repository-local wrapper. No model pack is needed for baseline UI tests.

## Previous checkpoint: repository scaffold

The scaffold created the public `Hyper-Studio` repository, supplied and rounded logo assets, local Graft installation, and initial docs. The former ADR that deferred the stack is superseded by the accepted Electron-host architecture above.
