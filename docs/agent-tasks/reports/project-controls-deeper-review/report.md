# OpenCode read-only follow-up: installed control gaps

Repository-local OpenCode V2 2.0.26, `opencode/space-bunny-free`, read-only `plan` agent. Exit 0; it made no source edit. [Bounded task](../../project-controls-deeper-read-only-investigation.md); full transcript is `opencode-full.log` in this directory. Codex reviewed the findings against source and installed evidence.

| Command through `scripts/with-local-env.ps1` | Result |
| --- | --- |
| Editor action regression with its loader, run from `apps/desktop` | 1 passed, 0 failed |
| Vue `useConflictDetection.test.ts` | 12 passed, 0 failed |

**Accepted:** The multi-tab Workflow smoke creates an unlinked `SaveImage` in an earlier tab, then runs a separate linked graph. That fixture explains the transient “required input missing” warning alongside a successful output. The clean isolated linked-graph run passed. Stale error presentation across tabs remains a possible UX issue; this investigation did not reproduce an incorrect execution result.

**Rejected after reproduction:** OpenCode inferred that autosave could not clear Editor Undo because the store is created once per mount. A delayed installed-app assertion reproduced Undo becoming disabled after the project save without an explicit reopen. Codex traced an unresolved visual-asset metadata migration rerunning on each save and remounting the Editor. The product fix and installed rerun are tracked in `docs/gates/editor-control-smoke.md` and the current Windows gate report. OpenCode's static conclusion is not accepted as a pass.

**Codex follow-up:** A stable migration key now avoids retriggering unresolved asset work on unrelated saves. The rebuilt final7 installed Editor smoke passed the delayed Undo assertion after autosave, plus reopen and FCPXML export. Its first retry also exposed an overly strict harness count: the Editor and workspace index may each have a record for the same imported file. The assertion now verifies both unique media paths survive reopening. Source test: 2/2; desktop suite: 1,483/1,483.

Next local checks from the report: delayed Undo after autosave, Workflow success without stale validation warning, and appearance persistence. No live credential or model pack was used.
