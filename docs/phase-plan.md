# Hyper-Studio implementation plan

Follow [architecture-decision-record.md](architecture-decision-record.md). A phase advances only after its recorded checks pass. Keep all downloads and build state in this repository; do not download model packs to test the baseline.

## Phase 0 — Baseline and containment

1. Import the desktop and workflow source with license/notice files and record provenance. The local copies lack `.git`; identify exact upstream revisions when available.
2. Review and checkpoint the existing folder picker, Editor/Workflow switch, placeholder, logo, and theme slice.
3. Disable existing LTX telemetry, updater, signing configuration, upstream runtime downloads, and app-owned support/issue destinations until Hyper-Studio services exist. Preserve old data locations read-only for migration.
4. Re-run desktop script tests, TypeScript check, and frontend/Electron build through `scripts/with-local-env.ps1`. Record command, result, and platform in a gate report before commit.

## Phase 1 — One project workspace

1. Define versioned manifest with project ID, defaults, relative media refs, and schema migration. Create `assets/`, `outputs/`, `workflows/`, and private metadata under selected folder. Validate relative paths, symlinks, and traversal.
2. Add typed `projects.open/importLegacy` and `media.list/import/register/watch`. Persist a durable media index per project and emit changes to both modes. Do not rely on renderer localStorage as source of truth.
3. Route editor imports and generation output into the active project, preserve a read-only legacy path, and offer non-destructive project import. Point workflow input/output/user/database/temp to the project; models remain global.
4. Gate: path containment, restart/reopen, legacy migration, media visible across modes, and no failure in previous checks.

## Phase 2 — One provider setup and job broker

1. Add secure global named profiles with non-secret renderer metadata, per-project default, per-job model choice, key import confirmation, and `profiles.list/upsert/delete/test` plus `models.list`.
2. Add `jobs.submit/get/subscribe/cancel`; snapshot profile settings at submit, normalize progress/errors/output, run distinct profiles concurrently with per-profile cap, register output in media index.
3. Implement LTX, Runway, Google Veo, fal.ai video, and Custom HTTP adapters. Custom profile maps URL, model ID, authentication/headers, request fields, and direct or asynchronous job/poll/status/output fields. Use validated URLs and redact secrets from errors/logs.
4. Expose the same broker to first-party workflow nodes through a narrow authenticated localhost integration. Preserve third-party node compatibility.
5. Gate: mocked submit/poll/failure/cancel, key redaction, hosted and localhost URLs, simultaneous distinct profiles, and model switching without re-entering keys.

## Phase 3 — Integrated workflow canvas

1. Import Vue frontend source matching engine `1.55.14`, record its exact provenance/license, produce branded localhost build, and serve with `--front-end-root`.
2. Make Electron own the common shell; embed canvas, hide separate workflow app shell/cloud promotion, and keep project/mode/settings/theme in sync. Manage workflow process lifecycle and loopback port for active project.
3. Add `engine.start/status/stop` and `workflow.open/save/import/export`. Preserve imported workflow node IDs and JSON fields. Present missing third-party nodes with a reviewed install action.
4. Gate: run a workflow, show its output in Editor, show Editor media in Workflow, and switch modes while jobs continue.

## Phase 4 — Complete surface rebrand and release

1. Generate clean rounded light/dark mark and all OS/installer/favicons. Apply shared Vercel theme tokens to React and Vue without replacing their component systems.
2. Audit all shipped strings, logos, loader, splash/video frames, About/legal presentation, links, empty/error/loading states, OS icons, installer text, and translated user-facing copy. Allow technical provider/model names, compatibility identifiers, and required legal notices only.
3. Produce automated string/asset scan and manual light/dark screenshots. Build and smoke-test Windows, macOS, Linux packages. Update legal notices, architecture record, handoff, code map, and Graft graph.
4. Gate: one install, one shared storage choice, chosen project folder, each profile entered once, model selected per job in both modes, output visible in both modes, and no old product branding in app-owned surfaces.

## Public contract checklist

| Interface | Required operations |
| --- | --- |
| Projects/media | `projects.open/importLegacy`, `media.list/import/register/watch` |
| Provider setup | `profiles.list/upsert/delete/test`, `models.list` |
| Jobs | `jobs.submit/get/subscribe/cancel` with `projectId`, `profileId`, `modelId`, prompt, inputs, options |
| Workflow | `engine.start/status/stop`, `workflow.open/save/import/export` |

These are target contracts. Their presence in this document does not mean they are implemented.
