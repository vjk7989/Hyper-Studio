# Hyper-Studio workflow canvas source

This is a sparse source snapshot of the official [ComfyUI frontend](https://github.com/Comfy-Org/ComfyUI_frontend) release [`v1.55.14`](https://github.com/Comfy-Org/ComfyUI_frontend/releases/tag/v1.55.14), commit `3ac95778a0be903c9c9ed7682c811ecd6da02f0e`. It matches the workflow engine's `comfyui-frontend-package==1.55.14` requirement. The upstream `LICENSE` is GPL-3.0-only; `THIRD_PARTY_NOTICES.md` is preserved. Keep both in source and release attribution. Internal `Comfy.*` setting IDs, node IDs, and workflow JSON fields remain compatible.

The snapshot includes root build files, `src/`, `public/`, `packages/`, `scripts/`, `tools/`, `build/`, `comfyui_frontend_package/`, `docs/guidance/`, and `browser_tests/fixtures/` (referenced by source tests during type checking). Upstream app packages, stories, other browser fixtures, and docs outside `docs/guidance/` were omitted because the localhost canvas build does not require them. Recreate the selection with `git sparse-checkout set src public packages scripts tools build comfyui_frontend_package docs/guidance browser_tests/fixtures` at the pinned tag.

## Build on Windows

From the repository root:

```powershell
.\apps\workflow-ui\scripts\setup-hyper-studio.ps1
.\apps\workflow-ui\scripts\build-hyper-studio.ps1
```

The setup script installs pinned Node `v26.8.2` and pnpm `11.13.1` under `.tools/`, verifies the Node archive SHA-256, and uses `scripts/with-local-env.ps1` for every dependency and build cache. No model pack is downloaded. `build-hyper-studio.ps1` compiles the localhost distribution with `VITE_HYPER_STUDIO_EMBEDDED=true` into `apps/workflow-ui/dist/`. Pass that absolute `dist/` directory to the managed workflow engine's `--front-end-root`. Both `node_modules/` and `dist/` are generated, ignored state.

The embedded build keeps the canvas, workflow tabs, sidebar tools, queue controls, and imported workflow identifiers. Hyper-Studio's Electron shell owns the outer header, settings, account state, mode switch, and theme. Embedded mode hides the separate menu/logo, account and cloud promotions, feedback/help entry points, and onboarding overlays. It does not by itself launch the workflow engine or connect project media; those are desktop integration responsibilities.

The source snapshot preserves upstream technical identifiers and bundled assets for compatibility. A separate release audit must inspect remaining translated copy, logos inside optional dialogs or extensions, and visual assets before claiming a complete surface rebrand.
