# Phase 5.4 cold process reopen smoke

## Scope

Added `scripts/smoke-cold-reopen.mjs`. It uses a fresh repository-local home and project, imports an Editor image, registers a Workflow output image, switches to Workflow, closes the Electron process, relaunches with the same home, opens the project from its Projects card, verifies the same project ID and selected mode, then checks both images in Workflow Shared files and Editor asset cards. It does not call hosted providers or download models.

## Commands and results

| Command | Result |
| --- | --- |
| `node --check scripts/smoke-cold-reopen.mjs` | Pass (1 syntax check). |
| `node scripts/smoke-cold-reopen.mjs` with `HYPER_STUDIO_SMOKE_EXE=.local-tmp/installed-project-controls-final/Hyper-Studio.exe` | Blocked before project creation: that older installed binary lacks `setConnectionOnboardingSkipped`. |
| Same command with `.local-tmp/installed-project-controls-final7/Hyper-Studio.exe` | Same older-binary API mismatch. |
| Same command with `apps/desktop/release/win-unpacked/Hyper-Studio.exe` | Same older-binary API mismatch. |

Full local output: `.local-tmp/cold-reopen-run.log`. These three failures do not establish a current-source defect. Run the script against a fresh installed app from the current branch in the Windows gate.

## Acceptance status and risks

- Project identity, selected mode, durable media index, Workflow list, and Editor card checks are implemented but **await a fresh installed-app run**.
- Provider key isolation is covered by separate provider tests; this script does not create or log credentials.
- The Workflow engine must be available in the gate's repository-local shared storage. The script does not install it implicitly.
