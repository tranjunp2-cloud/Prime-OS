import { getFulfillmentJobs, getShipmentsByJobId, getTrackingEventsByShipmentId } from '@/lib/fulfillment-store';
import { getInventoryPositions, getTotalATS } from '@/lib/inventory-store';
import { getListings } from '@/lib/listing-store';
import { getOrders, getOrderEvents, getOrderItems } from '@/lib/order-store';
import { getProducts, getResolvedProductSkuById } from '@/lib/product-store';
import { getReturns } from '@/lib/return-store';
import { getWarehouses } from '@/lib/warehouse-store';
import type { InventoryPosition } from '@/lib/inventory-store';
import type { Order, OrderEvent, OrderItem } from '@/lib/oms-types';
import type { Product } from '@/lib/product-store';

export type PrimeArea = 'Demand Area' | 'Customer Area' | 'Ecom Area' | 'Intelligence Area';

export type PrimeTowerId =
  | 'acquisition'
  | 'campaign'
  | 'content-social'
  | 'lead-capture'
  | 'retargeting'
  | 'crm-compact'
  | 'service'
  | 'analytics'
  | 'attribution'
  | 'forecasting'
  | 'ai-operator'
  | 'voc'
  | 'alerts';

export interface PrimeTowerConfig {
  id: PrimeTowerId;
  area: PrimeArea;
  tower: string;
  promise: string;
  reuseSource: string;
  floors: string[];
}

export interface PrimeCampaign {
  id: string;
  name: string;
  channel: string;
  status: 'active' | 'testing' | 'paused';
  productId: string;
  skuId: string;
  skuCode: string;
  traffic: number;
  leads: number;
  rfqs: number;
  orders: number;
  spend: number;
  revenue: number;
  targetSegment: string;
}

export interface PrimeLead {
  id: string;
  campaignId: string;
  customerId: string;
  company: string;
  contact: string;
  email: string;
  score: number;
  status: 'new' | 'qualified' | 'rfq_sent' | 'converted';
  source: string;
  productId: string;
  skuId: string;
  lastTouch: string;
}

export interface PrimeRfq {
  id: string;
  leadId: string;
  customerId: string;
  orderId: string | null;
  skuId: string;
  quantity: number;
  value: number;
  status: 'draft' | 'quoted' | 'converted';
  requestedBy: string;
}

export interface PrimeCustomer {
  id: string;
  name: string;
  company: string;
  email: string;
  segment: string;
  lifecycle: 'lead' | 'active' | 'at-risk' | 'retention';
  totalOrders: number;
  totalRevenue: number;
  lastOrderId: string | null;
  b2bAccount: string;
  notes: string[];
  timeline: string[];
}

export interface PrimeTicket {
  id: string;
  customerId: string;
  orderId: string | null;
  rmaId: string | null;
  subject: string;
  status: 'open' | 'waiting_ops' | 'resolved';
  priority: 'normal' | 'high';
  sla: string;
  linkedEntity: string;
}

export interface PrimeVocInsight {
  id: string;
  source: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  productId: string;
  customerId: string;
  campaignId: string;
  summary: string;
  action: string;
}

export interface PrimeAlert {
  id: string;
  area: PrimeArea;
  severity: 'low' | 'medium' | 'high';
  title: string;
  linkedEntity: string;
  recommendationId: string;
}

export interface PrimeRecommendation {
  id: string;
  operator: 'AI Operator';
  target: string;
  reasoning: string;
  action: string;
  confidence: number;
}

export interface PrimeForecast {
  id: string;
  skuId: string;
  skuCode: string;
  demand7d: number;
  ats: number;
  risk: 'low' | 'medium' | 'high';
  suggestedAction: string;
}

export interface PrimeSocialStream {
  id: string;
  source: string;
  ingestionMode: 'api' | 'crawler' | 'partner-feed';
  eventVolume: number;
  freshnessMinutes: number;
  audienceSignal: string;
  status: 'healthy' | 'watch' | 'lagging';
}

export interface PrimeInsightModel {
  id: string;
  name: string;
  objective: string;
  inputSignal: string;
  outputSignal: string;
  confidence: number;
  retrainCadence: string;
}

export interface PrimeActivationPlay {
  id: string;
  trigger: string;
  audience: string;
  channelMix: string[];
  nextBestAction: string;
  projectedLift: number;
}

export interface PrimeDemoFlow {
  id: string;
  name: string;
  path: string[];
  stateChange: string;
  proofPoint: string;
}

export interface PrimeSnapshot {
  products: Product[];
  orders: Order[];
  orderItems: OrderItem[];
  orderEvents: OrderEvent[];
  inventoryPositions: InventoryPosition[];
  listingsCount: number;
  warehousesCount: number;
  fulfillmentJobsCount: number;
  shipmentsCount: number;
  trackingEventsCount: number;
  returnsCount: number;
  campaigns: PrimeCampaign[];
  leads: PrimeLead[];
  rfqs: PrimeRfq[];
  customers: PrimeCustomer[];
  tickets: PrimeTicket[];
  vocInsights: PrimeVocInsight[];
  alerts: PrimeAlert[];
  recommendations: PrimeRecommendation[];
  forecasts: PrimeForecast[];
  socialStreams: PrimeSocialStream[];
  insightModels: PrimeInsightModel[];
  activationPlays: PrimeActivationPlay[];
  demoFlows: PrimeDemoFlow[];
  metrics: {
    revenue: number;
    opportunityValue: number;
    leadToOrderRate: number;
    openIssues: number;
    highRiskAlerts: number;
    cosStrength: number;
  };
}

export const PRIME_TOWER_CONFIGS: Record<PrimeTowerId, PrimeTowerConfig> = {
  acquisition: {
    id: 'acquisition',
    area: 'Demand Area',
    tower: 'Acquisition Tower',
    promise: 'Capture qualified traffic against real COS products and channels.',
    reuseSource: 'New Prime OS wrapper, seeded from COS Product Master and Listings.',
    floors: ['Channel mix', 'Traffic source', 'Product audience fit', 'Landing intent'],
  },
  campaign: {
    id: 'campaign',
    area: 'Demand Area',
    tower: 'Campaign Tower',
    promise: 'Plan campaigns that can be traced from spend to lead, RFQ, order, and fulfillment.',
    reuseSource: 'New Prime OS wrapper, linked to COS SKU, order, and listing data.',
    floors: ['Campaign plan', 'Budget pacing', 'Offer logic', 'Conversion path'],
  },
  'content-social': {
    id: 'content-social',
    area: 'Demand Area',
    tower: 'Content & Social Tower',
    promise: 'Turn product proof, social proof, and VOC signals into campaign assets.',
    reuseSource: 'New Prime OS wrapper, linked to COS products and VOC insights.',
    floors: ['Content calendar', 'Social post queue', 'Creative evidence', 'VOC reuse'],
  },
  'lead-capture': {
    id: 'lead-capture',
    area: 'Demand Area',
    tower: 'Lead Capture Tower',
    promise: 'Convert campaign intent into CRM Compact entries and RFQ candidates.',
    reuseSource: 'New Prime OS wrapper, linked to campaign, customer, and RFQ objects.',
    floors: ['Lead queue', 'Qualification', 'RFQ trigger', 'CRM handoff'],
  },
  retargeting: {
    id: 'retargeting',
    area: 'Demand Area',
    tower: 'Retargeting Tower',
    promise: 'Reactivate product and order intent using inventory, issue, and lifecycle context.',
    reuseSource: 'New Prime OS wrapper, linked to inventory risk and customer timeline.',
    floors: ['Audience rules', 'Suppression rules', 'Offer guardrails', 'Follow-up paths'],
  },
  'crm-compact': {
    id: 'crm-compact',
    area: 'Customer Area',
    tower: 'CRM Compact Tower',
    promise: 'Keep identity, profile, timeline, segmentation, lifecycle, notes, follow-up, communication history, loyalty, and B2B account context in one compact tower.',
    reuseSource: 'New Prime OS wrapper, derived from COS orders, returns, and generated leads.',
    floors: ['Identity', 'Profile', 'Timeline', 'Segmentation', 'Lifecycle', 'Notes', 'Follow-up', 'Communication history', 'Loyalty lite', 'B2B account extension'],
  },
  service: {
    id: 'service',
    area: 'Customer Area',
    tower: 'Service Tower',
    promise: 'Resolve order issues while feeding the customer timeline and COS operating context.',
    reuseSource: 'New Prime OS wrapper, linked to COS Returns, OMS, and Fulfillment.',
    floors: ['Ticket queue', 'Case detail', 'RMA', 'SLA', 'Resolution'],
  },
  analytics: {
    id: 'analytics',
    area: 'Intelligence Area',
    tower: 'Analytics Tower',
    promise: 'Show one operating view across demand creation, customer context, COS execution, and service outcomes.',
    reuseSource: 'New Prime OS wrapper, computed from linked COS and Prime mock data.',
    floors: ['KPI model', 'Funnel health', 'Execution health', 'Service health'],
  },
  attribution: {
    id: 'attribution',
    area: 'Intelligence Area',
    tower: 'Attribution Tower',
    promise: 'Connect campaign spend to lead, RFQ, order, and fulfillment proof points.',
    reuseSource: 'New Prime OS wrapper, linked to campaign, RFQ, and order ids.',
    floors: ['Source attribution', 'Lead attribution', 'Order attribution', 'Issue attribution'],
  },
  forecasting: {
    id: 'forecasting',
    area: 'Intelligence Area',
    tower: 'Forecasting & Optimization Tower',
    promise: 'Forecast demand against actual ATS and trigger action before COS risk becomes visible to customers.',
    reuseSource: 'New Prime OS wrapper, derived from COS inventory and order demand.',
    floors: ['Demand forecast', 'ATS risk', 'Replenishment suggestion', 'Campaign throttle'],
  },
  'ai-operator': {
    id: 'ai-operator',
    area: 'Intelligence Area',
    tower: 'AI Operator Tower',
    promise: 'Operate on live system context, not disconnected chat messages.',
    reuseSource: 'New Prime OS wrapper plus existing GlobalCopilotWorkspace shell.',
    floors: ['Context reader', 'Decision queue', 'Recommendation', 'Action log'],
  },
  voc: {
    id: 'voc',
    area: 'Intelligence Area',
    tower: 'Social Listening & VOC Tower',
    promise: 'Turn customer voice, social proof, and service issues into product and campaign decisions.',
    reuseSource: 'New Prime OS wrapper, linked to product, campaign, customer, and ticket context.',
    floors: ['Listening queue', 'Sentiment', 'Root cause', 'Campaign/product action'],
  },
  alerts: {
    id: 'alerts',
    area: 'Intelligence Area',
    tower: 'Automation & Alerts Tower',
    promise: 'Route cross-area alerts to the right operator with linked entity context.',
    reuseSource: 'New Prime OS wrapper, linked to inventory, OMS, service, campaign, and forecast.',
    floors: ['Alert queue', 'Routing', 'Escalation', 'Automation guardrail'],
  },
};

const fallbackSku = {
  id: 'prime-sku-fallback',
  sku_code: 'COS-SKU',
};

function currency(value: number) {
  return Math.round(value);
}

function getPrimarySku(product: Product | undefined) {
  const sku = product?.skus?.[0];
  return sku ? { id: sku.id, sku_code: sku.sku_code } : fallbackSku;
}

function sumOrderRevenue(orders: Order[]) {
  return orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
}

function allOrderItems(orders: Order[]) {
  return orders.flatMap((order) => getOrderItems(order.id));
}

function allOrderEvents(orders: Order[]) {
  return orders.flatMap((order) => getOrderEvents(order.id));
}

function resolveOrderCustomer(order: Order, index: number) {
  const email = order.customer_email || `guest-${index + 1}@prime-os.local`;
  return {
    id: `cust_${email.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
    name: order.customer_name || `Customer ${index + 1}`,
    email,
    company: index % 2 === 0 ? 'Kansai Office Supply' : 'Tokyo Creative Studio',
  };
}

function buildCampaigns(products: Product[], orders: Order[], inventoryPositions: InventoryPosition[]): PrimeCampaign[] {
  const productSet = products.length > 0 ? products.slice(0, 4) : [];
  const revenue = sumOrderRevenue(orders);

  return productSet.map((product, index) => {
    const sku = getPrimarySku(product);
    const skuAts = getTotalATS(sku.id);
    const linkedOrders = orders.filter((order) => {
      const items = getOrderItems(order.id);
      return items.some((item) => item.sku === sku.sku_code || item.sku === sku.id);
    });
    const inventoryWeight = inventoryPositions.filter((position) => position.product_id === product.id).length;

    return {
      id: `cmp_${index + 1}_${product.id}`,
      name: [
        'JP Stationery Spring Push',
        'Marketplace B2B Trial',
        'Creator Desk Bundle',
        'Office Replenishment Loop',
      ][index] || `${product.category} growth campaign`,
      channel: ['Rakuten + Website', 'LinkedIn + RFQ', 'TikTok + Amazon', 'Email + Retargeting'][index] || 'Website',
      status: index === 2 ? 'testing' : 'active',
      productId: product.id,
      skuId: sku.id,
      skuCode: sku.sku_code,
      traffic: 8400 + index * 3100 + inventoryWeight * 120,
      leads: 48 + index * 16,
      rfqs: 7 + index * 3,
      orders: Math.max(linkedOrders.length, 2 + index),
      spend: 220000 + index * 85000,
      revenue: currency(Math.max(revenue / Math.max(productSet.length, 1), product.retail_price * Math.max(8, skuAts / 6))),
      targetSegment: ['B2B office teams', 'SME procurement', 'Creator resellers', 'Repeat replenishment'][index] || 'Commerce buyers',
    };
  });
}

function buildCustomers(orders: Order[], campaigns: PrimeCampaign[]): PrimeCustomer[] {
  const customerMap = new Map<string, PrimeCustomer>();

  orders.forEach((order, index) => {
    const identity = resolveOrderCustomer(order, index);
    const existing = customerMap.get(identity.email);
    const eventMessages = getOrderEvents(order.id).slice(0, 3).map((event) => `${event.event_type}: ${event.message}`);

    if (existing) {
      existing.totalOrders += 1;
      existing.totalRevenue += order.total_amount || 0;
      existing.lastOrderId = order.id;
      existing.timeline.push(`Order ${order.order_id} moved to ${order.lifecycle_stage}`);
      existing.timeline.push(...eventMessages);
      return;
    }

    customerMap.set(identity.email, {
      id: identity.id,
      name: identity.name,
      company: identity.company,
      email: identity.email,
      segment: index % 3 === 0 ? 'B2B replenishment' : index % 3 === 1 ? 'Marketplace buyer' : 'Creator commerce',
      lifecycle: order.status === 'returned' ? 'at-risk' : order.status === 'completed' ? 'retention' : 'active',
      totalOrders: 1,
      totalRevenue: order.total_amount || 0,
      lastOrderId: order.id,
      b2bAccount: `ACC-${String(index + 1).padStart(3, '0')}`,
      notes: [
        `Prefers ${order.shipping_method || 'standard'} shipping`,
        campaigns[index % Math.max(campaigns.length, 1)] ? `Touched by ${campaigns[index % campaigns.length].name}` : 'Created from COS order context',
      ],
      timeline: [
        `Captured from OMS order ${order.order_id}`,
        `Lifecycle: ${order.lifecycle_stage}`,
        ...eventMessages,
      ],
    });
  });

  campaigns.slice(0, 3).forEach((campaign, index) => {
    const email = `lead-${index + 1}@prime-os.local`;
    if (customerMap.has(email)) return;

    customerMap.set(email, {
      id: `cust_prime_lead_${index + 1}`,
      name: ['Mina Sato', 'Kenji Mori', 'Aiko Tanaka'][index] || `Prime Lead ${index + 1}`,
      company: ['Nihon Office Lab', 'Kobe Design Co.', 'Kyoto Edu Supply'][index] || 'Prime Prospect',
      email,
      segment: campaign.targetSegment,
      lifecycle: 'lead',
      totalOrders: 0,
      totalRevenue: 0,
      lastOrderId: null,
      b2bAccount: `LEAD-${String(index + 1).padStart(3, '0')}`,
      notes: [`Interested in SKU ${campaign.skuCode}`, `Source campaign: ${campaign.name}`],
      timeline: [`Lead captured from ${campaign.channel}`, 'Awaiting qualification for RFQ'],
    });
  });

  return Array.from(customerMap.values()).slice(0, 8);
}

function buildLeads(campaigns: PrimeCampaign[], customers: PrimeCustomer[]): PrimeLead[] {
  return campaigns.flatMap((campaign, campaignIndex) => {
    const leadCustomers = customers.slice(campaignIndex, campaignIndex + 2);
    return leadCustomers.map((customer, leadIndex) => ({
      id: `lead_${campaignIndex + 1}_${leadIndex + 1}`,
      campaignId: campaign.id,
      customerId: customer.id,
      company: customer.company,
      contact: customer.name,
      email: customer.email,
      score: Math.min(98, 62 + campaignIndex * 7 + leadIndex * 9),
      status: leadIndex === 0 ? 'qualified' : campaignIndex % 2 === 0 ? 'rfq_sent' : 'new',
      source: campaign.channel,
      productId: campaign.productId,
      skuId: campaign.skuId,
      lastTouch: leadIndex === 0 ? 'RFQ intent submitted' : 'Pricing page visit',
    }));
  });
}

function buildRfqs(leads: PrimeLead[], orders: Order[], orderItems: OrderItem[]): PrimeRfq[] {
  return leads.slice(0, 6).map((lead, index) => {
    const order = orders[index % Math.max(orders.length, 1)];
    const firstItem = order ? orderItems.find((item) => item.order_id === order.id) : undefined;
    const converted = index % 3 === 0 && Boolean(order);

    return {
      id: `rfq_${String(index + 1).padStart(3, '0')}`,
      leadId: lead.id,
      customerId: lead.customerId,
      orderId: converted ? order.id : null,
      skuId: lead.skuId,
      quantity: firstItem?.quantity ? Math.max(firstItem.quantity * 4, 12 + index * 3) : 12 + index * 3,
      value: currency((firstItem?.price_per_unit || 2800) * (12 + index * 3)),
      status: converted ? 'converted' : index % 2 === 0 ? 'quoted' : 'draft',
      requestedBy: lead.company,
    };
  });
}

function buildTickets(customers: PrimeCustomer[], orders: Order[]): PrimeTicket[] {
  const returns = getReturns();
  const returnTickets = returns.slice(0, 5).map((item, index) => {
    const order = orders.find((candidate) => candidate.id === item.order_id) || orders[index % Math.max(orders.length, 1)];
    const customer = customers.find((candidate) => candidate.lastOrderId === order?.id) || customers[index % Math.max(customers.length, 1)];

    return {
      id: `case_${item.id}`,
      customerId: customer?.id || `cust_case_${index + 1}`,
      orderId: order?.id || item.order_id,
      rmaId: item.id,
      subject: item.reason || `Return review for ${item.rma_number || item.id}`,
      status: item.status === 'completed' ? 'resolved' : item.status === 'qc' ? 'waiting_ops' : 'open',
      priority: item.status === 'authorized' || item.status === 'qc' ? 'high' : 'normal',
      sla: item.status === 'completed' ? 'Closed' : '24h resolution target',
      linkedEntity: item.rma_number || item.id,
    } satisfies PrimeTicket;
  });

  const activeOrder = orders.find((order) => order.status === 'shipping' || order.status === 'ready_to_ship') || orders[0];
  const activeCustomer = customers.find((customer) => customer.lastOrderId === activeOrder?.id) || customers[0];
  const manualTicket: PrimeTicket = {
    id: 'case_ops_001',
    customerId: activeCustomer?.id || 'cust_ops_001',
    orderId: activeOrder?.id || null,
    rmaId: null,
    subject: 'Shipment ETA clarification requested by B2B buyer',
    status: 'waiting_ops',
    priority: 'normal',
    sla: 'Respond before next business day',
    linkedEntity: activeOrder?.order_id || 'OMS order',
  };

  return [manualTicket, ...returnTickets].slice(0, 6);
}

function buildVocInsights(products: Product[], customers: PrimeCustomer[], campaigns: PrimeCampaign[], tickets: PrimeTicket[]): PrimeVocInsight[] {
  return products.slice(0, 4).map((product, index) => {
    const customer = customers[index % Math.max(customers.length, 1)];
    const campaign = campaigns[index % Math.max(campaigns.length, 1)];
    const ticket = tickets[index % Math.max(tickets.length, 1)];

    return {
      id: `voc_${index + 1}_${product.id}`,
      source: ['Social comment', 'Service ticket', 'Campaign reply', 'Marketplace review'][index] || 'VOC',
      sentiment: index === 1 ? 'negative' : index === 2 ? 'neutral' : 'positive',
      productId: product.id,
      customerId: customer?.id || `cust_voc_${index + 1}`,
      campaignId: campaign?.id || `cmp_voc_${index + 1}`,
      summary: [
        `${product.name} is resonating with office buyers because the craft-paper proof is concrete.`,
        `${ticket?.subject || 'Return issue'} creates a trust objection that should be addressed in content.`,
        `Buyers ask for bulk pricing clarity before submitting RFQ for ${product.category}.`,
        `${product.brand} reviews mention packaging quality as a conversion lever.`,
      ][index] || `VOC signal for ${product.name}`,
      action: [
        'Promote product proof in Campaign Tower.',
        'Create service recovery follow-up in CRM Compact.',
        'Expose RFQ pricing threshold in Commerce Surface.',
        'Feed packaging proof into retargeting creative.',
      ][index] || 'Route insight to AI Operator.',
    };
  });
}

function buildForecasts(products: Product[], campaigns: PrimeCampaign[]): PrimeForecast[] {
  return products.slice(0, 5).map((product, index) => {
    const sku = getPrimarySku(product);
    const ats = getTotalATS(sku.id);
    const campaign = campaigns.find((item) => item.productId === product.id);
    const demand7d = Math.max(12, Math.round((campaign?.leads || 20) * 0.35 + (campaign?.orders || 2) * 2));
    const risk = ats < demand7d ? 'high' : ats < demand7d * 2 ? 'medium' : 'low';

    return {
      id: `forecast_${product.id}`,
      skuId: sku.id,
      skuCode: sku.sku_code,
      demand7d,
      ats,
      risk,
      suggestedAction: risk === 'high'
        ? 'Throttle acquisition and trigger replenishment review'
        : risk === 'medium'
          ? 'Keep campaign active but watch ATS daily'
          : 'Increase retargeting budget on this SKU',
    };
  });
}

function buildSocialStreams(campaigns: PrimeCampaign[], vocInsights: PrimeVocInsight[]): PrimeSocialStream[] {
  const totalCampaignTraffic = campaigns.reduce((sum, campaign) => sum + campaign.traffic, 0);

  return [
    {
      id: 'stream_tiktok_live',
      source: 'TikTok / livestream comments',
      ingestionMode: 'crawler',
      eventVolume: Math.round(totalCampaignTraffic * 0.22),
      freshnessMinutes: 3,
      audienceSignal: 'Comment burst around bundle discount and host trust cues.',
      status: 'healthy',
    },
    {
      id: 'stream_instagram_reels',
      source: 'Instagram / creator reels',
      ingestionMode: 'api',
      eventVolume: Math.round(totalCampaignTraffic * 0.16),
      freshnessMinutes: 8,
      audienceSignal: 'Save and share rate strongest for office setup and productivity proof.',
      status: 'healthy',
    },
    {
      id: 'stream_youtube_reviews',
      source: 'YouTube / review transcripts',
      ingestionMode: 'crawler',
      eventVolume: 1480 + vocInsights.length * 120,
      freshnessMinutes: 22,
      audienceSignal: 'Long-form reviews mention packaging quality and refill convenience.',
      status: 'watch',
    },
    {
      id: 'stream_chat_commerce',
      source: 'Mail / LINE / Zalo / chat commerce',
      ingestionMode: 'partner-feed',
      eventVolume: 920 + campaigns.length * 80,
      freshnessMinutes: 6,
      audienceSignal: 'High reply intent from repeat buyers after refill reminder and staff follow-up.',
      status: 'healthy',
    },
  ];
}

function buildInsightModels(campaigns: PrimeCampaign[], forecasts: PrimeForecast[]): PrimeInsightModel[] {
  const topCampaign = campaigns[0];
  const highRiskForecast = forecasts.find((forecast) => forecast.risk === 'high') || forecasts[0];

  return [
    {
      id: 'model_persona_graph',
      name: 'Audience Persona Graph',
      objective: 'Cluster buyer intent from social profile, content interaction, and order evidence.',
      inputSignal: 'Clicks, comments, saves, RFQ intent, order lifecycle',
      outputSignal: 'Segment tags for creator commerce, refill buyers, and B2B replenishment',
      confidence: 84,
      retrainCadence: 'Nightly feature refresh + weekly model retrain',
    },
    {
      id: 'model_kol_livestream',
      name: 'KOL Livestream Conversion Propensity',
      objective: 'Predict which host-script-offer combination will trigger add-to-cart or RFQ intent.',
      inputSignal: `Livestream hook, comment speed, host trust signal, ${topCampaign?.channel || 'campaign'} attribution`,
      outputSignal: 'Recommended host angle, discount window, and SKU bundle priority',
      confidence: 79,
      retrainCadence: 'Per campaign flight + after major livestream events',
    },
    {
      id: 'model_stock_marketing',
      name: 'Demand-to-Stock Pressure Model',
      objective: 'Prevent marketing from scaling SKUs that inventory cannot support.',
      inputSignal: `${highRiskForecast?.skuCode || 'SKU'} ATS, demand spikes, campaign velocity`,
      outputSignal: 'Throttle / expand promotion recommendation',
      confidence: 88,
      retrainCadence: 'Hourly scoring on streaming demand features',
    },
  ];
}

function buildActivationPlays(customers: PrimeCustomer[], campaigns: PrimeCampaign[], vocInsights: PrimeVocInsight[]): PrimeActivationPlay[] {
  const creatorCustomer = customers.find((customer) => customer.segment.includes('Creator')) || customers[0];
  const b2bCustomer = customers.find((customer) => customer.segment.includes('B2B')) || customers[1] || customers[0];
  const voc = vocInsights[0];

  return [
    {
      id: 'play_kol_refill',
      trigger: 'Livestream comment spike around refill convenience + bundle price acceptance',
      audience: creatorCustomer?.segment || 'Creator commerce',
      channelMix: ['TikTok DM', 'Email follow-up', 'Retargeting audience refresh'],
      nextBestAction: 'Push refill bundle recommendation with creator-proof clip and limited incentive window.',
      projectedLift: 18,
    },
    {
      id: 'play_b2b_quote',
      trigger: 'Repeated office procurement visits with quote-page dwell and service inquiry',
      audience: b2bCustomer?.segment || 'B2B replenishment',
      channelMix: ['Email', 'Sales chat queue', 'LinkedIn matched audience'],
      nextBestAction: 'Send quote-ready product set with MOQ explanation and fast RFQ CTA.',
      projectedLift: 14,
    },
    {
      id: 'play_voc_recovery',
      trigger: voc?.summary || 'Negative signal detected in service/social layer',
      audience: 'At-risk recent buyers',
      channelMix: ['LINE / Zalo', 'Customer care mail', 'Suppression from hard conversion ads'],
      nextBestAction: 'Route service-led recovery message first, then reintroduce offer after trust signal improves.',
      projectedLift: 11,
    },
  ];
}

function buildRecommendations(forecasts: PrimeForecast[], tickets: PrimeTicket[], campaigns: PrimeCampaign[]): PrimeRecommendation[] {
  const riskyForecast = forecasts.find((forecast) => forecast.risk === 'high') || forecasts[0];
  const urgentTicket = tickets.find((ticket) => ticket.priority === 'high') || tickets[0];
  const campaign = campaigns[0];

  return [
    {
      id: 'rec_inventory_001',
      operator: 'AI Operator',
      target: riskyForecast ? `SKU ${riskyForecast.skuCode}` : 'Inventory Brain',
      reasoning: riskyForecast
        ? `7-day demand ${riskyForecast.demand7d} is close to ATS ${riskyForecast.ats}.`
        : 'Inventory signal unavailable, keep COS as source of truth.',
      action: riskyForecast?.suggestedAction || 'Review inventory positions before campaign scale-up',
      confidence: riskyForecast?.risk === 'high' ? 86 : 72,
    },
    {
      id: 'rec_service_001',
      operator: 'AI Operator',
      target: urgentTicket ? urgentTicket.linkedEntity : 'Service queue',
      reasoning: urgentTicket ? `${urgentTicket.subject} is linked to customer timeline and COS order context.` : 'No urgent ticket found.',
      action: 'Open Service Tower, resolve issue, and update CRM Compact timeline',
      confidence: 82,
    },
    {
      id: 'rec_campaign_001',
      operator: 'AI Operator',
      target: campaign ? campaign.name : 'Campaign Tower',
      reasoning: campaign ? `${campaign.orders} orders and ${campaign.rfqs} RFQs are traceable to COS execution.` : 'Campaign proof is not linked yet.',
      action: 'Shift spend toward RFQ-converting channel and suppress low-ATS SKU variants',
      confidence: 78,
    },
  ];
}

function buildAlerts(forecasts: PrimeForecast[], tickets: PrimeTicket[], recommendations: PrimeRecommendation[]): PrimeAlert[] {
  const riskyForecast = forecasts.find((forecast) => forecast.risk !== 'low') || forecasts[0];
  const urgentTicket = tickets.find((ticket) => ticket.priority === 'high') || tickets[0];

  return [
    {
      id: 'alert_inventory_001',
      area: 'Ecom Area',
      severity: riskyForecast?.risk === 'high' ? 'high' : 'medium',
      title: riskyForecast ? `ATS pressure on ${riskyForecast.skuCode}` : 'Inventory pressure needs COS review',
      linkedEntity: riskyForecast?.skuId || 'Inventory Brain',
      recommendationId: recommendations[0]?.id || 'rec_inventory_001',
    },
    {
      id: 'alert_service_001',
      area: 'Customer Area',
      severity: urgentTicket?.priority === 'high' ? 'high' : 'medium',
      title: urgentTicket ? `SLA attention: ${urgentTicket.subject}` : 'Service SLA attention',
      linkedEntity: urgentTicket?.id || 'Service queue',
      recommendationId: recommendations[1]?.id || 'rec_service_001',
    },
    {
      id: 'alert_campaign_001',
      area: 'Demand Area',
      severity: 'medium',
      title: 'Campaign should inherit inventory and VOC guardrails',
      linkedEntity: 'Campaign Tower',
      recommendationId: recommendations[2]?.id || 'rec_campaign_001',
    },
  ];
}

function buildDemoFlows(): PrimeDemoFlow[] {
  return [
    {
      id: 'flow_1',
      name: 'Campaign to CRM Compact',
      path: ['Campaign', 'Traffic', 'Lead Capture', 'CRM Compact'],
      stateChange: 'Campaign click becomes qualified lead with customer identity.',
      proofPoint: 'Demand creates opportunity and Customer retains context.',
    },
    {
      id: 'flow_2',
      name: 'Lead to RFQ',
      path: ['Lead', 'Qualification', 'B2B Extension', 'RFQ'],
      stateChange: 'Qualified lead receives B2B account context and RFQ record.',
      proofPoint: 'CRM Compact is not split into enterprise CRM towers.',
    },
    {
      id: 'flow_3',
      name: 'RFQ to OMS',
      path: ['RFQ', 'Assisted Commerce', 'Order Created', 'OMS'],
      stateChange: 'Converted RFQ points to real COS order id.',
      proofPoint: 'Commerce Surface hands execution to COS.',
    },
    {
      id: 'flow_4',
      name: 'Order to Fulfillment',
      path: ['OMS', 'Inventory Reservation', 'Orchestration', 'Fulfillment', 'Shipment'],
      stateChange: 'Order lifecycle reaches warehouse allocation, job, and shipment tracking.',
      proofPoint: 'COS is the control core.',
    },
    {
      id: 'flow_5',
      name: 'Issue to Timeline',
      path: ['Order Issue', 'Service Ticket', 'RMA', 'Resolution', 'Customer Timeline'],
      stateChange: 'Return/service case updates CRM Compact context.',
      proofPoint: 'Customer context is retained after sale.',
    },
    {
      id: 'flow_6',
      name: 'Intelligence to Action',
      path: ['VOC', 'Analytics', 'Attribution', 'Forecast', 'AI Recommendation', 'Alert'],
      stateChange: 'AI Operator routes a linked recommendation to campaign, follow-up, or ops alert.',
      proofPoint: 'Intelligence learns and optimizes around COS context.',
    },
  ];
}

export function getPrimeSnapshot(): PrimeSnapshot {
  const products = getProducts();
  const orders = getOrders();
  const orderItems = allOrderItems(orders);
  const orderEvents = allOrderEvents(orders);
  const inventoryPositions = getInventoryPositions();
  const campaigns = buildCampaigns(products, orders, inventoryPositions);
  const customers = buildCustomers(orders, campaigns);
  const leads = buildLeads(campaigns, customers);
  const rfqs = buildRfqs(leads, orders, orderItems);
  const tickets = buildTickets(customers, orders);
  const vocInsights = buildVocInsights(products, customers, campaigns, tickets);
  const forecasts = buildForecasts(products, campaigns);
  const socialStreams = buildSocialStreams(campaigns, vocInsights);
  const insightModels = buildInsightModels(campaigns, forecasts);
  const activationPlays = buildActivationPlays(customers, campaigns, vocInsights);
  const recommendations = buildRecommendations(forecasts, tickets, campaigns);
  const alerts = buildAlerts(forecasts, tickets, recommendations);
  const fulfillmentJobs = getFulfillmentJobs();
  const shipments = fulfillmentJobs.flatMap((job) => getShipmentsByJobId(job.id));
  const trackingEvents = shipments.flatMap((shipment) => getTrackingEventsByShipmentId(shipment.id));
  const opportunityValue = rfqs.reduce((sum, rfq) => sum + rfq.value, 0);
  const convertedLeads = leads.filter((lead) => lead.status === 'converted' || rfqs.some((rfq) => rfq.leadId === lead.id && rfq.status === 'converted')).length;
  const leadToOrderRate = leads.length ? Math.round((convertedLeads / leads.length) * 100) : 0;

  return {
    products,
    orders,
    orderItems,
    orderEvents,
    inventoryPositions,
    listingsCount: getListings().length,
    warehousesCount: getWarehouses().length,
    fulfillmentJobsCount: fulfillmentJobs.length,
    shipmentsCount: shipments.length,
    trackingEventsCount: trackingEvents.length,
    returnsCount: getReturns().length,
    campaigns,
    leads,
    rfqs,
    customers,
    tickets,
    vocInsights,
    alerts,
    recommendations,
    forecasts,
    socialStreams,
    insightModels,
    activationPlays,
    demoFlows: buildDemoFlows(),
    metrics: {
      revenue: currency(sumOrderRevenue(orders)),
      opportunityValue: currency(opportunityValue),
      leadToOrderRate,
      openIssues: tickets.filter((ticket) => ticket.status !== 'resolved').length,
      highRiskAlerts: alerts.filter((alert) => alert.severity === 'high').length,
      cosStrength: Math.round(((products.length > 0 ? 1 : 0) + (orders.length > 0 ? 1 : 0) + (inventoryPositions.length > 0 ? 1 : 0) + (fulfillmentJobs.length > 0 ? 1 : 0)) * 25),
    },
  };
}

export function getSkuLabel(skuId: string) {
  const resolved = getResolvedProductSkuById(skuId);
  return resolved ? `${resolved.sku.sku_code} · ${resolved.product.name}` : skuId;
}
