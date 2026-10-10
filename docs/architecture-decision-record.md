# Architecture decision record

This record separates accepted product decisions from verified implementation. It reflects the Phase 2 workspace checkpoint on 2026-10-10; see [phase-handoff.md](phase-handoff.md) and [gates/phase-2.md](gates/phase-2.md) for verification state.

## ADR 0001: Desktop editor as host

- **Status:** Accepted; integration pending.
- **Context:** The imported desktop app has the React video editor, Electron shell, and Python generation backend. The imported workflow engine has execution, with a separately packaged Vue canvas.
- **Decision:** One Electron app owns project selection, navigation, mode switch, provider setup, theme, and window identity. It starts a local workflow process for the active project and embeds a Hyper-Studio-branded Vue canvas in the same window. Editor and Workflow are modes of one project.
- **Consequence:** Workflow is presently a placeholder. The frontend source matching the engine's `comfyui-frontend-package==1.55.14` must be imported, branded, built, and served via `--front-end-root`. The upstream Vue desktop distribution expects its own Electron bridge, so use a localhost build.

## ADR 0002: Global storage and portable projects

- **Status:** Workspace foundation implemented in Phase 2; workflow process paths pending Phase 4.
- **Decision:** First run asks for one shared folder for runtimes, models, caches, and global provider settings. Each project has a chosen folder with a versioned manifest, `assets/`, `outputs/`, `workflows/`, and private metadata. Store media paths relative to the project root and validate containment. Point workflow input/output/user/database/temp paths at the active project and keep large models in shared storage. Route editor generation output to the project too.
- **Reason:** Both modes must see the same media and survive restart or transfer of the folder.
- **Implemented:** Electron creates and validates `.hyper-studio/project.json` (schema version 1) and `media.json`, plus `assets/`, `outputs/`, and `workflows/`; it writes `editor.json` when project data is saved or imported. Paths to project-owned media are stored relative to that folder. A 2-second media scan/watch updates both mode surfaces. The renderer may keep a project listing cache, but the manifest and editor file win on reopen. Legacy import is explicit and leaves source data intact.
- **Storage boundary:** Electron keeps a small private project ID-to-folder registry in user data and passes its path to Python. Python verifies registry and manifest IDs before writing tagged jobs. Generated files use project `outputs/`; a SQLite `storage_path` migration keeps queued asset references valid across restart, while legacy rows keep their prior global location. Cross-volume queued output promotion copies to a temporary file beside the destination and publishes it atomically. The backend app data and in-flight files now point to `<shared storage>/backend`; models point to `<shared storage>/models`.
- **Remaining limit:** Python's queue DB stores absolute project output paths; the portable project media index stores relative paths. Moving a project folder preserves indexed media, but historic queue asset links need a rebind/migration. The runnable workflow engine is not yet pointed at these paths.

## ADR 0003: One credential and job boundary

- **Status:** Accepted; implementation pending.
- **Decision:** Global named provider profiles hold URL, model, and secret references; the renderer receives non-secret metadata only. A broker accepts project/profile/model per job, snapshots submitted configuration, limits concurrency per profile, normalizes state/output, and registers finished media. Provide LTX, Runway, Google Veo, fal.ai video, and mapped Custom HTTP adapters. The same registry powers Editor generation and first-party workflow nodes.
- **Security:** Use a secure local store outside project manifests, workflow JSON, renderer state, and logs. Ask before importing legacy LTX/fal/Gemini credentials. Keep third-party nodes' credential handling separate. A custom URL requires request/auth/output mapping; localhost alone does not imply video generation support.
- **Boundary:** Hosted API calls belong in the desktop integration boundary. The imported workflow engine's `AGENTS.md` bars outbound internet behavior in its core.
- **Current gap:** The desktop still has provider-specific settings and legacy key persistence; no shared profile registry or broker exists.

## ADR 0004: Rebrand surface without breaking workflows

- **Status:** Accepted; rebrand pending.
- **Decision:** Replace shipped product identity, logos, installer/window text, app-owned links, and user-facing strings with Hyper-Studio. Keep provider/model names when describing a selected model, internal node class names, workflow schema fields, and `Comfy.*` setting IDs where renaming would break imported workflows. Retain upstream attribution and licenses in a legal section.
- **Theme:** Map the supplied Vercel registry theme's monochrome light/dark colors, Geist typography, and `0.5rem` radius into the existing React and Vue design systems. Do not add another component framework.
- **Containment:** Disable upstream telemetry and auto-update destinations, signing credentials, and upstream-only support/download links before shipping. Re-enable only with owned infrastructure.
- **Current gap:** The rounded mark is preliminary. Many visual and text fingerprints remain; visual inspection is needed in addition to text scans.

## ADR 0005: Repository-local builds and phase gates

- **Status:** Accepted; Phase 1 baseline committed as `df6e295`, Phase 2 workspace checks recorded.
- **Decision:** Run installs, caches, temp files, model downloads, and builds within this repository using `scripts/with-local-env.ps1`. Keep generated caches ignored. Do not download model packs for baseline verification. Run relevant tests, type checks, and builds after each phase, repair failures before proceeding, and update this record, handoff, code map, and Graft graph.
- **Consequence:** Windows is the current local verification host. The full Python test suite requires a large LTX inference environment absent here; Phase 2 instead ran isolated store and workspace/migration tests. macOS and Linux packages still require builds and smoke tests on those platforms before the release gate can pass.

## ADR 0006: Trust boundary for project output routing

- **Status:** Implemented for current Editor generation routes in Phase 2.
- **Decision:** Renderer requests carry only `projectId`. Electron main creates a private registry and gives its path to Python through `HYPER_STUDIO_PROJECT_REGISTRY`. Python resolves a tagged request only when the registry entry and `.hyper-studio/project.json` agree, and ensures `outputs/` remains inside the selected project. Unknown or invalid IDs fail with 422. Untagged legacy requests retain their old output path.
- **Scope:** Direct video/image/retake/extend/IC-LoRA routes and queued video features accept `projectId`. The desktop media scanner registers completed files in the relative project index. The backend does not write `media.json`, avoiding two writers for one JSON file.
- **Consequence:** The global SQLite queue remains for job history while generated files live in project folders. The current watcher polls every 2 seconds; live UI updates can lag by that interval. The provider job broker remains Phase 3 work.

## Imported source provenance and licenses

| Component | Imported path | Identity visible in source | License in imported tree | Provenance limit |
| --- | --- | --- | --- | --- |
| Desktop editor | `apps/desktop/` | Lightricks/LTX-Desktop; `package.json` version `1.3.0`, pnpm `10.30.3` | `apps/desktop/LICENSE`: Apache License 2.0 | Local source copy has no `.git`; exact upstream commit/tag is not established. |
| Workflow engine | `services/workflow/` | comfyanonymous/ComfyUI; `pyproject.toml` version `0.39.0` | `services/workflow/LICENSE`: GNU GPL v3 | Local source copy has no `.git`; exact upstream commit/tag is not established. |
| Workflow canvas | Not imported as editable source at this snapshot | Engine requirement pins `comfyui-frontend-package==1.55.14` | Verify and retain the frontend source license during import | Record its exact source URL and commit/tag before incorporating it. |

The imported source and license files do not establish that its existing branded binaries, signing, telemetry, or external destinations are suitable for Hyper-Studio. Preserve license and notice files in release artifacts and review obligations before release.
