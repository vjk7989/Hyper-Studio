# Codebase map

Use this as a navigation index, then use the codebase-memory MCP graph (`search_graph` → `trace_path` → `get_code_snippet`) and Graft for symbol discovery. Paths describe the Phase 2 workspace checkpoint as of 2026-10-10. Check [phase-handoff.md](phase-handoff.md) before assuming a planned interface exists.

| Concern | Start here | Current state and edit boundary |
| --- | --- | --- |
| Desktop build and identity | `apps/desktop/package.json`, `apps/desktop/electron-builder.yml`, `apps/desktop/index.html` | Imported names, installer/signing/updater configuration need audit and replacement. |
| Electron lifecycle | `apps/desktop/electron/main.ts`, `electron/python-setup.ts`, `electron/updater.ts`, `electron/analytics.ts` | Host process and services; review outbound destinations before runtime use. |
| Typed workspace IPC | `apps/desktop/shared/electron-api-schema.ts`, `electron/preload.ts`, `electron/ipc/project-workspace-handlers.ts` | Project open/import, shared-storage setup, media list/import/register/watch, and editor data read/write are exposed. Profile/job/engine/workflow contracts remain pending. |
| App/user data | `apps/desktop/electron/app-paths.ts`, `electron/app-state.ts`, `electron/project-registry.ts` | Private `project_registry.json` binds IDs to canonical folders; `shared_storage.json` stores chosen shared root. Old data paths remain for explicit import. |
| Project folder and containment | `apps/desktop/electron/project-workspace.ts`, `electron/project-workspace.test.ts` | Creates schema-v1 manifest and `.hyper-studio/editor.json`/`media.json`, resolves relative paths without symlinks/traversal, and imports legacy editor data non-destructively. |
| Folder selection and first run | `apps/desktop/frontend/views/Projects.tsx`, `frontend/components/first-run/SharedStorageSetup.tsx`, `frontend/lib/shared-storage-gate.ts` | Choose shared storage once, then project folder and Editor/Workflow starting mode. Python setup waits for shared-storage choice. |
| Project model/storage | `apps/desktop/frontend/types/project-model.ts`, `frontend/contexts/ProjectContext.tsx`, `frontend/lib/workspace-project-data.ts` | Manifest/editor file win on reopen; project-owned media paths become relative in editor data. Renderer listing cache remains; external legacy paths are not automatically portable. |
| Editor/mode shell | `apps/desktop/frontend/App.tsx`, `frontend/views/WorkflowWorkspace.tsx` | Editor and Workflow placeholder share project identity and indexed media. Workflow process/canvas are still absent. |
| Shared media UI | `apps/desktop/frontend/lib/workspace-media.ts`, `frontend/views/Project.tsx`, `frontend/contexts/ProjectContext.tsx` | Scanned assets/outputs appear in Editor and Workflow placeholder; Electron watch polls every 2 seconds and sends changes. |
| Python backend | `apps/desktop/backend/ltx2_server.py`, `backend/app_handler.py`, `backend/_routes/` | Generation/assets API; keep routes thin and delegate to handlers/services. |
| Project output trust | `apps/desktop/backend/services/project_workspace.py`, `electron/project-registry.ts`, `electron/python-backend.ts` | Renderer sends `projectId`; Python verifies host registry and manifest, rejects bad IDs, and derives project `outputs/`. Launcher passes registry/models paths and shared backend data root. |
| Generation output and DB | `apps/desktop/backend/handlers/{video_generation,image_generation,retake,extend,ic_lora,queued_generation}_handler.py`, `backend/services/sqlite_store.py`, `backend/services/schema/0002_project_output_path.sql` | Tagged direct/queued jobs write to project outputs. SQLite `storage_path` stores queued canonical path; untagged legacy rows derive global path. Cross-volume promotion is copy plus atomic publish. |
| Legacy keys | `apps/desktop/backend/state/app_settings.py`, `backend/handlers/settings_handler.py`, `frontend/contexts/AppSettingsContext.tsx` | Legacy settings; import only with confirmation into secure global registry. |
| Workflow process/paths | `services/workflow/main.py`, `comfy/cli_args.py`, `folder_paths.py` | CLI accepts project input/output/user/temp/database and shared model paths. Run on loopback. |
| Workflow API/execution | `services/workflow/server.py`, `execution.py`, `nodes.py` | `/prompt`, `/ws`, `/history`, `/view`, `/userdata`; preserve IDs/JSON compatibility. No hosted networking in core. |
| Canvas source | Pending import matching `1.55.14` | Python requirement includes a prebuilt frontend; editable branded Vue source is absent at snapshot. |
| Desktop visuals | `apps/desktop/resources/`, `public/`, `frontend/assets/`, `frontend/ltx-io/assets/` | Icons, favicon, splash, logos, marketing media need visual inspection. |
| Supplied logo | `assets/logo-original.png`, `assets/logo-rounded.png` | Rounded PNG is a draft; create clean alpha and light/dark/icon variants. |
| Focused verification | `apps/desktop/backend/tests/stdlib_check_project_workspace.py`, `backend/tests/test_store.py`, `electron/project-workspace.test.ts`, `frontend/lib/workspace-*.test.ts` | Registry containment, SQL migration, persistence/reopen/deletion, media and editor-data tests; full Python suite needs LTX runtime. |
| Local build wrapper | `scripts/with-local-env.ps1` | Redirects npm, pnpm, Corepack, uv, pip, HF, torch, Electron, and temp paths into repo. |
| Caches/graphs | `.local-cache/`, `.local-tmp/`, `.tools/`, `graft/` | Ignored local state; Graft CLI under `.tools/graft/node_modules/@nanonets/graft/dist/cli.js`. |
| Decisions/gates | `docs/architecture-decision-record.md`, `phase-handoff.md`, `phase-plan.md`, `phase-gate-template.md` | Update after every passing phase. |

## Target ownership boundary

```
React editor + Vue canvas
       | typed preload/IPC + authenticated local HTTP
Electron host: project, media, profiles, jobs, workflow process
       | project-specific paths and events
Python editor backend       Workflow engine
       \                         /
        project folder: manifest + assets + outputs + workflows + metadata
```

Project/media IPC and the durable media index now run. Profile/job broker, workflow engine lifecycle, and embedded Vue canvas are target architecture for Phases 3 and 4.
