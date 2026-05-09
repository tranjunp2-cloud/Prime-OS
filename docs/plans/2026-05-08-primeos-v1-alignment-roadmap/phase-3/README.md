# Phase 3 - Finance Trust Execution Evidence

Ngày cập nhật: 2026-05-09

## Context

Project context: Prime OS.

Business goal: Finance Area trở thành lớp financial enablement/trust nối commerce operations với funding review package, thay vì chỉ là loan wizard.

Stakeholders:

- Merchant/operator cần hiểu vì sao order, settlement, inventory, refund, customer repeat behavior tạo financial trust.
- Bank/reviewer stakeholder cần xem một summary có evidence, blocker, document state, và next action mà không bị hiểu là PrimeOS đang quyết định tín dụng.
- Compliance/Risk Reviewer cần đảm bảo mock UI không nói hoặc ám chỉ guaranteed approval, eligibility decision, underwriting result, hoặc disbursement commitment.

## Implementation Scope

P0 completed:

- Added typed Finance Phase 3 read-model contracts in app code:
  - `FinancialTrustProfile`
  - `SettlementSignal`
  - `ReceivableSnapshot`
  - `CommerceEvidencePack`
  - `BankReviewSummary`
  - `FundingApplicationStatus`
- Added a `Financial Trust Profile` section above the existing funding flow and wizard.
- Added a `Commerce Evidence Pack` section with source-owner mapping for:
  - OMS orders/events.
  - settlement and repayment lanes.
  - invoices and RFQ receivables.
  - logistics/export records.
  - marketplace health.
- Added a bank-facing summary preview with readiness, indicative range, evidence coverage, document state, primary blocker, next action, and explicit no-approval guardrail.
- Added receivables/payout snapshot as readiness evidence only, not ledger truth.
- Expanded document status language to include `uploaded` and `reusable`.
- Reduced risk-sensitive copy:
  - "funding review package" instead of loan approval language.
  - "indicative need range" instead of eligible range in visible UI.
  - "potential review routes" instead of lender acceptance.
  - Prime AI positioned as readiness/evidence explainer only.

Deferred:

- Real lender API.
- Real document verification.
- Real credit scoring or automated underwriting.
- Formal loan submission and lender contract workflow.
- Accounting ledger, reconciliation, or ERP finance scope.
- Production legal/regulatory review for live lending use.

## Boundary Decisions

Finance owns:

- Funding readiness read model.
- Financial Trust Profile composition.
- Commerce Evidence Pack packaging.
- Bank-review summary preview.
- Document/application status display inside Fin Support.

Finance reads but does not own:

- OMS order lifecycle, order events, refunds, and fulfillment state.
- Demand leads, RFQs, invoice/receivable intent, and campaign proof.
- Customer repeat behavior and lifecycle context.
- Inventory ATS/forecast risk.
- Fulfillment/Shipment logistics and export proof.
- Marketplace listing health.

Guardrails:

- Readiness score is an internal evidence score, not a credit decision.
- Indicative range is not an offer, approval, or guaranteed eligible amount.
- Review routes are potential paths, not lender acceptance.
- Prime AI may explain readiness signals and missing evidence; it cannot make credit decisions.
- Contract, terms, and funding movement remain lender-owned.

## Validation

Commands to run from `prime-os-phase-1/app`:

```bash
npm run test -- src/lib/prime/finance-trust-profile.test.ts src/lib/prime/customer-profile-floor.test.ts src/lib/prime/prime-navigation.test.ts
npm run test:ui -- tests/prime-route-shell.spec.ts --grep "Finance trust profile"
npm run lint
npm run build:dev
```

Backend smoke remains separate:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8180/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"password123"}'
```

## Acceptance Status

| Acceptance | Status | Evidence |
| --- | --- | --- |
| Fin Support first fold shows readiness, indicative range, blocker, and primary CTA. | Complete | Hero now frames the page as a funding review package from commerce operations. |
| Financial profile proves commerce-to-finance bridge. | Complete | Financial Trust Profile maps each metric to source owner and evidence ids. |
| Bank-facing evidence summary is visible. | Complete | Bank-review summary preview is visible above workflow sections. |
| Copy does not imply guaranteed approval or disbursement. | Complete | Visible copy uses readiness, preview, review route, indicative range, and no-approval guardrail. |
| Every finance metric maps back to commerce evidence. | Complete | Contract requires `sourceOfTruthOwner` and `evidenceIds` for metrics and evidence items. |
| Document statuses are clear: missing/uploaded/verified/rejected/reusable. | Complete | Document and evidence pack statuses include uploaded and reusable states. |
| Prime AI does not replace deterministic flow. | Complete | AI remains sidecar; copy says it explains readiness and does not make credit decisions. |

## Residual Risks

- Named partner banks and route-fit percentages can still feel like real lender integrations. Keep demo framing explicit until real partnership/legal review exists.
- RFQ receivables and projected payouts are readiness evidence, not collectible ledger balances.
- Finance control-plane seed/admin wording may still use stronger operational terms such as offers or disbursement target; runtime merchant-facing copy is softened, but source data naming should be cleaned before production.
