## Session: 2026-04-06 — Connector Multi-Platform Design & Partial Implementation

**Goal:** Design and begin implementing multi-platform connector extensibility for the PIM system
**Branch:** `refactor/CR-081-review-refactor-be-architect`
**Commits:** 4 (`7c94dd8..bbea1b5`)

**What was done:**
- Full architectural code review of connectors module (10 findings: 4xP1, 4xP2, 2xP3)
- Brainstorming session with 7 clarifying questions covering: Rakuten connector split, fallback routing, UX behavior, Rakuten API research, data mapping strategy, auth encapsulation
- Approved design spec: `docs/superpowers/specs/2026-04-06-connector-multi-platform-extensibility-design.md`
- 11-task implementation plan: `docs/superpowers/plans/2026-04-06-connector-multi-platform-extensibility.md`
- Implemented Task 2: ValueUnwrapperRegistry + Amazon value unwrapper extraction
- Implemented Task 3: PayloadBuilderRegistry + AmazonPayloadBuilder registration
- Code review of Tasks 2-3: 2 important issues found (test uses inline copy, missing primitives branch)

**Decisions made:**
- RakutenPublicConnector is system-level singleton (Admin configures, all sellers share) — NOT per-seller
- RakutenRMS (seller connector) deferred — needs RMS API research first
- CatalogResolutionStrategy as new routing layer between service and connectors
- User selects catalog source from dropdown (default Rakuten), not automatic fallback
- Hybrid data mapping: connector unwraps NormalizedListing.values, MappingEngine uses platform-aware UnwrapperRegistry for .raw
- Auth stays encapsulated per connector — no shared auth abstraction
- Separate ValueUnwrapperRegistry (import) and PayloadBuilderRegistry (export) — same pattern, different concerns

**Key prompts that worked well:**
- `/code-review-expert` for initial structured review with severity levels
- `/brainstorming` with incremental Q&A (one question at a time, multiple choice)
- `/writing-plans` for detailed task-by-task plan with exact file paths and code

**Next steps:**
- Fix 2 important issues from code review (inline test copy, missing primitives branch)
- Execute Tasks 1, 4-11 from the implementation plan
- Tasks remaining: unified types, MappingEngine platform param, move ConnectorRegistry, RakutenPublicConnector, CatalogResolutionStrategy, CatalogController, wire delegation, platform-agnostic family naming, integration test
