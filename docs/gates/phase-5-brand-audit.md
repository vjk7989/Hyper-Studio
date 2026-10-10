# Phase 5 surface-brand audit (scoped package gates passed)

Status: **latest Windows installed and macOS/Linux packaged brand gates passed; Phase 5 release review remains open**. The final4 Windows installer includes export and embedded-bundle fixes (`5360748`, `9370589`, `c9c0633`, `0c3125a`). Both platform jobs succeeded in [run 38067616426](https://github.com/vjk7989/Hyper-Studio/actions/runs/38067616426). Run
`scripts/with-local-env.ps1 .tools/node-v26.8.2-win-x64/node.exe scripts/audit-branding.mjs`
from the repository root after every fresh UI build/package. The full machine
inventory stays in `.local-cache/brand-audit/audit.json`; it is not committed.

## Current Phase 5 evidence (2026-10-10)

| Gate | Evidence | Status |
| --- | --- | --- |
| Read-only tracked-source and built-tree audit | Final `.local-cache/phase5-brand-audit-final4.log`: 232 source matches, 178 unallowlisted review candidates, 253 tracked visuals, zero residual legacy visual filenames in tracked source and three built trees (Vue dist, Windows workflow frontend, Windows remote UI). | **Latest filename inventory passed.** String candidates and media frames require contextual inspection. |
| Managed cloud policy | 10 focused Python tests passed; 65 upstream compatibility tests passed with 2 skipped; 8 provider-adapter and 8 server/CSP tests passed. | Source-level pass. Live hosted API/network behavior is not proven. |
| Embedded account and node-pack unit tests | Five-file account suite: 79/79 passed. Two-file local catalog/pack suite: 32/32 passed. Embedded Settings branding/search/contrast source fixes passed 56 focused tests, scoped Vue typecheck, lint, and embedded build. | Focused source pass; installed Windows Settings assertions below passed. |
| Final4 Windows NSIS and installed smoke | `apps/desktop/release/Hyper-Studio-Setup.exe`: 409,469,651 bytes, SHA-256 `357C23E700954742FEE7F9C2A2E1EC6EA7A17FF809B3D5F933F53A89D2354A69`, Authenticode `NotSigned`. Fresh repo-local install `.local-tmp/installed-phase5-final4` passed cold-start Workflow canvas, JSON roundtrip, bidirectional usable media, Hyper-Studio Settings category, account/pricing absence, dark “Nodes 2.0” heading contrast ≥3:1, and no observed upstream Comfy/LTX cloud request. | **Latest Windows checkpoint passed.** Evidence: `.local-cache/phase5-windows-installed-smoke-final4-cold2.log` and `.local-tmp/packaged-electron-smoke-final4-cold2/`. |
| Workflow compatibility and reviewed queue | Final4 compatibility retry: three imported variants preserved JSON, core/third-party node IDs and links. IDs 37, 90909, and removed cloud node 91001 stayed in imported JSON; missing-node guidance appeared. Explicit third-party source review opened, and the correct install task was intercepted after confirmation but before download. | **Latest Windows compatibility checkpoint passed.** Log: `.local-cache/phase5-windows-installed-compat-final4-retry.log`. A completed third-party package download/install remains unverified. |
| Latest export branding and embedded account bundle | `5360748` changes PSD export names; `9370589` brands embedded error reports. `c9c0633` removes inherited account UI imports/chunks from embedded build; `0c3125a` substitutes signed-out identity and excludes Firebase SDK modules/chunks. A local Vue build completed, while generic `auth-*`, `authStore-*`, and `workspaceAuthStore-*` compatibility chunks remain. | **Source/build and scoped package gates passed.** The remaining generic chunks do not establish a reachable account UI, and their presence rules out a blanket “no auth code” claim. Individual PSD/error-report interactions were not exhaustively inspected. |
| New platform packages | `.github/workflows/phase-4-platform-gate.yml` includes Phase 5 catalog, account, typecheck, package smoke, and brand checks. | **Passed:** macOS arm64 and Linux x64 jobs in [run 38067616426](https://github.com/vjk7989/Hyper-Studio/actions/runs/38067616426). Installer installation/uninstall was not run on these platforms. |
| Code navigation graphs | `.local-cache/phase5-graft-{build,map}-final.log`: Graft parsed 7,071 files, 64,436 nodes, 158,982 edges. | Final Graft build/map passed. Separate codebase-memory MCP fast reindex crashed twice; its snapshot remains unverified. |

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
in the three available built trees. The final4 Windows audit above followed the newest bundle changes and supersedes that historical scan.

**Former visible blocker:** `apps/workflow-ui/public/assets/images/og-image.png`
(269,193 bytes) visibly says “Comfy CLOUD” and “Run ComfyUI anywhere.” The same
image was present in Vue dist and the packaged Windows frontend. It is referenced
by `src/renderer/extensions/firstRunTour/nudge/FirstRunTourNudge.vue`. The
embedded first-run entry appears disabled. The asset was replaced in `b95d6b3`;
the prior Windows package passed the installed brand smoke, while a complete frame-by-frame audit remains open.

The earlier bundled `cloud-subscription.webm` remained in Vue dist and Windows package.
A representative frame at one second showed a cloud/old-monitor scene with no
visible upstream wordmark. It is cloud-promotion media, so release review should
confirm the related subscription components cannot be reached in embedded mode
or exclude the video. References were removed in `f029ad0`; the desktop splash video frame and representative mode,
template, partner-node, and favicon images inspected at one second/static state
showed no visible upstream mark. These spot checks do not prove every frame or
light/dark/installer state is clean.

## Source candidates and disposition

A read-only review classified all **178** unallowlisted source candidates in
`.local-cache/brand-audit/audit.json` once each. These are source matches, not
178 visible defects:

| Classification | Count | Representative evidence |
| --- | ---: | --- |
| Confirmed reachable packaged UI with old product branding | 0 | Final4 installed light Projects, first run, Editor, Workflow, and dark Workflow Settings screenshots showed no upstream product mark. |
| Dormant inherited cloud/account or standalone paths | 48 | Cloud billing/onboarding, sign-in, upstream first-run/tutorial and partner media paths are removed or guarded in embedded mode. |
| Technical compatibility or internal CSS/DOM identifiers | 121 | Legacy workflow IDs, CSS selectors, import paths, telemetry/source keys, error-match predicates, manager package names, and developer compatibility data remain stable. |
| Legal attribution or third-party/provider facts | 4 | About attribution, third-party node-map names, and the LTX publisher alias preserve source facts. |
| Reachability still uncertain | 5 | Public Registry Manager search (1), Agent consent/free-use upstream links and media (3), and the developer CRDT report version label (1). |

The optional Manager path needs a focused embedded test if a backend starts with
`--enable-manager`: opening general Manager search immediately calls the search
gateway, which tries Algolia and can fall back to the public registry at
`api.comfy.org`. The final4 default installed smoke observed no such request;
the Manager gate is disabled without that flag. Embedded missing-pack lookup
already uses the local catalog. The Agent paths depend on its feature gate and
account/consent flow; the CRDT label additionally requires the developer debug
gate. These five paths are not confirmed visible rebrand blockers.

The final4 light empty/project/editor states and dark Settings were visually
reviewed. A captured Workflow loading state showed a pale, minimally styled
Hyper-Studio splash inside the dark host, with no upstream wordmark; loading
polish remains open. The passing cold-start smoke does not provide exhaustive
error-state, optional-overlay, light/dark, or media-frame coverage.

- Desktop production CSP no longer permits the upstream account origin (`be1dbdf`). Embedded help links and first-run destinations were rerouted or hidden (`8c4b1d6`), while manager package and workflow compatibility IDs remain.
- Embedded account/login/billing dialogs, user route, cloud promotion, templates, and settings panels were removed from the active path (`1471b1a` through `01047cd`). Later `c9c0633` adds compile-time guards and inert placeholders to exclude inherited account UI assets from the embedded bundle. `0c3125a` substitutes a signed-out local identity and rejects Firebase SDK/identity modules during embedded build. Source-only upstream strings can remain in dormant compatibility code and legal attribution; the final4 installed Windows navigation/network check found no account button or upstream Comfy/LTX cloud request.
- A prior diagnostic found an inherited `user` category. After the source filter, the final fresh installed Windows Settings smoke passed category/account/pricing assertions and a 3:1 dark “Nodes 2.0” heading contrast threshold. Internal `Comfy.*` setting IDs remain intact.
- Layer Editor PSD filenames use `hyper-studio-layers-*` (`5360748`). Embedded error reports use Hyper-Studio title/version labels (`9370589`) while preserving the engine version value. The scoped package gates passed; individual PSD/error-report interactions were not exhaustively inspected. No compatibility field or workflow ID was renamed.
- The local embedded Vue build no longer emits named account UI/Firebase SDK assets under its build guards. Generic `auth-*`, `authStore-*`, and `workspaceAuthStore-*` compatibility chunks remain. Their code and reachability need contextual review; absence of Firebase SDK is narrower than absence of all auth-related code.

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

The final4 Windows installed and macOS/Linux packaged gates passed. Inspect remaining light/dark,
loading, error, empty, optional-overlay, installer/window/OS-icon states and
resolve the five uncertain source candidates and remaining media frames. Run a completed
reviewed third-party pack installation and live hosted provider acceptance when
the test infrastructure is available. macOS/Linux installer installation/uninstall
behavior remains unverified. Keep temp and caches inside the repository.
Phase 5 stays open until those checks and their limits are recorded.
