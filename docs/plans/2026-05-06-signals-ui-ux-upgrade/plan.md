---
title: "Signals UI/UX Upgrade"
description: "Upgrade Intelligence Signals into an evidence-validation cockpit aligned with Decision Hub."
status: completed
priority: P1
effort: 4h
branch: main
tags: [prime-os, intelligence, signals, ui, ux]
created: 2026-05-06
---

# Signals UI/UX Upgrade

## Goal
Make Signals answer the operator question faster: which evidence is real enough, why it matters, what entity it is linked to, and where it should convert.

## Context
- Project: Prime OS.
- Area → Tower: Intelligence → Signals.
- Stakeholder: operator validating evidence before Launch Decisions or owning-tower handoff.
- Boundary: Intelligence validates evidence; Demand, Customer, Ecom/COS, or Finance owns downstream action.

## Implemented
- Added signal intelligence cockpit brief with strongest signal, readiness, linked entity, family, strength, freshness, and conversion CTA.
- Reframed KPI row into evidence quality: validated signals, decision-grade signals, guardrail checks, VOC linkage.
- Upgraded Signal registry into Signal workbench with route column, strength/freshness badges, keyboard-selectable rows, and mobile cards.
- Rebuilt Signal detail into validation panel with source, why-it-matters, checklist, guardrail, and convert CTA.
- Added progressive tabs: Pipeline, Families, Guardrails, Audit.

## Files
- `prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx`

## Validation
- `npx eslint prime-os-phase-1/app/src/pages/prime/PrimeTowerPage.tsx` passed with existing unrelated warnings.
- Full app validation pending below.

## Risks
- Readiness is UI presentation over mock data, not a new business rule.
- Desktop table rows are keyboard-selectable; conversion links remain explicit.
