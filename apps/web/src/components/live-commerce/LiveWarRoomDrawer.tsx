import { useEffect, useMemo, useState } from 'react';
import { Activity, CircleDollarSign, PackagePlus, RadioTower, ShoppingBag, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { liveCommerceApi, type LiveEvent, type LiveOptions, type LiveSession } from '@/lib/live-commerce-api';
import { getPrimeAuthToken, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';

export function LiveWarRoomDrawer({ session, open, onOpenChange, options, onChanged }: { session: LiveSession | null; open: boolean; onOpenChange: (open: boolean) => void; options: LiveOptions | null; onChanged: () => void }) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [skuId, setSkuId] = useState('');
  const [qty, setQty] = useState(50);
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<'connecting' | 'live' | 'fallback'>('connecting');
  useEffect(() => {
    if (!open || !session) return;
    let active = true;
    let timer = 0;
    const load = () => liveCommerceApi.events(session.id).then(({ data }) => { if (active) setEvents(data); }).catch(() => undefined);
    void load();
    const token = getPrimeAuthToken();
    const wsBase = resolvePrimeBackendBase().replace(/^http/, 'ws') || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    const socket = token ? new WebSocket(`${wsBase}/api/v1/live-sessions/${encodeURIComponent(session.id)}/stream?token=${encodeURIComponent(token)}`) : null;
    if (socket) {
      socket.onopen = () => active && setConnection('live');
      socket.onmessage = (message) => { try { const event = JSON.parse(message.data) as LiveEvent & { type: string }; if (event.id) setEvents((current) => [event, ...current].slice(0, 20)); } catch { /* ignore malformed event */ } };
      socket.onerror = () => { if (active) { setConnection('fallback'); timer = window.setInterval(load, 5000); } };
    } else { setConnection('fallback'); timer = window.setInterval(load, 5000); }
    return () => { active = false; if (timer) window.clearInterval(timer); socket?.close(); };
  }, [open, session]);
  const inventory = useMemo(() => options?.inventory ?? [], [options]);
  if (!session) return null;
  const topUp = async () => { if (!skuId || qty <= 0) return; setBusy(true); try { await liveCommerceApi.topUp(session.id, { sku_id: skuId, additional_qty: qty }); toast.success(`${qty} units added to the live reservation.`); onChanged(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to top up stock.'); } finally { setBusy(false); } };
  const end = async () => { if (!window.confirm('End this session and apply its stock release policy?')) return; setBusy(true); try { await liveCommerceApi.end(session.id); toast.success('Live session ended.'); onOpenChange(false); onChanged(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to end session.'); } finally { setBusy(false); } };
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px]"><SheetHeader className="border-b border-border px-6 py-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75"/><span className="relative inline-flex size-2 rounded-full bg-rose-600"/></span>Live war room · {connection === 'live' ? 'WebSocket connected' : connection === 'fallback' ? 'Polling fallback' : 'Connecting'}</div><SheetTitle className="pr-8">{session.title}</SheetTitle><SheetDescription>{session.channel?.name} · Host {session.host_name} · {session.warehouse?.name}</SheetDescription></SheetHeader><div className="min-h-0 flex-1 overflow-y-auto p-6"><div className="grid grid-cols-3 gap-3">{[{ label: 'Orders', value: session.orders_count.toLocaleString(), icon: ShoppingBag }, { label: 'Revenue', value: `₫${session.attributed_revenue.toLocaleString()}`, icon: CircleDollarSign }, { label: 'Stock used', value: `${session.sold_qty}/${session.allocated_qty}`, icon: Activity }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-border bg-card p-4"><Icon className="size-4 text-indigo-500"/><p className="mt-3 text-xl font-bold tabular-nums text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}</div><section className="mt-5 rounded-xl border border-border"><div className="border-b border-border p-4"><h3 className="font-semibold text-foreground">Real-time order stream</h3><p className="mt-1 text-xs text-muted-foreground">Authenticated WebSocket feed with automatic REST polling fallback.</p></div><div className="divide-y divide-border">{events.map((event) => <div key={event.id} className="flex items-start gap-3 p-4"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"><RadioTower className="size-4"/></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">{event.message}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(event.occurred_at).toLocaleTimeString()}</p></div>{event.amount ? <span className="text-sm font-semibold tabular-nums text-foreground">₫{event.amount.toLocaleString()}</span> : null}</div>)}</div></section><section className="mt-5 rounded-xl border border-border p-4"><div className="flex items-center gap-2"><PackagePlus className="size-4 text-indigo-500"/><h3 className="font-semibold text-foreground">Top up reserved stock</h3></div><p className="mt-1 text-xs text-muted-foreground">Additional stock is deducted from the assigned warehouse ATP immediately.</p><div className="mt-4 grid grid-cols-[1fr_120px_auto] gap-2"><Select value={skuId} onValueChange={setSkuId}><SelectTrigger><SelectValue placeholder="Select SKU"/></SelectTrigger><SelectContent>{inventory.map((sku) => <SelectItem key={sku.sku_id} value={sku.sku_id}>{sku.sku_id} · ATP {sku.available_atp}</SelectItem>)}</SelectContent></Select><Input type="number" min={1} value={qty} onChange={(event) => setQty(Number(event.target.value))}/><Button onClick={topUp} disabled={!skuId || busy}>Top up</Button></div></section></div><div className="flex items-center justify-between border-t border-border bg-background px-6 py-4"><p className="text-xs text-muted-foreground">Release: {session.auto_release_policy.replaceAll('_', ' ')}</p><Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40" onClick={end} disabled={busy}><StopCircle className="size-4"/>End Session</Button></div></SheetContent></Sheet>;
}
