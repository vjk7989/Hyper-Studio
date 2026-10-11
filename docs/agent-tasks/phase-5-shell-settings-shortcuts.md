# Phase 5.3C — Settings focus and Explore keyboard behavior

**Gate:** Windows shared-shell interaction gate; begin source edits after Phase 5.2 closes.

**Owned files:** `apps/desktop/frontend/components/SettingsModal.tsx`, `apps/desktop/frontend/ltx-io/components/QuickSearch/LtxioQuickSearch.tsx`, and their focused tests. Do not edit project menus or Connections.

1. Focus Settings when opened, keep Tab/Shift+Tab inside its dialog, restore focus to the connected trigger on Escape, Close, and backdrop dismissal. Respect nested dialogs and reduced motion.
2. Prevent `/` Explore search from opening over Settings, onboarding, or another dialog; do not swallow text entry.
3. Use auto scrolling when reduced motion is requested. Test keyboard entry, modal nesting, focus return, and failure recovery.

**Commands:** Focused tests and desktop TypeScript through `scripts/with-local-env.ps1`. No local installer build or model download. Report files changed, pass/fail counts, unresolved risks, and installed smoke steps.
