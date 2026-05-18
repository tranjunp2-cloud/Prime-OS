import { Truck, Package, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { SkuBadge } from '@/components/system/SkuBadge';
import { type SkuShippingInfo, type SkuForListing } from '@/lib/listing-groups';
import { cn } from '@/lib/utils';

interface ShippingGroupProps {
  shippingData: Record<string, SkuShippingInfo>;
  selectedVariants: SkuForListing[];
  onChange: (data: Record<string, SkuShippingInfo>) => void;
  errors?: Record<string, string>;
}

export function ShippingGroup({ 
  shippingData, 
  selectedVariants,
  onChange, 
  errors = {} 
}: ShippingGroupProps) {
  const handleSkuChange = (
    sku: string, 
    field: keyof SkuShippingInfo, 
    value: string | number
  ) => {
    const current = shippingData[sku] || {
      weight: 0,
      weightUnit: 'g' as const,
      length: 0,
      width: 0,
      height: 0,
      dimensionUnit: 'cm' as const,
    };
    onChange({
      ...shippingData,
      [sku]: {
        ...current,
        [field]: value,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="size-5" />
          Group 5: Shipping
        </CardTitle>
        <CardDescription>
          Package dimensions and weight per SKU for shipping calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {selectedVariants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="size-8 mx-auto mb-2 opacity-50" />
            <p>No variants selected. Go back to select variants.</p>
          </div>
        ) : (
          selectedVariants.map((variant) => {
            const shipping = shippingData[variant.sku] || variant.shipping;
            const skuError = errors[`shipping_${variant.sku}`];
            
            return (
              <Collapsible key={variant.sku} defaultOpen={true}>
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <Package className="size-4 text-muted-foreground" />
                        <SkuBadge sku={variant.sku} tone="variant" size="compact" />
                        <div className="flex gap-1">
                          {Object.entries(variant.attributes).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-xs">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex px-4 pb-4 pt-0 border-t flex-col gap-4">
                      {/* Weight */}
                      <div className="grid gap-4 sm:grid-cols-2 mt-4">
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm flex items-center gap-2">
                            Weight <span className="text-destructive">*</span>
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={shipping.weight || ''}
                              onChange={(e) => handleSkuChange(variant.sku, 'weight', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className={cn("flex-1", skuError && 'border-destructive')}
                            />
                            <Select
                              value={shipping.weightUnit}
                              onValueChange={(v) => handleSkuChange(variant.sku, 'weightUnit', v)}
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="g">g</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="oz">oz</SelectItem>
                                <SelectItem value="lb">lb</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Dimensions */}
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm flex items-center gap-2">
                          <Ruler className="size-4" />
                          Package Dimensions
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={shipping.length || ''}
                            onChange={(e) => handleSkuChange(variant.sku, 'length', parseFloat(e.target.value) || 0)}
                            placeholder="L"
                            className="w-20"
                          />
                          <span className="text-muted-foreground">×</span>
                          <Input
                            type="number"
                            value={shipping.width || ''}
                            onChange={(e) => handleSkuChange(variant.sku, 'width', parseFloat(e.target.value) || 0)}
                            placeholder="W"
                            className="w-20"
                          />
                          <span className="text-muted-foreground">×</span>
                          <Input
                            type="number"
                            value={shipping.height || ''}
                            onChange={(e) => handleSkuChange(variant.sku, 'height', parseFloat(e.target.value) || 0)}
                            placeholder="H"
                            className="w-20"
                          />
                          <Select
                            value={shipping.dimensionUnit || 'cm'}
                            onValueChange={(v) => handleSkuChange(variant.sku, 'dimensionUnit', v)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cm">cm</SelectItem>
                              <SelectItem value="in">in</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })
        )}

        {errors.shipping && (
          <p className="text-xs text-destructive">{errors.shipping}</p>
        )}
      </CardContent>
    </Card>
  );
}
