# Extensible Skill System — Design Spec

> Status: Approved
> Date: 2026-04-03
> Branch: `feat/CR-081-product-data-amazon`

## Overview

Upgrade the static `.ai/skills/` (markdown-only workflow guides) into a hybrid skill system where each skill has both instruction and automation parts. The system is plugin-like (extensible via git install), composable, and tool-agnostic.

## Directory Structure

```
.ai/skills/                          # Tool-agnostic, shared layer
  _index.md                          # Human-readable skill catalog (stays)
  <skill-name>/
    skill.md      # AI-readable instructions (what & why)
    skill.yaml    # Metadata: name, triggers, deps
    run.sh        # Automation script (executable)
  ...other skills stay as .md only

.claude/commands/                     # Claude Code-specific entry points
  create-module.md      # wraps .ai/skills/create-nestjs-module/run.sh
  create-endpoint.md
  create-react-page.md  # NEW — wraps .ai/skills/create-react-page/run.sh
  review.md

docs/superpowers/
  registry.json          # Auto-generated registry (source of truth)
  skills-install.sh     # Thin git-clone installer
  skills-discover.sh     # Auto-discovery: scan skills → regenerate registry
  specs/
    2026-04-03-extensible-skill-system-spec.md  # this file
```

## Decisions (All 7 Questions)

| # | Question | Decision |
|---|----------|----------|
| 1 | Skill format | **A — folder + `skill.md` + `skill.yaml` + `run.sh`** |
| 2 | Discovery | **C — hybrid: auto-scan → generates `docs/superpowers/registry.json`** |
| 3 | Installation | **B — `git clone` into `.ai/skills/` via `skills-install.sh`** |
| 4 | Composition | **B — `uses:` field in `skill.yaml`** |
| 5 | Tool compatibility | **A — `.claude/commands/` wraps `.ai/skills/<name>/run.sh`** |
| 6 | Versioning | **A — git SHA is the version. No `version` field.** |
| 7 | Phase 1 scope | **B — upgrade `create-nestjs-module` + `create-react-page`** |

---

## 1. Skill Format

### 1.1 Folder Structure

Each hybrid skill lives in its own folder under `.ai/skills/`:

```
.ai/skills/create-nestjs-module/
├── skill.md      # Markdown instructions (AI reads this for workflow guidance)
├── skill.yaml    # Machine-readable metadata
└── run.sh        # Executable automation script
```

**Skills without automation** stay as plain `.md` files (e.g., `pr-review-guide.md`, `api-endpoint-checklist.md`). The presence of a folder with `skill.yaml` indicates a hybrid skill.

### 1.2 `skill.yaml` Schema

```yaml
name: create-nestjs-module
triggers:
  - "/create-module"
  - "create nestjs module"
description: >
  Scaffold a new NestJS domain module in a tower:
  folder structure, Drizzle schema, Zod DTOs, service, controller,
  module registration, and migration generation.
uses:
  - database-migration
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique skill identifier (kebab-case) |
| `triggers` | Yes | Keywords/slash-commands that activate this skill (array) |
| `description` | Yes | Short description for registry and AI context |
| `uses` | No | List of skill names this skill depends on (composition) |

### 1.3 `skill.md` Contract

- Contains AI-readable workflow guidance: steps, conventions, rules
- Written for AI consumption (not human-only)
- Should complement `run.sh` — `run.sh` handles mechanical steps, `skill.md` provides context, rules, and edge cases
- Existing `.ai/skills/create-nestjs-module.md` content moves to `skill.md` of the new folder

### 1.4 `run.sh` Contract

- Must be executable (`chmod +x`)
- Accepts positional args: `$1` = primary arg (e.g., module name), `$2+` = additional args
- Returns exit 0 on success, non-zero on failure
- Prints human-readable progress to stdout
- Must be idempotent-friendly (safe to re-run)
- No interactive prompts (all args passed via CLI or env vars)
- Executable from any working directory (use absolute paths via `cd` to project root)

**Example:**
```bash
#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

DOMAIN="$1"        # e.g., "pm", "inv"
MODULE="$2"        # e.g., "product-catalog"
[[ -z "$DOMAIN" || -z "$MODULE" ]] && echo "Usage: run.sh <domain> <module>" && exit 1

cd "$PROJECT_ROOT"
echo "[create-nestjs-module] Creating module '$MODULE' in tower '$DOMAIN'..."
# scaffold steps...
echo "[create-nestjs-module] Done."
```

---

## 2. Discovery

### 2.1 Auto-Discovery Script (`skills-discover.sh`)

Located at `docs/superpowers/skills-discover.sh`. Run manually or after install/uninstall.

```bash
#!/bin/bash
# Scans .ai/skills/*/skill.yaml and generates docs/superpowers/registry.json
```

**Algorithm:**
1. For each directory `$DIR` in `.ai/skills/`
2. If `$DIR/skill.yaml` exists → it is a hybrid skill
3. Read `name`, `triggers`, `description`, `uses` from `skill.yaml`
4. Add to skills array with `hasAutomation: true`
5. Else if `$DIR.md` exists → it is a markdown-only skill
6. Add to skills array with `hasAutomation: false`
7. Write full array to `docs/superpowers/registry.json`

### 2.2 Registry Format (`registry.json`)

```json
{
  "generated": "2026-04-03T00:00:00Z",
  "skills": [
    {
      "name": "create-nestjs-module",
      "path": ".ai/skills/create-nestjs-module",
      "triggers": ["/create-module", "create nestjs module"],
      "description": "Scaffold a new NestJS domain module...",
      "hasAutomation": true,
      "uses": ["database-migration"]
    },
    {
      "name": "create-react-page",
      "path": ".ai/skills/create-react-page",
      "triggers": ["create react page", "add react page"],
      "description": "Scaffold a new React page with route and hook...",
      "hasAutomation": true,
      "uses": []
    }
  ]
}
```

### 2.3 `_index.md` Stays

`.ai/skills/_index.md` is a human-readable companion to `registry.json`. It is NOT auto-generated. Humans can read it for a quick overview. `registry.json` is the machine-readable source of truth.

---

## 3. Installation

### 3.1 `skills-install.sh`

Located at `docs/superpowers/skills-install.sh`.

```bash
#!/bin/bash
# Usage: docs/superpowers/skills-install.sh <git-url> <skill-name>
# Example: docs/superpowers/skills-install.sh https://github.com/org/skill-xyz.git skill-xyz
```

**Behavior:**
1. Validate args (git URL + skill name required)
2. Check if `.ai/skills/<skill-name>` already exists → warn and skip
3. `git clone --depth 1 <git-url> .ai/skills/<skill-name>`
4. Verify `skill.yaml` exists inside the cloned folder
5. Run `skills-discover.sh` to update `registry.json`
6. Print success message

### 3.2 Manual Install

Skills can also be manually copied/cloned:
```bash
git clone https://github.com/org/skill-xyz.git .ai/skills/skill-xyz
docs/superpowers/skills-discover.sh   # refresh registry
```

### 3.3 Uninstall

```bash
rm -rf .ai/skills/<skill-name>
docs/superpowers/skills-discover.sh
```

---

## 4. Composition

### 4.1 `uses:` Field

In `skill.yaml`, a skill declares its dependencies:

```yaml
name: create-nestjs-module
uses:
  - database-migration
```

### 4.2 Execution Order

When `.claude/commands/create-module.md` invokes `run.sh`:
1. Run `.ai/skills/create-nestjs-module/run.sh`
2. If exit code != 0 → abort, report failure
3. For each skill in `uses:`, run its `run.sh` in order
4. If any exit code != 0 → abort, report failure
5. Report full success

**Note:** Composition is handled by the caller (`.claude/commands/` wrapper), not by `run.sh` itself. Each `run.sh` is self-contained.

---

## 5. Tool Compatibility

### 5.1 Layer Separation

```
.ai/skills/          ← Tool-agnostic (Cursor, Copilot, Claude Code all read this)
  <skill>/skill.md    ← AI reads for workflow context
  <skill>/run.sh      ← Any tool with shell access can invoke

.claude/commands/      ← Claude Code-specific (slash command triggers)
  create-module.md     ← Reads .ai/skills/create-nestjs-module/skill.md
                          Invokes .ai/skills/create-nestjs-module/run.sh via Bash
```

### 5.2 Claude Code Integration

`.claude/commands/create-module.md`:
1. Reads `.ai/skills/create-nestjs-module/skill.md` for AI context
2. Asks clarifying questions (domain tower, module name, etc.)
3. Invokes `.ai/skills/create-nestjs-module/run.sh` via `Bash` tool with appropriate args
4. Reads output, reports to user

### 5.3 Future Tool Support

- **Cursor**: Agent reads `skill.md` directly. Can invoke `run.sh` via terminal tool.
- **Copilot**: Reads `skill.md` as context file. No `run.sh` hook yet.
- **If tool adds runner support**: Point it at `registry.json` + `run.sh` — the interface is tool-agnostic.

---

## 6. Versioning

**No explicit version field.** Git is the version control system.

- Skills live in git repos
- Install pins to a commit SHA (implicit in git clone)
- Update via `git pull` inside the skill folder
- `git log` is the changelog

If a skill needs a version number, it can be added to `skill.yaml` manually, but the system does not enforce or use it.

---

## 7. Phase 1 Scope

Phase 1 implements the system infrastructure + upgrades 2 skills:

### Phase 1A: Infrastructure
- `docs/superpowers/skills-discover.sh` — auto-discovery + registry generation
- `docs/superpowers/skills-install.sh` — git-clone installer
- `docs/superpowers/registry.json` — generated from existing skills
- Update `.ai/skills/_index.md` to note hybrid skill structure

### Phase 1B: Upgrade `create-nestjs-module`
- Create `.ai/skills/create-nestjs-module/` folder
- Move content to `skill.md`
- Add `skill.yaml`
- Write `run.sh` for:
  - Step 1: Scaffold folder structure
  - Step 8: Run `pnpm db:generate`
  - (Steps 2-7 remain manual — too much project-specific context for a script)

### Phase 1C: Upgrade `create-react-page`
- Create `.ai/skills/create-react-page/` folder
- Move content to `skill.md`
- Add `skill.yaml`
- Write `run.sh` for:
  - Scaffold page file
  - Add route entry
  - (Hooks and business logic remain manual)

### Phase 1D: Integration
- Add `.claude/commands/create-react-page.md` (new slash command)
- Update existing `.claude/commands/create-module.md` to use new folder structure
- Verify all existing commands (`/create-endpoint`, `/create-module`, `/review`) still work
- Run `skills-discover.sh`, verify `registry.json` is accurate

### Skills NOT Upgraded in Phase 1 (stay as `.md` only)
- `api-endpoint-checklist.md` — pure checklist
- `pr-review-guide.md` — pure checklist
- `debugging-guide.md` — pure guide
- `database-migration.md` — partial automation potential; evaluate in Phase 2

---

## Backward Compatibility

- Existing `.ai/skills/*.md` files that are NOT upgraded remain valid
- Existing `.claude/commands/` continue to work (they read `.ai/skills/*.md` via relative paths)
- The system is additive only — no existing files are deleted or broken
- When `create-nestjs-module` is upgraded, its `.md` file is moved into the folder — existing slash commands update their paths

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `run.sh` fails | Print error with skill name + exit code, abort composition chain |
| `run.sh` not found | Warn user, skip automation, fall back to instruction-only |
| `skill.yaml` malformed | Warn on discovery, skip that skill in registry |
| Missing `uses:` dependency | Warn that dependency is not installed, skip it |
| Already-installed skill | `skills-install.sh` warns and skips (does not overwrite) |

---

## Implementation Checklist

- [ ] `docs/superpowers/skills-discover.sh` — scan + generate registry
- [ ] `docs/superpowers/skills-install.sh` — git-clone installer
- [ ] Generate initial `docs/superpowers/registry.json`
- [ ] Upgrade `create-nestjs-module` → folder + `skill.yaml` + `run.sh`
- [ ] Upgrade `create-react-page` → folder + `skill.yaml` + `run.sh`
- [ ] Add `.claude/commands/create-react-page.md`
- [ ] Update `.claude/commands/create-module.md` to use new paths
- [ ] Verify `/create-module`, `/create-endpoint`, `/create-react-page`, `/review` all work
- [ ] Update `docs/superpowers/plans/` with this spec path
- [ ] Update `docs/status/LIVING.md`
