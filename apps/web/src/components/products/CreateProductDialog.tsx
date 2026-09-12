import { useEffect, useState } from 'react';
import { Check, Layers3, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ProductType } from '@/lib/product-store';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSkus: string[];
  onConfirm: (input: { sku: string; name: string; productType: ProductType }) => void;
}

const productTypes: Array<{ value: ProductType; label: string; description: string; icon: typeof Package }> = [
  { value: 'single', label: 'Single', description: 'One sellable SKU.', icon: Package },
  { value: 'variant', label: 'Configurable', description: 'Parent with variant SKUs.', icon: Layers3 },
];

export function CreateProductDialog({ open, onOpenChange, existingSkus, onConfirm }: CreateProductDialogProps) {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [productType, setProductType] = useState<ProductType>('single');
  const [errors, setErrors] = useState<{ sku?: string; name?: string }>({});

  useEffect(() => {
    if (open) return;
    setSku(''); setName(''); setProductType('single'); setErrors({});
  }, [open]);

  function submit() {
    const nextErrors: typeof errors = {};
    const normalizedSku = sku.trim().toUpperCase();
    if (!normalizedSku) nextErrors.sku = 'Master SKU is required.';
    else if (existingSkus.some(item => item.toUpperCase() === normalizedSku)) nextErrors.sku = 'This Master SKU already exists.';
    if (name.trim().length < 3) nextErrors.name = 'Product name must contain at least 3 characters.';
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return; }
    onConfirm({ sku: normalizedSku, name: name.trim(), productType });
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="overflow-hidden sm:max-w-xl">
    <DialogHeader><DialogTitle>Create Product Master draft</DialogTitle><DialogDescription>Choose the initial structure and create a recognizable product identity. Classification, pricing, inventory and channels are completed later.</DialogDescription></DialogHeader>
    <div className="space-y-5 py-2">
      <div className="space-y-2"><Label>Product structure <span className="text-destructive">*</span></Label><div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Product structure">{productTypes.map(option => { const Icon = option.icon; const selected = productType === option.value; return <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => setProductType(option.value)} className={cn('relative min-h-24 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30')}><span className={cn('grid size-8 place-items-center rounded-md', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}><Icon className="size-4" /></span><span className="mt-2 block text-sm font-semibold">{option.label}</span><span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{option.description}</span>{selected && <Check className="absolute right-3 top-3 size-4 text-primary" />}</button>; })}</div></div>
      <div className="grid gap-4">
        <div className="space-y-1.5"><Label htmlFor="quick-create-sku">Master SKU <span className="text-destructive">*</span></Label><Input id="quick-create-sku" autoFocus value={sku} onChange={event => { setSku(event.target.value.toUpperCase()); setErrors(current => ({ ...current, sku: undefined })); }} onKeyDown={event => { if (event.key === 'Enter') submit(); }} placeholder="e.g. SKU-0001" className="font-mono uppercase" maxLength={30} aria-invalid={Boolean(errors.sku)} />{errors.sku ? <p role="alert" className="text-xs text-destructive">{errors.sku}</p> : <p className="text-xs text-muted-foreground">Permanent internal identity for this product.</p>}</div>
        <div className="space-y-1.5"><Label htmlFor="quick-create-name">Product name <span className="text-destructive">*</span></Label><Input id="quick-create-name" value={name} onChange={event => { setName(event.target.value); setErrors(current => ({ ...current, name: undefined })); }} onKeyDown={event => { if (event.key === 'Enter') submit(); }} placeholder="e.g. Classic Leather Sneakers" maxLength={160} aria-invalid={Boolean(errors.name)} />{errors.name ? <p role="alert" className="text-xs text-destructive">{errors.name}</p> : <p className="text-xs text-muted-foreground">Used to identify the draft in Product Master.</p>}</div>
      </div>
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800"><strong>Next:</strong> complete Category, Brand, Attributes, pricing and inventory in Product Editor. Channel listings are created after the master record is ready.</div>
    </div>
    <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="button" onClick={submit} disabled={!sku.trim() || name.trim().length < 3}>Create draft &amp; continue</Button></DialogFooter>
  </DialogContent></Dialog>;
}
