import { Package, Star, Truck, ShieldCheck } from 'lucide-react';
import { type PlatformType, platformNames } from '@/lib/marketplace-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChannelBadge } from '@/components/system/ChannelBadge';
import { cn } from '@/lib/utils';

interface ListingPreviewProps {
  platform: PlatformType;
  title: string;
  description: string;
  price: number;
  images?: string[];
  attributes?: Record<string, string>;
}

export function ListingPreview({
  platform,
  title,
  description,
  price,
  images,
  attributes,
}: ListingPreviewProps) {
  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(p);
  };

  // Platform-specific styling
  const platformStyles: Record<PlatformType, { accent: string; bg: string }> = {
    amazon: { accent: 'border-amazon', bg: 'bg-amazon/5' },
    shopee: { accent: 'border-shopee', bg: 'bg-shopee/5' },
    rakuten: { accent: 'border-rakuten', bg: 'bg-rakuten/5' },
  };

  const styles = platformStyles[platform];

  return (
    <Card className={cn('border-2', styles.accent)}>
      <CardHeader className={cn('pb-3', styles.bg)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Preview</CardTitle>
          <ChannelBadge platform={platform} />
        </div>
        <p className="text-xs text-muted-foreground">
          How your listing will appear on {platformNames[platform]}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Product Image */}
        <div className="aspect-square max-w-[200px] mx-auto rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {images && images.length > 0 ? (
            <img
              src={images[0]}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <Package className="size-12 text-muted-foreground" />
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="font-semibold text-lg leading-tight line-clamp-3">
            {title || 'Product Title'}
          </h3>
        </div>

        {/* Rating (mock) */}
        <div className="flex items-center gap-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={cn(
                  'size-4',
                  i <= 4 ? 'fill-warning text-warning' : 'text-muted'
                )}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">(123 reviews)</span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(price || 0)}
          </span>
          {price > 0 && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(price * 1.2)}
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            <Truck className="size-3 mr-1" />
            Free Shipping
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <ShieldCheck className="size-3 mr-1" />
            Buyer Protection
          </Badge>
        </div>

        <Separator />

        {/* Description Preview */}
        <div>
          <p className="text-xs font-medium mb-2">Description</p>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">
            {description || 'No description provided'}
          </div>
        </div>

        {/* Attributes */}
        {attributes && Object.keys(attributes).length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium mb-2">Specifications</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(attributes)
                  .filter(([_, v]) => v)
                  .slice(0, 6)
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
