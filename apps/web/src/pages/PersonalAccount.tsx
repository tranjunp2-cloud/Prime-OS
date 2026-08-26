import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, KeyRound, Laptop, Loader2, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createPrimeAuthHeaders, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

interface PersonalAccountEnvelope {
  principal: { email: string; display_name: string; auth_methods: string[] };
  membership: { role_key: string; seat_type: string | null; last_active_at: string | null };
  workspace: { name: string };
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'PO';
}

export function PersonalAccountPanel({ embedded = false }: { embedded?: boolean }) {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [account, setAccount] = useState<PersonalAccountEnvelope | null>(null);
  const [displayName, setDisplayName] = useState(user?.fullName || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productUpdates, setProductUpdates] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  const request = useMemo(() => async <T,>(path: string, init?: RequestInit) => {
    const headers = createPrimeAuthHeaders(token);
    if (init?.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${resolvePrimeBackendBase()}${path}`, { ...init, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error?.message || body.message || 'Account request failed.');
    return body as T;
  }, [token]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    request<{ data: PersonalAccountEnvelope }>('/api/v1/me')
      .then(({ data }) => { setAccount(data); setDisplayName(data.principal.display_name); })
      .catch((error) => toast({ variant: 'destructive', title: 'Unable to load account', description: error instanceof Error ? error.message : 'Please try again.' }))
      .finally(() => setLoading(false));
  }, [request, toast, token]);

  const currentName = account?.principal.display_name || user?.fullName || 'PrimeOS User';
  const email = account?.principal.email || user?.email || 'user@primeos.local';
  const isDirty = Boolean(displayName.trim() && displayName.trim() !== currentName);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!isDirty) return;
    setSaving(true);
    try {
      const { data } = await request<{ data: PersonalAccountEnvelope }>('/api/v1/me', { method: 'PATCH', body: JSON.stringify({ display_name: displayName.trim() }) });
      setAccount(data);
      setDisplayName(data.principal.display_name);
      toast({ title: 'Profile updated' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Unable to save profile', description: error instanceof Error ? error.message : 'Please try again.' });
    } finally { setSaving(false); }
  };

  return <div className={embedded ? 'space-y-5' : 'min-h-full bg-[hsl(var(--surface-stage))] p-4 pb-24 md:p-6'}>
    <div className={embedded ? 'space-y-5' : 'mx-auto max-w-5xl space-y-5'}>
      {!embedded ? <header className="border-b pb-5">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl border bg-card text-primary"><UserRound className="size-5" /></span><div><h1 className="text-2xl font-bold tracking-tight">My Account</h1><p className="text-sm text-muted-foreground">Manage your personal profile, sign-in security, sessions, and preferences.</p></div></div>
      </header> : <div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><UserRound className="size-5" /></span><div><h2 className="font-semibold">My profile & preferences</h2><p className="text-sm text-muted-foreground">Personal settings apply only to your own Prime OS account.</p></div></div></div>}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
        <Card><CardHeader><CardTitle>Personal profile</CardTitle><CardDescription>This information identifies you across Prime OS workspaces.</CardDescription></CardHeader><CardContent><form className="space-y-5" onSubmit={saveProfile}><div className="flex items-center gap-4 rounded-xl border bg-muted/20 p-4"><span className="grid size-14 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">{initials(currentName)}</span><div className="min-w-0"><p className="truncate font-semibold">{currentName}</p><p className="truncate text-sm text-muted-foreground">{email}</p><Badge variant="outline" className="mt-2">{account?.workspace.name || user?.workspace || 'PrimeOS workspace'}</Badge></div></div><div className="space-y-2"><Label htmlFor="personal-display-name">Display name</Label><Input id="personal-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={loading || saving} /></div><div className="space-y-2"><Label>Email address</Label><Input value={email} disabled /><p className="text-xs text-muted-foreground">Contact an administrator to change your work email.</p></div><div className="flex justify-end"><Button type="submit" disabled={!isDirty || saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Save profile</Button></div></form></CardContent></Card>

        <div className="space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" />Sign-in security</CardTitle><CardDescription>Security settings for your own account only.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="rounded-lg border p-3"><p className="text-sm font-semibold">Authentication</p><p className="mt-1 text-xs text-muted-foreground">{account?.principal.auth_methods?.join(', ') || 'Password'}</p></div><Button variant="outline" className="w-full justify-start" onClick={() => toast({ title: 'MFA setup opened', description: 'Connect an authenticator to protect your account.' })}><KeyRound className="size-4" />Set up two-factor authentication</Button></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Laptop className="size-5 text-primary" />Active session</CardTitle></CardHeader><CardContent><div className="rounded-lg border p-3"><p className="text-sm font-semibold">This browser</p><p className="mt-1 text-xs text-muted-foreground">Last active {account?.membership.last_active_at ? new Date(account.membership.last_active_at).toLocaleString() : 'now'}</p></div><Button variant="outline" className="mt-3 w-full justify-start text-destructive hover:text-destructive"><LogOut className="size-4" />Sign out other sessions</Button></CardContent></Card>
        </div>
      </section>

      <Card><CardHeader><CardTitle>Personal preferences</CardTitle><CardDescription>Language, regional display, and notifications for your account.</CardDescription></CardHeader><CardContent><div className="grid gap-4 border-b pb-5 sm:grid-cols-2"><div className="space-y-2"><Label>Language</Label><Input value="English" disabled /><p className="text-xs text-muted-foreground">English is the default Prime OS language.</p></div><div className="space-y-2"><Label>Time zone</Label><Input value="Asia/Ho Chi Minh (GMT+7)" disabled /></div></div><div className="divide-y"><label className="flex min-h-16 items-center justify-between gap-4"><span><span className="block text-sm font-medium">Security alerts</span><span className="block text-xs text-muted-foreground">Receive alerts about new sign-ins and security changes.</span></span><Switch checked={securityAlerts} onCheckedChange={setSecurityAlerts} /></label><label className="flex min-h-16 items-center justify-between gap-4"><span><span className="block text-sm font-medium">Product updates</span><span className="block text-xs text-muted-foreground">Receive release notes and feature announcements.</span></span><Switch checked={productUpdates} onCheckedChange={setProductUpdates} /></label></div></CardContent></Card>
    </div>
  </div>;
}

export default function PersonalAccount() {
  return <PersonalAccountPanel />;
}
