# Phase 4 — workflow file edge cases: report

Task: `docs/agent-tasks/phase-4-workflow-files-edge-cases.md`
Date: 2026-10-10
Status: complete — all gates green.

## Commands and results (exact exit codes)

All commands run from `apps/desktop` through the repo-local wrapper.

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `..\..\scripts\with-local-env.ps1 node --version` | 0 | Node v22.18.0 |
| 2 | `..\..\scripts\with-local-env.ps1 node --experimental-strip-types --test --test-reporter=spec electron/workflow-files.test.ts` (baseline, pre-change) | 0 | tests 2, pass 2, fail 0 |
| 3 | same as #2 (after the change) | 0 | **tests 20, pass 20, fail 0, skipped 0** |
| 4 | same as #2 with `workflow-files.before.ts` swapped back in | **1** | tests 20, pass 18, **fail 2** (proves the new tests catch the real bugs) |
| 5 | `..\..\scripts\with-local-env.ps1 corepack pnpm scripts:test` | 0 | copy-koffi TAP: 6/6 pass; full spec run: **tests 1467, pass 1467, fail 0, skipped 0** |
| 6 | `..\..\scripts\with-local-env.ps1 corepack pnpm typecheck:ts` | 0 | `tsc --noEmit && node scripts/typecheck-internal.mjs` — no diagnostics |
| 7 | clean re-run of #3, #6 and #5 after all edits | 0 / 0 / 0 | same counts, confirming the final tree state |

Logs: `focused-baseline.log`, `focused-after.log`, `focused-against-before.log`,
`focused-final.log`, `desktop-scripts-test.log`, `desktop-typecheck-ts.log`,
`desktop-scripts-test-final.log`, `desktop-typecheck-ts-final.log`,
`baseline-node-version.txt`, `workflow-files.diff.txt`, `git-status-before.txt`,
`git-status-after.txt`, `owned-hashes-before.txt`, `owned-hashes-after.txt`.

## Files changed (only the two owned files)

- `apps/desktop/electron/workflow-files.ts` — 9E3277D341C159D244169D754464DB248CF3267662835D82584D844FA410FCB7
- `apps/desktop/electron/workflow-files.test.ts` — 8FE6B6CBF08D4D83956AD7B8402AA5B8CF82D483BF2B93FA748787219F23806E

`git status --porcelain` is byte-identical before and after the session
(`git-status-before.txt` vs `git-status-after.txt`), so no other tracked or
untracked source file was touched.

## Bugs found and fixed

### 1. Export wrote through a destination symlink (security)

`exportProjectWorkflow` used `fs.copyFileSync(source, destinationPath)`.
`copyFileSync` opens the destination for writing, which follows a symlink. A
destination symlink therefore let the export overwrite an arbitrary file
outside the chosen folder. Proven on this machine: the outside file's content
went from `{"untouched":true}` to the exported workflow body (log
`focused-against-before.log`, test at line 259).

Fix: stage the validated bytes in a sibling `*.tmp` and `renameSync` over the
destination. `rename` replaces the link itself, so the target is never written.

### 2. Export was not atomic

`copyFileSync` truncates the destination as it opens it. Any failure after the
open (disk full, I/O error) leaves a truncated/half-written export where the
user's previous export used to be. The same stage-then-rename now applies as in
`saveProjectWorkflow`, with the temporary file removed in `finally`.

### 3. Import crashed on a collision for near-limit filenames

The collision loop built `${parsed.name} (${suffix})${parsed.ext}` and passed it
straight to `workflowName`, which caps names at 128 characters. A source whose
name is 125–128 characters imports once and then throws
`Invalid workflow filename` on the second import instead of picking a free name
(`focused-against-before.log`, test at line 104).

Fix: `collisionName()` truncates the stem so `stem + " (n)" + ext` fits the cap,
stripping trailing dots/spaces so the truncated name stays stable on Windows.

### 4. Export destination was not normalised

`destinationPath` went straight into `${destination}.${randomUUID()}.tmp`; a
destination ending in a separator produced a temp path outside the target. Now
`path.resolve()`d first.

## Coverage added (one bug per test)

Requirement 1 — raw bytes and node identifiers:

- keeps imported node identifiers and raw JSON intact (extended existing test)
- does not reinterpret numeric or string node ids on save and open — `7`, `"7"`,
  `"08"`, `0` must stay distinct and keep their JSON types
- stores the exact bytes of a valid workflow instead of re-serialising it — a
  payload with `\/`, a duplicate key, non-ASCII, `1e400` and a 20-digit integer
  is byte-identical on disk, so any `JSON.parse`/`stringify` round trip fails it
- exports the workflow bytes verbatim

Requirement 2 — collisions:

- imports a colliding source under a new name without touching the existing
  workflow — third import yields `incoming (2).json`, existing bytes unchanged
- truncates a near-limit source name instead of throwing on collision

Requirement 3 — rejection without damage:

- rejects escape paths and malformed JSON (extended existing test)
- leaves the stored workflow untouched when a save payload is rejected — six
  rejected payloads, byte-identical file, no leftover `.tmp`
- rejects a malformed import without writing a partial workflow
- rejects a workflow payload over the 20 MB cap but accepts one at the cap —
  exact boundary, built with `payloadOfSize()` rather than hand-counted padding
- rejects an oversized import source without writing anything

Requirement 4 — filename validation and containment:

- rejects workflow names that escape, nest or target a reserved device
  (`../`, `..\`, `nested/`, `C:evil.json`, `CON.json`, `nul.json`, `com1.json`,
  `.`, `..`, blank)
- rejects a workflow name over 128 characters or without a `.json` extension,
  and still accepts a 128-character name and `MiXeD.JSON`
- refuses to open a workflow name that is a symlink out of the project
- refuses to save through a workflow name that is a symlink out of the project
- omits symlinked entries from the project workflow list

Requirement 5 — export safety:

- replaces an existing export destination in one step and leaves no temp file
- leaves the previous export destination intact when the replacement fails
  (read-only destination; self-skips with a reason if the filesystem allows the
  replacement, e.g. root on Linux)
- fails the export without destroying a destination that is a directory
- replaces an export destination symlink instead of writing through it

Symlinks were creatable in this environment (Windows, no Developer Mode prompt
observed — `symlinkSync` for both file and junction targets succeeded), so no
symlink assertion was skipped. The `link()` helper still calls `t.skip()` with
an explicit reason when the platform returns `EPERM`/`EACCES`/`ENOSYS`, and that
is the only mechanism that skips an assertion. The read-only-destination test is
the only other self-skipping test.

## Remaining risks

- **Export now needs a writable directory, not just a writable file.** Staging
  the temp file beside the destination fails with `EPERM`/`EACCES` when the
  directory is read-only but the destination file itself is writable. That is
  the deliberate cost of atomic replacement; the old copy-based path still
  truncated the destination in that scenario.
- **TOCTOU between `statSync` and `readFileSync`** in `readWorkflowJson`: a file
  replaced between the size check and the read is not re-checked. Unchanged, out
  of scope for this task.
- **A UTF-8 BOM still makes a workflow unreadable** — `JSON.parse` rejects the
  leading `﻿`. Left alone as out of scope; if it needs fixing, the fix is to
  strip the BOM for the parse only and keep the raw string for storage.
- **The 20 MB cap is enforced per file, not across a project.** Many 20 MB
  workflows will fill a disk. Pre-existing behaviour, unchanged.
- **The symlink guards come from `project-workspace.ts`**, which this task does
  not own. The tests pin the observable behaviour (`open`/`save`/`list` refuse
  symlinked workflow names), so a regression there will fail these tests.