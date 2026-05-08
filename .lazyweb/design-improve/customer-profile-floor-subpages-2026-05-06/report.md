# Customer Profile Floor Sub-Page Redesign

Date: 2026-05-06

Scope: Prime OS / Customer Area / CRM Tower / Customer Profile Floor

## Current issue

The current CRM compact screen has sub-floor links, but the UI still behaves like one mixed page. On `?floor=contact`, the operator still sees overview KPI cards and large Account / Contact / Identity Matching / Customer Tags cards before the Contact workflow. This makes Contact feel like a section under Account, not a separate sub-page.

## Design references used

- `references/current-overview.png`: current wide CRM Tower overview.
- `references/current-subfloor.png`: current sub-floor screen showing large cards above Account content.
- `references/lazyweb-overview-appcues.png`: overview-style dashboard with top-level tabs and a getting-started / next-action model.
- `references/lazyweb-contact-directory-fotmob.png`: dense contact/person directory pattern with table, filters, rows, status, owner, and selectable records.
- `references/lazyweb-duplicate-appzen.png`: duplicate-detection / review concept suitable for Identity Matching queue.
- `references/lazyweb-tags-intercom.png`: segmentation / custom attribute creation pattern suitable for Customer Tags taxonomy and assignment.

Visual image-compare results were not used as primary references because the closest matches were shopping and finance mobile screens, not CRM operator workspaces. Text-pattern Lazyweb search produced stronger references.

## Target information architecture

Customer Profile becomes a small floor shell with real child pages:

```text
Customer Profile Floor
├─ Overview
├─ Account
├─ Contact
├─ Identity Matching
└─ Customer Tags
```

Routes:

- `/customer/crm-compact?floor=overview`
- `/customer/crm-compact?floor=account`
- `/customer/crm-compact?floor=contact`
- `/customer/crm-compact?floor=identity`
- `/customer/crm-compact?floor=tags`

Default `/customer/crm-compact` should resolve to `overview`.

## Proposed UI structure

### 1. Overview tab

Overview owns the tower-level summary only:

- KPI strip: accounts, contacts, owner coverage, identity alerts.
- Operating loop / readiness / evidence stack.
- Next action panel linking into Account, Contact, Identity Matching, Customer Tags.
- No account editor, no contact editor.

Reason: overview should answer "what needs attention first?", not compete with the sub-page workflows.

### 2. Account page

Account becomes a true account workspace:

- Header: `Account`
- Left: account list, search, tag/owner/lifecycle/type filters, create account.
- Right: selected account 360, company info, owner, lifecycle, status, tags, identity completeness.
- Contacts appear only as a compact count/link to Contact.
- Remove large sub-floor cards above it.

Reason: Account owns company identity. It should not carry full contact management.

### 3. Contact page

Contact becomes a true contact workspace:

- Header: `Contact`
- Compact account selector/context card.
- Contact directory table/list for the selected account.
- Add/edit contact, primary contact control, role/title/email/phone/channel.
- Coverage warning: missing primary contact, duplicate email, missing phone, etc.
- No account profile editor except compact context.

Reason: Contact is operationally different from Account. Operators should land directly on people/contact work.

### 4. Identity Matching page

Identity Matching becomes a review queue:

- Left: potential duplicate account/contact queue.
- Right: selected match detail.
- Show confidence, matching reason, affected records, suggested action.
- Keep it review-only; no real merge execution yet.

Reason: matching is a risk workflow, not a passive alert card.

### 5. Customer Tags page

Customer Tags becomes a taxonomy + assignment workspace:

- Tag taxonomy list with color/category.
- Selected tag detail: description, usage count, matching accounts.
- Account assignment/removal for mock state.
- Segment usage placeholder for future Demand / Intelligence handoff.

Reason: tags are a segmentation source of truth, not only chips on account detail.

## Navigation changes

Use both sidebar and local compact nav, but remove the large four-card sub-floor nav from every page.

Sidebar child order:

1. Overview
2. Account
3. Contact
4. Identity Matching
5. Customer Tags

Local page nav:

- Compact segmented row under Customer Profile header.
- Active page uses `aria-current="page"`.
- On mobile, horizontal scroll or wrap into a select/menu.
- Page title and primary CTA change by active sub-page.

## Implementation plan

1. Add `overview` to `CustomerSubFloor`.
2. Change `resolveSubFloor()` default from `account` to `overview`.
3. Add Overview to `customerSubFloors` and sidebar navigation.
4. Extract current top KPI/operating summary into `OverviewSubFloor`.
5. Render only page-owned content per active sub-floor.
6. Replace large card nav with compact tab/segmented nav.
7. Keep shared selected account state for Account -> Contact transitions.
8. Update route/i18n/tests for default Overview and deep links.

## Validation plan

- `/customer/crm-compact` opens Overview.
- `/customer/crm-compact?floor=account` opens directly to Account list + Account 360.
- `/customer/crm-compact?floor=contact` opens directly to Contact workspace.
- `/customer/crm-compact?floor=identity` opens duplicate review queue.
- `/customer/crm-compact?floor=tags` opens tag workspace.
- Sidebar active state works for query-param children.
- Keyboard focus reaches local tabs and uses visible active state.
- Mobile layout avoids horizontal text overflow.
- Run lint, tests, build, and route-shell Playwright specs.

## Risks

- Existing tests may expect default `account`; update to `overview`.
- Deep links without `floor` will change behavior.
- Account selector state must remain stable when moving from Account to Contact.
- Current component is large; extracting sub-components should be scoped and mechanical to avoid behavioral drift.

## Recommended decision

Proceed with the IA-first fix. Do not only restyle the existing page. The UI needs separate sub-pages with Overview removed from Account and Contact workflows.
