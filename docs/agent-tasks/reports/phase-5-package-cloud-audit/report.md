# Phase 5.5 embedded package audit

## Result

OpenCode exited `0` and changed no source files. It inspected the current source and stale local package artifacts. The stale artifacts were built as `DISTRIBUTION=desktop` from an older commit, so their 418 source maps, 90 forbidden assets, and six forbidden destinations are evidence that the new guard rejects inherited material; they are not evidence from the current embedded build. A fresh embedded build remains the gate.

## Commands

- `git status --short`, `git log -1 --oneline`, `graft --version`, and `graft map`: passed.
- `node scripts/assert-package-hygiene.mjs apps/workflow-ui/dist`: failed as expected on stale output.
- `node scripts/assert-package-hygiene.mjs apps/desktop/release/win-unpacked/resources/workflow-frontend`: failed as expected on the same stale output.
- No installer build, dependency install, provider call, model download, or source edit was performed.

## Findings accepted for implementation review

- The embedded Vite plugin and runtime guards already suppress Firebase identity, account dialogs, cloud routes, and telemetry entry points, but a fresh build must prove that Rollup dropped them.
- `packages/billing-contract/src/returnTargets.ts` contains `cloud.comfy.org` return targets reachable through hosted billing helpers. The embedded boundary must prevent these helpers from entering the production graph.
- `SubscriptionRequiredDialogContentUnified.vue` and `SubscriptionRequiredDialogContentWorkspace.vue` do not match the older dialog alias pattern. Their dynamic imports must be pruned or stubbed for the embedded build.
- The Workflow engine package filter should exclude `.pytest_cache` and `.ci` directories.
- The package gate must scan Windows output as well as macOS and Linux output.
- The managed engine intentionally retains internal compatibility source while refusing to register inherited cloud nodes. Imported workflows keep their node IDs and receive missing-node guidance.

## Remaining risks

- Only a fresh `VITE_HYPER_STUDIO_EMBEDDED=true` build can prove zero forbidden chunks, source-map references, and inherited cloud destinations.
- The package guard is based on known names and destinations and must remain paired with the broader brand audit and installed-app smoke.

Full output is in `opencode-full.log`; the recorded process status is in `opencode-exit.log`.
