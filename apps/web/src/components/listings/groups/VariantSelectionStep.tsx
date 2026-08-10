import { useState, useEffect } from 'react';
import { Package, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SkuBadge } from '@/components/system/SkuBadge';
import { type SkuForListing } from '@/lib/listing-groups';
import { cn } from '@/lib/utils';

interface VariantSelectionStepProps {
  variants: SkuForListing[];
  onSelectionChange: (variants: SkuForListing[]) => void;
  onCheckAsin?: () => Promise<void>;
  asinCheckLoading?: boolean;
}

export function VariantSelectionStep({ 
  variants, 
  onSelectionChange, 
}: VariantSelectionStepProps) {
  const [localVariants, setLocalVariants] = useState(variants);

  useEffect(() => {
    setLocalVariants(variants);
  }, [variants]);

  const toggleVariant = (sku: string) => {
    const updated = localVariants.map(v => 
      v.sku === sku ? { ...v, selected: !v.selected } : v
    );
    setLocalVariants(updated);
    onSelectionChange(updated);
  };

  const toggleAll = (checked: boolean) => {
    const updated = localVariants.map(v => ({ ...v, selected: checked }));
    setLocalVariants(updated);
    onSelectionChange(updated);
  };

  const selectedCount = localVariants.filter(v => v.selected).length;
  const allSelected = selectedCount === localVariants.length && localVariants.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-5" />
              Select Variants to List
            </CardTitle>
            <CardDescription className="mt-1">
              Choose which SKUs you want to list on this channel. ASIN status will be checked automatically.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {selectedCount} selected
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="surface-solid rounded-lg border border-edge-divider/60">
          <Table variant="embedded" wrapperClassName="max-h-none">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={allSelected}
                    onCheckedChange={(checked) => toggleAll(checked as boolean)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Attributes</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localVariants.map((variant) => (
                <TableRow 
                  key={variant.sku}
                  className={cn(
                    'cursor-pointer transition-colors',
                    variant.selected && 'bg-surface-selected/80'
                  )}
                  onClick={() => toggleVariant(variant.sku)}
                >
                  <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={variant.selected}
                      onCheckedChange={() => toggleVariant(variant.sku)}
                      aria-label={`Select ${variant.sku}`}
                    />
                  </TableCell>
                  <TableCell className="py-3">
                    <SkuBadge sku={variant.sku} tone="variant" size="compact" />
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(variant.attributes).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">${variant.price.toFixed(2)}</TableCell>
                  <TableCell className="py-3">
                    <span className={cn(
                      variant.inventory <= 0 && 'text-destructive',
                      variant.inventory > 0 && variant.inventory < 10 && 'text-warning'
                    )}>
                      {variant.inventory}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selectedCount} of {localVariants.length} variants selected
          </span>
          {selectedCount === 0 && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="size-4" />
              Select at least one variant to continue
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
