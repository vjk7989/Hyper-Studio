# Phase 3 gate: one provider setup and job broker

## Identity and scope

- **Date / host:** 2026-10-10, Windows x64, `G:\Hyper-Studio\Hyper-Studio`.
- **Base:** Phase 2 checkpoint `137b2f5`; the Phase 3 checkpoint follows this report.
- **Checked:** Encrypted named profiles, legacy key-write containment and confirmed import, LTX/Runway/Veo/fal.ai/Custom HTTP adapters, normalized project jobs, loopback first-party workflow node, profile/model UI, and desktop build.
- **Outside this gate:** Live provider access, workflow engine/canvas integration, model-backed local inference, installers, and macOS/Linux smoke tests.

## Checks

| Check | Command or method | Result | Evidence / limit |
| --- | --- | --- | --- |
| Desktop script tests | From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm scripts:test` | **Passed** | 1,442/1,442 on the final Phase 3 tree, including vault, adapter, broker, schema, and frontend tests. |
| TypeScript | From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm typecheck:ts` | **Passed** | Exit 0. |
| Frontend/Electron build | From `apps/desktop`: `..\..\scripts\with-local-env.ps1 corepack pnpm build:frontend` | **Passed** | Exit 0; includes desktop frontend, Electron main/preload, and remote Vite build. Installer build was not run. |
| Python key safety | From `apps/desktop/backend`: `..\..\..\scripts\with-local-env.ps1 python -m unittest tests.test_provider_key_safety_isolated -v` | **Passed** | 3/3; old provider key fields are removed from new settings writes. |
| First-party workflow node | From repo root: `.\scripts\with-local-env.ps1 python services/workflow/tests-unit/test_hyper_studio_nodes_stdlib.py` | **Passed** | 5/5; node request, validation, and secret-safe error behavior without installing workflow inference dependencies. This does not execute a managed workflow graph. |
| Mocked broker | From `apps/desktop`: `..\..\scripts\with-local-env.ps1 node --experimental-strip-types --test --test-reporter=spec electron/provider-jobs/broker.test.ts electron/provider-jobs/adapters.test.ts` | **Passed** | 20/20 mocked cases, including submit/poll/failure/local cancel, output registration, polling deadline, and output-host checks. The full desktop script suite also includes these tests. |
| Graft graph | From repo root: `.\scripts\with-local-env.ps1 node .tools\graft\node_modules\@nanonets\graft\dist\cli.js build .` then `map --max-dirs 12` | **Passed** | Final Phase 3 refresh: 2,294 files, 33,554 wiring nodes, 75,833 edges, 2,294 cards; 7 parsed and 2,287 replayed from cache. `graft/` is ignored local state. |
| Live hosted API | Not run | **Unverified** | No real LTX, Runway, Veo, fal.ai, or custom endpoint credential smoke. Mocked requests cannot prove provider acceptance. |
| Full backend pytest | Not completed | **Unverified** | Full LTX/Torch inference dependencies are absent; Phase 2 collection failed on `ltx_core`. No model packs were downloaded for this gate. |

## Behavior and limits

- The vault returns metadata without keys; API keys are stored encrypted and legacy imports require an explicit confirmation. Changing a saved profile's provider or base URL clears its old key unless a replacement is supplied, and the UI warns before save. Custom submit/poll paths reject query parameters so literal credentials cannot be stored in plaintext metadata. On systems without usable OS encryption, a passphrase of at least 12 characters initializes/unlocks the vault. The settings “Check configuration” action validates shape, not live authenticated connectivity.
- Broker jobs snapshot profile configuration on submit, allow different profiles to run concurrently, cap each profile at two active jobs, and register successful outputs in the active project's media index. The broker state is memory-only, so in-flight job recovery after app restart remains pending.
- Output downloads validate every resolved address, pin the chosen address for the connection, and revalidate redirects; public-to-private redirects and DNS rebinding are rejected. Polling has a one-hour default deadline.
- The composer is available in Editor, Workflow placeholder, and Home text-to-video. It accepts a selected profile and per-job model ID. Specialized image/audio-to-video and edit forms continue through project-scoped local Python paths and do not yet expose arbitrary hosted provider selection.
- “Stop tracking” aborts local polling/download. Some provider jobs may continue remotely because the broker does not invoke every provider's remote cancel endpoint. Remote cancellation requires provider-specific implementation and verification.
- Custom HTTP profiles map authentication, request fields, and direct or asynchronous response fields. Local image uploads and image-to-video request paths remain to be smoke-tested, especially for hosted providers.
- First-party workflow nodes and their authenticated loopback bridge are present, but the desktop does not yet launch/embed the workflow engine and Vue canvas. No cross-mode workflow generation acceptance is claimed.

## Gate decision

**Phase 3 code-level checkpoint passed** on the listed Windows checks. Phase 4 may proceed from this boundary. Full product acceptance remains open until live API smoke, local upload handling, job restart recovery, remote cancellation semantics, managed workflow integration, full backend pytest, and release packaging are checked. Preserve the Phase 2 project registry and relative media-index boundaries while extending the broker.
