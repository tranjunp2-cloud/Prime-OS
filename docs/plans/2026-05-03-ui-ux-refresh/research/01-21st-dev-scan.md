# 21st.dev UI Scan

Sources:
- https://21st.dev/home
- https://21st.dev/community/components/s/21st-dev
- https://21st.dev/components/ui/form.tsx

Observed patterns:
- Search-first IA: global search shortcut (`K`), component discovery prominent.
- Sidebar taxonomy: Explore/Build groups, many component categories, predictable labels.
- Card grid marketplace: compact cards with preview/avatar/title/social metric.
- Agent/product promo module: concise headline, CTA pair, feature chips.
- Component density: many categories exposed, but grouped by task type.
- Copy style: short nouns/verbs, low prose, high scan speed.

Reusable for PrimeOS:
- Command/search as universal entry to entities/actions.
- Left nav grouped by operating areas + build/admin areas.
- Dense cards for modules, KPIs, AI/agent suggestions.
- Template/component-library mental model for dashboards.
- Consistent count/status badges across tables/cards/nav.

Avoid:
- Blindly importing flashy marketplace visuals into ops dashboard.
- Overusing animated/shader blocks; PrimeOS needs operational clarity.
