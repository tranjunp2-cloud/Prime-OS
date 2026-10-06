import { useId, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Globe2, ImageOff, Info, Package, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import styles from './ProductOverviewSnapshot.module.css';

interface TranslationSummary {
  locale: string;
  label: string;
  status: 'complete' | 'partial' | 'missing';
}

interface SnapshotProps {
  name: string;
  images: readonly string[];
  imageAltTexts: readonly string[];
  brand: string;
  category: string;
  productStructure: string;
  stock: string;
  price: string;
  listingCount: number;
  channelCount: number;
  translations: TranslationSummary[];
  imported: boolean;
  source?: string | undefined;
  onCommerce: () => void;
  onListings: () => void;
  onProductData: () => void;
  onSelectLocale: (locale: string) => void;
  onReviewImportedLinks?: (() => void) | undefined;
}

function PreviewImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span role="img" aria-label={`${alt} — image unavailable`} className="flex size-full flex-col items-center justify-center gap-2 bg-muted px-2 text-center text-xs text-muted-foreground"><ImageOff aria-hidden="true" className="size-5" />Image unavailable</span>
    : <img src={src} alt={alt} className={cn('size-full object-contain', className)} onError={() => setFailed(true)} />;
}

function Metric({ label, value, suffix, onClick, accessibleName }: { label: string; value: string | number; suffix?: ReactNode; onClick: () => void; accessibleName: string }) {
  return <button type="button" aria-label={accessibleName} onClick={onClick} className="group min-w-0 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
    <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">{label}<ArrowRight aria-hidden="true" className="size-3 shrink-0 opacity-50 group-hover:opacity-100" /></span>
    <span className="mt-1 block text-base font-semibold tabular-nums">{value}{suffix && <span className="text-xs font-normal text-muted-foreground"> {suffix}</span>}</span>
  </button>;
}

export function ProductOverviewSnapshot({ name, images, imageAltTexts, brand, category, productStructure, stock, price, listingCount, channelCount, translations, imported, source, onCommerce, onListings, onProductData, onSelectLocale, onReviewImportedLinks }: SnapshotProps) {
  const id = useId();
  const [selectedImage, setSelectedImage] = useState(0);
  const media = images.flatMap((src, index) => src.trim() ? [{ src, alt: imageAltTexts[index]?.trim() || `${name || 'Product'} — image ${index + 1}` }] : []);
  const imageIndex = Math.min(selectedImage, Math.max(0, media.length - 1));
  const completeTranslations = translations.filter(item => item.status === 'complete').length;
  const sourceLabel = source?.trim() || 'Not recorded';
  const goToImage = (index: number) => setSelectedImage(Math.max(0, Math.min(media.length - 1, index)));

  return <section className={cn('rounded-xl border bg-card', styles.root)} aria-labelledby={`${id}-title`} data-testid="product-overview-snapshot">
    <div className={styles.body}>
      {media.length ? <Dialog>
        <DialogTrigger asChild><button type="button" onClick={() => setSelectedImage(0)} className="group relative size-28 shrink-0 overflow-hidden rounded-lg border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label={`View product images (${media.length})`}>
          <PreviewImage key={media[0].src} src={media[0].src} alt={media[0].alt} />
          <span aria-hidden="true" className="absolute right-1.5 top-1.5 rounded bg-background/90 p-1 text-foreground shadow-sm"><ZoomIn className="size-3.5" /></span>
          <span className="absolute inset-x-0 bottom-0 bg-background/90 px-1 py-1 text-center text-xs font-medium">{media.length} {media.length === 1 ? 'image' : 'images'}</span>
        </button></DialogTrigger>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto p-4 motion-reduce:animate-none" onKeyDown={event => {
          if (event.key === 'ArrowRight') { event.preventDefault(); goToImage(imageIndex + 1); }
          if (event.key === 'ArrowLeft') { event.preventDefault(); goToImage(imageIndex - 1); }
        }}>
          <DialogHeader className="pr-8 text-left"><DialogTitle>Product images</DialogTitle><DialogDescription>{name || 'Untitled Product Master'} · Read-only preview</DialogDescription></DialogHeader>
          <div className="h-[min(50dvh,440px)] overflow-hidden rounded-lg border bg-muted/20"><PreviewImage key={media[imageIndex].src} src={media[imageIndex].src} alt={media[imageIndex].alt} /></div>
          <div className="flex items-center justify-between gap-3"><Button type="button" variant="outline" size="icon" className="size-11" aria-label="Previous image" disabled={imageIndex === 0} onClick={() => goToImage(imageIndex - 1)}><ArrowLeft /></Button><p className="text-xs text-muted-foreground" aria-live="polite">Image {imageIndex + 1} of {media.length}{imageIndex === 0 ? ' · Main image' : ''}</p><Button type="button" variant="outline" size="icon" className="size-11" aria-label="Next image" disabled={imageIndex === media.length - 1} onClick={() => goToImage(imageIndex + 1)}><ArrowRight /></Button></div>
          {media.length > 1 && <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Image thumbnails">{media.map((item, index) => <button key={`${item.src}:${index}`} type="button" aria-label={`Show image ${index + 1}`} aria-pressed={imageIndex === index} onClick={() => setSelectedImage(index)} className={cn('size-14 overflow-hidden rounded-md border-2 bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', imageIndex === index ? 'border-primary' : 'border-transparent hover:border-muted-foreground')}><PreviewImage src={item.src} alt="" /></button>)}</div>}
        </DialogContent>
      </Dialog> : <button type="button" onClick={onProductData} aria-label="View product media — no images" className="flex size-28 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 text-xs text-muted-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Package aria-hidden="true" className="size-6" /><span>No images</span></button>}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 id={`${id}-title`} className="min-w-0 max-w-full break-words text-sm font-semibold">{name.trim() || 'Untitled Product Master'}</h2>
          <p className="min-w-0 truncate text-xs text-muted-foreground" title={`${brand || 'Brand not set'} · ${category || 'Category not set'}`}>{brand || 'Brand not set'} · {category || 'Category not set'}</p>
        </div>
        <div className={cn('my-1 grid divide-x', styles.metrics)} role="group" aria-label="Product essentials">
          <Metric label="Master stock" accessibleName="View Master stock" value={stock} suffix="units" onClick={onCommerce} />
          <Metric label="Base price" accessibleName="View base price" value={price} onClick={onCommerce} />
          <Metric label="Linked listings" accessibleName="View linked listings" value={listingCount} suffix={`· ${channelCount} ${channelCount === 1 ? 'channel' : 'channels'}`} onClick={onListings} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{productStructure}</span>
          {translations.length ? <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="inline-flex min-h-8 items-center gap-1.5 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Translations: ${completeTranslations} of ${translations.length} complete`}>
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
          {imported && <Popover><PopoverTrigger asChild><button type="button" aria-label="Product source" title={`Source: ${sourceLabel}`} className="flex min-h-8 min-w-0 max-w-full items-center gap-1.5 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info aria-hidden="true" className="size-3.5 shrink-0" /><span className="max-w-52 truncate">Source: {sourceLabel}</span></button></PopoverTrigger><PopoverContent align="end" className="space-y-2 text-xs leading-5" aria-label="Product source"><p className="font-semibold">Imported product data</p><p>{source?.trim() ? `Source: ${source.trim()}` : 'Source not recorded'}</p>{onReviewImportedLinks && <Button type="button" size="sm" variant="outline" onClick={onReviewImportedLinks}>Review shop links in inbox<ArrowRight /></Button>}</PopoverContent></Popover>}
        </div>
      </div>
    </div>
  </section>;
}
