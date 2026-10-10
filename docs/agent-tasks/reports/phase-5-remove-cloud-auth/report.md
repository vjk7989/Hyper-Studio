# Phase 5 embedded Workflow account isolation — OpenCode report

Task: docs/agent-tasks/phase-5-remove-cloud-auth.md
Model: opencode/space-bunny-free. Full transcript: opencode-full.log.

## Commands and results

| Check | Result |
| --- | --- |
| Focused Vitest: onboardingCloudRoutes, desktopLoginRedemption, embeddedAccountIsolation | Pass: 3 files, 67 tests, 0 failed; full output in focused-tests.log |
| Hyper-Studio scoped vue-tsc with repository-local Node 26 | Pass: exit 0; output in scoped-typecheck.log |
| Full app vue-tsc | Pending: Node default 4 GB heap OOM, exit 134 in opencode-full.log |

OpenCode attempted a larger-heap retry while concurrent desktop work left about 2 GB free RAM. Codex stopped it to avoid host OOM, so opencode-exit.log is -1. No full Vite build was run. The focused and scoped gates above passed after Codex reviewed the diff.

## Changed files

- apps/workflow-ui/src/router.ts: gate cloud routes, OAuth request capture, auth guard, and login redemption on cloud distribution plus nonembedded mode.
- apps/workflow-ui/src/main.ts: skip Firebase initialization in embedded mode; sync cloud host identity only when cloud account routes are active.
- apps/workflow-ui/src/platform/cloud/onboarding/embeddedAccountIsolation.test.ts: verify embedded account paths cannot register/navigate/capture OAuth or open sign-in, while standalone cloud behavior remains available.

No provider credentials, local bridge, desktop, backend, public assets, package files, or model packs changed.

## Remaining surfaces and risks

This task does not close local multi-user selection: router.ts still defines /user-select and redirects GraphView there when userStore.needsLogin; bootstrapStore.ts also waits for needsLogin to become false. The managed engine is intended single-user, but a multi-user response could still show UserSelectView.vue or stall bootstrap. Those exact paths need a separate scoped follow-up if the packaged runtime can expose them. Components outside these owned entry points may also present account controls; the Phase 5 visual audit must check them.

The full app typecheck and packaged embedded-canvas smoke remain Phase 5 gates. The focused test uses mocked routing; it does not exercise Firebase network behavior in the packaged app.
