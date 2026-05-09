import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Ban,
  Building2,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  Code2,
  Download,
  FileKey2,
  KeyRound,
  ListFilter,
  Loader2,
  Mail,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

type AccountRoleKey = 'admin' | 'operator' | 'viewer';
type AccountStatus = 'active' | 'invited' | 'suspended';
type AccountTab = 'overview' | 'members' | 'roles' | 'security' | 'audit' | 'api-keys';
type MemberStatusFilter = AccountStatus | 'all';

interface AccountEnvelope {
  principal: {
    id: string;
    email: string;
    display_name: string;
    status: AccountStatus;
    auth_methods: string[];
  };
  membership: {
    id: string;
    workspace_id: string;
    principal_id: string;
    role_key: AccountRoleKey;
    seat_type: string | null;
    status: AccountStatus;
    last_active_at: string | null;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    default_locale: string;
    default_timezone: string;
    markets: string[];
  };
  capabilities: string[];
}

interface WorkspaceMember {
  principal: AccountEnvelope['principal'];
  membership: AccountEnvelope['membership'];
  invitation?: {
    id: string;
    expires_at: string;
  };
}

interface RoleDefinition {
  role_key: AccountRoleKey;
  label: string;
  description: string;
  permissions: string[];
}

interface AccountAuditEvent {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  result: 'success' | 'failure';
  created_at: string;
  actor_principal_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
}

const roleScope: Record<AccountRoleKey, string> = {
  admin: 'Workspace admin',
  operator: 'Business operations',
  viewer: 'Read-only',
};

const permissionGroups = [
  { group: 'Workspace', capabilities: 'view_workspace, update_workspace' },
  { group: 'Members', capabilities: 'invite_member, update_member_role, suspend_member, remove_member' },
  { group: 'Roles', capabilities: 'view_roles, create_role, update_role, delete_role' },
  { group: 'Security', capabilities: 'view_security, update_security_policy' },
  { group: 'Audit', capabilities: 'view_audit, export_audit' },
  { group: 'Inventory Brain', capabilities: 'view_inventory, reserve_stock, adjust_stock, approve_adjustment' },
  { group: 'AI Operator', capabilities: 'ask_ai, draft_action, approve_ai_action, execute_ai_action' },
];

const apiKeys = [
  {
    name: 'Prime OS Admin API',
    scope: 'iam.audit.read, iam.roles.read',
    createdBy: 'PrimeOS Admin',
    createdAt: 'Not created',
    lastUsed: 'Never',
    status: 'Not configured',
  },
];

function getInitials(name?: string, email?: string) {
  const source = name?.trim() || email?.split('@')[0] || 'PrimeOS';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'PO';
}

function formatRole(role?: string) {
  if (role === 'admin') return 'Admin';
  if (role === 'operator' || role === 'user') return 'Operator';
  return 'Viewer';
}

function formatSeat(value?: string | null) {
  if (value === 'full_admin') return 'Full Admin';
  if (value === 'viewer') return 'Read-only';
  if (value === 'seller_operator') return 'Operator';
  return (value || 'Operator').replace(/_/g, ' ');
}

function formatStatus(value?: string) {
  if (!value) return 'Unknown';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Never recorded';
  return new Date(value).toLocaleString();
}

function formatAction(value: string) {
  return value.replace(/\./g, ' ');
}

function statusVariant(status: AccountStatus) {
  if (status === 'suspended') return 'destructive';
  if (status === 'invited') return 'secondary';
  return 'outline';
}

function resolveAccountTabFromHash(hash: string): AccountTab {
  const normalized = hash.replace('#', '').toLowerCase();
  if (normalized === 'members' || normalized === 'workspace-access') return 'members';
  if (normalized === 'roles' || normalized === 'roles-permissions') return 'roles';
  if (normalized === 'security' || normalized === 'security-audit') return 'security';
  if (normalized === 'audit' || normalized === 'audit-logs') return 'audit';
  if (normalized === 'api' || normalized === 'api-keys' || normalized === 'integrations') return 'api-keys';
  return 'overview';
}

function resolveHashFromAccountTab(tab: AccountTab) {
  if (tab === 'overview') return '';
  return `#${tab}`;
}

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

async function parseAccountError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error?.message || body?.message || fallback;
}

async function parseAccountJson<T>(response: Response, backendBase: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    const target = backendBase || 'the configured API base';
    throw new Error(`Prime OS backend at ${target} did not return JSON. Start the local backend with npm run dev in prime-os-phase-1/backend, then reload Account Center.`);
  }

  return await response.json() as T;
}

function formatAccountNetworkError(error: unknown, backendBase: string) {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return `Cannot reach Prime OS backend at ${backendBase || 'the configured API base'}. Start the local backend with npm run dev in prime-os-phase-1/backend, then reload Account Center.`;
  }

  return error instanceof Error ? error.message : 'Account request failed.';
}

export default function Account() {
  const { user, session, token } = useAuth();
  const { toast } = useToast();
  const [account, setAccount] = useState<AccountEnvelope | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [auditEvents, setAuditEvents] = useState<AccountAuditEvent[]>([]);
  const [displayName, setDisplayName] = useState(user?.fullName || '');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AccountRoleKey>('operator');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<MemberStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AccountTab>(() => resolveAccountTabFromHash(typeof window === 'undefined' ? '' : window.location.hash));

  const capabilities = account?.capabilities || [];
  const canManageMembers = capabilities.includes('iam.members.invite');
  const canReadAudit = capabilities.includes('iam.audit.read');
  const roleLabel = roles.find((role) => role.role_key === account?.membership.role_key)?.label || session?.roleLabel || formatRole(user?.role);
  const workspace = account?.workspace.name || user?.workspace || 'PrimeOS workspace';
  const seatType = account?.membership.seat_type || user?.seatType || (user?.role === 'admin' ? 'full_admin' : 'seller_operator');
  const displayIdentity = account?.principal.display_name || user?.fullName || 'PrimeOS User';
  const email = account?.principal.email || user?.email || 'user@primeos.local';
  const initials = getInitials(displayIdentity, email);
  const readableSeat = formatSeat(seatType);
  const isDirty = Boolean(account && displayName.trim() && displayName.trim() !== account.principal.display_name);

  const request = useMemo(() => async <T,>(path: string, init?: RequestInit) => {
    const headers = createPrimeAuthHeaders(token);
    if (init?.body) headers.set('Content-Type', 'application/json');
    const backendBase = resolvePrimeBackendBase();
    let response: Response;

    try {
      response = await fetch(`${backendBase}${path}`, { ...init, headers });
    } catch (requestError) {
      throw new Error(formatAccountNetworkError(requestError, backendBase));
    }

    if (!response.ok) {
      throw new Error(await parseAccountError(response, 'Account request failed.'));
    }
    return await parseAccountJson<T>(response, backendBase);
  }, [token]);

  const loadAccount = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [meRes, rolesRes] = await Promise.all([
        request<{ data: AccountEnvelope }>('/api/v1/me'),
        request<{ data: RoleDefinition[] }>('/api/v1/role-definitions'),
      ]);
      setAccount(meRes.data);
      setDisplayName(meRes.data.principal.display_name);
      setRoles(rolesRes.data);
      if (meRes.data.capabilities.includes('iam.members.read')) {
        const [membersRes, auditRes] = await Promise.all([
          request<{ data: WorkspaceMember[] }>('/api/v1/workspace-members'),
          request<{ data: AccountAuditEvent[] }>('/api/v1/audit-events'),
        ]);
        setMembers(membersRes.data);
        setAuditEvents(auditRes.data);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load account center.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAccount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const syncTabFromHash = () => setActiveTab(resolveAccountTabFromHash(window.location.hash));
    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);
    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, []);

  const changeTab = (value: string) => {
    const nextTab = value as AccountTab;
    setActiveTab(nextTab);
    if (typeof window === 'undefined') return;
    const nextHash = resolveHashFromAccountTab(nextTab);
    const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
    window.history.replaceState(null, '', nextUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!isDirty) return;
    setSaving(true);
    try {
      const response = await request<{ data: AccountEnvelope }>('/api/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      setAccount(response.data);
      setDisplayName(response.data.principal.display_name);
      toast({ title: 'Đã cập nhật hồ sơ', description: 'Tên hiển thị đã được lưu trong Account Center.' });
      void loadAccount();
    } catch (saveError) {
      toast({ variant: 'destructive', title: 'Không thể lưu hồ sơ', description: saveError instanceof Error ? saveError.message : 'Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  const inviteMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await request('/api/v1/workspace-member-invitations', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role_key: inviteRole }),
      });
      setInviteEmail('');
      toast({ title: 'Đã tạo lời mời', description: 'Member mới đã được thêm vào hàng đợi invitation.' });
      void loadAccount();
    } catch (inviteError) {
      toast({ variant: 'destructive', title: 'Không thể mời thành viên', description: inviteError instanceof Error ? inviteError.message : 'Vui lòng thử lại.' });
    } finally {
      setInviting(false);
    }
  };

  const updateMemberStatus = async (membershipId: string, action: 'deactivate' | 'reactivate') => {
    setActionId(`${membershipId}:${action}`);
    try {
      await request(`/api/v1/workspace-members/${membershipId}/${action}`, { method: 'POST' });
      toast({ title: action === 'deactivate' ? 'Đã vô hiệu hóa thành viên' : 'Đã kích hoạt lại thành viên' });
      void loadAccount();
    } catch (memberError) {
      toast({ variant: 'destructive', title: 'Không thể cập nhật thành viên', description: memberError instanceof Error ? memberError.message : 'Vui lòng thử lại.' });
    } finally {
      setActionId(null);
    }
  };

  const selfMember = account ? [{ principal: account.principal, membership: account.membership }] : [];
  const accessMembers = members.length ? members : selfMember;
  const activeMembers = accessMembers.filter((member) => member.membership.status === 'active').length;
  const pendingMembers = accessMembers.filter((member) => member.membership.status === 'invited').length;
  const suspendedMembers = accessMembers.filter((member) => member.membership.status === 'suspended').length;
  const totalMembers = accessMembers.length || (account ? 1 : 0);
  const workspaceDetail = account ? `${account.workspace.default_locale} / ${account.workspace.default_timezone} / ${account.workspace.markets.join(', ')}` : 'Loading workspace boundary.';

  const filteredMembers = accessMembers.filter((member) => {
    const query = memberQuery.trim().toLowerCase();
    const matchesQuery = !query || [
      member.principal.display_name,
      member.principal.email,
      member.membership.role_key,
      member.membership.seat_type,
      member.membership.status,
    ].some((part) => String(part || '').toLowerCase().includes(query));
    const matchesStatus = memberStatusFilter === 'all' || member.membership.status === memberStatusFilter;
    return matchesQuery && matchesStatus;
  });

  const healthCards = [
    { title: 'Members', value: loading ? '...' : `${activeMembers} active`, detail: `${pendingMembers} pending, ${suspendedMembers} suspended`, icon: UsersRound, tone: 'text-primary' },
    { title: 'Roles', value: loading ? '...' : `${roles.length || 0} roles`, detail: roles.map((role) => role.label).join(', ') || 'Loading role catalog', icon: ShieldCheck, tone: 'text-primary' },
    { title: 'Security', value: canManageMembers ? 'Needs setup' : 'Limited', detail: canManageMembers ? 'MFA off, SSO not configured' : 'Admin access required', icon: ShieldAlert, tone: 'text-warning' },
    { title: 'Audit', value: loading ? '...' : `${auditEvents.length} events`, detail: canReadAudit ? 'Last 24h IAM trail' : 'Audit read restricted', icon: Activity, tone: 'text-success' },
  ];

  const tabItems = [
    { value: 'overview', label: 'Overview', icon: Activity },
    { value: 'members', label: 'Members', icon: UsersRound },
    { value: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
    { value: 'security', label: 'Security', icon: KeyRound },
    { value: 'audit', label: 'Audit Logs', icon: Activity },
    { value: 'api-keys', label: 'API Keys', icon: Code2 },
  ] as const;

  const securityChecklist = [
    { label: 'Backend IAM is authoritative', detail: 'Role, capability, invite and member actions resolve through API guardrails.', status: 'Passed', badge: 'outline' as const, icon: CheckCircle2, tone: 'text-success' },
    { label: 'MFA enabled for admins', detail: 'Admin accounts should require a second factor before production use.', status: 'Warning', badge: 'warning' as const, icon: AlertTriangle, tone: 'text-warning' },
    { label: 'SSO configured', detail: 'No enterprise SSO provider is connected yet.', status: 'Not configured', badge: 'secondary' as const, icon: CircleSlash2, tone: 'text-muted-foreground' },
    { label: 'Monthly role review', detail: 'Role recertification workflow is pending.', status: 'Pending', badge: 'secondary' as const, icon: Clock3, tone: 'text-muted-foreground' },
    { label: 'API keys reviewed', detail: 'Machine access needs rotate/revoke controls before production.', status: 'Pending', badge: 'secondary' as const, icon: FileKey2, tone: 'text-muted-foreground' },
  ];

  const exportAudit = (format: 'csv' | 'json') => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `primeos-account-audit-${timestamp}.${format}`;
    const content = format === 'json'
      ? JSON.stringify(auditEvents, null, 2)
      : [
        ['id', 'time', 'actor', 'event', 'target_type', 'target_id', 'source', 'result'].map(escapeCsv).join(','),
        ...auditEvents.map((event) => [
          event.id,
          event.created_at,
          event.actor_principal_id || 'System IAM',
          event.action,
          event.target_type,
          event.target_id,
          event.user_agent ? 'UI/API' : 'System',
          event.result,
        ].map(escapeCsv).join(',')),
      ].join('\n');
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderMemberAction = (member: WorkspaceMember) => {
    if (!canManageMembers || member.invitation) return null;
    const isSuspended = member.membership.status === 'suspended';
    const action = isSuspended ? 'reactivate' : 'deactivate';
    const currentActionId = `${member.membership.id}:${action}`;
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="outline" disabled title="Role update API is not wired yet">
          Edit role
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={actionId === currentActionId} onClick={() => updateMemberStatus(member.membership.id, action)}>
          {actionId === currentActionId ? <Loader2 className="size-3.5 animate-spin" /> : isSuspended ? <CheckCircle2 className="size-3.5" /> : <Ban className="size-3.5" />}
          {isSuspended ? 'Reactivate' : 'Suspend'}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-[hsl(var(--surface-stage))]">
      <div className="space-y-4 p-4 pb-24 md:p-6 md:pb-28">
        <section className="surface-solid rounded-xl border border-border/80 px-4 py-4" aria-labelledby="account-title">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <span>Platform Administration</span>
                <span className="text-border">/</span>
                <span className="text-primary">Identity Control Plane</span>
              </div>
              <h1 id="account-title" className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Account Center</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Manage organization, access, security, and audit across Prime OS.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1.5"><Building2 className="size-3.5" />{workspace}</Badge>
                <Badge variant="outline">{workspaceDetail}</Badge>
                <Badge variant={canManageMembers ? 'default' : 'secondary'}>{canManageMembers ? 'Admin guardrails' : 'Self service'}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => changeTab('members')}>
                <UserPlus className="size-4" />
                Invite member
              </Button>
              <Button type="button" variant="outline" onClick={() => changeTab('security')}>
                <Settings2 className="size-4" />
                Configure security
              </Button>
              <Button type="button" variant="outline" onClick={() => changeTab('audit')}>
                <Download className="size-4" />
                Export audit
              </Button>
            </div>
          </div>
        </section>

        {error ? (
          <div role="alert" className="rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Account health summary">
          {healthCards.map((card) => (
            <div key={card.title} className="surface-solid rounded-xl border border-border/75 p-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-[hsl(var(--surface-control))]">
                  <card.icon className={`size-4 ${card.tone}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{card.title}</p>
                  <p className="mt-1 truncate text-base font-semibold text-foreground">{card.value}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <Tabs value={activeTab} onValueChange={changeTab} className="space-y-4">
          <div className="overflow-x-auto border-b border-border scrollbar-visible">
            <TabsList className="inline-flex min-w-max gap-1 rounded-none border-0 bg-transparent p-0">
              {tabItems.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  onClick={() => changeTab(tab.value)}
                  className="h-11 gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.55fr)]">
              <Card className="surface-solid overflow-hidden">
                <CardHeader className="border-b border-border/70 pb-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base"><UsersRound className="size-4 text-primary" />Access Review</CardTitle>
                      <CardDescription>Who has access, what role they hold, and their current status.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{totalMembers} seats</Badge>
                      <Badge variant="outline">{activeMembers} active</Badge>
                      <Badge variant={suspendedMembers ? 'destructive' : 'secondary'}>{suspendedMembers} suspended</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table variant="compact">
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Seat type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessMembers.length ? accessMembers.map((member) => (
                        <TableRow key={member.invitation?.id || member.membership.id}>
                          <TableCell className="min-w-[220px]">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-[11px] font-semibold text-primary">
                                {getInitials(member.principal.display_name, member.principal.email)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">{member.principal.display_name}</p>
                                <p className="truncate text-[11px] text-muted-foreground">{member.principal.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{formatRole(member.membership.role_key)}</Badge></TableCell>
                          <TableCell>{formatSeat(member.membership.seat_type)}</TableCell>
                          <TableCell><Badge variant={statusVariant(member.membership.status)}>{formatStatus(member.membership.status)}</Badge></TableCell>
                          <TableCell>{formatDateTime(member.membership.last_active_at)}</TableCell>
                          <TableCell className="text-right">{renderMemberAction(member)}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{loading ? 'Loading members...' : 'No account members found.'}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="surface-solid">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" />Security Checklist</CardTitle>
                    <CardDescription>Operational guardrails before workspace administration.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {securityChecklist.map((item) => (
                      <div key={item.label} className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                        <item.icon className={`mt-0.5 size-4 shrink-0 ${item.tone}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{item.label}</p>
                            <Badge variant={item.badge} className="text-[10px]">{item.status}</Badge>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="surface-solid">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><BadgeCheck className="size-4 text-primary" />My Access</CardTitle>
                    <CardDescription>Current identity and profile edit stay secondary to admin work.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-3" onSubmit={saveProfile}>
                      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-sm font-semibold text-primary">{initials}</div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{displayIdentity}</p>
                          <p className="truncate text-xs text-muted-foreground">{email}</p>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="account-display-name">Display name</Label>
                          <Input id="account-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={loading || saving} />
                        </div>
                        <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
                          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Role</span><span className="font-semibold text-foreground">{roleLabel}</span></div>
                          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Seat</span><span className="font-semibold text-foreground">{readableSeat}</span></div>
                          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Permission mode</span><span className="font-semibold text-foreground">{session?.canWrite ? 'Read/write' : 'Read-only'}</span></div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" size="sm" disabled={!isDirty || saving}>
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                          Save profile
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={!isDirty || saving} onClick={() => setDisplayName(account?.principal.display_name || user?.fullName || '')}>
                          <RotateCcw className="size-4" />
                          Undo
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className="surface-solid overflow-hidden">
              <CardHeader className="border-b border-border/70 pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-primary" />Recent Audit Events</CardTitle>
                    <CardDescription>Trace member, permission, security, API key, and system-level account changes.</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => changeTab('audit')}>View audit logs</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table variant="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditEvents.length ? auditEvents.slice(0, 5).map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{formatDateTime(event.created_at)}</TableCell>
                        <TableCell>{event.actor_principal_id || 'System IAM'}</TableCell>
                        <TableCell className="font-medium text-foreground">{formatAction(event.action)}</TableCell>
                        <TableCell>{event.target_type} / {event.target_id}</TableCell>
                        <TableCell>{event.user_agent ? 'UI/API' : 'System'}</TableCell>
                        <TableCell><Badge variant={event.result === 'success' ? 'outline' : 'destructive'}>{event.result}</Badge></TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          {loading ? 'Loading audit...' : 'No account events yet. IAM events such as login, invite, role update, security setting change, and API key update will appear here.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-0 space-y-4">
            <Card className="surface-solid overflow-hidden">
              <CardHeader className="border-b border-border/70">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base"><UsersRound className="size-4 text-primary" />Members</CardTitle>
                    <CardDescription>Workspace access, invitations, roles, and seat types.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{activeMembers} active</Badge>
                    <Badge variant="secondary">{pendingMembers} pending</Badge>
                    <Badge variant={suspendedMembers ? 'destructive' : 'outline'}>{suspendedMembers} suspended</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {canManageMembers ? (
                  <form className="rounded-xl border border-border/75 bg-[hsl(var(--surface-control))] p-4" onSubmit={inviteMember}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label htmlFor="invite-member-email">Email address</Label>
                        <Input id="invite-member-email" type="email" placeholder="operator@company.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} aria-label="Invite member email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-member-role">Role</Label>
                        <select id="invite-member-role" className="h-10 min-w-[150px] rounded-md border border-input bg-background px-3 text-sm" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as AccountRoleKey)}>
                          <option value="operator">Operator</option>
                          <option value="viewer">Viewer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                        {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                        Invite
                      </Button>
                    </div>
                  </form>
                ) : null}

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Filter by name, email, role, seat..." value={memberQuery} onChange={(event) => setMemberQuery(event.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <ListFilter className="size-4 text-muted-foreground" />
                    <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={memberStatusFilter} onChange={(event) => setMemberStatusFilter(event.target.value as MemberStatusFilter)} aria-label="Filter members by status">
                      <option value="all">All statuses</option>
                      <option value="active">Active</option>
                      <option value="invited">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              </CardContent>
              <CardContent className="p-0">
                <Table variant="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Seat type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last active</TableHead>
                      <TableHead>Joined / invited</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.length ? filteredMembers.map((member) => (
                      <TableRow key={member.invitation?.id || member.membership.id}>
                        <TableCell className="min-w-[240px]">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-display text-[11px] font-semibold text-primary">
                              {getInitials(member.principal.display_name, member.principal.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{member.principal.display_name}</p>
                              <p className="truncate text-[11px] text-muted-foreground">{member.principal.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{formatRole(member.membership.role_key)}</Badge></TableCell>
                        <TableCell>{formatSeat(member.membership.seat_type)}</TableCell>
                        <TableCell><Badge variant={statusVariant(member.membership.status)}>{formatStatus(member.membership.status)}</Badge></TableCell>
                        <TableCell>{formatDateTime(member.membership.last_active_at)}</TableCell>
                        <TableCell>{member.invitation ? formatDateTime(member.invitation.expires_at) : 'Existing member'}</TableCell>
                        <TableCell className="text-right">{renderMemberAction(member)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          {loading ? 'Loading members...' : 'No members match the current filter.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-0 space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,0.6fr)]">
              <Card className="surface-solid overflow-hidden">
                <CardHeader className="border-b border-border/70">
                  <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-primary" />Roles & Permissions</CardTitle>
                  <CardDescription>Prime OS permissions follow Organization -&gt; Workspace -&gt; Area -&gt; Tower -&gt; Floor -&gt; Action.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table variant="compact">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Scope</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Permissions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.length ? roles.map((role) => (
                        <TableRow key={role.role_key}>
                          <TableCell><Badge variant={role.role_key === account?.membership.role_key ? 'default' : 'outline'}>{role.label}</Badge></TableCell>
                          <TableCell>{roleScope[role.role_key]}</TableCell>
                          <TableCell className="max-w-[360px] text-muted-foreground">{role.description}</TableCell>
                          <TableCell>{role.permissions.length} rules</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{loading ? 'Loading roles...' : 'No role definitions found.'}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="surface-solid">
                <CardHeader>
                  <CardTitle className="text-base">Capability Groups</CardTitle>
                  <CardDescription>Business operations and IAM share one permission hierarchy.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {permissionGroups.map((group) => (
                    <div key={group.group} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <p className="text-sm font-semibold text-foreground">{group.group}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.capabilities}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-0 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="surface-solid">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-4 text-primary" />Security Posture</CardTitle>
                  <CardDescription>Account-level security policies and admin guardrails.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {securityChecklist.map((item) => (
                    <div key={item.label} className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                      <item.icon className={`mt-0.5 size-4 shrink-0 ${item.tone}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{item.label}</p>
                          <Badge variant={item.badge}>{item.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="surface-solid">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="size-4 text-primary" />Policy Surface</CardTitle>
                  <CardDescription>Production security model to wire behind this console.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {['Login and session policy', 'MFA policy', 'SSO configuration', 'Password/session guardrails', 'Admin approval policy', 'AI action confirmation policy'].map((item) => (
                    <div key={item} className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <p className="text-sm font-semibold text-foreground">{item}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Configuration pending</p>
                    </div>
                  ))}
                  <div className="rounded-lg border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:col-span-2">
                    Demo credentials are local/private only. Do not use this auth setup in production.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <Card className="surface-solid overflow-hidden">
              <CardHeader className="border-b border-border/70">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-primary" />Audit Logs</CardTitle>
                    <CardDescription>Searchable trail for IAM, security, system, business, and AI audit events.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => exportAudit('csv')}><Download className="size-4" />CSV</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => exportAudit('json')}><Download className="size-4" />JSON</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 border-b border-border/70 p-4 md:grid-cols-5">
                {['Date range', 'Actor', 'Event type', 'Target type', 'Result'].map((filter) => (
                  <div key={filter} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{filter}</p>
                    <p className="mt-1 text-sm text-foreground">All</p>
                  </div>
                ))}
              </CardContent>
              <CardContent className="p-0">
                <Table variant="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Event ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditEvents.length ? auditEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{formatDateTime(event.created_at)}</TableCell>
                        <TableCell>{event.actor_principal_id || 'System IAM'}</TableCell>
                        <TableCell className="font-medium text-foreground">{formatAction(event.action)}</TableCell>
                        <TableCell>{event.target_type} / {event.target_id}</TableCell>
                        <TableCell>{event.user_agent ? 'UI/API' : 'System'}</TableCell>
                        <TableCell><Badge variant={event.result === 'success' ? 'outline' : 'destructive'}>{event.result}</Badge></TableCell>
                        <TableCell className="font-mono text-[11px]">{event.id}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          {loading ? 'Loading audit logs...' : 'No account events yet. Login, invite, role update, security setting change, API key update, and AI action events will appear here.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys" className="mt-0">
            <Card className="surface-solid overflow-hidden">
              <CardHeader className="border-b border-border/70">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base"><Code2 className="size-4 text-primary" />API Keys / Integrations</CardTitle>
                    <CardDescription>Machine-to-machine access should be scoped, rotated, revoked, and audited.</CardDescription>
                  </div>
                  <Button type="button" disabled><KeyRound className="size-4" />Create API key</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table variant="compact">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Created by</TableHead>
                      <TableHead>Created at</TableHead>
                      <TableHead>Last used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.name}>
                        <TableCell className="font-semibold text-foreground">{key.name}</TableCell>
                        <TableCell>{key.scope}</TableCell>
                        <TableCell>{key.createdBy}</TableCell>
                        <TableCell>{key.createdAt}</TableCell>
                        <TableCell>{key.lastUsed}</TableCell>
                        <TableCell><Badge variant="secondary">{key.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button type="button" size="sm" variant="outline" disabled>Rotate</Button>
                            <Button type="button" size="sm" variant="destructive" disabled>Revoke</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
