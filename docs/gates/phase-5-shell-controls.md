# Phase 5.3 shared-shell controls gate

## Scope

The Windows shell now makes Recent projects and Projects menus keyboard reachable, keeps focus in Settings and returns it to the invoking control, and keeps Explore search from opening over another modal or a text field. Connections serializes pending save, test, import, and delete actions and gives each failure a recoverable message. Reduced-motion Settings/search scrolling uses automatic rather than smooth motion. Editor and Workflow feature implementations were not changed by this slice.

## Failure and pass trail

| Windows Actions run | Result | Resolution |
| --- | --- | --- |
| [38124463606](https://github.com/vjk7989/Hyper-Studio/actions/runs/38124463606) | Failed the new Settings installed smoke on a Search Escape locator. | The first Escape had already closed Search, so pressing a second Escape on its removed input timed out. `5a0b0cc` waits for closure and sends a second Escape only if Search remains visible; no product failure was inferred. |
| [38124984538](https://github.com/vjk7989/Hyper-Studio/actions/runs/38124984538) | Settings smoke passed; mode-timing smoke failed while opening a newly created project before its folder setup finished. | `17c8893` waits for the asynchronous project-folder step before measuring mode switches. |
| [38125371341](https://github.com/vjk7989/Hyper-Studio/actions/runs/38125371341) | **Passed** the Windows installed gate at `17c8893`. | Unsigned package/install, desktop **1,492/1,492**, TypeScript, Vue build, brand audit, project controls, first-party shell, Settings shortcuts, and mode timing passed. Ten warm mode toggles had p95 **72 ms**. |

The focused connection-action and shell tests passed before the package rerun. Repository-local OpenCode performed a bounded read-only audit: **25 passed, 0 failed**, no source edit. Codex reviewed its [report](../agent-tasks/reports/phase-5-shell-controls-audit/report.md); its remaining modal-order and error-path findings are coverage risks, not reproduced gate failures.

Graft refreshed after the pass: **7,095 files, 64,551 nodes, 161,278 edges** (`.local-cache/graft-phase5-3.log`). Codebase-memory reports `ready` at source SHA `17c8893` with 655,150 nodes and 976,907 edges, but its newer Phase 5 symbols were missing in prior queries; the content and portable snapshot remain unverified for this slice.

## Limits

This closes the scoped Windows shared-shell gate. It does not prove every inherited Editor or Workflow control, live hosted-provider acceptance, model-backed inference, or macOS/Linux installer behavior. A higher-layer modal inserted earlier in DOM order and some connection-delete error paths need additional installed interaction checks. Phase 5.4 gesture/render and active Workflow control work remains open. Do not use this result as a full release claim.
