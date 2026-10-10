# Repository-local OpenCode V2 runner

OpenCode V2 is an additional managed worker. Existing Codex agents remain responsible for their assignments and phase gates. A Codex runner writes a bounded task file first, executes OpenCode, retains full logs locally, reviews findings and source diff, and accepts work only after the relevant gate passes.

## Installation and isolation

- On 2026-10-10, the official `@opencode/cli` npm `latest` tag was `2.0.26`. The [official V2 install page](https://opencode.ai/v2/docs/) links a Windows x64 standalone binary. The repository-local copy is `.tools/opencode/bin/2.0.26/opencode.exe`; the download is `.tools/opencode/downloads/opencode-windows-x64-2.0.26.zip`. No global installer ran; an existing separate V1 `1.18.35` installation was untouched.
- Download SHA-256: `83562488E23C3F893989D915EF664841BF2745DA81B4FA57C5572B72C25456DC`. Binary SHA-256: `E13E57A7F6B7ABDDEC887E0B2D912D22484077C50DFF5BED4F3199BCF63B6088`. These are local fingerprints, not a publisher signature.
- Always invoke `scripts/run-opencode-local.ps1` from this repository. It sets Windows home/profile, APPDATA, XDG config/data/state/cache, DB, npm cache, and temporary directories under `.tools/opencode`, then changes to the repository root. Auto-update is disabled. The local config also disables updates and snapshots.
- `debug paths` reported every OpenCode path under `.tools/opencode`, including DB, log, cache, config, and temporary files. The initial model-list probe wrote the local database, log, and state; the checked external OpenCode directory timestamps did not change. This is a path and observed-write check, not a system-wide trace.
- The binary, downloads, credentials, sessions, caches, logs, and temporary files are ignored by Git. Do not commit secrets or raw provider errors. Task reports under `docs/agent-tasks/reports/` should be concise and redacted; full `.log` files remain local and ignored.

## Current worker status

The first bounded task is `phase-3-test-investigation.md`. It is read-only and owns no source files. OpenCode reached authentication but could not execute tests: the inherited OpenAI credential was rejected, OpenRouter reported insufficient credits for its default request size, and the inherited Anthropic credential was rejected. The [runner report](reports/phase-3-investigation/report.md) records the attempts without credential values. A usable provider connection is required before retrying the investigation or assigning a coding task. Codex ran the Phase 3 gate independently.

## Task protocol

Each task file must state phase, owned files, exact commands through `scripts/with-local-env.ps1`, acceptance checks, and report format. Coding work gets a disjoint file set; if concurrent edits would collide, create its worktree inside `G:\Hyper-Studio`. The Codex runner captures full logs under the repository and verifies storage paths and `git diff`. Codex reviews the report and diff before accepting a patch. A failed gate is fixed and rerun before moving to the next phase.
