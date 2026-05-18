import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Package, Plus, Trash2, ChevronDown, ChevronRight, Layers, PackageOpen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import type { AmazonCatalogProduct, CatalogVariant } from '@/lib/amazon-catalog-mock';
import { useI18n } from '@/lib/i18n/I18nContext';
import { VariationThemeBuilder } from './VariationThemeBuilder';
import { ApplyCommonValuesSection } from './ApplyCommonValuesSection';
import { InitialInventorySetup } from './InitialInventorySetup';
import { BundleComponentsSection } from './BundleComponentsSection';
import type { GeneratedVariant } from '@/lib/variant-generator';
import { ProductImagesEditor } from './ProductImagesEditor';
import type { UploadedProductImage } from '@/lib/product-images';

const variantSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  attributes: z.record(z.string()).optional(),
  price: z.coerce.number().min(0),
  inventory: z.coerce.number().int().min(0),
  weight: z.coerce.number().min(0).optional(),
  weightUnit: z.enum(['kg', 'g', 'lb', 'oz']).optional(),
  length: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  dimensionUnit: z.enum(['cm', 'in']).optional(),
});

const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  gtin: z.string().optional(),
  asin: z.string().optional(),
  base_price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  cost_price: z.coerce.number().min(0).optional().or(z.literal('')),
  images: z.array(z.string()).default([]),
  variants: z.array(variantSchema).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface SuggestedField {
  field: string;
  value: string | number;
}

interface ProductMasterFormProps {
  defaultValues?: Partial<ProductFormValues>;
  suggestedData?: AmazonCatalogProduct | null;
  suggestedFields?: SuggestedField[];
  onSubmit: (values: ProductFormValues) => void | Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  productType?: 'single' | 'variant' | 'bundle';
  productId?: string;
  userId?: string;
  onImageUploaded?: (upload: UploadedProductImage) => void;
}

function mapCatalogVariantsToFormVariants(catalogVariants: CatalogVariant[]): ProductFormValues['variants'] {
  return catalogVariants.map(v => ({
    sku: v.sku,
    attributes: v.attributes,
    price: v.price,
    inventory: v.inventory || 0,
    weight: v.shipping?.weight,
    weightUnit: v.shipping?.weightUnit,
    length: v.shipping?.length,
    width: v.shipping?.width,
    height: v.shipping?.height,
    dimensionUnit: v.shipping?.dimensionUnit,
  }));
}

export function ProductMasterForm({
  defaultValues,
  suggestedData,
  suggestedFields = [],
  onSubmit,
  onCancel,
  isLoading,
  productType = 'single',
  productId,
  userId,
  onImageUploaded,
}: ProductMasterFormProps) {
  const { t } = useI18n();
  const [expandedVariants, setExpandedVariants] = useState<Record<number, boolean>>({});
  const isVariantProduct = productType === 'variant';
  const isBundleProduct = productType === 'bundle';

  const hasMultipleVariants = suggestedData && suggestedData.variants.length > 1;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: '',
      title: '',
      description: '',
      brand: '',
      category: '',
      gtin: '',
      asin: '',
      base_price: 0,
      cost_price: '',
      images: suggestedData?.images ?? [],
      variants: suggestedData?.variants ? mapCatalogVariantsToFormVariants(suggestedData.variants) : [],
      ...defaultValues,
    },
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: 'variants',
  });

  const isSuggested = (fieldName: string) => {
    return suggestedFields.some(f => f.field === fieldName);
  };

  const toggleVariantExpand = (index: number) => {
    setExpandedVariants(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const SuggestedBadge = ({ field }: { field: string }) => {
    if (!isSuggested(field)) return null;
    return (
      <Badge variant="secondary" className="ml-2 text-xs gap-1">
        <Sparkles className="size-3" />
        Suggested
      </Badge>
    );
  };

  const addNewVariant = () => {
    appendVariant({
      sku: '',
      attributes: {},
      price: Number(form.getValues('base_price')) || 0,
      inventory: 0,
      weight: undefined,
      weightUnit: 'g',
      length: undefined,
      width: undefined,
      height: undefined,
      dimensionUnit: 'cm',
    });
    setExpandedVariants(prev => ({ ...prev, [variantFields.length]: true }));
  };

  const handleApplyCommonValues = (fields: string[]) => {
    const variants = form.getValues('variants') || [];
    const basePrice = Number(form.getValues('base_price')) || 0;

    variants.forEach((_, index) => {
      if (fields.includes('price')) {
        form.setValue(`variants.${index}.price`, basePrice);
      }
      if (fields.includes('weight')) {
        const w = variants[0]?.weight;
        if (w !== undefined) form.setValue(`variants.${index}.weight`, w);
      }
      if (fields.includes('dimensions')) {
        const v0 = variants[0];
        if (v0) {
          form.setValue(`variants.${index}.length`, v0.length);
          form.setValue(`variants.${index}.width`, v0.width);
          form.setValue(`variants.${index}.height`, v0.height);
          form.setValue(`variants.${index}.dimensionUnit`, v0.dimensionUnit);
        }
      }
      if (fields.includes('inventory')) {
        form.setValue(`variants.${index}.inventory`, variants[0]?.inventory || 0);
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* Suggested Data Banner */}
        {suggestedData && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                <div className="size-16 rounded-md overflow-hidden bg-background flex-shrink-0">
                  {suggestedData.images[0] ? (
                    <img src={suggestedData.images[0]} alt={suggestedData.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="size-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="size-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Data imported from Amazon catalog</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fields marked with "Suggested" were auto-filled. You can edit any field before saving.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Read-only product type indicator */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 py-1 px-3 text-sm">
            {isBundleProduct ? (
              <><PackageOpen className="h-3.5 w-3.5" /> Bundle / Set</>
            ) : isVariantProduct ? (
              <><Layers className="h-3.5 w-3.5" /> Variant Product</>
            ) : (
              <><Package className="h-3.5 w-3.5" /> Single Product</>
            )}
          </Badge>
        </div>

        {/* ── SECTION 1: Product Information ── */}
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="size-5" />
            {isBundleProduct
              ? 'Bundle Product Information'
              : isVariantProduct
                ? 'Common Product Information'
                : 'Product Information'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isBundleProduct
              ? 'Core details for this bundle/set product.'
              : isVariantProduct
                ? 'These fields are shared across all variants (parent-level data).'
                : 'Core product details and identifiers.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('products.basicInfo')}</CardTitle>
              <CardDescription>Core product details and identifiers</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        {isVariantProduct ? `Parent ${t('products.sku')} *` : `${t('products.sku')} *`}
                        <SuggestedBadge field="sku" />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="PROD-001" {...field} />
                      </FormControl>
                      {isVariantProduct && (
                        <FormDescription className="text-xs">
                          This is the parent SKU. Each variant will get its own child SKU.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        {t('products.brand')}
                        <SuggestedBadge field="brand" />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Brand name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      {t('products.productName')}
                      <SuggestedBadge field="title" />
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Product title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      {t('products.description')}
                      <SuggestedBadge field="description" />
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="Product description..." rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      {t('products.productType')}
                      <SuggestedBadge field="category" />
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Food, Beverages, Snacks" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gtin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        {t('products.barcode')}
                        <SuggestedBadge field="gtin" />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 4901234567001" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {isVariantProduct
                          ? 'Parent-level barcode. Each variant may have its own JAN/barcode.'
                          : 'Enter the product barcode (JAN in Japan, UPC in US, EAN in EU).'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="asin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        ASIN
                        <SuggestedBadge field="asin" />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. B0FOOD001A" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Amazon Standard Identification Number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('products.pricing')}</CardTitle>
                {isVariantProduct && (
                  <CardDescription className="text-xs">
                    Base price is the default. You can set different prices per variant below.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="base_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        {t('products.originalPrice')}
                        <SuggestedBadge field="base_price" />
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('products.costPrice')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {productId && userId ? (
          <ProductImagesEditor
            images={form.watch('images') || []}
            productId={productId}
            userId={userId}
            disabled={isLoading}
            onChange={(nextImages) => form.setValue('images', nextImages, { shouldDirty: true })}
            onUploaded={(upload) => onImageUploaded?.(upload)}
          />
        ) : null}

        {/* ── SECTION 2: Variant-specific Information (only if variant product) ── */}
        {isVariantProduct && (
          <>
            <div className="flex pt-4 border-t flex-col gap-1">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="size-5" />
                Variant-specific Information
              </h2>
              <p className="text-xs text-muted-foreground">
                Each variant (child SKU) has its own price, inventory, weight, and dimensions.
                Use the builder below to generate variants from attribute groups, or add them manually.
              </p>
            </div>

            {/* Variation Theme Builder */}
            <VariationThemeBuilder
              baseSku={form.watch('sku') || 'SKU'}
              basePrice={Number(form.watch('base_price')) || 0}
              existingVariantCount={variantFields.length}
              catalogVariationTheme={suggestedData?.variationTheme}
              catalogVariants={suggestedData?.variants}
              onGenerate={(generated: GeneratedVariant[]) => {
                const currentFields = form.getValues('variants') || [];
                for (let i = currentFields.length - 1; i >= 0; i--) {
                  removeVariant(i);
                }
                generated.forEach((v) => {
                  appendVariant({
                    sku: v.sku,
                    attributes: v.attributes,
                    price: v.price,
                    inventory: v.inventory,
                    weight: v.weight,
                    weightUnit: v.weightUnit,
                    length: v.length,
                    width: v.width,
                    height: v.height,
                    dimensionUnit: v.dimensionUnit,
                  });
                });
                setExpandedVariants({ 0: true });
              }}
            />

            {/* Apply Common Values */}
            <ApplyCommonValuesSection
              variantCount={variantFields.length}
              onApply={handleApplyCommonValues}
            />

            {/* Variants List */}
            <Card className={hasMultipleVariants ? 'border-primary/30' : ''}>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {t('products.variantsList').replace(' ({count})', '')}
                    {suggestedData && suggestedData.variants.length > 0 && (
                      <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                        <Sparkles className="size-3" />
                        {suggestedData.variants.length} variants auto-suggested
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {hasMultipleVariants
                      ? 'Variants auto-populated from catalog. Review and edit as needed.'
                      : 'Manage inventory and shipping per variant (SKU)'
                    }
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addNewVariant}>
                  <Plus className="size-4 mr-2" />
                  {t('products.addVariant')}
                </Button>
              </CardHeader>
              <CardContent>
                {variantFields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('products.noVariantsMessage')}</p>
                    <p className="text-xs">Use the builder above or add variants manually.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {variantFields.map((field, index) => (
                      <Collapsible
                        key={field.id}
                        open={expandedVariants[index]}
                        onOpenChange={() => toggleVariantExpand(index)}
                      >
                        <div className="border rounded-lg">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50">
                              <div className="flex items-center gap-3">
                                {expandedVariants[index] ? (
                                  <ChevronDown className="size-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="size-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="font-medium text-sm">
                                    {form.watch(`variants.${index}.sku`) || `Variant ${index + 1}`}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {Object.entries(field.attributes || {}).slice(0, 3).map(([key, val]) => (
                                      <Badge key={key} variant="outline" className="text-xs">
                                        {key}: {val}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-sm">${Number(form.watch(`variants.${index}.price`) || 0).toFixed(2)}</span>
                                <span className="text-sm text-muted-foreground">
                                  Qty: {form.watch(`variants.${index}.inventory`) || 0}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeVariant(index);
                                  }}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="flex border-t p-4 bg-muted/20 flex-col gap-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`variants.${index}.sku`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">SKU *</FormLabel>
                                      <FormControl>
                                        <Input {...field} className="h-8 text-sm" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`variants.${index}.price`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Price</FormLabel>
                                      <FormControl>
                                        <Input type="number" step="0.01" {...field} className="h-8 text-sm" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`variants.${index}.inventory`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Inventory</FormLabel>
                                      <FormControl>
                                        <Input type="number" {...field} className="h-8 text-sm" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>

                              {/* Shipping Info */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Shipping Information</p>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                  <FormField
                                    control={form.control}
                                    name={`variants.${index}.weight`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Weight</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.01" placeholder="0" {...field} className="h-8 text-sm" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`variants.${index}.weightUnit`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Unit</FormLabel>
                                        <FormControl>
                                          <select {...field} className="h-8 w-full text-sm border rounded px-2 bg-background">
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="oz">oz</option>
                                            <option value="lb">lb</option>
                                          </select>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`variants.${index}.length`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Length</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.1" placeholder="L" {...field} className="h-8 text-sm" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`variants.${index}.width`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Width</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.1" placeholder="W" {...field} className="h-8 text-sm" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`variants.${index}.height`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Height</FormLabel>
                                        <FormControl>
                                          <Input type="number" step="0.1" placeholder="H" {...field} className="h-8 text-sm" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── SECTION: Bundle Components (mockup) ── */}
        {isBundleProduct && <BundleComponentsSection />}

        {/* ── SECTION 3: Initial Inventory Setup ── */}
        <InitialInventorySetup variantCount={variantFields.length} />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t('common.saveChanges')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
