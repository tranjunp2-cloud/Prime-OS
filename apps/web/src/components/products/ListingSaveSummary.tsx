import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { Product, ListingDraftValues } from '@/lib/product-store';
import { ListingChannelReadiness } from './ListingChannelReadiness';
import type { VariantMappings } from '@/lib/listing-master-completion';
import { MASTER_MAPPING_TARGETS, fieldValue } from '@/lib/listing-field-mapping';
import { getProductCatalogSettings } from '@/lib/product-catalog-settings-store';
import { resolveSourceSkuMappings } from '@/lib/listing-sku-mapping';

export function ListingSaveSummary({ product, baseline, sources, mappings, listingDrafts, editing, creating, confirmLabel, onBack, onConfirm }: {
  product: Product; baseline?: Product; sources: CatalogImportItem[]; mappings: VariantMappings;
  editing: boolean; creating: boolean; confirmLabel: string; onBack: () => void; onConfirm: () => void;
  listingDrafts?: Record<string, ListingDraftValues>;
}) {
  const settings = getProductCatalogSettings();
  const displayValue = (item: Product, key: string) => {
    const value = fieldValue(item, key);
    if (key === 'categoryId') return settings.categories.find(category => category.id === value)?.name || item.category || 'Not set';
    if (key === 'brandId') return settings.brands.find(brand => brand.id === value)?.name || item.brand || 'Not set';
    if (key === 'retail_price') return `${value} ${item.price_currency}`;
    return value === '' ? 'Not set' : String(value);
  };
  const changes = baseline && editing ? MASTER_MAPPING_TARGETS.filter(target => String(fieldValue(product, target.key)) !== String(fieldValue(baseline, target.key))) : [];
  const extraSkus = product.skus.filter(sku => !baseline?.skus.some(old => old.id === sku.id));
  const skuChanges = baseline && editing && JSON.stringify(product.skus) !== JSON.stringify(baseline.skus);
  const imagesChanged = baseline && editing && JSON.stringify(product.images) !== JSON.stringify(baseline.images);
  const optionsChanged = baseline && editing && JSON.stringify(product.variant_options) !== JSON.stringify(baseline.variant_options);
  const attributesChanged = baseline && editing && JSON.stringify(product.specifications) !== JSON.stringify(baseline.specifications);
  const active = creating || editing || product.status === 'published';
  return <Dialog open onOpenChange={open => { if (!open) onBack(); }}>
    <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 p-0">
      <DialogHeader className="border-b p-5 pr-12"><DialogTitle>Review before saving</DialogTitle><DialogDescription>{sources.length} listing{sources.length === 1 ? '' : 's'} → 1 Product Master. Nothing has been saved yet.</DialogDescription></DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto p-5">
        <div className="flex flex-wrap justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-semibold">{product.name}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{product.sku_code}</p></div><span className="text-xs text-muted-foreground">{creating ? 'New Master' : 'Master'} · {active ? 'Active' : 'Draft'} after saving</span></div>
        <ul className="divide-y rounded-lg border" aria-label="Links to save">{sources.map(source => {
          const rows = product.has_variants ? resolveSourceSkuMappings(source, product, mappings[source.id]) : [];
          return <li key={source.id} className="px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-medium">{source.title}</p><p className="mt-1 text-xs text-muted-foreground">{source.storeName} · {source.channelSku}</p></div><span className="text-xs text-muted-foreground">{rows.length ? `${rows.length} SKU pairs to confirm` : 'Product link to confirm'}</span></div>{rows.length > 0 && <details className="mt-2"><summary className="w-fit cursor-pointer py-1 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View SKU pairs</summary><ul className="mt-1 space-y-1 text-xs">{rows.map((row, index) => <li key={index} className="break-words">{row.shop_sku} → {product.skus.find(sku => sku.id === row.master_sku_id)?.sku_code || 'Not selected'}</li>)}</ul></details>}</li>;
        })}</ul>
        {creating ? <p className="text-sm">Create this Master with the reviewed product details{product.has_variants ? ` and ${product.skus.length} variant SKUs` : ''}, then activate and link.</p> : editing ? <section aria-label="Master changes to save" className="space-y-2"><h3 className="text-sm font-semibold">Master changes</h3>{changes.length > 0 && <dl className="divide-y">{changes.map(target => <div key={target.key} className="grid gap-1 py-2 text-xs sm:grid-cols-[140px_1fr]"><dt className="font-medium">{target.label}</dt><dd className="min-w-0 break-words"><span className="text-muted-foreground">{displayValue(baseline!, target.key)}</span><span className="mx-2">→</span>{displayValue(product, target.key)}</dd></div>)}</dl>}{skuChanges && <p className="text-xs">{extraSkus.length ? `${extraSkus.length} additional SKU${extraSkus.length === 1 ? '' : 's'}; ` : ''}{product.skus.length} Master SKUs after saving. Existing warehouse stock is preserved.</p>}{optionsChanged && <p className="text-xs">Variant options updated.</p>}{attributesChanged && <p className="text-xs">Category attributes updated.</p>}{imagesChanged && <p className="text-xs">Images updated: {baseline!.images.length} → {product.images.length}.</p>}{!changes.length && !skuChanges && !imagesChanged && !optionsChanged && !attributesChanged && <p className="text-xs text-muted-foreground">Existing Master details are unchanged.</p>}</section> : <p className="text-sm text-muted-foreground">Only listing relationships and reviewed SKU mappings are saved. Master details and status are unchanged.</p>}
        <ListingChannelReadiness product={product} activateMaster={active} sources={sources} mappings={mappings} drafts={listingDrafts} />
        <p className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground"><ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />Nothing is published to shops. Shop prices, warehouse stock and sync settings are unchanged.</p>
      </div>
      <DialogFooter className="border-t p-4"><Button variant="outline" className="h-11" onClick={onBack}>Back to review</Button><Button className="h-11" onClick={onConfirm}>{confirmLabel}<ArrowRight className="size-4" /></Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
