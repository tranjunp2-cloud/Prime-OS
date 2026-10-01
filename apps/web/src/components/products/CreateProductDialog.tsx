import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Layers3, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { ProductType } from '@/lib/product-store';
import { getProductCatalogSettings, type CatalogCategory } from '@/lib/product-catalog-settings-store';

export interface CreateProductDraftInput {
  sku: string;
  name: string;
  productType: ProductType;
  category: string;
  categoryId?: string;
}

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSkus: string[];
  onConfirm: (input: CreateProductDraftInput) => void;
}

function categoryPath(category: CatalogCategory, categories: CatalogCategory[]) {
  const names = [category.name];
  const visited = new Set([category.id]);
  let parentId = category.parentId;
  while (parentId && !visited.has(parentId)) {
    const parent = categories.find(item => item.id === parentId);
    if (!parent) break;
    visited.add(parent.id);
    names.unshift(parent.name);
    parentId = parent.parentId;
  }
  return names.join(' / ');
}

const productTypes: Array<{ value: ProductType; label: string; description: string; icon: typeof Package }> = [
  { value: 'single', label: 'Single', description: 'One sellable SKU.', icon: Package },
  { value: 'variant', label: 'Configurable', description: 'Parent with variant SKUs.', icon: Layers3 },
];

export function CreateProductDialog({ open, onOpenChange, existingSkus, onConfirm }: CreateProductDialogProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [productType, setProductType] = useState<ProductType>('single');
  const [categoryId, setCategoryId] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [errors, setErrors] = useState<{ sku?: string; name?: string; category?: string }>({});
  const categories = getProductCatalogSettings().categories;
  const categoryOptions = categories.filter(category => category.status === 'Active')
    .map(category => ({ ...category, path: categoryPath(category, categories) }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const selectedCategory = categoryOptions.find(category => category.id === categoryId);

  useEffect(() => {
    if (open) return;
    setSku(''); setName(''); setProductType('single'); setCategoryId(''); setCategoryOpen(false); setErrors({});
  }, [open]);

  function submit() {
    const nextErrors: typeof errors = {};
    const normalizedSku = sku.trim().toUpperCase();
    if (!normalizedSku) nextErrors.sku = 'Master SKU is required.';
    else if (existingSkus.some(item => item.toUpperCase() === normalizedSku)) nextErrors.sku = 'This Master SKU already exists.';
    if (name.trim().length < 3) nextErrors.name = 'Product name must contain at least 3 characters.';
    const category = getProductCatalogSettings().categories.find(item => item.id === categoryId && item.status === 'Active');
    if (categoryId && !category) nextErrors.category = 'This category is no longer available. Choose another or clear it to continue.';
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    onConfirm({ sku: normalizedSku, name: name.trim(), productType, category: category?.name ?? '', categoryId: category?.id });
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-xl">
    <DialogHeader className="shrink-0"><DialogTitle>Create Product Master draft</DialogTitle><DialogDescription>Add the product identity and category. Complete the remaining details after creating your draft.</DialogDescription></DialogHeader>
    <div className="min-h-0 space-y-5 overflow-y-auto px-1 py-2 -mx-1">
      <div className="space-y-2"><Label>Product structure <span className="text-destructive">*</span></Label><div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Product structure">{productTypes.map(option => { const Icon = option.icon; const selected = productType === option.value; return <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => setProductType(option.value)} className={cn('relative min-h-24 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30')}><span className={cn('grid size-8 place-items-center rounded-md', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><Icon className="size-4" /></span><span className="mt-2 block text-sm font-semibold">{option.label}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{option.description}</span>{selected && <Check className="absolute right-3 top-3 size-4 text-primary" />}</button>; })}</div></div>
      <div className="grid gap-4">
        <div className="space-y-1.5"><Label htmlFor="quick-create-sku">Master SKU <span className="text-destructive">*</span></Label><Input id="quick-create-sku" autoFocus value={sku} onChange={event => { setSku(event.target.value.toUpperCase()); setErrors(current => ({ ...current, sku: undefined })); }} onKeyDown={event => { if (event.key === 'Enter') submit(); }} placeholder="e.g. SKU-0001" className="font-mono uppercase" maxLength={30} aria-invalid={Boolean(errors.sku)} />{errors.sku ? <p role="alert" className="text-xs text-destructive">{errors.sku}</p> : <p className="text-xs text-muted-foreground">Permanent internal identity for this product.</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="quick-create-name">Product name <span className="text-destructive">*</span></Label><Input id="quick-create-name" value={name} onChange={event => { setName(event.target.value); setErrors(current => ({ ...current, name: undefined })); }} onKeyDown={event => { if (event.key === 'Enter') submit(); }} placeholder="e.g. Classic Leather Sneakers" maxLength={160} aria-invalid={Boolean(errors.name)} />{errors.name ? <p role="alert" className="text-xs text-destructive">{errors.name}</p> : <p className="text-xs text-muted-foreground">Used to identify the draft in Product Master.</p>}</div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label id="quick-create-category-label" htmlFor="quick-create-category">Category <span className="font-normal text-muted-foreground">(optional)</span></Label>
            {categoryId && <button type="button" onClick={() => { setCategoryId(''); setErrors(current => ({ ...current, category: undefined })); }} className="rounded px-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Clear category">Clear</button>}
          </div>
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger asChild>
              <Button id="quick-create-category" type="button" variant="outline" role="combobox" aria-expanded={categoryOpen} aria-labelledby="quick-create-category-label" aria-describedby="quick-create-category-help" aria-invalid={Boolean(errors.category)} disabled={!categoryOptions.length} className={cn('w-full justify-between font-normal', !selectedCategory && 'text-muted-foreground', errors.category && 'border-destructive')}>
                <span className="truncate">{selectedCategory?.path || 'Select category'}</span><ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" collisionPadding={16} className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0">
              <Command label="Search categories">
                <CommandInput placeholder="Search categories..." aria-label="Search categories" className="h-11 text-sm md:text-sm" />
                <CommandList className="max-h-56 p-1">
                  <CommandEmpty>No categories found.</CommandEmpty>
                  {categoryOptions.map(category => <CommandItem key={category.id} value={category.id} keywords={[category.path]} onSelect={() => { setCategoryId(category.id); setErrors(current => ({ ...current, category: undefined })); setCategoryOpen(false); }} className="min-h-10 cursor-pointer rounded-md px-3 py-2">
                    <span className="min-w-0 flex-1 whitespace-normal">{category.path}</span>{category.id === categoryId && <Check aria-hidden="true" className="size-4 shrink-0" />}
                  </CommandItem>)}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p id="quick-create-category-help" role={errors.category ? 'alert' : undefined} className={cn('text-xs leading-5', errors.category ? 'text-destructive' : 'text-muted-foreground')}>
            {errors.category || (categoryOptions.length ? 'Sets the product attributes. You can choose or change it later.' : 'No active categories yet. Add one in Catalog settings and assign it later.')}
          </p>
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground"><strong className="font-medium text-foreground">Next:</strong> complete product details, pricing and inventory in Product Editor. Link sales channels when ready.</p>
    </div>
    <DialogFooter className="shrink-0"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="button" onClick={submit} disabled={!sku.trim() || name.trim().length < 3}>Create draft &amp; continue</Button></DialogFooter>
  </DialogContent></Dialog>;
}
