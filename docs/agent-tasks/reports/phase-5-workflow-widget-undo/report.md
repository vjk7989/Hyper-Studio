# Phase 5.4: Workflow widget Undo/Redo smoke

## Commands and result

| Command | Result |
| --- | --- |
| `node --check scripts/smoke-workflow-widget-undo.mjs` | Pass |
| `node scripts/smoke-workflow-widget-undo.mjs` | Pass: 3 assertions groups, 0 failures, 19 seconds |

Full final run log: `.local-tmp/workflow-widget-undo-run.log`. The test uses the repository-local unpacked Windows app, existing managed Workflow runtime, and a disposable project under `.local-tmp`. It downloads no models and invokes no hosted provider.

## Coverage

Imported `EmptyImage` and `SaveImage` nodes retain IDs `17` and `29`. Playwright double-clicks the painted width widget, enters `96` through the resulting text input, and checks the graph snapshot. `Control+Z` restores `64`; `Control+Shift+Z` restores `96`. Each snapshot still has the same node IDs.

## Investigation and risks

The first attempt used an empty shared-storage folder, so the canvas never launched; using the already installed repository-local runtime resolved that fixture error. The second attempt looked for a DOM spinbutton, but LiteGraph paints this widget on canvas. A real double-click opens a text editor. The final smoke passes after locating that editor and asserting its initial value.

The run is local against the available unpacked build, not a fresh CI package. Windows keyboard shortcuts are covered; macOS shortcut mapping and other widget types are outside this bounded smoke. No application source changed.

Changed files: `scripts/smoke-workflow-widget-undo.mjs`, this report.
