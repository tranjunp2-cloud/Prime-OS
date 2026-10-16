import { useId } from 'react';
import { cn } from '@/lib/utils';
import type { ProductType } from '@/lib/product-store';
import styles from './ProductStructure.module.css';

const options = [
  { value: 'single', label: 'Single product' },
  { value: 'variant', label: 'Product with variants' },
] as const;

export function ProductStructureEditor({ type, onChange, disabled, changed }: {
  type: ProductType; onChange: (type: ProductType) => void; disabled: boolean; changed: boolean;
}) {
  const id = useId();
  return <section id="product-structure-choice" tabIndex={-1} aria-labelledby={id + '-title'} className={cn(styles.root, 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
    <div className={styles.layout}>
      <h3 id={id + '-title'} className="text-sm font-semibold">Product structure</h3>
      {changed && <span className={cn(styles.status, 'text-xs text-muted-foreground')} role="status">Unsaved</span>}
      <fieldset disabled={disabled} className={styles.controls}>
        <legend className="sr-only">Product structure</legend>
        <div className={styles.options}>
          {options.map(option => <label key={option.value} className={cn('inline-flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background', type === option.value ? 'border-primary bg-primary/5' : 'hover:border-primary/30 hover:bg-muted/30', disabled && 'cursor-not-allowed opacity-60')}>
            <input type="radio" name={id + '-type'} value={option.value} checked={type === option.value} onChange={() => onChange(option.value)} className="size-4 shrink-0 accent-primary" aria-labelledby={id + '-' + option.value + '-label'} />
            <span id={id + '-' + option.value + '-label'}>{option.label}</span>
          </label>)}
        </div>
      </fieldset>
    </div>
  </section>;
}
