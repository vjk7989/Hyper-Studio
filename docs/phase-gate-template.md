# Phase gate report template

Copy this template to `docs/gates/phase-N.md` when completing a phase. Record failures and the fix before proceeding. Do not mark a gate passed based on an earlier agent's report without a reproducible command or inspected artifact.

## Identity

- Phase / date / host OS and architecture:
- Commit or working-tree checkpoint:
- Imported source revisions and licenses touched:
- Scope delivered:
- Scope still pending:

## Checks

| Check | Exact command or inspection | Result | Evidence / notes |
| --- | --- | --- | --- |
| Automated tests |  | Pending |  |
| Type/lint checks |  | Pending |  |
| Frontend/Electron/backend build |  | Pending |  |
| Security/path/secret checks |  | Pending |  |
| Cross-mode workflow |  | Pending |  |
| Surface/asset scan |  | Pending |  |
| Manual UI/packaging smoke |  | Pending |  |
| Graft map/check |  | Pending |  |

## Failures and fixes

| Failure | Root cause | Fix | Re-run evidence |
| --- | --- | --- | --- |
|  |  |  |  |

## Gate decision

- **Status:** Pending / Passed / Failed / Blocked
- **Reason:**
- **Next-phase entry criteria:**
- **Architecture/code-map/handoff updates:**

Tests that require a platform, runtime, model, or external credential unavailable on this host should be recorded as unverified, not passed.
