# Architecture decision record

This record separates accepted product decisions from work awaiting a phase gate. It reflects the imported source and local UI slice on 2026-10-10; see [phase-handoff.md](phase-handoff.md) for verification state.

## ADR 0001: Desktop editor as host

- **Status:** Accepted; integration pending.
- **Context:** The imported desktop app has the React video editor, Electron shell, and Python generation backend. The imported workflow engine has execution, with a separately packaged Vue canvas.
- **Decision:** One Electron app owns project selection, navigation, mode switch, provider setup, theme, and window identity. It starts a local workflow process for the active project and embeds a Hyper-Studio-branded Vue canvas in the same window. Editor and Workflow are modes of one project.
- **Consequence:** Workflow is presently a placeholder. The frontend source matching the engine's `comfyui-frontend-package==1.55.14` must be imported, branded, built, and served via `--front-end-root`. The upstream Vue desktop distribution expects its own Electron bridge, so use a localhost build.

## ADR 0002: Global storage and portable projects

- **Status:** Accepted; durable storage pending.
- **Decision:** First run asks for one shared folder for runtimes, models, caches, and global provider settings. Each project has a chosen folder with a versioned manifest, `assets/`, `outputs/`, `workflows/`, and private metadata. Store media paths relative to the project root and validate containment. Point workflow input/output/user/database/temp paths at the active project and keep large models in shared storage. Route editor generation output to the project too.
- **Reason:** Both modes must see the same media and survive restart or transfer of the folder.
- **Current gap:** The local UI slice records a selected folder and can copy imported assets to `assets/`. Project content remains in renderer `localStorage`, generation output and the asset DB remain global, and a durable shared media index does not exist. A folder picker alone does not satisfy this decision.

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

- **Status:** Accepted; Phase 0 gate in progress.
- **Decision:** Run installs, caches, temp files, model downloads, and builds within this repository using `scripts/with-local-env.ps1`. Keep generated caches ignored. Do not download model packs for baseline verification. Run relevant tests, type checks, and builds after each phase, repair failures before proceeding, and update this record, handoff, code map, and Graft graph.
- **Consequence:** Windows is the current local verification host. macOS and Linux packages require builds and smoke tests on those platforms before the release gate can pass.

## Imported source provenance and licenses

| Component | Imported path | Identity visible in source | License in imported tree | Provenance limit |
| --- | --- | --- | --- | --- |
| Desktop editor | `apps/desktop/` | Lightricks/LTX-Desktop; `package.json` version `1.3.0`, pnpm `10.30.3` | `apps/desktop/LICENSE`: Apache License 2.0 | Local source copy has no `.git`; exact upstream commit/tag is not established. |
| Workflow engine | `services/workflow/` | comfyanonymous/ComfyUI; `pyproject.toml` version `0.39.0` | `services/workflow/LICENSE`: GNU GPL v3 | Local source copy has no `.git`; exact upstream commit/tag is not established. |
| Workflow canvas | Not imported as editable source at this snapshot | Engine requirement pins `comfyui-frontend-package==1.55.14` | Verify and retain the frontend source license during import | Record its exact source URL and commit/tag before incorporating it. |

The imported source and license files do not establish that its existing branded binaries, signing, telemetry, or external destinations are suitable for Hyper-Studio. Preserve license and notice files in release artifacts and review obligations before release.
