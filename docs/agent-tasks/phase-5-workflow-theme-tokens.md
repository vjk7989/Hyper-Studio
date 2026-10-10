# OpenCode coding task: Phase 5 workflow theme tokens

**Status:** Authorized after the Phase 4 gate passed on 2026-10-10. Codex runner owns launch and review.

## Objective

Map the approved Vercel-inspired monochrome light/dark palette, Geist-first typography, and `0.5rem` base radius into the existing Vue workflow design system. Keep the current Tailwind/PrimeVue token structure so the embedded canvas adopts the theme without adding a second component library. This is a CSS-token task, not a general rebrand pass.

## Ownership and boundaries

- You may edit only `apps/workflow-ui/packages/design-system/src/css/_palette.css`, `style.css`, and `fonts.css`.
- Do not edit Vue components, desktop files, icons, font binaries, package metadata, lockfiles, CI, runtime files, or documentation. Do not install dependencies, download model packs, or use credentials.
- Preserve existing semantic CSS variable names and compatibility selectors, including `.dark-theme`, `--comfy-*`, node color/type indicators, state colors, and API-facing names. Change token values and mappings rather than removing variables consumers rely on.
- Use the user-supplied theme at `https://tweakcn.com/r/themes/vercel.json` as the intended style reference. If it cannot be fetched, report that and use the approved plan's monochrome light/dark, Geist, and `0.5rem` guidance without inventing additional brand colors. Do not copy its component code.
- Respect the shared workspace. Verify the working tree before editing; if another agent is changing an owned file, stop and report the collision.

## Steps

1. From the repository root, discover the existing design-system theme tokens with the configured repository-local codebase-memory MCP graph first; its snapshot may predate Phase 5, so use file reads for CSS where it lacks token detail. Run the repository-local Graft CLI at .tools/graft/node_modules/.bin/graft.cmd map --max-dirs 12 for orientation. Inspect the desktop design tokens read-only to align visible light/dark surfaces. Do not reindex the shared graph during concurrent work.
2. Update the owned CSS tokens for neutral surfaces, foregrounds, borders, hover/selected states, and focus appearance. Keep semantic success/warning/error and node datatype cues legible. Use Geist as the first font-family name with installed/system fallbacks; do not reference a font file that is not present. Set the shared base corner radius to `0.5rem` while leaving intentional node/shape exceptions intact.
3. Check both light and `.dark-theme` mappings for contrast and undefined variables. Limit edits to the smallest useful CSS diff.

## Commands and acceptance checks

Run from `G:\Hyper-Studio\Hyper-Studio`, with all temporary/cache files under this repository, through `scripts/with-local-env.ps1`:

```powershell
& .\scripts\with-local-env.ps1 node .tools/pnpm11/node_modules/pnpm/bin/pnpm.cjs --dir apps/workflow-ui exec stylelint packages/design-system/src/css/_palette.css packages/design-system/src/css/style.css packages/design-system/src/css/fonts.css
& .\scripts\with-local-env.ps1 node .tools/pnpm11/node_modules/pnpm/bin/pnpm.cjs --dir apps/workflow-ui --filter '@comfyorg/design-system' typecheck
& .\scripts\with-local-env.ps1 node .tools/pnpm11/node_modules/pnpm/bin/pnpm.cjs --dir apps/workflow-ui build:desktop-dist
```

Acceptance: all commands exit 0; light and dark semantic tokens remain defined; no new package/dependency; diff contains only the three owned CSS files. If a check fails, investigate and fix within ownership, rerun it, and report any remaining blocker. Do not mark Phase 5 complete; Codex will review the diff and run visual/package gates.

## Runner and report

The Codex runner launches repository-local OpenCode v2 with `opencode/space-bunny-free` from the repository root using `scripts/run-opencode-local.ps1`, passing this file. Capture the full OpenCode transcript at `docs/agent-tasks/reports/phase-5-workflow-theme/opencode-full.log` and the exit code at `opencode-exit.log`. Write a concise `report.md` there with commands and pass/fail results, changed files, theme decisions, any failed checks/root cause, and remaining visual or platform risks. Do not put full logs in the chat.
