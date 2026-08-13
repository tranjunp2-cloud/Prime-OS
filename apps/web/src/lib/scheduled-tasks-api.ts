import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export type TaskStatus = 'RUNNING' | 'PAUSED';
export type ExecutionStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface ScheduledTask {
  id: string;
  title: string;
  description: string;
  cron_expression: string;
  human_schedule: string;
  status: TaskStatus;
  owner_id: string;
  owner_name: string;
  channel_ids: string[];
  system_prompt: string;
  next_run_at: string | null;
  last_run_at: string | null;
  last_run_status: ExecutionStatus | null;
  created_at: string;
  updated_at: string;
}

export interface TaskExecutionLog {
  id: string;
  task_id: string;
  trigger_type: 'SCHEDULED' | 'MANUAL_RUN_NOW';
  status: ExecutionStatus;
  executed_at: string;
  duration_ms: number;
  result_summary: string;
  error_message: string | null;
  execution_payload: Record<string, unknown>;
}

export interface ScheduledTaskTemplate extends Pick<ScheduledTask, 'title' | 'description' | 'cron_expression' | 'human_schedule' | 'owner_id' | 'owner_name' | 'channel_ids' | 'system_prompt'> { id: string }

async function request<T>(path: string, init: RequestInit = {}) {
  const headers = createPrimeAuthHeaders();
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${resolvePrimeBackendBase()}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Scheduled Tasks request failed.');
  return body as T;
}

export const scheduledTasksApi = {
  list: (params = new URLSearchParams()) => request<{ data: ScheduledTask[]; meta: { total: number } }>(`/api/v1/scheduled-tasks?${params}`),
  templates: () => request<{ data: ScheduledTaskTemplate[] }>('/api/v1/scheduled-tasks/templates'),
  get: (id: string) => request<{ data: ScheduledTask }>(`/api/v1/scheduled-tasks/${id}`),
  create: (payload: Partial<ScheduledTask> & { template_id?: string }) => request<{ data: ScheduledTask }>('/api/v1/scheduled-tasks', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<ScheduledTask>) => request<{ data: ScheduledTask }>(`/api/v1/scheduled-tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id: string) => request<{ ok: true }>(`/api/v1/scheduled-tasks/${id}`, { method: 'DELETE' }),
  toggle: (id: string, status: TaskStatus) => request<{ data: ScheduledTask }>(`/api/v1/scheduled-tasks/${id}/toggle-status`, { method: 'POST', body: JSON.stringify({ status }) }),
  runNow: (id: string) => request<{ data: { accepted: true } }>(`/api/v1/scheduled-tasks/${id}/run-now`, { method: 'POST' }),
  logs: (id: string) => request<{ data: TaskExecutionLog[]; meta: { total: number } }>(`/api/v1/scheduled-tasks/${id}/logs`),
  bulkDelete: (ids: string[]) => request<{ deleted: number }>('/api/v1/scheduled-tasks/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkToggle: (ids: string[], status: TaskStatus) => request<{ updated: number }>('/api/v1/scheduled-tasks/bulk-toggle-status', { method: 'POST', body: JSON.stringify({ ids, status }) }),
};
