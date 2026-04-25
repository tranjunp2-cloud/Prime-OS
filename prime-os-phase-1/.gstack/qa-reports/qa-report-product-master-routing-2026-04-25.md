# QA Report — Product Master Legacy Route Regression

Date: 2026-04-25  
Target: `http://127.0.0.1:5192/ecom/cos/product-master`  
Mode: targeted QA regression  
Framework: React SPA / Vite / React Router  
Health score after fix: 97/100

## Scope

- `/ecom/cos/product-master`
- Product edit action from the Product Master table
- Legacy product links still emitted by existing COS components:
  - `/products/new`
  - `/products/:id`
  - `/products/:id/edit`
  - `/products/:id/variants/:sku`

## Reproduced Issue

### ISSUE-001 — Product Master edit/detail navigation escaped to Overview

Severity: High  
Category: Functional navigation

Repro before fix:

1. Sign in.
2. Open `/ecom/cos/product-master`.
3. Click the first product edit action.
4. App navigates to `/products/:id/edit`.
5. No dynamic legacy route exists, so catch-all redirects to `/overview`.

Evidence screenshots:

- `app/.gstack/qa-reports/screenshots/issue-product-edit-before-click.png`
- `app/.gstack/qa-reports/screenshots/issue-product-edit-after-click.png`

## Root Cause

Prime OS canonical product routes exist under COS:

- `/ecom/cos/product-master/new`
- `/ecom/cos/product-master/:id`
- `/ecom/cos/product-master/:id/edit`

But several older product flows still emit legacy paths:

- `/products/new`
- `/products/:id`
- `/products/:id/edit`
- `/products/:id/variants/:sku`

Only `/products` had a base redirect. Dynamic legacy product routes fell through to the global `*` route and were redirected to `/overview`.

## Fix

Added parameterized legacy product route redirects:

- `/products/new` -> `/ecom/cos/product-master/new`
- `/products/:id` -> `/ecom/cos/product-master/:id`
- `/products/:id/edit` -> `/ecom/cos/product-master/:id/edit`
- `/products/:id/variants/:sku` -> `/ecom/cos/product-master/:id?variant=:sku`

Updated redirect helper:

- `app/src/components/routing/LegacyEntityRedirect.tsx`

Updated router:

- `app/src/App.tsx`

## Regression Coverage

Updated:

- `app/src/App.legacy-routes.test.tsx`

Regression cases now cover:

- Legacy OMS order detail redirect.
- Legacy fulfillment job detail redirect.
- Legacy product detail redirect.
- Legacy product edit redirect.
- Legacy product creation redirect with query preservation.
- Legacy product variant redirect with variant context.

## Verification

Commands:

- `npm run test -- App.legacy-routes.test.tsx` — pass, 6 tests.
- `npm run build:dev` — pass.
- Browser QA via Playwright — pass.

Post-fix browser results:

- Product edit button -> `/ecom/cos/product-master/prod_001/edit`
- `/products/new?sku=CR-NEW-1&family=demo` -> `/ecom/cos/product-master/new?sku=CR-NEW-1&family=demo`
- `/products/prod_001` -> `/ecom/cos/product-master/prod_001`
- `/products/prod_001/variants/sku_001` -> `/ecom/cos/product-master/prod_001?variant=sku_001`

Console:

- No app console errors detected in targeted run.

## Remaining Cleanup

The redirect fixes the route escape safely. Future cleanup can migrate old `navigate('/products/...')` and `Link to="/products/..."` callsites to canonical `/ecom/cos/product-master/...` paths so the code matches Prime OS IA directly.
