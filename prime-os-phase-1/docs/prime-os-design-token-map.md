# Prime OS Design Token & Component Audit

Date: 2026-04-25  
Scope: Prime OS full/main design system rebuild

## 1. Design Direction Lock

Direction: **industrial operating control-plane**.

Prime OS should feel like a compact system for deciding, executing, guarding, and reading outcomes. The visual language is restrained, dark-first, violet-accented, and data-dense. It should not feel like a marketing website, a generic dashboard kit, or a soft CRM template.

DFII:

- Aesthetic impact: 4/5
- Context fit: 5/5
- Implementation feasibility: 5/5
- Performance safety: 5/5
- Consistency risk: 2/5
- Score: 17 - 2 = 15

## 2. Token Inventory

Primary token file:

- `app/src/index.css`

Token groups now used:

- Primitive theme: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--border`, `--ring`
- Prime surface tokens: `--surface-*`, `--border-divider`, `--text-*`
- Operating tokens: `--decision-*`, `--status-*`, `--area-*`
- Component tokens: `--sidebar-width-*`, `--header-height`, `--row-height-*`, `--command-palette-width`
- Typography utilities: `.font-identifier`, `.text-metadata`, `.text-identifier`
- Row utilities: `.bg-row-hover`, `.bg-row-selected`

Keep:

- Semantic HSL variable structure so Tailwind classes remain stable.
- Dark-first mode as default.
- Light mode compatibility via existing variable override.

Refactor target:

- Avoid raw page-level color gradients except product imagery or deliberate area accent.
- Use semantic tokens for decision/evidence/guardrail/outcome language.

## 3. Core UI Component Inventory

Refactored or standardized:

- `components/ui/button.tsx`
- `components/ui/card.tsx`
- `components/ui/input.tsx`
- `components/ui/badge.tsx`
- `components/ui/table.tsx`
- `components/ui/dialog.tsx`
- `components/ui/command.tsx`
- `components/ui/tabs.tsx`
- `components/system/DataTable.tsx`
- `components/system/EmptyState.tsx`
- `components/system/SummaryMetricCard.tsx`

Reuse rule:

- Keep Radix/shadcn primitives.
- Keep current `PageHeader`, `SummaryMetricCard`, `DataTable`.
- Add Prime-specific operating components above primitives rather than rewriting every page.

## 4. Layout Inventory

Primary shell:

- `components/layout/AppLayout.tsx`
- `components/layout/AppSidebar.tsx`
- `components/layout/PrimeCommandPalette.tsx`

Shell state:

- Sidebar active state now uses compact row selection.
- Header has real command palette behavior via `Cmd/Ctrl + K`.
- Main workspace keeps table horizontal overflow intentional while avoiding document-level overflow.

## 5. Prime-Specific Pattern Inventory

Repeated patterns found in `PrimeOverview.tsx` and `PrimeTowerPage.tsx`:

- Job-to-be-done banner
- Handoff link
- Metric strips
- Evidence cards
- Guardrail blocks
- Action cards
- Runtime context cards
- Registry tables
- Launch/decision cards

Canonical replacement pattern:

- `DecisionHeader`: what the user decides here.
- `OperatingLoop`: four-part system language: signal, decision, handoff, outcome.
- `HandoffRail`: current tower to next tower.
- `EvidenceStack`: proof list with linked context.
- `GuardrailCard`: risk/control row.
- `OutcomePreview`: expected result.
- `LinkedEntityStrip`: compact linked entity chips.
- `ActionSetupPanel`: next operator action setup.
- `OwnerSlaBadge`: owner and SLA metadata.
- `RegistryList`: compact list/table fallback for operating queues.

## 6. Reuse vs Refactor

Reuse:

- Existing mock backbone from `lib/prime/*`.
- Existing Prime route tree.
- Existing COS modules and order/fulfillment detail routes.
- Existing `SummaryMetricCard`, `PageHeader`, and `DataTable` after visual polish.

Refactor:

- PrimeOverview operating sections.
- PrimeTowerPage job banner and repeated shell around panels.
- Base table/list/card density.

Do not rebuild:

- COS order/fulfillment logic.
- Prime data mock generation.
- Full page IA.
- Auth/session flow.

## 7. Completion Criteria

The design rebuild is considered complete when:

- All phases in `prime-os-design-system-rebuild-plan.md` have at least one concrete code or doc artifact.
- Priority routes share the same operating language.
- Browser QA passes key routes and viewports.
- Legacy COS detail navigation does not escape to overview.
