import { useEffect, useState } from 'react';
import { Activity, Loader2, PauseCircle, RefreshCw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { conversationApi, type Channel, type Strategy } from '@/lib/conversation-channels-api';

interface ConfigureChannelDrawerProps {
  channel: Channel | null;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

export default function ConfigureChannelDrawer({ channel, onClose, onChanged }: ConfigureChannelDrawerProps) {
  const [label, setLabel] = useState('');
  const [strategy, setStrategy] = useState<Strategy>('ROUND_ROBIN');
  const [team, setTeam] = useState('team_cs_01');
  const [sla, setSla] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!channel) return;
    setLabel(channel.display_name);
    setStrategy(channel.routing.strategy);
    setTeam(channel.routing.target_team_id);
    setSla(channel.routing.sla_threshold_minutes);
  }, [channel]);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await action();
      await onChanged();
      toast({ title: success });
    } catch (error) {
      toast({ title: 'Action failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  if (!channel) return null;

  return (
    <Sheet open={Boolean(channel)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-[600px]">
        <SheetHeader className="border-b border-border px-6 py-5 pr-12">
          <SheetTitle>Configure {channel.display_name}</SheetTitle>
          <SheetDescription>Review webhook health, routing ownership, and connection controls.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Sync health diagnostics</h3><span className={`text-xs font-semibold ${channel.webhook_health === 'HEALTHY' ? 'text-emerald-600' : 'text-amber-600'}`}>{channel.webhook_health}</span></div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Webhook latency</dt><dd className="mt-1 font-semibold tabular-nums">{channel.webhook_latency_ms == null ? '—' : `${channel.webhook_latency_ms} ms`}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Last ping</dt><dd className="mt-1 font-semibold">{new Date(channel.last_ping_at).toLocaleString()}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Token expires</dt><dd className="mt-1 font-semibold">{new Date(channel.token_expires_at).toLocaleDateString()}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => run('reauthorize', () => conversationApi.reauthorize(channel.id), 'Store authorization refreshed')} disabled={Boolean(busy)}><RefreshCw className={`size-4 ${busy === 'reauthorize' ? 'animate-spin' : ''}`} />Re-authenticate Store</Button>
              <Button variant="outline" size="sm" onClick={() => run('ping', () => conversationApi.ping(channel.id), 'Webhook signal is healthy')} disabled={Boolean(busy)}><Activity className="size-4" />Test Webhook Signal</Button>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Channel & routing</h3>
            <label className="block space-y-2"><span className="text-xs font-semibold text-muted-foreground">Channel label</span><Input value={label} onChange={(event) => setLabel(event.target.value)} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2"><span className="text-xs font-semibold text-muted-foreground">Routing strategy</span><Select value={strategy} onValueChange={(value) => setStrategy(value as Strategy)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ROUND_ROBIN">Round-Robin</SelectItem><SelectItem value="TEAM_QUEUE">Team Queue</SelectItem></SelectContent></Select></label>
              <label className="space-y-2"><span className="text-xs font-semibold text-muted-foreground">Destination team</span><Select value={team} onValueChange={setTeam}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="team_cs_01">Customer Success</SelectItem><SelectItem value="team_social_cs">Social Care</SelectItem><SelectItem value="team_marketplace_cs">Marketplace Support</SelectItem></SelectContent></Select></label>
            </div>
            <label className="block space-y-2"><span className="text-xs font-semibold text-muted-foreground">SLA threshold (minutes)</span><Input type="number" min={1} value={sla} onChange={(event) => setSla(Number(event.target.value))} /></label>
            <Button onClick={() => run('save', () => conversationApi.update(channel.id, { display_name: label, routing: { strategy, target_team_id: team, sla_threshold_minutes: sla } }), 'Channel configuration saved')} disabled={!label.trim() || Boolean(busy)}>{busy === 'save' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save changes</Button>
          </section>

          <section className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900 dark:bg-rose-950/20">
            <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">Danger zone</h3>
            <p className="mt-1 text-xs text-muted-foreground">Pause message ingestion temporarily, or disconnect this source from Prime Inbox.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => run('pause', () => conversationApi.pause(channel.id), channel.status === 'PAUSED' ? 'Channel resumed' : 'Channel paused')} disabled={Boolean(busy)}><PauseCircle className="size-4" />{channel.status === 'PAUSED' ? 'Resume Sync' : 'Pause Sync'}</Button>
              <Button variant="destructive" size="sm" onClick={() => { if (window.confirm(`Disconnect ${channel.display_name}?`)) run('delete', () => conversationApi.remove(channel.id), 'Channel disconnected').then(onClose); }} disabled={Boolean(busy)}><Trash2 className="size-4" />Disconnect Channel</Button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
