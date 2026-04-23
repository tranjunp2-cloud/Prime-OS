# AI Agent Guidelines

> Rules and best practices for working with AI agents in ECH-Kenshin. Follow these to keep context synchronized, maintain code quality, and minimize token waste.

## 1. The Golden Rules

1. **Read `AGENTS.md` first** — every session, no exceptions
2. **Scope before you start** — define what this session will accomplish in 1-2 sentences
3. **Use existing tools** — skills, commands, rules, agent personas exist for a reason
4. **Save before you stop** — `/save-session` at the end of every session
5. **Don't let AI explore aimlessly** — if you can't describe the goal, you're not ready to code

## 2. Context Management

### What AI loads automatically

| File | Content | Token cost |
|------|---------|------------|
| `AGENTS.md` | Project overview, architecture, commands | ~3K |
| `CLAUDE.md` | Claude Code settings, workflow | ~500 |
| Personal memory | Your past decisions, preferences | ~1-3K |

**Total boot cost: ~5K tokens.** This is efficient — don't add more unless needed.

### When to load additional context

| Need | Load | How |
|------|------|-----|
| Backend expertise | `.ai/agents/senior-backend.md` | "Load senior-backend agent" |
| Frontend expertise | `.ai/agents/senior-frontend.md` | "Load senior-frontend agent" |
| Security review | `.ai/agents/security-auditor.md` | "Load security-auditor agent" |
| Database work | `.ai/agents/database-expert.md` | "Load database-expert agent" |
| Resume someone's work | `docs/superpowers/sessions/<latest>.md` | Read the session log |
| Current sprint status | `docs/status/LIVING.md` | Check before starting |

### What NOT to load

- Don't ask AI to "read the whole codebase" or "understand the project"
- Don't load all agent personas at once
- Don't load session logs from weeks ago (stale context)
- Don't paste entire files as context — point to specific functions

## 3. Prompt Guidelines

### Be specific

```
BAD:  "Fix the Amazon connector"
GOOD: "In amazon.connector.ts, getCatalogTree has N+1 queries — batch the child fetches using batchGetCatalogItems"

BAD:  "Add validation"
GOOD: "Add Zod validation to the bulkDelete endpoint in products.controller.ts — validate that ids is a non-empty array of UUIDs"

BAD:  "Review this code"
GOOD: "/review" (uses the standardized review checklist)
```

### Use the CAC pattern

Every prompt should have **Context**, **Action**, and **Constraint**:

```
Context: The listings import in catalog-browse.service.ts
Action: Wrap the import loop in a transaction and batch the child-linking UPDATEs
Constraint: Keep the existing error handling. Don't change the return type.
```

### Tell AI what NOT to do

AI tends to:
- Add unnecessary comments, docstrings, or type annotations
- Create abstractions for one-time operations
- "Improve" surrounding code beyond the request
- Add error handling for impossible scenarios

Prevent this:
```
"Fix only the orgId filtering. Don't refactor other code in this file."
"Add the endpoint. Don't add extra validation beyond what I specified."
```

## 4. Token Optimization

### Tier 1: Free wins (do these always)

| Practice | Savings |
|----------|---------|
| Use `/create-endpoint` instead of explaining from scratch | ~50% |
| Use `/review` instead of listing review criteria | ~40% |
| Point to specific files/functions instead of "find where X happens" | ~60% |
| Give feedback immediately when AI goes wrong direction | Prevents 2x-3x waste |
| Use `rtk` proxy for git/dev commands (if installed) | 60-90% on tool calls |

### Tier 2: Session discipline

| Practice | Savings |
|----------|---------|
| Scope to 1-3 changes per session | Prevents sprawl |
| Break large tasks into plan + multiple sessions | 30-50% vs one long session |
| Don't re-read files AI already read in this session | ~10% per re-read |
| Use subagents for parallel independent tasks | Time savings (same tokens) |

### Tier 3: Advanced

| Practice | Savings |
|----------|---------|
| Write plans for 5+ file changes | Prevents wrong-direction waste |
| Save feedback memories for recurring corrections | Prevents repeated corrections |
| Use agent personas only when specialist knowledge needed | ~2K per unused persona |

### Token waste red flags

- **Exploration without goal**: AI reading 10+ files "to understand" → scope your request
- **Repeated corrections**: telling AI the same thing 3+ times → save as feedback memory
- **Scope creep**: started with 1 bug fix, now touching 8 files → stop, re-scope
- **Long sessions**: 30+ minutes without a commit → break into smaller tasks
- **Vague prompts**: "make it better" → be specific about what "better" means

## 5. Shared Context Protocol

### How context stays synchronized across the team

```
You work with AI
        ↓
/save-session at end
        ↓
Session log committed to git  ← teammate reads this
        ↓
LIVING.md updated              ← AI reads this next session
        ↓
Rules/agents updated if needed ← all AI sessions follow this
```

### Session logs: the team's AI memory

Session logs (`docs/superpowers/sessions/`) are the primary handoff mechanism. They contain:
- What was done (commits, files changed)
- Decisions made (and why)
- What worked well (prompt patterns, approach)
- Next steps

**Writing good session logs:**
- `/save-session` generates them automatically
- Review the generated log before confirming
- Add "Next steps" if someone else will continue
- Be honest about what's incomplete

### Rules: the team's AI conventions

Rules (`.ai/rules/`) are auto-enforced by AI. When you discover a pattern that the whole team should follow:

1. Add it to the appropriate rule file (backend, frontend, database, security, testing)
2. Announce the change to the team
3. AI will follow it in all future sessions for all team members

**Examples of good rules:**
- "Always use `RequestContextFacade` instead of raw `ClsService`"
- "Use `firstOrNull()` instead of `.then(r => r[0])`"
- "Wrap multi-table writes in transactions"

**Don't add as rules:**
- Personal preferences (use memory instead)
- Temporary decisions (use session logs)
- Obvious TypeScript/NestJS conventions (AI already knows)

### LIVING.md: the project's heartbeat

`docs/status/LIVING.md` is the single source of truth for:
- Current sprint goal
- Known issues and limitations
- Don't-touch zones (modules being refactored)
- Recently completed work

AI reads this every session. Keep it accurate.

## 6. Code Review for AI-Generated Code

AI-generated code gets the standard 2-tier review (Peer + SA), plus these extra checks:

### AI-specific review checklist

- [ ] **Used shared utilities?** `RequestContextFacade`, `firstOrNull`, `ensureCodeUnique`, `PaginationHelper`, `replaceRelation`
- [ ] **Follows .ai/rules/?** Check against backend.md, frontend.md, database.md as applicable
- [ ] **No unnecessary additions?** No extra comments, docstrings, error handling, or abstractions beyond what was requested
- [ ] **No security regressions?** orgId filtering, input validation, no hardcoded secrets
- [ ] **Session log committed?** Check `docs/superpowers/sessions/` for context on the changes
- [ ] **Tests written?** AI should write tests for new logic, not just happy path

### Common AI mistakes to watch for

| Mistake | How to spot it |
|---------|---------------|
| Over-abstraction | Helper class for something used once |
| Missing org isolation | DB query without orgId filter |
| Swallowed errors | Empty catch blocks or `.catch(() => {})` |
| Re-implemented utilities | Custom pagination instead of `PaginationHelper` |
| Unnecessary comments | `// Get the user` above `getUser()` |
| Type `any` | TypeScript strict mode violation |

## 7. Feedback System

### How to train the AI for your preferences

**Correct bad behavior:**
```
"Don't add comments to obvious code — I can read it"
→ AI saves as feedback memory, won't repeat
```

**Confirm good behavior:**
```
"Yes, the single PR approach was correct here"
→ AI saves as positive feedback, will repeat
```

**Escalate to team convention:**
```
"This should be a team rule — add it to .ai/rules/backend.md"
→ All team members' AI sessions will follow
```

### Feedback hierarchy

| Scope | Where | Who sees it |
|-------|-------|-------------|
| Personal | `.claude/memory/` (gitignored) | Only your AI sessions |
| Team | `.ai/rules/*.md` (committed) | All AI sessions |
| Architecture | `docs/architecture/adr/` | All humans + AI |

## 8. Troubleshooting

### AI is off track

1. **Stop it immediately** — don't let it continue in the wrong direction
2. **Be explicit** — "Stop. That's wrong. The issue is X, not Y."
3. **Re-scope** — restate your goal clearly
4. **If persistent** — start a new session with a cleaner prompt

### AI doesn't know about recent changes

1. Check if `/save-session` was run in the previous session
2. Check if `LIVING.md` is up to date
3. Ask AI to read the specific files that changed

### Context is stale

1. `LIVING.md` outdated → update it manually or run `/save-session`
2. Rules outdated → update `.ai/rules/` and announce
3. Memory outdated → tell AI "forget X" or "update memory about Y"

### Two people working on same module

1. One branch per person (standard GitFlow)
2. Coordinate via team chat before AI-assisted refactors
3. Check `LIVING.md` "Don't Touch Zones" before starting
4. If conflict: rebase, don't force-push

## 9. Quick Reference Card

```
EVERY SESSION:
  Start  → AI loads AGENTS.md automatically
  Scope  → Define 1-3 changes in 1-2 sentences
  Work   → Use skills (/create-endpoint, /review, etc.)
  Save   → /save-session (NEVER skip)

CONTEXT LOADING:
  Specialist work    → Load .ai/agents/<persona>.md
  Resume other's     → Read docs/superpowers/sessions/<latest>.md
  Current status     → Read docs/status/LIVING.md

TOKEN SAVINGS:
  Use commands        → /create-endpoint, /create-module, /review
  Be specific         → file:line, function name, exact change
  Scope tightly       → 1 goal per session
  Correct early       → Don't let AI wander

TEAM SYNC:
  Session logs        → docs/superpowers/sessions/ (auto via /save-session)
  Conventions         → .ai/rules/ (manual, announce changes)
  Project status      → docs/status/LIVING.md (auto + manual)
  Architecture        → docs/architecture/ (manual, needs review)
```
