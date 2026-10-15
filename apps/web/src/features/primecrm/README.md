# Prime CRM workspace

This feature adapts the workflow separation reviewed against `Desktop/CRM v1`.
The implementation is a browser-persisted prototype, not a migration of the Nuxt
application's provider integrations or backend.

## Ownership

| Prime CRM | Main Workspace |
| --- | --- |
| Conversations, comments, assignments, resolution | Staff accounts, access permissions, security |
| Social guests, notes, explicit customer links | Canonical customers, purchase history, customer ranks |
| Conversation tags and interaction levels | Shared customer classifications |
| Reply templates, restricted phrases | Transactional email templates |
| Response history and conversation analytics | Business analytics, campaign management |
| WhatsApp form content drafts | Channel credentials and connection lifecycle |
| Contextual order creation | Orders, products, pricing, stock, delivery, promotions |

## Routes

- `/inbox/conversation`: independent threads, drafts, filtering, self-assignment,
  simulated replies, resolve/reopen, tags, notes, customer links and order handoff.
- `/inbox/guests`: people who have contacted a channel, including non-buyers.
- `/inbox/history`: per-conversation/all history, search and CSV export.
- `/inbox/analytics`: counts derived from the prototype state, filtered by channel.
- `/inbox/settings?section=templates|tags|keywords|levels|whatsapp|shared`.

The original `/inbox` namespace and `PrimeInboxWorkspace` import remain compatible.
Legacy `/crm`, `/crm/hub`, `/crm/chat`, `/crm/quick-replies` and `/crm/cs-analytics`
now lead to the matching CRM surface. Marketing-specific aliases and the existing
service booking workspace remain unchanged.

## Persistence and Main integration

CRM local storage is partitioned by workspace/account and by sample/empty demo
mode. Read/write failures are surfaced and corrupt saved data is not overwritten.
Customer links use Main's order-derived directory and grouping identities;
linking does not merge profiles or mutate customer/order snapshots.

Order creation in the prototype build reuses `ManualOrderDialog` with only a
customer/store/context prefill. It goes through the existing Orders API adapter
and validation, writes to Main's prototype order dataset and records the order
ID in the conversation. No fictional checkout link or ATP claim is generated.
Non-prototype builds link to Main Orders instead of submitting sample guests as
real orders. Main remains responsible for stock verification and fulfillment.

## Integration boundaries

Replies are explicitly simulated and never call messaging providers. Automatic
reply templates and WhatsApp forms are drafts only. Real message ingestion,
attachments, channel-side comment moderation, multi-agent presence, automatic
reply execution, WhatsApp publishing and live SLA/CSAT require backend/provider
integration. The UI's admin configuration guard is not a server permission check.
No claim of production readiness or backend CRM v1 parity is made.

Guest levels use incoming chat/comment thresholds, independently of spending-based
Main customer ranks. Analytics do not invent SLA, satisfaction or revenue data.
