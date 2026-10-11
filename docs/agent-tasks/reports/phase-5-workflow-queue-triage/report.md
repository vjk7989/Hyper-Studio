# Phase 5.4 Workflow queue-cancel triage

Repository-local OpenCode 2.0.26 (`opencode/space-bunny-free`, `plan`) read the bounded task and inspected the smoke, engine log, UI state, and Graft graph. Codex stopped it after the focused finding when it began tracing Playwright internals. The OpenCode run therefore exited **1/interrupted**, and this report is Codex's review of its partial evidence, not a completed OpenCode conclusion. Full transcript and exit record are the ignored `opencode-full.log` and `opencode-exit.log` beside this report. OpenCode made **no source edit**.

## Evidence

| Check | Result |
| --- | --- |
| `git status --short`, `git log -1 --oneline` | Ran; task began at `bdc295c`. Existing unrelated untracked files were present. |
| Repository-local `graft --version`, `graft map`, targeted symbol queries | Ran; Graft **0.21.1** was usable on the runner PATH. |
| Engine log | **25 `got prompt`, 25 `Prompt executed`, 0 `interrupt`**. First prompt at 00:02:42.724; last completion at 00:02:44.180. Individual completions shown near the end took 0.01–0.06 seconds. |
| `scripts/smoke-workflow-controls.mjs:154-168` | The smoke requests batch count 100, clicks Run, polls `Cancel current run` for up to 10 seconds, then asserts enabled at line **165** before awaiting a `POST /interrupt`. The installed failure was this enabled-state assertion; no interrupt was sent. |
| UI source | `ComfyActionbar.vue:30` disables Cancel when `executionStore.isIdle`; `executionStore.ts:431` defines idle as no active job ID. The button handler returns while idle, then executes `Comfy.Interrupt`. |
| Syntax | OpenCode did not reach the requested syntax command before interruption. Codex ran `scripts/with-local-env.ps1` with local Node `--check scripts/smoke-workflow-controls.mjs`: **exit 0**, syntax only. |

The tiny-image batch finished in about **1.46 seconds**. That makes the test's assumption of a sustained enabled Cancel window unreliable; the evidence does not prove whether the UI ever received an active-job event during that brief interval. Confidence is **medium** that this is a fixture timing problem, **low** that the Cancel implementation itself is broken. The batch field asked for 100 but the engine executed 25 prompts, which also needs investigation before treating batch length as a timing guarantee. Electron's separate CSP and fetch warnings do not establish the cancel cause.

## Bounded fix and edge case

Codex should give the installed smoke a **deterministic, disposable local long-running job fixture** (for example, a test-only node that waits several seconds and writes a tiny image), wait for the managed engine's active-job signal, then click Cancel and assert a `POST /interrupt` 200 response and eventual queue drain. Do not change production Cancel behavior from this evidence alone. Add a fast-job edge case asserting that a job which completes before Cancel becomes enabled leaves the button disabled without an error; separately inspect whether the 100 batch request is capped to 25 by design.

**Changed files:** this task and report only, both written by Codex. **Remaining risk:** Cancel still needs a rerun with a reliably active job; the broader Windows gate remains open. No model pack or live provider was used.
