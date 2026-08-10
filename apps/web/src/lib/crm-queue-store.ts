// CRM Queue Store — singleton in-memory for operator queue management
// Classifies incoming messages into P0/P1/P2 priority levels
// Enables operator assignment, SLA tracking, and queue segmentation

export type CrmPriority = 0 | 1 | 2;
export type CrmChannelType = 'live_order' | 'chat' | 'comment' | 'inquiry' | 'support';
export type CrmStatus = 'unassigned' | 'assigned' | 'in_progress' | 'resolved' | 'snoozed';
export type CrmIntent = 'buy_now' | 'ask_price' | 'ask_stock' | 'support' | 'unknown';

export interface CrmItem {
  id: string;
  platform: string;
  channel_type: CrmChannelType;
  priority: CrmPriority;
  customer: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  status: CrmStatus;
  assignedTo?: string;
  snoozeUntil?: string;
  sla: {
    deadline: string;
    breached: boolean;
  };
  preview: {
    text: string;
    product?: string;
    orderId?: string;
    intent: CrmIntent;
  };
  conversationId: string;
  created_at: string;
}

export interface CrmQueueMetrics {
  unassigned: number;
  assigned: number;
  in_progress: number;
  resolved: number;
  breached: number;
  total: number;
  p0: number;
  p1: number;
  p2: number;
}

// SLA deadlines by priority
const SLA_FIRST_RESPONSE_MINUTES: Record<CrmPriority, number> = {
  0: 0.5,    // 30 seconds for P0 (live order)
  1: 5,      // 5 minutes for P1
  2: 30,     // 30 minutes for P2
};

// Intent detection keywords
const INTENT_PATTERNS: Array<{ pattern: RegExp; intent: CrmIntent; priority: CrmPriority }> = [
  { pattern: /\b(đặt|chốt|mua|order|size|màu|color|XL?|M\b|L\b|S\b|kích cỡ)\b/i, intent: 'buy_now', priority: 0 },
  { pattern: /\b(giá|price|bao nhiêu|how much)\b/i, intent: 'ask_price', priority: 1 },
  { pattern: /\b(còn|hết|stock|tồn|hàng)\b/i, intent: 'ask_stock', priority: 1 },
  { pattern: /\b(hỗ trợ|support|help|giúp|lỗi|bug|sai)\b/i, intent: 'support', priority: 2 },
];

let _crmItems: CrmItem[] = [];
let _operators: Array<{ id: string; name: string; active: boolean }> = [
  { id: 'op_01', name: 'Sarah Lee', active: true },
  { id: 'op_02', name: 'Alex Johnson', active: true },
  { id: 'op_03', name: 'Minh Tran', active: true },
];

function genId(): string {
  return `crm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function classifyIntent(text: string): { intent: CrmIntent; priority: CrmPriority } {
  for (const rule of INTENT_PATTERNS) {
    if (rule.pattern.test(text)) {
      return { intent: rule.intent, priority: rule.priority };
    }
  }
  return { intent: 'unknown', priority: 2 };
}

function computeSLADeadline(priority: CrmPriority): string {
  const minutes = SLA_FIRST_RESPONSE_MINUTES[priority];
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function createCrmItem(params: {
  platform: string;
  messageText: string;
  customerName: string;
  customerId: string;
  conversationId: string;
  channelType?: CrmChannelType;
  phone?: string;
  email?: string;
  orderId?: string;
  productRef?: string;
}): CrmItem {
  const classification = classifyIntent(params.messageText);
  const item: CrmItem = {
    id: genId(),
    platform: params.platform,
    channel_type: params.channelType ?? (classification.priority === 0 ? 'live_order' : 'chat'),
    priority: classification.priority,
    customer: {
      id: params.customerId,
      name: params.customerName,
      phone: params.phone,
      email: params.email,
    },
    status: 'unassigned',
    sla: {
      deadline: computeSLADeadline(classification.priority),
      breached: false,
    },
    preview: {
      text: params.messageText.slice(0, 120),
      product: params.productRef,
      orderId: params.orderId,
      intent: classification.intent,
    },
    conversationId: params.conversationId,
    created_at: new Date().toISOString(),
  };
  _crmItems = [..._crmItems, item];
  return item;
}

export function getCrmItems(): CrmItem[] {
  // Update breached status
  const now = new Date().toISOString();
  for (const item of _crmItems) {
    if (item.sla.deadline < now && item.status !== 'resolved') {
      item.sla.breached = true;
    }
  }
  return _crmItems;
}

export function getCrmItemsByPriority(priority: CrmPriority): CrmItem[] {
  return getCrmItems().filter(d => d.priority === priority && d.status !== 'resolved');
}

export function getCrmItemsByStatus(status: CrmStatus): CrmItem[] {
  return getCrmItems().filter(d => d.status === status);
}

export function getCrmItemsByOperator(operatorId: string): CrmItem[] {
  return getCrmItems().filter(d => d.assignedTo === operatorId && d.status !== 'resolved');
}

export function getUnassignedCrm(): CrmItem[] {
  return getCrmItems().filter(d => d.status === 'unassigned');
}

export function getCrmQueueMetrics(): CrmQueueMetrics {
  const items = getCrmItems();
  return {
    unassigned: items.filter(d => d.status === 'unassigned').length,
    assigned: items.filter(d => d.status === 'assigned').length,
    in_progress: items.filter(d => d.status === 'in_progress').length,
    resolved: items.filter(d => d.status === 'resolved').length,
    breached: items.filter(d => d.sla.breached && d.status !== 'resolved').length,
    total: items.length,
    p0: items.filter(d => d.priority === 0).length,
    p1: items.filter(d => d.priority === 1).length,
    p2: items.filter(d => d.priority === 2).length,
  };
}

export function assignCrmItem(crmId: string, operatorId: string): boolean {
  const index = _crmItems.findIndex(d => d.id === crmId);
  if (index === -1) return false;
  const updated = [..._crmItems];
  updated[index] = { ...updated[index], status: 'assigned', assignedTo: operatorId };
  _crmItems = updated;
  return true;
}

export function claimCrmItem(crmId: string, operatorId: string): boolean {
  const index = _crmItems.findIndex(d => d.id === crmId);
  if (index === -1) return false;
  const updated = [..._crmItems];
  updated[index] = { ...updated[index], status: 'in_progress', assignedTo: operatorId };
  _crmItems = updated;
  return true;
}

export function resolveCrmItem(crmId: string): boolean {
  const index = _crmItems.findIndex(d => d.id === crmId);
  if (index === -1) return false;
  const updated = [..._crmItems];
  updated[index] = { ...updated[index], status: 'resolved' };
  _crmItems = updated;
  return true;
}

export function snoozeCrmItem(crmId: string, untilMinutes: number = 15): boolean {
  const index = _crmItems.findIndex(d => d.id === crmId);
  if (index === -1) return false;
  const snoozeUntil = new Date(Date.now() + untilMinutes * 60_000).toISOString();
  const updated = [..._crmItems];
  updated[index] = { ...updated[index], status: 'snoozed', snoozeUntil };
  _crmItems = updated;
  return true;
}

export function getOperators() {
  return _operators;
}

export function clearCrmQueue(): void {
  _crmItems = [];
}
