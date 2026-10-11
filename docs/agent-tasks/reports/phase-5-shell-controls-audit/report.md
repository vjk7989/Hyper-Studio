# Phase 5.3 shared-shell read-only audit

Repository-local OpenCode 2.0.26 (`opencode/space-bunny-free`, read-only `plan`) exited 0. [Task](../../phase-5-shell-controls-read-only-audit.md); full transcript: `opencode-full.log`. OpenCode inspected commit `20c16c0`, used the repository-local Graft map, and ran the two bounded focused tests through `scripts/with-local-env.ps1`: **25 passed, 0 failed**, exit 0. No installer, model, or live provider ran.

OpenCode made **no source edit**. `todo.md` gained three Phase 5.4 subtasks while OpenCode was running; this was concurrent Codex planning and is unrelated to its read-only audit. At the start there were no tracked changes. Full logs remain local; the concise findings contain no credentials.

## Codex review of findings

| Finding | Review | Next check |
| --- | --- | --- |
| Settings identifies the top modal by last visible dialog in DOM order (`SettingsModal.tsx:393-397`). A higher `z-index` dialog inserted earlier in the DOM could be misidentified. | Plausible **static risk**, not a reproduced failure. Current installed smoke tests a nested dialog appended last. | Extend the Settings shortcut smoke with a visible nested dialog inserted before Settings at higher z-index, and verify Escape remains owned by that dialog. |
| Delete confirmation and a pending connection action have limited installed error-path coverage (`ProviderConnectionsSection.tsx:111-119`). | **Coverage gap**. The gate correctly releases in `finally`; a blocked duplicate action is disabled in the UI and its silent return is not itself a defect. | In installed smoke, cancel Delete and verify controls re-enable; delay one mocked test call and verify busy/disabled state. |
| Recent-row menus focus their first item in `requestAnimationFrame` (`HomeSidebarMenu.tsx:122-125`, `Projects.tsx:78-81`). | **Low-confidence timing risk**. Focus stays within the row/card and the existing onBlur containment should permit it. | Exercise ArrowDown open, Escape close, and focus return in the installed smoke. |
| Project-name labels could fail if `TextField` does not forward `id`. | **Dismissed**. `TextField.tsx` forwards `id` directly to the native `<input>`. An accessible-name assertion would still strengthen the smoke. |
| Quick Search slash could be blocked by a hidden first-run dialog. | **Dismissed for current code**. `ConnectionChoice` returns `null` in `loading` and `hidden`; no hidden dialog node remains. |
| CI might run project controls against a different binary or omit them. | **Dismissed**. The Windows workflow sets `HYPER_STUDIO_SMOKE_EXE` once to the installed executable and runs `smoke-project-controls.mjs`, `smoke-first-party-controls.mjs`, and `smoke-settings-shortcuts.mjs` in sequence (`phase-4-platform-gate.yml:223-238`). |

**Observed failure:** none. The focused tests cover the pure connection action gate and Home shell planning; installed menu, modal ordering, and cancel behavior still need the Windows gate. Graft refreshed its map automatically while answering; no manual graph rebuild or source write occurred.
