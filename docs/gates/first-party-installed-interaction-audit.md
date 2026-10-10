# Windows installed-app first-party interaction audit

Status: **scoped pass; wider feature gate remains open**. The sweep used the final installed `Hyper-Studio.exe`, a disposable project under `.local-tmp`, a loopback Custom HTTP server, and the repository-local shared storage provisioned by the earlier packaged Workflow smoke. It used no live credentials, external model pack, or hosted provider call.

Evidence: [smoke script](../../scripts/smoke-first-party-controls.mjs), [final log](../../.local-cache/first-party-controls-final.log), and `.local-tmp/first-party-mv2z0ugc/` (per-step JSON, screenshots, saved/exported Workflow JSON). The final run exited successfully. Earlier exploratory runs were superseded; their root-level `q...` fixtures were verified and removed. The script now creates its project under `.local-tmp`.

| Area | Controls actually clicked and result | Still untested in this sweep |
| --- | --- | --- |
| Home and Explore Tools | Home; Explore Tools; VFX category; Layout to Render result; Escape dismissal all worked. | Every tool card and form, search keyboard navigation, generation from a tool. |
| Settings and Connections | Settings opened; General, Connections, Legacy, About tabs opened. A named Custom HTTP connection was created, its configuration check returned valid, and Delete removed it. | Appearance toggles, vault lock/unlock, other provider forms, live credential checks. |
| Project dialogs | Create, Rename, Remove dialogs each kept focus on Shift+Tab, closed with Escape, and restored focus to their opener. Editor project creation completed. | Full forward Tab cycle, screen-reader announcements, busy-submit focus behavior. |
| Active job removal | A held loopback Custom HTTP job was submitted. Both Trash and app-only Remove clicks returned “Project has active generation jobs”; the project card and folder remained. The job was cancelled afterward. | Removal while an active Workflow engine task runs. The separate project lifecycle smoke covers successful removal paths. |
| Editor | Video Editor and Gen Space tabs opened. | Timeline trim, split, drag, undo, playback, audio, generation forms, subtitle/video/XML/PSD export. |
| Workflow and export | Workflow mode and canvas loaded. Save wrote `workflows/workflow.json`; Export wrote a byte-identical JSON file. Node Library button opened. | Canvas editing, queue execution/cancel, templates, masks, Workflow settings categories, import/open in this sweep. |
| Manager | Node Library was clicked. The separate final installed local-fixture Manager smoke passed reviewed install, queue completion, engine restart, and ImpactInt ID 90909 in `.local-cache/project-controls-manager-install.log`. | Broader Manager browse/update/uninstall and external pack installation. The embedded top Manager shortcut is hidden; missing-node review is the tested path. |

The installed interaction sweep supports only these clicked paths. It does not close the broader Editor/Workflow functional gate or platform package gates.
