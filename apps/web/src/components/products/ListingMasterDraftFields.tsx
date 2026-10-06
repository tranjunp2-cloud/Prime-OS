import { useState } from 'react';
import { Check, ChevronsUpDown, Layers3, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import { getProductCatalogSettings, type CatalogCategory } from '@/lib/product-catalog-settings-store';
import type { ProductType } from '@/lib/product-store';
import { canCopyListingPrice } from '@/lib/product-listing-intake';
import { cn } from '@/lib/utils';

export type ListingMasterDraftValues = {
  name: string;
  sku: string;
  productType: ProductType;
  categoryId: string;
  brandId: string;
  copySourcePrice: boolean;
};

function categoryPath(category: CatalogCategory, categories: CatalogCategory[]) {
  const names = [category.name];
  const visited = new Set([category.id]);
  let parentId = category.parentId;
  while (parentId && !visited.has(parentId)) {
    const parent = categories.find(item => item.id === parentId);
    if (!parent) break;
    visited.add(parent.id); names.unshift(parent.name); parentId = parent.parentId;
  }
  return names.join(' / ');
}

type CatalogOption = { id: string; label: string; keywords?: string[] };
function CatalogPicker({ name, value, options, help, onChange }: {
  name: 'Category' | 'Brand'; value: string; options: CatalogOption[]; help: string; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = `intake-${name.toLowerCase()}`;
  const selected = options.find(option => option.id === value);
  return <div className="space-y-2">
    <Label id={`${id}-label`} htmlFor={id}>{name} <span className="font-normal text-muted-foreground">(optional)</span></Label>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} className={cn('h-11 w-full justify-between font-normal', !selected && 'text-muted-foreground')}>
        <span className="truncate">{selected?.label || (value ? 'Selection unavailable — choose again' : `Select ${name.toLowerCase()}`)}</span><ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Button></PopoverTrigger>
      <PopoverContent align="start" collisionPadding={16} className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0">
        <Command label={`Search ${name.toLowerCase()}`}>
          <CommandInput placeholder={`Search ${name.toLowerCase()}…`} aria-label={`Search ${name.toLowerCase()}`} className="h-11 text-sm md:text-sm" />
          <CommandList className="max-h-56 p-1">
            <CommandEmpty>No active {name.toLowerCase()} found.</CommandEmpty>
            <CommandItem value="assign-later" onSelect={() => { onChange(''); setOpen(false); }} className="min-h-11 cursor-pointer px-3">Assign later{!value && <Check className="ml-auto size-4" aria-hidden="true" />}</CommandItem>
            {options.map(option => <CommandItem key={option.id} value={option.id} keywords={[option.label, ...(option.keywords ?? [])]} onSelect={() => { onChange(option.id); setOpen(false); }} className="min-h-11 cursor-pointer gap-2 px-3">
              <span className="min-w-0 flex-1 whitespace-normal">{option.label}</span>{value === option.id && <Check className="size-4 shrink-0" aria-hidden="true" />}
            </CommandItem>)}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <p id={`${id}-help`} className="text-xs leading-5 text-muted-foreground">{help}</p>
  </div>;
}

export function ListingMasterDraftFields({ source, groupSize, value, onChange }: {
  source: CatalogImportItem; groupSize: number; value: ListingMasterDraftValues;
  onChange: (value: ListingMasterDraftValues) => void;
}) {
  const settings = getProductCatalogSettings();
  const categories = settings.categories.filter(category => category.status === 'Active')
    .map(category => ({ id: category.id, label: categoryPath(category, settings.categories) })).sort((a, b) => a.label.localeCompare(b.label));
  const brands = settings.brands.filter(brand => brand.status === 'Active')
    .map(brand => ({ id: brand.id, label: brand.name, keywords: [brand.code, ...brand.aliases] })).sort((a, b) => a.label.localeCompare(b.label));
  const update = (patch: Partial<ListingMasterDraftValues>) => onChange({ ...value, ...patch });
  const validPrice = canCopyListingPrice(source);
  const price = validPrice ? `${source.price.toLocaleString()} ${source.currency.trim().toUpperCase()}` : 'Not provided';
  const identifiers = [
    ['Barcode (GTIN)', source.gtin?.trim()], ['Model', source.modelNumber?.trim()],
    ['Manufacturer part number', source.mpn?.trim()],
    ['Pack quantity', Number.isInteger(source.packQuantity) && source.packQuantity! > 0 ? String(source.packQuantity) : ''],
  ];
  const measurements = [
    ['Product length', source.prod_length, 'cm'], ['Product width', source.prod_width, 'cm'],
    ['Product height', source.prod_height, 'cm'], ['Product weight', source.prod_weight, 'g'],
    ['Package length', source.pkg_length, 'cm'], ['Package width', source.pkg_width, 'cm'],
    ['Package height', source.pkg_height, 'cm'], ['Package weight', source.pkg_weight, 'g'],
  ].filter(([, measurement]) => typeof measurement === 'number' && Number.isFinite(measurement) && measurement > 0);

  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="intake-name">Product name <span aria-hidden="true" className="text-destructive">*</span></Label><Input required className="h-11" id="intake-name" value={value.name} onChange={event => update({ name: event.target.value })} /><p className="text-xs text-muted-foreground">Copied from the listing. You can edit it.</p></div>
      <div className="space-y-2"><Label htmlFor="intake-sku">Master SKU <span aria-hidden="true" className="text-destructive">*</span></Label><Input required className="h-11 font-mono" id="intake-sku" value={value.sku} onChange={event => update({ sku: event.target.value.toUpperCase() })} /><p className="text-xs text-muted-foreground">Unique internal code; shop SKU stays unchanged.</p></div>
    </div>
    <fieldset className="space-y-2" aria-describedby="intake-type-help">
      <legend className="text-sm font-medium">Product type <span aria-hidden="true" className="text-destructive">*</span></legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {([{ type: 'single', label: 'Single product', Icon: Package, disabled: source.variants > 1 }, { type: 'variant', label: 'With variants', Icon: Layers3, disabled: groupSize > 1 }] as const).map(option => <label key={option.type} className={cn('flex min-h-11 items-center gap-3 rounded-md border px-3 py-3 text-sm', value.productType === option.type ? 'border-primary bg-primary/5' : 'border-border', option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary/60')}>
          <input type="radio" name="intake-product-type" value={option.type} checked={value.productType === option.type} disabled={option.disabled} onChange={() => update({ productType: option.type })} className="size-4 accent-primary focus-visible:ring-2 focus-visible:ring-ring" />
          <option.Icon className="size-4 text-muted-foreground" aria-hidden="true" />{option.label}
        </label>)}
      </div>
      <p id="intake-type-help" className="text-xs leading-5 text-muted-foreground">{source.variants === 0 ? 'Shop SKU structure is not recorded. Check the source and choose the correct type.' : source.variants > 1 ? `${source.variants} shop SKUs detected. Complete options, prices and SKU mapping in the next step.` : groupSize > 1 ? 'These listings will represent one single product. Create variant Masters one listing at a time.' : value.productType === 'variant' ? 'Add options and variant SKUs in the next step.' : 'One sellable SKU. Suggested from the listing.'}</p>
    </fieldset>
    <div className="grid gap-4 sm:grid-cols-2">
      <CatalogPicker name="Category" value={value.categoryId} options={categories} onChange={categoryId => update({ categoryId })} help={categories.length ? 'Your internal category, not the shop category. Sets the required attributes for the next step.' : 'No active categories. Add one in Categories & Attributes before activation.'} />
      <CatalogPicker name="Brand" value={value.brandId} options={brands} onChange={brandId => update({ brandId })} help={source.brand ? `Shop brand: ${source.brand}. ${value.brandId ? 'Check the selected catalog brand.' : 'Select a catalog brand or assign later.'}` : 'No shop brand provided. Select a catalog brand or assign later.'} />
    </div>
    <details key={source.id} className="border-y">
      <summary className="cursor-pointer py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="text-sm font-medium">Data from this listing</span><span className="ml-2 text-xs text-muted-foreground">{value.copySourcePrice ? `Base price: ${price}` : 'Base price not set'}</span></summary>
      <div className="space-y-4 pb-4 text-xs">
        <div className="space-y-1"><p className="font-medium">Shop price: {price}</p><label className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={value.copySourcePrice} disabled={!validPrice} onCheckedChange={checked => update({ copySourcePrice: checked === true })} />Use this shop price as Master base price</label><p className="text-muted-foreground">Optional. Copies the price in {validPrice ? source.currency.trim().toUpperCase() : 'the original currency'} without conversion. You can enter a different price in the next step.</p></div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{identifiers.map(([label, data]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{data || 'Not provided — left blank'}</dd></div>)}{measurements.map(([label, measurement, unit]) => <div key={String(label)}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1">{measurement} {unit}</dd></div>)}</dl>
        <p className="text-muted-foreground">Provided identifiers and measurements are copied as-is, not inferred from the title. {source.image ? 'The source image reference is also copied; review it in the next step.' : 'No source image to copy.'}</p>
        <p className="text-muted-foreground">Shop category (reference only): <span className="text-foreground">{source.channelCategory || 'Not provided'}</span></p>
      </div>
    </details>
    <p className="text-xs leading-5 text-muted-foreground">Next: complete missing details, then confirm to activate this Master. Shop stock is not added to warehouse inventory.</p>
  </div>;
}
