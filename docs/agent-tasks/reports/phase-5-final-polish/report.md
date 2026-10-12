# Phase 5.6 OpenCode read-only log audit

Runner: repository-local OpenCode 2.0.26, `opencode/space-bunny-free`, `plan` agent. Task: [`phase-5-final-polish-read-only-audit.md`](../../phase-5-final-polish-read-only-audit.md). Full transcript: `opencode-full.log`. The bounded session was stopped after its log review at the Codex lead's request; Codex completed this concise report from the transcript and source logs. OpenCode changed no source files.

Commands reviewed include the repository-local Graft `map`/`ask` calls, attempted codebase-memory `index_status`, `git diff`, the `final-polish-*` logs, and built brand-audit JSON. The transcript shows the codebase-memory call but no returned status, so graph synchronization is not verified by this run.

| Evidence reviewed | Result |
| --- | --- |
| `.local-cache/final-polish-desktop-tests.log` | 1,495 passed, 0 failed, 0 skipped |
| `.local-cache/final-polish-editor-tests.log` | 2 passed, 0 failed |
| `.local-cache/final-polish-vue-tests.log` | 22 passed across 4 files, 0 failed |
| `.local-cache/final-polish-python-tests.log` | 3 passed, 0 failed |
| Typechecks, desktop/Vue/remote builds, NSIS build | Logs show no failing diagnostic; desktop and Vue typecheck logs are empty on success |
| Fresh installed Windows smokes | First run, projects, first-party controls, Editor, Workflow, Manager, provider cross-mode, cold reopen, and mode switching report passes; no logged failure |

**First failing test:** none in the reviewed logs. **Changed files by OpenCode:** none. Codex compared `git status` and the dark-default, splash, Projects, Connections, and smoke-test diff; other agents' concurrent changes were already present or arrived during the run.

**Timing:** warm mode-switch p95 was 51 ms over ten toggles. Cold-window timings were 717 ms at baseline, 1,196 ms in the post-change unpacked run, and 709 ms in the fresh installed run. Median reload-to-usable was 977 ms at baseline and 361 ms after the splash change. The evidence supports a faster reload transition, but **does not establish a cold-launch speedup**; the two cold runs have different packaging/conditions and only one sample each. First Workflow entry was 15,872 ms in the installed smoke.

**Evidence gaps and risks:** The brand audit exited successfully but its JSON records 184 unallowed source matches. Compiled Workflow text contains 313 ComfyUI/comfyui hits, whose visibility and compatibility role were not classified. The remote bundle contains 16 Lightricks hits; source searches show provider model repository and license URLs with that publisher name, but each compiled hit was not mapped individually. The audit reports zero residual visual filenames, which is narrower than a complete shipped-string rebrand. NSIS logs mention a missing optional `python-deps-hash.txt` source and `signtool.exe` steps; installed smokes passed, but signing status should be checked from the package signature rather than inferred from that log. Live hosted providers, model inference, and external pack installation remain unverified without their inputs.
