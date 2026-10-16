import type { ReactNode } from 'react';
import { ArrowRight, Globe2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProductImagePreview } from './ProductImagePreview';
import { cn } from '@/lib/utils';
import styles from './ProductOverviewSnapshot.module.css';

interface TranslationSummary {
  locale: string;
  label: string;
  status: 'complete' | 'partial' | 'missing';
}

interface SnapshotProps {
  name: string;
  sku: string;
  category: string;
  brand: string;
  description: string;
  hasVariants: boolean;
  variantCount: number;
  images: readonly string[];
  imageAltTexts: readonly string[];
  stock: string;
  price: string;
  priceNote?: string | undefined;
  stockRecorded?: boolean;
  listingCount: number;
  channelCount: number;
  translations: TranslationSummary[];
  imported: boolean;
  source?: string | undefined;
  onCommerce: () => void;
  onProductData: () => void;
  onListings: () => void;
  onSelectLocale: (locale: string) => void;
  onReviewImportedLinks?: (() => void) | undefined;
}

function Metric({ label, value, suffix, note, onClick, accessibleName }: { label: string; value: string | number; suffix?: ReactNode; note?: string | undefined; onClick: () => void; accessibleName: string }) {
  return <button type="button" aria-label={accessibleName} onClick={onClick} className="group min-h-16 min-w-0 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
    <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">{label}<ArrowRight aria-hidden="true" className="size-3 shrink-0 opacity-50 group-hover:opacity-100" /></span>
    <span className="mt-1 block break-words text-base font-semibold tabular-nums">{value}{suffix && <span className="text-xs font-normal text-muted-foreground"> {suffix}</span>}</span>
    {note && <span className="mt-1 block text-xs font-normal text-muted-foreground">{note}</span>}
  </button>;
}

export function ProductOverviewSnapshot({ name, sku, category, brand, description, hasVariants, variantCount, images, imageAltTexts, stock, stockRecorded = true, price, priceNote, listingCount, channelCount, translations, imported, source, onCommerce, onProductData, onListings, onSelectLocale, onReviewImportedLinks }: SnapshotProps) {
  const completeTranslations = translations.filter(item => item.status === 'complete').length;
  const sourceLabel = source?.trim() || 'Not recorded';

  return <section className={cn('rounded-lg border bg-card', styles.root)} aria-label="Product summary" data-testid="product-overview-snapshot">
    <div className={styles.body}>
      <div className={styles.identity}>
        <ProductImagePreview name={name} images={images} imageAltTexts={imageAltTexts} onProductData={onProductData} variant="overview" />
        <div className={styles.details}>
          <dl className={styles.facts} aria-label="Product identity">
            <div><dt>Master SKU</dt><dd className="font-mono">{sku.trim() || 'Not assigned'}</dd></div>
            <div><dt>Brand</dt><dd>{brand.trim() || 'Not provided'}</dd></div>
            <div><dt>Category</dt><dd>{category.trim() || 'Not provided'}</dd></div>
            <div><dt>Product type</dt><dd>{hasVariants ? 'Product with variants' : 'Single product'}<span className="mt-0.5 block text-xs font-normal text-muted-foreground">{hasVariants ? `${variantCount} variant SKU${variantCount === 1 ? '' : 's'}` : '1 sellable SKU'}</span></dd></div>
          </dl>
          <div className={styles.description}><p className="text-xs text-muted-foreground">Description</p><p className="mt-1 line-clamp-2 text-sm leading-5">{description.trim() || 'Not provided'}</p></div>
        </div>
      </div>
      <div className={cn('grid divide-x', styles.metrics)} role="group" aria-label="Product essentials">
          <Metric label="Master stock" accessibleName="View Master stock" value={stockRecorded ? stock : 'Not recorded'} suffix={stockRecorded ? 'units' : undefined} onClick={onCommerce} />
          <Metric label={hasVariants ? 'Variant prices' : 'Base price'} accessibleName={hasVariants ? 'View variant prices' : 'View base price'} value={price} note={priceNote} onClick={onCommerce} />
          <Metric label="Linked listings" accessibleName="View linked listings" value={listingCount} suffix={`${listingCount === 1 ? 'listing' : 'listings'} · ${channelCount} ${channelCount === 1 ? 'channel' : 'channels'}`} onClick={onListings} />
      </div>
      <div className={styles.footer}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {translations.length ? <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Translations: ${completeTranslations} of ${translations.length} complete`}>
                <Globe2 aria-hidden="true" className="size-3.5" />Translations {completeTranslations}/{translations.length}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72" aria-label="Translation progress">
              <p className="text-sm font-semibold">Translation progress</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Optional for Master activation. Select a language to view its content.</p>
              <div className="mt-2">{translations.map(item => <button type="button" key={item.locale} className="flex min-h-11 w-full items-center justify-between gap-2 rounded px-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onSelectLocale(item.locale)}>
                <span>{item.label}</span>{' '}<span className={cn('text-xs capitalize', item.status === 'complete' ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground')}>{item.status}</span>
              </button>)}</div>
            </PopoverContent>
          </Popover> : <span>Primary language only</span>}
          {imported && <Popover>
            <PopoverTrigger asChild>
              <button type="button" aria-label="Product source" title={`Source: ${sourceLabel}`} className="flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Info aria-hidden="true" className="size-3.5 shrink-0" /><span className="max-w-52 truncate">Source: {sourceLabel}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="space-y-2 text-xs leading-5" aria-label="Product source">
              <p className="font-semibold">Imported product data</p>
              <p>{source?.trim() ? `Source: ${source.trim()}` : 'Source not recorded'}</p>
              {onReviewImportedLinks && <Button type="button" size="sm" variant="outline" onClick={onReviewImportedLinks}>Review shop links in inbox<ArrowRight /></Button>}
            </PopoverContent>
          </Popover>}
        </div>
        <Button type="button" variant="ghost" size="sm" className="min-h-11 shrink-0 text-xs" onClick={onProductData}>View product data<ArrowRight aria-hidden="true" className="size-3.5" /></Button>
      </div>
    </div>
  </section>;
}
