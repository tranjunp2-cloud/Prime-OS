import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { createManagedWarehouse, getWarehouses, type Warehouse } from '@/lib/warehouse-store';
import { type Product } from '@/lib/product-store';
import { countForSku, recordWarehouseCounts, skuPositions } from '@/lib/warehouse-stock-operations';
import type { StockLocation } from './WarehouseStockTable';

const control = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function CreateWarehouseDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: (warehouse: Warehouse) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [country, setCountry] = useState('VN');
  const [address, setAddress] = useState('');
  const [manager, setManager] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const saving = useRef(false);
  let codeSequence = getWarehouses().length + 1;
  const existingCodes = new Set(getWarehouses().map(warehouse => warehouse.code.toUpperCase()));
  while (existingCodes.has(`WH-${country}-${String(codeSequence).padStart(2, '0')}`)) codeSequence++;
  const generatedCode = `WH-${country}-${String(codeSequence).padStart(2, '0')}`;
  return <Sheet open onOpenChange={open => !open && onClose()}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
    <SheetHeader className="border-b p-5"><SheetTitle>Add warehouse</SheetTitle><SheetDescription>Create a location you manage, then record opening stock for your existing Product Master SKUs.</SheetDescription></SheetHeader>
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={event => {
      event.preventDefault(); if (saving.current) return; saving.current = true;
      try { onCreated(createManagedWarehouse({ name, code: code || generatedCode, country, address, manager, phone })); }
      catch (failure) { saving.current = false; setError(failure instanceof Error ? failure.message : 'Could not save the warehouse.'); }
    }}>
      <div className="flex-1 space-y-4 overflow-auto p-5">
        <label className="grid gap-2 text-sm">Warehouse name<Input required autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. HCM Central" /></label>
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm">Country<select className={control} value={country} onChange={event => setCountry(event.target.value)}>{[['VN', 'Vietnam'], ['SG', 'Singapore'], ['JP', 'Japan'], ['MY', 'Malaysia'], ['TH', 'Thailand'], ['ID', 'Indonesia'], ['PH', 'Philippines'], ['US', 'United States'], ['GB', 'United Kingdom'], ['AU', 'Australia']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm">Warehouse code<Input value={code || generatedCode} onChange={event => setCode(event.target.value.toUpperCase())} /></label></div>
        <label className="grid gap-2 text-sm">Address<Input required value={address} onChange={event => setAddress(event.target.value)} placeholder="Street, city, postal code" /></label>
        <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm">Contact details (optional)</summary><div className="mt-3 grid gap-3"><label className="grid gap-2 text-sm">Manager<Input value={manager} onChange={event => setManager(event.target.value)} /></label><label className="grid gap-2 text-sm">Phone<Input type="tel" value={phone} onChange={event => setPhone(event.target.value)} /></label></div></details>
        <p className="text-xs leading-5 text-muted-foreground">You manage the counts at this location. Marketplace-managed warehouses are supplied by their connected provider.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t bg-background p-4"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!name.trim() || !address.trim()}>Create warehouse</Button></footer>
    </form>
  </SheetContent></Sheet>;
}

export function AddWarehouseStockDrawer({ warehouse, products, onClose, onSaved }: { warehouse: StockLocation; products: Product[]; onClose: () => void; onSaved: (ids: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const saving = useRef(false);
  const file = useRef<HTMLInputElement>(null);
  const entries = useMemo(() => products.flatMap(product => (product.has_variants ? product.skus.map(sku => ({ sku: sku.sku_code, variant: sku.variation_name })) : [{ sku: product.sku_code, variant: '' }])
    .map(item => ({ ...item, product, key: `${product.id}:${item.sku}`, before: countForSku(product, warehouse.id, item.sku) }))), [products, warehouse.id]);
  const available = entries.filter(item => item.before === null);
  const filtered = available.filter(item => `${item.product.name} ${item.sku} ${item.variant}`.toLowerCase().includes(query.toLowerCase()));
  const selected = available.filter(item => counts[item.key]?.trim());
  const needsVerification = selected.some(item => !skuPositions(item.product, warehouse.id, item.sku).length);
  const valid = selected.length > 0 && selected.every(item => Number.isSafeInteger(Number(counts[item.key])) && Number(counts[item.key]) >= 0);
  const total = valid ? selected.reduce((sum, item) => sum + Number(counts[item.key]), 0) : 0;
  const importCsv = async (selectedFile?: File) => {
    if (!selectedFile) return;
    try {
      if (selectedFile.size > 1_000_000) throw new Error('Use a CSV smaller than 1 MB.');
      const text = (await selectedFile.text()).replace(/^\uFEFF/, '').trim();
      const lines = text.split(/\r?\n/);
      if (lines.shift()?.trim().toLowerCase() !== 'sku,quantity') throw new Error('Use the columns SKU,Quantity.');
      const imported: Record<string, string> = {};
      for (const [index, line] of lines.entries()) {
        const columns = line.split(',').map(value => value.trim().replace(/^"(.*)"$/, '$1'));
        const matches = available.filter(item => item.sku === columns[0]);
        if (columns.length !== 2 || matches.length !== 1 || !columns[1] || !Number.isSafeInteger(Number(columns[1])) || Number(columns[1]) < 0) throw new Error(`Row ${index + 2}: use a unique, unrecorded SKU and a whole quantity of 0 or more.`);
        if (imported[matches[0].key] !== undefined) throw new Error(`Row ${index + 2}: this SKU appears twice.`);
        imported[matches[0].key] = columns[1];
      }
      setCounts(current => ({ ...current, ...imported })); setError(''); setVerified(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not read the CSV.'); }
    if (file.current) file.current.value = '';
  };
  return <Sheet open onOpenChange={open => !open && onClose()}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
    <SheetHeader className="border-b p-5"><SheetTitle>Record opening stock</SheetTitle><SheetDescription>{warehouse.name} · Existing Product Master SKUs without a recorded count here. Enter the stock already on hand; leave blank to skip, or enter 0 for an empty location.</SheetDescription></SheetHeader>
    <div className="flex flex-wrap items-center gap-2 border-b p-4"><Input className="min-w-40 flex-1" aria-label="Find existing products" placeholder="Search product or SKU…" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /><Button variant="outline" onClick={() => file.current?.click()}>Import CSV</Button><input ref={file} type="file" accept=".csv,text/csv" className="hidden" aria-label="Import opening stock CSV" onChange={event => { void importCsv(event.target.files?.[0]); }} /><p className="w-full text-xs text-muted-foreground">CSV format: SKU,Quantity · Review imported counts before saving.</p></div>
    <div className="min-h-0 flex-1 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-background"><tr><th className="p-4 font-medium">Product / SKU</th><th className="w-32 p-4 text-right font-medium">Opening stock</th></tr></thead><tbody>{filtered.slice((page - 1) * 25, page * 25).map(item => <tr key={item.key} className="border-t"><td className="p-4"><p className="font-medium">{item.product.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.variant && `${item.variant} · `}{item.sku}</p></td><td className="p-4"><Input aria-label={`Opening stock for ${item.sku}`} type="number" min={0} step={1} className="text-right" placeholder="—" value={counts[item.key] ?? ''} onChange={event => { setCounts(current => ({ ...current, [item.key]: event.target.value })); setVerified(false); setError(''); }} /></td></tr>)}</tbody></table>
      {!filtered.length && <p className="p-8 text-center text-sm text-muted-foreground">{available.length ? 'No matching products.' : 'All catalog SKUs have opening stock recorded here. Use Receive stock for deliveries or Adjust stock to correct a count.'}</p>}
    </div>
    <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground"><span>{filtered.length} SKUs · {selected.length} selected</span><div className="flex gap-2"><Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="sm" variant="ghost" disabled={page * 25 >= filtered.length} onClick={() => setPage(page + 1)}>Next</Button></div></div>
    <footer className="space-y-3 border-t bg-background p-4">
      {needsVerification && <label className="flex items-start gap-2 text-xs leading-5"><input className="mt-1" type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} /><span>I verified these opening counts have no existing order holds or other holds. Available stock will equal the opening count.</span></label>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{selected.length} SKUs · <strong>{total.toLocaleString()} units</strong></p><div className="flex gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!valid || (needsVerification && !verified)} onClick={() => {
        if (saving.current) return; saving.current = true;
        try { onSaved(recordWarehouseCounts(selected.map(item => ({ productId: item.product.id, warehouseId: warehouse.id, sku: item.sku, expected: null, quantity: Number(counts[item.key]), kind: 'opening', reason: 'Opening stock', confirmNoHolds: verified })))); }
        catch (failure) { saving.current = false; setError(failure instanceof Error ? failure.message : 'Could not save stock.'); }
      }}>Save opening stock</Button></div></div>
    </footer>
  </SheetContent></Sheet>;
}
