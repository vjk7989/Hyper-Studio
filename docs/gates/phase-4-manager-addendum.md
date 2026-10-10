# Phase 4 manager and imported workflow addendum

## Scope and result

On 2026-10-10, the current Windows unpacked package passed the expanded `scripts/smoke-workflow-compat.mjs` check. Three workflow JSON variants imported byte for byte: a missing third-party node, linked built-in nodes, and a grouped workflow containing both. The canvas retained known node ID `37`, missing node ID `90909`, the third-party package ID, and link ID `811` between built-in nodes. The managed engine served both `/v2/manager/version` and `/v2/customnode/installed` successfully.

The missing-node Install button opened a review dialog naming **ComfyUI Impact Pack** and its source repository. No install request or extension file change occurred before confirmation. After confirmation, the frontend sent one manager queue task with `kind: install`, package ID `comfyui-impact-pack`, and the matching repository URL. The test intercepted that request before it reached the manager, so no third-party package or model pack was downloaded or executed. This verifies the UI-to-manager request contract and the review boundary; it does **not** verify that a real third-party package can be installed and loaded.

## Commands and logs

Run from the repository root through `scripts/with-local-env.ps1`:

```powershell
& .\scripts\with-local-env.ps1 .tools\node-v26.8.2-win-x64\node.exe scripts\smoke-workflow-compat.mjs
```

- Current unpacked package: **passed**, 3/3 import variants, 2/2 manager API probes, reviewed install task shape matched. Full log: `.local-cache/phase4-manager-addendum-smoke.log`.
- Earlier first attempt timed out waiting for the canvas on startup; a repeat reached the canvas, imports, and review, then exposed a test locator error for the dialog action. The harness now scopes the click to the dialog; the final unpacked run passed.
- The older installed executable at `.local-tmp/installed-smoke/Hyper-Studio.exe` passed 3/3 imports but **failed** both manager API probes (HTTP 404). Its executable timestamp is 16:48; the current unpacked executable is 19:16. Full log: `.local-cache/phase4-manager-installed-smoke.log`. A fresh installer and installed-app rerun are required before claiming this manager path works in an installed release.

The smoke test uses repo-local temporary, user-data, and shared-storage folders. Existing workflow node class names and imported node IDs were not changed.
