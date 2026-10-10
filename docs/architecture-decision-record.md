# Architecture decision record

## ADR 0001: Defer the application stack

- **Status:** Accepted for the scaffold phase
- **Context:** The product's first workflow and required screens are still unspecified.
- **Decision:** Keep this phase to a repository scaffold, brand assets, local Graft setup, and handoff notes. Choose the application stack after the first workflow is defined.
- **Reason:** This follows YAGNI and avoids dependencies or UI code that may not serve the product.
- **Consequence:** There is no runnable application yet.

## ADR 0002: Keep tooling artifacts in the repository

- **Status:** Accepted
- **Context:** The user requested that dependency downloads and builds stay in this folder because other drive space is constrained.
- **Decision:** Place npm cache and temp paths under `.local-cache/` and `.local-tmp/`; install local tools under `.tools/`. Ignore those paths in Git. Keep Graft's generated graph ignored.
- **Consequence:** Contributors must set local cache/temp environment variables before installing or building dependencies.
