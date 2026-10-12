# Phase 5.5 brand package cleanup plan (read only)

## Phase

Phase 5.5 preparation while the Phase 5.4 Windows gate remains open.

## Owned files

- `docs/agent-tasks/phase-5-brand-package-plan-read-only.md`
- `docs/agent-tasks/reports/phase-5-brand-package-plan/report.md`

## Constraints

- Read the codebase-memory graph before direct file inspection.
- Do not edit application source, build configuration, tests, or gate records.
- Do not build, install dependencies, download models, or delete files.
- Preserve local Workflow features, imported workflow and node identifiers, provider/model names, Manager compatibility names, and legal attribution.
- Treat the existing unpacked package as evidence from an earlier build; require a fresh package before declaring the cleanup complete.

## Investigation

1. Confirm the indexed repository snapshot and inspect the Workflow and Desktop architecture boundaries.
2. Trace embedded account/cloud imports and current compile-time guards.
3. Inspect Workflow sourcemap generation and Electron `extraResources` packaging.
4. Locate the unreachable Desktop API Keys form and its migration to Connections.
5. Specify implementation order, focused tests, package assertions, and brand-audit changes.

## Acceptance checks

- The report names exact source/config areas and separates safe map removal from cloud code pruning.
- It does not propose deleting arbitrary emitted JavaScript chunks after bundling.
- It identifies positive local-feature checks as well as forbidden package contents.
- It states which compatibility and legal strings must remain.
- Only this task file and its report are committed.

## Report format

Keep the report concise: evidence, implementation sequence, tests/audit changes, risks, and the Phase 5.5 gate.
