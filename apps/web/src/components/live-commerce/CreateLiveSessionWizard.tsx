import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, PackageCheck, RadioTower } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { liveCommerceApi, type AutoReleasePolicy, type LiveOptions } from '@/lib/live-commerce-api';
import { cn } from '@/lib/utils';

type Allocation = { selected: boolean; allocated_qty: number; live_price: number };
const nextHour = () => { const date = new Date(Date.now() + 60 * 60 * 1000); date.setMinutes(0, 0, 0); return date.toISOString().slice(0, 16); };

export function CreateLiveSessionWizard({ open, onOpenChange, options, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; options: LiveOptions | null; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState(options?.inventory ?? []);
  const [form, setForm] = useState({ title: '', channel_id: options?.channels[0]?.id ?? '', host_name: '', warehouse_id: options?.warehouses[0]?.id ?? '', scheduled_start_at: nextHour(), duration_hours: 2, auto_release_policy: 'IMMEDIATE_ON_END' as AutoReleasePolicy, enable_safety_buffer: true });
  const [allocations, setAllocations] = useState<Record<string, Allocation>>({});

  useEffect(() => { if (options && !form.channel_id) setForm((value) => ({ ...value, channel_id: options.channels[0]?.id ?? '', warehouse_id: options.warehouses[0]?.id ?? '' })); }, [options, form.channel_id]);
  useEffect(() => { if (!form.warehouse_id || !open) return; liveCommerceApi.options(form.warehouse_id).then(({ data }) => { setInventory(data.inventory); setAllocations({}); }).catch((error) => toast.error(error.message)); }, [form.warehouse_id, open]);

  const selected = useMemo(() => inventory.filter((sku) => allocations[sku.sku_id]?.selected), [inventory, allocations]);
  const totalUnits = selected.reduce((sum, sku) => sum + (allocations[sku.sku_id]?.allocated_qty || 0), 0);
  const totalValue = selected.reduce((sum, sku) => sum + (allocations[sku.sku_id]?.allocated_qty || 0) * (allocations[sku.sku_id]?.live_price || 0), 0);
  const basicValid = Boolean(form.title.trim() && form.channel_id && form.host_name.trim() && form.warehouse_id && form.scheduled_start_at && form.duration_hours > 0);
  const allocationValid = selected.length > 0 && selected.every((sku) => { const allocation = allocations[sku.sku_id]; return allocation.allocated_qty > 0 && allocation.allocated_qty <= sku.available_atp && allocation.live_price >= 0; });
  const patchAllocation = (skuId: string, patch: Partial<Allocation>) => setAllocations((current) => ({ ...current, [skuId]: { selected: false, allocated_qty: 0, live_price: 0, ...current[skuId], ...patch } }));

  const submit = async () => {
    if (!allocationValid) return;
    setSaving(true);
    try {
      await liveCommerceApi.create({ ...form, scheduled_start_at: new Date(form.scheduled_start_at).toISOString(), allocated_items: selected.map((sku) => ({ sku_id: sku.sku_id, allocated_qty: allocations[sku.sku_id].allocated_qty, live_price: allocations[sku.sku_id].live_price })) });
      toast.success('Stock reserved and live session published.');
      onOpenChange(false); onCreated(); setStep(1); setAllocations({});
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create live session.'); } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
    <DialogHeader className="border-b border-border px-6 py-5"><DialogTitle>Create Live Session</DialogTitle><DialogDescription>Reserve physical ATP before publishing the session to a live channel.</DialogDescription></DialogHeader>
    <div className="grid grid-cols-3 border-b border-border bg-muted/30 px-6">{['Basic Info', 'Stock Allocation', 'Release Policy'].map((label, index) => { const number = index + 1; return <div key={label} className={cn('flex items-center gap-2 border-b-2 px-2 py-3 text-sm font-medium', step === number ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground')}><span className={cn('grid size-6 place-items-center rounded-full text-xs', step > number ? 'bg-emerald-100 text-emerald-700' : step === number ? 'bg-indigo-100 text-indigo-700' : 'bg-muted')}>{step > number ? <Check className="size-3.5" /> : number}</span>{label}</div>; })}</div>
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      {step === 1 ? <div className="grid gap-5 md:grid-cols-2">
        <Field label="Session title" className="md:col-span-2"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="9.9 Super Shopping Day Mega Live" /></Field>
        <Field label="Channel"><Select value={form.channel_id} onValueChange={(value) => setForm({ ...form, channel_id: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options?.channels.map((channel) => <SelectItem key={channel.id} value={channel.id}>{channel.name} · {channel.account_name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Host name"><Input value={form.host_name} onChange={(e) => setForm({ ...form, host_name: e.target.value })} placeholder="Linh Nguyen" /></Field>
        <Field label="Physical warehouse"><Select value={form.warehouse_id} onValueChange={(value) => setForm({ ...form, warehouse_id: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options?.warehouses.map((warehouse) => <SelectItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Scheduled start"><Input type="datetime-local" value={form.scheduled_start_at} onChange={(e) => setForm({ ...form, scheduled_start_at: e.target.value })} /></Field>
        <Field label="Duration (hours)"><Input type="number" min={0.5} max={24} step={0.5} value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })} /></Field>
      </div> : null}
      {step === 2 ? <div className="space-y-4"><div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 dark:bg-indigo-950/30"><div><p className="font-semibold text-foreground">{selected.length} SKUs selected · <span className="tabular-nums">{totalUnits.toLocaleString()} units</span></p><p className="mt-1 text-xs text-muted-foreground">Maximum reservation is limited by current warehouse ATP.</p></div><p className="text-sm font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">Potential GMV ₫{totalValue.toLocaleString()}</p></div><div className="overflow-hidden rounded-xl border border-border"><table className="w-full min-w-[700px]"><thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"><tr><th className="w-12 px-4 py-3"/><th className="px-3 py-3">Product / SKU</th><th className="px-3 py-3 text-right">Available ATP</th><th className="px-3 py-3">Allocated Qty</th><th className="px-4 py-3">Live Price</th></tr></thead><tbody className="divide-y divide-border">{inventory.map((sku) => { const allocation = allocations[sku.sku_id] || { selected: false, allocated_qty: 0, live_price: sku.base_price }; const invalid = allocation.selected && allocation.allocated_qty > sku.available_atp; return <tr key={sku.sku_id} className="hover:bg-muted/30"><td className="px-4 py-3"><Checkbox checked={allocation.selected} onCheckedChange={(checked) => patchAllocation(sku.sku_id, { selected: checked === true, live_price: allocation.live_price || sku.base_price })} /></td><td className="px-3 py-3"><p className="text-sm font-semibold text-foreground">{sku.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{sku.sku_id} · {sku.variant}</p></td><td className="px-3 py-3 text-right text-sm font-semibold tabular-nums">{sku.available_atp.toLocaleString()}</td><td className="w-40 px-3 py-3"><Input type="number" min={1} max={sku.available_atp} disabled={!allocation.selected} value={allocation.allocated_qty || ''} onChange={(e) => patchAllocation(sku.sku_id, { allocated_qty: Number(e.target.value) })} className={cn(invalid && 'border-destructive')} />{invalid ? <p className="mt-1 text-xs text-destructive">Exceeds ATP</p> : null}</td><td className="w-44 px-4 py-3"><Input type="number" min={0} disabled={!allocation.selected} value={allocation.live_price || ''} onChange={(e) => patchAllocation(sku.sku_id, { live_price: Number(e.target.value) })} /></td></tr>; })}</tbody></table></div></div> : null}
      {step === 3 ? <div className="space-y-6"><div><h3 className="font-semibold text-foreground">Auto-release unsold stock</h3><p className="mt-1 text-sm text-muted-foreground">Choose when unsold reservations return to the warehouse ATP pool.</p></div><RadioGroup value={form.auto_release_policy} onValueChange={(value) => setForm({ ...form, auto_release_policy: value as AutoReleasePolicy })} className="grid gap-3">{[{ value: 'IMMEDIATE_ON_END', title: 'Release immediately when session ends', text: 'Best for fast stock recovery across other channels.' }, { value: 'HOLD_2_HOURS', title: 'Hold stock for 2 hours', text: 'Allows late payment and post-live checkout completion.' }, { value: 'MANUAL_RELEASE', title: 'Manual release', text: 'Keep reservations until an operator reviews the session.' }].map((policy) => <label key={policy.value} className={cn('flex cursor-pointer gap-3 rounded-xl border p-4', form.auto_release_policy === policy.value ? 'border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/30' : 'border-border hover:bg-muted/30')}><RadioGroupItem value={policy.value} className="mt-0.5"/><span><span className="block text-sm font-semibold text-foreground">{policy.title}</span><span className="mt-1 block text-xs text-muted-foreground">{policy.text}</span></span></label>)}</RadioGroup><div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4"><div><p className="text-sm font-semibold text-foreground">Enable 98% safety buffer</p><p className="mt-1 text-xs text-muted-foreground">Stops live sales before all allocated units are consumed to reduce overselling risk.</p></div><Switch checked={form.enable_safety_buffer} onCheckedChange={(checked) => setForm({ ...form, enable_safety_buffer: checked })} /></div><div className="rounded-xl border border-border bg-muted/30 p-4 text-sm"><div className="flex items-center gap-2 font-semibold"><PackageCheck className="size-4 text-emerald-600"/>Ready to reserve {totalUnits.toLocaleString()} units</div><p className="mt-1 text-xs text-muted-foreground">{selected.length} SKUs from {options?.warehouses.find((w) => w.id === form.warehouse_id)?.name}.</p></div></div> : null}
    </div>
    <DialogFooter className="border-t border-border px-6 py-4"><Button type="button" variant="outline" onClick={() => step === 1 ? onOpenChange(false) : setStep(step - 1)}>{step > 1 ? <ArrowLeft className="size-4"/> : null}{step === 1 ? 'Cancel' : 'Back'}</Button>{step < 3 ? <Button type="button" disabled={step === 1 ? !basicValid : !allocationValid} onClick={() => setStep(step + 1)}>Continue<ArrowRight className="size-4"/></Button> : <Button type="button" disabled={saving || !allocationValid} onClick={submit}><RadioTower className="size-4"/>{saving ? 'Publishing…' : 'Reserve Stock & Publish'}</Button>}</DialogFooter>
  </DialogContent></Dialog>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <label className={cn('space-y-2', className)}><span className="text-sm font-semibold text-foreground">{label}</span>{children}</label>; }
