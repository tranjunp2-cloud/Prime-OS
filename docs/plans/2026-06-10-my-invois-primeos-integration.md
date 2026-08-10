---
title: "Malaysia MyInvois PrimeOS Integration"
description: "Design MyInvois as an invoice compliance rail and verified commerce evidence layer inside PrimeOS."
status: proposed
priority: P0
effort: phased
tags: [prime-os, myinvois, malaysia, invoice, compliance, finance-readiness, connector]
created: 2026-06-10
---

# Malaysia MyInvois PrimeOS Integration

Ngay cap nhat: 2026-06-10

## 1. Positioning

MyInvois khong nen bien PrimeOS thanh phan mem ke toan. No nen duoc gan vao PrimeOS nhu mot invoice/compliance rail trong vong van hanh commerce:

```text
Demand / Order / Booking / Service
-> Invoice readiness
-> MyInvois validation
-> Verified revenue evidence
-> Finance readiness
-> AI exception queue and operator action
```

Ten san pham/feature nen dung trong PrimeOS:

- Malaysia MyInvois Connector
- Invoice Compliance Rail
- Verified Revenue Evidence
- MyInvois-valid invoice evidence

Khong nen dung:

- Accounting module
- Tax filing engine
- Loan approval evidence
- Autonomous e-invoice bot

## 2. Why It Fits PrimeOS

PrimeOS hien da duoc mo ta la "commerce operating system + intelligence layer", noi Demand, Customer, Ecom/COS, Intelligence va Finance thanh mot vong van hanh lien tuc. MyInvois nen tang chat luong cua evidence trong vong nay:

- OMS/Service tao giao dich that.
- Customer giu buyer identity va tax profile context.
- MyInvois connector validate va submit e-Invoice.
- Finance dung invoice da duoc MyInvois validate lam evidence cho funding readiness.
- AI operator doc exception, giai thich blocker, de xuat next action va route approval.

Boundary quan trong: Finance van chi la funding readiness/evidence package/bank partner review route. MyInvois evidence khong phai credit approval, underwriting, tax advice hay ledger truth.

## 3. Product Surfaces

### 3.1 Connectors

Route hien tai: `/overview?module=connectors`

Them connector:

```text
Name: Malaysia MyInvois
Category: Compliance
Direction: outbound
Environment: sandbox | production
Mode: taxpayer | intermediary
Status: not connected | sandbox tested | connected | certificate expiring | error
Capabilities:
- tin_validation
- invoice_readiness
- document_submission
- submission_polling
- document_cancel
- credit_debit_refund_note
- finance_evidence
```

Trong prototype, co the dung pattern connector hien co trong `apps/api/src/growth-os.js` va `apps/web/src/lib/prime/growth-os.ts`. Voi production, khong nen ep MyInvois vao access-token-only setup; no can client id, client secret, taxpayer TIN, mode, environment va certificate reference.

### 3.2 OMS Order Detail

Route hien tai: `/ecom/cos/oms/:id`

Them panel "Invoice compliance":

```text
Source order: ORD-...
Invoice state:
- Not required
- Draft
- Missing buyer tax profile
- Buyer TIN invalid
- Ready to submit
- Submitted
- Valid
- Invalid
- Cancelled
- Credit/refund note required

Evidence:
- MyInvois submission UID
- UUID / longId
- Validated at
- Validation link / QR source
- Request/response hash
```

Submit invoice khong nen la default silent automation. Default MVP: operator bam "Prepare invoice" va "Submit to sandbox/production". Auto-submit chi nen bat khi tenant co policy ro rang va action da duoc approve.

### 3.3 Customer / Buyer Profile

Route hien tai: `/customer/crm-compact`

Them "Tax profile" vao customer context:

```text
TIN
ID type: BRN | NRIC | PASSPORT | ARMY
ID value
Validation status
Last validated at
Source: manual | connector | import
Jurisdiction: MY
```

Validate TIN nen chay khi tao/cap nhat buyer profile, khong goi truoc moi lan submit invoice. MyInvois SDK khuyen nghi cache ket qua TIN validation va tranh goi lap lai qua nhieu.

### 3.4 Service Booking

Route hien tai: `/customer/service`

Service flow:

```text
Booking completed
-> invoice draft
-> buyer tax profile check
-> MyInvois submission
-> customer timeline event
-> finance evidence update
```

Dieu nay giu Service la transaction source, MyInvois la compliance rail, Customer la relationship context.

### 3.5 Returns / Refunds

Routes hien tai:

- `/ecom/cos/returns`
- `/ecom/cos/returns/:id`

Returns/refunds nen tao compliance decision:

```text
Return/refund created
-> check original invoice status
-> within cancellation window? cancel document
-> outside window? create credit note / debit note / refund note
-> update evidence pack and audit trail
```

MyInvois cancel window canh bao phai hien ro. Sau window, PrimeOS nen route sang credit/debit/refund note thay vi co huy hoa don cu.

### 3.6 Finance Support

Route hien tai: `/finance/fin-support`

`CommerceEvidencePack` hien da co item `invoices`. Nen nang item nay tu "Invoices and RFQ receivables" thanh:

```text
MyInvois-valid invoices and receivables
Source owner: OMS / Demand
Connector owner: MyInvois Gateway
Evidence state:
- missing
- draft
- submitted
- valid
- invalid
- cancelled
- note_required
```

Finance chi doc status da duoc MyInvois connector ghi lai. Finance khong so huu order truth, khong sua invoice source facts, khong dua ra tax/compliance guarantee.

### 3.7 Intelligence / PAI Operator

Prime AI/PAI nen la reasoning va routing layer:

```text
- 18 delivered orders have no MyInvois invoice
- 3 buyer TIN profiles are invalid
- 5 submissions are still pending validation
- 2 cancellation windows expire in 4 hours
- RM48,200 revenue is MyInvois-valid this week
```

Neu gan voi PAI tool contracts, de xuat tool surface:

```text
myinvois.validateTin
myinvois.createInvoiceDraft
myinvois.submitInvoice
myinvois.getSubmissionStatus
myinvois.cancelDocument
myinvois.createCreditNote
myinvois.createRefundNote
```

Approval boundary:

- `validateTin` co the chay nhu safe read/check.
- `createInvoiceDraft` co the la draft action.
- `submitInvoice`, `cancelDocument`, `createCreditNote`, `createRefundNote` phai can human approval trong production.

## 4. Architecture

### 4.1 Logical Flow

```text
OMS Order / Service Booking / RFQ / Return
        |
        v
Canonical Invoice Intent
        |
        v
Invoice Readiness Validator
        |
        +--> missing field / invalid tax profile -> exception queue
        |
        v
MyInvois Connector Gateway
        |
        +--> OAuth token cache
        +--> TIN validation cache
        +--> UBL 2.1 JSON/XML mapper
        +--> digital signing service
        +--> submit documents
        +--> polling worker
        +--> cancel / credit note / refund note
        |
        v
Invoice Document State
        |
        +--> OMS detail panel
        +--> Customer timeline
        +--> Finance evidence pack
        +--> AI operator exception queue
```

### 4.2 Prototype Placement

For current PrimeOS prototype:

```text
apps/api/src/connectors/myinvois/
  auth.js
  tin.js
  invoice-readiness.js
  mapper.js
  sandbox-client.js
  submissions.js
  store.js

apps/api/data/myinvois.json

apps/web/src/lib/prime/myinvois.ts
apps/web/src/components/prime/MyInvoisStatusPanel.tsx
```

Near-term code touchpoints:

- `apps/api/src/growth-os.js`: seed Malaysia MyInvois connector.
- `apps/web/src/lib/prime/growth-os.ts`: fallback connector metadata.
- `apps/web/src/pages/prime/PrimeGrowthOSPage.tsx`: keep using existing connector setup UI, then specialize setup fields later.
- `apps/web/src/pages/OrderDetail.tsx`: invoice compliance panel.
- `apps/web/src/pages/ReturnDetail.tsx`: cancel/credit/refund note state.
- `apps/web/src/pages/Service.tsx`: booking-to-invoice readiness.
- `apps/web/src/lib/prime/finance-trust-profile.ts`: mark invoice evidence quality from MyInvois statuses.
- `apps/web/src/pages/prime/PrimeFinSupportPage.tsx`: show MyInvois-valid revenue/evidence line.

### 4.3 Production Placement

For production, use a backend-owned gateway instead of direct frontend calls:

```text
PrimeOS Invoice Connector Gateway
```

Required capabilities:

- tenant-aware credentials
- sandbox/prod environment separation
- OAuth token cache and refresh
- secure secret/certificate storage
- queue-based submission and polling
- idempotency key per source transaction/document
- rate-limit aware retry with Retry-After handling
- immutable audit event stream
- raw payload/request/response hash storage
- PII and tax profile access controls
- explicit approval workflow for write actions

## 5. Core Data Contracts

### 5.1 Canonical Invoice Intent

```ts
type PrimeInvoiceSourceType = 'order' | 'booking' | 'rfq' | 'service' | 'return';

interface PrimeInvoiceIntent {
  id: string;
  tenantId: string;
  jurisdiction: 'MY';
  sourceType: PrimeInvoiceSourceType;
  sourceId: string;
  sourceOwner: 'OMS' | 'Service' | 'Demand';
  sellerTaxProfileId: string;
  buyerTaxProfileId: string;
  currency: 'MYR';
  lines: PrimeInvoiceLine[];
  totals: PrimeInvoiceTotals;
  readinessStatus: 'missing_fields' | 'tin_invalid' | 'ready' | 'blocked';
  requiredActions: string[];
  createdAt: string;
}
```

### 5.2 Tax Profile

```ts
interface CustomerTaxProfile {
  id: string;
  customerId: string;
  jurisdiction: 'MY';
  tin: string;
  idType: 'BRN' | 'NRIC' | 'PASSPORT' | 'ARMY';
  idValue: string;
  validationStatus: 'unknown' | 'valid' | 'invalid' | 'expired';
  lastValidatedAt?: string;
  validationSource: 'manual' | 'myinvois_sandbox' | 'myinvois_production';
}
```

### 5.3 Invoice Document State

```ts
interface PrimeInvoiceDocument {
  id: string;
  tenantId: string;
  invoiceIntentId: string;
  connectorAccountId: string;
  status:
    | 'draft'
    | 'signed'
    | 'submitted'
    | 'valid'
    | 'invalid'
    | 'cancelled'
    | 'credit_note_required'
    | 'refund_note_required';
  myinvoisSubmissionUid?: string;
  myinvoisUuid?: string;
  myinvoisLongId?: string;
  documentHash?: string;
  codeNumber: string;
  validatedAt?: string;
  cancellationWindowEndsAt?: string;
  latestErrorCode?: string;
  latestErrorMessage?: string;
  sourceRequestHash?: string;
  sourceResponseHash?: string;
}
```

### 5.4 Connector Account

```ts
interface MyInvoisConnectorAccount {
  id: string;
  tenantId: string;
  environment: 'sandbox' | 'production';
  mode: 'taxpayer' | 'intermediary';
  taxpayerTin?: string;
  clientIdRef: string;
  clientSecretRef: string;
  certificateRef?: string;
  status: 'not_connected' | 'tested' | 'connected' | 'error' | 'certificate_expiring';
  lastTokenRefreshAt?: string;
  lastTestAt?: string;
}
```

## 6. Internal APIs

Prototype endpoints:

```text
POST /api/connectors/myinvois/test
POST /api/connectors/myinvois/connect
POST /api/myinvois/tin/validate
POST /api/myinvois/invoices/draft/from-order/:orderId
POST /api/myinvois/invoices/draft/from-booking/:bookingId
POST /api/myinvois/invoices/:invoiceId/submit
GET  /api/myinvois/invoices/:invoiceId/status
POST /api/myinvois/invoices/:invoiceId/cancel
POST /api/myinvois/invoices/:invoiceId/credit-note
POST /api/myinvois/invoices/:invoiceId/refund-note
```

Production endpoints nen giu cung semantic nhung di qua authz, audit va approval middleware.

## 7. MyInvois API Facts To Respect

Implementation facts used by this design, from official MyInvois SDK references:

- Sandbox/pre-production URLs are separate from production URLs, and sandbox credentials are different from production credentials.
- Login uses `/connect/token`; tokens are valid for about 3600 seconds and should be cached.
- Intermediary login uses `client_credentials` and an `onbehalfof` header for the represented taxpayer.
- TIN validation endpoint is `GET /api/v1.0/taxpayer/validate/{tin}?idType={idType}&idValue={idValue}` and should be cached.
- Submit Documents returns `202` because validation is not complete immediately.
- Poll submission status through `GET /api/v1.0/documentsubmissions/{submissionUid}`; use a 3-5 second polling interval.
- Cancel document uses `PUT /api/v1.0/documents/state/{UUID}/state` and is limited by the cancellation window; after the window, use credit/debit/refund note flows as applicable.
- Sandbox has lower rate limits than production and sandbox data retention is limited.

## 8. Phased Delivery

### Phase 1 - Local Readiness, No External Submission

Goal: prove UX and data model before touching tax authority APIs.

- Add MyInvois connector card in Connectors.
- Add invoice readiness state for orders/bookings.
- Add customer tax profile fields.
- Add Finance evidence line for MyInvois readiness.
- Add AI exception examples.
- No real MyInvois submit yet.

Acceptance:

- Delivered/paid order can show invoice draft readiness.
- Missing TIN/address/tax fields are visible as operational blockers.
- Finance evidence pack can show invoice evidence as missing/draft/ready without implying accounting truth.

### Phase 2 - Sandbox TIN Validation

Goal: validate credentials and buyer identity checks.

- Add backend-only sandbox token flow.
- Add TIN validation endpoint with cache.
- Store validation result on customer tax profile.
- Show connector test result in UI.

Acceptance:

- No MyInvois secret appears in frontend.
- Token is cached, not generated per request.
- TIN validation result is reused by invoice readiness.

### Phase 3 - Sandbox Document Submission

Goal: submit a test invoice and persist authority status.

- Map canonical invoice intent to UBL 2.1 JSON.
- Base64 document and SHA-256 hash.
- Submit to sandbox.
- Poll Get Submission.
- Store submission UID, UUID, longId, status and validation errors.

Acceptance:

- A sandbox invoice can move from draft -> submitted -> valid/invalid.
- Duplicate submission is prevented with idempotency.
- Invalid response maps to actionable PrimeOS blockers.

### Phase 4 - Signature, Cancellation, Notes

Goal: complete compliance-critical lifecycle.

- Add digital signing service/certificate reference.
- Add cancel flow with cancellation window.
- Add credit note / debit note / refund note path for returns/refunds.
- Add audit events for every status transition.

Acceptance:

- Cancel action is blocked or routed correctly after the window.
- Return/refund flow produces the correct note requirement.
- Operator can trace source order, invoice document and MyInvois response.

### Phase 5 - Production Pilot

Goal: support real Malaysia tenants safely.

- Tenant-aware connector accounts.
- Taxpayer and intermediary modes.
- Secret/certificate vault integration.
- Queue-backed retries and polling.
- RBAC and approval workflow.
- Monitoring and alerting.

Acceptance:

- Production credentials are environment-isolated from sandbox.
- Submit/cancel/note actions require approval unless tenant policy explicitly allows automation.
- Finance uses only validated document state as evidence.

## 9. Guardrails

- Never call MyInvois directly from frontend.
- Never store client secret, access token or certificate material in web state.
- Never treat AI output as invoice source of truth.
- Never let Finance mutate OMS order truth or invoice source facts.
- Never claim PrimeOS guarantees tax compliance, loan approval, eligibility, underwriting or disbursement.
- Never resubmit a 20x submission response blindly.
- Never validate TIN before every document submission; cache at buyer profile level.
- Never hide invalid invoice errors behind generic failure copy.

## 10. Recommended First Implementation Slice

The cleanest first slice for this repo:

1. Add `Malaysia MyInvois` connector metadata to Growth OS backend and frontend fallback data.
2. Add a lightweight local MyInvois read model in `apps/web/src/lib/prime/myinvois.ts`.
3. Add an invoice compliance panel on `OrderDetail`.
4. Update `finance-trust-profile.ts` so invoice evidence can read MyInvois readiness/validity.
5. Add one AI/operator exception list in Product Operation Agent or Finance audit copy.

This gives a visible end-to-end proof:

```text
Connector setup
-> Order invoice readiness
-> MyInvois evidence status
-> Finance readiness impact
-> AI exception routing
```

## 11. Sources

- [MyInvois FAQ - environment URLs, credentials, digital signature notes](https://preprod-sdk.myinvois.hasil.gov.my/faq/)
- [MyInvois Integration Practices - token caching, polling, anti-patterns, rate limits](https://preprod-sdk.myinvois.hasil.gov.my/integration-practices/)
- [Validate Taxpayer TIN API](https://sdk.myinvois.hasil.gov.my/einvoicingapi/01-validate-taxpayer-tin/)
- [Submit Documents API](https://sdk.myinvois.hasil.gov.my/einvoicingapi/02-submit-documents/)
- [Get Submission API](https://sdk.myinvois.hasil.gov.my/einvoicingapi/06-get-submission/)
- [Cancel Document API](https://sdk.myinvois.hasil.gov.my/einvoicingapi/03-cancel-document/)
- [Login as Intermediary System](https://sdk.myinvois.hasil.gov.my/api/08-login-as-intermediary-system/)
