## Session: 2026-04-06 — AI Workflow & Guidelines Documentation

**Goal:** Review current AI agent workflow and create onboarding documentation for team alignment on AI-assisted development.
**Branch:** refactor/CR-081-review-refactor-be-architect
**Commits:** 2 (this session)

**What was done:**
- Reviewed full AI workspace setup: AGENTS.md, .ai/GUIDE.md, .ai/rules/, .ai/agents/, .ai/skills/, session logs, CONTRIBUTE.md, LIVING.md
- Identified gaps: no token budget guidance, no team handoff protocol, no standard prompt patterns, no clear mode selection guide
- Created `docs/onboarding/WORKFLOW.md` — session lifecycle (Boot→Scope→Execute→Save→Handoff), mode selection (direct/plan/subagent/debug), CAC prompt pattern, token budget table, team collaboration protocol
- Created `docs/onboarding/GUIDELINE.md` — 5 golden rules, context management, 3-tier token optimization, shared context protocol, AI-specific code review checklist, feedback system hierarchy, troubleshooting guide
- Updated `docs/INDEX.md` to reference new onboarding docs

**Decisions made:**
- Placed docs in `docs/onboarding/` alongside existing setup.md and env-guide.md (natural discovery path for new members)
- Introduced CAC (Context-Action-Constraint) as the team's standard prompt pattern — simple enough to remember, effective enough to reduce token waste
- Token budget guidelines based on actual session data (session logs show 32-commit sessions — these are the "large refactor" tier)
- Kept `.ai/GUIDE.md` as the detailed AI reference; new docs are the team-facing "how to work together" layer

**Key prompts that worked well:**
- `/code-review-expert` repurposed for process review (not just code) — worked well for structured analysis
- Reading session logs to understand actual workflow patterns vs theoretical

**Next steps:**
- Team review of WORKFLOW.md and GUIDELINE.md for feedback
- Consider adding token tracking/reporting to `/save-session` output
- Potentially consolidate `.ai/GUIDE.md` references into onboarding docs to reduce duplication
