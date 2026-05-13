# PrimeOS LarkVer Session Memory — 2026-05-13

## Workspace / Git

- Active repo now: `/Users/admin/Desktop/PrimeOS_LarkVer`
- This folder was converted into a real git clone of `PrimeOS` on `main`.
- Original non-git working folder was backed up to:
  - `/Users/admin/Desktop/PrimeOS_LarkVer.backup-20260513-143748`
- Remote:
  - `origin https://github.com/thanhnguyen4649/PrimeOS.git`
- Last pushed commit:
  - `32ddfc9 Unify Prime OS product workspaces`
- Commit was pushed to `origin/main`.
- Validation before commit:
  - `npm run build:dev` passed.
  - `npm test -- src/lib/prime/mdec-seed-data.test.ts src/lib/prime/consulting-agent-seed-data.test.ts src/lib/prime/finance-trust-profile.test.ts src/lib/prime/prime-navigation.test.ts src/lib/prime/prime-product-settings-nav.test.ts` passed with `13 passed`.

## User Style / Preferences

- User prefers terse Vietnamese updates.
- User often asks to use skills/subagents explicitly.
- User wants implementation, not long theory.
- User dislikes fake/mock-only UI when buttons do nothing.
- User wants visual QA based on screenshots.
- Important repeated instruction: do not use `apply_patch` via shell command. In this environment, no native `apply_patch` tool was exposed, so file edits were done via scripts; mention if needed.

## Important Skills Used / Expected

- `ck:cook`: use before implementing features.
- `ck:fix`: use before fixing bugs/UI issues.
- `qa`: use for systematic QA / smoke checks.
- `lazyweb-design-brainstorm`: used to create design brainstorm report for CRM popup.
- `git-workflow-manager`: used/consulted for commit/push.

## Major Work Completed

### 1. MDEC Product in Demand Suite

Implemented/iterated a new MDEC product under Demand.

Routes/views:
- `/demand/mdec`
- `/demand/mdec?view=dashboard`
- `/demand/mdec?view=calendar`
- `/demand/mdec?view=composer`
- `/demand/mdec?view=approvals`
- `/demand/mdec?view=engagement`
- `/demand/mdec?view=escalations`
- `/demand/mdec?view=analytics`
- `/demand/mdec?view=listening`
- `/demand/mdec?view=reports`

Key files:
- `prime-os-phase-1/app/src/pages/prime/PrimeMdecPage.tsx`
- `prime-os-phase-1/app/src/lib/prime/mdec-seed-data.ts`
- `prime-os-phase-1/app/src/lib/prime/mdec-seed-data.test.ts`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.test.ts`
- `prime-os-phase-1/app/src/lib/prime/prime-product-settings-nav.test.ts`

Design/behavior decisions:
- MDEC is a product under Demand Suite.
- Sidebar/right sidebar consolidation happened earlier: only one sidebar should exist.
- Admin/settings were removed from MDEC product nav when user requested.
- MDEC overlays/floating bottom blanks were fixed.
- Global Prime AI FAB was hidden/moved in MDEC contexts where it caused UI issues.

MDEC calendar final notes:
- User said the local calendar was too fake and wanted it closer to real MDEC source behavior.
- Source page audited:
  - `https://mdec-social-management-platform.vercel.app/calendar`
- Source behaviors observed:
  - `New post` link to composer.
  - `Month / Week / Agenda` buttons.
  - `All channels` filter.
  - `Previous / Today / Next` month controls.
  - Queue rows clickable.
  - Calendar items clickable.
- Local calendar now has:
  - Real date-grid logic using `Date`, not fake month label offsets.
  - `May 2026`, no `+0` bug.
  - `Next` -> `June 2026`.
  - `Previous` returns to prior month.
  - Month / Week / Agenda render distinct real views.
  - Channel filter cycles through actual post channels.
  - Queue row and grid item select post.
  - Details panel with status, channels, time, campaign, product, SKU, next action.
  - Actions: `Open in composer`, `Mark approved`, `Send to review`.
- Verification screenshot:
  - `/Users/admin/Desktop/PrimeOS_LarkVer/research/mdec-social-platform/local-calendar-real-rerun.png`
- Last smoke result:
  - May 2026 present.
  - No `+0`.
  - Next shows June 2026.
  - Week shows `MAY 14`.
  - Agenda has `Open in composer`.
  - No horizontal overflow: `docW=1440`, `innerWidth=1440`.

### 2. Consulting Agent Product

User wanted to merge Intelligence routes into one product:
- `/intelligence/decision-hub`
- `/intelligence/signals`
- `/intelligence/launch-decisions`

New product:
- `Consulting Agent`

Routes/tabs:
- `/intelligence/consulting-agent?tab=kpi`
- `/intelligence/consulting-agent?tab=signals`
- `/intelligence/consulting-agent?tab=launch`

Legacy redirects mapped:
- `/intelligence` -> Consulting Agent KPI
- `/intelligence/decision-hub` -> KPI
- `/intelligence/signals` -> Signals Board
- `/intelligence/launch-decisions` -> Launch Decisions

Key files:
- `prime-os-phase-1/app/src/pages/prime/PrimeConsultingAgentPage.tsx`
- `prime-os-phase-1/app/src/lib/prime/consulting-agent-seed-data.ts`
- `prime-os-phase-1/app/src/lib/prime/consulting-agent-seed-data.test.ts`
- `prime-os-phase-1/app/src/App.tsx`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`

Sub views:
- KPI Dashboard: kanban draggable cards.
- Signals Board: existing intelligence drag board.
- Launch Decisions: Go / Review / Hold / No-go grouped cards.

KPI card details behavior:
- Initially details were a right-side column.
- User asked to remove right column and show popup on details click.
- Final behavior:
  - No inline details column.
  - `Open details` opens modal/popup.
  - Popup shows KPI card detail, source owners, linked consulting packages, operator action.
  - Escape closes modal.
  - Verified by Playwright.
- Screenshot:
  - `/Users/admin/Desktop/PrimeOS_LarkVer/research/consulting-agent/consulting-agent-kpi-card-details-modal.png`

Plan artifact:
- `/Users/admin/Desktop/PrimeOS_LarkVer/research/consulting-agent/consulting-agent-product-plan.html`

### 3. Finance / Fin Support Refactor

User requested major IA refactor for:
- `http://127.0.0.1:5173/finance/fin-support`

Goal:
- Make page a funding readiness cockpit, not long dense dashboard.
- First screen must answer:
  1. Am I ready?
  2. What blocks me?
  3. What should I do next?

Implemented 6 tabs:
- `Overview`
- `Evidence`
- `Documents`
- `Review Routes`
- `Applications`
- `Audit`

Key file:
- `prime-os-phase-1/app/src/pages/prime/PrimeFinSupportPage.tsx`

New/important components in same file:
- `FinanceTabs`
- `FundingReadinessHero`
- `OverviewCockpit`
- `ReadinessBreakdownGrid`
- `ReadinessMetricCard`
- `EvidencePackageSnapshot`
- `RiskBlockerPanel`
- `RecommendedRoutesPreview`
- `EvidenceTab`
- `EvidenceSourceTable`
- `DocumentsTab`
- `DocumentRequirementList`
- `ReviewRoutesTab`
- `ReviewRouteCard`
- `ReviewRouteComparisonTable`
- `ApplicationsTab`
- `ApplicationTimeline`
- `AuditTab`
- `AuditTrailTable`
- `PrimeAiPanel`

Data preserved/reused:
- Existing fallback finance data.
- Existing `buildFinanceTrustProfile`.
- Existing document builder and lender builder.
- Existing application tracker data.

Prime AI rule implemented:
- No repeated floating/random AI CTA.
- Overview has `Ask Prime AI` contextual action.
- Other tabs have one side contextual `PrimeAiPanel`.

Verification:
- `npm run build:dev` passed.
- `npm test -- src/lib/prime/finance-trust-profile.test.ts` passed.
- Playwright 6 tabs smoke passed.
- Screenshot:
  - `/Users/admin/Desktop/PrimeOS_LarkVer/research/finance-fin-support-cockpit.png`

### 4. CRM Account Profile Popup

Route:
- `/customer/crm-compact?floor=account`

User reported:
- Popup auto closed.
- Popup overflowed top/bottom.
- Tab scrollbar visible.
- Wanted click outside to close.
- Wanted design improvement via Lazyweb brainstorm.

Key file:
- `prime-os-phase-1/app/src/components/prime/customer-profile/CustomerProfileFloor.tsx`

Bug fixes:
- Added `profileAccountId` so profile dialog is locked to opened account, not unstable `selectedAccountId`.
- Popup top/bottom constrained:
  - `!top-[calc(50%+2.5rem)]`
  - `h-[min(760px,calc(100dvh-8rem))]`
  - `w-[calc(100vw-2rem)]`
  - `max-w-6xl`
  - internal scroll remains inside popup.
- Tab scrollbar hidden:
  - `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
- Outside click behavior restored per user request:
  - Popup closes when clicking outside.

Design brainstorm:
- Skill used: `lazyweb-design-brainstorm`
- Report files:
  - `prime-os-phase-1/app/.lazyweb/design-brainstorm/crm-profile-popup-2026-05-13/report.md`
  - `prime-os-phase-1/app/.lazyweb/design-brainstorm/crm-profile-popup-2026-05-13/report.html`
- Main idea: command-center peek modal.

Implemented popup design improvements:
- Header compressed.
- Header metrics moved into compact status strip:
  - Owner
  - Revenue
  - Open cases
  - Priority
- `What matters now` changed to `Next customer move`.
- Right rail changed to `Action context`.
- `Recent memory` compact timeline added.
- `Account memory` card separates tags/context.
- New components:
  - `CompactStatus`
  - `ActionContextRail`

Verification screenshots:
- `/Users/admin/Desktop/PrimeOS_LarkVer/research/crm-account-profile-modal-fixed.png`
- `/Users/admin/Desktop/PrimeOS_LarkVer/research/crm-account-profile-modal-top-safe.png`
- `/Users/admin/Desktop/PrimeOS_LarkVer/research/crm-account-profile-tabs-no-scrollbar.png`
- `/Users/admin/Desktop/PrimeOS_LarkVer/research/crm-profile-command-center-popup.png`

### 5. Navigation / Product Settings

User previously requested:
- Sidebar only has Overview and Settings.
- `Platform Admin` renamed to `Admin Setup` under Settings.
- Later user requested settings/admin removed for MDEC and suite placement adjusted.

Files touched around navigation:
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.test.ts`
- `prime-os-phase-1/app/src/lib/prime/prime-product-settings-nav.test.ts`
- `prime-os-phase-1/app/src/components/layout/AppLayout.tsx`
- `prime-os-phase-1/app/src/components/layout/AppSidebar.tsx`

Current commit includes navigation updates for MDEC and Consulting Agent.

## Git / Commit History From This Session

Commit pushed:

```text
32ddfc9 Unify Prime OS product workspaces
```

Commit body followed Lore protocol:
- Constraint
- Rejected
- Confidence
- Scope-risk
- Directive
- Tested
- Not-tested
- Co-authored-by OmX trailer

`hermes-agent/` was untracked in `PrimeOS_main` and intentionally not committed.

## Useful Verification Commands

From repo root:

```bash
cd /Users/admin/Desktop/PrimeOS_LarkVer/prime-os-phase-1/app
npm run build:dev
npm test -- src/lib/prime/mdec-seed-data.test.ts src/lib/prime/consulting-agent-seed-data.test.ts src/lib/prime/finance-trust-profile.test.ts src/lib/prime/prime-navigation.test.ts src/lib/prime/prime-product-settings-nav.test.ts
```

Useful Playwright smoke examples used:

```bash
node - <<'NODE'
const { chromium } = require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:5173/demand/mdec?view=calendar',{waitUntil:'networkidle'});
 const text=await page.locator('body').innerText();
 console.log(text.includes('May 2026'));
 await browser.close();
})();
NODE
```

## External Reference Pages Used

MDEC source references:
- `https://mdec-social-management-platform.vercel.app/calendar`
- `https://mdec-social-management-platform.vercel.app/dashboard`
- `https://mdec-social-management-platform.vercel.app/engagement`
- `https://mdec-social-management-platform.vercel.app/escalations`

Design brainstorm references:
- Notion database/page peek pattern:
  - `https://www.notion.com/help/views-filters-and-sorts`
- Intercom user/company profiles:
  - `https://www.intercom.com/help/en/articles/6988783-get-context-fast-with-user-and-company-profiles`

## Known Caveats / TODOs

- Full browser regression across every Prime OS route was not run.
- Build warns about chunks >500kB; not addressed.
- MDEC is improved but still local-state only. It does not persist to backend.
- Consulting Agent board moves are local/read-model only; do not mutate source owners.
- Finance tabs are one-file implementation in `PrimeFinSupportPage.tsx`; could later split into components.
- CRM popup is improved, but future visual polish may still be requested.
- The folder backup remains available if old artifacts/research files are needed:
  - `/Users/admin/Desktop/PrimeOS_LarkVer.backup-20260513-143748`

## Fast Onboarding For Next Agent

1. Start at repo:
   - `/Users/admin/Desktop/PrimeOS_LarkVer`
2. Check git:
   - `git status --short --branch`
3. If working on MDEC:
   - read `prime-os-phase-1/app/src/pages/prime/PrimeMdecPage.tsx`
   - read `prime-os-phase-1/app/src/lib/prime/mdec-seed-data.ts`
4. If working on Consulting Agent:
   - read `prime-os-phase-1/app/src/pages/prime/PrimeConsultingAgentPage.tsx`
   - read `prime-os-phase-1/app/src/lib/prime/consulting-agent-seed-data.ts`
5. If working on Finance:
   - read `prime-os-phase-1/app/src/pages/prime/PrimeFinSupportPage.tsx`
6. If working on CRM popup:
   - read `prime-os-phase-1/app/src/components/prime/customer-profile/CustomerProfileFloor.tsx`
   - read brainstorm report in `.lazyweb/design-brainstorm/crm-profile-popup-2026-05-13/report.md`
7. Validate with:
   - `npm run build:dev`
   - targeted `npm test -- ...`
8. Commit with Lore protocol and OmX co-author trailer.

## Lore Commit Reminder

Commit message format expected by repo hooks:

```text
<intent line>

<body>

Constraint: ...
Rejected: ... | ...
Confidence: high
Scope-risk: narrow|moderate|broad
Directive: ...
Tested: ...
Not-tested: ...
Co-authored-by: OmX <omx@oh-my-codex.dev>
```

## Session Update - 2026-05-14 Operation Agent / Tooltips

### Workspace / Git

- Active repo: `/Users/admin/Desktop/PrimeOS_LarkVer`
- Active branch during work: `main`
- Remote: `origin https://github.com/thanhnguyen4649/PrimeOS.git`
- Previous remote head before this session commit:
  - `32ddfc9 Unify Prime OS product workspaces`
- User requested final action:
  - commit all session work
  - push to `origin/main`
  - rewrite session journal into `memory`
- Secret hygiene:
  - Lazyweb bearer token was not written into repo memory or committed files.
  - `rg` scan for the provided token / bearer strings returned no matches in repo paths.

### Product Operation Agent Became Operation Agent

Route remains:
- `/intelligence/product-operation-agent?view=command`

Display/product naming was changed to:
- `Operation Agent`

Key behavior implemented:
- Real local chat transcript in Command Center, not a static mockup.
- Suggested prompts append real user/agent messages.
- Unknown prompts return clarification instead of fake action.
- Unsafe direct approval command is blocked.
- `Queue approval` creates Agent Queue state and audit state; it does not auto-approve or mutate source suites.
- Transcript persists while switching product subviews because Command Center remains mounted.

Key files:
- `prime-os-phase-1/app/src/pages/prime/PrimeProductOperationAgentPage.tsx`
- `prime-os-phase-1/app/src/lib/prime/product-operation-agent-seed-data.ts`
- `prime-os-phase-1/app/src/lib/prime/product-operation-agent-seed-data.test.ts`
- `prime-os-phase-1/app/src/App.tsx`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.ts`
- `prime-os-phase-1/app/src/lib/prime/prime-navigation.test.ts`
- `prime-os-phase-1/app/src/lib/prime/prime-product-settings-nav.test.ts`
- `prime-os-phase-1/app/src/lib/i18n/shell-dictionaries.ts`
- `docs/03-screen-map.md`
- `docs/05-demo-flows.md`
- `docs/06-bod-walkthrough.md`

### Operation Agent UI Iterations

Major layout changes:
- Reworked Command Center from cramped 3-column layout to a 2-zone workspace:
  - main chat surface
  - right inspector rail
- On narrower widths, context/preview content stacks below the chat.
- Chat became the primary visual object; supporting dashboard context is reduced.

Composer changes:
- Replaced ugly labeled `COMMAND COMPOSER` form with a single integrated command bar.
- Added agent icon inside the composer.
- Added file attach button with a hidden `input[type=file][multiple]`.
- Send still works with `Enter`; `Shift+Enter` remains newline behavior.
- Attachment UI opens file picker only; no upload/transcript attachment backend was added yet.

### Info Tooltip Pattern

User asked to replace subtitle/explanatory lines under headings with an `(i)` hover explanation pattern.

Shared supporting change:
- `SummaryMetricCard` now supports `metaTooltip`.
- When `metaTooltip` is present, the visible meta line is hidden and an info icon displays the explanation on hover.

Files:
- `prime-os-phase-1/app/src/components/system/SummaryMetricCard.tsx`

Operation Agent tooltip coverage:
- Product view tabs:
  - Command Center
  - Operating Kanban
  - Agent Queue
  - Audit
- Metric cards:
  - Operating cards
  - Approvals
  - High risk
  - Waiting
  - Suites
- Kanban lane headers:
  - Signal
  - Triage
  - Decision
  - In progress
  - Waiting
  - Done
  - Learning
- Agent Queue proposal cards.

Consulting Agent tooltip coverage:
- Header `Consulting Agent`
- Boundary protected card
- Tabs:
  - KPI Dashboard
  - Signals Board
  - Launch Decisions
- KPI metric cards.
- KPI lane headers and KPI cards.
- Signals board header, summary metrics, and lane headers.
- Launch selected decision title.

Key files:
- `prime-os-phase-1/app/src/pages/prime/PrimeConsultingAgentPage.tsx`
- `prime-os-phase-1/app/src/components/prime/IntelligenceDragBoard.tsx`

Fin Support tooltip coverage for:
- `/finance/fin-support?tab=overview`

Changed visible explanatory subtitles into `(i)` hover explanations for:
- Page title `Bank-ready funding cockpit`
- `Readiness Breakdown`
- Individual readiness signal cards
- `Evidence Package Snapshot`
- `Bank-facing preview`
- `Risk Blockers`
- `Recommended Review Routes`
- Individual lender route cards

File:
- `prime-os-phase-1/app/src/pages/prime/PrimeFinSupportPage.tsx`

### Plans / Research Artifacts

Plan and research artifacts created during the Operation Agent work:
- `.lazyweb/design-research/ai-command-center-chat-2026-05-13/`
- `docs/plans/2026-05-13-product-operation-agent/`
- `docs/plans/2026-05-13-product-operation-agent-command-center-chat/`
- `docs/plans/260513-2350-product-operation-agent-real-chat/`

### Verification Run This Session

Build:
- `npm run build:dev` passed repeatedly after implementation and UI edits.

Targeted tests run:
- `npm test -- src/lib/prime/product-operation-agent-seed-data.test.ts`

Browser smoke checks run with Chrome/Playwright:
- Operation Agent desktop/wide/mobile layout:
  - chat and inspector did not overflow.
- Operation Agent command composer:
  - label hidden from UI
  - file input exists
  - attach button exists
  - Enter submits prompt
  - no horizontal overflow
- Operation Agent tooltip pass:
  - tab/metric/kanban descriptions hidden from visible text
  - info icons present
  - no horizontal overflow
- Consulting Agent tooltip pass:
  - `kpi`, `signals`, and `launch` tabs checked
  - explanatory text hidden behind info icons
  - no horizontal overflow
- Fin Support overview tooltip pass:
  - overview copy hidden behind info icons
  - 16 info icons found
  - no horizontal overflow

Known caveats:
- Attachment button does not upload or persist files yet.
- Operation Agent state is still local demo state.
- Tooltip helper is duplicated locally in a few files; it can later be extracted into a shared component.
- Build still warns about large chunks >500kB; not addressed in this session.
