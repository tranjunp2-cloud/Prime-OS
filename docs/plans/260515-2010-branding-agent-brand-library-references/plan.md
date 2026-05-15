---
title: Branding Agent Brand Library References
status: completed
created: 2026-05-15
owner: Codex
blockedBy: []
blocks: []
scope:
  - prime-os-phase-1/app/src/pages/prime/PrimeBrandAiPage.tsx
  - prime-os-phase-1/app/src/lib/prime/prime-navigation.ts
  - prime-os-phase-1/app/src/lib/i18n/shell-dictionaries.ts
  - prime-os-phase-1/app/src/App.tsx
  - prime-os-phase-1/app/src/lib/prime/brand-reference-library.ts
---

# Branding Agent Brand Library References

## Overview

Build a real **Brand Library** inside Branding Agent for reference-only profiles of famous brands. This is not the same as **My Assets**.

- **My Assets**: assets generated from the user's Create flow.
- **Brand Library**: curated public-reference profiles that help the user learn from well-known brand patterns before or during brand creation.

The route `/intelligence/branding-agent/library` should return as a first-class page. The existing `/intelligence/branding-agent/integrations` remains **My Assets**.

## Scope Challenge

Keep this lean. Do not build a full brand research database, logo gallery, web scraper, citation system, collaboration workflow, or paid brand intelligence tool.

Ship a curated, static MVP:

- seeded brand reference profiles
- searchable/filterable library
- profile detail panel/page
- "Use as inspiration" action that helps the Create flow later
- basic i18n labels
- tests for route/nav/data

## Product Definition

### User Problem

Users creating a new brand need examples of how strong brands position themselves, express voice, use visual systems, and structure content. Right now Branding Agent has a Create flow and My Assets, but no reference space for inspiration.

### Target Users

- Founder or operator creating a new brand foundation
- Demand/content operator preparing campaign messaging
- Designer/marketer who needs examples before answering Create-flow questions

### Boundary

Brand profiles are **reference summaries**, not official brand guidelines. Do not use copyrighted logos or proprietary brand books. Use text summaries and neutral labels only.

## Information Architecture

Branding Agent nav should become:

| Nav | Route | Purpose |
| --- | --- | --- |
| Dashboard | `/intelligence/branding-agent` | Overview and entry |
| Brand Library | `/intelligence/branding-agent/library` | Famous brand references |
| My Assets | `/intelligence/branding-agent/integrations` | User-generated assets |
| Create New | `/intelligence/branding-agent/create` | Guided brand foundation flow |

Breadcrumb behavior:

| Route | Breadcrumb |
| --- | --- |
| `/intelligence/branding-agent/library` | Intelligence > Branding Agent > Brand Library |
| `/intelligence/branding-agent/integrations` | Intelligence > Branding Agent > My Assets |
| `/intelligence/branding-agent/:brandId` | Intelligence > Branding Agent > My Assets |

## Data Model

Create `prime-os-phase-1/app/src/lib/prime/brand-reference-library.ts`.

```ts
export type BrandReferenceCategory =
  | 'technology'
  | 'sports'
  | 'lifestyle'
  | 'hospitality'
  | 'fashion-beauty'
  | 'retail'
  | 'sustainability'
  | 'creator-media';

export interface BrandReferenceProfile {
  id: string;
  name: string;
  category: BrandReferenceCategory;
  region: 'global' | 'us' | 'japan' | 'europe' | 'asia';
  maturity: 'heritage' | 'scale-up' | 'digital-native';
  archetype: string;
  positioning: string;
  audience: string;
  voice: string[];
  visualDirection: string[];
  contentPillars: string[];
  strengths: string[];
  watchouts: string[];
  applyToCreateFlow: {
    toneHints: string[];
    visualHints: string[];
    contentHints: string[];
    positioningPrompt: string;
  };
}
```

## Seed Brand Profiles

Initial MVP should include 12 profiles across different categories. Keep summaries short and inspectable.

| Brand | Category | Why Useful |
| --- | --- | --- |
| Apple | Technology | Minimal product storytelling, premium simplicity |
| Nike | Sports | Mission-led motivation and community identity |
| Patagonia | Sustainability | Values-first positioning and ethical proof |
| Airbnb | Hospitality | Belonging, trust, host/community narrative |
| Spotify | Creator/media | Personalization, culture, playful data storytelling |
| IKEA | Retail | Accessible design, functional everyday language |
| MUJI | Lifestyle/retail | Anti-brand minimalism, restraint, clarity |
| Uniqlo | Fashion/retail | Functional basics, LifeWear positioning |
| Glossier | Beauty | Community-led beauty voice and social proof |
| Tesla | Technology/mobility | Future-forward category reframing |
| Lego | Family/creator | Imagination, modularity, cross-generation appeal |
| Starbucks | Hospitality | Ritual, third-place language, loyalty ecosystem |

Profile copy must be original summaries, not copied brand guideline text.

## UI Design

### Page Header

- Badge: `Reference library`
- H1: `Brand Library`
- Description: `Study famous brand patterns before creating your own foundation.`
- CTA: `Create New`

### Metric Strip

Compact cards:

- `12 profiles`
- `8 categories`
- `4 archetypes`
- `Ready for inspiration`

### Main Layout

Use `xl:grid-cols-[minmax(0,1fr)_380px]`.

Left: reference profile list.

- Search input: brand name, category, positioning
- Filter chips: All, Technology, Lifestyle, Retail, Beauty, Sustainability
- Row/card contents:
  - brand name
  - category badge
  - archetype
  - positioning one-liner
  - voice tags
  - CTA: `View profile`

Right: selected profile detail.

- brand name
- category/region/maturity
- positioning
- audience
- voice tags
- visual direction tags
- content pillars
- strengths
- watchouts
- action: `Use as inspiration`

### Optional Later Detail Page

Do not build at MVP unless needed. Use same-page detail panel first.

## Interaction Design

### Search and Filters

Search should filter locally across:

- brand name
- category
- archetype
- positioning
- voice tags
- content pillars

Filter chips should use `aria-pressed`.

### Use As Inspiration

MVP behavior:

- No persistence yet.
- Clicking shows selected profile detail and keeps user on page.
- If simple state is acceptable, store selected reference id in query string:
  - `/intelligence/branding-agent/create?reference=apple`

Future behavior:

- Pre-fill Create-flow helper panel with inspiration hints.
- Show "Inspired by Apple" as removable context.

## Implementation Phases

### Phase 1 — Restore Brand Library IA

Files:

- `App.tsx`
- `prime-navigation.ts`
- `shell-dictionaries.ts`
- `prime-navigation.test.ts`
- `prime-product-settings-nav.test.ts`

Tasks:

- Stop redirecting `/intelligence/branding-agent/library` to `/integrations`.
- Add Branding Agent child `branding-agent-library`.
- Keep `branding-agent-assets` for My Assets.
- Top nav order: Dashboard, Brand Library, My Assets, Create New.
- Add shell dictionary label for `branding-agent-library` in EN/JA/VI.

Acceptance:

- `/intelligence/branding-agent/library` renders Brand Library.
- `/intelligence/branding-agent/integrations` still renders My Assets.
- Breadcrumbs distinguish both pages.

### Phase 2 — Add Reference Data Contract

Files:

- `brand-reference-library.ts`
- `brand-reference-library.test.ts`

Tasks:

- Add `BrandReferenceProfile` types.
- Seed the 12 famous-brand profiles.
- Export helpers:
  - `buildBrandReferenceLibrary()`
  - `getBrandReferenceProfile(id?: string)`
  - `filterBrandReferenceProfiles(query, category)`

Acceptance:

- Every profile has category, archetype, positioning, audience, voice, visual direction, content pillars, strengths, watchouts.
- No profile uses official logo assets or copied long-form text.
- Tests confirm ids are unique and required fields are present.

### Phase 3 — Build Brand Library Screen

Files:

- `PrimeBrandAiPage.tsx`

Tasks:

- Replace old `LibraryScreen` with `BrandReferenceLibraryScreen`.
- Use local state for search/filter/selected profile.
- Render metric strip, list, and detail panel.
- Keep visual style consistent with My Assets and PrimeOS cards.

Acceptance:

- User can scan all profiles.
- User can select any profile and see detail without route change.
- Empty filter state is clear and has reset action.

### Phase 4 — Connect Inspiration to Create Flow

Files:

- `PrimeBrandAiPage.tsx`

Tasks:

- `Use as inspiration` links to `/intelligence/branding-agent/create?reference={id}`.
- Create page reads query param and shows a compact reference context strip above question set selection.
- Do not auto-fill form answers yet; show hints only.

Acceptance:

- Clicking inspiration from Brand Library opens Create page with selected profile context.
- User can remove/ignore the reference.
- No existing Create flow behavior breaks.

### Phase 5 — Verification

Commands:

```bash
npx eslint src/pages/prime/PrimeBrandAiPage.tsx src/lib/prime/brand-reference-library.ts src/lib/prime/prime-navigation.ts src/App.tsx
npm run test -- src/lib/prime/brand-reference-library.test.ts src/lib/prime/prime-navigation.test.ts src/lib/prime/prime-product-settings-nav.test.ts
npm run build:dev
```

Browser checks:

- `/intelligence/branding-agent/library` shows Brand Library.
- `/intelligence/branding-agent/integrations` still shows My Assets.
- `/intelligence/branding-agent/create?reference=apple` shows reference context.
- EN/JA/VI nav labels are not Vietnamese-only.

## Risks

| Risk | Mitigation |
| --- | --- |
| Confusion between Brand Library and My Assets | Copy clearly says Brand Library is reference-only; My Assets is user-generated |
| IP/copyright concern | No logos, no copied brand guidelines, original short summaries only |
| Too much content in one card | Use compact tags and detail panel, not long essays |
| Create flow gets polluted | Inspiration is optional context, not automatic answers |

## Success Criteria

- Brand Library exists as a real route and nav item.
- It contains famous-brand reference profiles.
- Users can search/filter/select profiles.
- Users can start Create flow with a selected reference.
- My Assets remains intact and distinct.
- Tests and build pass.

## Implementation Log

Completed on 2026-05-15.

- Restored `/intelligence/branding-agent/library` as a first-class Brand Library route.
- Kept `/intelligence/branding-agent/integrations` as My Assets for generated user assets.
- Added 12 curated famous-brand reference profiles with search/filter helpers and tests.
- Added Brand Library UI with metric strip, filters, selectable profile cards, and detail panel.
- Connected `Use as inspiration` to `/intelligence/branding-agent/create?reference={id}` with a removable reference context strip.
- Verified lint, unit tests, dev build, and local browser route checks.

## Cook Command

```bash
/ck:cook /Users/admin/Desktop/PrimeOS_LarkVer/docs/plans/260515-2010-branding-agent-brand-library-references/plan.md
```
