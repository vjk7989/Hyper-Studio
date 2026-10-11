# Phase 5.3B — Connections action isolation

**Gate:** Windows shared-shell interaction gate; begin source edits after Phase 5.2 closes.

**Owned files:** `apps/desktop/frontend/components/settings/ProviderConnectionsSection.tsx` and focused tests. Do not edit profile vault/backend semantics or other shell files.

1. Use one pending-action guard for vault unlock/create, explicit legacy import, profile save/test/delete, and refresh. Prevent overlapping clicks and selections while an action is pending.
2. Keep inline errors visible and recoverable; announce busy and success states without exposing credentials.
3. Add tests for rapid duplicate clicks, rejected actions, vault-locked recovery, and selection state. Preserve the existing secure store and multi-profile behavior.

**Commands:** Focused tests and desktop TypeScript through `scripts/with-local-env.ps1`. No live provider requests, local installer build, or model download. Report files changed, pass/fail counts, unresolved risks, and installed smoke steps.
