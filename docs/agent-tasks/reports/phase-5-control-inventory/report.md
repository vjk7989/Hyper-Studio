# Phase 5 control inventory preparation

Repository-local OpenCode 2.0.26 (`opencode/space-bunny-free`, read-only `plan`) exited 0. It read the three existing gate reports, used the repository-local Graft map, and inspected targeted source and smokes. [Task](../../phase-5-control-inventory-read-only.md); full transcript: `opencode-full.log`. No tests ran, so pass/fail counts do not apply. Codex reviewed the candidate list against the reports and current code; the rows are **untested candidates**, not passing features.

| Priority | Control and expected result | Disposable fixture / evidence gap |
| --- | --- | --- |
| 1 | Editor trim handle changes clip duration and persisted timeline | PNG/WAV/SRT; no installed drag gesture in `editor-control-smoke.md`. `useTimelineDrag.ts` / `editor-actions.ts`. |
| 2 | Editor blade at playhead creates two clips | Same media; no installed blade gesture. `editor-actions.ts` / `buildMenuDefinitions.ts`. |
| 3 | FCPXML export writes selected package and reports progress | PNG timeline; basic package path passed, format options not covered. `ExportModal.tsx`. |
| 4 | H.264 export writes playable MP4 | PNG+WAV; rendered video export untested. `ExportModal.tsx` / `electron/export/export-handler.ts`. |
| 5 | Workflow mouse port drag creates a link | EmptyImage→SaveImage; previous smoke injected a linked JSON rather than dragging ports. `GraphCanvas.vue`. |
| 6 | Workflow Cancel stops an active local run | Deliberately long local graph; prior small graph finished before Cancel. `QueueProgressOverlay.vue` / `scripts/api.ts`. |
| 7 | Workflow save→reopen preserves node and link IDs | Existing linked-local JSON; byte import/export passed, edit-cycle ID stability untested. `WorkflowWorkspace.tsx` / Vue bridge. |
| 8 | Manager reviewed install and update/uninstall controls | Local Impact fixture; reviewed install passed. Embedded Manager update/uninstall reachability needs inspection and smoke. `usePackInstall.ts` / local catalog. |
| 9 | Switching projects stops A's engine without exposing A's media in B | Two disposable folders; no installed mid-engine project switch smoke. `Project.tsx` / engine IPC. |
| 10 | Appearance survives restart | Isolated profile; light/dark clicks passed, persistence and current script evidence need a fresh installed check. `useTheme.tsx` / Settings. |

**Separate external limits:** live provider generation, model inference, gated downloads, and real third-party pack installation require credentials, weights, or an external source and remain unverified. A stalled local graph fixture is needed to test active cancellation reliably. The portable codebase-memory snapshot is not verified as synchronized with Graft; OpenCode used the same repository-local Graft graph, not a claimed live shared MCP session.

**Changed files by this assignment:** none. A stale repository-local OpenCode service from an earlier session wrote an unrelated prior report while this investigation ran; Codex stopped that service and restored only its unintended report files. The managed runner remains repository-local. Future assignments should close the service after each bounded run.
