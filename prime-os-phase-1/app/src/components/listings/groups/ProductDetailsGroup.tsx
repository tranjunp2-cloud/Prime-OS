import { useState } from 'react';
import { FileText, Plus, X, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type ProductDetailsGroup as ProductDetailsData } from '@/lib/listing-groups';

interface ProductDetailsGroupProps {
  data: ProductDetailsData;
  onChange: (data: ProductDetailsData) => void;
  suggestedFields?: Set<string>;
  errors?: Record<string, string>;
}

export function ProductDetailsGroup({ 
  data, 
  onChange, 
  suggestedFields = new Set(),
  errors = {} 
}: ProductDetailsGroupProps) {
  const handleBulletChange = (index: number, value: string) => {
    const newBullets = [...data.bulletPoints];
    newBullets[index] = value;
    onChange({ ...data, bulletPoints: newBullets });
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...data.features];
    newFeatures[index] = value;
    onChange({ ...data, features: newFeatures });
  };

  const addFeature = () => {
    onChange({ ...data, features: [...data.features, ''] });
  };

  const removeFeature = (index: number) => {
    const newFeatures = data.features.filter((_, i) => i !== index);
    onChange({ ...data, features: newFeatures });
  };

  const renderLabel = (field: string, label: string, required = false) => (
    <Label className="flex items-center gap-2">
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
          <FileText className="size-5" />
          Group 2: Product Details
        </CardTitle>
        <CardDescription>
          Information displayed on the product detail page
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Bullet Points */}
        <div className="flex flex-col gap-3">
          {renderLabel('bulletPoints', 'Bullet Points (5 max)', true)}
          <p className="text-xs text-muted-foreground">
            Key selling points that appear as bullet points on the product page
          </p>
          {data.bulletPoints.map((bullet, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
              <Textarea
                value={bullet}
                onChange={(e) => handleBulletChange(index, e.target.value)}
                placeholder={`Bullet point ${index + 1}`}
                rows={2}
                className="flex-1"
              />
            </div>
          ))}
          {errors.bulletPoints && (
            <p className="text-xs text-destructive">{errors.bulletPoints}</p>
          )}
        </div>

        {/* Product Features */}
        <div className="flex border-t pt-4 flex-col gap-3">
          {renderLabel('features', 'Product Features')}
          <p className="text-xs text-muted-foreground">
            Additional features and specifications
          </p>
          {data.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={feature}
                onChange={(e) => handleFeatureChange(index, e.target.value)}
                placeholder={`Feature ${index + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFeature(index)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFeature}
          >
            <Plus className="size-4 mr-2" />
            Add Feature
          </Button>
        </div>

        {/* Model & Style */}
        <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
          <div className="flex flex-col gap-2">
            {renderLabel('model', 'Model Number')}
            <Input
              value={data.model || ''}
              onChange={(e) => onChange({ ...data, model: e.target.value })}
              placeholder="e.g., NIS-CUP-001"
            />
          </div>

          <div className="flex flex-col gap-2">
            {renderLabel('styleName', 'Style Name')}
            <Input
              value={data.styleName || ''}
              onChange={(e) => onChange({ ...data, styleName: e.target.value })}
              placeholder="e.g., Classic, Premium, Limited Edition"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
