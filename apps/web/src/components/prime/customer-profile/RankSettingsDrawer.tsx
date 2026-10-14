import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { customerMoney, type OrderCustomer } from '@/lib/order-customers';
import { customerRank, defaultRankConfig, rankCalculationDescription, rankConfigErrors, rankKeys, rankLabels, type RankConfig, type RankSettings, type RankState } from '@/lib/customer-ranks';
import { RankLabel } from './CustomerRankBadge';

interface Props {
  settings: RankSettings;
  customers: OrderCustomer[];
  canManage: boolean;
  onClose: () => void;
  onSave: (config: RankConfig, revision: number) => Promise<void>;
}

export function RankSettingsDrawer({ settings, customers, canManage, onClose, onSave }: Props) {
  const [initial] = useState(settings);
  const [draft, setDraft] = useState({ silver: String((settings.config || defaultRankConfig).silver), gold: String((settings.config || defaultRankConfig).gold), vip: String((settings.config || defaultRankConfig).vip) });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [hasEdits, setHasEdits] = useState(false);
  const opener = useRef(document.activeElement as HTMLElement | null);
  const previewRef = useRef<HTMLDivElement>(null);
  // Applying thresholds enables ranking; opening or cancelling never saves.
  const config: RankConfig = useMemo(() => ({ enabled: true, currency: 'VND', silver: Number(draft.silver), gold: Number(draft.gold), vip: Number(draft.vip) }), [draft]);
  const errors = rankConfigErrors(config);
  const valid = !Object.keys(errors).length;
  const dirty = JSON.stringify(config) !== JSON.stringify(initial.config);
  const stale = settings.revision !== initial.revision;
  const editable = canManage && !settings.error && !stale && !saving;
  const impact = useMemo(() => customers.map(customer => ({ id: customer.id, name: customer.name, before: customerRank(customer, initial.config), after: customerRank(customer, config) })), [customers, initial.config, config]);
  const previewKey = JSON.stringify([config, impact]);
  const previewed = preview === previewKey;
  const changes = impact.filter(item => item.before.key !== item.after.key);
  const excluded = impact.reduce((sum, item) => sum + item.after.excluded.length, 0);
  const states: RankState[] = [...rankKeys];

  function close() {
    if (saving) return;
    if (dirty && hasEdits && canManage) setConfirmClose(true); else onClose();
  }
  function update(field: keyof typeof draft, value: string) {
    setDraft(current => ({ ...current, [field]: value })); setHasEdits(true); setPreview(''); setSaveError('');
  }
  async function apply() {
    if (!editable || !valid || !dirty || !previewed) return;
    setSaving(true); setSaveError('');
    try { await onSave(config, initial.revision); onClose(); }
    catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not save in this browser. Check storage access and try again.'); }
    finally { setSaving(false); }
  }

  return <>
    <Sheet open onOpenChange={open => { if (!open) close(); }}><SheetContent onCloseAutoFocus={event => { if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus(); } }} className="flex w-full flex-col gap-0 p-0 sm:max-w-[640px] [&>button]:grid [&>button]:size-11 [&>button]:place-items-center motion-reduce:animate-none motion-reduce:transition-none">
      <SheetHeader className="border-b p-5 pr-16 text-left sm:p-6 sm:pr-16"><SheetTitle>Rank settings</SheetTitle><SheetDescription>Turn purchase history into clear customer ranks.</SheetDescription></SheetHeader>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
        {!initial.config && <p className="text-sm text-muted-foreground">No rules have been applied yet.{canManage ? ' The amounts below are suggested demo thresholds. Preview and apply them to start.' : ' Ask an admin to configure ranking.'}</p>}
        {!canManage && <p role="status" className="text-sm text-muted-foreground">View only. An admin can change rank settings.</p>}
        {(settings.error || stale) && <p role="alert" className="text-sm text-destructive">{settings.error || 'Settings changed in another tab. Close and reopen to review the latest rules.'}</p>}
          <dl className="grid grid-cols-3 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Based on</dt><dd className="mt-1 font-medium">Qualifying spend</dd></div><div><dt className="text-xs text-muted-foreground">Period</dt><dd className="mt-1 font-medium">Lifetime</dd></div><div><dt className="text-xs text-muted-foreground">Currency</dt><dd className="mt-1 font-medium">VND</dd></div></dl>
          <section aria-label="Rank thresholds"><h3 className="text-sm font-semibold">Minimum spend by rank</h3><p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">Enter minimum amounts. Upper limits are calculated automatically, so ranges never overlap.</p>
            <div className="divide-y rounded-lg border">
              <div className="flex items-center justify-between gap-3 p-3"><RankLabel rank="unranked" /><span className="text-xs text-muted-foreground">No qualifying spend</span></div>
              <div className="flex items-center justify-between gap-3 p-3"><RankLabel rank="bronze" /><span className="text-xs text-muted-foreground">Above ₫0{valid ? ` · Below ${customerMoney(config.silver, 'VND')}` : ''}</span></div>
              {(['silver', 'gold', 'vip'] as const).map(key => <div key={key} className="p-3"><div className="flex items-center justify-between gap-3"><label htmlFor={`rank-${key}`}><RankLabel rank={key} /></label><div className="w-44 max-w-[60%]"><Input id={`rank-${key}`} aria-label={`${rankLabels[key]} minimum spend (VND)`} type="number" inputMode="numeric" min="1" max="1000000000000" step="1" value={draft[key]} disabled={!editable} onChange={event => update(key, event.target.value)} onBlur={() => setTouched(current => ({ ...current, [key]: true }))} aria-invalid={Boolean(touched[key] && errors[key])} aria-describedby={errors[key] && touched[key] ? `rank-${key}-error` : undefined} className="h-11 text-right tabular-nums" /></div></div>{touched[key] && errors[key] && <p id={`rank-${key}-error`} className="mt-2 text-xs text-destructive">{errors[key]}</p>}</div>)}
            </div>
          </section>
          <details className="text-sm"><summary className="cursor-pointer font-medium">How ranking is calculated</summary><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{rankCalculationDescription} Orders in other currencies or with missing refund amounts are excluded and flagged for review. New completed orders, refunds and profile separation can change a rank, including downgrades.</p></details>
        {previewed && <section ref={previewRef} tabIndex={-1} aria-label="Rank change preview" className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div><h3 className="text-sm font-semibold">Preview changes</h3><p className="mt-1 text-sm" role="status">{changes.length} of {customers.length} customers will change rank.</p><p className="mt-1 text-xs text-muted-foreground">All loaded customers, regardless of search, filters or page.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{states.map(key => <div key={key} className="rounded-md border bg-card p-2.5"><span className="text-xs text-muted-foreground">{rankLabels[key]}</span><p className="mt-1 font-semibold tabular-nums">{impact.filter(item => item.after.key === key).length}</p></div>)}</div>
          {excluded > 0 && <p className="text-xs text-amber-800 dark:text-amber-300">{excluded} order(s) excluded pending currency or financial data review. Affected ranks may be understated.</p>}
          {changes.length > 0 && <div className="space-y-2 border-t pt-3">{changes.slice(0, 5).map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="min-w-0 break-words">{item.name}</span><span className="flex items-center gap-1.5">{rankLabels[item.before.key]}<ArrowRight className="size-3" aria-hidden="true" />{rankLabels[item.after.key]}</span></div>)}{changes.length > 5 && <p className="text-xs text-muted-foreground">And {changes.length - 5} more customers.</p>}</div>}
        </section>}
        {saveError && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{saveError}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button variant="outline" className="min-h-11" onClick={close} disabled={saving}>Cancel</Button>
        {canManage && <>{!previewed ? <Button className="min-h-11" disabled={!editable || !dirty || !valid} onClick={() => { setPreview(previewKey); requestAnimationFrame(() => previewRef.current?.focus()); }}>Preview changes</Button> : <Button className="min-h-11 gap-2" disabled={!editable || !dirty || !valid} onClick={() => void apply()}>{saving && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}{saving ? 'Applying…' : 'Save & apply'}</Button>}</>}
      </div>
    </SheetContent></Sheet>
    <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}><AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl"><AlertDialogHeader><AlertDialogTitle>Discard rank changes?</AlertDialogTitle><AlertDialogDescription>Your changes have not been applied. Existing customer ranks will stay the same.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="min-h-11">Keep editing</AlertDialogCancel><AlertDialogAction className="min-h-11" onClick={onClose}>Discard changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
