import { DollarSign, Package, Tag, Warehouse, ChevronDown } from 'lucide-react';
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
import { SkuBadge } from '@/components/system/SkuBadge';
import { type SkuOfferInfo, type SkuForListing } from '@/lib/listing-groups';
import { cn } from '@/lib/utils';

interface OfferGroupProps {
  offerData: Record<string, SkuOfferInfo>;
  selectedVariants: SkuForListing[];
  onChange: (data: Record<string, SkuOfferInfo>) => void;
  errors?: Record<string, string>;
}

export function OfferGroup({ 
  offerData, 
  selectedVariants,
  onChange, 
  errors = {} 
}: OfferGroupProps) {
  const handleSkuChange = (
    sku: string, 
    field: keyof SkuOfferInfo, 
    value: string | number
  ) => {
    const current = offerData[sku] || {
      price: 0,
      quantity: 0,
      condition: 'new' as const,
      fulfillmentMethod: 'FBM' as const,
    };
    onChange({
      ...offerData,
      [sku]: {
        ...current,
        [field]: value,
      },
    });
  };

  // Pre-fill from variant data if not set
  const getOfferForSku = (variant: SkuForListing): SkuOfferInfo => {
    if (offerData[variant.sku]) {
      return offerData[variant.sku];
    }
    return {
      price: variant.price,
      quantity: variant.inventory,
      condition: 'new',
      fulfillmentMethod: 'FBM',
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="size-5" />
          Group 6: Offer
        </CardTitle>
        <CardDescription>
          Pricing and availability for each SKU. This determines if the offer can be published.
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
            const offer = getOfferForSku(variant);
            const skuErrors = {
              price: errors[`offer_${variant.sku}_price`],
              quantity: errors[`offer_${variant.sku}_quantity`],
            };
            
            return (
              <Collapsible key={variant.sku} defaultOpen={true}>
                <div className="border rounded-lg">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <Tag className="size-4 text-muted-foreground" />
                        <SkuBadge sku={variant.sku} tone="variant" size="compact" />
                        <div className="flex gap-1">
                          {Object.entries(variant.attributes).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-xs">
                              {v}
                            </Badge>
                          ))}
                        </div>
                        <Badge 
                          variant={offer.price > 0 && offer.quantity > 0 ? 'default' : 'secondary'}
                          className={cn(
                            offer.price > 0 && offer.quantity > 0 
                              ? 'bg-success text-success-foreground' 
                              : ''
                          )}
                        >
                          ${offer.price.toFixed(2)} × {offer.quantity}
                        </Badge>
                      </div>
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="flex px-4 pb-4 pt-0 border-t flex-col gap-4">
                      <div className="grid gap-4 sm:grid-cols-2 mt-4">
                        {/* Price */}
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm flex items-center gap-2">
                            <DollarSign className="size-4" />
                            Price <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={offer.price || ''}
                              onChange={(e) => handleSkuChange(variant.sku, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className={cn("pl-7", skuErrors.price && 'border-destructive')}
                            />
                          </div>
                          {skuErrors.price && (
                            <p className="text-xs text-destructive">{skuErrors.price}</p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm flex items-center gap-2">
                            <Package className="size-4" />
                            Quantity <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={offer.quantity || ''}
                            onChange={(e) => handleSkuChange(variant.sku, 'quantity', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className={cn(skuErrors.quantity && 'border-destructive')}
                          />
                          {skuErrors.quantity && (
                            <p className="text-xs text-destructive">{skuErrors.quantity}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Condition */}
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm">Condition</Label>
                          <Select
                            value={offer.condition}
                            onValueChange={(v) => handleSkuChange(variant.sku, 'condition', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="used">Used</SelectItem>
                              <SelectItem value="refurbished">Refurbished</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Fulfillment Method */}
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm flex items-center gap-2">
                            <Warehouse className="size-4" />
                            Fulfillment
                          </Label>
                          <Select
                            value={offer.fulfillmentMethod}
                            onValueChange={(v) => handleSkuChange(variant.sku, 'fulfillmentMethod', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FBM">
                                <span className="flex items-center gap-2">
                                  FBM <span className="text-muted-foreground text-xs">(Merchant)</span>
                                </span>
                              </SelectItem>
                              <SelectItem value="FBA">
                                <span className="flex items-center gap-2">
                                  FBA <span className="text-muted-foreground text-xs">(Amazon)</span>
                                </span>
                              </SelectItem>
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

        {Object.keys(errors).some(k => k.startsWith('offer_')) && (
          <p className="text-xs text-destructive">
            Please fill in all required offer fields for each SKU
          </p>
        )}
      </CardContent>
    </Card>
  );
}
