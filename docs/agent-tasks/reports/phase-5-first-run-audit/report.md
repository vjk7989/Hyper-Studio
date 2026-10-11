# Phase 5.2 first-run read-only audit

Repository-local OpenCode 2.0.26 (`opencode/space-bunny-free`, `plan`) exited 0. [Bounded task](../../phase-5-first-run-read-only-audit.md); full transcript: `opencode-full.log`. Codex reviewed the report against current source and `git diff`. This is a static audit during concurrent Codex edits, not a passing Phase 5.2 gate. Codex subsequently addressed findings 1–3 in separate changes; the installed gate is still needed.

## Commands and checks

- `git status --short`, recent log, repository-local Graft `map` and `ask`: completed. One initial `ask` argument-binding attempt failed, then succeeded with a quoted argument.
- Focused existing provider-profile, boot-phase, and shared-storage-gate tests through `scripts/with-local-env.ps1`: **34 passed, 0 failed**, exit 0. The first attempt used the wrong script path from a subdirectory; corrected command passed.
- No package build, installed smoke, live provider, model download, or destructive action ran.
- `git diff --stat` was empty at OpenCode's end snapshot. OpenCode changed **no source files**; the task file was created by Codex before launch. Later working-tree changes in the first-run files are Codex fixes, not OpenCode edits.

## Findings to verify before the Windows gate

| Priority | Finding and evidence | Smallest verification |
| --- | --- | --- |
| 1 | At the audit snapshot, optional local-model setup was hidden on a fresh hosted-only install: `App.tsx:324` passed `!forceApiGenerations`, which starts true before Python exists. Codex now shows the Settings path unconditionally. | Assert the option appears in a fresh no-runtime first-run smoke and opens Models Settings without downloading. |
| 2 | At the audit snapshot, Connect focus could run while the splash hid the app subtree. Codex now mounts `ConnectionChoice` after `splashFinished`. | Assert focused control after splash removal in the fresh Windows smoke. |
| 3 | At the audit snapshot, Escape from connection-list error persisted Explore. Codex changed the error Escape action to `none`. | Simulate a rejected profile-list request and Escape; assert the skip flag is unchanged and Retry remains available. |
| 4 | The dialog is visually modal but the background is not inert; its Tab wrap only handles focus already on the first/last dialog control: `ConnectionChoice.tsx:101-114`. | Click outside and Tab; assert focus remains inside the dialog. |
| 5 | Existing Windows smokes mostly pre-set the skip flag; `smoke-first-run-storage.mjs` is the only one exercising the choice. Its failure log/screenshots are absent from the CI diagnostic artifact list. | Add a first-run failure screenshot/log artifact and verify the smoke's choice/restart assertions. |
| 6 | Changing or losing the shared-storage root does not automatically recover or migrate private profile settings: `App.tsx:110-114` reads once; `project-registry.ts:89-107` accepts a new root without moving the old settings file. | Test missing-root restart and re-selection with an existing profile; show a clear warning or preserve the profile. |

macOS/Linux package smokes pre-set the skip flag and do not cover the first-run choice. That is consistent with the current Windows-first gate, but the later platform gate should record this coverage limit. Reduced-motion mode is set in the fresh smoke but its computed transition is not asserted. Focus restoration after Explore also lacks a direct assertion.

**Remaining risk:** These six findings are code-observed risks or coverage gaps, not reproduced installed-app failures. Phase 5.2 focused tests, TypeScript, Windows packaging, and fresh installed smoke remain pending. The Graft map was used; codebase-memory is not claimed as a live shared OpenCode graph.
