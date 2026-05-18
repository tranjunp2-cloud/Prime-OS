import { Layers, Link } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SkuBadge } from '@/components/system/SkuBadge';
import { type VariationRelationshipsGroup as VariationData, type SkuForListing } from '@/lib/listing-groups';

interface VariationRelationshipsGroupProps {
  data: VariationData;
  selectedVariants: SkuForListing[];
  onChange: (data: VariationData) => void;
  errors?: Record<string, string>;
}

export function VariationRelationshipsGroup({ 
  data, 
  selectedVariants,
  onChange, 
  errors = {} 
}: VariationRelationshipsGroupProps) {
  const handleChange = (field: keyof VariationData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  // Extract unique attribute keys from selected variants
  const attributeKeys = [...new Set(
    selectedVariants.flatMap(v => Object.keys(v.attributes))
  )];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="size-5" />
          Group 4: Variation Relationships
        </CardTitle>
        <CardDescription>
          Define how product variants relate to each other
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Variation Theme */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="variationTheme">Variation Theme</Label>
            <Input
              id="variationTheme"
              value={data.variationTheme || ''}
              onChange={(e) => handleChange('variationTheme', e.target.value)}
              placeholder="e.g., Size, Flavor, Color, Size-Flavor"
              className={errors.variationTheme ? 'border-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">
              Defines how variations differ (e.g., Size, Flavor, Size-Flavor)
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="parentAsin" className="flex items-center gap-2">
              <Link className="size-4" />
              Parent ASIN
            </Label>
            <Input
              id="parentAsin"
              value={data.parentAsin || ''}
              onChange={(e) => handleChange('parentAsin', e.target.value)}
              placeholder="Parent ASIN (if exists)"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for new product families
            </p>
          </div>
        </div>

        {/* Attribute Mapping Table */}
        {selectedVariants.length > 0 && (
          <div className="flex border-t pt-4 flex-col gap-3">
            <Label>SKU Attribute Mapping</Label>
            <div className="surface-solid overflow-x-auto rounded-[1.25rem] border border-edge-divider/60">
              <Table variant="embedded" wrapperClassName="max-h-none">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">SKU</TableHead>
                    <TableHead className="min-w-[120px]">ASIN</TableHead>
                    {attributeKeys.map(key => (
                      <TableHead key={key} className="min-w-[100px] capitalize">
                        {key.replace(/_/g, ' ')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedVariants.map((variant) => (
                    <TableRow key={variant.sku}>
                      <TableCell className="py-3">
                        <SkuBadge sku={variant.sku} tone="variant" size="compact" />
                      </TableCell>
                      <TableCell className="py-3">
                        {variant.asin ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {variant.asin}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      {attributeKeys.map(key => (
                        <TableCell key={key} className="py-3">
                          {variant.attributes[key] ? (
                            <Badge variant="secondary" className="text-xs">
                              {variant.attributes[key]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedVariants.length} variant(s) will be linked under this product family
            </p>
          </div>
        )}

        {selectedVariants.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-t">
            <Layers className="size-8 mx-auto mb-2 opacity-50" />
            <p>No variants selected. Go back to select variants.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
