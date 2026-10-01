import { useState } from 'react';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/product-store';
import { performProductLifecycleAction, type ProductLifecycleAction } from '@/lib/product-lifecycle';

export function useProductLifecycleActions(onChanged: (action: ProductLifecycleAction, id: string) => void, hasUnsavedChanges = false) {
  const { toast } = useToast();
  const [target, setTarget] = useState<{ product: Product; action: ProductLifecycleAction } | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  function execute(product: Product, action: ProductLifecycleAction) {
    try {
      performProductLifecycleAction(product.id, action);
      setOpen(false);
      setError('');
      toast({ title: action === 'delete' ? 'Product Master deleted' : action === 'restore' ? 'Product restored to Draft' : 'Product archived',
        description: action === 'delete' ? 'The Product Master was permanently removed.' : 'Channel listings were not changed.' });
      onChanged(action, product.id);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The product could not be updated. Please try again.';
      setError(message);
      if (action === 'restore') toast({ title: 'Could not restore product', description: message, variant: 'destructive' });
    }
  }
  function requestAction(product: Product, action: ProductLifecycleAction) {
    setError('');
    if (action === 'restore') execute(product, action);
    else { setTarget({ product, action }); setOpen(true); }
  }
  const deleting = target?.action === 'delete';
  const dialog = <ConfirmDialog open={open} onOpenChange={setOpen}
    title={deleting ? 'Delete Product Master permanently?' : 'Archive Product Master?'}
    confirmText={deleting ? 'Delete permanently' : 'Archive product'} variant={deleting ? 'destructive' : 'default'}
    onConfirm={() => { if (target) execute(target.product, target.action); }}
    description={<span className="block space-y-3">
      <span className="block rounded-md border bg-muted/30 p-3 text-foreground"><strong className="block break-words">{target?.product.name}</strong><span className="block break-all font-mono text-xs">{target?.product.sku_code}</span></span>
      <span className="block">{deleting ? 'This permanently deletes the product and its variants. This cannot be undone.' : 'This moves the product out of the active catalog. Existing marketplace listings are not unpublished. You can restore this product to Draft later.'}</span>
      {hasUnsavedChanges && <span className="block">Unsaved edits will be discarded.</span>}
      {error && <span role="alert" className="block text-destructive">{error}</span>}
    </span>} />;
  return { requestAction, dialog };
}
