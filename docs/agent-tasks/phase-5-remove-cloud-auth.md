# OpenCode coding task: Phase 5 embedded Workflow account isolation

## Objective

For the Hyper-Studio embedded desktop canvas, keep local Workflow graph routing and the host bridge working while preventing the Workflow frontend from starting Firebase identity or capturing/handling cloud OAuth and account onboarding routes. Preserve existing standalone cloud and desktop behavior. This is a narrow entry-point task, not a broad component rebrand.

## Ownership

- Edit only apps/workflow-ui/src/router.ts, apps/workflow-ui/src/main.ts, and focused tests under apps/workflow-ui/src/platform/cloud/onboarding/.
- Do not edit desktop, backend, shared provider settings, local bridge, public assets, package files, lockfiles, CI, or unrelated Vue components.
- Do not delete cloud routes or onboarding components needed by nonembedded builds. Do not alter provider keys, credential storage, or local workflow APIs.
- Use the existing isHyperStudioEmbedded flag from src/platform/distribution/hyperStudio.ts. Avoid a second configuration mechanism.
- Check the working tree before editing. Stop and report any collision on owned files.

## Work

1. The Codex runner already consulted the shared codebase-memory graph first; it had no current route symbols. Read router.ts, main.ts, and only the directly relevant onboarding modules/tests. Do not run a new graph index or broad repository search during concurrent Phase 5 work. The repository-local Graft graph was used in the previous OpenCode task; no reindex is needed here.
2. In embedded mode, skip Firebase initialization and cloud OAuth request capture/redemption/guards. Keep the root GraphView route, local user selection, and installHyperStudioEmbedBridge. Preserve nonembedded cloud auth behavior.
3. Add or adapt a focused behavioral test under the owned onboarding test folder if practical. Confirm embedded startup/route logic cannot open a cloud sign-in dialog or account route from these entry points. If a dialog entry point lives outside owned files, name the file and leave it for a separate task.
4. Keep changes minimal and report any cloud/account surfaces still reachable through components outside this file boundary.

## Commands and acceptance

Run from apps/workflow-ui using repository-local Node 26 through scripts/with-local-env.ps1. Do not use pnpm exec, which triggers workspace resolution and changes the lockfile here.

    & '..\..\scripts\with-local-env.ps1' '..\..\.tools\node-v26.8.2-win-x64\node.exe' 'node_modules/vitest/vitest.mjs' run src/platform/cloud/onboarding/onboardingCloudRoutes.test.ts src/platform/cloud/onboarding/desktopLoginRedemption.test.ts
    & '..\..\scripts\with-local-env.ps1' '..\..\.tools\node-v26.8.2-win-x64\node.exe' 'node_modules/vue-tsc/bin/vue-tsc.js' --noEmit --project tsconfig.hyper-studio.json

Include any new focused test in the Vitest command. Acceptance for this bounded change: relevant tests and the Hyper-Studio scoped Vue typecheck exit 0; embedded entry points skip Firebase and cloud OAuth/account routing; nonembedded routes remain functional; no diff outside owned files; no dependency download or model pack. The full app Vue typecheck remains a Phase 5 gate when sufficient memory is available. Do not run a full Vite build while other agents use memory. Codex will run the package and visual gates later.

## Report

Write a short report at docs/agent-tasks/reports/phase-5-remove-cloud-auth/report.md: commands and exit codes, pass/fail counts, changed files, root cause of any failure, remaining reachable account surfaces, and risks. Full OpenCode transcript goes to opencode-full.log and exit code to opencode-exit.log in the same repository folder. Do not paste full logs into chat. Codex reviews every diff before acceptance and commits only scoped files.
