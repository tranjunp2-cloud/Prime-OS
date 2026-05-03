# Codebase Scout

Scope:
- Main app: `prime-os-phase-1/app` React/Vite/Tailwind/shadcn-style components.
- Admin: `prime-os-phase-1/admin-web` standalone Vite app with plain CSS.
- Backend: no UI scope except API contracts/auth.

Key files:
- `prime-os-phase-1/app/src/index.css` — global tokens, light/dark, PrimeOS surfaces.
- `prime-os-phase-1/app/src/App.tsx` — shell/routing.
- `prime-os-phase-1/app/src/components/prime/PrimeOperatingSystem.tsx` — main OS experience.
- `prime-os-phase-1/app/src/pages/*` — operational pages.
- `prime-os-phase-1/app/src/components/ui/*` — shadcn/Radix primitives.
- `prime-os-phase-1/admin-web/src/App.tsx` + `index.css` — admin shell + CRUD UI.

Current signals:
- Main app already has tokenized colors/surfaces and dark mode.
- Admin app uses separate CSS token system; likely visual drift.
- Many pages/components likely duplicate card/table/status patterns.
- Existing Radix/shadcn base is strong; improve via tokens/composition, not rewrite.
