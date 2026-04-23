# Wrapped Modules

## App shell

- `src/App.tsx`
  - Old COS routes are redirected or remounted under Prime OS paths.
  - COS pages remain original components.
  - `AuthProvider` is retained so reused COS hooks have auth context, while Prime OS still avoids login redirects.

- `src/components/layout/AppLayout.tsx`
  - Auth gate removed for BOD demo.
  - `seedDemoData('prime-os-phase-1-demo')` runs on mount.
  - Global context/search bar and copilot workspace are preserved.

- `src/components/layout/AppSidebar.tsx`
  - Navigation now follows Area -> Tower -> Floor.
  - COS floors are marked as COS inside Ecom Area.

## COS wrappers

- `src/pages/prime/CosPolicyRulePage.tsx`
  - Wraps SLA and routing screens as Policy & Rule Floor.

- `src/pages/prime/CosEventAuditPage.tsx`
  - Aggregates OMS events, tracking events, service cases, alerts, and recommendations as Event & Audit Floor.

## Adapter layer

- `src/lib/prime/prime-data.ts`
  - Reads existing COS stores.
  - Generates linked Demand, Customer, Commerce Surface, and Intelligence entities.
  - Does not mutate COS source of truth.
