# Phase 5.5 package cleanup implementation plan

Snapshot reviewed: `phase4-platform-gate` at `bd2281e`. The codebase-memory index was ready at the same commit with 655,150 nodes and 976,907 edges. Phase 5.4 remains the active gate, so this report makes no product changes.

## Evidence

- `apps/workflow-ui/vite.config.mts:31,760-769` generates hidden sourcemaps unless `GENERATE_SOURCEMAP=false`. Neither `apps/workflow-ui/scripts/build-hyper-studio.ps1` nor the Windows/macOS/Linux CI build steps set that value.
- `apps/desktop/electron-builder.yml:55-56` copies the whole Workflow `dist` tree as `workflow-frontend`. The top-level `files: "!**/*.map"` rule applies to the Desktop app files, not this unfiltered `extraResources` entry.
- The currently available unpacked Windows evidence contains 418 Workflow `.map` files totaling 66,643,530 bytes. It also contains named account/cloud chunks. This package predates the current HEAD and is evidence of the failure mode, not proof about a fresh HEAD build.
- Embedded UI guards exist, but several retained modules still import cloud/account code. Examples are `router.ts:19-24`, `services/dialogService.ts:15-52,673-932,1022`, `GraphView.vue:59,73`, and `TopMenuSection.vue:188`. Runtime `if` checks hide actions but do not reliably remove Rollup dynamic-import chunks.
- The current Vite embedded plugin rejects selected account filenames and Firebase modules (`vite.config.mts:48-49,487-542`). It does not deny all `src/platform/cloud`, `src/platform/workspace` account/billing, or `packages/account-*` runtime modules.
- `SettingsModal.tsx:532-767` still renders an unreachable LTX/Fal/Gemini key form. `settings-navigation.ts:41-55` hides `apiKeys` and redirects old links to `connections`. The related state, focus helper, key mutations, Gemini model fetch, imports, and context destructuring remain in `SettingsModal.tsx:16-23,70-176,199-320`.
- The existing reason-to-focus path selects Connections but calls the old API Keys focus helper. `ProviderConnectionsSection` already supports `focusFirstFieldWhenReady`, but `SettingsModal.tsx:769-772` does not pass it.
- The graph shows `useDialogService` has many local callers for workflow, Manager, graph, save, error, and keybinding dialogs. Replacing or stripping the entire service would break local features.

## Implementation sequence

### 1. Remove release sourcemaps with two controls

1. In `vite.config.mts`, make the embedded build set `build.sourcemap` to `false` regardless of generic Sentry defaults. Keep coverage maps for non-embedded test builds.
2. Set `GENERATE_SOURCEMAP=false` explicitly in `build-hyper-studio.ps1` and all three CI embedded-build steps so the release intent is visible at each entry point.
3. Add an Electron `extraResources` filter for `../workflow-ui/dist`: include `**/*`, exclude `**/*.map`. This is defense in depth for stale or externally prepared `dist` trees.
4. Add a package assertion that fails if any file below packaged `workflow-frontend` ends in `.map`.

### 2. Prune cloud/account code at the import boundary

Do not delete emitted chunks by filename after Rollup runs; entry chunks can still reference them. Remove their import edges before bundling, then make the bundle fail if they return.

1. Define one compile-time embedded capability in `vite.config.mts` and keep `isHyperStudioEmbedded` as the runtime-facing wrapper. Use the compile-time constant directly around imports that must disappear.
2. Split cloud-only router hooks and routes from `router.ts`. The embedded adapter should export no-op hooks and no routes; the non-embedded adapter retains OAuth, login redemption, share attribution, and onboarding imports. Preserve the local Graph route, user-store initialization needed by local workflows, preserved-query handling, and unmatched-route behavior.
3. Split cloud/account dialog loaders from `dialogService.ts`. Keep the common local dialog service and its public shape because it serves Manager, missing-node review, graph, save, error, keybinding, template, and workflow dialogs. In the embedded build, account, workspace billing, subscription, sign-in, cloud notification, and publish methods resolve to explicit unavailable/no-op results without importing their Vue components. Keep local confirmation and Manager install review dialogs.
4. Replace direct account component imports in `GraphView.vue`, `TopMenuSection.vue`, and other retained shell modules with capability adapters that resolve to empty embedded components. Extend this only to proven account/cloud surfaces; do not alias graph widgets, queue controls, Manager, assets, model library, or local execution components.
5. Retain the local `/features` request in `main.ts`: graph inspection shows `refreshRemoteConfig({ useAuth: false })` calls the active engine’s local `/features` endpoint. Remove only cloud authentication and external telemetry branches, not local engine capability negotiation.
6. Expand the Vite `generateBundle` assertion from Firebase-only checks to reject runtime modules under `src/platform/cloud/`, account/billing portions of `src/platform/workspace/`, and `packages/account-core` / `packages/account-ui`, plus known account/cloud chunk names. Allow type-only imports because Rollup emits no module for them. If a local feature still imports a denied module, move the neutral type or utility to a local shared module instead of weakening the denylist.
7. Preserve technical compatibility identifiers (`Comfy.*` settings/commands, node class IDs, Manager API/package schema names, imported JSON IDs), named providers/models, and the About/legal attribution. These are checked by purpose, not by a blanket word deletion.

### 3. Remove the dormant Desktop key form

1. Delete the unreachable `showSection("apiKeys")` JSX and its legacy-only imports, `useApiKeyFocus`, `GeminiModelSelect`, key input/error/pending state, direct key save/clear mutations, and Gemini model-list effect from `SettingsModal.tsx`.
2. Keep `SettingsTabId` accepting `apiKeys` only as a legacy input until callers and saved deep links are migrated; continue redirecting it to `connections` in `parseSettingsTabId`.
3. Render `ProviderConnectionsSection` with `focusFirstFieldWhenReady={Boolean(initialReason)}` so legacy `geminiKeyRequired` and `ltxKeyRequired` requests land on the single secure Connections form. Provider secrets remain in the existing profile vault.
4. Do not remove provider names or provider-specific adapters/links from Connections. The cleanup removes duplicate credential UI, not LTX, fal.ai, Gemini/Veo, Runway, or Custom HTTP support.

## Tests and audit changes

- Add a small package-hygiene script used after the Workflow build and after Electron packaging. For every present `workflow-frontend` tree, report and fail on source maps, known cloud/account filenames, Firebase/account SDK modules, inherited cloud domains, and sourcemap URLs. Also assert the Hyper-Studio embed bridge and build manifest exist.
- Extend `scripts/audit-branding.mjs` with structured package fields: `sourceMapCount/sourceMapBytes`, `forbiddenCloudArtifacts`, and `forbiddenCloudDestinations`. Keep the current provider, compatibility, and legal allowlist. Do not treat every `cloud` token as a failure without file/module context.
- Add Vite plugin tests with a synthetic bundle: embedded build rejects a forbidden module/chunk; normal upstream build is unchanged; legal and compatibility identifiers are accepted.
- Extend `embeddedAccountIsolation.test.ts` and `dialogService.subscriptionRequired.test.ts` to assert embedded account methods neither import account components nor issue a request, while local confirmation/Manager dialogs still open.
- Add/extend routing tests for Graph, unknown-route fallback, and absence of account/OAuth routes in embedded mode.
- Extend `settings-navigation.test.ts` for legacy `apiKeys -> connections`. Add a focused Settings/Connections interaction test for both key-required reasons, vault locked, and keyboard focus. Keep `smoke-first-party-controls.mjs` as the installed-app proof for create/test/delete profile behavior.
- Rerun the existing scoped Vue typecheck and account-isolation suite, Workflow import/save/run/cancel/Manager smokes, Desktop tests/typecheck/build, brand and package audits, unsigned NSIS install, and installed-app smoke. Assert no inherited account prompt or external Comfy/LTX cloud request in the smoke network log.

## Gate and risks

- Run a fresh embedded build before deciding the final module denylist; old `dist` and `release` trees are not authoritative.
- The highest regression risk is over-pruning shared `dialogService` or workspace utilities used by local workflows. The adapter split and positive local-feature smokes are the required protection.
- Chunk hashes and filenames are unstable. Package enforcement must inspect module provenance during Rollup and semantic filename/domain patterns after packaging, never hard-code one hash.
- Phase 5.5 can be marked complete only after the fresh Windows package and installed smoke pass, followed by macOS and Linux package smokes. Live provider generation remains unverified without credentials.
