# Codex assignment: Phase 5.2 shared-storage and shell consolidation

## Gate dependency

Start source edits only after Phase 5.1 Windows installed gate passes. This assignment is disjoint from the first-run connection choice.

## Owned files

`apps/desktop/frontend/views/Projects.tsx`, `apps/desktop/frontend/components/first-run/SharedStorageSetup.tsx`, their styles, and focused tests. Do not edit `App.tsx`, provider forms, Electron storage or project removal guards.

## Behavior

1. Remove the duplicate shared-storage picker from Projects when App has already selected storage. Keep a clear read-only display and a Settings route to change it if that action already exists.
2. Preserve New Project, Open project folder, rename, app-only removal, OS Trash confirmation, and their existing safeguards. Improve labels, busy/disabled states, inline errors, keyboard and focus behavior only where evidence shows a gap.
3. Picker cancellation leaves the current selection unchanged and returns focus to its trigger. Do not imply a project folder or files were deleted on app-only removal.

## Commands and acceptance

Use `scripts/with-local-env.ps1` for focused desktop tests and TypeScript. Cover storage unset/set/cancel/error and project controls regression. Report commands, pass/fail counts, changed files, and remaining risks. Root agent owns fresh installed Windows smoke and phase checkpoint.
