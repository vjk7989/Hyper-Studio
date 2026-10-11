# Phase 5.4a Editor interaction gate report

## Current result

- **Installed checks against current source:** pending Windows Actions package. No current-source control defect was reproduced locally.
- **Smoke additions:** six persisted/UI checks for imported asset drag, clip movement, Blade split, Selection shortcut with right-edge trim, trim Undo/Redo, save-dialog cancellation, and H.264 MP4 rendering with `ftyp`/`moov` atom checks. These new assertions have not yet run against a current installed package.
- **Earlier installed evidence:** the pre-Phase-5.1 final5 binary is stale. Its Undo-after-mode-toggle failure is excluded from this gate. The prior Editor control smoke had reached 10 checks before that stale failure. The root Windows run `38125371341` passed current Undo/focus behavior.

## Commands and results

| Command | Result |
| --- | --- |
| `./scripts/with-local-env.ps1 node --check scripts/smoke-editor-controls.mjs` | Pass |
| `./scripts/with-local-env.ps1 node --experimental-loader ./apps/desktop/frontend/views/editor/editor-test-loader.mjs --test apps/desktop/frontend/views/editor/editor-actions.test.mjs` | 1 pass, 0 fail |
| `./scripts/with-local-env.ps1 node apps/desktop/node_modules/typescript/bin/tsc --noEmit --project apps/desktop/tsconfig.json` | Blocked: native Windows exit `-1073741571` before diagnostics |
| `./scripts/with-local-env.ps1 node apps/desktop/node_modules/vite/bin/vite.js build` (from `apps/desktop`) | Blocked: Node `Fatal process out of memory: Zone` during transform; exit `-2147483645` |
| `git diff --check -- scripts/smoke-editor-controls.mjs` | Pass |

Full local build log: `.local-tmp/editor-current-build.log`. The direct Vite crash output was kept in the tool transcript; the same crash prevents creating a fresh unpacked package on this host. Repo-local Corepack's pnpm cache was also missing when rerun, so direct Node entry points were used for diagnosis.

## Changed files

- `scripts/smoke-editor-controls.mjs`: make onboarding skip optional for compatible binary probing; add bounded Editor gesture and local video export assertions. No desktop source file was changed.
- This report.

## Remaining limits

- The new gesture/export assertions need execution on the current installed Windows build. A green script run should produce `.local-tmp/editor-controls-*/results.json`, `editor-local-render.mp4`, and screenshots; a failed run writes `failure.png` and a failing result.
- Render atom checks establish a nonempty MP4 container; full audiovisual decode is not checked here.
- The save-dialog cancellation check does not interrupt an active ffmpeg process. In-progress export cancellation and native error recovery remain untested.
- Slip, slide, ripple, roll, multitrack link behavior, and model-backed output remain untested.
