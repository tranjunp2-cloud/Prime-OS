import { useId, useState } from 'react';
import { Boxes, ChevronUp, CircleAlert, Info, Layers, PackageCheck, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ProductType } from '@/lib/product-store';
import styles from './ProductStructure.module.css';

const options = [
  { value: 'single', label: 'Single product', description: 'One sellable SKU. Stock can be held in multiple warehouses.', icon: PackageCheck },
  { value: 'variant', label: 'Product with variants', description: 'Separate SKUs for Color, Size or other options.', icon: Layers },
] as const;

function structureSummary(type: ProductType, skuCount: number) {
  return type === 'single' ? 'Single product · 1 SKU'
    : skuCount > 0 ? `With variants · ${skuCount} SKU${skuCount === 1 ? '' : 's'}`
      : 'With variants · No SKUs configured';
}

export function ProductStructureEditor({ type, skuCount, onChange, disabled, defaultExpanded, hasRecordedStock, linkedListingCount, changed }: {
  type: ProductType;
  skuCount: number;
  onChange: (type: ProductType) => void;
  disabled: boolean;
  defaultExpanded: boolean;
  hasRecordedStock: boolean;
  linkedListingCount: number;
  changed: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const id = useId();
  const showImpact = (expanded || changed) && (hasRecordedStock || linkedListingCount > 0);
  return <section id="product-structure-choice" tabIndex={-1} aria-labelledby={`${id}-title`} className={cn(styles.root, 'space-y-3 rounded-lg border bg-muted/10 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Boxes className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <h3 id={`${id}-title`} className="text-sm font-semibold">Product structure</h3>
          <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild><button type="button" aria-label="About product structure" className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info className="size-3.5" aria-hidden="true" /></button></TooltipTrigger><TooltipContent className="max-w-64">Choose how this product is sold, then manage its SKUs, prices and stock below. Structure changes are applied when you save the Master.</TooltipContent></Tooltip></TooltipProvider>
        </div>
        {!expanded && <p className="text-sm text-muted-foreground">{structureSummary(type, skuCount)}</p>}
      </div>
      {!disabled && <Button type="button" variant="ghost" size="sm" className="min-h-11" aria-label={expanded ? 'Hide product structure options' : 'Edit product structure'} aria-expanded={expanded} aria-controls={`${id}-options`} onClick={() => setExpanded(value => !value)}>
        {expanded ? <ChevronUp className="size-4" aria-hidden="true" /> : <Pencil className="size-4" aria-hidden="true" />}{expanded ? 'Hide options' : 'Edit'}
      </Button>}
    </div>
    {expanded && <fieldset id={`${id}-options`} disabled={disabled} className="min-w-0 space-y-3">
      <legend className="sr-only">Product structure</legend>
      <div className={styles.options}>
        {options.map(option => <label key={option.value} className={cn('flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors motion-reduce:transition-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background', type === option.value ? 'border-primary bg-primary/5' : 'hover:border-primary/30 hover:bg-muted/30', disabled && 'cursor-not-allowed opacity-60')}>
          <input type="radio" name={`${id}-type`} value={option.value} checked={type === option.value} onChange={() => onChange(option.value)} className="mt-1 size-4 shrink-0 accent-primary" aria-labelledby={`${id}-${option.value}-label`} aria-describedby={`${id}-${option.value}-description`} />
          <span className="min-w-0"><span id={`${id}-${option.value}-label`} className="flex items-center gap-2 text-sm font-semibold"><option.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{option.label}</span><span id={`${id}-${option.value}-description`} className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span></span>
        </label>)}
      </div>
    </fieldset>}
    {changed && <p className="text-xs font-medium text-amber-700 dark:text-amber-300" role="status">Structure change not saved</p>}
    {showImpact && <div className="flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-5">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <p>{hasRecordedStock ? 'Stock is already recorded. It will not be automatically merged or distributed between SKUs. ' : ''}{linkedListingCount > 0 ? `${linkedListingCount} linked listing${linkedListingCount === 1 ? '' : 's'} may need SKU mapping reviewed after a structure change. ` : ''}Review the impact before saving.</p>
    </div>}
  </section>;
}
