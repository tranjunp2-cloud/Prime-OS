# PrimeWeb prototype

Seller website workspace under `/builder/*`. The workspace entry is `/builder/sites`.

## Source design system

The scoped semantic palette and dashboard/editor tokens in `primeweb.css` are ported from `ech-prime-web-v2/src/app/globals.css` (GH-1192). Light primary is `#00D3D4`; dark primary is `#2DD4BF`. `source-ui/layout-constants.ts` is copied from the source; `source-ui/EditorSidebar.tsx` adapts its controlled three-tab structure. Website cards follow `SitesPageClient` card anatomy. Next.js/Payload screens are adapted to React Router and local prototype state, not imported as server components. The source block renderer and all original templates are not migrated wholesale.

## Demo flows

- Create a site using a template or simulated AI, choose products from Main, edit, preview and publish.
- Select one of three example sites; change a draft without changing its published snapshot.
- Manage pages/blog, product selection and ordering, media, domains, SEO, appearance and website contact details.
- Preview product details, cart, checkout and contact submission without real orders or payments.
- Switch back to Main through shared-business settings links.

State is stored at `primeweb.prototype.v1`. Reset affects this key only. Published content is deep-cloned; Main product records are still resolved from the shared product catalog. No network AI, DNS, deployment, payment, CRM writes or traffic measurement is performed. Translation is represented by a language preference; analytics are illustrative. SEO discovery endpoints and scheduled publication are not deployed. The domain verification and AI flows explicitly identify simulations.

## Validation

- `npm run test:web -- src/features/primeweb/store.test.ts`
- `npm run test:ui --workspace @primeos/web -- tests/primeweb-workspace.spec.ts --workers=1`
- `npm run build:web:dev`

For a presentation without backend authentication, use the existing app prototype mode:

`VITE_PRIME_PROTOTYPE=true npm run dev --workspace @primeos/web -- --host 127.0.0.1 --port 5178`

Open `http://127.0.0.1:5178/#/builder/sites` (prototype mode uses HashRouter).
