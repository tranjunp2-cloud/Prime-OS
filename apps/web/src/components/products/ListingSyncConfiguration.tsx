import { Input } from '@/components/ui/input';
import { getWarehouses } from '@/lib/warehouse-store';
import { PRICING_CURRENCIES, readPricing } from '@/lib/pricing-rules';
import type { MasterSyncField, MasterSyncPreference } from '@/lib/listing-master-sync';
import type { ChannelListing, Product } from '@/lib/product-store';

/** Shared by the listing editor and the table's sync shortcut. */
export function ListingSyncConfiguration({ field, master, listing, draft, onChange }: {
  field: MasterSyncField; master: Product; listing: ChannelListing; draft: MasterSyncPreference;
  onChange: (patch: Partial<MasterSyncPreference>) => void;
}) {
  const registry = readPricing();
  const warehouses = getWarehouses().filter(warehouse => warehouse.status === 'active' && !warehouse.is_virtual && !['fba', 'fbs'].includes(warehouse.type));
  const selectClass = 'min-h-11 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  if (field === 'price') return <div className="grid gap-3 sm:grid-cols-2">
    <label className="grid gap-1.5 text-sm">Listing currency<select className={selectClass} value={draft.pricing?.currency || ''} onChange={event => onChange({ pricing: { currency: event.target.value } })}><option value="">Choose currency</option>{PRICING_CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm">Pricing rule<select className={selectClass} value={draft.pricing?.rule_id || ''} onChange={event => onChange({ pricing: { currency: draft.pricing?.currency || '', rule_id: event.target.value || undefined } })}><option value="">Master base price · same currency</option>{registry.rules.filter(rule => rule.enabled && rule.baseCurrency === master.price_currency && rule.targetCurrency === draft.pricing?.currency).map(rule => <option key={rule.id} value={rule.id}>{rule.name}</option>)}</select></label>
  </div>;
  if (field === 'inventory') return <div className="grid gap-3 sm:grid-cols-2">
    {listing.channel === 'amazon' && <label className="grid gap-1.5 text-sm sm:col-span-2">Amazon fulfillment<select className={selectClass} value={draft.inventory?.fulfillment || ''} onChange={event => onChange({ inventory: { warehouse_id: '', safety_buffer: 0, ...draft.inventory, fulfillment: event.target.value as 'FBA' | 'FBM' || undefined } })}><option value="">Confirm fulfillment</option><option value="FBM">FBM · Merchant fulfilled</option><option value="FBA">FBA · Amazon manages stock</option></select></label>}
    <label className="grid gap-1.5 text-sm sm:col-span-2">Stock source<select className={selectClass} value={draft.inventory?.warehouse_id || ''} onChange={event => onChange({ inventory: { safety_buffer: 0, ...draft.inventory, warehouse_id: event.target.value } })}><option value="">Choose warehouse</option>{warehouses.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
    <label className="grid gap-1.5 text-sm">Safety buffer<Input className="min-h-11" type="number" min="0" step="1" value={Number.isFinite(draft.inventory?.safety_buffer) ? draft.inventory!.safety_buffer : ''} onChange={event => onChange({ inventory: { warehouse_id: '', ...draft.inventory, safety_buffer: event.target.value === '' ? NaN : Number(event.target.value) } })} /></label>
    <label className="grid gap-1.5 text-sm">Allocation cap (optional)<Input className="min-h-11" type="number" min="0" step="1" placeholder="No cap" value={draft.inventory?.allocation_cap ?? ''} onChange={event => onChange({ inventory: { warehouse_id: '', safety_buffer: 0, ...draft.inventory, allocation_cap: event.target.value === '' ? undefined : Number(event.target.value) } })} /></label>
    <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">Per mapped SKU: max(warehouse stock − buffer, 0), limited by the cap. Warehouse stock is not changed.</p>
  </div>;
  return null;
}
