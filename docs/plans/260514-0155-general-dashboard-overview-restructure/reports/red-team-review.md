# Red-Team Review

## Main Concern

The user asked for a **General Dashboard** with charts, infographics, and quick links. The biggest risk is building another attractive but noisy dashboard that still does not answer the user’s core need: cross-suite orientation.

## Risks And Mitigations

| Risk | Why It Matters | Mitigation |
|---|---|---|
| Dashboard becomes a chart gallery | Charts can obscure the next action. | Every chart must answer a named question and show labels. |
| Rename breaks navigation | `primeNavigation` feeds sidebar/search/breadcrumb behavior. | Keep `id` and `href`; change visible label only; test route matching. |
| Top priorities disappear | Current page’s useful action path may be lost. | Keep top 3 priorities below dashboard scan areas. |
| Quick links duplicate sidebar | A full tree would add noise. | Group only high-value suite/product/function links. |
| Data double counting | Revenue/risk metrics can be recomputed inconsistently. | Centralize derived model helpers and reuse rows. |
| Color-only status | Charts and badges may be inaccessible. | Always pair color with text and numbers. |
| Infographic is unreadable on mobile | Flow lanes often collapse poorly. | Collapse to labeled rows at small widths. |
| Prime AI floating button covers links | Current screenshots show bottom-right overlap risk. | Add spacing/padding and test 375/768/1440. |
| Too much detail remains visible | The current page already feels task-heavy. | Move evidence/activity/audit into progressive detail. |

## Hard Recommendation

Do not implement mode-first navigation on the General Dashboard. The default page should scan immediately. If `Command / Investigate / Audit` remains, it should filter lower-detail sections only.

## Acceptance Gate

Before marking complete, ask:

1. Can a user name the weakest suite in under five seconds?
2. Can they jump to every major suite without opening the sidebar?
3. Are the charts readable without hovering?
4. Does `/overview` still behave like the app home route?
5. Does mobile show a useful dashboard, not a squeezed desktop layout?
