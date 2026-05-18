import { useState, useEffect, useRef } from 'react';
import { X, Search, Info, ChevronRight, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { searchAmazonCatalog, type AmazonCatalogProduct, type AmazonVariant } from '@/lib/amazon-catalog';
import { SelectVariantsDialog } from './SelectVariantsDialog';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingSkus: string[];
  onConfirm: (params: {
    productFamily: string;
    sku: string;
    hasVariants: boolean;
    amazonAsin?: string;
    amazonTitle?: string;
    amazonBrand?: string;
    amazonImages?: string[];
    amazonMsrp?: number;
    selectedVariants?: AmazonVariant[];
  }) => void;
}

const PRODUCT_FAMILIES = [
  'Watch', 'Shoe', 'Bag', 'Hat', 'Jacket', 'Sunglasses',
  'Bicycle', 'Headphones', 'Electronics', 'Food & Beverages',
  'Beauty & Personal Care', 'Home & Living', 'Sports', 'Books', 'Toys',
];

export function CreateProductDialog({
  open,
  onOpenChange,
  existingSkus,
  onConfirm,
}: CreateProductDialogProps) {
  const [productFamily, setProductFamily] = useState('');
  const [sku, setSku] = useState('');
  const [hasVariants, setHasVariants] = useState(false);
  const [errors, setErrors] = useState<{ family?: string; sku?: string }>({});

  // Amazon search state
  const [showAmazonSection, setShowAmazonSection] = useState(false);
  const [amazonQuery, setAmazonQuery] = useState('');
  const [amazonResults, setAmazonResults] = useState<AmazonCatalogProduct[]>([]);
  const [amazonLoading, setAmazonLoading] = useState(false);
  const [amazonError, setAmazonError] = useState('');
  const [selectedAmazonProduct, setSelectedAmazonProduct] = useState<AmazonCatalogProduct | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<AmazonVariant[]>([]);
  const [showSelectVariants, setShowSelectVariants] = useState(false);
  const [showUncheckConfirm, setShowUncheckConfirm] = useState(false);
  const hasVariantsRef = useRef(hasVariants);
  useEffect(() => { hasVariantsRef.current = hasVariants; }, [hasVariants]);

  // Auto-show Amazon section when hasVariants is checked
  useEffect(() => {
    if (hasVariants) {
      setShowAmazonSection(true);
    }
  }, [hasVariants]);

  function reset() {
    setProductFamily('');
    setSku('');
    setHasVariants(false);
    setErrors({});
    setAmazonQuery('');
    setAmazonResults([]);
    setAmazonLoading(false);
    setAmazonError('');
    setSelectedAmazonProduct(null);
    setSelectedVariants([]);
    setShowAmazonSection(false);
    setShowUncheckConfirm(false);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function handleSkuChange(val: string) {
    setSku(val.toUpperCase());
    if (errors.sku) setErrors(e => ({ ...e, sku: undefined }));
  }

  function handleFamilyChange(val: string) {
    setProductFamily(val);
    if (errors.family) setErrors(e => ({ ...e, family: undefined }));
  }

  function handleHasVariantsChange(checked: boolean) {
    if (!checked && hasVariantsRef.current) {
      // Check if user has already interacted with variant data
      const hasData = selectedAmazonProduct || selectedVariants.length > 0;
      if (hasData) {
        setShowUncheckConfirm(true);
        return;
      }
    }
    applyHasVariants(checked);
  }

  function applyHasVariants(checked: boolean) {
    setHasVariants(checked);
    if (checked) {
      setShowAmazonSection(true);
    }
    setSelectedAmazonProduct(null);
    setSelectedVariants([]);
  }

  async function handleAmazonSearch() {
    if (!amazonQuery.trim()) return;
    setAmazonLoading(true);
    setAmazonError('');
    setSelectedAmazonProduct(null);
    try {
      const results = await searchAmazonCatalog(amazonQuery.trim());
      setAmazonResults(results);
      if (results.length === 0) {
        setAmazonError('No products found. Try a different search term or ASIN.');
      }
    } catch {
      setAmazonError('Search failed. Please try again.');
    } finally {
      setAmazonLoading(false);
    }
  }

  function handleAmazonQueryChange(val: string) {
    setAmazonQuery(val);
    setAmazonError('');
    // Debounce search on Enter key only
  }

  function handleAmazonKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAmazonSearch();
    }
  }

  function handleSelectAmazonProduct(product: AmazonCatalogProduct) {
    setSelectedAmazonProduct(product);
    setSelectedVariants([]);

    if (product.variants && product.variants.length > 0) {
      // Show SelectVariantsDialog
      setShowSelectVariants(true);
    }
  }

  function handleVariantsSelected(variants: AmazonVariant[]) {
    setSelectedVariants(variants);
    setShowSelectVariants(false);
  }

  function handleSubmit() {
    const e: typeof errors = {};

    if (!productFamily) {
      e.family = 'Product family is required';
    }
    if (!sku.trim()) {
      e.sku = 'SKU code is required';
    } else if (existingSkus.map(s => s.toUpperCase()).includes(sku.toUpperCase().trim())) {
      e.sku = 'This SKU code already exists';
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    onConfirm({
      productFamily: productFamily.trim(),
      sku: sku.trim(),
      hasVariants,
      amazonAsin: selectedAmazonProduct?.asin,
      amazonTitle: selectedAmazonProduct?.title,
      amazonBrand: selectedAmazonProduct?.brand,
      amazonImages: selectedAmazonProduct?.images,
      amazonMsrp: selectedAmazonProduct?.msrp,
      selectedVariants: selectedVariants.length > 0 ? selectedVariants : undefined,
    });
    handleClose();
  }

  const isCreateEnabled = productFamily && sku.trim();

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-8">
            <DialogTitle>Create new product</DialogTitle>
            <DialogDescription>
              Start with the product family and SKU, then optionally link Amazon catalog data to speed up setup.
            </DialogDescription>
          </DialogHeader>

          {/* Form */}
          <div className="space-y-5">
            {/* Product Family */}
            <div className="space-y-1.5">
              <Label htmlFor="product-family">
                Product family <span className="text-destructive">*</span>
              </Label>
              <select
                id="product-family"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={productFamily}
                onChange={e => handleFamilyChange(e.target.value)}
              >
                <option value="">Select product family</option>
                {PRODUCT_FAMILIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              {errors.family && (
                <p className="text-xs text-destructive">{errors.family}</p>
              )}
            </div>

            {/* SKU Code */}
            <div className="space-y-1.5">
              <Label htmlFor="sku-code">
                SKU code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sku-code"
                value={sku}
                onChange={e => handleSkuChange(e.target.value)}
                placeholder="e.g. SKU-0001"
                className="font-mono uppercase"
                maxLength={30}
              />
              {errors.sku && (
                <p className="text-xs text-destructive">{errors.sku}</p>
              )}
            </div>

            {/* Has Variants */}
            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="has-variants"
                checked={hasVariants}
                onCheckedChange={(v) => handleHasVariantsChange(Boolean(v))}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label htmlFor="has-variants" className="text-sm font-normal cursor-pointer">
                  This product has multiple variations
                </Label>
                <p className="text-xs text-muted-foreground">
                  e.g. same product in different sizes, colors, or capacities
                </p>
              </div>
            </div>

            {/* Amazon Catalog Search */}
            {showAmazonSection && (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">QUICK ADD FROM AMAZON CATALOG</h3>
                  <Info className="size-3.5 text-muted-foreground" />
                </div>

                {/* Search input */}
                <div className="space-y-1.5">
                  <Label htmlFor="amazon-search" className="text-xs">
                    Product title / Product code (GTIN/JAN/EAN/ASIN/UPC...)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="amazon-search"
                      value={amazonQuery}
                      onChange={e => handleAmazonQueryChange(e.target.value)}
                      onKeyDown={handleAmazonKeyDown}
                      placeholder="Search for products..."
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAmazonSearch}
                      disabled={amazonLoading || !amazonQuery.trim()}
                    >
                      {amazonLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                    </Button>
                  </div>
                </div>

                {/* Results */}
                {amazonError && (
                  <p className="text-xs text-destructive">{amazonError}</p>
                )}

                {amazonResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {amazonResults.map(product => {
                      const isSelected = selectedAmazonProduct?.asin === product.asin;
                      const variantCount = product.variants?.length ?? 0;

                      return (
                        <button
                          key={product.asin}
                          onClick={() => handleSelectAmazonProduct(product)}
                          className={`w-full flex gap-3 p-3 rounded-lg border text-left transition-colors ${
                            isSelected
                              ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                          }`}
                        >
                          {product.images[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="size-12 rounded-md object-cover shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug line-clamp-2">
                              {product.title}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {variantCount > 0 && (
                                <span className="rounded bg-sky-500/14 px-1.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-500/18 dark:text-sky-300">
                                  {variantCount} variations
                                </span>
                              )}
                              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono">
                                ASIN: {product.asin}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <ChevronRight className="size-4 text-primary shrink-0 mt-3" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected product summary */}
                {selectedAmazonProduct && !showSelectVariants && (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/8 p-2 dark:bg-emerald-500/10">
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                      <svg className="size-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
                      Linked: {selectedAmazonProduct.title.slice(0, 50)}
                      {selectedAmazonProduct.title.length > 50 ? '...' : ''}
                      {selectedVariants.length > 0 && ` · ${selectedVariants.length} variant(s) selected`}
                    </p>
                    <button
                      onClick={() => { setSelectedAmazonProduct(null); setSelectedVariants([]); }}
                      aria-label="Clear linked Amazon product"
                      className="ml-auto flex size-5 items-center justify-center rounded text-emerald-700 transition-colors hover:bg-emerald-500/12 dark:text-emerald-300"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isCreateEnabled}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Variants Dialog */}
      <SelectVariantsDialog
        open={showSelectVariants}
        product={selectedAmazonProduct}
        onSelect={handleVariantsSelected}
        onCancel={() => setShowSelectVariants(false)}
      />

      <ConfirmDialog
        open={showUncheckConfirm}
        onOpenChange={setShowUncheckConfirm}
        title="Remove variant setup?"
        description="The variant information you entered will be cleared if you convert this product back to a non-variant item."
        confirmText="Convert to Single"
        cancelText="Keep Variants"
        variant="destructive"
        onConfirm={() => {
          setShowUncheckConfirm(false);
          applyHasVariants(false);
        }}
      />
    </>
  );
}
