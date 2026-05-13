# 05 - Demo Flows

## Flow 1 - Campaign -> traffic -> lead capture -> CRM Compact entry

- Start screen: `/demand/campaign`
- Key state change: Campaign traffic creates a lead with `campaignId`, `productId`, `skuId`, and `customerId`.
- Continue to: `/demand/lead-capture`, then `/customer/crm-compact`
- End proof point: Demand creates opportunity and Customer retains context.

## Flow 2 - Lead -> qualification -> B2B extension -> RFQ

- Start screen: `/demand/lead-capture`
- Key state change: Qualified lead receives score, B2B account context, and RFQ candidate.
- Continue to: `/customer/crm-compact`, then `/ecom/commerce-surface`
- End proof point: CRM Compact contains identity, timeline, segmentation, follow-up, loyalty lite, and B2B extension in one tower.

## Flow 3 - RFQ / assisted commerce -> order created -> OMS entry

- Start screen: `/ecom/commerce-surface`
- Key state change: Converted RFQ points to `orderId`.
- Continue to: `/ecom/cos/oms`
- End proof point: Commerce Surface does not execute separately; it hands execution to COS.

## Flow 4 - Order -> inventory reservation -> orchestration -> fulfillment request -> shipment tracking

- Start screen: `/ecom/cos/oms`
- Key state change: OMS lifecycle links order line to SKU, inventory, warehouse, fulfillment job, shipment, and tracking.
- Continue to: `/ecom/cos/inventory-brain`, `/ecom/cos/fulfillment`
- End proof point: COS is the control core.

## Flow 5 - Order issue -> service ticket -> return/complaint -> resolution -> customer timeline updated

- Start screen: `/ecom/cos/returns`
- Key state change: Return/RMA becomes Service ticket and updates CRM Compact timeline.
- Continue to: `/customer/service`, then `/customer/crm-compact`
- End proof point: Customer context is retained after sale and service issue.

## Flow 6 - VOC / analytics / attribution / forecast / AI recommendation -> campaign adjustment / customer follow-up / ops alert

- Start screen: `/intelligence/voc`
- Key state change: VOC, forecast, ticket, and campaign data produce AI recommendation and alert.
- Continue to: `/intelligence/analytics`, `/intelligence/forecasting`, `/intelligence/product-operation-agent?view=command`, `/intelligence/product-operation-agent?view=queue`, `/intelligence/product-operation-agent?view=audit`
- End proof point: Intelligence learns and optimizes around COS system context while Operation Agent prepares, routes, and audits work without silently mutating source suites.
