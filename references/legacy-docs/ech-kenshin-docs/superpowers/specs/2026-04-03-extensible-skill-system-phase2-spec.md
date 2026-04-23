# Extensible Skill System — Phase 2 Design Spec

> Status: Approved
> Date: 2026-04-03
> Branch: `feat/CR-081-product-data-amazon`
> Depends on: Phase 1 (all bugs fixed in commit `cb6993f`)

## Overview

Phase 2 does two things:
1. Upgrade `database-migration` to a hybrid skill
2. Add bats-core test coverage for `skills-discover.sh` and `skills-install.sh`

Phase 1 left `database-migration.md` as the highest-ROI upgrade candidate — it has clear CLI automation (`pnpm db:generate`, `pnpm db:migrate`). The script tests protect the foundation from regressions as the system grows.

## Directory Structure (Phase 2 changes)

```
.ai/skills/
  database-migration/
    skill.md      # moved from .ai/skills/database-migration.md
    skill.yaml    # metadata
    run.sh        # pnpm db:generate + pnpm db:migrate

docs/superpowers/
  tests/
    skills-discover.bats   # test suite for skills-discover.sh
    skills-install.bats    # test suite for skills-install.sh
```

## 1. Upgrade `database-migration`

### 1.1 `skill.yaml`

```yaml
name: database-migration
triggers:
  - "database migration"
  - "run migration"
  - "pnpm db:generate"
  - "generate migration"
description: >
  Run Drizzle ORM schema diffing to generate migration SQL files,
  review the output, and apply migrations via pnpm db:migrate.
  Handles new tables, column modifications, indexes, and data migrations.
uses: []
```

### 1.2 `skill.md`

Move the full content from `.ai/skills/database-migration.md` into `skill.md`, with automation notes added to steps that have CLI equivalents.

**Steps with automation:**
- Step 1.6 (generate): "Run `pnpm db:generate` — automated via `run.sh`"
- Step 1.7 (review SQL): "Automated — `run.sh` shows the generated file path"
- Step 1.8 (apply): "Run `pnpm db:migrate` — automated via `run.sh`"
- Step 2.2 (generate): "Automated via `run.sh`"
- Step 2.5 (apply): "Automated via `run.sh`"
- Step 3.2 (generate): "Automated via `run.sh`"
- Step 3.3 (apply): "Automated via `run.sh`"

**Steps that remain manual:**
- Editing schema files (Steps 1.1-1.5, 2.1, 3.1)
- Reviewing SQL for destructive operations (Step 2.3)
- Writing manual SQL for GIN/GiST indexes (Step 3.4)
- Data migrations (Step 4)
- Rollback (Step 5)

### 1.3 `run.sh`

**Usage:** `run.sh [--dry]`

Without `--dry`: runs `pnpm db:generate`, prints the path to the generated migration file, then runs `pnpm db:migrate`.

With `--dry`: runs `pnpm db:generate` only, prints the file path, exits without applying.

**Script behavior:**
1. `cd` to project root
2. If `pnpm` not found → error + exit 1
3. Run `pnpm db:generate`
4. Find the most recent `.sql` file in `packages/database/migrations/` (newest by mtime)
5. Print its path and size
6. If `--dry` → exit 0 here
7. Run `pnpm db:migrate`
8. Print success

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/packages/database/migrations"

DRY=false
[[ "${1:-}" == "--dry" ]] && DRY=true

cd "$PROJECT_ROOT"

if ! command -v pnpm &>/dev/null; then
  echo "[database-migration] ERROR: pnpm not found"
  exit 1
fi

echo "[database-migration] Running pnpm db:generate..."
pnpm db:generate

# Find the most recently created migration file
MIGRATION=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f -printf '%T+ %p\n' 2>/dev/null | sort -r | head -1 | cut -d' ' -f2-)

if [[ -z "$MIGRATION" || ! -f "$MIGRATION" ]]; then
  echo "[database-migration] WARN: No migration file found in $MIGRATIONS_DIR"
  exit 0
fi

echo "[database-migration] Generated: $MIGRATION ($(wc -l < "$MIGRATION") lines)"

if $DRY; then
  echo "[database-migration] Dry run — not applying migration."
  exit 0
fi

echo "[database-migration] Running pnpm db:migrate..."
pnpm db:migrate

echo "[database-migration] Done."
```

### 1.4 New slash command: `review-migration.md`

```markdown
Review a generated Drizzle migration SQL file before applying it.

Read `.ai/skills/database-migration/skill.md` for the full guide on what to check.

Ask me:
1. What migration file to review?
2. Any specific concerns (destructive operations, missing indexes)?

Run `pnpm db:migrate` only after approval.
```

Actually — `database-migration` is primarily invoked by other skills (via `uses:`), not directly by slash command. No new slash command needed. The skill is used as a dependency by `create-nestjs-module`.

---

## 2. Shell Script Tests

### 2.1 Test Framework: bats-core

Use [bats-core](https://github.com/bats-core/bats-core) — Bash Automated Testing System.

**Install check:**
```bash
if ! command -v bats &>/dev/null; then
  echo "bats not found — install with: npm install -g bats"
fi
```

**Test files:**
- `docs/superpowers/tests/skills-discover.bats`
- `docs/superpowers/tests/skills-install.bats`

### 2.2 `skills-discover.bats`

```bats
#!/usr/bin/env bats

# Test helpers — set up fake skills dirs
setup() {
  TEST_DIR=$(mktemp -d)
  export SKILLS_DIR="$TEST_DIR/.ai/skills"
  export REGISTRY="$TEST_DIR/docs/superpowers/registry.json"
  mkdir -p "$SKILLS_DIR" "$TEST_DIR/docs/superpowers"
}

teardown() {
  rm -rf "$TEST_DIR"
}

# ── Hybrid skill tests ────────────────────────────────────────────────────────

@test "detects hybrid skill (folder + skill.yaml)" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<YAML
name: my-skill
triggers:
  - "/my-skill"
description: Test skill
uses: []
YAML

  run docs/superpowers/skills-discover.sh

  assert_success
  assert_output --partial "[found] hybrid: my-skill"
  assert_file_contains "$REGISTRY" '"hasAutomation": true'
}

@test "reads triggers list from skill.yaml" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<YAML
name: my-skill
triggers:
  - "/my-skill"
  - "do my skill"
description: Test
uses: []
YAML

  run docs/superpowers/skills-discover.sh

  assert_file_contains "$REGISTRY" '"/my-skill"'
  assert_file_contains "$REGISTRY" '"do my skill"'
}

@test "reads uses list from skill.yaml" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<YAML
name: my-skill
triggers: []
description: Test
uses:
  - other-skill
YAML

  run docs/superpowers/skills-discover.sh

  assert_file_contains "$REGISTRY" '"uses":'
  assert_file_contains "$REGISTRY" '"other-skill"'
}

@test "reads block scalar description (description: >)" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<YAML
name: my-skill
triggers: []
description: >
  This is a multi-line
  description text.
uses: []
YAML

  run docs/superpowers/skills-discover.sh

  assert_file_contains "$REGISTRY" '"description": "This is a multi-line description text."'
}

@test "handles empty uses list" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<YAML
name: my-skill
triggers: []
description: Test
uses: []
YAML

  run docs/superpowers/skills-discover.sh

  assert_file_contains "$REGISTRY" '"uses": \[\]'
}

# ── Markdown skill tests ───────────────────────────────────────────────────────

@test "detects markdown-only skill" {
  echo "# My Markdown Skill" > "$SKILLS_DIR/markdown-skill.md"

  run docs/superpowers/skills-discover.sh

  assert_output --partial "[found] markdown: markdown-skill"
  assert_file_contains "$REGISTRY" '"hasAutomation": false'
}

@test "skips _index.md" {
  echo "# Index" > "$SKILLS_DIR/_index.md"

  run docs/superpowers/skills-discover.sh

  refute_output --partial "_index"
}

# ── Mixed / edge case tests ───────────────────────────────────────────────────

@test "registers both hybrid and markdown skills in one run" {
  mkdir -p "$SKILLS_DIR/hybrid-skill"
  cat > "$SKILLS_DIR/hybrid-skill/skill.yaml" <<YAML
name: hybrid-skill
triggers: []
description: Hybrid
uses: []
YAML
  echo "# Markdown Skill" > "$SKILLS_DIR/markdown-skill.md"

  run docs/superpowers/skills-discover.sh

  assert_output --partial "[found] hybrid: hybrid-skill"
  assert_output --partial "[found] markdown: markdown-skill"
  jq -e '.skills | length == 2' "$REGISTRY"  # exactly 2 skills
}

@test "writes valid JSON registry" {
  run docs/superpowers/skills-discover.sh
  jq . "$REGISTRY"  # fails if invalid JSON
  jq -e '.generated' "$REGISTRY"   # has timestamp
  jq -e '.skills' "$REGISTRY"       # has skills array
}
```

### 2.3 `skills-install.bats`

```bats
#!/usr/bin/env bats

setup() {
  TEST_DIR=$(mktemp -d)
  export SKILLS_DIR="$TEST_DIR/.ai/skills"
  export SCRIPT_DIR="$TEST_DIR/docs/superpowers"
  mkdir -p "$SKILLS_DIR" "$SCRIPT_DIR"
  cp docs/superpowers/skills-discover.sh "$SCRIPT_DIR/skills-discover.sh"
  cp docs/superpowers/skills-install.sh "$SCRIPT_DIR/skills-install.sh"
}

teardown() {
  rm -rf "$TEST_DIR"
}

# ── Arg validation tests ───────────────────────────────────────────────────────

@test "exits 1 with usage when called with no args" {
  run "$SCRIPT_DIR/skills-install.sh"
  assert_failure
  assert_output --partial "Usage:"
}

@test "exits 1 when called with only 1 arg" {
  run "$SCRIPT_DIR/skills-install.sh" "https://github.com/org/repo.git"
  assert_failure
}

# ── Skip-already-installed test ───────────────────────────────────────────────

@test "exits 0 with SKIP when skill already exists" {
  mkdir -p "$SKILLS_DIR/existing-skill"
  echo "name: existing-skill" > "$SKILLS_DIR/existing-skill/skill.yaml"

  run "$SCRIPT_DIR/skills-install.sh" \
    "https://github.com/org/fake.git" "existing-skill"

  assert_success
  assert_output --partial "SKIP"
  assert_output --partial "already exists"
}

# ── Rollback test ──────────────────────────────────────────────────────────────

@test "rolls back and exits 1 when skill.yaml missing after clone" {
  # Create a git repo with no skill.yaml
  FAKE_REPO=$(mktemp -d)
  git -C "$FAKE_REPO" init --quiet
  echo "not a skill" > "$FAKE_REPO/README.md"
  git -C "$FAKE_REPO" add .
  git -C "$FAKE_REPO" commit -m "init" --quiet

  run "$SCRIPT_DIR/skills-install.sh" "$FAKE_REPO" "bad-skill"

  assert_failure
  assert_output --partial "skill.yaml not found"
  assert_output --partial "Rolling back"
  # Directory should be removed
  [[ ! -d "$SKILLS_DIR/bad-skill" ]]
}

# ── Valid install test ────────────────────────────────────────────────────────

@test "installs valid skill and runs discover" {
  # Create a valid git repo with skill.yaml
  FAKE_REPO=$(mktemp -d)
  git -C "$FAKE_REPO" init --quiet
  echo "name: good-skill" > "$FAKE_REPO/skill.yaml"
  git -C "$FAKE_REPO" add .
  git -C "$FAKE_REPO" commit -m "init" --quiet

  # Stub skills-discover.sh to avoid real execution
  echo "echo stub" > "$SCRIPT_DIR/skills-discover.sh"

  run "$SCRIPT_DIR/skills-install.sh" "$FAKE_REPO" "good-skill"

  assert_success
  assert_output --partial "Installed"
  [[ -f "$SKILLS_DIR/good-skill/skill.yaml" ]]
}
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `pnpm` not found in `run.sh` | Error message + exit 1 |
| No migration file generated | Warn + exit 0 (no migration needed) |
| `skills-install.sh` git URL 404 | `git clone` fails → script fails, error shown |
| Malformed `skill.yaml` in install | Already handled by `skill.yaml` check post-clone |

---

## Backward Compatibility

- Phase 1 hybrid skills (`create-nestjs-module`, `create-react-page`) are unchanged
- `skills-discover.sh` output format is unchanged (tests verify it)
- No breaking changes to any existing files

---

## Phase 2 File Map

**Created:**
- `.ai/skills/database-migration/skill.yaml`
- `.ai/skills/database-migration/skill.md`
- `.ai/skills/database-migration/run.sh`
- `docs/superpowers/tests/skills-discover.bats`
- `docs/superpowers/tests/skills-install.bats`

**Deleted:**
- `.ai/skills/database-migration.md` (content moved to `database-migration/skill.md`)

**Modified:**
- `docs/status/LIVING.md` — update Phase 1 entry, add Phase 2

---

## Implementation Checklist

- [ ] `docs/superpowers/tests/skills-discover.bats` — write tests
- [ ] `docs/superpowers/tests/skills-install.bats` — write tests
- [ ] Run tests, fix any failures
- [ ] `.ai/skills/database-migration/skill.yaml` — create folder + metadata
- [ ] `.ai/skills/database-migration/skill.md` — move content from old .md
- [ ] `.ai/skills/database-migration/run.sh` — pnpm db:generate + db:migrate
- [ ] Delete old `.ai/skills/database-migration.md`
- [ ] Run `skills-discover.sh`, verify `registry.json` has `database-migration` as hybrid
- [ ] Update `docs/status/LIVING.md`
- [ ] Commit all Phase 2 work
