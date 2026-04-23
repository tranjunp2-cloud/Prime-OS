# Extensible Skill System — Design Brief

> Next step for the AI Workspace. This is a brief, NOT a full spec. Needs brainstorming → design → plan → implementation.

## Problem

Current `.ai/skills/` are static markdown workflow guides (checklists). They:
- Cannot be installed from external sources
- Cannot be composed (skill A calling skill B)
- Cannot execute automation (just instructions)
- Are not discoverable by AI tools beyond reading `_index.md`

## Chosen Approach: Hybrid (C)

Each skill has 2 parts:
1. **Instruction** (markdown) — what and why, for AI to read and understand the flow
2. **Automation** (script/command) — the mechanical parts that can be executed

## Design Questions (to be answered in brainstorming)

1. **Skill format**: What does a skill package look like? Single folder with `README.md` + `run.sh`? Or a more structured format with frontmatter metadata?

2. **Discovery**: How do AI tools find available skills? Current `_index.md` is manual. Should there be auto-discovery (scan `.ai/skills/*/`)? Or a registry file?

3. **Installation**: How to install skills from external sources? `git submodule`? `npx` script? Manual copy? A `skills.sh` installer?

4. **Composition**: Can a skill reference another skill? E.g., "create-nestjs-module" calls "database-migration" as a sub-step?

5. **Tool compatibility**: Current `.claude/commands/` only works with Claude Code. Can skills also register as commands? Can Cursor/Copilot use the same skills?

6. **Versioning**: How to handle skill updates? Should skills have versions?

7. **Scope**: Which existing `.ai/skills/` stay as-is (pure workflow guides) vs get upgraded to hybrid skills?

## Reference: Superpowers Plugin Model

The superpowers plugin system uses:
- Skills as markdown files with frontmatter (`name`, `description`, trigger conditions)
- Loaded via `Skill` tool on-demand
- Stored in `~/.claude/plugins/` (per-user, not project-level)
- Project can't ship its own skills via this mechanism

## Current Skills to Potentially Upgrade

| Skill | Has automation potential? |
|-------|-------------------------|
| `create-nestjs-module.md` | Yes — scaffold folder structure, generate boilerplate |
| `create-react-page.md` | Yes — scaffold page + route + hook |
| `database-migration.md` | Partially — `pnpm db:generate` already works, but validation steps are manual |
| `api-endpoint-checklist.md` | No — pure checklist, stays as workflow |
| `pr-review-guide.md` | No — pure checklist, stays as workflow |
| `debugging-guide.md` | No — pure guide, stays as workflow |

## Relationship to `.claude/commands/`

Current `.claude/commands/` (create-endpoint, create-module, review) are Claude Code-specific entry points that reference `.ai/skills/`. The extensible system should:
- Keep `.claude/commands/` as Claude Code entry points
- Make `.ai/skills/` the shared, tool-agnostic layer
- Allow skills to have both instruction + automation parts
- `.claude/commands/` can invoke the automation part of a skill
