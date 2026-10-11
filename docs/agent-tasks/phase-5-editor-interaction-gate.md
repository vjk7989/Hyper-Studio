# Phase 5.4a — Editor interaction gate

## Ownership

Own `scripts/smoke-editor-controls.mjs`, focused Editor source/tests under `apps/desktop/frontend/views/editor/` and the smallest directly related module needed for a reproduced defect. Do not edit Workflow, shared shell, `todo.md`, or gate records. Coordinate before editing a file owned by another worker.

## Work

1. Inspect current Editor smoke and existing controls. Add installed-app checks with disposable local media for real clip drag to timeline, blade/trim and tool shortcuts, and a short local rendered export plus cancel/error behavior where the packaged app supports it without model packs.
2. Reproduce and fix any failing first-party control while preserving imported Editor behavior and Undo history. Keep the gate deterministic and avoid remote APIs.
3. Write a concise report in `docs/agent-tasks/reports/phase-5-editor-interactions/report.md`: commands, pass/fail counts, failed controls, cause, changed files, and remaining limits. Keep full logs inside the repository.

## Checks

Run focused tests through `scripts/with-local-env.ps1`, desktop TypeScript, `node --check` on changed smoke scripts, and `git diff --check`. The Windows GitHub Actions installed NSIS gate will run after Codex reviews your diff. Do not mark items `[x]` yourself.
