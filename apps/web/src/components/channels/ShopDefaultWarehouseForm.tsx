import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ChannelWarehouse, ConnectedChannelRecord } from '@/lib/channel-integrations-api';
import { getProducts } from '@/lib/product-store';
import { getCatalogImportItems } from '@/lib/catalog-import-store';
import { merchantWarehouses, saveShopWarehouse, shopWarehouse } from '@/lib/shop-warehouse-settings';
import { shopWarehouseImpact } from '@/lib/shop-warehouse-impact';

export function ShopDefaultWarehouseForm({ shop, shops, target, onSaved, onBusyChange, onReload }: {
  shop: ConnectedChannelRecord; shops: ConnectedChannelRecord[]; target?: ChannelWarehouse;
  onSaved?: (shop: ConnectedChannelRecord) => void; onBusyChange?: (busy: boolean) => void; onReload: () => void;
}) {
  const current = shopWarehouse(shop.warehouse);
  const [selected, setSelected] = useState(current?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviewRevision, setReviewRevision] = useState(0);
  const choices = merchantWarehouses();
  const picked = choices.find(item => item.id === (target?.id ?? selected));
  const next = picked ? { id: picked.id, name: picked.name, code: picked.code, city: picked.address ?? '' } : undefined;
  const changed = next && next.id !== current?.id;
  const impact = shopWarehouseImpact(getProducts(), shop, shops, getCatalogImportItems({ requireConfirmation: true }));
  const signature = JSON.stringify(impact);
  async function save() {
    if (!next || !changed || saving) return;
    if (signature !== JSON.stringify(shopWarehouseImpact(getProducts(), shop, shops, getCatalogImportItems({ requireConfirmation: true })))) {
      setReviewRevision(reviewRevision + 1); setError('Listings changed. Review the updated list before saving.'); return;
    }
    setSaving(true); onBusyChange?.(true); setError(''); setSuccess('');
    try {
      const updated = await saveShopWarehouse(shop, next);
      setSuccess(`Default warehouse saved for ${shop.store_name}.`); onSaved?.(updated);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save the warehouse.'); }
    finally { setSaving(false); onBusyChange?.(false); }
  }
  return <section className="space-y-4" aria-label="Shop default warehouse settings">
    {!target && <label className="grid gap-2 text-sm font-medium">Default warehouse<select className="h-11 rounded-md border bg-background px-3 font-normal" value={selected} disabled={saving} onChange={e => { setSelected(e.target.value); setError(''); setSuccess(''); }}><option value="">Choose warehouse</option>{current && !choices.some(w => w.id === current.id) && <option value={current.id} disabled>{current.name} · Unavailable</option>}{choices.map(w => <option value={w.id} key={w.id}>{w.name}</option>)}</select></label>}
    {changed && <>
      <div className="rounded-lg border bg-muted/30 p-3 text-sm"><p className="text-xs text-muted-foreground">Default warehouse change</p><p className="mt-1 break-words">{current?.name ?? 'Not set'} <span aria-label="to">→</span> <strong>{next.name}</strong></p></div>
      <div className="space-y-2"><h3 className="text-sm font-semibold">Affected listings</h3>
        <p className="text-sm"><strong>{impact.filter(row => row.group === 'default').length}</strong> using the new default · <strong>{impact.filter(row => row.group !== 'default').length}</strong> keeping their source</p>
        {!!impact.length && <details className="rounded-lg border px-3"><summary className="min-h-11 cursor-pointer py-3 text-sm">View {impact.length} listings</summary><ul className="max-h-48 divide-y overflow-y-auto">{impact.map(row => <li key={row.id} className="py-2 text-sm"><p className="truncate" title={row.name}>{row.name}</p><p className="text-xs text-muted-foreground">{row.sku} · {row.label}</p></li>)}</ul></details>}
        <p className="text-xs leading-5 text-muted-foreground">Active listings matched to this shop in this device’s catalog. Own warehouse choices and Amazon-managed stock stay unchanged. Unmatched or unreviewed imports are excluded.</p>
      </div>
    </>}
    {!changed && current && <p className="text-sm text-muted-foreground">This shop uses {current.name} by default.</p>}
    <p className="text-xs leading-5 text-muted-foreground">Listings using “Shop default” follow this setting. Stock sync stays {shop.sync_services.stock ? 'enabled' : 'disabled'}. Saving does not move physical stock, reroute existing orders or publish quantities.</p>
    {error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button type="button" variant="outline" disabled={saving} onClick={onReload}>Reload shops</Button></div>}
    {success && <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>}
    <Button className="min-h-11" type="button" disabled={!changed || saving} onClick={save}>{saving ? 'Saving…' : 'Save default warehouse'}</Button>
  </section>;
}
