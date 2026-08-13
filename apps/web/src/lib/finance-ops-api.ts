import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export type FinanceView = 'overview' | 'collections' | 'forecast' | 'risk';
export type SourceType = 'COMMERCE_ORDER' | 'SERVICE_BOOKING';
export type CollectionStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'DISPUTED';
export type AgingBucket = 'DUE_TODAY' | 'OVERDUE_1_7' | 'OVERDUE_8_30' | 'OVERDUE_30_PLUS';
export type RiskStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface FinanceSummary {
  month_year: string;
  revenue_this_month: number;
  target_amount: number;
  target_progress: number;
  collected: number;
  collection_rate: number;
  amount_to_collect: number;
  overdue_count: number;
  remaining_to_target: number;
  finance_health_index: number;
  finance_health_status: 'HEALTHY' | 'WATCH' | 'AT_RISK';
  health_components: Record<string, number>;
  overview: { commerce_revenue: number; service_booking_revenue: number; sales_pipeline: number; active_risk_count: number };
  aging: Record<AgingBucket, { count: number; amount: number }>;
  finance_queue: Array<{ id: string; type: string; severity: 'CRITICAL' | 'WARNING' | 'INFO'; title: string; description: string; action_label: string; target_view: FinanceView }>;
}

export interface FinanceOverview {
  finance_queue: FinanceSummary['finance_queue'];
  revenue_breakdown: Array<{ key: string; label: string; amount: number; color: string }>;
  recent_activity: Array<{ id: string; at: string; type: string; message: string; receivable_id: string; source_id: string; customer_name: string }>;
}

export interface ReceivableTimelineItem { id: string; at: string; type: string; message: string }
export interface PaymentEvidence { file_name: string; provider_status: string; uploaded_at: string }

export interface ReceivableItem {
  id: string;
  source_type: SourceType;
  source_id: string;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  collected_amount: number;
  balance_due: number;
  due_date: string;
  aging_days: number;
  aging_bucket: AgingBucket;
  is_due: boolean;
  collection_status: CollectionStatus;
  assigned_owner_id: string | null;
  assigned_owner_name: string | null;
  linked_invoice_id: string | null;
  invoice_status: string;
  last_reminder_sent_at: string | null;
  payment_method: string;
  evidence: PaymentEvidence | null;
  timeline: ReceivableTimelineItem[];
}

export interface FinanceOwner { id: string; name: string }
export interface FinanceTarget { id: string; month_year: string; target_amount: number; created_by: string; created_at: string }
export interface FinanceForecast {
  month_year: string;
  target: FinanceTarget;
  target_history: FinanceTarget[];
  revenue_this_month: number;
  remaining_to_target: number;
  gap_bridge: Array<{ id: string; label: string; amount: number; coverage: number }>;
  probability: Array<{ category: string; amount: number; probability: number }>;
}

export interface FinanceRisk {
  id: string;
  risk_type: 'UNVERIFIED_PROOF' | 'TARGET_GAP' | 'UNASSIGNED_SERVICE' | 'CONNECTOR_DISCONNECTED' | 'LOW_REPEAT_REVENUE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  status: RiskStatus;
  created_at: string;
  resolved_at: string | null;
  resolution_notes?: string | null;
}

export interface PaymentConnection { id: string; name: string; status: 'CONNECTED' | 'DISCONNECTED' }

async function request<T>(path: string, init: RequestInit = {}) {
  const headers = createPrimeAuthHeaders();
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${resolvePrimeBackendBase()}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Finance Ops request failed.');
  return body as T;
}

export const financeOpsApi = {
  summary: () => request<{ data: FinanceSummary }>('/api/v1/finance/ops/summary'),
  overview: () => request<{ data: FinanceOverview }>('/api/v1/finance/ops/overview'),
  receivables: (params = new URLSearchParams()) => request<{ data: ReceivableItem[]; meta: { total: number }; owners: FinanceOwner[] }>(`/api/v1/finance/ops/receivables?${params}`),
  receivable: (id: string) => request<{ data: ReceivableItem }>(`/api/v1/finance/ops/receivables/${id}`),
  sendReminder: (id: string, channel = 'EMAIL') => request<{ data: ReceivableItem }>(`/api/v1/finance/ops/receivables/${id}/send-reminder`, { method: 'POST', body: JSON.stringify({ channel }) }),
  assignOwner: (id: string, owner_id: string) => request<{ data: ReceivableItem }>(`/api/v1/finance/ops/receivables/${id}/assign-owner`, { method: 'POST', body: JSON.stringify({ owner_id }) }),
  confirmPayment: (id: string, payment_proof: PaymentEvidence | null, collection_note = '') => request<{ data: ReceivableItem; sync_event: { id: string; status: string } }>(`/api/v1/finance/ops/receivables/${id}/confirm-payment`, { method: 'POST', body: JSON.stringify({ payment_proof, collection_note }) }),
  flagDispute: (id: string, reason: string) => request<{ data: ReceivableItem }>(`/api/v1/finance/ops/receivables/${id}/flag-dispute`, { method: 'POST', body: JSON.stringify({ reason }) }),
  forecast: () => request<{ data: FinanceForecast }>('/api/v1/finance/ops/forecast'),
  updateTarget: (month_year: string, target_amount: number) => request<{ data: FinanceTarget }>('/api/v1/finance/ops/target', { method: 'PUT', body: JSON.stringify({ month_year, target_amount }) }),
  risks: () => request<{ data: FinanceRisk[]; meta: { total: number }; payment_connections: PaymentConnection[] }>('/api/v1/finance/ops/risks'),
  updateRisk: (id: string, status: Exclude<RiskStatus, 'OPEN'>, resolution_notes = '') => request<{ data: FinanceRisk }>(`/api/v1/finance/ops/risks/${id}/resolve`, { method: 'POST', body: JSON.stringify({ status, resolution_notes }) }),
};
