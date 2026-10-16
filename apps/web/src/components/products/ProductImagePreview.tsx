import { useState } from 'react';
import { ArrowLeft, ArrowRight, ImageOff, Package, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Props { name: string; images: readonly string[]; imageAltTexts: readonly string[]; onProductData: () => void; variant?: 'header' | 'overview'; }

function PreviewImage({ src, alt, className, compact = false }: { src: string; alt: string; className?: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span role="img" aria-label={`${alt} — image unavailable`} className="flex size-full flex-col items-center justify-center gap-2 bg-muted px-2 text-center text-xs text-muted-foreground"><ImageOff aria-hidden="true" className="size-5 shrink-0" />{!compact && 'Image unavailable'}</span>
    : <img src={src} alt={alt} className={cn('size-full object-contain', className)} onError={() => setFailed(true)} />;
}

export function ProductImagePreview({ name, images, imageAltTexts, onProductData, variant = 'header' }: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const media = images.flatMap((src, index) => src.trim() ? [{ src, alt: imageAltTexts[index]?.trim() || `${name || 'Product'} — image ${index + 1}` }] : []);
  const imageIndex = Math.min(selectedImage, Math.max(0, media.length - 1));
  const goToImage = (index: number) => setSelectedImage(Math.max(0, Math.min(media.length - 1, index)));
  if (variant === 'header') return <div data-testid="product-header-image" className="size-12 shrink-0 overflow-hidden rounded-lg border bg-background">
    {media.length
      ? <PreviewImage key={media[0].src} src={media[0].src} alt={media[0].alt} compact />
      : <span role="img" aria-label={`${name || 'Product'} — no image`} className="flex size-full items-center justify-center bg-muted/20 text-muted-foreground"><Package aria-hidden="true" className="size-6" /></span>}
  </div>;

  return media.length ? <Dialog>
        <DialogTrigger asChild><button type="button" onClick={() => setSelectedImage(0)} className="group relative w-full shrink-0 overflow-hidden rounded-lg border bg-background transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none" aria-label={`View product images (${media.length})`}>
          <span className="block aspect-square w-full"><PreviewImage key={media[0].src} src={media[0].src} alt={media[0].alt} /></span>
          <span aria-hidden="true" className="absolute right-0 top-0 rounded bg-background/90 p-1 text-foreground shadow-sm"><ZoomIn className="size-3" /></span>
          <span className="block border-t px-2 py-2 text-xs font-medium">View {media.length === 1 ? 'image' : `${media.length} images`}</span>
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
      </Dialog> : <button type="button" onClick={onProductData} aria-label="View product media — no images" className="flex aspect-square w-full shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Package aria-hidden="true" className="size-6" /><span>No images</span><span className="font-medium text-primary">View media</span></button>;
}
