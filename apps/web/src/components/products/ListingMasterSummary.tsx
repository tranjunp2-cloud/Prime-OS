import type { ReactNode } from 'react';
import { ArrowRight, ImageOff } from 'lucide-react';
import type { Product } from '@/lib/product-store';
import type { CatalogImportItem } from '@/lib/catalog-import-store';
import type { VariantMappings } from '@/lib/listing-master-completion';
import { fieldValue } from '@/lib/listing-field-mapping';
import { resolveSourceSkuMappings, sourceSkuDataError, sourceSkuItems } from '@/lib/listing-sku-mapping';
import { assignedCategoryAttributes } from '@/lib/category-schema';
import { getProductCatalogSettings, resolveCatalogCategory } from '@/lib/product-catalog-settings-store';
import { ListingReviewHelp } from './ListingReviewHelp';

type Props = { group: string; product: Product; sources: CatalogImportItem[]; mappings: VariantMappings; imageStates: Record<string, boolean> };

/** Values remain readable without opening a form; provenance is never inferred from matching text. */
export function ListingMasterSummary({ group, product, sources, mappings, imageStates }: Props) {
  const settings = getProductCatalogSettings();
  const category = resolveCatalogCategory(product, settings.categories);
  const mappedIds = new Set(sources.flatMap(source => resolveSourceSkuMappings(source, product, mappings[source.id]).map(row => row.master_sku_id)));
  const otherSkus = product.skus.filter(sku => sku.status === 'active' && !mappedIds.has(sku.id));
  const provenance = (key: string, label: string) => {
    const decision = product.field_mappings?.[key];
    const source = decision?.source;
    if (!source) return null;
    const caption = decision.mode === 'manual' ? 'Edited manually' : `${sources.length > 1 ? source.shop : source.channel} · ${source.fieldLabel}`;
    return <ListingReviewHelp label={`${label} source`} caption={caption}>
      <p>{source.shop} · {source.channel} · {source.listingId}</p>
      <p className="mt-1">{source.fieldLabel} → {label}</p>
      <p className="mt-1 whitespace-pre-wrap">Source value: {source.rawValue}{source.unit && ` ${source.unit}`}{source.currency && ` ${source.currency}`}</p>
      {decision.transform && <p className="mt-1">{decision.transform}</p>}
      {decision.mode === 'manual' && <p className="mt-1">The proposed Master value was edited. The source listing is unchanged.</p>}
    </ListingReviewHelp>;
  };
  const value = (label: string, display: ReactNode, key?: string, required = false, className = '') => <div className={`min-w-0 ${className}`} key={label}>
    <dt className="flex min-h-8 flex-wrap items-center gap-x-3 text-xs text-muted-foreground"><span>{label}</span>{key && provenance(key, label)}</dt>
    <dd className="mt-1 break-words text-sm leading-5">{display || <span className={required ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}>{required ? 'Not provided' : '—'}</span>}</dd>
  </div>;
  const grid = (children: ReactNode) => <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">{children}</dl>;
  if (group === 'identity') return <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
    {value('Product name', product.name, 'name', true, 'lg:col-span-2')}
    {value('Master SKU', <span className="break-all font-mono">{product.sku_code || 'Not provided'}</span>)}
    {value('Master category', category?.name, 'categoryId')}
    {value('Brand', product.brand, 'brandId')}
    {value('Product type', product.has_variants ? `With variants · ${product.skus.length} Master SKUs` : 'Single product')}
  </dl>;
  if (group === 'price') return grid(<>{value('Base price', product.retail_price > 0 ? `${product.retail_price.toLocaleString()} ${product.price_currency}` : '', 'retail_price', true)}</>);
  if (group === 'variants') return <div className="space-y-3">
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">{product.variant_options?.map((option, index) => <p key={index}><span className="text-muted-foreground">{option.name || `Option ${index + 1}`}: </span>{option.values.join(', ') || 'Not provided'}</p>)}</div>
    {sources.map(source => {
      const rows = resolveSourceSkuMappings(source, product, mappings[source.id]);
      const items = sourceSkuItems(source);
      const incomplete = sourceSkuDataError(source);
      return <div key={source.id}>
        <p className="mb-2 text-xs text-muted-foreground">{source.storeName} · {source.channel}</p>
        <div className="overflow-hidden rounded-md border">
          <div className="hidden grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_100px] gap-3 bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:grid"><span>Shop SKU</span><span /><span>Proposed Master SKU</span><span className="text-right">Price</span></div>
          {items.map((item, index) => {
            const sku = product.skus.find(sku => sku.id === rows[index]?.master_sku_id && sku.status === 'active');
            return <div key={`${item.sku}:${index}`} className="grid gap-x-3 gap-y-1 border-t px-3 py-2.5 first:border-0 sm:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_100px] sm:items-center">
              <div className="min-w-0"><p className="break-all font-mono text-xs">{item.sku}</p><p className="mt-0.5 break-words text-xs text-muted-foreground">{item.label}</p></div>
              <ArrowRight className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
              <div className="min-w-0"><span className="text-xs text-muted-foreground sm:hidden">Master: </span><span className={`break-all font-mono text-xs ${!sku ? 'text-amber-700 dark:text-amber-300' : ''}`}>{sku?.sku_code || 'No match'}</span><p className="mt-0.5 break-words text-xs text-muted-foreground">{sku?.variation_name}</p><p className="mt-0.5 text-xs text-muted-foreground">{incomplete ? 'Source data incomplete' : sku ? mappings[source.id] ? 'Selected · not linked yet' : 'Suggested · review before saving' : 'Needs matching'}</p></div>
              <p className="text-xs sm:text-right">{sku?.price !== undefined && sku.price > 0 ? `${sku.price.toLocaleString()} ${product.price_currency}` : <span className="text-amber-700 dark:text-amber-300">No price</span>}</p>
            </div>;
          })}
          {!items.length && <p className="p-3 text-xs text-amber-700 dark:text-amber-300">{source.variants} shop SKUs reported, but SKU details have not been imported.</p>}
        </div>
      </div>;
    })}
    {otherSkus.length > 0 && <div className="border-t pt-3"><p className="mb-2 text-xs font-medium">Other Master SKUs · not mapped to these listings</p>{otherSkus.map(sku => <div key={sku.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-1 text-xs"><span className="min-w-0 break-all font-mono">{sku.sku_code || 'SKU not provided'}<span className="ml-2 font-sans text-muted-foreground">{sku.variation_name}</span></span><span>{sku.price !== undefined && sku.price > 0 ? `${sku.price.toLocaleString()} ${product.price_currency}` : 'No price'}</span></div>)}</div>}
  </div>;
  if (group === 'attributes') {
    const attributes = assignedCategoryAttributes(category, settings.attributes).filter(attribute => attribute.required && !product.variant_options?.some(option => product.has_variants && option.attributeKey === attribute.key));
    return attributes.length ? grid(attributes.map(attribute => value(attribute.name, fieldValue(product, `attribute:${attribute.key}`), `attribute:${attribute.key}`)))
      : <p className="text-xs text-muted-foreground">{category ? 'No shared attributes to complete.' : 'Choose a Master category to add shared attributes.'}</p>;
  }
  if (group === 'content') return <div className="flex flex-col gap-3">
    <div className="min-w-0 flex-1"><p className="line-clamp-3 whitespace-pre-line break-words text-sm leading-6">{product.description || <span className="text-amber-700 dark:text-amber-300">Description not provided</span>}</p>{product.description && <details className="mt-1 text-xs"><summary className="min-h-8 cursor-pointer py-2 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Read full description</summary><p className="whitespace-pre-line break-words py-2 leading-5">{product.description}</p></details>}{provenance('description', 'Description')}</div>
    <div className="shrink-0 sm:max-w-56"><div className="flex flex-wrap gap-2">{product.images.slice(0, 3).map((src, index) => <div key={src} className="relative grid size-14 place-items-center overflow-hidden rounded-md border bg-muted/30">{imageStates[src] === false ? <ImageOff aria-label={`Image ${index + 1} unavailable`} className="size-5 text-muted-foreground" /> : <img src={src} alt="" className="size-full object-contain" />}{index === 0 && <span className="absolute inset-x-0 bottom-0 bg-background/90 text-center text-[10px]">Cover</span>}</div>)}</div><p className="mt-2 text-xs text-muted-foreground">{product.images.length} image{product.images.length === 1 ? '' : 's'}</p></div>
  </div>;
  if (group === 'shipping') return grid(<>
    {value('Package dimensions', [product.pkg_length, product.pkg_width, product.pkg_height].every(n => n > 0) ? `${product.pkg_length} × ${product.pkg_width} × ${product.pkg_height} cm` : '', undefined)}
    {value('Package weight', product.pkg_weight > 0 ? `${product.pkg_weight} g` : '', 'pkg_weight')}
  </>);
  if (!product.model_number && !product.gtin && !product.mpn && product.pack_quantity == null) return <p className="text-xs text-muted-foreground">No additional identifiers provided.</p>;
  return grid(<>{value('Model', product.model_number, 'model_number')}{value('Barcode (GTIN)', product.gtin, 'gtin')}{value('Manufacturer part number', product.mpn, 'mpn')}{value('Pack quantity', product.pack_quantity, 'pack_quantity')}</>);
}
