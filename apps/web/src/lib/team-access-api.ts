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
  if (import.meta.env.VITE_PRIME_PROTOTYPE === 'true') {
    const roles: TeamRole[] = [
      { role_key: 'admin', label: 'Admin', description: 'Full workspace and configuration access', permissions: ['workspace.read', 'iam.members.read', 'iam.members.invite', 'iam.audit.read'] },
      { role_key: 'pos_cashier', label: 'POS Cashier', description: 'Checkout, returns, and assigned shift', permissions: ['workspace.read', 'pos.checkout', 'pos.returns', 'pos.shift.read'] },
      { role_key: 'crm_sales', label: 'CRM Sales', description: 'Leads, customers, and communications', permissions: ['workspace.read', 'crm.customers.read', 'crm.leads.manage'] },
      { role_key: 'warehouse_manager', label: 'Warehouse Manager', description: 'Inventory, fulfillment, and adjustments', permissions: ['workspace.read', 'inventory.read', 'inventory.adjust', 'fulfillment.manage'] },
      { role_key: 'web_editor', label: 'Web Editor', description: 'PrimeWeb content and publishing', permissions: ['workspace.read', 'web.content.manage', 'web.theme.manage', 'web.publish'] },
    ];
    const members: TeamMember[] = [
      { principal: { id: 'p_admin', email: 'admin@primeos.local', display_name: 'PrimeOS Admin', status: 'active' }, membership: { id: 'm_admin', role_key: 'admin', seat_type: 'full_admin', status: 'active', last_active_at: new Date().toISOString() } },
      { principal: { id: 'p_user', email: 'user@primeos.local', display_name: 'PrimeOS User', status: 'active' }, membership: { id: 'm_user', role_key: 'warehouse_manager', seat_type: 'seller_operator', status: 'active', last_active_at: '2026-08-27T12:18:00Z' } },
      { principal: { id: 'p_web', email: 'maya.web@unifi.business', display_name: 'Maya Web', status: 'invited' }, membership: { id: 'm_web', role_key: 'web_editor', seat_type: 'seller_operator', status: 'invited', last_active_at: null }, invitation: { id: 'inv_web', expires_at: '2026-09-03T10:00:00Z' } },
      { principal: { id: 'p_pos', email: 'cashier.tanbinh@unifi.business', display_name: 'Tan Binh Cashier', status: 'invited' }, membership: { id: 'm_pos', role_key: 'pos_cashier', seat_type: 'seller_operator', status: 'invited', last_active_at: null }, invitation: { id: 'inv_pos', expires_at: '2026-09-02T11:30:00Z' } },
    ];
    const audit: TeamAuditEvent[] = [
      { id: 'audit_1', actor_principal_id: 'p_admin', action: 'iam.member.invited', target_type: 'member', target_id: 'maya.web@unifi.business', before: null, after: { status: 'invited' }, result: 'success', ip: '127.0.0.1', user_agent: 'Prime OS Prototype', created_at: '2026-08-28T09:14:00Z' },
      { id: 'audit_2', actor_principal_id: 'p_admin', action: 'iam.role.updated', target_type: 'role', target_id: 'warehouse_manager', before: {}, after: { permissions: 4 }, result: 'success', ip: '127.0.0.1', user_agent: 'Prime OS Prototype', created_at: '2026-08-28T08:42:00Z' },
    ];
    if (path === '/api/v1/role-definitions' && (!init.method || init.method === 'GET')) return { data: roles } as T;
    if (path.startsWith('/api/v1/role-definitions/') && init.method === 'PATCH') return { data: roles.find((role) => path.endsWith(role.role_key)) || roles[1] } as T;
    if (path === '/api/v1/workspace-members' && (!init.method || init.method === 'GET')) return { data: members } as T;
    if (path === '/api/v1/audit-events') return { data: audit } as T;
    return { success: true, data: {} } as T;
  }
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
