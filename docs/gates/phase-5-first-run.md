# Phase 5.2 first-run connection and storage gate

## Scope

One shared-storage picker opens before the desktop shell. After storage is selected, a zero-profile install offers Connect a video API, Explore without a connection, and optional local-model setup in Settings. Connect embeds the existing Connections form and secure vault; Explore persists a private preference, while an existing profile bypasses the prompt. No API key is required to create a project, import media, or edit locally.

## Evidence

- Local desktop TypeScript passed and the full desktop unit suite passed **1,489/1,489** on the first Windows package run.
- [Windows run 38122107610](https://github.com/vjk7989/Hyper-Studio/actions/runs/38122107610) installed the unsigned NSIS and passed fresh picker cancel/busy/error/focus/persistence, Connect → Escape, Explore → restart, existing Editor/Workflow/project/provider/Manager smokes, and brand audit.
- [Windows run 38122551915](https://github.com/vjk7989/Hyper-Studio/actions/runs/38122551915) passed the same package gate after making the optional local-model path visible without a runtime and mounting the prompt only after splash completion. Its fresh smoke asserted the optional path.
- Repository-local OpenCode read-only audit passed **34/34** focused tests and changed no source. [Report](../agent-tasks/reports/phase-5-first-run-audit/report.md) was reviewed by Codex.
- Graft refreshed after the pass: **7,092 files, 64,534 nodes, 161,243 edges**. Codebase-memory reports ready/current Git SHA but still misses new Phase 5 symbols, so its live graph is not a reliable shared snapshot for this slice.
- [Windows run 38123169585](https://github.com/vjk7989/Hyper-Studio/actions/runs/38123169585) failed the new reduced-motion assertion: the prompt computed a `0.2s` transition rather than `0s`. The storage picker checks passed before the failure. Codex added an explicit reduced-motion CSS rule in `262eceb`.
- [Windows rerun 38123552292](https://github.com/vjk7989/Hyper-Studio/actions/runs/38123552292) passed 1,489/1,489 desktop tests, TypeScript, Vue build, unsigned NSIS installation, brand audit, and the fresh installed smoke including locked-vault error/Escape/Retry, modal focus containment, and computed reduced-motion transition. Existing project, Editor, Workflow, provider, Manager, and warm-switch smokes passed.

## Limits

The provider form is reused, but this gate uses no live hosted credentials. The locked-vault fixture mocks a profile-list failure and recovery in the installed app. Re-selecting a different shared-storage root with existing private profiles still needs a deliberate migration/recovery UX review. macOS and Linux are deferred until the Windows experience and release gates pass.
