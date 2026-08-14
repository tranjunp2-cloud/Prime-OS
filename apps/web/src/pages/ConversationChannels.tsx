import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Link2, Loader2, MessageCircle, PauseCircle, Settings2 } from 'lucide-react';
import ConfigureChannelDrawer from '@/components/conversation-channels/ConfigureChannelDrawer';
import ConnectConversationModal from '@/components/conversation-channels/ConnectConversationModal';
import { SourceIcon } from '@/components/conversation-channels/Step1SelectSource';
import { Button } from '@/components/ui/button';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { toast } from '@/hooks/use-toast';
import { conversationApi, type Channel } from '@/lib/conversation-channels-api';

const statusStyles: Record<Channel['status'], string> = {
  CONNECTED: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
  NEEDS_REVIEW: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
  PAUSED: 'border-border bg-muted text-muted-foreground',
};
const statusLabels: Record<Channel['status'], string> = { CONNECTED: 'Connected', NEEDS_REVIEW: 'Needs review', PAUSED: 'Paused' };

export default function ConversationChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);
  const [selected, setSelected] = useState<Channel | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await conversationApi.list();
      setChannels(response.data);
      setSelected((current) => current ? response.data.find((item) => item.id === current.id) || null : null);
    } catch (error) {
      toast({ title: 'Could not load conversation channels', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => ({
    connected: channels.filter((item) => item.status === 'CONNECTED').length,
    attention: channels.filter((item) => item.status === 'NEEDS_REVIEW').length,
    paused: channels.filter((item) => item.status === 'PAUSED').length,
  }), [channels]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <WorkspacePageHeader
        title="Conversation Channels"
        description="Connect chat and comment sources used by Prime Inbox. Commerce store synchronization remains in Connected Channels."
        icon={MessageCircle}
        actions={<Button onClick={() => setConnectOpen(true)}><Link2 className="size-4" />Connect Conversation Channel</Button>}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected sources</p><Activity className="size-4 text-emerald-500" /></div><p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{counts.connected}</p></article>
        <article className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Needs review</p><AlertTriangle className="size-4 text-amber-500" /></div><p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{counts.attention}</p></article>
        <article className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paused</p><PauseCircle className="size-4 text-muted-foreground" /></div><p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{counts.paused}</p></article>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold text-foreground">Prime Inbox sources</h2><p className="mt-1 text-xs text-muted-foreground">Message ingestion, assignment, and webhook health for every active source.</p></div>
        {loading ? <div className="grid min-h-40 place-items-center"><Loader2 className="size-5 animate-spin text-indigo-500" /></div> : (
          <div className="divide-y divide-border">
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/25">
                <SourceIcon label={channel.display_name} tone={channel.platform.includes('SHOPEE') ? 'orange' : channel.platform.includes('TIKTOK') ? 'slate' : 'indigo'} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{channel.display_name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{channel.account_name} · {channel.latency_status}</p></div>
                <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${statusStyles[channel.status]}`}><span className="size-1.5 rounded-full bg-current" />{statusLabels[channel.status]}</span>
                <Button variant="outline" size="sm" onClick={() => setSelected(channel)}><Settings2 className="size-4" />Configure</Button>
              </div>
            ))}
            {!channels.length ? <div className="p-8 text-center text-sm text-muted-foreground">No sources connected. Connect a channel to start receiving conversations.</div> : null}
          </div>
        )}
        <div className="border-t border-border p-4"><Button onClick={() => setConnectOpen(true)}><Link2 className="size-4" />Connect Conversation Channel</Button></div>
      </section>

      <ConnectConversationModal open={connectOpen} onOpenChange={setConnectOpen} onLinked={load} />
      <ConfigureChannelDrawer channel={selected} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}
