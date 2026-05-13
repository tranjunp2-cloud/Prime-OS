# 06 - BOD Walkthrough

## Demo thesis

Prime OS Phase 1 is not a new backend. It is a board-ready product visualization proving that an existing COS control core can become the operating center for a broader commerce OS.

## Walkthrough order

1. Open `/overview`
   - Message: Prime OS is organized by Area -> Tower -> Floor.
   - Proof: COS strength metrics are visible and all four areas are represented.

2. Open `/ecom/cos/product-master`
   - Message: We are not rebuilding COS.
   - Proof: Existing Product Master screen runs inside Prime OS.

3. Open `/ecom/cos/inventory-brain`, `/ecom/cos/oms`, `/ecom/cos/fulfillment`
   - Message: COS owns execution.
   - Proof: Product/SKU, ATS, order lifecycle, fulfillment job, shipment/tracking are already present.

4. Open `/demand/campaign`
   - Message: Demand is now tied to real COS products and SKUs.
   - Proof: Campaign rows show product/SKU, traffic, leads, RFQs, and revenue proof.

5. Open `/customer/crm-compact`
   - Message: Customer Area stays compact.
   - Proof: Identity, profile, timeline, segment, lifecycle, notes, follow-up, loyalty lite, and B2B extension are represented in one tower.

6. Open `/ecom/commerce-surface`
   - Message: RFQ and assisted commerce hand execution to COS.
   - Proof: Converted RFQ points into OMS order context.

7. Open `/customer/service`
   - Message: Service issues connect back to orders, RMA, SLA, and customer timeline.
   - Proof: Service tickets link to COS returns/OMS and feed CRM Compact.

8. Open `/intelligence/forecasting`
   - Message: Intelligence reads COS context before optimizing.
   - Proof: Demand forecast compares campaign demand with Inventory Brain ATS.

9. Open `/intelligence/product-operation-agent?view=command`
   - Message: Operation Agent is a governed execution chat, not detached AI prose.
   - Proof: The session-local chat keeps a transcript, blocks direct mutation prompts, prepares approval packets, routes them to Agent Queue, and records audit context without silently changing source suites.

10. Open `/ecom/cos/event-audit`
    - Message: Prime OS can produce an audit trail across execution and decisions.
    - Proof: OMS events, tracking events, service cases, alerts, and recommendations are visible together.

## Key BOD messages

- Demand creates opportunity.
- Customer retains context.
- Ecom executes.
- Intelligence learns and optimizes.
- COS is the control core.
- Prime OS is our architecture; COS is reused as a Phase 1 proof asset, not adopted as the official framework.

## Acceptance checklist

- COS screens run inside Prime OS shell.
- COS Tower is the strongest section.
- All requested areas/towers are visible in navigation.
- Customer Area is compacted into CRM Compact and Service only.
- Mock data is linked across campaign, lead, customer, RFQ, order, inventory, fulfillment, ticket, VOC, recommendation, and alert.
- Six BOD demo flows are documented and visible from Overview.
