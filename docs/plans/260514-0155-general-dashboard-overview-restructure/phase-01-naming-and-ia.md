# Phase 01: Naming And IA

Status: completed

## Goal

Reframe `/overview` as **General Dashboard**, a cross-suite summary page for all suites rather than an action-first operating home.

## Tasks

1. Update visible naming:
   - Change the `primeNavigation` overview label from `Overview` to `General Dashboard`.
   - Keep `id: 'overview'`, `href: '/overview'`, and route redirects unchanged.
   - Ensure sidebar active state still works through `AppSidebar` and route matching.

2. Replace page headline language:
   - Use `General Dashboard` as the main title.
   - Use concise supporting context only if needed, for example `Cross-suite operating summary`.
   - Remove or demote `Operating Home`, `Operator mode`, and mission-first copy from the primary hierarchy.

3. Define the new section order:
   - Header + snapshot summary.
   - Suite health comparison.
   - Cross-suite KPI strip.
   - Dependency flow infographic.
   - Quick access hub.
   - Top priorities.
   - Audit/proof details.

4. Reduce mode-switch prominence:
   - If `Command / Investigate / Audit` remains, move it below dashboard summary or convert it to a lower detail filter.
   - Default view should be scannable without selecting a mode.

## Acceptance

- `/overview` route still works.
- Sidebar label reads `General Dashboard`.
- First viewport no longer reads primarily as a task queue.
- No route IDs or redirects are renamed.
- Existing legacy `/dashboard` and `/` redirects keep landing on `/overview`.

## Notes

Navigation label changes are medium risk because breadcrumbs, command palette, sidebar, and Product Settings can derive from `primeNavigation`. Keep the route stable and test route matching after the label change.
