import { Tag, Building2, Barcode, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { type ProductIdentityGroup as ProductIdentityData } from '@/lib/listing-groups';

interface ProductIdentityGroupProps {
  data: ProductIdentityData;
  onChange: (data: ProductIdentityData) => void;
  suggestedFields?: Set<string>;
  errors?: Record<string, string>;
}

export function ProductIdentityGroup({ 
  data, 
  onChange, 
  suggestedFields = new Set(),
  errors = {} 
}: ProductIdentityGroupProps) {
  const handleChange = (field: keyof ProductIdentityData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const renderLabel = (field: string, label: string, required = false) => (
    <Label htmlFor={field} className="flex items-center gap-2">
      {label}
      {required && <span className="text-destructive">*</span>}
      {suggestedFields.has(field) && (
        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
          <Sparkles className="size-3 mr-1" />
          Suggested
        </Badge>
      )}
    </Label>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="size-5" />
          Group 1: Product Identity
        </CardTitle>
        <CardDescription>
          Core product information used to create or match ASIN
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            {renderLabel('productName', 'Product Name', true)}
            <Input
              id="productName"
              value={data.productName}
              onChange={(e) => handleChange('productName', e.target.value)}
              placeholder="Enter product name"
              className={errors.productName ? 'border-destructive' : ''}
            />
            {errors.productName && (
              <p className="text-xs text-destructive">{errors.productName}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {renderLabel('brand', 'Brand', true)}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="brand"
                value={data.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="Brand name"
                className={`pl-10 ${errors.brand ? 'border-destructive' : ''}`}
              />
            </div>
            {errors.brand && (
              <p className="text-xs text-destructive">{errors.brand}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {renderLabel('productType', 'Product Type', true)}
          <Input
            id="productType"
            value={data.productType}
            onChange={(e) => handleChange('productType', e.target.value)}
            placeholder="e.g., Instant Noodles, Green Tea, Chocolate Snack"
            className={errors.productType ? 'border-destructive' : ''}
          />
          {errors.productType && (
            <p className="text-xs text-destructive">{errors.productType}</p>
          )}
        </div>

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Barcode className="size-4" />
            Global Identifiers
          </h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              {renderLabel('gtin', 'GTIN')}
              <Input
                id="gtin"
                value={data.gtin || ''}
                onChange={(e) => handleChange('gtin', e.target.value)}
                placeholder="14-digit GTIN"
                className={errors.gtin ? 'border-destructive' : ''}
              />
            </div>

            <div className="flex flex-col gap-2">
              {renderLabel('upc', 'UPC')}
              <Input
                id="upc"
                value={data.upc || ''}
                onChange={(e) => handleChange('upc', e.target.value)}
                placeholder="12-digit UPC"
              />
            </div>

            <div className="flex flex-col gap-2">
              {renderLabel('ean', 'EAN')}
              <Input
                id="ean"
                value={data.ean || ''}
                onChange={(e) => handleChange('ean', e.target.value)}
                placeholder="13-digit EAN"
              />
            </div>
          </div>
        </div>

        {data.asin && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2">
              <Label>Matched ASIN</Label>
              <Badge variant="default" className="bg-success text-success-foreground">
                {data.asin}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
