# Phase 5.4 Windows CI failure triage

[Windows run 38129399057](https://github.com/vjk7989/Hyper-Studio/actions/runs/38129399057) at `90f9207041497eb564f4076a3bf54aba96db7c4b` failed in `windows-package-and-smoke`; the macOS/Linux job was skipped. Repository-local OpenCode 2.0.26 (`opencode/space-bunny-free`, read-only `plan`) exited **0**. [Task](../../phase-5-windows-ci-log-triage-read-only.md); full transcript and exit code are local ignored logs beside this report. OpenCode made **no source or test edit**.

## First failure and prior passes

Checkout, dependencies, embedded canvas, desktop checks/build, Manager catalog, unsigned installer build, and installation passed. In the installed-app step, first-run, packaged shell, project controls, first-party controls, and Settings shortcut smokes passed. The Editor smoke then passed project creation, asset import/reopen, Undo, mode-toggle state, playback, FCPXML export and reimport. Its first failure was:

```text
scripts/smoke-editor-controls.mjs:331
Error: Timed out waiting for dragged image clip
```

The 20-second wait expired at 09:51:21 UTC after the last passing Editor assertion at 09:51:00 UTC. See `.local-tmp/ci-38129399057-job.log` lines 3951–3961 and the captured `editor-controls-1791712246430/failure.png`. Later blade, trim, render, Workflow interaction, and Manager update/uninstall assertions did not run in this job. The failure is **1 installed smoke assertion**; this audit's bounded `node --check scripts/smoke-editor-controls.mjs` passed, exit 0, and does not exercise the UI.

## Cause and bounded fix

The failed smoke selected the first displayed video drop row using `nth(subtitleCount)` while its track assertion used `videoTracks.at(-1)`. The screenshot shows V3 and V2 at the visible top, with V1 below the fold. The prior selection did not require a source-patched track. The product's drop handler accepts the card's asset payload and routes it to timeline insertion; no product defect is established by this evidence. The exact drag event sequence could not be confirmed because the script's `drag-evidence.json` was omitted from the CI failure artifact.

Codex independently changed the smoke at `5bc0aa9` to select an unlocked `sourcePatched` video track and derive its displayed row from the reversed video order. The selection predicate matches `editor-actions.ts`'s usable-track condition. Codex then added `drag-evidence.json` to CI failure diagnostics at `dd72fe7`. **This is a supported test-fixture hypothesis, not a verified fix**; the next fresh installed Windows run must show the dragged clip and all subsequent controls passing. The screenshot and current source were reviewed by the Codex runner.

## Commands and access

OpenCode tried `gh run view`, which was unavailable inside its isolated repository-local home. It read public run metadata, Git/source, the already local job log and screenshot, and ran one repository-local syntax check. It did not download the installer or artifacts; the log and small failure artifact were already under `.local-tmp/ci-38129399057` when it started. The Codex runner independently read job-log lines 3870–3960 and inspected the screenshot. No credentials were printed or copied.

## Remaining risks

- The next CI run must verify drag, blade, trim, Undo/Redo, render and cancel. The previous run proves none of those after line 331.
- If Playwright `dragTo` itself fails before the evidence write, `drag-evidence.json` will still be absent; capturing pre-drag geometry separately would improve diagnosis.
- Repository-local Graft was not on OpenCode's PATH for this run. Codebase-memory answered its queries; its reported head matched `dd72fe7` during triage, but later synchronization remains a separate check.
- No live provider, model inference, or real external pack was tested.
