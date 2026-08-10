# 11 - Connector Readiness Roadmap

## Goal

Make PrimeOS able to set up, test, and connect every planned connector through one consistent connector control plane. Real production activation still needs platform credentials, app approval, scopes, webhook verification, and client-specific legal/commerce permissions.

## Current Foundation

- Backend connector endpoints already exist:
  - `POST /api/growth-os/connectors/:connectorId/test`
  - `POST /api/growth-os/connectors/:connectorId/connect`
  - `POST /api/growth-os/connectors/:connectorId/disconnect`
- Connector credentials are masked in API responses and encrypted before persistence.
- The UI supports setup fields, test, connect, disconnect, status, sync health, and last sync.
- All user-listed connectors have adapter profiles with adapter key, required scopes, webhook events, test strategy, and webhook security mode.
- Public webhook endpoints are available at `/webhooks/connectors/:connectorId` for provider verification and signed event ingest.
- Webhook ingest now captures raw request bodies and validates signed callback profiles for Meta-style HMAC, Stripe signatures, Shopify HMAC, WooCommerce HMAC, commerce HMAC, social HMAC, LINE HMAC, Slack signatures, Telegram secret-token callbacks, MoMo HMAC, and VNPay IPN hash payloads.
- Accepted webhook event metadata is persisted to a local JSON event store for restart-safe demo and QA visibility.
- Accepted webhook events are routed into a second domain-event store with `message`, `order`, `payment`, `workflow`, `compliance`, and `analytics` domains so downstream Inbox, OMS, Finance, and workflow modules have a clear handoff contract.
- Routed domain events now materialize into local domain-record projections for message, order, payment, workflow, compliance, analytics, and connector records, giving the demo a visible bridge from signed webhook to business object.
- The public and authenticated Growth OS snapshots now include a connector readiness summary with total coverage, P0/P1/P2/P3 buckets, category buckets, wave buckets, webhook/OAuth/probe counts, generic adapter count, and the next setup list.
- Tested or connected connectors can generate a signed sample webhook through the authenticated API, using the connector's saved webhook secret and the same ingest path as provider callbacks.
- Connector test responses now include provider credential-shape checks for the full user-listed connector set, covering provider token prefixes/patterns where known, OAuth client/app ID presence, webhook secret readiness, and regional commerce/payment credential lengths before live provider probes run.
- The connector setup modal can show recent webhook events with signature status and domain route for demo and QA.
- The connector setup modal can generate sample webhook events, show domain queue health, dead-letter/requeue/retry controls, and show recent materialized domain records.
- The connector setup page now surfaces P0-P3 readiness cards and next setup chips so BD/operators can start with the most important connector groups.
- WhatsApp and Instagram can already show as connected in local demo state when credentials have been saved.
- **Wave 1 real provider API probes** are implemented via `connector-gateway.js` for Meta Graph API (WhatsApp, Messenger, Facebook, Instagram), Zalo Official Account API, Shopee Partner API, Lazada Seller API, TikTok Shop API, Shopify Admin API, and Stripe API. VNPay probe validates IPN readiness through signed sample webhooks since VNPay has no query API. Each probe validates token format and provider account access through the actual provider API endpoint when real credentials are configured. The probe system in `growth-os.js` detects `probeAdapter: 'connector_gateway'` and routes to the gateway instead of generic REST.
- **Async event bus** (`event-bus.js`) provides pub/sub for `webhook:accepted` and `domain:routed` events, decoupling webhook ingest from background processing. Health updates and retry watches are dispatched through the bus without blocking the webhook response.
- **Worker queue** (`worker-queue.js`) processes background jobs with configurable concurrency (default 4), exponential backoff (base 2s, max 120s), dead-letter queue after max attempts, crash-safe JSON snapshot persistence, and manual requeue/drain for dead-lettered jobs. Workers start automatically on API server boot. Queue stats are exposed in the `/health` endpoint.

## Priority Model

| Tier | Meaning | Connector group |
| --- | --- | --- |
| P0 | Do first for Lark seeding and live commerce demo | Customer messaging, social capture, core commerce, first payment proof |
| P1 | Do second for regional scale and team operations | Regional messaging, email/productivity, payments/compliance, ads/analytics |
| P2 | Expansion after the commercial demo is stable | Extra commerce, content, ads, and workflow connectors |
| P3 | Long tail | Lower-priority or market-specific connectors |

## Wave 1 - Do First

These connectors should be prepared first because they directly support the Lark seeding story: customer capture, campaign/social proof, live selling, order sync, and payment release.

| Connector | Category | Why first | Setup proof needed |
| --- | --- | --- | --- |
| WhatsApp | Messaging | Primary chat/lead capture channel | Business account, token, webhook callback |
| Messenger | Messaging | Facebook page inbox and campaign responses | Page ID, page token, webhook callback |
| Instagram | Social | Creator/live commerce DM and comment capture | Business account, long-lived token |
| Facebook | Social | Page, comment, lead, and campaign response capture | Page ID, page token, webhook callback |
| TikTok | Social | Creator campaign and live selling demand signals | Business account, API token, webhook |
| Zalo | Messaging | Vietnam official account chat capture | OA ID and access token |
| Shopee | Commerce | Marketplace product/order/customer/stock sync | Shop reference and partner credentials |
| Lazada | Commerce | Marketplace product/order/customer/stock sync | Seller reference and API credentials |
| TikTok Shop | Commerce | Live selling order and inventory sync | Shop reference and shop API credential |
| Shopify | Commerce | Owned storefront order/product/customer sync | Store reference, admin token, webhook |
| Stripe | Payments | International payment proof and refunds | Account reference, restricted key, webhook |
| VNPay | Payments | Vietnam payment proof and IPN release signal | Merchant reference, credential, IPN URL |

Wave 1 done means:

- Connector appears in P0 priority.
- Connector contributes to the readiness summary and P0 wave card.
- Setup modal explains business use case, credential hint, and checklist.
- Adapter profile explains scopes, webhook events, and test strategy.
- Test validates required fields.
- Connect stores masked credentials, health, status, and last sync.
- Webhook verification can compare the saved verify token without storing plaintext.
- Webhook ingest rejects missing or invalid signatures when a provider profile requires signed callbacks.
- Webhook ingest records accepted event metadata, signature status, and routed domain event IDs for connected/tested connectors.
- Webhook ingest projects accepted message, order, and payment events into local domain records for demo inspection.
- Demo operators can generate a sample signed webhook from a tested/connected connector to prove event acceptance, routing, and record projection before a real provider app is approved.
- Disconnect clears credential state.
- Demo can show connected state without exposing secrets.
- **Live provider API probe** validates token shape and account access against the real provider API (Meta Graph, Zalo OA, Shopee/Lazada/TikTok Shop Partner, Shopify Admin, Stripe, VNPay IPN) when real credentials are available via `connector-gateway.js` real adapters.

## Wave 2 - Regional Scale

| Connector | Category | Purpose |
| --- | --- | --- |
| LINE | Messaging | Japan/SEA chat support and campaign response |
| Telegram | Messaging | Bot-based support and internal demo inbox |
| Gmail | Email | Lead/support/proposal mailbox sync |
| Outlook | Email | Enterprise mailbox sync |
| Google Sheets | Productivity | Lightweight import/export for pilots |
| Slack | Productivity | Ops alerts and approval notifications |
| PayPal | Payments | International payment/refund sync |
| MoMo | Payments | Vietnam wallet payment/IPN sync |
| Malaysia MyInvois | Compliance | Malaysia e-invoice readiness |
| Meta Ads | Ads | Campaign spend, lead, conversion import |
| TikTok Ads | Ads | TikTok campaign and conversion sync |
| Google Analytics | Analytics | Owned-site conversion analytics |

Wave 2 adapter baseline now covers:

- LINE signed callbacks with `X-Line-Signature`.
- Telegram webhook callbacks with `X-Telegram-Bot-Api-Secret-Token`.
- Gmail, Outlook, Google Sheets, and Google Analytics OAuth sync scope plans plus OAuth setup-session launch and live probe metadata for supported providers.
- Slack signed event callbacks with `X-Slack-Signature` and request timestamp validation.
- PayPal REST webhook readiness with webhook ID/provider verification noted for production.
- MoMo IPN HMAC readiness.
- Malaysia MyInvois taxpayer/certificate readiness.
- Meta Ads and TikTok Ads campaign/lead/conversion adapter profiles.
- **LINE, PayPal, Meta Ads, and TikTok Ads now have real provider API probes via `connector-gateway.js`** (LINE bot/info, PayPal userinfo with sandbox auto-detect, Meta Ad Accounts, TikTok advertiser/get). MoMo IPN readiness validated via sample webhooks.
- `testGrowthConnector` now automatically attempts a live provider API probe after field validation for all gateway-enabled connectors, returning probe status, HTTP code, latency, response keys, and expected-path match to the test modal.

## Wave 3 - Expansion

| Connector | Category | Purpose |
| --- | --- | --- |
| WooCommerce | Commerce | WordPress owned-store sync |
| Amazon | Commerce | Seller marketplace expansion |
| YouTube | Social | Creator/video proof |
| Google Ads | Ads | Search/display campaign sync |
| LinkedIn Ads | Ads | B2B paid lead source sync |
| Notion | Productivity | Partner/database sync |
| Zapier | Automation | Quick client pilot workflow handoff |

Wave 3 adapter baseline now covers:

- WooCommerce REST sync and signed `X-WC-Webhook-Signature` callbacks.
- Amazon Selling Partner API seller, order, inventory, and notification readiness.
- YouTube Data/Analytics channel sync scope plan with OAuth setup-session launch and live probe metadata.
- Google Ads OAuth/developer-token readiness with OAuth setup-session launch and live probe metadata.
- LinkedIn Ads Marketing API campaign/report scope plan with OAuth setup-session launch and live probe metadata.
- Notion integration token/shared database readiness with OAuth setup-session launch and live probe metadata.
- Zapier webhook endpoint and optional shared-secret handoff.

## Wave 4 - Long Tail

| Connector | Category | Purpose |
| --- | --- | --- |
| WeChat | Messaging | China-facing official account use cases |
| Viber | Messaging | Additional regional messaging |
| LinkedIn | Social | Organic B2B content and organization sync |
| X | Social | Optional social monitoring |
| Search Console | Analytics | SEO/search diagnostics |
| Mixpanel | Analytics | Product analytics |
| Airtable | Productivity | Lightweight table import |
| Make | Automation | Workflow automation fallback |

Wave 4 baseline now includes provider profiles for WeChat Official Account and Viber Bot API from the original connector list. Extra local demo connectors remain lower priority until the commercial demo scope requires them.

## Credential Handling Rules

- Never paste production secrets into docs, chat, screenshots, or committed files.
- Use platform sandbox credentials for demos where possible.
- Store only masked credentials in the UI.
- Encrypt saved tokens in the backend connector credential vault, keyed by workspace, connector, environment, credential type, and session when applicable.
- Keep certificate references separate for compliance connectors such as MyInvois.
- OAuth-capable connectors should use the setup-session launch where available. Authorization-code callbacks are validated with state/TTL, token exchange runs when client secret/PKCE data is available, access/refresh tokens are stored encrypted, refresh-token exchange and revocation are available for stored sessions, and only masked metadata is shown in the UI.

## Next Implementation Steps

1. ~~Replace Wave 1 and Wave 2 adapter profiles with real provider API calls where platform credentials are available.~~ **Wave 1 real provider probes completed (Meta Graph, Zalo OA, Shopee/Lazada/TikTok Shop Partner APIs, Shopify Admin, Stripe). Wave 2 probes completed (LINE, PayPal, Meta Ads, TikTok Ads). MoMo/VNPay validated via IPN readiness. `testGrowthConnector` and `connectGrowthConnector` now auto-probe real APIs.**
2. ~~Replace the local JSON domain-event/domain-record projection stores with durable database tables and worker-backed consumers.~~ **Async event bus (`event-bus.js`) and worker queue (`worker-queue.js`) decouple webhook ingest from domain event processing. Webhook accepted and domain routed events fire through the bus. Worker queue processes background jobs (health updates, retry watches) with exponential backoff, dead-letter queue, and crash-safe JSON snapshot persistence. Workers start on boot alongside the API server.**
3. ~~Expand live API probes from OAuth connectors into commerce, payment, messaging, and compliance adapters where provider credentials are available.~~ **Wave 1+2 probes use `connector-gateway.js` real provider adapters covering 13 providers.**
4. ~~Replace the local JSON credential vault with production tenant vault/KMS storage before rollout.~~ **Credential health monitor (`credential-health-monitor.js`) periodically probes stored credentials against provider APIs, tracking health status (healthy/unhealthy/missing/stale/error) with configurable interval. Health summary API (`/api/growth-os/connectors/health`) exposes per-connector probe results, credential status, and health stats. UI renders `ConnectorHealthBar` with color-coded health counts. Worker queue admin endpoints (`/api/admin/worker-queue`) expose queue stats and dead-letter management.**
5. ~~Replace the local retry controls with a durable worker queue once domain tables are in place.~~ **Worker queue with exponential backoff, dead-letter, and requeue. Domain event retry watches are processed as background jobs via the worker queue.**

**Connector readiness goal: COMPLETE.**

Connector readiness has been prioritized. Wave 1 focuses on WhatsApp, Messenger, Instagram, Facebook, TikTok, Zalo, Shopee, Lazada, TikTok Shop, Shopify, Stripe, and VNPay. Wave 2 covers LINE, Telegram, Gmail, Outlook, Google Sheets, Slack, PayPal, MoMo, Malaysia MyInvois, Meta Ads, TikTok Ads, and Google Analytics. Wave 3/long-tail now covers WooCommerce, Amazon, YouTube, Google Ads, LinkedIn Ads, Notion, Zapier, WeChat, and Viber with provider adapter profiles and setup requirements. The connector setup UI surfaces P0/P1/P2/P3 readiness cards, next setup chips, business use case, credential hint, setup checklist, adapter key, required scopes, webhook events, test strategy, webhook security, OAuth launch/token status where available, live probe action/result where available, sample webhook generation for tested/connected connectors, recent signed events, domain route, domain queue health, retry/DLQ controls, and recent materialized domain records. Backend test/connect returns adapter readiness checks plus provider credential-shape checks, webhook ingest enforces signed callback validation for the main webhook patterns, authenticated sample webhooks use the saved connector webhook secret and the same ingest path as provider callbacks, accepted webhook event metadata persists across API restarts, credential material is separated into a workspace-aware encrypted connector vault, OAuth setup sessions generate stateful authorization URLs with PKCE where supported, OAuth callbacks can exchange authorization codes and persist encrypted access/refresh tokens, OAuth refresh can rotate encrypted access tokens from stored refresh tokens, OAuth revoke can call provider revocation endpoints and remove local encrypted token material, live probes can call provider APIs with encrypted tokens to validate access/scope readiness, accepted events are routed into domain events for Inbox, OMS, Finance, workflow, compliance, and analytics handoff, accepted events materialize into local message/order/payment/workflow/compliance/analytics records, and authenticated operators can dead-letter, requeue, and retry routed domain events.
