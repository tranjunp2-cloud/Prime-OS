import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { AmazonVariant } from '@/lib/amazon-catalog';

interface SelectVariantsDialogProps {
  open: boolean;
  product: {
    title: string;
    asin: string;
    images: string[];
    variants?: AmazonVariant[];
  } | null;
  onSelect: (variants: AmazonVariant[]) => void;
  onCancel: () => void;
}

export function SelectVariantsDialog({
  open,
  product,
  onSelect,
  onCancel,
}: SelectVariantsDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!product) return null;

  const variants = product.variants ?? [];

  function toggle(asin: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(asin)) next.delete(asin);
      else next.add(asin);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === variants.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(variants.map(v => v.asin)));
    }
  }

  function handleSave() {
    const chosen = variants.filter(v => selected.has(v.asin));
    onSelect(chosen);
    setSelected(new Set());
  }

  function handleCancel() {
    setSelected(new Set());
    onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div>
            <h2 className="text-lg font-semibold">Select Variants</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose variants to sell (select one or more)
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Product info */}
        <div className="flex gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
          {product.images[0] && (
            <img
              src={product.images[0]}
              alt={product.title}
              className="size-14 rounded-md object-cover shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug line-clamp-2">{product.title}</p>
            {variants.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {variants.length} {variants.length === 1 ? 'variation' : 'variations'}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              Parent ASIN: <span className="font-mono">{product.asin}</span>
            </p>
          </div>
        </div>

        {/* Variant list */}
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No variants found for this product.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto py-1">
            {/* Select all */}
            <label className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === variants.length && variants.length > 0}
                onChange={toggleAll}
                className="size-4 rounded accent-primary"
              />
              <span className="text-sm font-medium">Select all</span>
            </label>

            {variants.map(variant => {
              const attrLabel = Object.entries(variant.variationAttributes)
                .map(([, val]) => val)
                .join(' / ');
              const isSelected = selected.has(variant.asin);

              return (
                <label
                  key={variant.asin}
                  className={`flex items-start gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(variant.asin)}
                    className="size-4 rounded accent-primary mt-0.5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{attrLabel}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {variant.upc && (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                          UPC: {variant.upc}
                        </span>
                      )}
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                        ASIN: {variant.asin}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="size-4 text-primary shrink-0 mt-0.5" />
                  )}
                </label>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t mt-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={selected.size === 0}
          >
            Save{selected.size > 0 ? ` (${selected.size})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
