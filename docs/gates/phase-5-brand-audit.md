# Phase 5 surface-brand audit (Windows checkpoint)

Status: **open**. This is a reproducible checkpoint, not a release pass. Phase 5 source fixes are committed through `7290c2f`; the final installed Windows gate and new macOS/Linux package gates are pending. Run
`scripts/with-local-env.ps1 .tools/node-v26.8.2-win-x64/node.exe scripts/audit-branding.mjs`
from the repository root after every fresh UI build/package. The full machine
inventory stays in `.local-cache/brand-audit/audit.json`; it is not committed.

## Current Phase 5 evidence (2026-10-10)

| Gate | Evidence | Status |
| --- | --- | --- |
| Read-only tracked-source and built-tree audit | 21:04 local `.local-cache/phase5-final-brand-audit-diagnostic.log`: 232 source matches, 178 unallowlisted review candidates, 253 tracked visuals, zero residual legacy visual filenames in tracked source and three built trees (Vue dist, Windows workflow frontend, Windows remote UI). | **Diagnostic only.** It predates the latest Vue build/package; string matches require contextual review and media frames require visual inspection. |
| Managed cloud policy | 10 focused Python tests passed; 65 upstream compatibility tests passed with 2 skipped; 8 provider-adapter and 8 server/CSP tests passed. | Source-level pass. Live hosted API/network behavior is not proven. |
| Embedded account and node-pack unit tests | Five-file account suite: 79/79 passed. Two-file local catalog/pack suite: 32/32 passed. Direct Vue typecheck (`node_modules/.bin/vue-tsc --noEmit -p tsconfig.hyper-studio.json`) and latest embedded Vue build passed. | Focused pass. A later `useSettingUI.ts` filter was added after the first installed settings diagnostic; its final package behavior is pending. |
| Windows package diagnostics | An earlier installed smoke passed canvas, JSON roundtrip, bidirectional media, and observed no account button or upstream Comfy/LTX request. Compatibility diagnostic retained IDs 37, 90909, and 91001; missing-node guidance and explicit source-review confirmation were visible, and task submission was intercepted before download. | Partial pass. The first settings diagnostic failed on an inherited `user` category; recheck a fresh installed build after the source filter. |
| New platform packages | `.github/workflows/phase-4-platform-gate.yml` now includes Phase 5 catalog, account, typecheck, and brand checks. | **Pending** new macOS arm64 and Linux x64 run; the prior Phase 4 run is not Phase 5 evidence. |

No model packs or live hosted credentials were used. The current checks do not prove a completed third-party node install, account-free behavior in every optional overlay, or all frame/theme/icon states.

## Scope and exact exceptions

The script reads tracked desktop and workflow source/assets with `git ls-files`,
then independently scans the Vue dist and current Windows `win-unpacked` UI
trees. It scans locale **values**, not translation keys, and excludes tests and
fixtures. Each exception is constrained by path and line pattern in the script:

| Exception | Reason |
| --- | --- |
| `provider-model-catalog`, `model-license-fetch`, `ltx-provider-endpoint` | LTX model publisher, license, and live adapter URL are provider facts. |
| `legal-attribution`, `workflow-legal-attribution` | The About section must identify upstream licensed sources. |
| `workflow-compatibility-schema`, `workflow-manager-package`, `workflow-database-path`, `workflow-node-path-examples` | Imported workflow IDs, generated API types, manager package, old database path, and developer examples are technical compatibility data. |
| `legacy-link-fallback` | Source-only paths for the standalone upstream mode; their absence from the embedded UI must still be verified in packaged output. |

An unallowlisted hit is a **review candidate**, not proof of visible branding.
Internal CSS classes, store/type names, upstream provider labels, and inactive
cloud code can match. Conversely, bitmap/video branding requires visual review.

## Historical packaged Windows scan and fixes

The 2026-10-10 scan of a `win-unpacked` UI tree built at approximately 19:32
found 300 tracked-source string/URL matches, 249 review candidates, and 253
tracked visual assets. The packed workflow frontend still contained six old
`comfy-*` asset **filenames**. The tracked source files with those names were
removed, and later clean local builds reached zero residual legacy visual filenames
in the three available built trees. The latest build/package still needs a fresh audit.

**Former visible blocker:** `apps/workflow-ui/public/assets/images/og-image.png`
(269,193 bytes) visibly says “Comfy CLOUD” and “Run ComfyUI anywhere.” The same
image was present in Vue dist and the packaged Windows frontend. It is referenced
by `src/renderer/extensions/firstRunTour/nudge/FirstRunTourNudge.vue`. The
embedded first-run entry appears disabled. The asset was replaced in `b95d6b3`;
its final package appearance must still be checked.

The earlier bundled `cloud-subscription.webm` remained in Vue dist and Windows package.
A representative frame at one second showed a cloud/old-monitor scene with no
visible upstream wordmark. It is cloud-promotion media, so release review should
confirm the related subscription components cannot be reached in embedded mode
or exclude the video. References were removed in `f029ad0`; the desktop splash video frame and representative mode,
template, partner-node, and favicon images inspected at one second/static state
showed no visible upstream mark. These spot checks do not prove every frame or
light/dark/installer state is clean.

## Source candidates and disposition

- Desktop production CSP no longer permits the upstream account origin (`be1dbdf`). Embedded help links and first-run destinations were rerouted or hidden (`8c4b1d6`), while manager package and workflow compatibility IDs remain.
- Embedded account/login/billing dialogs, user route, cloud promotion, templates, and settings panels were removed from the active path (`1471b1a` through `01047cd`). Source-only upstream strings can remain in dormant compatibility code and legal attribution; a final installed navigation/network check must show they are unreachable.
- The last local packaged smoke observed no account button or upstream Comfy/LTX request. The first settings diagnostic nevertheless found `user`; the `useSettingUI.ts` filter added afterward must be checked against a newly installed package. Do not infer a pass from the unit test alone.

## Managed workflow engine boundary

All 43 built-in `services/workflow/comfy_api_nodes/nodes_*.py` partner modules
use the upstream Comfy account proxy, including upstream LTX, Runway, and Veo
nodes. In a managed project (`HYPER_STUDIO_PROJECT_ID`), none is registered.
Imported node identifiers remain untouched in workflow JSON and therefore
appear as missing nodes. `hyper_studio_nodes.py` is loaded separately and still
registers `HyperStudioGenerateVideo`; local and third-party nodes remain allowed.
The shared request/download/upload helpers reject relative account-proxy URLs
and explicit `comfy.org` hosts before creating a network session. Connectivity
diagnostics skip the upstream Comfy health probe in managed projects, and the
engine's managed-response CSP omits the upstream origin even when offline mode
is unset. Outside managed projects, the
upstream modules remain available for compatibility.

Focused Python checks: **10 passed**. Existing upstream compatibility checks:
**65 passed, 2 skipped**. Desktop provider adapter checks: **8 passed**,
including LTX submit/poll. Server/CSP checks: **8 passed**. Full logs are in
`.local-cache/phase5-cloud-policy-tests.log` and
`.local-cache/phase5-upstream-compat-tests.log` and
`.local-cache/phase5-provider-adapter-tests.log` and
`.local-cache/phase5-server-csp-tests.log`. These are mocked provider
flows; no live provider credentials or model packs were used.

## Remaining release checks

Rebuild/reinstall the latest Windows package, rerun the read-only audit, and
pass the installed settings/account/compatibility smoke. Record the exact
installer path, commit, commands, exit statuses, logs, and screenshots. Inspect
light and dark UI states, rounded logo contrast, template gallery, node-pack
review flow, network silence, and installer/window/OS icons. Run equivalent
fresh macOS arm64 and Linux x64 package gates, keeping temp and caches inside
the repository. Audit assets and locale values contextually; zero old filenames
is not a complete visual or behavioral proof. Phase 5 stays open until these
checks pass and their limits are recorded.
