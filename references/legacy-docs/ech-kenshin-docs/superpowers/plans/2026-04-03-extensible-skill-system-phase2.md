# Extensible Skill System Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bats-core tests for the shell scripts, and upgrade `database-migration` to a hybrid skill.

**Architecture:** Two independent workstreams: (1) bats test suite for infrastructure scripts, (2) `database-migration` hybrid skill. Tests run first to establish a safety net before touching infrastructure scripts.

**Tech Stack:** Bash, bats-core, Python stdlib (existing).

---

## File Map

**Created:**
- `docs/superpowers/tests/skills-discover.bats` — test suite for `skills-discover.sh`
- `docs/superpowers/tests/skills-install.bats` — test suite for `skills-install.sh`
- `.ai/skills/database-migration/skill.yaml` — metadata
- `.ai/skills/database-migration/skill.md` — migration guide moved from `.ai/skills/database-migration.md`
- `.ai/skills/database-migration/run.sh` — `pnpm db:generate` + `pnpm db:migrate`

**Deleted:**
- `.ai/skills/database-migration.md` — content moved into `database-migration/skill.md`

**Modified:**
- `docs/superpowers/skills-discover.sh` — add env-var overrides for testability
- `docs/superpowers/skills-install.sh` — add env-var overrides for testability
- `docs/status/LIVING.md` — record Phase 2 completion

---

## Pre-work: Make Scripts Testable

Before writing tests, both scripts need to respect environment-variable overrides so tests can inject a fake `SKILLS_DIR` / `REGISTRY` in a temp directory.

### Task 0: Add env-var overrides to `skills-discover.sh`

**File:** Modify `docs/superpowers/skills-discover.sh`

**Background:** The script currently computes all paths from `SCRIPT_DIR`. Tests need to inject `SKILLS_DIR` and `REGISTRY` pointing to a temp directory.

- [ ] **Step 1: Read current script header**

Read the first 15 lines of `docs/superpowers/skills-discover.sh`. The variable declarations are:
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/.ai/skills"
REGISTRY="$SCRIPT_DIR/registry.json"
```

- [ ] **Step 2: Change to use env-var overrides**

Replace those 4 lines with:

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-"$(cd "$SCRIPT_DIR/../.." && pwd)"}"
SKILLS_DIR="${SKILLS_DIR:-"$PROJECT_ROOT/.ai/skills"}"
REGISTRY="${REGISTRY:-"$SCRIPT_DIR/registry.json"}"
```

This makes all three variables overridable via environment while defaulting to the existing computed values.

- [ ] **Step 3: Verify script still works (regression check)**

Run: `docs/superpowers/skills-discover.sh`
Expected: Runs normally, `registry.json` unchanged

- [ ] **Step 4: Verify env override works**

Run: `SKILLS_DIR=/tmp/fake REGISTRY=/tmp/registry.json docs/superpowers/skills-discover.sh`
Expected: Script runs without error (finds no skills in `/tmp/fake`)

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/skills-discover.sh
git commit -m "refactor(workspace): make skills-discover.sh testable via env overrides

SKILLS_DIR, PROJECT_ROOT, and REGISTRY can now be overridden via environment
variables for testing. Defaults unchanged.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 1: Add env-var overrides to `skills-install.sh`

**File:** Modify `docs/superpowers/skills-install.sh`

**Background:** Same as Task 0 — tests need to inject `SKILLS_DIR` pointing to a temp directory.

- [ ] **Step 1: Read current script header**

Read the first 15 lines of `docs/superpowers/skills-install.sh`. The variable declarations are:
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/.ai/skills"
```

- [ ] **Step 2: Change to use env-var overrides**

Replace those 3 lines with:

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-"$(cd "$SCRIPT_DIR/../.." && pwd)"}"
SKILLS_DIR="${SKILLS_DIR:-"$PROJECT_ROOT/.ai/skills"}"
```

- [ ] **Step 3: Verify script still works (regression check)**

Run: `docs/superpowers/skills-install.sh`
Expected: Exit 1, usage message printed (no args)

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/skills-install.sh
git commit -m "refactor(workspace): make skills-install.sh testable via env overrides

SKILLS_DIR and PROJECT_ROOT can now be overridden via environment variables
for testing. Defaults unchanged.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Part 1: Shell Script Tests

### Task 2: Write `skills-discover.bats`

**File:** Create `docs/superpowers/tests/skills-discover.bats`

> Note: This file requires `bats-assert` library. If `bats-assert` is not installed,
> install it or copy it from `https://github.com/bats-core/bats-assert`.

**File header:**
```bats
#!/usr/bin/env bats
load 'bats-assert'    # provides: assert_success, assert_output, refute_output, assert
load 'bats-support'   # provides: run, output variable, setup/teardown
```

**If bats-assert is not available**, use these shim declarations at the top of the file instead:

```bats
#!/usr/bin/env bats

# Shim assertions when bats-assert is not installed
assert_success() {
  [[ "$status" -eq 0 ]] || return 1
}
assert_failure() {
  [[ "$status" -ne 0 ]] || return 1
}
assert_output() {
  [[ "$output" == *"$1"* ]] || return 1
}
refute_output() {
  [[ "$output" != *"$1"* ]] || return 1
}
assert() {
  eval "$1" || return 1
}
```

- [ ] **Step 1: Create tests directory and write the file**

```bash
mkdir -p docs/superpowers/tests
```

Write `docs/superpowers/tests/skills-discover.bats`:

```bats
#!/usr/bin/env bats

# Shim assertions (works with or without bats-assert)
assert_success() { [[ "$status" -eq 0 ]] || return 1; }
assert_failure() { [[ "$status" -ne 0 ]] || return 1; }
assert_output()  { [[ "$output" == *"$1"* ]] || return 1; }
refute_output()  { [[ "$output" != *"$1"* ]] || return 1; }

setup() {
  TEST_DIR=$(mktemp -d)
  export SKILLS_DIR="$TEST_DIR/.ai/skills"
  export REGISTRY="$TEST_DIR/registry.json"
  mkdir -p "$SKILLS_DIR"
}

teardown() {
  rm -rf "$TEST_DIR"
}

# ── Hybrid skill tests ────────────────────────────────────────────────────────

@test "detects hybrid skill (folder + skill.yaml)" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<'YAML'
name: my-skill
triggers:
  - "/my-skill"
description: Test skill
uses: []
YAML

  run bash docs/superpowers/skills-discover.sh

  assert_success
  assert_output "[found] hybrid: my-skill"
  assert [ "$(jq '.skills[0].hasAutomation' "$REGISTRY")" = "true" ]
}

@test "reads triggers list from skill.yaml" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<'YAML'
name: my-skill
triggers:
  - "/my-skill"
  - "do my skill"
description: Test
uses: []
YAML

  run bash docs/superpowers/skills-discover.sh

  assert [ "$(jq '.skills[0].triggers | length' "$REGISTRY")" -eq 2 ]
  assert_output '"/my-skill"'
}

@test "reads uses list from skill.yaml" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<'YAML'
name: my-skill
triggers: []
description: Test
uses:
  - other-skill
YAML

  run bash docs/superpowers/skills-discover.sh

  assert [ "$(jq '.skills[0].uses[0]' "$REGISTRY")" = '"other-skill"' ]
}

@test "reads block scalar description (description: >)" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<'YAML'
name: my-skill
triggers: []
description: >
  This is a multi-line
  description text.
uses: []
YAML

  run bash docs/superpowers/skills-discover.sh

  local desc
  desc=$(jq -r '.skills[0].description' "$REGISTRY")
  [[ "$desc" == *"multi-line"* ]]
  [[ "$desc" == *"description text." ]]
}

@test "handles empty uses list" {
  mkdir -p "$SKILLS_DIR/my-skill"
  cat > "$SKILLS_DIR/my-skill/skill.yaml" <<'YAML'
name: my-skill
triggers: []
description: Test
uses: []
YAML

  run bash docs/superpowers/skills-discover.sh

  assert [ "$(jq '.skills[0].uses | length' "$REGISTRY")" -eq 0 ]
}

# ── Markdown skill tests ───────────────────────────────────────────────────────

@test "detects markdown-only skill" {
  printf '# My Markdown Skill\n' > "$SKILLS_DIR/markdown-skill.md"

  run bash docs/superpowers/skills-discover.sh

  assert_output "[found] markdown: markdown-skill"
  assert [ "$(jq '.skills[0].hasAutomation' "$REGISTRY")" = "false" ]
}

@test "skips _index.md" {
  printf '# Index\n' > "$SKILLS_DIR/_index.md"

  run bash docs/superpowers/skills-discover.sh

  refute_output "_index"
}

# ── Mixed / edge case tests ───────────────────────────────────────────────────

@test "registers both hybrid and markdown skills in one run" {
  mkdir -p "$SKILLS_DIR/hybrid-skill"
  cat > "$SKILLS_DIR/hybrid-skill/skill.yaml" <<'YAML'
name: hybrid-skill
triggers: []
description: Hybrid
uses: []
YAML
  printf '# Markdown Skill\n' > "$SKILLS_DIR/markdown-skill.md"

  run bash docs/superpowers/skills-discover.sh

  assert_output "[found] hybrid: hybrid-skill"
  assert_output "[found] markdown: markdown-skill"
  assert [ "$(jq '.skills | length' "$REGISTRY")" -eq 2 ]
}

@test "writes valid JSON registry" {
  run bash docs/superpowers/skills-discover.sh
  jq . "$REGISTRY"  # fails if invalid JSON
  jq -e '.generated' "$REGISTRY"   # has timestamp
  jq -e '.skills' "$REGISTRY"       # has skills array
}
```

- [ ] **Step 2: Make executable**

Run: `chmod +x docs/superpowers/tests/skills-discover.bats`

- [ ] **Step 3: Run tests**

Run: `bats docs/superpowers/tests/skills-discover.bats 2>&1`
If `bats` not installed: install with `npm install -g bats` or `brew install bats-core`

- [ ] **Step 4: Fix any failures**

If a test fails, fix the implementation (not the test) unless the test itself is wrong.

Common fix — if `assert_output` doesn't work with multiline output:
```bats
[[ "$output" == *$"[found] hybrid"* ]]   # use * wildcard instead
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/tests/skills-discover.bats
git commit -m "test(workspace): add bats tests for skills-discover.sh

8 test cases covering: hybrid detection, triggers list parsing,
uses list parsing, block scalar description, empty uses list,
markdown detection, _index.md skip, mixed skills, JSON validity.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Write `skills-install.bats`

**File:** Create `docs/superpowers/tests/skills-install.bats`

- [ ] **Step 1: Write the file**

```bats
#!/usr/bin/env bats

# Shim assertions (works with or without bats-assert)
assert_success() { [[ "$status" -eq 0 ]] || return 1; }
assert_failure() { [[ "$status" -ne 0 ]] || return 1; }
assert_output()  { [[ "$output" == *"$1"* ]] || return 1; }

setup() {
  TEST_DIR=$(mktemp -d)
  export SKILLS_DIR="$TEST_DIR/.ai/skills"
  export SCRIPT_DIR="$TEST_DIR/scripts"
  mkdir -p "$SKILLS_DIR" "$SCRIPT_DIR"
  cp docs/superpowers/skills-install.sh "$SCRIPT_DIR/skills-install.sh"
  cp docs/superpowers/skills-discover.sh "$SCRIPT_DIR/skills-discover.sh"
  chmod +x "$SCRIPT_DIR/skills-install.sh"
}

teardown() {
  rm -rf "$TEST_DIR"
}

# ── Arg validation tests ───────────────────────────────────────────────────────

@test "exits 1 with usage when called with no args" {
  run "$SCRIPT_DIR/skills-install.sh"
  assert_failure
  assert_output "Usage:"
}

@test "exits 1 when called with only 1 arg" {
  run "$SCRIPT_DIR/skills-install.sh" "https://github.com/org/repo.git"
  assert_failure
}

# ── Skip-already-installed test ───────────────────────────────────────────────

@test "exits 0 with SKIP when skill already exists" {
  mkdir -p "$SKILLS_DIR/existing-skill"
  printf 'name: existing-skill\n' > "$SKILLS_DIR/existing-skill/skill.yaml"

  run "$SCRIPT_DIR/skills-install.sh" \
    "https://github.com/org/fake.git" "existing-skill"

  assert_success
  assert_output "SKIP"
  assert_output "already exists"
}

# ── Rollback test ──────────────────────────────────────────────────────────────

@test "rolls back and exits 1 when skill.yaml missing after clone" {
  # Create a bare git repo with no skill.yaml
  FAKE_REPO=$(mktemp -d)
  git -C "$FAKE_REPO" init --quiet
  printf 'not a skill\n' > "$FAKE_REPO/README.md"
  git -C "$FAKE_REPO" add .
  git -C "$FAKE_REPO" commit -m "init" --quiet

  run "$SCRIPT_DIR/skills-install.sh" "$FAKE_REPO" "bad-skill"

  assert_failure
  assert_output "skill.yaml not found"
  assert_output "Rolling back"
  # Directory must be removed
  [[ ! -d "$SKILLS_DIR/bad-skill" ]]
}

# ── Valid install test ────────────────────────────────────────────────────────

@test "installs valid skill and runs discover" {
  # Create a valid git repo with skill.yaml
  FAKE_REPO=$(mktemp -d)
  git -C "$FAKE_REPO" init --quiet
  printf 'name: good-skill\n' > "$FAKE_REPO/skill.yaml"
  git -C "$FAKE_REPO" add .
  git -C "$FAKE_REPO" commit -m "init" --quiet

  # Stub skills-discover.sh to avoid real execution
  printf 'echo stub\n' > "$SCRIPT_DIR/skills-discover.sh"

  run "$SCRIPT_DIR/skills-install.sh" "$FAKE_REPO" "good-skill"

  assert_success
  assert_output "Installed"
  [[ -f "$SKILLS_DIR/good-skill/skill.yaml" ]]
}
```

- [ ] **Step 2: Make executable**

Run: `chmod +x docs/superpowers/tests/skills-install.bats`

- [ ] **Step 3: Run tests**

Run: `bats docs/superpowers/tests/skills-install.bats 2>&1`

- [ ] **Step 4: Fix any failures**

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/tests/skills-install.bats
git commit -m "test(workspace): add bats tests for skills-install.sh

5 test cases covering: arg validation, skip-already-installed,
rollback-on-missing-skill.yaml, valid install with discover call.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Part 2: Upgrade `database-migration`

### Task 4: Create `skill.yaml`

**File:** Create `.ai/skills/database-migration/skill.yaml`

- [ ] **Step 1: Create folder and write file**

```bash
mkdir -p .ai/skills/database-migration
```

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

- [ ] **Step 2: Commit**

```bash
git add .ai/skills/database-migration/skill.yaml
git commit -m "feat(skill): add skill.yaml metadata for database-migration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Create `skill.md`

**File:** Create `.ai/skills/database-migration/skill.md`

- [ ] **Step 1: Write the file (full migration guide, with automation notes)**

```markdown
# Skill: Database Migration

> Step-by-step workflow for making schema changes using Drizzle ORM and drizzle-kit.
> Automation: `.ai/skills/database-migration/run.sh` handles generate + apply.

## When to Use

When adding a new table, modifying an existing table, adding indexes, or running data migrations against the PostgreSQL database.

## Key Rules

- **NEVER** run `pnpm db:push` in production — it bypasses the migration history.
- **NEVER** manually edit a generated migration SQL file. If it is wrong, delete it and regenerate.
- All tables for domain entities must use `domainId()` for the primary key (UUID v4).
- Auth entities use TypeID instead of UUID v4.
- Every domain table requires an `organizationId` column for multi-tenancy.
- Use `deletedAt` (nullable timestamp) for soft deletes — never hard-delete domain rows.
- Flexible or evolving data goes in a JSONB column rather than many nullable columns.

## Configuration Reference

- Drizzle config: `packages/database/drizzle.config.ts`
- Schema entry point: `packages/database/src/schemas/index.ts`
- Schema domain files: `packages/database/src/schemas/<domain>/`
- Generated migrations output: `packages/database/migrations/`

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm db:generate` | Diff schema against DB and produce a new migration SQL file |
| `pnpm db:migrate` | Apply all pending migration files in order |
| `pnpm db:push` | Dev-only: push schema directly without a migration file |
| `pnpm db:studio` | Open Drizzle Studio GUI to inspect data |

Automation: `run.sh [--dry]` runs `pnpm db:generate` and `pnpm db:migrate`.

---

## Steps

### 1. Add a new table

1. Create a new schema file at `packages/database/src/schemas/<domain>/<table-name>.ts`.
2. Define the table with required columns:
   - `domainId()` — UUID v4 primary key helper
   - `organizationId` — `uuid().notNull()` for tenant scoping
   - `createdAt`, `updatedAt` — timestamps
   - `deletedAt` — nullable timestamp for soft deletes
3. Export the table constant and the inferred `Select` / `Insert` TypeScript types.
4. Re-export from `packages/database/src/schemas/<domain>/index.ts` and then from the root `packages/database/src/schemas/index.ts`.
5. If this table has relations, add them to `packages/database/src/schemas/relations.ts`.
6. Generate the migration: `pnpm db:generate` — **automated via `run.sh`**
7. Review the generated SQL: `run.sh` prints the file path — **automated**
8. Apply in development: `pnpm db:migrate` — **automated via `run.sh`**

### 2. Modify an existing table (add / remove / rename a column)

1. Edit the relevant schema file in `packages/database/src/schemas/<domain>/`.
2. Run `pnpm db:generate` — **automated via `run.sh`**
3. **Check the generated SQL** — verify that destructive operations (DROP COLUMN) are intentional. This step is manual.
4. For a rename, drizzle-kit may generate a DROP + ADD pair. If you want a true rename, manually verify the SQL or use a two-step migration (add column → backfill → drop old column).
5. Apply: `pnpm db:migrate` — **automated via `run.sh`**
6. Update all Drizzle query usages of the affected table in `apps/server/`.

### 3. Add an index

**Option A — Drizzle schema index (preferred for standard B-tree indexes):**

1. Add an `index()` or `uniqueIndex()` call inside the table definition.
2. Run `pnpm db:generate` — **automated via `run.sh`**
3. Apply: `pnpm db:migrate` — **automated via `run.sh`**

**Option B — Manual SQL migration (required for GIN, GiST, pg_trgm, or partial indexes):**

1. Create a numbered SQL file in the relevant migrations folder, e.g.:
   `apps/server/src/towers/<domain>/migrations/00N_<description>.sql`
2. Write the raw SQL and apply manually.

### 4. Data migration (backfill / transform existing rows)

Data migrations are always manual — write a separate SQL migration file with batched updates wrapped in transactions.

### 5. Rollback strategy

Drizzle-kit does not provide automatic down-migrations. Write a new corrective migration file.

| Scenario | Rollback approach |
|----------|------------------|
| New column added | `ALTER TABLE <table> DROP COLUMN <column>;` in a new migration file |
| New table added | `DROP TABLE <table>;` in a new migration file |
| Index added | `DROP INDEX CONCURRENTLY <index_name>;` |

Never delete an already-applied migration file — always move forward with a new corrective migration.
```

- [ ] **Step 2: Commit**

```bash
git add .ai/skills/database-migration/skill.md
git commit -m "feat(skill): move database-migration content to skill.md

Adds automation notes for steps with CLI equivalents (pnpm db:generate,
pnpm db:migrate). Manual steps remain clear for schema editing, destructive
ops review, and data migrations.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Write `run.sh`

**File:** Create `.ai/skills/database-migration/run.sh`

The script automates:
- `pnpm db:generate` (always)
- Finding the new migration file (always, with `--dry` also prints path)
- `pnpm db:migrate` (unless `--dry`)

- [ ] **Step 1: Write the script**

```bash
#!/bin/bash
# .ai/skills/database-migration/run.sh
# Usage: run.sh [--dry]
#   --dry   Generate migration only, do not apply

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
if ! pnpm db:generate; then
  echo "[database-migration] ERROR: pnpm db:generate failed"
  exit 1
fi

# Find the most recently created migration file
if [[ -d "$MIGRATIONS_DIR" ]]; then
  MIGRATION=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f -printf '%T+ %p\n' 2>/dev/null | sort -r | head -1 | cut -d' ' -f2-)
else
  MIGRATION=""
fi

if [[ -n "$MIGRATION" && -f "$MIGRATION" ]]; then
  echo "[database-migration] Generated: $MIGRATION ($(wc -l < "$MIGRATION") lines)"
else
  echo "[database-migration] WARN: No migration file found in $MIGRATIONS_DIR"
fi

if $DRY; then
  echo "[database-migration] Dry run — not applying migration."
  exit 0
fi

echo "[database-migration] Running pnpm db:migrate..."
if ! pnpm db:migrate; then
  echo "[database-migration] ERROR: pnpm db:migrate failed"
  exit 1
fi

echo "[database-migration] Done."
```

- [ ] **Step 2: Make executable and verify syntax**

Run: `chmod +x .ai/skills/database-migration/run.sh && bash -n .ai/skills/database-migration/run.sh && echo "syntax OK"`
Expected: "syntax OK"

- [ ] **Step 3: Smoke test — pnpm not found**

Run: `.ai/skills/database-migration/run.sh 2>&1 || true`
If `pnpm` is not available, expect "ERROR: pnpm not found". This is the correct behavior.

- [ ] **Step 4: Commit**

```bash
git add .ai/skills/database-migration/run.sh
git commit -m "feat(skill): add run.sh for database-migration

Automates:
- pnpm db:generate (always)
- Finding and printing the new migration file path
- pnpm db:migrate (unless --dry flag passed)

Run with --dry to generate without applying.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Delete old `.md` file + regenerate registry

**File:** Delete `.ai/skills/database-migration.md`

- [ ] **Step 1: Delete the old file**

```bash
rm .ai/skills/database-migration.md
```

- [ ] **Step 2: Run discovery script**

Run: `docs/superpowers/skills-discover.sh`

- [ ] **Step 3: Verify registry**

Run: `cat docs/superpowers/registry.json | jq '.skills[] | "\(.name) hasAutomation=\(.hasAutomation)"'`
Expected:
```
"create-nestjs-module hasAutomation=true"
"create-react-page hasAutomation=true"
"database-migration hasAutomation=true"
"api-endpoint-checklist hasAutomation=false"
"debugging-guide hasAutomation=false"
"pr-review-guide hasAutomation=false"
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(skills): upgrade database-migration to hybrid skill

Promoted from .md to folder with skill.yaml + skill.md + run.sh.
Also: delete old .ai/skills/database-migration.md.
All 7 skills registered in registry.json (3 hybrid, 4 markdown).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Update `LIVING.md`

**File:** Modify `docs/status/LIVING.md`

- [ ] **Step 1: Read current LIVING.md**

- [ ] **Step 2: Update Phase 2 entry (or add it if not present)**

Add Phase 2 entry:

```markdown
### Extensible Skill System (Phase 2) — 2026-04-03
- Spec: `docs/superpowers/specs/2026-04-03-extensible-skill-system-phase2-spec.md`
- Hybrid skill: `database-migration`
- Tests: `docs/superpowers/tests/skills-discover.bats`, `skills-install.bats`
- Status: ✅ Complete
```

- [ ] **Step 3: Commit**

```bash
git add docs/status/LIVING.md
git commit -m "docs(status): record extensible skill system Phase 2 completion

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Spec Coverage Check

| Spec Requirement | Task(s) |
|-----------------|---------|
| Env-var overrides in `skills-discover.sh` | Task 0 |
| Env-var overrides in `skills-install.sh` | Task 1 |
| `skills-discover.bats` (8 tests) | Task 2 |
| `skills-install.bats` (5 tests) | Task 3 |
| `database-migration/skill.yaml` | Task 4 |
| `database-migration/skill.md` | Task 5 |
| `database-migration/run.sh` | Task 6 |
| Delete old `.md`, regenerate registry | Task 7 |
| Update `LIVING.md` | Task 8 |

All spec requirements covered. No gaps.

## Placeholder Scan

- No `TBD`, `TODO`, or placeholder code in task descriptions
- All script code is complete (bash `[[ ]]` conditionals used instead of bats-assert helpers)
- `assert_file_contains` replaced with direct `jq` + `[[ ]]` checks for portability
- No "similar to Task N" references — each task is self-contained
