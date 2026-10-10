# Phase handoff

## Current checkpoint: Phase 2 project workspace (2026-10-10)

The imported baseline is committed as `df6e295`. Phase 2 workspace changes are in the current working tree; see [gates/phase-2.md](gates/phase-2.md) for exact checks. The next implementation phase is global provider profiles and a shared job broker. Workflow mode still displays a placeholder, not the runnable node canvas.

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
- Workflow mode can display indexed project media, but does not launch the workflow engine, execute a graph, or embed the Vue canvas. This is Phase 4 work. The secure provider registry and multi-provider broker are Phase 3 work; existing legacy keys still require explicit migration later.
- Queue asset rows record absolute output paths even though project `media.json` uses relative paths. Moving an already used project folder requires a queue-history rebind; do not assume old queue links travel with it.

### Next agent entry points

1. Read [architecture-decision-record.md](architecture-decision-record.md) and [codebase-map.md](codebase-map.md). Use codebase-memory graph and Graft to jump to symbols, then inspect the narrow files listed there.
2. Build Phase 3 profiles in a global secure store. Return only redacted metadata to the renderer, ask before importing legacy LTX/fal/Gemini keys, and snapshot profile settings per job. Route Editor and first-party workflow nodes through one broker.
3. Preserve Phase 2 boundaries: project IDs come from the renderer, but folder resolution belongs to Electron/Python's verified registry; the backend must not write `media.json` beside Electron's index writer.
4. Run phase checks through `scripts/with-local-env.ps1`; all caches and temporary state stay under this repository. Avoid model-pack downloads for mock/provider gates. Refresh Graft after code changes.

## Prior checkpoint: Phase 1 baseline and containment

Imported editor and workflow source, license files, local build wrapper, preliminary rounded logo/theme, folder selection and mode switch, and upstream endpoint containment were checkpointed in `df6e295`. Exact upstream source commits are not established because imported copies lack `.git` history. Preserve Apache-2.0 and GPL-3.0 notices. The branded Vue frontend source pinned to engine package `1.55.14` has not yet been imported.
