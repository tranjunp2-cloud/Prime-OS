# 08 - Release Evidence Template

Use this template at each phase gate and final V1 review.

## Release Evidence Header

| Field | Value |
| --- | --- |
| Phase |  |
| Sprint |  |
| Date |  |
| PM signoff |  |
| QA signoff |  |
| Domain signoff |  |
| Risk signoff if Finance/bank copy changed |  |

## Closed-Loop Proof

| Step | Route | Evidence screenshot | Owner | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| Intelligence signal |  |  |  |  |  |
| Demand input |  |  |  |  |  |
| Customer context |  |  |  |  |  |
| Ecom/COS execution |  |  |  |  |  |
| Finance readiness |  |  |  |  |  |
| Intelligence outcome feedback |  |  |  |  |  |

## PRD Gap Closure

| Gap | Before evidence | After evidence | Closed? | Carryover |
| --- | --- | --- | --- | --- |
| Customer context depth |  |  |  |  |
| Finance trust breadth |  |  |  |  |
| Ecosystem role visibility |  |  |  |  |
| Intelligence evidence/outcome |  |  |  |  |
| Ecom/COS detail trust |  |  |  |  |
| EN/VI/JA primary UI |  |  |  |  |

## QA Evidence

| Check | Command / evidence | Result | Owner |
| --- | --- | --- | --- |
| Lint | `npm run lint` |  | FE |
| Unit tests | `npm run test` |  | FE |
| Build | `npm run build` |  | FE |
| Shell routes | `npm run test:ui -- prime-route-shell.spec.ts` |  | QA |
| COS critical flows | `npm run test:ui -- cos-critical-flows.spec.ts` |  | QA |
| A11y smoke | `npm run test:ui -- ui-a11y-shell.spec.ts` |  | QA |
| Responsive | `npm run test:ui -- ui-responsive-genesis.spec.ts` |  | QA |
| Screenshot pack | contact sheets / manifest |  | QA |
| i18n EN/VI/JA | screenshot + dictionary scan |  | QA |

## Open Defects

| ID | Severity | Area | Route | Owner | Due | Release impact |
| --- | --- | --- | --- | --- | --- | --- |

## V1.1 Carryover

| Item | Reason | Owner | Target |
| --- | --- | --- | --- |
