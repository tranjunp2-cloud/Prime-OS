# AI-Assisted Development Workflow

> How the team works with AI agents to ship code efficiently while keeping context synchronized.

## 1. Session Lifecycle

Every AI-assisted work session follows this cycle:

```
Boot → Scope → Execute → Save → Handoff
```

### Boot (2 minutes)

AI auto-reads `AGENTS.md` + `CLAUDE.md` + personal memory. You don't need to do anything — context loads automatically.

**If resuming someone else's work:**
```
Read the latest session log in docs/superpowers/sessions/
```

**If doing specialized work:**
```
Load .ai/agents/senior-backend.md    # or senior-frontend, database-expert, security-auditor
```

### Scope (5 minutes)

Before writing any code, define what this session will accomplish. This is the single biggest token saver.

**Good scope:** "Fix the N+1 query in `getCatalogTree` — batch child fetches"
**Bad scope:** "Refactor the Amazon connector" (too broad, will burn tokens exploring)

Rules:
- One session = one focused goal (1-3 related changes)
- If the task needs 10+ files changed, write a plan first (`/plan` or plan mode)
- If you're unsure of the approach, brainstorm first — don't let AI guess

### Execute

See Section 2 (choosing the right mode) and Section 3 (prompt patterns).

### Save (always)

```
/save-session
```

This creates a session log in `docs/superpowers/sessions/`, updates `LIVING.md`, and commits doc changes. **Never skip this step.**

### Handoff

If someone else will continue your work:
1. Session log is already committed (from `/save-session`)
2. Add a "Next steps" section in the session log if non-obvious
3. Mention in team chat which session log to read

## 2. Choosing the Right Mode

| Situation | Mode | Why |
|-----------|------|-----|
| Bug fix with known location | **Direct coding** | Fast, focused, minimal tokens |
| New feature (< 5 files) | **Direct coding** with skill | Skills provide checklists |
| New feature (5+ files) | **Plan first**, then execute | Prevents wrong-direction waste |
| Large refactor | **Plan** → **subagent-driven** | Parallel execution saves time |
| Investigating a bug | **Debug mode** (`/investigate`) | Systematic, avoids guessing |
| Code review | **Review mode** (`/review`) | Structured, consistent |
| Unclear requirements | **Brainstorm first** | Clarify before coding |

### When to use Plan Mode

Plan mode is for tasks that need alignment before execution. Use it when:
- You'd need to explain the approach to a colleague before starting
- Multiple files or modules are involved
- There are architectural decisions to make
- The task will span multiple sessions

Plans are saved in `docs/superpowers/plans/` and can be executed across sessions.

### When to use Subagents

Subagents run tasks in parallel. Use them when:
- You have 2+ independent tasks (e.g., fix BE + update FE simultaneously)
- Mechanical tasks that don't need your judgment (formatting, scaffolding)
- Research across multiple files/modules

**Don't use subagents for:** tasks that depend on each other, or tasks that need careful judgment.

## 3. Prompt Patterns (Team Standard)

### The Context-Action-Constraint (CAC) Pattern

Every prompt should include three parts:

```
[Context] What's the current state / what file / what module
[Action]  What you want done — be specific
[Constraint] Boundaries — what NOT to change, which patterns to follow
```

**Example:**
```
Context: apps/server/src/towers/pm/listings/catalog-browse.service.ts
Action: Replace the N+1 getCatalogTree loop with a batched fetch using batchGetCatalogItems
Constraint: Don't change the return type. Use the existing retry logic in amazon.connector.ts
```

### Common Prompt Templates

**Bug fix:**
```
Bug: [describe the symptom]
Location: [file:line or module]
Expected: [what should happen]
Actual: [what happens instead]
Fix constraint: [don't break X, use Y pattern]
```

**New endpoint:**
```
/create-endpoint
Module: [tower/domain]
Method: [GET/POST/PUT/DELETE]
Path: /api/[path]
Business logic: [what it does]
Validation: [input constraints]
```

**Refactor:**
```
Goal: [what improvement]
Files: [list affected files]
Pattern to follow: [reference existing code or .ai/rules/]
Don't touch: [out-of-scope files]
```

### Anti-patterns (waste tokens)

| Don't do this | Do this instead |
|---------------|-----------------|
| "Refactor this file" (vague) | "Extract the auth logic into AmazonAuthClient" (specific) |
| "Fix all the bugs" (unbounded) | "Fix the orgId filtering in listings-form.service.ts" |
| "Make it better" (subjective) | "Replace raw SQL with inArray() for safety" |
| Paste 500 lines "what's wrong?" | Point to the specific function and symptom |
| Ask AI to read 20 files "for context" | Load only the files relevant to your task |

## 4. Token Budget Guidelines

### Session cost awareness

| Session type | Typical token usage | Target |
|--------------|-------------------|--------|
| Bug fix (1-2 files) | 10-30K | Stay under 50K |
| Feature (3-5 files) | 30-80K | Stay under 100K |
| Large refactor (plan + execute) | 80-200K | Break into multiple sessions |
| Code review | 20-50K | Proportional to diff size |

### How to minimize token usage

1. **Scope tightly** — the #1 token saver. "Fix X in Y file" not "improve the codebase"
2. **Use skills and commands** — `/create-endpoint`, `/create-module` etc. encode best practices, no need to explain
3. **Load agent personas only when needed** — each persona adds ~2K tokens to context
4. **Don't re-read files unnecessarily** — AI remembers what it read in the current session
5. **Use `rtk`** — the Rust Token Killer proxy (if installed) saves 60-90% on dev operations
6. **Break large tasks** — 3 focused sessions < 1 sprawling session in total tokens
7. **Give feedback early** — correct the AI immediately if it's going the wrong direction. Letting it continue wastes tokens

### Red flags (you're burning tokens)

- AI is "exploring" without a clear goal
- Session has been running 30+ minutes without a commit
- AI is reading files unrelated to your stated goal
- You're re-explaining the same thing multiple times (save as feedback memory instead)
- The diff keeps growing beyond your original scope

## 5. Collaboration: Working on the Same Codebase

### Branch ownership

- One person per feature branch at a time (standard GitFlow)
- If you need to work on someone else's branch, coordinate first
- AI sessions on the same branch can conflict — communicate

### Context synchronization

The team stays synchronized through these shared artifacts:

```
Shared (committed to git):              What it does:
├── AGENTS.md                           Project overview (read every session)
├── .ai/rules/*.md                      Coding conventions (auto-enforced)
├── .ai/agents/*.md                     Specialist knowledge
├── .ai/skills/                         Reusable workflows
├── docs/status/LIVING.md               Current sprint state
├── docs/superpowers/sessions/*.md      Session history (who did what)
├── docs/superpowers/plans/*.md         Implementation plans
└── docs/CONTRIBUTE.md                  GitFlow + PR process
```

### Reviewing AI-assisted code

AI code gets the same review as human code, plus:

1. **Check shared utilities** — did it use `RequestContextFacade`, `firstOrNull`, etc.?
2. **Check rules compliance** — does it follow `.ai/rules/backend.md`?
3. **Check session log** — does the log accurately describe what was done?
4. **Check for AI drift** — did it add unnecessary abstractions, comments, or "improvements"?

### When AI work needs a plan

If your task will:
- Touch 5+ files
- Span multiple sessions
- Need another team member to continue
- Involve architectural decisions

Then write a plan first. Plans go in `docs/superpowers/plans/` with format:
```
docs/superpowers/plans/YYYY-MM-DD-<short-description>.md
```

## 6. Decision Log

When AI helps you make a technical decision, document it if:
- It affects other modules
- It's non-obvious and someone might question it later
- It sets a pattern others should follow

**Where to document:**
- Small decision → session log (automatic via `/save-session`)
- Team convention → `.ai/rules/` (manual, announce to team)
- Architecture decision → `docs/architecture/adr/` (manual, needs review)

## 7. Quick Reference

```
Start session    → AI auto-loads context
Load specialist  → "Load .ai/agents/senior-backend.md"
Create endpoint  → /create-endpoint
Create module    → /create-module
Review code      → /review
Debug a bug      → /investigate
Write a plan     → Enter plan mode or ask AI to plan
End session      → /save-session (NEVER skip)
Check status     → Read docs/status/LIVING.md
See past work    → Read docs/superpowers/sessions/
```
