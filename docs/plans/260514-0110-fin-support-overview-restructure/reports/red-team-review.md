---
title: "Red-Team Review: Fin Support Overview Restructure"
created: 2026-05-14
reviewType: "hard-mode adversarial"
---

# Red-Team Review: Fin Support Overview Restructure

## Main Attack

The plan can fail by replacing too many cards with too many charts. A finance operator does not need decoration; they need a clear answer, a blocker, and a next action. Every chart must earn its place.

## Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Grouped tabs break deep links or active states. | High | Preserve internal tab IDs and map them to display groups. Smoke every `tab` value. |
| Charts imply underwriting precision. | High | Use “readiness”, “review-ready”, “indicative”, and “route fit” language. Keep guardrails visible. |
| Overview hides trust-critical detail. | Medium | Keep source owner/status visible in rows; put deeper proof in drawer/dialog. |
| Extraction turns into large refactor. | Medium | Extract only overview components/helpers; do not move data fetching or API contracts. |
| Mobile chart labels overflow. | Medium | Use compact labels, text fallback, and responsive chart heights. |
| Audit gets buried. | Medium | Keep Audit as a visible group and add “View audit” links in detail surfaces. |

## Hard Constraints For Cook

- Do not delete existing tab routes.
- Do not add new dependencies.
- Do not change finance API contracts.
- Do not remove compliance/guardrail copy.
- Do not ship charts without adjacent readable numeric labels.

## Recommended Cut Line

If implementation time runs long, ship:

1. Grouped workflow nav.
2. Decision strip.
3. Readiness bar chart.
4. Compact blocker list with detail dialog.

Defer route/evidence charts only if needed. The screen clarity comes primarily from hierarchy, not from chart count.
