# Phase 01: Information Architecture

Status: completed

## Context

The current page presents `Overview`, `Evidence`, `Documents`, `Review Routes`, `Applications`, and `Audit` as equal tabs. That structure exposes internal objects instead of the funding journey. The overview then repeats much of the same content as cards, which makes the page feel heavy.

## Requirements

- Preserve current `FinanceSupportTab` query behavior.
- Reduce visible navigation choices without breaking deep links.
- Make the overview read as a funding readiness workflow.
- Keep audit access visible, but not as the most prominent page action.

## Proposed Structure

Use a compact workflow nav:

| Display Zone | Existing Tabs Covered | Purpose |
|---|---|---|
| Overview | `overview` | Readiness answer and next action |
| Package | `evidence`, `documents` | Proof and document preparation |
| Routes | `routes`, `applications` | Lender route comparison and application state |
| Audit | `audit` | Traceability and historical evidence |

Implementation can keep the existing tab enum and map display labels to groups. If a user opens `?tab=documents`, the active group is `Package` and an internal secondary control can highlight `Documents`.

## Overview Zones

Replace the current stacked dashboard with:

1. **Decision strip**
   - readiness grade/score
   - indicative range
   - primary blocker
   - next action
   - primary CTA

2. **Readiness and evidence**
   - readiness factor chart
   - evidence coverage chart
   - small status list for rejected/missing proof

3. **Funding path**
   - route comparison chart
   - top 3 recommended routes
   - application status summary if present

4. **Action queue**
   - prioritized blockers
   - owner/source
   - fix/open action
   - detail drawer for impact and recommendation

## Implementation Steps

- Refactor `FinanceTabs` display copy into grouped workflow labels.
- Keep current `setTab` calls available for exact routes.
- Replace overview section ordering inside `OverviewCockpit`.
- Remove duplicated full-width preview sections from the first viewport.
- Keep “Ask Prime AI” available as a secondary action, not the primary CTA.

## Checklist

- [x] `?tab=overview` shows Overview group active.
- [x] `?tab=evidence` and `?tab=documents` show Package group active.
- [x] `?tab=routes` and `?tab=applications` show Routes group active.
- [x] `?tab=audit` remains directly reachable.
- [x] Header has one primary CTA only.
- [x] Overview first viewport has no more than 4 major regions.

## Risks

- Grouping tabs can confuse existing deep links if active state is wrong.
- Demoting Audit too much weakens enterprise trust.
- Combining Evidence/Documents visually must not imply the data model changed.
