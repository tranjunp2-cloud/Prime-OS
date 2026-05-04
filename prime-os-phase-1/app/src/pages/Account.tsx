import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ShieldCheck, UserRound, UsersRound, Building2, KeyRound, Activity, Mail, BadgeCheck, Loader2, UserPlus, RotateCcw, Ban, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

type AccountRoleKey = 'admin' | 'operator' | 'viewer';
type AccountStatus = 'active' | 'invited' | 'suspended';

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
}

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
  return (value || 'seller_operator').replace(/_/g, ' ');
}

async function parseAccountError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return body?.error?.message || body?.message || fallback;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const capabilities = account?.capabilities || [];
  const canManageMembers = capabilities.includes('iam.members.invite');
  const roleLabel = roles.find((role) => role.role_key === account?.membership.role_key)?.label || session?.roleLabel || formatRole(user?.role);
  const workspace = account?.workspace.name || user?.workspace || 'PrimeOS workspace';
  const seatType = account?.membership.seat_type || user?.seatType || (user?.role === 'admin' ? 'full_admin' : 'seller_operator');
  const displayIdentity = account?.principal.display_name || user?.fullName || 'PrimeOS User';
  const email = account?.principal.email || user?.email || 'user@primeos.local';
  const initials = getInitials(displayIdentity, email);
  const isDirty = Boolean(account && displayName.trim() && displayName.trim() !== account.principal.display_name);

  const request = useMemo(() => async <T,>(path: string, init?: RequestInit) => {
    const headers = createPrimeAuthHeaders(token);
    if (init?.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${resolvePrimeBackendBase()}${path}`, { ...init, headers });
    if (!response.ok) {
      throw new Error(await parseAccountError(response, 'Account request failed.'));
    }
    return await response.json() as T;
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

  const summaryCards = [
    { title: 'Workspace', value: workspace, detail: account ? `${account.workspace.default_locale} · ${account.workspace.default_timezone} · ${account.workspace.markets.join(', ')}` : 'Loading workspace boundary.', icon: Building2 },
    { title: 'Access level', value: roleLabel, detail: canManageMembers ? 'Can manage account access with backend IAM guardrails.' : 'Self-service profile access only.', icon: ShieldCheck },
    { title: 'Seat type', value: formatSeat(seatType), detail: 'Packaging signal only; authorization stays role-based.', icon: BadgeCheck },
  ];
  const activeMembers = members.filter((member) => member.membership.status === 'active').length;
  const pendingMembers = members.filter((member) => member.membership.status === 'invited').length;
  const suspendedMembers = members.filter((member) => member.membership.status === 'suspended').length;

  return (
    <div className="min-h-full bg-background">
      <div className="space-y-5 p-4 md:p-6">
        <section className="grid gap-5 rounded-[28px] border border-border bg-[linear-gradient(135deg,hsl(var(--surface-toolbar))_0%,hsl(var(--background))_58%,hsl(var(--primary)/0.10)_100%)] p-5 shadow-sm xl:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]" aria-labelledby="account-title">
          <div className="flex min-w-0 flex-col justify-between gap-6">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 font-display text-xl font-semibold text-primary shadow-sm" aria-hidden="true">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Identity & access</p>
                <h1 id="account-title" className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Account Center</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  Một cockpit cho hồ sơ, quyền truy cập, thành viên và audit trail của workspace.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">{roleLabel}</Badge>
              <Badge variant={canManageMembers ? 'default' : 'secondary'} className="rounded-full px-3 py-1 text-xs">{canManageMembers ? 'Can manage members' : 'Profile only'}</Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">{formatSeat(seatType)}</Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-border/70 bg-background/65 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Workspace</p>
              <p className="mt-3 truncate text-lg font-semibold text-foreground">{loading ? 'Loading…' : workspace}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{account ? `${account.workspace.default_locale} · ${account.workspace.default_timezone}` : 'Workspace boundary'}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/65 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Members</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{loading ? '…' : `${activeMembers}/${members.length || 1} active`}</p>
              <p className="mt-1 text-xs text-muted-foreground">{pendingMembers} pending · {suspendedMembers} suspended</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/65 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Audit</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{loading ? '…' : `${auditEvents.length} events`}</p>
              <p className="mt-1 text-xs text-muted-foreground">Append-only IAM log</p>
            </div>
          </div>
        </section>

        {error ? (
          <div role="alert" className="rounded-2xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-3">
          {summaryCards.map((card) => (
            <Card key={card.title} className="surface-solid">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                  <card.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <CardDescription>{card.title}</CardDescription>
                  <CardTitle className="mt-1 truncate text-base capitalize">{loading ? 'Loading…' : card.value}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">{card.detail}</CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(21rem,0.78fr)_minmax(0,1.22fr)]">
          <Card className="surface-solid">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><UserRound className="size-4 text-primary" />Tài khoản của tôi</CardTitle>
              <CardDescription>Email read-only; display name có audit event khi cập nhật.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={saveProfile}>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="account-display-name">Tên hiển thị</Label>
                    <Input id="account-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={loading || saving} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-email">Email</Label>
                    <Input id="account-email" value={email} readOnly aria-describedby="account-email-help" />
                    <p id="account-email-help" className="text-xs text-muted-foreground">Liên hệ admin để đổi email.</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Role</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{roleLabel}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Permission mode</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{session?.canWrite ? 'Read/write' : 'Read-only'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="submit" disabled={!isDirty || saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Lưu hồ sơ
                  </Button>
                  <Button type="button" variant="outline" disabled={!isDirty || saving} onClick={() => setDisplayName(account?.principal.display_name || user?.fullName || '')}>
                    <RotateCcw className="size-4" />
                    Hoàn tác
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card id="members" className="surface-solid overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><UsersRound className="size-4 text-primary" />Workspace access</CardTitle>
                  <CardDescription>Invite, deactivate, reactivate; last-admin guardrail enforce ở backend.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{activeMembers} active</Badge>
                  <Badge variant="secondary">{pendingMembers} pending</Badge>
                  <Badge variant={suspendedMembers ? 'destructive' : 'outline'}>{suspendedMembers} suspended</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManageMembers ? (
                <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px_auto]" onSubmit={inviteMember}>
                  <Input type="email" placeholder="operator@company.com" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} aria-label="Invite member email" />
                  <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as AccountRoleKey)} aria-label="Invite role">
                    <option value="operator">Operator</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                    Mời
                  </Button>
                </form>
              ) : null}

              <div className="space-y-2">
                {members.length ? members.map((member) => {
                  const isSuspended = member.membership.status === 'suspended';
                  const action = isSuspended ? 'reactivate' : 'deactivate';
                  const currentActionId = `${member.membership.id}:${action}`;
                  return (
                    <div key={member.membership.id} className="rounded-2xl border border-border/70 bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{member.principal.display_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{member.principal.email}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-[10px]">{formatRole(member.membership.role_key)}</Badge>
                            <Badge variant={isSuspended ? 'destructive' : member.membership.status === 'invited' ? 'secondary' : 'default'} className="text-[10px]">{member.membership.status}</Badge>
                          </div>
                        </div>
                        {canManageMembers && !member.invitation ? (
                          <Button type="button" size="sm" variant="outline" disabled={actionId === currentActionId} onClick={() => updateMemberStatus(member.membership.id, action)}>
                            {actionId === currentActionId ? <Loader2 className="size-3.5 animate-spin" /> : isSuspended ? <CheckCircle2 className="size-3.5" /> : <Ban className="size-3.5" />}
                            {isSuspended ? 'Reactivate' : 'Deactivate'}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    {loading ? 'Đang tải members…' : 'Chưa có thành viên nào. Mời operator đầu tiên.'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card id="security" className="surface-solid">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="size-4 text-primary" />Bảo mật</CardTitle>
              <CardDescription>Password/session center vẫn chờ stateful session store.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Account APIs hiện có audit, role definitions, team invites và profile update. Session revoke chưa bật vì bearer token vẫn stateless.</p>
              <div className="rounded-2xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-amber-900">Guardrail: demo credentials chỉ phù hợp local/private demo, không dùng production.</div>
            </CardContent>
          </Card>

          <Card className="surface-solid">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Activity className="size-4 text-primary" />Hoạt động gần đây</CardTitle>
              <CardDescription>Append-only account audit events từ backend IAM endpoints.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditEvents.length ? auditEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-foreground">{event.action}</span>
                      <Badge variant="outline" className="text-[10px]">{event.result}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{event.target_type} · {new Date(event.created_at).toLocaleString()}</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">{loading ? 'Đang tải audit…' : 'Chưa có hoạt động gần đây.'}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
