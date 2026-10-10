# Phase 5 surface-brand audit (Windows checkpoint)

Status: **open**. This is a reproducible checkpoint, not a release pass. Run
`scripts/with-local-env.ps1 .tools/node-v26.8.2-win-x64/node.exe scripts/audit-branding.mjs`
from the repository root after every fresh UI build/package. The full machine
inventory stays in `.local-cache/brand-audit/audit.json`; it is not committed.

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

## Fresh packaged Windows scan

The 2026-10-10 scan of a `win-unpacked` UI tree built at approximately 19:32
found 300 tracked-source string/URL matches, 249 review candidates, and 253
tracked visual assets. The packed workflow frontend still contained six old
`comfy-*` asset **filenames**. The tracked source files with those names have
already been removed; their binary contents had been replaced by a Hyper-Studio
mark before removal. Their presence in both `apps/workflow-ui/dist` and the
package indicates stale build output and requires a clean Vue dist rebuild and
repackage. The names themselves remain a shipped fingerprint until that is done.

**Visible blocker:** `apps/workflow-ui/public/assets/images/og-image.png`
(269,193 bytes) visibly says “Comfy CLOUD” and “Run ComfyUI anywhere.” The same
image was present in Vue dist and the packaged Windows frontend. It is referenced
by `src/renderer/extensions/firstRunTour/nudge/FirstRunTourNudge.vue`. The
embedded first-run entry appears disabled, but the asset is bundled and must be
replaced or excluded, then checked in a fresh package.

The bundled `cloud-subscription.webm` remains in Vue dist and Windows package.
A representative frame at one second showed a cloud/old-monitor scene with no
visible upstream wordmark. It is cloud-promotion media, so release review should
confirm the related subscription components cannot be reached in embedded mode
or exclude the video. The desktop splash video frame and representative mode,
template, partner-node, and favicon images inspected at one second/static state
showed no visible upstream mark. These spot checks do not prove every frame or
light/dark/installer state is clean.

## Actionable source candidates

- `apps/desktop/electron/csp.ts` still permits `https://api.comfy.org` in both
  development and production `connect-src`. The managed engine now blocks
  upstream proxy requests; the desktop CSP should match that policy.
- Workflow `src/locales/*/main.json` still has user-facing version mismatch
  help links to `docs.comfy.org` and manager-incompatible messages linking to
  the upstream manager. Rewrite the embedded presentation or route to local
  Hyper-Studio help while preserving manager package compatibility IDs.
- Dormant workflow account/cloud components still contain Comfy account terms,
  privacy, pricing, key, and support links: `components/dialog/content/signin/`,
  `platform/cloud/`, `platform/workspace/`, and `workbench/extensions/agent/`.
  Verify all are unreachable in embedded mode or remove them from shipped code.
- The first-run tutorial cards still point to `docs.comfy.org`; the bundled
  first-run image above is the direct visual issue.
- Workflow telemetry providers retain `mp.comfy.org` and `t.comfy.org` strings.
  Runtime telemetry must stay disabled; verify no packaged request is sent.

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
engine's offline CSP omits the upstream origin. Outside managed projects, the
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

Replace/exclude the old OG image, clean Vue dist before packaging, rerun this
audit on fresh Windows/macOS/Linux packages, inspect light and dark UI states,
and verify network silence plus installer/window/OS icons. Phase 5 stays open
until those checks pass.
