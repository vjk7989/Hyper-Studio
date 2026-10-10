# Codebase map

Use this as a navigation index, then use the codebase-memory MCP graph (`search_graph` → `trace_path` → `get_code_snippet`) and Graft for symbol discovery. Paths describe the imported source and local UI slice as of 2026-10-10. Check [phase-handoff.md](phase-handoff.md) before assuming a planned interface exists.

| Concern | Start here | Current state and edit boundary |
| --- | --- | --- |
| Desktop build and identity | `apps/desktop/package.json`, `apps/desktop/electron-builder.yml`, `apps/desktop/index.html` | Imported names, installer/signing/updater configuration need audit and replacement. |
| Electron lifecycle | `apps/desktop/electron/main.ts`, `electron/python-setup.ts`, `electron/updater.ts`, `electron/analytics.ts` | Host process and services; review outbound destinations before runtime use. |
| Typed IPC | `apps/desktop/shared/electron-api-schema.ts`, `electron/preload.ts`, `electron/ipc/` | Add project, media, profile, job, engine, workflow contracts through preload. |
| App/user data | `apps/desktop/electron/app-paths.ts`, `electron/app-state.ts` | App state maps project IDs to folders; old Downloads assets path and user-data identity need migration. |
| Folder selection/import | `apps/desktop/electron/ipc/file-handlers.ts`, `frontend/views/Projects.tsx` | Local slice picks project folder and mode; imported assets can enter `assets/`. |
| Project model/storage | `apps/desktop/frontend/types/project-model.ts`, `frontend/contexts/ProjectContext.tsx`, `frontend/lib/project-storage.ts` | Current project data is in renderer `localStorage`; move to manifest with safe legacy import. |
| Editor/mode shell | `apps/desktop/frontend/App.tsx`, `frontend/views/WorkflowWorkspace.tsx` | Editor exists; Workflow is a placeholder. Host should own common navigation/settings/theme. |
| Editor media UI | `apps/desktop/frontend/components/`, `frontend/lib/backend.ts` | Existing asset/timeline views call backend through `backendFetch`; connect to media index. |
| Python backend | `apps/desktop/backend/ltx2_server.py`, `backend/app_handler.py`, `backend/_routes/` | Generation/assets API; keep routes thin and delegate to handlers/services. |
| Output and DB | `apps/desktop/backend/handlers/video_generation_handler.py`, `backend/services/sqlite_store.py` | `_make_output_path` and global asset DB are key project-storage changes. |
| Legacy keys | `apps/desktop/backend/state/app_settings.py`, `backend/handlers/settings_handler.py`, `frontend/contexts/AppSettingsContext.tsx` | Legacy settings; import only with confirmation into secure global registry. |
| Workflow process/paths | `services/workflow/main.py`, `comfy/cli_args.py`, `folder_paths.py` | CLI accepts project input/output/user/temp/database and shared model paths. Run on loopback. |
| Workflow API/execution | `services/workflow/server.py`, `execution.py`, `nodes.py` | `/prompt`, `/ws`, `/history`, `/view`, `/userdata`; preserve IDs/JSON compatibility. No hosted networking in core. |
| Canvas source | Pending import matching `1.55.14` | Python requirement includes a prebuilt frontend; editable branded Vue source is absent at snapshot. |
| Desktop visuals | `apps/desktop/resources/`, `public/`, `frontend/assets/`, `frontend/ltx-io/assets/` | Icons, favicon, splash, logos, marketing media need visual inspection. |
| Supplied logo | `assets/logo-original.png`, `assets/logo-rounded.png` | Rounded PNG is a draft; create clean alpha and light/dark/icon variants. |
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

This is the accepted target, not a claim that shared IPC, broker, canvas, or media index already runs.
