export interface PrimeFlowStep {
  id: string;
  label: string;
  route?: string;
  reads: string[];
  writes: string[];
}

export interface PrimeFlowRegistryItem {
  id: string;
  name: string;
  sourceArea: string;
  targetArea: string;
  sourceTower: string;
  targetTower: string;
  trigger: string;
  output: string;
  failureHandling: string;
  routes: string[];
  entities: string[];
  steps: PrimeFlowStep[];
}

export const primeFlowRegistry: PrimeFlowRegistryItem[] = [
  {
    id: 'campaign-to-lead',
    name: 'Campaign to Lead',
    sourceArea: 'Demand',
    targetArea: 'Customer',
    sourceTower: 'Campaigns',
    targetTower: 'Customer Profile',
    trigger: 'Campaign launched or source response captured',
    output: 'Qualified lead with product/SKU context',
    failureHandling: 'Suppress weak source and route to Demand owner',
    routes: ['/demand/campaigns', '/demand/sources', '/demand/leads-rfqs', '/customer/crm-compact'],
    entities: ['Campaign', 'Lead', 'Customer', 'Product', 'SKU'],
    steps: [
      { id: 'launch', label: 'Launch campaign', route: '/demand/campaigns', reads: ['Product', 'SKU', 'Listing'], writes: ['Campaign'] },
      { id: 'capture', label: 'Capture response', route: '/demand/leads-rfqs', reads: ['Campaign'], writes: ['Lead'] },
      { id: 'handoff', label: 'Create customer context', route: '/customer/crm-compact', reads: ['Lead'], writes: ['Customer'] },
    ],
  },
  {
    id: 'rfq-to-order',
    name: 'RFQ to Order',
    sourceArea: 'Demand',
    targetArea: 'Ecom / COS',
    sourceTower: 'Leads & RFQs',
    targetTower: 'Orders / OMS',
    trigger: 'RFQ quoted and accepted',
    output: 'OMS order linked to customer, SKU, and campaign',
    failureHandling: 'Escalate pricing or ATS exception before order creation',
    routes: ['/demand/leads-rfqs', '/ecom/cos/oms', '/ecom/cos/product-master', '/ecom/cos/inventory-brain'],
    entities: ['RFQ', 'Lead', 'Customer', 'SKU', 'Order'],
    steps: [
      { id: 'qualify', label: 'Qualify RFQ', route: '/demand/leads-rfqs', reads: ['Lead', 'SKU'], writes: ['RFQ'] },
      { id: 'check-ats', label: 'Confirm ATS', route: '/ecom/cos/inventory-brain', reads: ['Inventory Position', 'SKU'], writes: ['ATS Snapshot'] },
      { id: 'create-order', label: 'Create order', route: '/ecom/cos/oms', reads: ['RFQ', 'Customer'], writes: ['Order'] },
    ],
  },
  {
    id: 'order-to-fulfillment',
    name: 'Order to Fulfillment',
    sourceArea: 'Ecom / COS',
    targetArea: 'Ecom / COS',
    sourceTower: 'Orders / OMS',
    targetTower: 'Fulfillment',
    trigger: 'Order created or released',
    output: 'Shipment job, tracking event, and settlement evidence',
    failureHandling: 'Exception queue plus SLA reroute recommendation',
    routes: ['/ecom/cos/oms', '/ecom/cos/fulfillment', '/ecom/cos/event-audit', '/finance/fin-support'],
    entities: ['Order', 'Order Line', 'Shipment Job', 'Shipment', 'Tracking Event', 'Receivable'],
    steps: [
      { id: 'validate', label: 'Validate order', route: '/ecom/cos/oms', reads: ['Order'], writes: ['Order Event'] },
      { id: 'ship', label: 'Create shipment job', route: '/ecom/cos/fulfillment', reads: ['Order Line', 'Inventory Position'], writes: ['Shipment Job'] },
      { id: 'evidence', label: 'Write audit and finance evidence', route: '/ecom/cos/event-audit', reads: ['Shipment'], writes: ['Event', 'Receivable'] },
    ],
  },
  {
    id: 'return-to-refund',
    name: 'Return to Refund',
    sourceArea: 'Customer',
    targetArea: 'Ecom / COS',
    sourceTower: 'Service',
    targetTower: 'Returns',
    trigger: 'Customer return/service case opened',
    output: 'Closed RMA, updated inventory state, and customer timeline event',
    failureHandling: 'Service SLA escalation with Customer timeline proof',
    routes: ['/customer/service', '/ecom/cos/returns', '/customer/crm-compact'],
    entities: ['Ticket', 'RMA', 'Order', 'Customer', 'Timeline Event'],
    steps: [
      { id: 'ticket', label: 'Open service case', route: '/customer/service', reads: ['Customer', 'Order'], writes: ['Ticket'] },
      { id: 'rma', label: 'Authorize RMA', route: '/ecom/cos/returns', reads: ['Ticket', 'Order'], writes: ['RMA'] },
      { id: 'timeline', label: 'Update customer timeline', route: '/customer/crm-compact', reads: ['RMA'], writes: ['Timeline Event'] },
    ],
  },
  {
    id: 'forecast-to-replenishment',
    name: 'Forecast to Replenishment',
    sourceArea: 'Intelligence',
    targetArea: 'Ecom / COS',
    sourceTower: 'Signals',
    targetTower: 'Inventory Brain',
    trigger: 'Forecast risk or campaign demand spike detected',
    output: 'Replenishment recommendation with SKU/ATS evidence',
    failureHandling: 'Alert Decision Hub and suppress risky launch',
    routes: ['/intelligence/signals', '/ecom/cos/inventory-brain', '/intelligence/decision-hub'],
    entities: ['Forecast', 'SKU', 'Inventory Position', 'Recommendation', 'Alert'],
    steps: [
      { id: 'forecast', label: 'Read forecast', route: '/intelligence/signals', reads: ['Campaign', 'Order', 'Forecast'], writes: ['Signal'] },
      { id: 'ats', label: 'Check ATS risk', route: '/ecom/cos/inventory-brain', reads: ['Inventory Position'], writes: ['Recommendation'] },
      { id: 'decision', label: 'Send decision', route: '/intelligence/decision-hub', reads: ['Recommendation'], writes: ['Decision'] },
    ],
  },
  {
    id: 'receivable-readiness',
    name: 'Receivable Readiness',
    sourceArea: 'Finance',
    targetArea: 'Finance',
    sourceTower: 'Fin Support',
    targetTower: 'Bank Partner View',
    trigger: 'Fulfilled order and settlement event available',
    output: 'Bank partner review packet',
    failureHandling: 'Block funding eligibility until receivable proof is attached',
    routes: ['/finance/fin-support', '/ecom/cos/oms', '/ecom/cos/fulfillment'],
    entities: ['Order', 'Shipment', 'Receivable', 'Settlement', 'Credit Readiness'],
    steps: [
      { id: 'collect', label: 'Collect fulfilled orders', route: '/ecom/cos/oms', reads: ['Order', 'Shipment'], writes: ['Receivable'] },
      { id: 'score', label: 'Score readiness', route: '/finance/fin-support#status', reads: ['Receivable'], writes: ['Credit Readiness'] },
      { id: 'packet', label: 'Prepare bank packet', route: '/finance/fin-support#lenders', reads: ['Credit Readiness'], writes: ['Bank Partner Review'] },
    ],
  },
];

export function getPrimeFlowsForRoute(pathname: string) {
  return primeFlowRegistry.filter((flow) => flow.routes.some((route) => pathname === route || pathname.startsWith(`${route}/`)));
}
