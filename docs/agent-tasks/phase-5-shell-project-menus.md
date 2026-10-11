# Phase 5.3A — project menu and form accessibility

**Gate:** Windows shared-shell interaction gate; begin source edits after Phase 5.2 closes.

**Owned files:** `apps/desktop/frontend/views/Projects.tsx`, `apps/desktop/frontend/components/home/HomeSidebarMenu.tsx`, their focused tests. Do not edit shared IPC, Connections, Settings, Workflow, or Editor files.

1. Prevent project-card options from clipping while keeping thumbnails clipped.
2. Make Projects and Recent row menus dismiss on Escape and outside pointer action, return focus to their triggers, expose menu/button semantics, and remain usable on compact cards.
3. Give Create/Rename project name inputs visible associated labels and errors. Preserve all project removal safety rules.
4. Add focused edge cases for open/close, Escape, outside click, focus return, and keyboard navigation. Existing project/removal tests must still pass.

**Commands:** Use `scripts/with-local-env.ps1` for focused Node tests and desktop TypeScript. Do not run a local installer build or download models. Report files changed, pass/fail counts, unresolved limits, and any installed smoke actions needed.
