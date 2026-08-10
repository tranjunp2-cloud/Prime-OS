# 10 - PrimeOS Lark Seeding Readiness

## Demo Entry

- Start screen: `/overview?module=cos`
- Live commerce screen: `/overview?module=cos&view=live`
- Supporting screens: `/overview?module=cos&view=pim`, `/overview?module=cos&view=oms`, `/overview?module=cos&view=ship`
- Demo storyline: product master -> product set -> live session allocation -> order capture -> fulfillment and payment review.

## Updated Product Scope

PrimeOS is positioned as the operating system for commerce teams that need CRM, COS, marketplace/live commerce operations, service, finance visibility, connectors, and AI assistance in one workflow.

For Lark seeding, the strongest demo angle is live commerce operations for multi-channel sellers:

- Product and SKU master data.
- Product set/combo creation for campaign selling.
- Inventory allocation by marketplace, campaign, promotion, internal live session, KOL session, and buffer stock.
- Order/customer capture from Shopee, Lazada, TikTok Shop, and Brand.com or owned storefronts.
- Operational performance tracking by campaign, channel, session, and KOL.
- Handoff to OMS, fulfillment, payment review, CRM, and customer service.

## UI/UX Demo Flow

Before:

- COS demo was centered on PIM, OMS, fulfillment, and connector health.
- Product set and live selling stock control were implied but not visible in the main demo path.
- BD needed verbal explanation to connect marketplace/live commerce operations to PrimeOS.

After:

- COS has a dedicated `Live` mode in the rail, queue, top metrics, and operating map.
- The live commerce screen shows live sessions, product set lines, stock allocation, guardrails, channel support, orders, and attributed revenue.
- The demo can be run from one screen without jumping across many legacy routes.

Recommended walkthrough:

1. Open `/overview?module=cos`.
2. Show COS readiness, active orders, ATP, live sessions, fulfillment, and channel coverage.
3. Open `Live plan`.
4. Show the HydraGlow product set and how the same set is assigned across TikTok Live, Shopee Live, KOL A, and Brand.com.
5. Show stock allocation: 1,000 total units, 800 sellable units assigned, 200 buffer stock.
6. Show guardrails: over-allocation check, sellable stock assignment, buffer, reservation logic, and performance grain.
7. Move to OMS to show paid/open order review.
8. Move to Ship to show fulfillment and exception handling.

## Live Commerce Feature Scope

Current demo scope:

- Create live session/campaign record.
- Assign a product set to a session.
- Allocate inventory by channel/session/KOL.
- Track sold, reserved, orders, and attributed revenue by live session.
- Reserve stock before OMS release.
- Keep buffer stock to prevent oversell.
- Show channel status for Shopee, Lazada, TikTok Shop, and Brand.com.

Future integration notes:

- Shopee/Lazada/TikTok Shop live APIs should sync product, order, customer, and stock updates where partner APIs allow.
- Brand.com can connect through Shopify, WooCommerce, or custom webhooks.
- Comments/chat capture and live-room engagement can be added later as a demand signal into CRM and Intelligence.
- Creative generation remains outside PrimeOS core and should be handled by Prime Marketing.

## Product Set And Inventory Allocation

Demo product set:

| SKU | Item | Quantity | Role |
| --- | --- | ---: | --- |
| HG-ESSENCE-30ML | HydraGlow Essence 30ml | 1 | Hero SKU |
| HG-MASK-5PC | HydraGlow Mask 5-pack | 1 | Bundle lift |
| HG-POUCH | Campaign pouch | 1 | Gift with purchase |

Allocation example:

| Allocation | Channel | Units | Owner | Status |
| --- | --- | ---: | --- | --- |
| TikTok Live | TikTok Shop | 300 | Internal live team | Ready |
| Shopee Live | Shopee | 200 | Marketplace ops | Ready |
| KOL A Session | KOL | 100 | Creator ops | Watch |
| Brand.com Campaign | Brand.com | 200 | Owned commerce | Ready |
| Buffer Stock | Ops buffer | 200 | Inventory control | Ready |

Reservation rule:

`ATP = on hand - reserved unpaid - reserved paid - allocated - safety stock - campaign lock`

Allocation rules:

- A live session cannot allocate more than unassigned sellable stock.
- Buffer stock is excluded from sellable allocation unless an operator releases it.
- Paid orders move from reserved stock into fulfillment release.
- Unpaid or partial-payment orders remain held until payment policy passes.
- Session-level allocation must carry owner, channel, product set, status, and release rule.

Backend/data requirements:

- `product_sets`: parent set, component SKUs, quantity, status, channel eligibility.
- `live_sessions`: channel, host/KOL, campaign, product set, time window, owner, status.
- `inventory_allocations`: SKU/product set, channel, session, allocated units, buffer, lock status.
- `reservation_ledger`: order/session/customer, reserved units, payment state, expiry/release reason.
- `performance_rollup`: campaign, channel, session, KOL, orders, revenue, conversion, stock consumed.

## PrimeOS Vs Prime Marketing Boundary

| Area | PrimeOS | Prime Marketing |
| --- | --- | --- |
| Product master | Owns SKU, product data, attributes, variants | Uses product data as creative input |
| Marketplace listing rules | Owns channel mapping, listing readiness, publishing workflow | Advises campaign-specific listing angle |
| Asset library | Stores approved assets and listing-ready files | Generates thumbnails, banners, ads creative, campaign copy |
| Live commerce | Owns session, product set, allocation, OMS handoff, performance | Creates creative assets and selling scripts |
| Publishing | Owns marketplace/owned-site publishing workflow | Supplies approved creative package |
| AI agent | Operational recommendations and approved workflow actions | Creative generation and adaptation |

Integration flow:

1. PrimeOS sends product data, channel requirements, and campaign context to Prime Marketing.
2. Prime Marketing generates thumbnails, banners, ads creative, and copy.
3. Approved assets return to the PrimeOS asset library.
4. PrimeOS attaches assets to product listings, live sessions, campaign pages, and publishing workflow.

## Package And Pricing Draft

| Package | Target user | Indicative price | Included features |
| --- | --- | ---: | --- |
| Free / Trial | Demo users, small sellers | USD 0 | Basic CRM, product list, limited dashboard, demo connectors |
| Starter | SME sellers | USD 49/user/month | Product master, basic inventory, order sync, basic CRM |
| Growth | Multi-channel sellers | USD 199/user/month | Marketplace integration, product sets, live commerce allocation, campaign inventory, advanced dashboard |
| Pro / Enterprise | Brands, agencies, KOL networks | Custom | AI agent, advanced reporting, custom integration, approval flow, priority support |

Pricing logic:

- Free/Trial proves the product with limited data, demo connectors, and limited dashboard depth.
- Starter charges for structured product, inventory, order, and CRM operations.
- Growth charges for multi-channel execution, live commerce allocation, and campaign inventory.
- Pro/Enterprise charges for AI usage, advanced reporting, approval flow, custom integrations, onboarding, and support.
- Marketplace/channel integration cost and AI usage cost should be separated in commercial proposals when usage is material.

Open business questions:

- Confirm whether Lark clients should receive a free pilot period, discounted starter package, or paid implementation package.
- Confirm whether integration setup is one-time onboarding, monthly add-on, or enterprise-only.
- Confirm AI usage metering: included credits, overage, or enterprise pool.
- Confirm support model: self-serve, shared CSM, or dedicated implementation manager.

## Progress Update For BD/Team

PrimeOS is now demo-ready for the Lark seeding conversation around e-commerce and live commerce operations. The COS overview has a dedicated Live Commerce flow covering product sets, stock allocation by channel/session/KOL, buffer stock, reservation guardrails, live orders, revenue attribution, and channel support for Shopee, Lazada, TikTok Shop, and Brand.com. We also clarified the PrimeOS vs Prime Marketing boundary and prepared an initial Free/Starter/Growth/Pro package structure for BD discussion. The recommended demo path is `/overview?module=cos` -> `Live plan` -> OMS -> Ship.
