# Phase 5 surface-brand audit (latest bundle gate pending)

Status: **Prior Windows installed checkpoint passed; latest package gates pending**. This is not a cross-platform release pass. The earlier installed package passed brand/settings/compatibility smoke through `f3399f2`; later export and embedded-bundle fixes (`5360748`, `9370589`, `c9c0633`, `0c3125a`) require a new installed Windows gate. macOS/Linux [run 38067417438](https://github.com/vjk7989/Hyper-Studio/actions/runs/38067417438) is pending. Run
`scripts/with-local-env.ps1 .tools/node-v26.8.2-win-x64/node.exe scripts/audit-branding.mjs`
from the repository root after every fresh UI build/package. The full machine
inventory stays in `.local-cache/brand-audit/audit.json`; it is not committed.

## Current Phase 5 evidence (2026-10-10)

| Gate | Evidence | Status |
| --- | --- | --- |
| Read-only tracked-source and built-tree audit | Prior `.local-cache/phase5-brand-audit-final3.log`: 232 source matches, 178 unallowlisted review candidates, 253 tracked visuals, zero residual legacy visual filenames in tracked source and three built trees (Vue dist, Windows workflow frontend, Windows remote UI). | **Prior filename inventory passed.** Re-run after the latest build; string candidates and media frames require contextual inspection. |
| Managed cloud policy | 10 focused Python tests passed; 65 upstream compatibility tests passed with 2 skipped; 8 provider-adapter and 8 server/CSP tests passed. | Source-level pass. Live hosted API/network behavior is not proven. |
| Embedded account and node-pack unit tests | Five-file account suite: 79/79 passed. Two-file local catalog/pack suite: 32/32 passed. Embedded Settings branding/search/contrast source fixes passed 56 focused tests, scoped Vue typecheck, lint, and embedded build. | Focused source pass; installed Windows Settings assertions below passed. |
| Prior Windows NSIS and installed smoke | The earlier `apps/desktop/release/Hyper-Studio-Setup.exe` was 420,633,109 bytes, SHA-256 `F73BF677F4A1218D995E5A1DB82A3E0FEF75E2B14D615C453767A3C5191A276F`, Authenticode `NotSigned`. Repo-local install `.local-tmp/installed-phase5-final3` passed Workflow canvas, JSON roundtrip, bidirectional usable media, Hyper-Studio Settings category, account/pricing absence, dark “Nodes 2.0” heading contrast ≥3:1, and no observed upstream Comfy/LTX cloud request. | **Prior Windows checkpoint passed.** This artifact predates the four later source commits. Logs: `.local-cache/phase5-windows-installed-{smoke,compat}-final3.log`; screenshots: `.local-tmp/packaged-electron-smoke-final3/`. |
| Workflow compatibility and reviewed queue | Three imported variants preserved JSON, core/third-party node IDs and links. IDs 37, 90909, and removed cloud node 91001 stayed in imported JSON; missing-node guidance appeared. Explicit third-party source review opened, and the correct install task was intercepted after confirmation but before download. | **Windows compatibility checkpoint passed.** A completed third-party package download/install is still unverified. |
| Latest export branding and embedded account bundle | `5360748` changes PSD export names; `9370589` brands embedded error reports. `c9c0633` removes inherited account UI imports/chunks from embedded build; `0c3125a` substitutes signed-out identity and excludes Firebase SDK modules/chunks. A local Vue build completed, while generic `auth-*`, `authStore-*`, and `workspaceAuthStore-*` compatibility chunks remain. | **Source/build checkpoint only.** New installed Windows and macOS/Linux package behavior pending. The remaining generic chunks do not establish a reachable account UI, and their presence rules out a blanket “no auth code” claim. |
| New platform packages | `.github/workflows/phase-4-platform-gate.yml` includes Phase 5 catalog, account, typecheck, and brand checks. | **Pending:** macOS arm64/Linux x64 run 38067417438 and new installed Windows package. The prior Phase 4 run is not Phase 5 evidence. |
| Code navigation graphs | `.local-cache/phase5-graft-{build,map}.log`: Graft parsed 7,066 files, 64,425 nodes, 158,969 edges before the four later commits. | Last Graft build/map passed; refresh for current code. Separate codebase-memory MCP fast reindex crashed twice; its snapshot remains unverified. |

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
in the three available built trees. The later Windows audit above superseded that historical scan but predates the newest bundle changes.

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

- Desktop production CSP no longer permits the upstream account origin (`be1dbdf`). Embedded help links and first-run destinations were rerouted or hidden (`8c4b1d6`), while manager package and workflow compatibility IDs remain.
- Embedded account/login/billing dialogs, user route, cloud promotion, templates, and settings panels were removed from the active path (`1471b1a` through `01047cd`). Later `c9c0633` adds compile-time guards and inert placeholders to exclude inherited account UI assets from the embedded bundle. `0c3125a` substitutes a signed-out local identity and rejects Firebase SDK/identity modules during embedded build. Source-only upstream strings can remain in dormant compatibility code and legal attribution; the prior installed Windows navigation/network check found no account button or upstream Comfy/LTX cloud request. Retest the new package.
- A prior diagnostic found an inherited `user` category. After the source filter, the final fresh installed Windows Settings smoke passed category/account/pricing assertions and a 3:1 dark “Nodes 2.0” heading contrast threshold. Internal `Comfy.*` setting IDs remain intact.
- Layer Editor PSD filenames use `hyper-studio-layers-*` (`5360748`). Embedded error reports use Hyper-Studio title/version labels (`9370589`) while preserving the engine version value. These two outputs need a new package gate; no compatibility field or workflow ID was renamed.
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

Build and freshly install Windows again after the four later source commits;
record the new installer size/hash/signature, bundle asset inventory, and
installed media/Settings/compatibility/network smoke. Collect macOS arm64 and
Linux x64 results from run 38067417438 and repair any failures before calling
the platform gate passed. Inspect remaining light/dark,
loading, error, empty, optional-overlay, installer/window/OS-icon states and
review the 178 string candidates and media frames contextually. Run a completed
reviewed third-party pack installation and live hosted provider acceptance when
the test infrastructure is available. Cross-platform installer/uninstaller
behavior remains unverified. Keep temp and caches inside the repository.
Phase 5 stays open until those checks and their limits are recorded.
