# Project removal backend review — 2026-10-11

## Result

The focused backend gate passes: 26 tests passed, 0 failed. Desktop TypeScript check passed. Full logs are in `.local-cache/project-removal-focused-gate.log` and `.local-cache/project-removal-typecheck.log`.

## Commands

- `scripts/with-local-env.ps1 node --experimental-strip-types --test apps/desktop/electron/project-removal.test.ts apps/desktop/electron/project-workspace.test.ts apps/desktop/electron/provider-jobs/broker.test.ts`
- `scripts/with-local-env.ps1 node apps/desktop/node_modules/typescript/bin/tsc --noEmit --project apps/desktop/tsconfig.json`

## Findings and correction

The first review found that the Trash guard compared app-data and other-project paths as written. A Windows junction could point either path inside the selected project without a matching path-string prefix. The guard now resolves existing aliases before overlap checks; regression tests cover both cases.

The tests cover manifest ID mismatch, shared-storage overlap, drive root, project-path and metadata symlinks, another registered project within the selected folder, an active provider job, rejection of new jobs during removal, and reopening a workspace manifest. The provider broker stays closed after a successful removal until the project is reopened.

## Remaining gate evidence

These focused tests do not exercise Electron `shell.trashItem`, its failure path, persistence of both Electron registries across a real process restart, the local Editor queue endpoint, or the managed Workflow queue endpoint. The Windows installed-app project-controls smoke must verify the actual IPC and OS Trash behavior using disposable folders before the project gate is marked complete. Backend queue checks intentionally block removal if they cannot verify that a running backend is idle. No live provider generation was used.
