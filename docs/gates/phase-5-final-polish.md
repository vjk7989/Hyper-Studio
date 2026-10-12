# Phase 5.6 — final dark-default polish and Windows gate

## Identity

- Date / host: 2026-10-12, Windows x64
- Branch: `phase4-platform-gate`
- Scope: dark defaults, first-run and shared-shell form polish, splash handoff timing, and final offline Windows verification

## Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Desktop unit tests | Passed 1,495/1,495 | `.local-cache/final-polish-desktop-tests.log` |
| Editor/migration tests | Passed 2/2 | `.local-cache/final-polish-editor-tests.log` |
| Curated embedded Workflow tests | Passed 173/173 across 17 files | `.local-cache/final-polish-vue-curated.log` |
| Managed Manager catalog | Passed 3/3 | `.local-cache/final-polish-python-tests.log` |
| Typechecks and builds | Desktop TypeScript, Vue TypeScript, React/remote builds, and embedded Vue build passed | `.local-cache/final-polish-*-tsc.log`, `.local-cache/final-polish-*-build.log` |
| Fresh unsigned Windows install | Passed | 431,127,051-byte installer; SHA-256 `311E06BCF80238CBEB56E0CCB0DBFB8F560B203DE57A9F964189B40016F9522E`; Authenticode `NotSigned` |
| First run and project controls | Passed | Dark startup, saved theme behavior, storage/connection choice, focus, folder-picker busy state, rename/remove/reopen/Trash and restart persistence |
| Editor, Workflow, Manager, provider bridge | Passed | All installed smoke scripts passed, including H.264 export, workflow wiring/run/cancel, reviewed local-fixture install/update/uninstall, cross-mode provider/media, and cold reopen |
| Performance | Passed | Fresh installed: 709 ms to first window, 1,149 ms through first-run ready, 15,872 ms first Workflow, ten warm switches 33–51 ms (p95 51 ms); IDs and project isolation preserved. Reload-to-usable median was 369 ms versus 977 ms in the older local artifact; do not attribute the whole difference to the 200 ms splash change. |
| Package hygiene and branding | Passed for shipped trees | 532 embedded files, bridge present, zero source maps, forbidden assets/destinations, or built residual visual filenames. The source audit still classifies 184 non-allowlisted legacy strings, many in compatibility, tests, legal, or unreachable upstream modules; this broader source review remains open. |
| Graft / codebase memory | Refreshed | Graft: 7,114 files, 64,610 nodes, 159,450 edges. Codebase-memory: indexed, 655,222 nodes, 976,899 edges; portable artifact still absent. |

## Failures and fixes

| Failure | Root cause | Fix / disposition |
| --- | --- | --- |
| Older unpacked Workflow timing timed out | The old artifact/runtime pair never enabled the canvas Save action | Discarded as invalid baseline; fresh installed build passed first Workflow and ten-switch checks. |
| Initial Vue typecheck exhausted a 4 GiB heap | Monorepo Vue typecheck memory demand | Reran with an 8 GiB Node heap; passed without diagnostics. |

## Gate decision

- **Windows status:** Passed.
- **Platform status:** Pending GitHub Actions macOS/Linux package smokes for this checkpoint.
- Live hosted providers, model inference, and a real external extension source remain unverified because their credentials, models, or external source were not part of this offline gate.
