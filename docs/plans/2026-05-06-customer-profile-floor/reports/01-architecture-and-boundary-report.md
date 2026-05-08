# Report 01 - Architecture And Boundary

## Proposed Architecture
```txt
src/lib/prime/customer-profile-floor.ts
  types
  mock accounts/contacts/tags
  selectors
  duplicate detection helpers

src/components/prime/customer-profile/
  CustomerProfileFloor.tsx
  CustomerAccountList.tsx
  Customer360Panel.tsx
  AccountEditorDialog.tsx
  ContactManagementPanel.tsx
  CustomerTagsEditor.tsx
  IdentityMatchAlerts.tsx
  FutureModulePlaceholders.tsx
```

## Core Types
```ts
type CustomerAccount = {
  id: string;
  accountCode: string;
  companyName: string;
  displayName: string;
  customerType: 'b2b' | 'b2c' | 'marketplace' | 'distributor' | 'creator';
  lifecycle: 'lead' | 'prospect' | 'active' | 'retention' | 'at_risk' | 'inactive';
  status: 'active' | 'watch' | 'archived';
  ownerId: string;
  tags: string[];
  website?: string;
  industry?: string;
  country?: string;
  source?: string;
};

type CustomerContact = {
  id: string;
  accountId: string;
  fullName: string;
  title?: string;
  role: 'decision_maker' | 'buyer' | 'finance' | 'ops' | 'support' | 'other';
  email: string;
  phone?: string;
  preferredChannel: 'email' | 'phone' | 'line' | 'zalo' | 'whatsapp';
  isPrimary: boolean;
};

type IdentityMatch = {
  id: string;
  entityType: 'account' | 'contact';
  entityId: string;
  candidateId: string;
  confidence: number;
  reasons: string[];
  suggestion: 'review' | 'possible_merge' | 'ignore';
};
```

## Boundary Rules
- Contact belongs to Account.
- Tags classify customers, not Demand campaigns.
- Identity matching suggests only; no merge mutation in V1.
- Order/deal/RFQ/finance cards are placeholders/read links only.

## State Strategy
- V1: local React state seeded from mock selectors.
- Optional: localStorage wrapper later if user wants persistence.
- Avoid backend APIs until Customer Profile contract stabilizes.
