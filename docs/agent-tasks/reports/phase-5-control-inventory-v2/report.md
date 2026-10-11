# Phase 5.4 reachable-control inventory, read-only pass

Repository-local OpenCode 2.0.26 ran `opencode/space-bunny-free` with the read-only `plan` agent and exited **0**. It followed [the bounded task](../../phase-5-control-inventory-v2-read-only.md). The full transcript and exit code remain in this report folder as local logs. Codex reviewed its claims against the current Git diff and Windows CI wiring. OpenCode made **no source edit**. Other Codex agents committed Workflow smoke changes and edited the first-run smoke during this run; those changes are not OpenCode work.

## Commands and results

| Bounded command | Result |
| --- | --- |
| Desktop focused shell/home/settings/media suites through `scripts/with-local-env.ps1` | 106 pass, 0 fail |
| Desktop focused first-run/home/project suites through the same wrapper | 31 pass, 0 fail |
| Editor action suite with the checked-in loader | 1 pass, 0 fail |
| `node --check` on nine smoke scripts | 9/9 exit 0; syntax check only |
| Workflow Manager Vitest with `--pool=threads --maxWorkers=1 --no-file-parallelism` | 35 files, 479 pass, 0 fail |
| Four additional focused Manager suites | 16 pass, 0 fail; overlapping coverage, excluded from the 479 total |

One earlier test attempt in the prior local log hit a JS heap OOM and `spawn UNKNOWN` under Vitest's default fork pool. The same focused file passed **6/6** with one thread, and the bounded 35-file Manager run passed. The observed cause is test-runner memory pressure, not a reproduced product failure. No installed app, package build, live provider, or model inference ran in this assignment.

## User-control evidence and open checks

`Pass` below means an existing installed gate report or focused test covers the stated action; it does not claim this OpenCode run repeated an installed smoke. `Gap` means the current release gate still needs installed evidence.

| Surface and expected action | Fixture and existing evidence | Status / next check |
| --- | --- | --- |
| First run: select storage, cancel/retry, choose Connect or Explore, return after restart | Disposable storage root; `smoke-first-run-storage.mjs` is wired into Windows CI | Pass in prior installed gate; re-run after current first-run smoke edit. |
| Projects/Recent: create, rename, app-only remove, Trash, reopen, keyboard menu | Disposable project folders; `smoke-project-controls.mjs` is wired | Pass in prior installed gate; keep safe-path and active-job assertions. |
| Home/Explore: navigate, search, open tools | Mock catalog; `smoke-first-party-controls.mjs` is wired | Pass in prior installed gate; deeper tool behavior remains separate. |
| Connections/Settings: add mock profile, test, busy/disabled controls, tabs, focus | Mock Custom HTTP connection; `smoke-first-party-controls.mjs` and `smoke-settings-shortcuts.mjs` are wired | Pass in prior installed gate; live providers remain unverified. |
| Theme: choose Dark and retain after renderer reload | Isolated profile; `smoke-first-party-controls.mjs` asserts `.ltx-io[data-theme=dark]` after reload | Pass for renderer reload; full process restart is a separate check. |
| Editor: asset drag, blade, trim, Undo/Redo, FCPXML and H.264 export | PNG/WAV/SRT; updated `smoke-editor-controls.mjs` is wired | **Gap:** new assertions need a fresh installed Windows run; MP4 atom check does not prove audiovisual decoding. |
| Workflow: mouse port wiring, edit/Undo, save/reopen with stable node IDs, active cancel | Linked local JSON and long-running local graph; `smoke-workflow-controls.mjs` and `smoke-workflow-run-isolation.mjs` now committed at `69ec667` | **Gap:** current Windows CI does not invoke these scripts. Their code existing or parsing is not execution evidence. |
| Manager: reviewed local pack install, update, uninstall | Disposable Git ImpactInt fixture; `smoke-manager-local-install.mjs` | **Gap:** prior install evidence exists, but update/uninstall installed smoke was blocked by a stale local binary; script is not wired to CI. |
| Cross-mode media after cold restart | Mock provider plus two project modes; `smoke-provider-cross-mode.mjs` reloads renderer | **Gap:** renderer reload is covered, full app process relaunch is not. Script is not wired to CI. |
| Export progress, cancel, and native failure recovery | Disposable timeline and local encoder | **Gap:** current smoke checks output/container and some export paths; active render cancellation and recovery need installed assertions. |

**Principal gate gap:** Windows CI invokes seven core smokes (`phase-4-platform-gate.yml:226-239`) but omits the deeper Workflow, Manager, provider cross-mode, engine, compatibility, and packaged-reopen scripts. The phase cannot be checked off from the present CI job alone. OpenCode initially described the two Workflow scripts as uncommitted; that became stale when Codex committed them at `69ec667` before this report. They remain unwired.

The repository-local Graft map answered queries but reported a rebuild in flight. OpenCode saw codebase-memory indexed at `f107240` during the run; HEAD advanced to `69ec667` afterward, so **current synchronization is unverified**. Live generation, model inference, and real third-party pack installation remain unverified without their required credentials, weights, or source.
