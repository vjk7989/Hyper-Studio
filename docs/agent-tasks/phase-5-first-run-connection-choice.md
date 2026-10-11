# Codex assignment: Phase 5.2 first-run connection choice

## Gate dependency

Start source edits only after Phase 5.1 Windows installed gate passes. Implement one skippable connection choice after shared-storage selection. It must not block basic local Editor use.

## Owned files

`apps/desktop/frontend/App.tsx`, one new `apps/desktop/frontend/components/first-run/ConnectionChoice.tsx` with styles, and focused tests for the new choice. Coordinate with the shared-storage owner; do not edit `Projects.tsx`, provider vault/IPC, Editor, Workflow bridge, or the graph.

## Behavior

1. After shared storage is selected and the ready shell can render, check global profile metadata with `listProviderProfiles`. Never read or display key material. Existing profiles bypass the choice.
2. With zero profiles and no persisted first-run decision, offer **Connect a video API**, **Explore without a connection**, and optional local-model setup. Connect opens the existing Connections settings/form. Explore persists a one-time skip without creating a fake profile. Keep Settings → Connections discoverable later.
3. Handle profile list errors/locked vault without treating them as an empty list. Offer retry and Explore; do not prompt repeatedly every render. If the profile is created while the choice is open, close it. Use clear focus return, Escape behavior, keyboard access, and reduced-motion-friendly transitions.
4. Store only the completion decision in an app-owned setting in shared storage or existing safe global preference. Do not put credentials in renderer storage or project files. Coordinate persistence with the root agent before implementation if a new IPC is necessary.

## Commands and acceptance

Run desktop TypeScript and focused tests through `scripts/with-local-env.ps1` and repository-local Node. Cover zero profiles, existing profile, skip and restart, Connect navigation, locked vault/list failure, retry, and keyboard focus. No runtime/model download or live provider call. Report commands, counts, changed files, risks. Full installed smoke and final gate are owned by the root agent.
