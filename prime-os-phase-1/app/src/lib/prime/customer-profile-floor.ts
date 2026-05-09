import type { PrimeSnapshot } from '@/lib/prime/prime-data';

export type CustomerType = 'b2b' | 'marketplace' | 'distributor' | 'creator';
export type CustomerLifecycle = 'lead' | 'prospect' | 'active' | 'retention' | 'at_risk' | 'inactive';
export type AccountStatus = 'active' | 'watch' | 'archived';
export type ContactRole = 'decision_maker' | 'buyer' | 'finance' | 'ops' | 'support' | 'other';
export type PreferredChannel = 'email' | 'phone' | 'line' | 'zalo' | 'whatsapp';

export type CustomerOwner = {
  id: string;
  name: string;
  role: string;
};

export type CustomerTag = {
  id: string;
  label: string;
  category: 'segment' | 'lifecycle' | 'risk' | 'channel' | 'priority';
  colorClass: string;
  usage: string;
};

export type CustomerAccount = {
  id: string;
  accountCode: string;
  companyName: string;
  displayName: string;
  customerType: CustomerType;
  lifecycle: CustomerLifecycle;
  status: AccountStatus;
  ownerId: string;
  tags: string[];
  primaryEmail: string;
  website: string;
  industry: string;
  country: string;
  source: string;
  revenue: number;
  orderCount: number;
  identityCompleteness: number;
  notes: string[];
  lifecycleStage: CustomerLifecycleStage;
  timelineEvents: CustomerTimelineEvent[];
  followUps: CustomerFollowUp[];
  rfqQuoteLinks: CustomerRFQQuoteLink[];
  serviceCases: CustomerServiceCase[];
  profile?: CustomerAccountProfile;
};

export type CustomerAccountProfile = {
  avatarUrl: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  shippingAddress: string;
  location: string;
  city: string;
  prefecture: string;
  postalCode: string;
  country: string;
  segmentLabel: string;
  profileSummary: string;
  buyingIntent: string;
  primaryEcomChannel: string;
  channelMix: string[];
  channelOrderRef: string | null;
  preferredShipping: string;
  acquisitionSource: string;
  sourceCampaignName: string;
  sourceCampaignChannel: string;
  lastOrderId: string | null;
  lastOrderStatus: string;
  lastLifecycleStage: string;
  lastOrderDate: string;
  lastOrderValue: number;
  lastOrderCurrency: string;
  subtotalValue: number;
  shippingValue: number;
  discountValue: number;
  trackingNumber: string | null;
  warehouseId: string | null;
  averageOrderValue: number;
  totalUnits: number;
  favoriteProducts: CustomerProductAffinity[];
  recentOrders: CustomerRecentOrder[];
  recentEvents: CustomerRecentEvent[];
  timeline: string[];
  riskSignal: string;
  riskFlags: string[];
  serviceCaseCount: number;
  openServiceCaseCount: number;
  latestServiceCase: string;
  cosReadiness: string;
};

export type CustomerProductAffinity = {
  productName: string;
  sku: string;
  quantity: number;
  revenue: number;
};

export type CustomerRecentOrder = {
  orderNumber: string;
  channel: string;
  status: string;
  lifecycleStage: string;
  total: number;
  currency: string;
  orderDate: string;
  trackingNumber: string | null;
};

export type CustomerRecentEvent = {
  eventType: string;
  message: string;
  actorType: string;
  createdAt: string;
};

export type CustomerSourceOwner = 'Customer' | 'Customer Service' | 'Demand' | 'Ecom/COS' | 'Finance' | 'Intelligence';

export type CustomerTimelineEventType =
  | 'customer_memory'
  | 'lead'
  | 'rfq'
  | 'order'
  | 'order_event'
  | 'service_case'
  | 'return_refund'
  | 'finance_signal'
  | 'intelligence_signal'
  | 'follow_up';

export type CustomerTimelineEvent = {
  id: string;
  customerId: string;
  sourceOfTruthOwner: CustomerSourceOwner;
  readModelOwner: 'Customer';
  sourceEntityType: 'customer' | 'lead' | 'rfq' | 'order' | 'order_event' | 'service_case' | 'return' | 'finance_profile' | 'intelligence_signal' | 'follow_up';
  sourceEntityId: string;
  occurredAt: string;
  eventType: CustomerTimelineEventType;
  summary: string;
  ownerId: string;
  nextAction: string;
  businessImpact: string;
  href?: string;
  auditId?: string;
};

export type CustomerLifecycleStage = {
  customerId: string;
  stage: CustomerLifecycle;
  ownerId: string;
  nextAction: string;
  reason: string;
  updatedAt: string;
  sourceOfTruthOwner: 'Customer';
  readModelOwner: 'Customer';
};

export type CustomerFollowUp = {
  id: string;
  customerId: string;
  ownerId: string;
  status: 'open' | 'waiting' | 'blocked' | 'done';
  priority: 'normal' | 'high';
  dueAt: string;
  sourceOfTruthOwner: 'Customer';
  readModelOwner: 'Customer';
  source: CustomerSourceOwner;
  sourceEntityId: string;
  allowedAction: string;
  humanApprovalBoundary: string;
  nextAction: string;
  businessImpact: string;
  href?: string;
};

export type CustomerRFQQuoteLink = {
  id: string;
  customerId: string;
  leadId: string | null;
  rfqId: string | null;
  orderId: string | null;
  skuId: string | null;
  status: 'new' | 'qualified' | 'rfq_sent' | 'draft' | 'quoted' | 'converted';
  quantity: number | null;
  value: number | null;
  sourceOfTruthOwner: 'Demand';
  readModelOwner: 'Customer';
  handoff: string;
  href: string;
};

export type CustomerServiceCase = {
  id: string;
  customerId: string;
  orderId: string | null;
  rmaId: string | null;
  status: 'open' | 'waiting_ops' | 'resolved';
  priority: 'normal' | 'high';
  sla: string;
  ownerId: string;
  pendingAction: string;
  sourceOfTruthOwner: 'Customer Service';
  readModelOwner: 'Customer';
  linkedEntity: string;
  intelligenceHandoff: string;
  href: string;
};

export type CustomerContact = {
  id: string;
  accountId: string;
  fullName: string;
  title: string;
  role: ContactRole;
  email: string;
  phone: string;
  preferredChannel: PreferredChannel;
  isPrimary: boolean;
};

export type IdentityMatch = {
  id: string;
  entityType: 'account' | 'contact';
  entityId: string;
  candidateId: string;
  confidence: number;
  reasons: string[];
  suggestion: 'review' | 'possible_merge' | 'ignore';
};

export type FutureModulePlaceholder = {
  id: string;
  label: string;
  owner: 'Demand' | 'CRM' | 'Ecom/COS' | 'Intelligence' | 'Finance';
  status: 'not_connected' | 'read_only_later';
  detail: string;
};

export type CustomerProfileFloor = {
  accounts: CustomerAccount[];
  contacts: CustomerContact[];
  owners: CustomerOwner[];
  tags: CustomerTag[];
  matches: IdentityMatch[];
  futureModules: FutureModulePlaceholder[];
};

export type CustomerAccountFilters = {
  query: string;
  tagId: string;
  ownerId: string;
  lifecycle: string;
  customerType: string;
};

const owners: CustomerOwner[] = [
  { id: 'owner-hana', name: 'Hana Lee', role: 'Customer owner' },
  { id: 'owner-daisuke', name: 'Daisuke Ito', role: 'B2B account owner' },
  { id: 'owner-mika', name: 'Mika Sato', role: 'Retention owner' },
  { id: 'owner-ken', name: 'Ken Mori', role: 'Service liaison' },
  { id: 'owner-aiko', name: 'Aiko Tanaka', role: 'Marketplace owner' },
];

export const customerTags: CustomerTag[] = [
  { id: 'tag-b2b-replenishment', label: 'B2B replenishment', category: 'segment', colorClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200', usage: 'Repeat stock or office supply buying pattern.' },
  { id: 'tag-marketplace-buyer', label: 'Marketplace buyer', category: 'channel', colorClass: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200', usage: 'Individual or marketplace-origin buyer seeded from COS order customer identity.' },
  { id: 'tag-creator-commerce', label: 'Creator commerce', category: 'segment', colorClass: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200', usage: 'Influenced by creator or social proof.' },
  { id: 'tag-service-watch', label: 'Service watch', category: 'risk', colorClass: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200', usage: 'Service issue should be checked before outreach.' },
  { id: 'tag-high-value', label: 'High value', category: 'priority', colorClass: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-200', usage: 'High revenue or strategic account.' },
  { id: 'tag-identity-review', label: 'Identity review', category: 'risk', colorClass: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200', usage: 'Potential duplicate or incomplete identity.' },
];

const futureModules: FutureModulePlaceholder[] = [
  { id: 'lead-inquiry-rfq', label: 'Lead / Inquiry / RFQ', owner: 'Demand', status: 'not_connected', detail: 'Will attach qualified intent after Demand capture is ready.' },
  { id: 'deal-pipeline', label: 'Deal Pipeline', owner: 'CRM', status: 'not_connected', detail: 'Reserved for later opportunity workflow.' },
  { id: 'quote', label: 'Quote', owner: 'CRM', status: 'not_connected', detail: 'Reserved for quote creation and revision history.' },
  { id: 'order-history', label: 'Order History', owner: 'Ecom/COS', status: 'read_only_later', detail: 'Will read OMS order history without owning order state.' },
  { id: 'customer-timeline', label: 'Customer Timeline', owner: 'CRM', status: 'not_connected', detail: 'Will unify events after identity foundation is stable.' },
  { id: 'intelligence', label: 'Intelligence Signals', owner: 'Intelligence', status: 'read_only_later', detail: 'Will show model/readback signals from Intelligence Area.' },
  { id: 'finance', label: 'Finance Context', owner: 'Finance', status: 'read_only_later', detail: 'Will show finance health only after Finance contract exists.' },
  { id: 'cos-context', label: 'COS Context', owner: 'Ecom/COS', status: 'read_only_later', detail: 'Will show product/order context without moving COS truth here.' },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDomain(value: string) {
  const domain = value.includes('@') ? value.split('@')[1] : value.replace(/^https?:\/\//, '').replace(/^www\./, '');
  return domain.toLowerCase().split('/')[0];
}

const sharedEmailDomains = new Set([
  'gmail.com',
  'googlemail.com',
  'icloud.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'prime-os.local',
  'example.sg',
  'example.cn',
  'example.vn',
  'example.jp',
  'example.tw',
]);

function lifecycleFromPrime(value: string): CustomerLifecycle {
  if (value === 'at-risk') return 'at_risk';
  if (value === 'retention') return 'retention';
  if (value === 'lead') return 'lead';
  return 'active';
}

function typeFromSegment(segment: string): CustomerType {
  const normalized = segment.toLowerCase();
  if (normalized.includes('b2b')) return 'b2b';
  if (normalized.includes('b2c') || normalized.includes('consumer') || normalized.includes('direct buyer') || normalized.includes('marketplace')) return 'marketplace';
  if (normalized.includes('creator')) return 'creator';
  return 'marketplace';
}

function tagIdsForAccount(segment: string, lifecycle: CustomerLifecycle, revenue: number) {
  const normalized = segment.toLowerCase();
  const tags = new Set<string>();

  if (normalized.includes('b2c') || normalized.includes('consumer') || normalized.includes('direct buyer')) tags.add('tag-marketplace-buyer');
  if (normalized.includes('b2b')) tags.add('tag-b2b-replenishment');
  if (normalized.includes('marketplace')) tags.add('tag-marketplace-buyer');
  if (normalized.includes('creator')) tags.add('tag-creator-commerce');
  if (lifecycle === 'at_risk') tags.add('tag-service-watch');
  if (revenue >= 400000) tags.add('tag-high-value');

  return Array.from(tags);
}

function seededWebsite(company: string, index: number) {
  const slug = normalize(company).slice(0, 24) || `account${index + 1}`;
  return `https://${slug}-${index + 1}.example`;
}

function latestOrder<T extends PrimeSnapshot['orders'][number]>(orders: T[]) {
  return [...orders].sort((a, b) => Date.parse(b.order_date || b.created_at) - Date.parse(a.order_date || a.created_at))[0];
}

function getCustomerOrders(snapshot: PrimeSnapshot, customer: PrimeSnapshot['customers'][number]) {
  const email = customer.email.toLowerCase();
  return snapshot.orders.filter((order) => {
    const orderEmail = (order.customer_email || '').toLowerCase();
    return orderEmail === email || order.customer_name === customer.name || order.id === customer.lastOrderId;
  });
}

function getOrderItems(snapshot: PrimeSnapshot, orderIds: Set<string>) {
  return snapshot.orderItems.filter((item) => orderIds.has(item.order_id));
}

function getOrderEvents(snapshot: PrimeSnapshot, orderIds: Set<string>) {
  return snapshot.orderEvents
    .filter((event) => orderIds.has(event.order_id))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function mostCommon(values: string[], fallback: string) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
}

function channelLabel(value: string) {
  const labels: Record<string, string> = {
    amazon: 'Amazon',
    rakuten: 'Rakuten',
    shopee: 'Shopee',
    manual: 'Manual / offline',
  };
  return labels[value] || value || 'Unknown channel';
}

function avatarUrlForCustomer(customer: PrimeSnapshot['customers'][number]) {
  const seed = encodeURIComponent(customer.email || customer.name);
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function topProducts(items: PrimeSnapshot['orderItems']): CustomerProductAffinity[] {
  const products = new Map<string, CustomerProductAffinity>();

  items.forEach((item) => {
    const key = `${item.product_name}-${item.sku}`;
    const existing = products.get(key) || {
      productName: item.product_name,
      sku: item.sku,
      quantity: 0,
      revenue: 0,
    };

    products.set(key, {
      ...existing,
      quantity: existing.quantity + item.quantity,
      revenue: existing.revenue + item.quantity * item.price_per_unit,
    });
  });

  return [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 4);
}

function phase2Date(index: number, offset: number) {
  return `2026-05-${String(Math.min(28, 2 + index + offset)).padStart(2, '0')}T09:00:00.000Z`;
}

function buildLifecycleStage({
  customer,
  lifecycle,
  ownerId,
  serviceCases,
  rfq,
  index,
}: {
  customer: PrimeSnapshot['customers'][number];
  lifecycle: CustomerLifecycle;
  ownerId: string;
  serviceCases: PrimeSnapshot['tickets'];
  rfq: PrimeSnapshot['rfqs'][number] | undefined;
  index: number;
}): CustomerLifecycleStage {
  const openServiceCase = serviceCases.find((ticket) => ticket.status !== 'resolved');

  if (openServiceCase) {
    return {
      customerId: customer.id,
      stage: 'at_risk',
      ownerId,
      nextAction: 'Resolve service blocker before the next commercial touch.',
      reason: `${openServiceCase.subject} is still ${openServiceCase.status.replace('_', ' ')}.`,
      updatedAt: phase2Date(index, 4),
      sourceOfTruthOwner: 'Customer',
      readModelOwner: 'Customer',
    };
  }

  if (rfq && rfq.status !== 'converted') {
    return {
      customerId: customer.id,
      stage: lifecycle === 'lead' ? 'prospect' : lifecycle,
      ownerId,
      nextAction: 'Review RFQ status and confirm the quote-to-order route.',
      reason: `RFQ ${rfq.id} is ${rfq.status}.`,
      updatedAt: phase2Date(index, 3),
      sourceOfTruthOwner: 'Customer',
      readModelOwner: 'Customer',
    };
  }

  if (lifecycle === 'lead') {
    return {
      customerId: customer.id,
      stage: lifecycle,
      ownerId,
      nextAction: 'Qualify the lead and assign the first account follow-up.',
      reason: 'Demand intent exists but no COS order has been linked yet.',
      updatedAt: phase2Date(index, 2),
      sourceOfTruthOwner: 'Customer',
      readModelOwner: 'Customer',
    };
  }

  if (lifecycle === 'retention') {
    return {
      customerId: customer.id,
      stage: lifecycle,
      ownerId,
      nextAction: 'Prepare retention or replenishment outreach from order history.',
      reason: 'Repeat buying context is visible and ready for a next-touch decision.',
      updatedAt: phase2Date(index, 2),
      sourceOfTruthOwner: 'Customer',
      readModelOwner: 'Customer',
    };
  }

  return {
    customerId: customer.id,
    stage: lifecycle,
    ownerId,
    nextAction: 'Confirm the next account touch and keep Demand/COS context attached.',
    reason: 'Customer has enough identity, owner, and commerce context for an operator decision.',
    updatedAt: phase2Date(index, 2),
    sourceOfTruthOwner: 'Customer',
    readModelOwner: 'Customer',
  };
}

function buildCustomerServiceCases(tickets: PrimeSnapshot['tickets'], ownerId: string): CustomerServiceCase[] {
  return tickets.map((ticket) => ({
    id: ticket.id,
    customerId: ticket.customerId,
    orderId: ticket.orderId,
    rmaId: ticket.rmaId,
    status: ticket.status,
    priority: ticket.priority,
    sla: ticket.sla,
    ownerId,
    pendingAction: ticket.status === 'resolved'
      ? 'Confirm the resolution note is reflected in the customer timeline.'
      : ticket.priority === 'high'
        ? 'Escalate with COS return context before further outreach.'
        : 'Send an update to the customer and keep OMS context attached.',
    sourceOfTruthOwner: 'Customer Service',
    readModelOwner: 'Customer',
    linkedEntity: ticket.linkedEntity,
    intelligenceHandoff: ticket.status === 'resolved'
      ? 'Resolved service case can become positive trust feedback.'
      : 'Open service issue should feed VOC and Intelligence risk signals.',
    href: '/customer/service',
  }));
}

function buildRfqQuoteLinks({
  customer,
  lead,
  rfq,
}: {
  customer: PrimeSnapshot['customers'][number];
  lead: PrimeSnapshot['leads'][number] | undefined;
  rfq: PrimeSnapshot['rfqs'][number] | undefined;
}): CustomerRFQQuoteLink[] {
  if (!lead && !rfq) return [];

  return [{
    id: `continuity-${customer.id}-${rfq?.id ?? lead?.id ?? 'lead'}`,
    customerId: customer.id,
    leadId: lead?.id ?? rfq?.leadId ?? null,
    rfqId: rfq?.id ?? null,
    orderId: rfq?.orderId ?? null,
    skuId: rfq?.skuId ?? lead?.skuId ?? null,
    status: rfq?.status ?? lead?.status ?? 'new',
    quantity: rfq?.quantity ?? null,
    value: rfq?.value ?? null,
    sourceOfTruthOwner: 'Demand',
    readModelOwner: 'Customer',
    handoff: rfq?.orderId
      ? 'RFQ converted; Customer reads the OMS order link without owning order state.'
      : 'Demand owns lead/RFQ state; Customer keeps the continuity preview for operator context.',
    href: '/demand/leads-rfqs',
  }];
}

function buildFollowUps({
  customer,
  lifecycleStage,
  serviceCases,
  rfqQuoteLinks,
  customerOrders,
  index,
}: {
  customer: PrimeSnapshot['customers'][number];
  lifecycleStage: CustomerLifecycleStage;
  serviceCases: CustomerServiceCase[];
  rfqQuoteLinks: CustomerRFQQuoteLink[];
  customerOrders: PrimeSnapshot['orders'];
  index: number;
}): CustomerFollowUp[] {
  const serviceCase = serviceCases.find((ticket) => ticket.status !== 'resolved');
  const rfqLink = rfqQuoteLinks.find((link) => link.status !== 'converted');
  const dueAt = phase2Date(index, 6);

  if (serviceCase) {
    return [{
      id: `followup-service-${serviceCase.id}`,
      customerId: customer.id,
      ownerId: serviceCase.ownerId,
      status: serviceCase.priority === 'high' ? 'blocked' : 'open',
      priority: serviceCase.priority,
      dueAt,
      sourceOfTruthOwner: 'Customer',
      readModelOwner: 'Customer',
      source: 'Customer Service',
      sourceEntityId: serviceCase.id,
      allowedAction: 'Create a service recovery follow-up after the case owner confirms the blocker.',
      humanApprovalBoundary: 'Operator must approve customer-facing recovery copy.',
      nextAction: serviceCase.pendingAction,
      businessImpact: 'Prevents a service issue from becoming a failed Demand or Finance proof point.',
      href: serviceCase.href,
    }];
  }

  if (rfqLink) {
    return [{
      id: `followup-rfq-${rfqLink.id}`,
      customerId: customer.id,
      ownerId: lifecycleStage.ownerId,
      status: 'open',
      priority: 'high',
      dueAt,
      sourceOfTruthOwner: 'Customer',
      readModelOwner: 'Customer',
      source: 'Demand',
      sourceEntityId: rfqLink.rfqId ?? rfqLink.leadId ?? customer.id,
      allowedAction: 'Ask the buyer to confirm quantity, quote expectation, and order timing.',
      humanApprovalBoundary: 'Operator must approve quote language; Customer does not edit RFQ terms.',
      nextAction: lifecycleStage.nextAction,
      businessImpact: 'Keeps Demand intent connected to the account before Commerce execution starts.',
      href: rfqLink.href,
    }];
  }

  return [{
    id: `followup-lifecycle-${customer.id}`,
    customerId: customer.id,
    ownerId: lifecycleStage.ownerId,
    status: lifecycleStage.stage === 'retention' ? 'waiting' : 'open',
    priority: lifecycleStage.stage === 'at_risk' ? 'high' : 'normal',
    dueAt,
    sourceOfTruthOwner: 'Customer',
    readModelOwner: 'Customer',
    source: 'Customer',
    sourceEntityId: customer.id,
    allowedAction: customerOrders.length ? 'Send the next-touch note with latest OMS context attached.' : 'Qualify the account before any COS handoff.',
    humanApprovalBoundary: 'Operator approves timing and message before Demand or Intelligence receives feedback.',
    nextAction: lifecycleStage.nextAction,
    businessImpact: lifecycleStage.reason,
    href: '/customer/crm-compact?floor=account',
  }];
}

function buildTimelineEvents({
  customer,
  ownerId,
  lead,
  rfq,
  customerOrders,
  orderEvents,
  serviceCases,
  lifecycleStage,
  followUps,
  sourceCampaign,
  vocInsight,
  index,
}: {
  customer: PrimeSnapshot['customers'][number];
  ownerId: string;
  lead: PrimeSnapshot['leads'][number] | undefined;
  rfq: PrimeSnapshot['rfqs'][number] | undefined;
  customerOrders: PrimeSnapshot['orders'];
  orderEvents: PrimeSnapshot['orderEvents'];
  serviceCases: CustomerServiceCase[];
  lifecycleStage: CustomerLifecycleStage;
  followUps: CustomerFollowUp[];
  sourceCampaign: PrimeSnapshot['campaigns'][number] | undefined;
  vocInsight: PrimeSnapshot['vocInsights'][number] | undefined;
  index: number;
}): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [];
  const lastOrder = latestOrder(customerOrders);

  customer.timeline.slice(0, 2).forEach((entry, entryIndex) => {
    events.push({
      id: `timeline-memory-${customer.id}-${entryIndex}`,
      customerId: customer.id,
      sourceOfTruthOwner: 'Customer',
      readModelOwner: 'Customer',
      sourceEntityType: 'customer',
      sourceEntityId: customer.id,
      occurredAt: phase2Date(index, entryIndex),
      eventType: 'customer_memory',
      summary: entry,
      ownerId,
      nextAction: lifecycleStage.nextAction,
      businessImpact: lifecycleStage.reason,
      href: '/customer/crm-compact?floor=account',
    });
  });

  if (lead) {
    events.push({
      id: `timeline-lead-${lead.id}`,
      customerId: customer.id,
      sourceOfTruthOwner: 'Demand',
      readModelOwner: 'Customer',
      sourceEntityType: 'lead',
      sourceEntityId: lead.id,
      occurredAt: phase2Date(index, 1),
      eventType: 'lead',
      summary: `${lead.source} lead is ${lead.status} with score ${lead.score}.`,
      ownerId,
      nextAction: 'Confirm account context before Demand follow-up.',
      businessImpact: 'Demand intent now has a customer owner and account memory.',
      href: '/demand/leads-rfqs',
    });
  }

  if (rfq) {
    events.push({
      id: `timeline-rfq-${rfq.id}`,
      customerId: customer.id,
      sourceOfTruthOwner: 'Demand',
      readModelOwner: 'Customer',
      sourceEntityType: 'rfq',
      sourceEntityId: rfq.id,
      occurredAt: phase2Date(index, 2),
      eventType: 'rfq',
      summary: `RFQ ${rfq.status} for ${rfq.quantity} units and ${rfq.value.toLocaleString('ja-JP')} JPY.`,
      ownerId,
      nextAction: rfq.orderId ? 'Open converted OMS order context.' : 'Confirm quote expectation with Demand owner.',
      businessImpact: 'Keeps quote continuity visible without moving quote ownership into Customer.',
      href: '/demand/leads-rfqs',
    });
  }

  if (lastOrder) {
    events.push({
      id: `timeline-order-${lastOrder.id}`,
      customerId: customer.id,
      sourceOfTruthOwner: 'Ecom/COS',
      readModelOwner: 'Customer',
      sourceEntityType: 'order',
      sourceEntityId: lastOrder.id,
      occurredAt: lastOrder.order_date || phase2Date(index, 3),
      eventType: 'order',
      summary: `OMS order ${lastOrder.order_id} is ${lastOrder.status} at ${lastOrder.lifecycle_stage}.`,
      ownerId,
      nextAction: 'Use the order state as context only; OMS remains owner of order lifecycle.',
      businessImpact: 'Gives Customer the latest commerce evidence before outreach.',
      href: `/ecom/cos/oms/${lastOrder.id}`,
      auditId: lastOrder.order_id,
    });
  }

  orderEvents.slice(0, 2).forEach((event) => {
    events.push({
      id: `timeline-order-event-${event.id}`,
      customerId: customer.id,
      sourceOfTruthOwner: 'Ecom/COS',
      readModelOwner: 'Customer',
      sourceEntityType: 'order_event',
      sourceEntityId: event.id,
      occurredAt: event.created_at,
      eventType: 'order_event',
      summary: `${event.event_type}: ${event.message}`,
      ownerId,
      nextAction: 'Keep event as evidence, not Customer-owned order state.',
      businessImpact: 'Preserves COS auditability in the relationship timeline.',
      href: lastOrder ? `/ecom/cos/oms/${lastOrder.id}` : '/ecom/cos/oms',
      auditId: event.id,
    });
  });

  serviceCases.forEach((serviceCase) => {
    events.push({
      id: `timeline-service-${serviceCase.id}`,
      customerId: customer.id,
      sourceOfTruthOwner: 'Customer Service',
      readModelOwner: 'Customer',
      sourceEntityType: serviceCase.rmaId ? 'return' : 'service_case',
      sourceEntityId: serviceCase.id,
      occurredAt: phase2Date(index, 4),
      eventType: serviceCase.rmaId ? 'return_refund' : 'service_case',
      summary: `${serviceCase.linkedEntity}: ${serviceCase.status.replace('_', ' ')} service case.`,
      ownerId: serviceCase.ownerId,
      nextAction: serviceCase.pendingAction,
      businessImpact: serviceCase.intelligenceHandoff,
      href: serviceCase.href,
      auditId: serviceCase.rmaId ?? serviceCase.id,
    });
  });

  if (customer.totalRevenue > 0) {
    events.push({
      id: `timeline-finance-${customer.id}`,
      customerId: customer.id,
      sourceOfTruthOwner: 'Finance',
      readModelOwner: 'Customer',
      sourceEntityType: 'finance_profile',
      sourceEntityId: customer.b2bAccount,
      occurredAt: phase2Date(index, 5),
      eventType: 'finance_signal',
      summary: `${customer.totalRevenue.toLocaleString('ja-JP')} JPY commerce history can support finance readiness evidence.`,
      ownerId,
      nextAction: 'Finance may read this evidence; Customer does not decide funding eligibility.',
      businessImpact: 'Links relationship history to trust readiness without making a credit claim.',
      href: '/finance/fin-support#status',
    });
  }

  if (vocInsight || sourceCampaign) {
    events.push({
      id: `timeline-intelligence-${vocInsight?.id ?? sourceCampaign?.id ?? customer.id}`,
      customerId: customer.id,
      sourceOfTruthOwner: 'Intelligence',
      readModelOwner: 'Customer',
      sourceEntityType: 'intelligence_signal',
      sourceEntityId: vocInsight?.id ?? sourceCampaign?.id ?? customer.id,
      occurredAt: phase2Date(index, 6),
      eventType: 'intelligence_signal',
      summary: vocInsight?.summary ?? `${sourceCampaign?.name ?? 'Campaign'} signal is attached to customer context.`,
      ownerId,
      nextAction: vocInsight?.action ?? 'Use signal as readback evidence before the next follow-up.',
      businessImpact: 'Turns customer outcome into an Intelligence feedback signal.',
      href: '/intelligence/signals?view=customer-trends',
    });
  }

  followUps.slice(0, 1).forEach((followUp) => {
    events.push({
      id: `timeline-followup-${followUp.id}`,
      customerId: customer.id,
      sourceOfTruthOwner: 'Customer',
      readModelOwner: 'Customer',
      sourceEntityType: 'follow_up',
      sourceEntityId: followUp.id,
      occurredAt: followUp.dueAt,
      eventType: 'follow_up',
      summary: followUp.nextAction,
      ownerId: followUp.ownerId,
      nextAction: followUp.allowedAction,
      businessImpact: followUp.businessImpact,
      href: followUp.href,
    });
  });

  return events.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
}

function buildCustomerAccountProfile({
  customer,
  customerType,
  customerOrders,
  orderItems,
  orderEvents,
  serviceCases,
  sourceCampaign,
}: {
  customer: PrimeSnapshot['customers'][number];
  customerType: CustomerType;
  customerOrders: PrimeSnapshot['orders'];
  orderItems: PrimeSnapshot['orderItems'];
  orderEvents: PrimeSnapshot['orderEvents'];
  serviceCases: PrimeSnapshot['tickets'];
  sourceCampaign: PrimeSnapshot['campaigns'][number] | undefined;
}): CustomerAccountProfile {
  const lastOrder = latestOrder(customerOrders);
  const shipTo = lastOrder?.ship_to;
  const city = shipTo?.city || 'Unknown city';
  const prefecture = shipTo?.prefecture || '';
  const postalCode = shipTo?.postal_code || '';
  const country = shipTo?.country || (lastOrder?.shipping_address?.split(',').pop()?.trim() || 'Unknown country');
  const totalUnits = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const products = topProducts(orderItems);
  const channelMix = Array.from(new Set(customerOrders.map((order) => channelLabel(order.channel))));
  const preferredShipping = mostCommon(customerOrders.map((order) => order.shipping_method || ''), 'Standard');
  const riskFlags = Array.from(new Set(customerOrders.flatMap((order) => order.risk_flags)));
  const openCases = serviceCases.filter((ticket) => ticket.status !== 'resolved');
  const hasRisk = riskFlags.length > 0
    || customerOrders.some((order) => order.status === 'cancelled' || order.status === 'returned')
    || customer.lifecycle === 'at-risk'
    || openCases.length > 0;
  const primaryEcomChannel = channelMix[0] || channelLabel(lastOrder?.channel || '');
  const acquisitionSource = sourceCampaign?.channel || primaryEcomChannel || 'COS order customer';
  const orderCount = customerOrders.length || customer.totalOrders || 1;
  const averageOrderValue = Math.round((customer.totalRevenue || customerOrders.reduce((sum, order) => sum + order.total_amount, 0)) / Math.max(orderCount, 1));
  const segmentLabel = customerType === 'marketplace' ? 'Marketplace buyer' : customer.segment;
  const recentOrders = customerOrders
    .slice()
    .sort((a, b) => Date.parse(b.order_date) - Date.parse(a.order_date))
    .slice(0, 4)
    .map((order) => ({
      orderNumber: order.order_id,
      channel: channelLabel(order.channel),
      status: order.status,
      lifecycleStage: order.lifecycle_stage,
      total: order.total_amount,
      currency: order.currency,
      orderDate: order.order_date,
      trackingNumber: order.tracking_number,
    }));
  const recentEvents = orderEvents.slice(0, 5).map((event) => ({
    eventType: event.event_type,
    message: event.message,
    actorType: event.actor_type,
    createdAt: event.created_at,
  }));

  return {
    avatarUrl: avatarUrlForCustomer(customer),
    customerName: customer.name,
    customerEmail: customer.email,
    phone: lastOrder?.customer_phone || 'No phone captured',
    shippingAddress: lastOrder?.shipping_address || [shipTo?.address1, city, prefecture, postalCode, country].filter(Boolean).join(', ') || 'No shipping address captured',
    location: [city, shipTo?.prefecture, country].filter(Boolean).join(', '),
    city,
    prefecture,
    postalCode,
    country,
    segmentLabel,
    profileSummary: customerType === 'marketplace'
      ? `${customer.name} is an individual COS customer from ${primaryEcomChannel}. Profile is built from OMS identity, shipping, order, item, event, and service signals.`
      : `${customer.company} is tracked as an account with COS order evidence, contact ownership, and future Demand/Finance handoff room.`,
    buyingIntent: customerType === 'marketplace'
      ? 'Marketplace purchase profile, retention, replenishment, and support readiness.'
      : customer.segment,
    primaryEcomChannel,
    channelMix,
    channelOrderRef: lastOrder?.channel_order_ref || null,
    preferredShipping,
    acquisitionSource,
    sourceCampaignName: sourceCampaign?.name || 'No campaign linked',
    sourceCampaignChannel: sourceCampaign?.channel || 'No campaign channel',
    lastOrderId: lastOrder?.order_id || customer.lastOrderId,
    lastOrderStatus: lastOrder?.status || customer.lifecycle,
    lastLifecycleStage: lastOrder?.lifecycle_stage || customer.lifecycle,
    lastOrderDate: lastOrder?.order_date || '',
    lastOrderValue: lastOrder?.total_amount || 0,
    lastOrderCurrency: lastOrder?.currency || 'JPY',
    subtotalValue: lastOrder?.subtotal_amount || 0,
    shippingValue: lastOrder?.shipping_amount || 0,
    discountValue: lastOrder?.discount_amount || 0,
    trackingNumber: lastOrder?.tracking_number || null,
    warehouseId: lastOrder?.warehouse_id || lastOrder?.allocated_warehouse_id || null,
    averageOrderValue,
    totalUnits,
    favoriteProducts: products,
    recentOrders,
    recentEvents,
    timeline: customer.timeline,
    riskSignal: hasRisk ? 'Needs service/COS review before next outreach' : 'No active COS exception detected',
    riskFlags,
    serviceCaseCount: serviceCases.length,
    openServiceCaseCount: openCases.length,
    latestServiceCase: serviceCases[0]?.subject || 'No service case linked',
    cosReadiness: customerOrders.length
      ? `${customerOrders.length} COS order${customerOrders.length === 1 ? '' : 's'} linked to this identity`
      : 'Lead profile; no COS order linked yet',
  };
}

export function buildCustomerProfileFloor(snapshot: PrimeSnapshot): CustomerProfileFloor {
  const accounts: CustomerAccount[] = snapshot.customers.map((customer, index) => {
    const lifecycle = lifecycleFromPrime(customer.lifecycle);
    const sourceCampaign = snapshot.campaigns[index % Math.max(snapshot.campaigns.length, 1)];
    const revenue = Math.round(customer.totalRevenue || 0);
    const customerType = typeFromSegment(customer.segment);
    const tags = tagIdsForAccount(customer.segment, lifecycle, revenue);
    const identityCompleteness = Math.min(96, 64 + tags.length * 7 + (customer.email ? 10 : 0) + (customer.totalOrders > 0 ? 8 : 0));
    const customerOrders = getCustomerOrders(snapshot, customer);
    const orderIds = new Set(customerOrders.map((order) => order.id));
    const orderItems = getOrderItems(snapshot, orderIds);
    const orderEvents = getOrderEvents(snapshot, orderIds);
    const serviceCaseTickets = snapshot.tickets.filter((ticket) => ticket.customerId === customer.id);
    const lead = snapshot.leads.find((candidate) => candidate.customerId === customer.id);
    const rfq = snapshot.rfqs.find((candidate) => candidate.customerId === customer.id);
    const vocInsight = snapshot.vocInsights.find((candidate) => candidate.customerId === customer.id);
    const ownerId = owners[index % owners.length].id;
    const lifecycleStage = buildLifecycleStage({ customer, lifecycle, ownerId, serviceCases: serviceCaseTickets, rfq, index });
    const serviceCases = buildCustomerServiceCases(serviceCaseTickets, ownerId);
    const rfqQuoteLinks = buildRfqQuoteLinks({ customer, lead, rfq });
    const followUps = buildFollowUps({ customer, lifecycleStage, serviceCases, rfqQuoteLinks, customerOrders, index });
    const timelineEvents = buildTimelineEvents({
      customer,
      ownerId,
      lead,
      rfq,
      customerOrders,
      orderEvents,
      serviceCases,
      lifecycleStage,
      followUps,
      sourceCampaign,
      vocInsight,
      index,
    });
    const profile = buildCustomerAccountProfile({ customer, customerType, customerOrders, orderItems, orderEvents, serviceCases: serviceCaseTickets, sourceCampaign });
    const displayName = customerType === 'marketplace' ? customer.name : customer.company;

    return {
      id: `acct-${customer.id}`,
      accountCode: customer.b2bAccount,
      companyName: displayName,
      displayName,
      customerType,
      lifecycle,
      status: lifecycle === 'at_risk' ? 'watch' : 'active',
      ownerId,
      tags,
      primaryEmail: customer.email,
      website: customerType === 'marketplace' ? '' : seededWebsite(customer.company, index),
      industry: customerType === 'marketplace' ? 'Marketplace commerce' : index % 3 === 0 ? 'Office supplies' : index % 3 === 1 ? 'Factory procurement' : 'Education procurement',
      country: profile.country,
      source: profile.acquisitionSource,
      revenue,
      orderCount: customer.totalOrders,
      identityCompleteness,
      notes: [...customer.notes, profile.cosReadiness],
      lifecycleStage,
      timelineEvents,
      followUps,
      rfqQuoteLinks,
      serviceCases,
      profile,
    };
  });

  if (accounts[0]) {
    accounts.push({
      ...accounts[0],
      id: `${accounts[0].id}-possible-dupe`,
      accountCode: `${accounts[0].accountCode}-D`,
      companyName: `${accounts[0].companyName} Co.`,
      displayName: `${accounts[0].displayName} Co.`,
      lifecycle: 'prospect',
      status: 'watch',
      tags: Array.from(new Set([...accounts[0].tags, 'tag-identity-review'])),
      primaryEmail: accounts[0].primaryEmail.replace('@', '+ops@'),
      revenue: Math.round(accounts[0].revenue * 0.18),
      orderCount: 0,
      identityCompleteness: 58,
      notes: ['Imported from campaign lead list', 'Needs identity review before outreach'],
    });
  }

  const contacts: CustomerContact[] = accounts.flatMap((account, index) => {
    const contactBase = account.displayName.split(' ')[0] || `Contact ${index + 1}`;
    const domain = normalizeDomain(account.primaryEmail || account.website);
    const primaryName = account.profile?.customerName || snapshot.customers[index % Math.max(snapshot.customers.length, 1)]?.name || `${contactBase} Owner`;
    const secondaryContact = account.customerType === 'marketplace' ? [] : [{
      id: `contact-${account.id}-ops`,
      accountId: account.id,
      fullName: `${contactBase} Operations`,
      title: 'Operations Coordinator',
      role: 'ops' as ContactRole,
      email: `ops@${domain}`,
      phone: `+81 80 ${String(3300 + index).padStart(4, '0')} ${String(4400 + index).padStart(4, '0')}`,
      preferredChannel: 'email' as PreferredChannel,
      isPrimary: false,
    }];

    return [
      {
        id: `contact-${account.id}-primary`,
        accountId: account.id,
        fullName: primaryName,
        title: account.customerType === 'b2b' ? 'Procurement Lead' : 'Primary Buyer',
        role: account.customerType === 'b2b' ? 'buyer' : 'decision_maker',
        email: account.primaryEmail,
        phone: `+81 90 ${String(1100 + index).padStart(4, '0')} ${String(2200 + index).padStart(4, '0')}`,
        preferredChannel: index % 3 === 0 ? 'email' : index % 3 === 1 ? 'line' : 'whatsapp',
        isPrimary: true,
      },
      ...secondaryContact,
    ];
  });

  const matches = detectIdentityMatches(accounts, contacts);

  return {
    accounts,
    contacts,
    owners,
    tags: customerTags,
    matches,
    futureModules,
  };
}

export function detectIdentityMatches(accounts: CustomerAccount[], contacts: CustomerContact[]) {
  const matches: IdentityMatch[] = [];

  accounts.forEach((account, index) => {
    accounts.slice(index + 1).forEach((candidate) => {
      const reasons: string[] = [];
      const accountWebsiteDomain = normalizeDomain(account.website);
      const candidateWebsiteDomain = normalizeDomain(candidate.website);
      const accountEmailDomain = normalizeDomain(account.primaryEmail);
      const candidateEmailDomain = normalizeDomain(candidate.primaryEmail);
      const sameWebsite = Boolean(accountWebsiteDomain && candidateWebsiteDomain) && accountWebsiteDomain === candidateWebsiteDomain;
      const similarName = normalize(account.companyName).includes(normalize(candidate.companyName).slice(0, 12))
        || normalize(candidate.companyName).includes(normalize(account.companyName).slice(0, 12));
      const sameEmailDomain = Boolean(accountEmailDomain && candidateEmailDomain)
        && accountEmailDomain === candidateEmailDomain
        && !sharedEmailDomains.has(accountEmailDomain);

      if (sameWebsite) reasons.push('same website domain');
      if (sameEmailDomain) reasons.push('same email domain');
      if (similarName) reasons.push('similar company name');

      if (reasons.length >= 2) {
        matches.push({
          id: `match-account-${account.id}-${candidate.id}`,
          entityType: 'account',
          entityId: account.id,
          candidateId: candidate.id,
          confidence: Math.min(96, 55 + reasons.length * 13),
          reasons,
          suggestion: 'possible_merge',
        });
      }
    });
  });

  contacts.forEach((contact, index) => {
    contacts.slice(index + 1).forEach((candidate) => {
      const reasons: string[] = [];
      if (contact.email.toLowerCase() === candidate.email.toLowerCase()) reasons.push('same contact email');
      if (normalize(contact.fullName) === normalize(candidate.fullName)) reasons.push('same contact name');
      if (normalize(contact.phone) === normalize(candidate.phone)) reasons.push('same phone');

      if (reasons.length >= 1 && contact.accountId !== candidate.accountId) {
        matches.push({
          id: `match-contact-${contact.id}-${candidate.id}`,
          entityType: 'contact',
          entityId: contact.id,
          candidateId: candidate.id,
          confidence: Math.min(94, 62 + reasons.length * 11),
          reasons,
          suggestion: 'review',
        });
      }
    });
  });

  return matches;
}

export function filterCustomerAccounts(accounts: CustomerAccount[], tags: CustomerTag[], filters: CustomerAccountFilters) {
  const query = filters.query.trim().toLowerCase();
  const tagIds = new Set(tags.map((tag) => tag.id));

  return accounts.filter((account) => {
    const matchesQuery = !query
      || account.companyName.toLowerCase().includes(query)
      || account.accountCode.toLowerCase().includes(query)
      || account.primaryEmail.toLowerCase().includes(query)
      || Boolean(account.profile?.customerName.toLowerCase().includes(query))
      || Boolean(account.profile?.location.toLowerCase().includes(query))
      || Boolean(account.profile?.phone.toLowerCase().includes(query))
      || Boolean(account.profile?.primaryEcomChannel.toLowerCase().includes(query))
      || Boolean(account.profile?.channelMix.some((channel) => channel.toLowerCase().includes(query)))
      || Boolean(account.profile?.favoriteProducts.some((product) => product.productName.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)))
      || account.lifecycleStage.nextAction.toLowerCase().includes(query)
      || account.timelineEvents.some((event) => event.summary.toLowerCase().includes(query) || event.sourceOfTruthOwner.toLowerCase().includes(query))
      || account.followUps.some((followUp) => followUp.nextAction.toLowerCase().includes(query) || followUp.source.toLowerCase().includes(query));
    const matchesTag = filters.tagId === 'all' || (tagIds.has(filters.tagId) && account.tags.includes(filters.tagId));
    const matchesOwner = filters.ownerId === 'all' || account.ownerId === filters.ownerId;
    const matchesLifecycle = filters.lifecycle === 'all' || account.lifecycle === filters.lifecycle;
    const matchesType = filters.customerType === 'all' || account.customerType === filters.customerType;

    return matchesQuery && matchesTag && matchesOwner && matchesLifecycle && matchesType;
  });
}

export function getAccountMatches(matches: IdentityMatch[], account: CustomerAccount, contacts: CustomerContact[]) {
  const contactIds = new Set(contacts.filter((contact) => contact.accountId === account.id).map((contact) => contact.id));

  return matches.filter((match) => {
    if (match.entityType === 'account') return match.entityId === account.id || match.candidateId === account.id;
    return contactIds.has(match.entityId) || contactIds.has(match.candidateId);
  });
}
