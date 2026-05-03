---
title: "PrimeOS UI/UX Refresh"
description: "Improve PrimeOS visual system, navigation, dashboard clarity, admin consistency, and accessibility using 21st.dev-inspired patterns."
status: completed
priority: P1
effort: 18h
branch: main
tags: [ui, ux, design-system, accessibility, dashboard]
created: 2026-05-03
---

# PrimeOS UI/UX Refresh Plan

## Goal
Make PrimeOS feel like a polished operating system: search-first, operationally dense, consistent, accessible, responsive.

## Design Direction
- Style: premium flat operational SaaS, light-first, dark-ready.
- IA: 21st.dev-inspired discoverability: grouped sidebar, global command/search, card grids, compact metadata.
- Tokens: semantic surfaces/status/area colors; no raw one-off styling.
- Components: improve existing shadcn/Radix layer; avoid new UI library.

## Phases
1. `phase-01-design-system-foundation.md` — tokens, typography, spacing, motion, focus states.
2. `phase-02-shell-navigation-search.md` — sidebar/header/command UX inspired by 21st.dev.
3. `phase-03-dashboard-pages-polish.md` — cards, tables, KPI, charts, empty/loading/error states.
4. `phase-04-admin-web-alignment.md` — align admin visual system with main app.
5. `phase-05-accessibility-responsive-qa.md` — a11y, keyboard, mobile, reduced-motion, build/test. Completed with lint warning.
6. `phase-06-lint-debt-cleanup.md` — clean ESLint config debt so lint can become a CI gate.

## Success Criteria
- Main/admin share recognizable PrimeOS design language.
- Core pages no horizontal scroll at 375px.
- Interactive targets ≥44px where practical.
- Keyboard focus visible on all interactive elements.
- Tables/cards/status badges consistent across app.
- `npm run build:dev`, `npm run test`, targeted UI smoke pass.

## Sources
- Research: `research/01-21st-dev-scan.md`
- Scout: `scout/01-codebase-scout.md`
