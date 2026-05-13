# UI/UX Research

## Skill Inputs

Used `ui-ux-pro-max` with design-system-first research for enterprise SaaS dashboard patterns, chart choices, and information architecture.

## Direction

The page should become a cross-suite dashboard, not a wall of equal cards and not a task queue. The strongest framing is:

> Across all suites, what is healthy, what is blocked, and where do I go next?

## Design Pattern

- Enterprise SaaS, flat design.
- Minimal shadows.
- Clear scan order.
- Charts and labels over decorative visuals.
- Compact controls and predictable navigation.

## Recommended IA

1. General Dashboard header.
2. Executive KPI band.
3. Suite health chart.
4. Risk/status distribution.
5. Dependency flow infographic.
6. Quick links by suite.
7. Top priorities as a supporting section.
8. Audit/proof detail behind expansion.

## Chart Choices

Use:

- Horizontal bar chart for suite readiness.
- Bullet or compact KPI cards for threshold-based metrics.
- Segmented strip or stacked bar for Ready / Watch / Critical counts.
- Accessible flow rail for dependency risk.

Avoid:

- Primary donut charts for more than a few categories.
- Complex Sankey as the main answer.
- Decorative gauges across multiple suites.
- 3D, treemaps, or unreadable tiny charts.

## UX Risks

- Too many charts can make the page look impressive but less actionable.
- A dashboard label without quick links would not satisfy the launchpad goal.
- Color-only status will fail accessibility and enterprise scanability.
- A mode switch at the top makes users work before understanding the page.
- Dense audit/proof content should not live in the first viewport.

## Accessibility Notes

- Pair every status color with text.
- Keep chart values visible outside tooltips.
- Make quick links large enough for touch.
- Preserve keyboard focus order from summary to charts to links to priorities.
- Mobile charts should collapse into labeled rows if the chart gets too small.
