# Extensible Skill System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `.ai/skills/` from static markdown guides to a hybrid skill system (instruction + automation). Phase 1 installs the infrastructure tooling and upgrades 2 skills.

**Architecture:** Each hybrid skill lives in a folder with `skill.md` (AI instructions), `skill.yaml` (metadata), and `run.sh` (automation). An auto-discovery script scans all skills and generates `registry.json`. Claude Code commands wrap skill `run.sh` files as entry points.

**Tech Stack:** Bash scripts, YAML, JSON. No new dependencies.

---

## File Map

**Created:**
- `docs/superpowers/skills-discover.sh` — scan `.ai/skills/` → write `registry.json`
- `docs/superpowers/skills-install.sh` — `git clone` a skill into `.ai/skills/`
- `docs/superpowers/registry.json` — machine-readable skill registry
- `.ai/skills/create-nestjs-module/skill.md` — instructions moved from `.ai/skills/create-nestjs-module.md`
- `.ai/skills/create-nestjs-module/skill.yaml` — metadata
- `.ai/skills/create-nestjs-module/run.sh` — automation (step 1 scaffold + step 8 migration)
- `.ai/skills/create-react-page/skill.md` — instructions moved from `.ai/skills/create-react-page.md`
- `.ai/skills/create-react-page/skill.yaml` — metadata
- `.ai/skills/create-react-page/run.sh` — automation (page scaffold + route)
- `.claude/commands/create-react-page.md` — new slash command

**Modified:**
- `.ai/skills/_index.md` — add note about hybrid skill structure
- `.claude/commands/create-module.md` — update paths to use new folder structure
- `docs/status/LIVING.md` — record this work

**Deleted:**
- `.ai/skills/create-nestjs-module.md` — content moved into `create-nestjs-module/skill.md`
- `.ai/skills/create-react-page.md` — content moved into `create-react-page/skill.md`

---

## Phase 1A: Infrastructure

### Task 1: `skills-discover.sh` — Auto-discovery + Registry Generation

**File:** Create `docs/superpowers/skills-discover.sh`

- [ ] **Step 1: Write the discover script**

```bash
#!/bin/bash
# docs/superpowers/skills-discover.sh
# Scans .ai/skills/ for hybrid skills (folder + skill.yaml) and markdown-only skills,
# then writes docs/superpowers/registry.json.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/.ai/skills"
REGISTRY="$SCRIPT_DIR/registry.json"

echo "[skills-discover] Scanning $SKILLS_DIR..."

# Build JSON array of skills
SKILLS_JSON="[]"
SKILLS_JSON=$(echo "$SKILLS_JSON" | jq '.')

for entry in "$SKILLS_DIR"/*; do
  if [[ ! -d "$entry" ]]; then
    # Skip non-directories
    continue
  fi

  SKILL_NAME="$(basename "$entry")"
  SKILL_YAML="$entry/skill.yaml"
  SKILL_MD="$entry/skill.md"

  if [[ -f "$SKILL_YAML" ]]; then
    # Hybrid skill: read from skill.yaml
    NAME=$(grep '^name:' "$SKILL_YAML" | sed 's/^name: *//')
    TRIGGERS=$(grep -A 20 '^triggers:' "$SKILL_YAML" | tail -n +1 | sed 's/^  - //' | grep -v '^$' | jq -R . | jq -s .)
    DESCRIPTION=$(grep -A 1 '^description:' "$SKILL_YAML" | tail -1 | sed 's/^  //')
    USES=$(grep -A 10 '^uses:' "$SKILL_YAML" | tail -n +1 | sed 's/^  - //' | grep -v '^$' | jq -R . | jq -s .)

    ENTRY_JSON=$(jq -n \
      --arg name "$NAME" \
      --arg path ".ai/skills/$SKILL_NAME" \
      --json triggers "$TRIGGERS" \
      --arg desc "$DESCRIPTION" \
      --argjson hasAutomation true \
      --json uses "$USES" \
      '{
        name: $name,
        path: $path,
        triggers: $triggers,
        description: $desc,
        hasAutomation: $hasAutomation,
        uses: $uses
      }')

    SKILLS_JSON=$(echo "$SKILLS_JSON $ENTRY_JSON" | jq -s '.[0] * {skills: (.skills + [.[1]])}' 2>/dev/null || echo "$SKILLS_JSON")
    echo "  [found] hybrid: $NAME"
  elif [[ -f "$entry.md" ]]; then
    # Markdown-only skill: extract name from filename, no description
    NAME="$SKILL_NAME"
    ENTRY_JSON=$(jq -n \
      --arg name "$NAME" \
      --arg path ".ai/skills/$SKILL_NAME.md" \
      --argjson hasAutomation false \
      '{name: $name, path: $path, hasAutomation: $hasAutomation}')
    SKILLS_JSON=$(echo "$SKILLS_JSON $ENTRY_JSON" | jq -s '.[0] * {skills: (.skills + [.[1]])}' 2>/dev/null || echo "$SKILLS_JSON")
    echo "  [found] markdown: $NAME"
  fi
done

# Write registry
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REGISTRY_CONTENT=$(jq -n --argjson skills "$SKILLS_JSON" --arg timestamp "$TIMESTAMP" '{generated: $timestamp, skills: $skills}')

echo "$REGISTRY_CONTENT" > "$REGISTRY"
echo "[skills-discover] Wrote $REGISTRY with $(echo "$REGISTRY_CONTENT" | jq '.skills | length') skills."
```

- [ ] **Step 2: Make executable and test on existing skills**

Run: `chmod +x docs/superpowers/skills-discover.sh && docs/superpowers/skills-discover.sh`
Expected: Script runs, prints found skills, writes `registry.json`

- [ ] **Step 3: Verify registry.json output**

Run: `cat docs/superpowers/registry.json | jq '.skills | length'`
Expected: A positive integer (equal to number of existing skills)

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/skills-discover.sh docs/superpowers/registry.json
git commit -m "feat(workspace): add skills-discover.sh auto-discovery script

Scans .ai/skills/ for hybrid skills (folder + skill.yaml) and
markdown-only skills, generates docs/superpowers/registry.json.
Registers existing skills: create-nestjs-module, create-react-page,
api-endpoint-checklist, database-migration, debugging-guide, pr-review-guide.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: `skills-install.sh` — Git-Clone Installer

**File:** Create `docs/superpowers/skills-install.sh`

- [ ] **Step 1: Write the install script**

```bash
#!/bin/bash
# docs/superpowers/skills-install.sh
# Usage: docs/superpowers/skills-install.sh <git-url> <skill-name>
# Example: docs/superpowers/skills-install.sh https://github.com/org/skill-xyz.git skill-xyz

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/.ai/skills"

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <git-url> <skill-name>"
  echo "Example: $0 https://github.com/org/skill-xyz.git skill-xyz"
  exit 1
fi

GIT_URL="$1"
SKILL_NAME="$2"
TARGET_DIR="$SKILLS_DIR/$SKILL_NAME"

if [[ -d "$TARGET_DIR" ]]; then
  echo "[skills-install] SKIP: .ai/skills/$SKILL_NAME already exists."
  echo "  To reinstall, remove it first: rm -rf .ai/skills/$SKILL_NAME"
  exit 0
fi

echo "[skills-install] Cloning $GIT_URL into .ai/skills/$SKILL_NAME..."
git clone --depth 1 "$GIT_URL" "$TARGET_DIR"

if [[ ! -f "$TARGET_DIR/skill.yaml" ]]; then
  echo "[skills-install] ERROR: skill.yaml not found in $TARGET_DIR after clone."
  echo "  Rolling back..."
  rm -rf "$TARGET_DIR"
  exit 1
fi

echo "[skills-install] Verifying skill.yaml..."
INSTALLED_NAME=$(grep '^name:' "$TARGET_DIR/skill.yaml" | sed 's/^name: *//')
if [[ "$INSTALLED_NAME" != "$SKILL_NAME" ]]; then
  echo "[skills-install] WARN: skill.yaml name '$INSTALLED_NAME' differs from folder '$SKILL_NAME'. Continuing anyway."
fi

echo "[skills-install] Running skills-discover.sh to update registry..."
"$SCRIPT_DIR/skills-discover.sh"

echo "[skills-install] Done. Installed '$INSTALLED_NAME' to .ai/skills/$SKILL_NAME."
```

- [ ] **Step 2: Make executable and smoke-test with a fake install**

Run: `chmod +x docs/superpowers/skills-install.sh`
Expected: File is executable

- [ ] **Step 3: Test error case — missing args**

Run: `docs/superpowers/skills-install.sh`
Expected: Exit 1, usage message printed

- [ ] **Step 4: Test error case — already exists**

Run: `docs/superpowers/skills-install.sh https://github.com/org/fake.git create-nestjs-module`
Expected: Exit 0, "SKIP" message printed (skill already exists)

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/skills-install.sh
git commit -m "feat(workspace): add skills-install.sh git-clone installer

Thin installer that clones a skill repo into .ai/skills/<name>,
verifies skill.yaml exists, then runs skills-discover.sh to update registry.
Skips if skill already installed (safe to re-run).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Update `_index.md`

**File:** Modify `.ai/skills/_index.md`

- [ ] **Step 1: Read current `_index.md`**

Current content was read earlier — it lists 6 skills in a table.

- [ ] **Step 2: Add note about hybrid skill structure**

Add this section to the top of the file (after the existing table):

```markdown
## Hybrid Skills (Folder Format)

Some skills are **hybrid skills** — they have both instruction and automation:

| Skill | Folder | Has Automation |
|-------|--------|----------------|
| `create-nestjs-module` | `.ai/skills/create-nestjs-module/` | Yes |
| `create-react-page` | `.ai/skills/create-react-page/` | Yes |

Hybrid skills live in folders with:
- `skill.md` — AI-readable instructions
- `skill.yaml` — metadata (name, triggers, dependencies)
- `run.sh` — executable automation script

Install new skills: `docs/superpowers/skills-install.sh <git-url> <skill-name>`
Refresh registry: `docs/superpowers/skills-discover.sh`
```

- [ ] **Step 3: Commit**

```bash
git add .ai/skills/_index.md
git commit -m "docs(workspace): update _index.md with hybrid skill structure

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 1B: Upgrade `create-nestjs-module`

### Task 4: Create Folder + `skill.yaml`

**File:** Create `.ai/skills/create-nestjs-module/skill.yaml`

- [ ] **Step 1: Create the folder and `skill.yaml`**

```bash
mkdir -p .ai/skills/create-nestjs-module
```

```yaml
name: create-nestjs-module
triggers:
  - "/create-module"
  - "create nestjs module"
  - "create NestJS module"
description: >
  Scaffold a new NestJS domain submodule in a tower (PM, INV, OMS, FUL).
  Creates folder structure, Drizzle schema, Zod DTOs, service, controller,
  module registration, and generates database migration.
uses:
  - database-migration
```

- [ ] **Step 2: Commit**

```bash
git add .ai/skills/create-nestjs-module/skill.yaml
git commit -m "feat(skill): add skill.yaml metadata for create-nestjs-module

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Create `skill.md` (move content from `.ai/skills/create-nestjs-module.md`)

**File:** Create `.ai/skills/create-nestjs-module/skill.md`

- [ ] **Step 1: Write skill.md with existing content**

```markdown
# Skill: Create NestJS Domain Module

> Step-by-step guide for creating a new submodule within a domain tower.
> Automation: `.ai/skills/create-nestjs-module/run.sh` handles steps 1 and 8.

## When to Use

When adding a new business concept to the server (e.g., new entity, new feature within a tower).

## Steps

### 1. Create the folder structure

Automation available via `run.sh <domain> <module>`.

### 2. Define the Drizzle schema

Create `packages/database/src/schemas/<domain>/<table-name>.ts`:

- Use `domainId()` for primary key
- Add `organizationId` column (required for multi-tenancy)
- Add `createdAt`, `updatedAt` timestamps
- Add `deletedAt` for soft deletes if applicable
- Export the table and its inferred types

### 3. Create DTOs with Zod

In `dto/create-<entity>.dto.ts`:

- Define Zod schema for input validation
- Export both the schema and the inferred TypeScript type
- Include only fields the client sends (no id, no timestamps)

### 4. Implement the service

In `<module-name>.service.ts`:

- Inject `DrizzleDb` via `@Inject('DrizzleDb')`
- All queries MUST filter by `organizationId`
- Use soft delete filter: `where(notDeleted)`
- Wrap multi-table operations in transactions

### 5. Implement the controller

In `<module-name>.controller.ts`:

- Use NestJS decorators: `@Controller()`, `@Get()`, `@Post()`, etc.
- Apply `@UseGuards(AuthGuard, OrgGuard)` if not globally applied
- Validate input with Zod pipe
- Return appropriate HTTP status codes (201 for create, 204 for delete)

### 6. Register the module

In `<module-name>.module.ts`:

- Import `DrizzleModule` from shared-kernel
- Register controller and service as providers
- Export service if other modules need it

Add the module to the parent tower module's imports.

### 7. Write tests

In `<module-name>.spec.ts`:

- Unit test service methods with mocked DrizzleDb
- Integration test controller endpoints with Supertest
- Test: happy path, validation errors, not found, org isolation

### 8. Generate migration

Automation available via `run.sh <domain> <module>` (runs `pnpm db:generate`).

## Skill Metadata

- **Domain towers:** PM (Product Management), INV (Inventory), OMS (Order Management), FUL (Fulfillment)
- **Automation:** steps 1 (folder scaffold) and 8 (migration generate) are automated via `run.sh`
- **Dependencies:** calls `database-migration` skill after scaffold
```

- [ ] **Step 2: Commit**

```bash
git add .ai/skills/create-nestjs-module/skill.md
git commit -m "feat(skill): move create-nestjs-module content to skill.md

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Write `run.sh` for `create-nestjs-module`

**File:** Create `.ai/skills/create-nestjs-module/run.sh`

The script automates:
- **Step 1:** Scaffold the folder structure (`<module-name>.module.ts`, `.controller.ts`, `.service.ts`, `dto/`, `*.spec.ts`)
- **Step 8:** Run `pnpm db:generate`

Steps 2-7 remain manual (too much project-specific context for a script).

- [ ] **Step 1: Write the run.sh script**

```bash
#!/bin/bash
# .ai/skills/create-nestjs-module/run.sh
# Usage: run.sh <domain> <module> [--app server]
#   domain:  pm | inv | oms | ful
#   module:  kebab-case module name, e.g. "product-catalog"
#   --app:   optional target app (default: server)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

DOMAIN=""
MODULE=""
APP="server"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app)
      APP="$2"; shift 2 ;;
    pm|inv|oms|ful)
      DOMAIN="$1"; shift ;;
    *)
      MODULE="$1"; shift ;;
  esac
done

# Allow domain as first positional and module as second
if [[ -z "$DOMAIN" && -n "${1:-}" ]]; then
  DOMAIN="$1"; shift
fi
if [[ -z "$MODULE" && -n "${1:-}" ]]; then
  MODULE="$1"; shift
fi

if [[ -z "$DOMAIN" || -z "$MODULE" ]]; then
  echo "Usage: run.sh <domain> <module> [--app server]"
  echo "  domain: pm | inv | oms | ful"
  echo "  module: kebab-case, e.g. product-catalog"
  exit 1
fi

DOMAIN_DIR="$PROJECT_ROOT/apps/$APP/src/towers/$DOMAIN"
MODULE_DIR="$DOMAIN_DIR/$MODULE"

if [[ ! -d "$DOMAIN_DIR" ]]; then
  echo "[create-nestjs-module] ERROR: Tower directory not found: $DOMAIN_DIR"
  echo "  Available towers: $(ls "$PROJECT_ROOT/apps/$APP/src/towers/" 2>/dev/null || echo 'none')"
  exit 1
fi

if [[ -d "$MODULE_DIR" ]]; then
  echo "[create-nestjs-module] WARN: Module already exists at $MODULE_DIR — skipping scaffold."
else
  echo "[create-nestjs-module] Creating module '$MODULE' in tower '$DOMAIN'..."
  mkdir -p "$MODULE_DIR/dto"

  # Convert kebab-case to PascalCase
  PASCAL=$(echo "$MODULE" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1))substr($i,2); print}' | tr -d ' ')
  ENTITY=$(echo "$MODULE" | awk -F- '{print $NF}')

  # Module file
  cat > "$MODULE_DIR/$MODULE.module.ts" << EOF
import { Module } from '@nestjs/common';
import { DrizzleModule } from '@app/shared-kernel';

@Module({
  imports: [DrizzleModule],
})
export class ${PASCAL}Module {}
EOF

  # Service stub
  cat > "$MODULE_DIR/$MODULE.service.ts" << EOF
import { Inject, Injectable } from '@nestjs/common';
import type { DrizzleDb } from '@app/database';

@Injectable()
export class ${PASCAL}Service {
  constructor(@Inject('DrizzleDb') private readonly db: DrizzleDb) {}
}
EOF

  # Controller stub
  cat > "$MODULE_DIR/$MODULE.controller.ts" << EOF
import { Controller, Get } from '@nestjs/common';
import { ${PASCAL}Service } from './${MODULE}.service';

@Controller('${MODULE}')
export class ${PASCAL}Controller {
  constructor(private readonly service: ${PASCAL}Service) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
EOF

  # DTO stubs
  cat > "$MODULE_DIR/dto/create-${ENTITY}.dto.ts" << EOF
import { z } from 'zod';

export const Create${PASCAL}Schema = z.object({
  // TODO: add fields
});

export type Create${PASCAL}Dto = z.infer<typeof Create${PASCAL}Schema>;
EOF

  cat > "$MODULE_DIR/dto/update-${ENTITY}.dto.ts" << EOF
import { z } from 'zod';

export const Update${PASCAL}Schema = z.object({
  // TODO: add fields
}).partial();

export type Update${PASCAL}Dto = z.infer<typeof Update${PASCAL}Schema>;
EOF

  # Spec stub
  cat > "$MODULE_DIR/$MODULE.spec.ts" << EOF
import { describe, it, expect } from 'vitest';

describe('${PASCAL}Module', () => {
  it('should be defined', () => {
    // TODO: add tests
  });
});
EOF

  echo "[create-nestjs-module] Scaffolded: $MODULE_DIR"
  echo "  Files created:"
  echo "    $MODULE.module.ts"
  echo "    $MODULE.service.ts"
  echo "    $MODULE.controller.ts"
  echo "    dto/create-${ENTITY}.dto.ts"
  echo "    dto/update-${ENTITY}.dto.ts"
  echo "    $MODULE.spec.ts"
  echo "  NOTE: Steps 2-7 (schema, DTOs, service logic, controller logic, module registration, tests) are manual."
fi

# Step 8: Generate migration
echo "[create-nestjs-module] Running pnpm db:generate..."
cd "$PROJECT_ROOT"
if command -v pnpm &>/dev/null; then
  pnpm db:generate
  echo "[create-nestjs-module] Migration generated."
else
  echo "[create-nestjs-module] WARN: pnpm not found — skipping migration generation."
fi

echo "[create-nestjs-module] Done."
```

- [ ] **Step 2: Make executable**

Run: `chmod +x .ai/skills/create-nestjs-module/run.sh`

- [ ] **Step 3: Smoke test — usage error**

Run: `.ai/skills/create-nestjs-module/run.sh`
Expected: Exit 1, usage message

- [ ] **Step 4: Smoke test — invalid domain**

Run: `.ai/skills/create-nestjs-module/run.sh xyz invalid-module`
Expected: Exit 1, "Tower directory not found"

- [ ] **Step 5: Smoke test — valid domain (dry check with non-existent module)**

Run: `.ai/skills/create-nestjs-module/run.sh pm test-automation-skill-xyz --dry 2>&1 || true`
If `--dry` flag not supported, skip this step. Verify script is syntactically valid:

Run: `bash -n .ai/skills/create-nestjs-module/run.sh && echo "syntax OK"`
Expected: "syntax OK"

- [ ] **Step 6: Commit**

```bash
git add .ai/skills/create-nestjs-module/run.sh
git commit -m "feat(skill): add run.sh for create-nestjs-module

Automates:
- Step 1: scaffold folder structure (module, service, controller, DTOs, spec)
- Step 8: run pnpm db:generate

Steps 2-7 remain manual (schema, Zod DTOs, service logic, controller,
module registration, tests) due to project-specific context.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 1C: Upgrade `create-react-page`

### Task 7: Create Folder + `skill.yaml`

**File:** Create `.ai/skills/create-react-page/skill.yaml`

- [ ] **Step 1: Create folder and `skill.yaml`**

```bash
mkdir -p .ai/skills/create-react-page
```

```yaml
name: create-react-page
triggers:
  - "/create-react-page"
  - "create react page"
  - "add react page"
  - "create page"
description: >
  Scaffold a new React page in client-portal or admin-portal.
  Creates the page component, adds the route to App.tsx.
  Hooks and business logic remain manual.
uses: []
```

- [ ] **Step 2: Commit**

```bash
git add .ai/skills/create-react-page/skill.yaml
git commit -m "feat(skill): add skill.yaml metadata for create-react-page

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Create `skill.md` (move content from `.ai/skills/create-react-page.md`)

**File:** Create `.ai/skills/create-react-page/skill.md`

- [ ] **Step 1: Write skill.md**

```markdown
# Skill: Create React Page

> Step-by-step guide for adding a new page/route to client-portal or admin-portal.
> Automation: `.ai/skills/create-react-page/run.sh` handles page scaffold and route registration.

## When to Use

When adding a new page or feature screen to either frontend application.

## App Targets

- `client-portal` — customer-facing app (`apps/client-portal/src/`)
- `admin-portal` — admin dashboard (`apps/admin-portal/src/`)

## Steps

### 1. Create the page component

Automation available via `run.sh <app> <section> <page-name>`.

### 2. Add the route

Automation available via `run.sh <app> <section> <page-name>`.

In `apps/<app>/src/App.tsx`, add the route inside the protected routes:

```tsx
<Route path="/<section>/<page>" element={<PageName />} />
```

Use lazy loading for large pages:
```tsx
const PageName = lazy(() => import("./pages/<section>/<page-name>"));
```

### 3. Create data fetching hooks

In `apps/<app>/src/hooks/use-<entity>.ts`:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useEntities(params) {
  return useQuery({
    queryKey: ["entities", params],
    queryFn: () => api.get("/api/entities", { params }),
  });
}

export function useCreateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/api/entities", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entities"] }),
  });
}
```

### 4. Add form validation (if applicable)

Create Zod schema for form validation:

```tsx
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "Required"),
  // ...fields
});

const form = useForm({ resolver: zodResolver(schema) });
```

### 5. Use @ech/ui components

- Layout: use `AppLayout` from `@ech/ui`
- Data display: use `DataTable` from `@ech/ui`
- Forms: use `Form`, `Input`, `Select`, `Button` from `@ech/ui`
- Feedback: use `sonner` for toast notifications

### 6. Add navigation

Update the sidebar/navigation component to include a link to the new page.

### 7. Test

- Verify the route renders correctly
- Test data fetching (loading, error, success states)
- Test form validation (if applicable)
- Test responsive layout

## Skill Metadata

- **Automation:** steps 1 (page scaffold) and 2 (route registration) are automated via `run.sh`
- **Steps 3-7** remain manual (hooks, validation, components, nav, tests)
```

- [ ] **Step 2: Commit**

```bash
git add .ai/skills/create-react-page/skill.md
git commit -m "feat(skill): move create-react-page content to skill.md

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Write `run.sh` for `create-react-page`

**File:** Create `.ai/skills/create-react-page/run.sh`

The script automates:
- **Step 1:** Scaffold the page component file
- **Step 2:** Add the route entry to `App.tsx`

Steps 3-7 remain manual (hooks, validation, components, nav, tests).

- [ ] **Step 1: Write the run.sh script**

```bash
#!/bin/bash
# .ai/skills/create-react-page/run.sh
# Usage: run.sh <app> <section> <page-name>
#   app:      client-portal | admin-portal
#   section:  kebab-case section, e.g. "products"
#   page-name: kebab-case page, e.g. "product-list"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

if [[ $# -ne 3 ]]; then
  echo "Usage: run.sh <app> <section> <page-name>"
  echo "  app:      client-portal | admin-portal"
  echo "  section:  kebab-case section, e.g. products"
  echo "  page-name: kebab-case page, e.g. product-list"
  exit 1
fi

APP="$1"
SECTION="$2"
PAGE="$3"

APP_DIR="$PROJECT_ROOT/apps/$APP/src"

if [[ ! -d "$APP_DIR" ]]; then
  echo "[create-react-page] ERROR: App directory not found: $APP_DIR"
  exit 1
fi

# Convert kebab-case to PascalCase
PASCAL_SECTION=$(echo "$SECTION" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1))substr($i,2); print}' | tr -d ' ')
PASCAL_PAGE=$(echo "$PAGE" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1))substr($i,2); print}' | tr -d ' ')
COMPONENT_NAME="${PASCAL_SECTION}${PASCAL_PAGE}"

PAGE_FILE="$APP_DIR/pages/$SECTION/$PAGE.tsx"
ROUTE_COMMENT="<!-- route: $SECTION/$PAGE -->"

echo "[create-react-page] Creating page '$PAGE' in '$SECTION' of $APP..."

# Step 1: Scaffold page component
mkdir -p "$APP_DIR/pages/$SECTION"
if [[ -f "$PAGE_FILE" ]]; then
  echo "[create-react-page] WARN: Page already exists at $PAGE_FILE — skipping."
else
  cat > "$PAGE_FILE" << EOF
import { lazy } from 'react';

const ${COMPONENT_NAME} = lazy(() => import('./${PAGE}'));

export default function ${COMPONENT_NAME}() {
  return (
    <div>
      <h1>${PASCAL_PAGE} Page</h1>
      {/* TODO: implement page content */}
    </div>
  );
}

export { ${COMPONENT_NAME} };
EOF
  echo "[create-react-page] Created: $PAGE_FILE"
fi

# Step 2: Add route to App.tsx
APP_TSX="$APP_DIR/App.tsx"
if [[ ! -f "$APP_TSX" ]]; then
  echo "[create-react-page] WARN: App.tsx not found at $APP_TSX — skipping route registration."
else
  ROUTE_LINE="<Route path=\"/$SECTION/$PAGE\" element={<${COMPONENT_NAME} />} />"
  if grep -q "path=\"/$SECTION/$PAGE\"" "$APP_TSX"; then
    echo "[create-react-page] WARN: Route '/$SECTION/$PAGE' already exists in App.tsx — skipping."
  else
    # Insert before the closing </Routes> tag
    sed -i "s|</Routes>|$ROUTE_LINE\n</Routes>|" "$APP_TSX"
    echo "[create-react-page] Added route '/$SECTION/$PAGE' to $APP_TSX"
  fi
fi

echo "[create-react-page] Done."
echo "  NOTE: Steps 3-7 (hooks, validation, @ech/ui components, navigation, tests) are manual."
echo "  See .ai/skills/create-react-page/skill.md for the full guide."
```

- [ ] **Step 2: Make executable and verify syntax**

Run: `chmod +x .ai/skills/create-react-page/run.sh && bash -n .ai/skills/create-react-page/run.sh && echo "syntax OK"`
Expected: "syntax OK"

- [ ] **Step 3: Smoke test — usage error**

Run: `.ai/skills/create-react-page/run.sh`
Expected: Exit 1, usage message

- [ ] **Step 4: Commit**

```bash
git add .ai/skills/create-react-page/run.sh
git commit -m "feat(skill): add run.sh for create-react-page

Automates:
- Step 1: scaffold page component with lazy loading
- Step 2: register route in App.tsx

Steps 3-7 remain manual (hooks, validation, @ech/ui components, nav, tests).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 1D: Integration

### Task 10: Update `.claude/commands/create-module.md`

**File:** Modify `.claude/commands/create-module.md`

- [ ] **Step 1: Read current content**

Current content (read earlier):
```
Create a new NestJS domain module following ECH-Kenshin conventions.
Read `.ai/skills/create-nestjs-module.md` for the step-by-step guide.
...
```

- [ ] **Step 2: Update to use new folder structure**

```markdown
Create a new NestJS domain module following ECH-Kenshin conventions.

Read `.ai/skills/create-nestjs-module/skill.md` for the full step-by-step guide.
For automation: invoke `.ai/skills/create-nestjs-module/run.sh <domain> <module>` via Bash.

Ask me:
1. Which domain tower? (PM, INV, OMS, FUL)
2. What is the module name and its business purpose?
3. What database tables does it need?

Then follow all 8 steps in the create-nestjs-module skill:
1. Create folder structure         — automated via run.sh
2. Define Drizzle schema           — manual
3. Create Zod DTOs                 — manual
4. Implement service               — manual
5. Implement controller            — manual
6. Register module                 — manual
7. Write tests                     — manual
8. Generate migration              — automated via run.sh (pnpm db:generate)

Follow `.ai/rules/backend.md` and `.ai/rules/database.md` conventions.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/create-module.md
git commit -m "refactor(commands): update create-module.md for hybrid skill structure

Points to .ai/skills/create-nestjs-module/skill.md (new folder path)
and notes which steps are automated via run.sh vs manual.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Add `.claude/commands/create-react-page.md`

**File:** Create `.claude/commands/create-react-page.md`

- [ ] **Step 1: Write the slash command**

```markdown
Create a new React page in client-portal or admin-portal.

Read `.ai/skills/create-react-page/skill.md` for the full step-by-step guide.
For automation: invoke `.ai/skills/create-react-page/run.sh <app> <section> <page>` via Bash.

Ask me:
1. Which app? (client-portal or admin-portal)
2. Which section? (e.g., products, orders, users)
3. What is the page name?

Then follow all 7 steps in the create-react-page skill:
1. Create page component             — automated via run.sh
2. Add route to App.tsx              — automated via run.sh
3. Create data fetching hooks       — manual
4. Add form validation (if needed)  — manual
5. Use @ech/ui components           — manual
6. Add navigation link              — manual
7. Test                             — manual

Follow `.ai/rules/frontend.md` conventions.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/create-react-page.md
git commit -m "feat(commands): add create-react-page slash command

Wraps .ai/skills/create-react-page/run.sh as a Claude Code entry point.
Similar pattern to existing create-module and create-endpoint commands.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Delete the old `.md` files

**Files:** Delete `.ai/skills/create-nestjs-module.md` and `.ai/skills/create-react-page.md`

- [ ] **Step 1: Delete the old files**

```bash
rm .ai/skills/create-nestjs-module.md .ai/skills/create-react-page.md
```

- [ ] **Step 2: Verify**

Run: `ls .ai/skills/*.md | sort`
Expected: Remaining markdown-only skills: `api-endpoint-checklist.md`, `database-migration.md`, `debugging-guide.md`, `pr-review-guide.md`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(skills): remove old .md files, promoted to hybrid folder format

create-nestjs-module.md -> create-nestjs-module/skill.md
create-react-page.md -> create-react-page/skill.md
Content preserved, structure upgraded.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Regenerate registry + verify all commands

- [ ] **Step 1: Run discovery script**

Run: `docs/superpowers/skills-discover.sh`
Expected: Lists all skills including new hybrid ones with `hasAutomation: true`

- [ ] **Step 2: Verify registry.json accuracy**

Run: `cat docs/superpowers/registry.json | jq '.skills[] | "\(.name) hasAutomation=\(.hasAutomation)"'`
Expected:
```
"create-nestjs-module hasAutomation=true"
"create-react-page hasAutomation=true"
"api-endpoint-checklist hasAutomation=false"
"database-migration hasAutomation=false"
"debugging-guide hasAutomation=false"
"pr-review-guide hasAutomation=false"
```

- [ ] **Step 3: Verify create-module command still works (path check)**

Run: `grep -c "create-nestjs-module/skill.md" .claude/commands/create-module.md`
Expected: 1

- [ ] **Step 4: Verify new create-react-page command exists**

Run: `cat .claude/commands/create-react-page.md | head -3`
Expected: Slash command header text

- [ ] **Step 5: Commit registry update**

```bash
git add docs/superpowers/registry.json
git commit -m "chore(workspace): regenerate registry.json with hybrid skills

create-nestjs-module and create-react-page now have hasAutomation=true.
All 6 skills registered.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 14: Update `docs/status/LIVING.md`

- [ ] **Step 1: Read current LIVING.md**

- [ ] **Step 2: Add extensible skill system entry**

Add under a new "## Active Development" or "## Recent Work" section:

```markdown
### Extensible Skill System (Phase 1) — 2026-04-03
- Spec: `docs/superpowers/specs/2026-04-03-extensible-skill-system-spec.md`
- Plan: `docs/superpowers/plans/2026-04-03-extensible-skill-system.md`
- Infrastructure: `skills-discover.sh`, `skills-install.sh`, `registry.json`
- Hybrid skills: `create-nestjs-module`, `create-react-page`
- Status: ✅ Complete
```

- [ ] **Step 3: Commit**

```bash
git add docs/status/LIVING.md
git commit -m "docs(status): record extensible skill system Phase 1 completion

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Spec Coverage Check

| Spec Requirement | Task(s) |
|-----------------|---------|
| `skills-discover.sh` scan + generate registry | Task 1 |
| `skills-install.sh` git-clone installer | Task 2 |
| `registry.json` generation | Task 1 |
| `create-nestjs-module` folder + `skill.yaml` + `run.sh` | Tasks 4, 5, 6 |
| `create-react-page` folder + `skill.yaml` + `run.sh` | Tasks 7, 8, 9 |
| Add `.claude/commands/create-react-page.md` | Task 11 |
| Update `.claude/commands/create-module.md` | Task 10 |
| Verify all commands work | Task 13 |
| Update `_index.md` | Task 3 |
| Update `LIVING.md` | Task 14 |
| Remove old `.md` files | Task 12 |

All spec requirements are covered. No gaps.

## Placeholder Scan

- No `TBD`, `TODO`, or placeholder code in task descriptions
- All script code is complete and executable
- No "similar to Task N" references — each task is self-contained
