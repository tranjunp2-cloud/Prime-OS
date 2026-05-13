---
title: "UI/UX Research: Fin Support Overview"
created: 2026-05-14
source: "ui-ux-pro-max + ux-researcher"
---

# UI/UX Research: Fin Support Overview

## Summary

The current page has the right enterprise SaaS tone, but too many equal tabs and repeated cards. The stronger model is a bank-readiness workflow: answer first, evidence health second, route choice third, operational fixes fourth.

## Findings

| Finding | Severity | Recommendation |
|---|---|---|
| Six peer tabs expose internal implementation, not the funding journey. | High | Group into Overview, Package, Routes, Audit while preserving query IDs. |
| Overview repeats evidence, blockers, routes, and summary as large peer cards. | High | Turn overview into preview + route surface, not full detail. |
| Finance comparison data is mostly card text. | Medium | Add charts for readiness factors, evidence coverage, and route fit. |
| “Fix blockers” can misroute operational blockers to documents. | Medium | Route by blocker type: package, source workflow, or route review. |

## Design System Direction

- Product type: enterprise fintech SaaS.
- Style: minimal, structured, low decoration.
- Color: keep Prime purple as product primary; use semantic green/orange/red only for statuses.
- Typography: compact enterprise scale, tabular numbers for scores/ranges.
- Interaction: rows with detail drawer/dialog; avoid making every item a card.

## Chart Recommendations

- Horizontal bar/bullet chart for readiness factors.
- Stacked status bar for evidence package coverage.
- Horizontal route-fit chart for lenders.
- Process rail/timeline for package/application state.
- Compact settlement lane bars only if space allows.

## UX Guardrails

- Do not imply credit approval or disbursement.
- Do not hide audit completely; finance users need traceability.
- Do not rely on hover-only explanations.
- Do not use color alone for risk or status.
