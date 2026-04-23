# Save-Session Command & AI Workflow Guide — Design Spec

## Overview

Two deliverables to automate end-of-session context packaging and teach the team how to work with AI agents effectively.

### Deliverable 1: `/save-session` Command

**Type:** Claude Code command (`.claude/commands/save-session.md`)
**Invocation:** `/save-session` or `/save-session <base-ref>`
**Default base ref:** `origin/main`

**Workflow (6 phases):**

| Phase | Name | What it does |
|-------|------|-------------|
| 1 | COLLECT | `git diff --stat`, `git log --oneline`, changed file paths from base to HEAD |
| 2 | ANALYZE | Classify changes (code areas, docs impacted, rules affected) |
| 2.5 | SESSION LOG | Generate structured session summary → `docs/superpowers/sessions/YYYY-MM-DD-<topic>.md` |
| 3 | UPDATE DOCS | Update LIVING.md, relevant rules/agents/architecture docs |
| 4 | SAVE MEMORY | Create/update project + feedback memory entries |
| 5 | COMMIT & OFFER | Single commit for all doc changes, offer push/PR |

**Key constraints:**
- User confirms before making changes (Phase 3-5)
- Skips phases with nothing to update
- Session log is auto-generated from git data + analysis
- Commit message: `docs(session): update docs and memory after <summary>`

**Session Log template:**
```markdown
## Session: YYYY-MM-DD — <Topic>

**Goal:** <one-line goal>
**Branch:** <branch name>
**Commits:** <count> (<first-sha>..<last-sha>)

**What was done:**
- <bullet list of changes>

**Decisions made:**
- <key decisions and rationale>

**Key prompts that worked well:**
- <effective commands/skills/patterns>

**Next steps:**
- <follow-up work identified>
```

**File impact analysis rules:**
- `towers/` changed → check `backend.md`, `architecture/overview.md`, agent personas
- `shared-kernel/` changed → check `architecture/overview.md`, `data-flow.md`
- `presentation/` changed → check `data-flow.md`
- `.ai/` changed → check `skills/_index.md`, `GUIDE.md`
- `packages/database/` changed → check `database.md`, `architecture/overview.md`
- Security-related changes → check `security.md`, `security-auditor.md`
- Any significant change → always check `LIVING.md`

### Deliverable 2: `.ai/GUIDE.md` — AI Workflow Guide

**Audience:** Developers on the team, new to AI-augmented workflow.
**Location:** `.ai/GUIDE.md`, linked from `docs/INDEX.md`

**Sections:**
1. Quick Start (30s orientation)
2. Starting a Session (context loading)
3. During Work (commands, skills, rules, feedback)
4. Ending a Session (`/save-session`)
5. Memory System (types, personal vs shared, how to use)
6. Keeping AI Accurate (docs that matter, how they connect)
7. Team Collaboration (session logs, shared rules, review)
8. Onboarding a New Team Member (step-by-step)

## Out of Scope

- Raw conversation/prompt storage (too noisy, stales fast)
- Automated push/merge (always user-confirmed)
- Multi-tool support (Cursor, Copilot) — focus on Claude Code only
- Metrics/analytics on AI usage
