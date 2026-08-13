import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export type TeamRoleKey = 'admin' | 'pos_cashier' | 'crm_sales' | 'warehouse_manager' | 'web_editor';
export type TeamMemberStatus = 'active' | 'invited' | 'suspended';

export interface TeamRole {
  role_key: TeamRoleKey;
  label: string;
  description: string;
  permissions: string[];
}

export interface TeamMember {
  principal: { id: string; email: string; display_name: string; status: TeamMemberStatus };
  membership: { id: string; role_key: TeamRoleKey; seat_type: string; status: TeamMemberStatus; last_active_at: string | null };
  invitation?: { id: string; expires_at: string; created_at?: string };
}

export interface TeamAuditEvent {
  id: string;
  actor_principal_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  before: unknown;
  after: unknown;
  result: 'success' | 'failure';
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

async function request<T>(path: string, init: RequestInit = {}) {
  const headers = createPrimeAuthHeaders();
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${resolvePrimeBackendBase()}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || body.message || 'Team & Access request failed.');
  return body as T;
}

export const teamAccessApi = {
  roles: () => request<{ data: TeamRole[] }>('/api/v1/role-definitions'),
  members: () => request<{ data: TeamMember[] }>('/api/v1/workspace-members'),
  audit: () => request<{ data: TeamAuditEvent[] }>('/api/v1/audit-events'),
  invite: (email: string, role_key: TeamRoleKey) => request('/api/v1/workspace-member-invitations', { method: 'POST', body: JSON.stringify({ email, role_key }) }),
  resendInvite: (id: string) => request(`/api/v1/workspace-member-invitations/${id}/resend`, { method: 'POST' }),
  cancelInvite: (id: string) => request(`/api/v1/workspace-member-invitations/${id}`, { method: 'DELETE' }),
  updateMemberRole: (id: string, role_key: TeamRoleKey) => request(`/api/v1/workspace-members/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role_key }) }),
  updateMemberStatus: (id: string, action: 'deactivate' | 'reactivate') => request(`/api/v1/workspace-members/${id}/${action}`, { method: 'POST' }),
  updateRole: (role_key: TeamRoleKey, permissions: string[]) => request<{ data: TeamRole }>(`/api/v1/role-definitions/${role_key}`, { method: 'PATCH', body: JSON.stringify({ permissions }) }),
};
