# Phase 5.4 Manager interaction smoke extension

## Changed files

- `scripts/smoke-manager-local-install.mjs`: the existing offline install and restart smoke now advances its local Git fixture, drives **Try Update** and **Uninstall** through the installed Manager UI, checks submitted queue payloads and durable batch results, and verifies the shared extension folder matches the updated commit before removal. Browser requests outside loopback are aborted and reported; subprocess HTTP(S) proxy settings point to a closed local port. The install review cancel assertion remains.

## Commands and results

| Command | Result |
| --- | --- |
| `node --check scripts/smoke-manager-local-install.mjs` | Pass (syntax) |
| `git diff --check -- scripts/smoke-manager-local-install.mjs` | Pass |
| `& .\scripts\with-local-env.ps1 node .\scripts\smoke-manager-local-install.mjs` | Blocked before project creation: local `win-unpacked/Hyper-Studio.exe` lacks `window.electronAPI.setConnectionOnboardingSkipped`. The current source calls it; this executable predates that bridge. No Manager assertions ran. |

## Gate status and risk

**Pending fresh installed Windows run.** Expected Manager assertions: canceled install queues 0 tasks; confirmed install queues 1 and survives restart with imported node ID 90909; update queues 1 and reaches the second local Git commit; uninstall queues 1 and removes the shared extension folder. If the UI reports a different installed-version state after restart, the Try Update selector must be corrected from fresh package evidence. The stale local binary is not a release gate result.
