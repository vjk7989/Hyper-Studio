# Phase handoff

## Phase 0: Repository scaffold

**Scope:** Create the minimal project structure, preserve the supplied logo, prepare a rounded variant, and verify a repository-local Graft workflow.

**Product decisions pending:** Define the first usable user workflow, required screens, and acceptance criteria before choosing a framework or writing application code.

**Next phase entry criteria:** A concrete first workflow and its acceptance criteria are available. Confirm the rounded logo in the actual UI layout.

**Completed:** The supplied logo and rounded variant were copied into `assets/`. Graft 0.21.1 was installed locally in `.tools/graft/`, and `init --agents agents --no-global --no-hooks --no-mcp` created `AGENTS.md` and built the ignored `graft/` graph. Graft also created `.ignore` so the graph remains searchable locally.

**Verification:** `node .tools/graft/node_modules/@nanonets/graft/dist/cli.js init --help` succeeded. `init --dry-run --agents agents --no-global --no-hooks --no-mcp` wrote nothing. The actual `init` succeeded. `node .tools/graft/node_modules/@nanonets/graft/dist/cli.js check` reported that the wiring graph is in sync. It contains 0 code nodes because there is no application code yet. No application tests exist for this scaffold phase.

**Local tool setup:** Before installing or running npm packages, set `npm_config_cache` to this repo's `.local-cache/npm`, and `TEMP`, `TMP`, and `TMPDIR` to this repo's `.local-tmp`. Run `npm install --prefix .tools/graft --no-save --no-package-lock --no-audit --no-fund @nanonets/graft@0.21.1` to restore the ignored local installation. Set `DO_NOT_TRACK=1` for the Graft install and commands if anonymous telemetry is not wanted. Invoke Graft through `node .tools/graft/node_modules/@nanonets/graft/dist/cli.js`.
