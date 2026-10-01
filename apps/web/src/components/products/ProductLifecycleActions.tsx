import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { Product } from '@/lib/product-store';
import { productDeletionBlockers, type ProductLifecycleAction } from '@/lib/product-lifecycle';

export function ProductLifecycleMenuItems({ product, onAction, disabled = false }: {
  product: Product; onAction: (product: Product, action: ProductLifecycleAction) => void; disabled?: boolean;
}) {
  const reasons = productDeletionBlockers(product);
  return <>
    <DropdownMenuItem disabled={disabled} onSelect={() => onAction(product, product.status === 'archived' ? 'restore' : 'archive')}>
      {product.status === 'archived' ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
      {product.status === 'archived' ? 'Restore product' : 'Archive product'}
    </DropdownMenuItem>
    {['draft', 'archived'].includes(product.status) && <>
      <DropdownMenuItem disabled={disabled || reasons.length > 0} aria-describedby={reasons.length ? `delete-reason-${product.id}` : undefined}
        className={disabled || reasons.length ? 'text-muted-foreground' : 'text-destructive focus:text-destructive'} onSelect={() => onAction(product, 'delete')}>
        <Trash2 className="size-4" />Delete permanently
      </DropdownMenuItem>
      {reasons.length > 0 && <div id={`delete-reason-${product.id}`} className="space-y-1 px-2 pb-2 text-xs leading-5 text-muted-foreground">
        {reasons.map(reason => <p key={reason}>{reason}</p>)}
      </div>}
    </>}
  </>;
}
