# Phase 5.5 — embedded package cloud and account audit

## Phase and ownership

Phase 5.5, read only. OpenCode owns no source, test, configuration, documentation, or gate files. The Codex runner owns this task file and the report folder. Keep configuration, sessions, caches, logs, and temporary files under `G:\Hyper-Studio\Hyper-Studio`. Do not install dependencies, download models, call providers, inspect credentials, or access another drive.

## Scope

Audit the current Hyper-Studio embedded Workflow production build boundaries for inherited cloud/account material. Focus on route/bootstrap imports, `dialogService`, telemetry providers, account components, production sourcemaps, Electron `extraResources`, and existing brand/package audit scripts. Preserve local graph editing/execution, Manager review, local `/features`, provider/model names, compatibility identifiers, imported node IDs, and legal attribution.

## Commands

Run from the repository root through `scripts/run-opencode-local.ps1 run --model opencode/space-bunny-free --agent plan`. Read this file first. Run `git status --short`, `git log -1 --oneline`, `graft --version`, and focused repository-local Graft queries when useful. Use repository-local inspection and lightweight syntax/config checks only. Do not build the installer or edit any file. The runner saves full output in `docs/agent-tasks/reports/phase-5-package-cloud-audit/opencode-full.log` and the process exit in `opencode-exit.log`.

## Acceptance and report format

Write a concise report to stdout with: commands and exit codes; current production entry points that import cloud/account code; package paths or patterns that can ship source maps, promotional assets, or forbidden app-owned cloud domains; existing tests/audits that cover them; the smallest safe boundary changes; and remaining risks. Distinguish shipped reachability from dormant source retained for upstream compatibility. Cite paths and line numbers. Changed files must be none. Codex will review the report and diff before accepting any finding.
