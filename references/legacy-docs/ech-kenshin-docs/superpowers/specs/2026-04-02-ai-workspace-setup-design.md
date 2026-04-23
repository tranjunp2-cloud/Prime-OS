# AI Workspace Setup — Design Spec

> Setup a shared, secure, token-efficient AI workspace for ECH-Kenshin that works across multiple AI tools and a team of >8 developers with mixed tooling.

## Context

ECH-Kenshin is a multi-tenant SaaS platform (PIM + OmniChannel Commerce) built as a pnpm monorepo with Turborepo. The team uses multiple AI coding tools (Claude Code primary, plus Cursor, Copilot, Zed AI, etc.). Current state has `AGENTS.md` with good content but incomplete docs, no shared AI skills/rules, and `.claude/` fully gitignored preventing shared Claude Code config.

## Goals

1. **Shared knowledge layer** — project context, living knowledge, reusable skills all git-tracked
2. **Multi-tool compatible** — Claude Code, Cursor, Copilot, Zed AI all read the same source of truth
3. **Zero-config onboard** — pull code, read one setup guide, start working
4. **Security enforced** — no secrets in docs, confirm before commit, session isolation
5. **Token efficient** — index-based navigation, AI reads only what's relevant
6. **Consistent** — every AI session (any tool, any model) has the same understanding of the project

## Non-Goals

- Automated CI enforcement of docs updates (Approach 3 — future enhancement)
- Tool-specific plugins/extensions auto-install (manual via setup guide)
- Per-user AI memory sync across team members

---

## Design

### 1. Folder Structure

```
root/
├── AGENTS.md                          # Universal AI entry point (enhanced, max 200 lines)
├── CLAUDE.md                          # Claude Code specific config (lightweight)
├── .cursorrules                       # Cursor native config → references AGENTS.md + .ai/rules/
├── .github/copilot-instructions.md   # Copilot native config → references AGENTS.md + .ai/rules/
├── TASK.md                            # (existing — current task tracking)
│
├── .claude/                           # Claude Code project config
│   ├── settings.json                  # GIT-TRACKED — project-level settings
│   ├── commands/                      # GIT-TRACKED — custom slash commands
│   │   ├── create-endpoint.md
│   │   ├── create-module.md
│   │   └── review.md
│   └── memory/                        # GITIGNORED — personal per-user
│
├── .ai/                               # Shared AI workspace (tool-agnostic, git-tracked)
│   ├── setup.md                       # Plugin/tool install guide per AI tool
│   ├── agents/                        # Agent personas
│   │   ├── senior-frontend.md
│   │   ├── senior-backend.md
│   │   ├── security-auditor.md
│   │   └── database-expert.md
│   ├── skills/                        # Shared workflows (tool-agnostic)
│   │   ├── _index.md
│   │   ├── create-nestjs-module.md
│   │   ├── create-react-page.md
│   │   ├── api-endpoint-checklist.md
│   │   └── pr-review-guide.md
│   └── rules/                         # Domain-specific rules all AI tools MUST follow
│       ├── security.md                # CANONICAL source for security rules
│       ├── frontend.md
│       ├── backend.md
│       └── database.md
│
├── docs/
│   ├── INDEX.md                       # Master index — AI reads this FIRST after AGENTS.md
│   ├── architecture/
│   │   ├── overview.md                # System architecture, tech stack, deployment topology
│   │   ├── data-flow.md              # Request lifecycle, event flow, BullMQ job patterns
│   │   └── adr/                       # Architecture Decision Records
│   │       └── 001-modular-monolith.md
│   ├── product/
│   │   ├── prd-overview.md            # Product vision, target market, key features
│   │   └── domains/
│   │       ├── pm-product-master.md
│   │       ├── inv-inventory.md
│   │       ├── oms-order.md
│   │       └── ful-fulfillment.md
│   ├── standards/
│   │   ├── coding.md                  # Naming conventions, patterns, error handling
│   │   ├── security.md               # Human-readable security standards → references .ai/rules/security.md
│   │   └── api.md                     # Reference pointer to Scalar API docs
│   ├── onboarding/
│   │   ├── setup.md                   # Clone → install → run in 5 minutes
│   │   └── env-guide.md              # .env.example walkthrough (no real values)
│   ├── status/
│   │   └── LIVING.md                  # Current sprint, known issues, don't-touch zones, migrations
│   └── CONTRIBUTE.md                  # (existing — gitflow, PR process, code review)
│
├── apps/
│   ├── server/README.md               # (exists — will be overwritten with project-specific content)
│   ├── client-portal/README.md        # (exists empty — will be populated)
│   └── admin-portal/README.md         # (new)
│
├── packages/
│   ├── database/README.md
│   ├── core/README.md
│   ├── ui/README.md
│   ├── form-engine/README.md
│   ├── amazon-wizard/README.md
│   ├── biome-config/README.md         # (existing package, needs README)
│   └── typescript-config/README.md    # (existing package, needs README)
```

**Key constraints:**
- `AGENTS.md` MUST stay under 200 lines. Detailed content goes in linked files.
- `.ai/rules/security.md` is the CANONICAL source for security rules. `AGENTS.md` contains a summary with a pointer. `docs/standards/security.md` is the human-readable version that references the canonical source.
- Non-AI-tool users: these files are documentation-only and do not affect build, test, or deploy workflows.

### 2. `.gitignore` Changes

Current `.gitignore` has `.claude` fully ignored. Change to selective ignore.

**Migration risk:** Changing from `.claude` (full ignore) to selective ignore will cause git to "see" personal files that were previously hidden. Migration steps are required (see Migration Plan below).

```gitignore
# Claude Code — track shared config, ignore personal
.claude/*
!.claude/settings.json
!.claude/commands/
# This pattern ignores everything in .claude/ EXCEPT settings.json and commands/
# Personal memory, plugins, and other files remain ignored

# Shared AI workspace — TRACKED (do NOT ignore)
# .ai/ is committed to git

# Personal AI workspaces — IGNORED
.agents
.agent
.factory
.opencode
.github/skills/
.github/prompts/
```

**Migration Plan (MUST execute before merging):**
1. Communicate to all team members: "Next merge will change `.claude/` gitignore rules"
2. Team members should ensure their `.claude/` directory has no sensitive files outside `memory/` and `plugins/`
3. After merging, run `git status` to verify no personal files are accidentally staged
4. If any personal files show up: `git rm --cached <file>` to unstage without deleting

### 3. `AGENTS.md` — Enhanced

Keep all existing content. Add these new sections:

**Quick Navigation** (after Project Overview):
```markdown
## Quick Navigation
> Read this file first every session. For deeper context, follow links below.

- Full docs index: `docs/INDEX.md`
- Agent personas: `.ai/agents/`
- Shared skills/workflows: `.ai/skills/_index.md`
- Domain-specific rules: `.ai/rules/`
- Living status (sprint, known issues): `docs/status/LIVING.md`
```

**Security Rules** (new section — summary only, references canonical source):
- Full security rules: `.ai/rules/security.md` (canonical source)
- No secrets, API keys, tokens, passwords in any `.md` file
- No hardcoded credentials — always use environment variables
- Before commit: review diff, ensure no sensitive data
- `.env` files are NEVER committed (gitignored)
- In docs examples: use placeholders `<YOUR_API_KEY>`, `sk_test_xxx`
- Session isolation: do not reference information from other orgs/tenants

**AI Workflow Rules** (new section):
- Read `AGENTS.md` first every session
- For deeper context → read `docs/INDEX.md` → follow links
- For specific tasks → check `.ai/skills/_index.md` for existing workflows
- For specialized expertise → load agent persona from `.ai/agents/`
- After completing major tasks → update `docs/status/LIVING.md` if significant changes
- Do NOT modify docs without user confirmation

Update **Monorepo Structure** to include all current packages (amazon-wizard, form-engine, ui). Note: `packages/auth` appears in README.md but does not exist on disk — remove from README.md. Add `packages/biome-config` and `packages/typescript-config` which exist but are not listed.

Standardize **commit message format** to `<type>(<scope>)[task:<ticket>]: <subject>` (align AGENTS.md with README.md — use `task:` prefix, remove `bmad:` references).

### 4. `CLAUDE.md` — Lightweight

```markdown
# CLAUDE.md

Read `AGENTS.md` for project rules and context. This file contains Claude Code-specific configuration only.

## Claude Code Settings
- Use `.claude/commands/` for project-specific slash commands
- Memory is personal — stored in `.claude/memory/`, gitignored
- When loading agent personas, read from `.ai/agents/<persona>.md`

## Workflow
- Before starting work: read `AGENTS.md` → `docs/INDEX.md` if needed
- Use `/create-endpoint`, `/create-module`, `/review` commands when applicable
- Follow security rules in `AGENTS.md` — never save secrets to any file
```

### 5. `docs/INDEX.md` — Master Index

Token-efficient index. Each entry: 1-line summary + relative path. AI reads this one file to decide what else to read.

```markdown
# ECH-Kenshin Documentation Index

> AI: Read this file to find relevant docs. Only read linked files when you need deeper context.

## Architecture
- [System Overview](architecture/overview.md) — Tech stack, deployment topology, module boundaries
- [Data Flow](architecture/data-flow.md) — Request lifecycle, event-driven patterns, BullMQ jobs
- [ADR: Modular Monolith](architecture/adr/001-modular-monolith.md) — Why single-process over microservices

## Product
- [PRD Overview](product/prd-overview.md) — Product vision, target market (Japan), key capabilities
- [PM: Product Master](product/domains/pm-product-master.md) — Catalog, EAV attributes, variants
- [INV: Inventory](product/domains/inv-inventory.md) — Multi-warehouse, optimistic lock, ledger
- [OMS: Orders](product/domains/oms-order.md) — Amazon SQS ingestion, status routing
- [FUL: Fulfillment](product/domains/ful-fulfillment.md) — FBA/FBM dispatch, shipment tracking

## Standards
- [Coding Standards](standards/coding.md) — Naming, patterns, error handling conventions
- [Security Standards](standards/security.md) — Secrets management, commit rules, session isolation
- [API Reference](standards/api.md) — Scalar docs link, API conventions

## Onboarding
- [Setup Guide](onboarding/setup.md) — Clone → install → run in 5 minutes
- [Environment Variables](onboarding/env-guide.md) — .env.example walkthrough

## Status
- [Living Document](status/LIVING.md) — Current sprint, known issues, don't-touch zones
- [Task Tracking](../TASK.md) — Current active tasks

## Process
- [Contributing Guide](CONTRIBUTE.md) — Gitflow, PR process, code review tiers
```

### 6. `.ai/` — Shared AI Workspace

#### `.ai/setup.md`
Guide for each AI tool:
- **Claude Code**: Install superpowers plugin, agent-browser. Project settings auto-loaded from `.claude/settings.json`
- **Cursor**: Point to `.ai/rules/` for custom rules. Import agent personas as context
- **Copilot**: Reference `.ai/rules/` in custom instructions
- **Zed AI**: Configure assistant settings, reference AGENTS.md

#### `.ai/agents/` — Agent Personas
Each file follows a standard format:
```markdown
# [Role Name]

## Identity
You are a [role description] working on the ECH-Kenshin platform.

## Expertise
- [domain 1]
- [domain 2]

## Rules
- [specific rules for this role]

## When to Use
[scenarios when this persona should be loaded]
```

Personas to create:
- `senior-frontend.md` — React, React Router, Tailwind, component architecture, accessibility
- `senior-backend.md` — NestJS, Fastify, Drizzle, domain-driven design, API design
- `security-auditor.md` — RLS, secrets management, multi-tenancy isolation, OWASP
- `database-expert.md` — PostgreSQL, Drizzle migrations, indexing, partitioning, RLS

#### `.ai/skills/` — Shared Workflows
Each skill is a step-by-step guide any AI tool can follow:
- `_index.md` — registry with: skill name, when to use, file path
- `create-nestjs-module.md` — folder structure, files to create, patterns to follow
- `create-react-page.md` — component structure, routing, data fetching patterns
- `api-endpoint-checklist.md` — validation, auth, error handling, tests
- `pr-review-guide.md` — what to check, security items, performance items

#### `.ai/rules/` — Domain Rules
Detailed rules that supplement `AGENTS.md`:
- `security.md` — expanded security rules, examples of violations, how to fix
- `frontend.md` — React patterns, Tailwind usage, component naming, state management
- `backend.md` — NestJS module patterns, Drizzle query patterns, error handling
- `database.md` — Migration rules, naming conventions, RLS policies, indexing strategy

### 7. `docs/status/LIVING.md` — Shared Living Knowledge

```markdown
# Project Status — Living Document

> Updated by team when significant changes occur. AI: read this for current project state.
> Last updated: YYYY-MM-DD

## Current Sprint
- Sprint goal: [description]
- Key deliverables: [list]
- Deadline: [date]

## Known Issues & Limitations
- [issue description] — [workaround if any]

## Don't Touch Zones
> Modules currently being refactored or migrated. Do NOT modify without checking with the owner.
- [module/file] — [reason] — [owner] — [expected completion]

## In-Progress Migrations
- [migration description] — [status] — [branch if applicable]

## Recently Completed (Last 2 Sprints)
- [what was done] — [date] — [relevant PR/commit]
```

### 8. Module READMEs

Each `apps/*/README.md` and `packages/*/README.md` follows a standard template:

```markdown
# [Package Name]

> [1-line description]

## Scope
[What this module does and doesn't do]

## Quick Start
[How to run/develop this module]

## Environment Variables
[Required env vars with descriptions — NO real values]

## Key Patterns
[Architecture patterns specific to this module]

## Dependencies
[Key internal and external dependencies]
```

### 9. `.claude/commands/` — Shared Slash Commands

Custom commands that team shares via git:
- `create-endpoint.md` — Interactive workflow to scaffold a new API endpoint
- `create-module.md` — Scaffold a new NestJS domain module following project patterns
- `review.md` — Run code review checklist against current changes

### 10. Security Enforcement

Security is enforced at multiple layers:

| Layer | What | How |
|-------|------|-----|
| `AGENTS.md` | AI reads security rules every session | Quick Navigation → Security Rules section |
| `.ai/rules/security.md` | Detailed security rules with examples | Referenced by AGENTS.md |
| `docs/standards/security.md` | Human-readable security standards | For code review and onboarding |
| `.gitignore` | Prevent secrets from being committed | `.env*`, `.claude/memory/` |
| Pre-commit hooks | Lint staged files | Existing husky + lint-staged |
| `.env.example` | Template without real values | In each app that needs env vars |

Key security rules enforced across all layers:
1. No secrets/credentials in any `.md`, `.json`, or code file
2. Use `<PLACEHOLDER>` format in docs examples
3. AI must confirm with user before committing any changes
4. `.env` files never committed
5. Session isolation — no cross-tenant/cross-org data leakage
6. Personal AI memory (`.claude/memory/`) is gitignored

---

## Implementation Approach

**Phase 1 (Approach 2):** Create all files and folders manually, populate with content based on existing project knowledge.

**Phase 2 (Approach 3 — future):** Add CI automation:
- Pre-commit hook to validate no secrets in `.md` files
- GitHub Action: if PR changes architecture → require docs update
- Auto-update `docs/INDEX.md` when new `.md` files are added
- `docs/changelog/` for docs versioning
- LIVING.md staleness check: if last modified > 2 weeks, warn in PR

## File Inventory

### New files to create:
1. `CLAUDE.md`
2. `.cursorrules` — Cursor native config, references AGENTS.md + .ai/rules/
3. `.github/copilot-instructions.md` — Copilot native config, references AGENTS.md + .ai/rules/
4. `docs/INDEX.md`
5. `docs/architecture/overview.md`
6. `docs/architecture/data-flow.md`
7. `docs/architecture/adr/001-modular-monolith.md`
8. `docs/product/prd-overview.md`
9. `docs/product/domains/pm-product-master.md`
10. `docs/product/domains/inv-inventory.md`
11. `docs/product/domains/oms-order.md`
12. `docs/product/domains/ful-fulfillment.md`
13. `docs/standards/coding.md`
14. `docs/standards/security.md` — human-readable, references .ai/rules/security.md
15. `docs/standards/api.md`
16. `docs/onboarding/setup.md`
17. `docs/onboarding/env-guide.md`
18. `docs/status/LIVING.md`
19. `.ai/setup.md`
20. `.ai/agents/senior-frontend.md`
21. `.ai/agents/senior-backend.md`
22. `.ai/agents/security-auditor.md`
23. `.ai/agents/database-expert.md`
24. `.ai/skills/_index.md`
25. `.ai/skills/create-nestjs-module.md`
26. `.ai/skills/create-react-page.md`
27. `.ai/skills/api-endpoint-checklist.md`
28. `.ai/skills/pr-review-guide.md`
29. `.ai/rules/security.md` — CANONICAL source for all security rules
30. `.ai/rules/frontend.md`
31. `.ai/rules/backend.md`
32. `.ai/rules/database.md`
33. `.claude/commands/create-endpoint.md`
34. `.claude/commands/create-module.md`
35. `.claude/commands/review.md`
36. `apps/admin-portal/README.md`
37. `packages/database/README.md`
38. `packages/core/README.md`
39. `packages/ui/README.md`
40. `packages/form-engine/README.md`
41. `packages/amazon-wizard/README.md`
42. `packages/biome-config/README.md`
43. `packages/typescript-config/README.md`

### Files to overwrite (exist but will be replaced with project-specific content):
44. `apps/server/README.md` — currently NestJS boilerplate, replace with module README
45. `apps/client-portal/README.md` — currently empty, populate

### Files to modify:
46. `.gitignore` — selective `.claude/` ignore (with migration plan)
47. `AGENTS.md` — add Quick Navigation, Security Rules, AI Workflow Rules; fix commit format to `[task:<ticket>]`; update package list
48. `README.md` — fill in empty Architecture sections, point to docs/; remove non-existent `packages/auth`; add missing packages
