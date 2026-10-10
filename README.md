# Hyper-Studio

Hyper-Studio is a desktop video editor and node workflow studio under active integration. This repository imports the Electron/React editor under `apps/desktop` and the Python workflow engine under `services/workflow`. The current editor includes a project-folder picker and an Editor/Workflow mode switch; the Workflow canvas and shared project/provider services are still being integrated. Do not treat the current Workflow placeholder as a working engine.

## Working agreement

- Build only the requested workflow, in small phases, following YAGNI.
- Keep dependency downloads, temporary files, caches, and build outputs inside this repository.
- Use [Graft](https://github.com/trailhq/Graft) for a local, regenerable code graph as application code is added.
- Verify each phase before starting the next. Record decisions, implementation status, and file locations in `docs/`.

## Development

Run package commands through `scripts/with-local-env.ps1` so caches and temporary files stay inside this repository. For example, from `apps/desktop`:

```powershell
..\..\scripts\with-local-env.ps1 corepack pnpm scripts:test
..\..\scripts\with-local-env.ps1 corepack pnpm typecheck:ts
..\..\scripts\with-local-env.ps1 corepack pnpm build:frontend
```

The workflow engine is imported source. Large model weights are not included and must not be downloaded during the baseline build.

## Brand assets

- `assets/logo-original.png` is the supplied source logo.
- `assets/logo-rounded.png` is the current rounded-edge variant for the application. Light and dark production assets are pending.

## Local project notes

See `docs/phase-plan.md`, `docs/architecture-decision-record.md`, `docs/phase-handoff.md`, and `docs/codebase-map.md` for the phased work and current boundaries. Upstream licenses are retained in each imported source tree.
