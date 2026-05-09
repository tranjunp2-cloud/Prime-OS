import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { ChannelBadge } from '@/components/system/ChannelBadge';
import { PageHeader } from '@/components/system/PageHeader';
import { StatusBadge } from '@/components/system/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getProductById, type Product } from '@/lib/product-store';
import { getListings } from '@/lib/listing-store';
import { useDetailNavigation } from '@/hooks/use-detail-navigation';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDate, formatLocalizedMoney, formatMessage } from '@/lib/i18n/format';

function mapRemoteProductToLocalShape(remote: {
  id: string;
  sku: string;
  title: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  base_price: number;
  images: string[] | null;
  created_at: string;
  updated_at: string;
  skus: Array<{
    id: string;
    sku_code: string;
    variation_name: string | null;
  }> | null;
}): Product {
  const skus = (remote.skus ?? []).map((sku) => ({
    id: sku.id,
    sku_code: sku.sku_code,
    variation_name: sku.variation_name ?? 'Default',
    weight_g: 0,
    units_per_carton: 0,
    status: 'active' as const,
  }));

  return {
    id: remote.id,
    name: remote.title,
    sku_code: remote.sku,
    product_type: skus.length > 1 ? 'variant' : 'single',
    gtin: '',
    mpn: '',
    model_number: '',
    brand: remote.brand ?? 'Demo Brand',
    asin: '',
    manufacturer: remote.brand ?? 'Demo Brand',
    category: remote.category ?? 'Uncategorized',
    condition: 'new',
    description: remote.description ?? '',
    original_price: remote.base_price,
    retail_price: remote.base_price,
    price_currency: 'JPY',
    prod_length: 0,
    prod_height: 0,
    prod_width: 0,
    prod_weight: 0,
    pkg_length: 0,
    pkg_height: 0,
    pkg_width: 0,
    pkg_weight: 0,
    country_of_origin: '',
    hs_code: '',
    images: remote.images ?? [],
    inventory: {},
    has_variants: skus.length > 1,
    channels: [],
    status: 'published',
    created_at: remote.created_at,
    updated_at: remote.updated_at,
    skus,
  };
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const [imgError, setImgError] = useState<Record<number, boolean>>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { backLabel, goBack } = useDetailNavigation('/products', t('products.pageTitle'));

  const localProduct = id ? getProductById(id) : undefined;
  const { data: remoteProduct, isLoading: isRemoteLoading } = useQuery({
    queryKey: ['remote-product-detail', id, user?.id],
    enabled: Boolean(id && !localProduct && user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          sku,
          title,
          brand,
          category,
          description,
          base_price,
          images,
          created_at,
          updated_at,
          skus:skus(id, sku_code, variation_name)
        `)
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      return mapRemoteProductToLocalShape(data);
    },
  });
  const product = localProduct ?? remoteProduct;
  const listings = getListings();

  if (!product && isRemoteLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 lg:p-8">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="h-8 w-56 rounded bg-muted animate-pulse" />
              <div className="h-4 w-72 rounded bg-muted animate-pulse" />
              <div className="h-48 w-full rounded bg-muted animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col gap-6 p-6 lg:p-8">
        <PageHeader
          title={t('products.notFound')}
          description={t('products.notFoundDesc')}
          actions={<Button variant="outline" onClick={goBack}><ArrowLeft className="size-4 mr-2" />{t('products.backToProducts')}</Button>}
        />
      </div>
    );
  }

  const skuIds = product.skus?.map(s => s.id) ?? [];
  const productListings = listings.filter(l => skuIds.includes(l.sku_id));

  const productImages = product.images?.length
    ? product.images
    : [`https://picsum.photos/seed/${product.id}/600/600`];

  // For local paths, use the images as-is (one per photo file).
  // For picsum remote URLs, append alt params for additional views.
  const allImages = productImages[0]?.startsWith('/images/')
    ? productImages
    : [
        ...productImages,
        ...productImages.map((url, i) => url.replace('600/600', `600/600?alt=${i + 1}`)),
      ].filter((url, i, arr) => arr.indexOf(url) === i);
  const activeImage = allImages[selectedImageIndex] ?? allImages[0];

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <PageHeader
        title={product.name}
        description={`${product.category} — ${product.brand ?? '—'}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={goBack} aria-label={backLabel}>
              <ArrowLeft className="size-4 mr-2" />{t('products.backToProducts')}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/ecom/cos/product-master/${product.id}/edit`)}
            >
              <Pencil className="size-4 mr-2" />{t('products.edit')}
            </Button>
          </div>
        }
      />

      {/* Product Gallery + Meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image Gallery */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="size-4" />
              {t('products.images')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Main image */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted border">
              {activeImage && !imgError[selectedImageIndex] ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setImgError((prev) => ({ ...prev, [selectedImageIndex]: true }))}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ImageIcon className="size-12 opacity-30" />
                  <span className="text-sm">{t('products.noImageAvailable')}</span>
                </div>
              )}
            </div>
            {/* Thumbnail row */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImageIndex(i)}
                    aria-label={formatMessage(t('products.showImageAria'), {
                      index: i + 1,
                      total: allImages.length,
                    })}
                    aria-pressed={selectedImageIndex === i}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      selectedImageIndex === i ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary'
                    }`}
                  >
                    {!imgError[i] ? (
                      <img
                        src={url}
                        alt={formatMessage(t('products.imageViewAlt'), {
                          name: product.name,
                          index: i + 1,
                        })}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(prev => ({ ...prev, [i]: true }))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="size-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Info Cards */}
        <div className="space-y-4">
          {/* Status + Type */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{t('products.statusLabel')}</p>
                <StatusBadge status={product.status} domain="product" className="text-sm" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{t('products.typeLabel')}</p>
                <span className="text-sm font-semibold capitalize">{product.product_type}</span>
              </CardContent>
            </Card>
          </div>

          {/* Pricing */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">{t('products.colOriginalPrice')}</span>
                <span className="text-sm font-mono font-semibold">
                  {formatLocalizedMoney(locale, product.original_price, product.price_currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">{t('products.colRetailPrice')}</span>
                <span className="text-sm font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                  {formatLocalizedMoney(locale, product.retail_price, product.price_currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Channels */}
          {product.channels && product.channels.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">{t('products.salesChannels')}</p>
                <div className="flex flex-wrap gap-2">
                  {product.channels.map(ch => (
                    <div key={ch.channel} className="flex items-center gap-1.5">
                      <ChannelBadge channel={ch.channel} />
                      {ch.listing_url && (
                        <a
                          href={ch.listing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={formatMessage(t('products.openChannelListingAria'), {
                            channel: ch.channel,
                            name: product.name,
                          })}
                          title={formatMessage(t('products.openChannelListingTitle'), {
                            channel: ch.channel,
                          })}
                        >
                          <ExternalLink className="size-3 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Identifiers */}
          <Card>
            <CardContent className="p-4 space-y-2">
              {product.gtin && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">GTIN</span>
                  <span className="text-xs font-mono">{product.gtin}</span>
                </div>
              )}
              {product.asin && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">ASIN</span>
                  <span className="text-xs font-mono">{product.asin}</span>
                </div>
              )}
              {product.mpn && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">MPN</span>
                  <span className="text-xs font-mono">{product.mpn}</span>
                </div>
              )}
              {product.hs_code && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">HS Code</span>
                  <span className="text-xs font-mono">{product.hs_code}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('products.description')}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </CardContent>
        </Card>
      )}

      {/* SKUs */}
      {product.skus && product.skus.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('products.variantsList').replace('{count}', String(product.skus.length))}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.sku')}</TableHead>
                  <TableHead>{t('products.variant')}</TableHead>
                  <TableHead>{t('products.weight')}</TableHead>
                  <TableHead>{t('products.colStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.skus.map((sku) => (
                  <TableRow key={sku.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {sku.sku_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {sku.variation_name}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {sku.weight_g ? `${sku.weight_g}g` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={sku.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {sku.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Channel Listings */}
      {productListings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">{t('products.platformListings').replace('{count}', String(productListings.length))}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.colChannels')}</TableHead>
                  <TableHead>{t('products.channelSku')}</TableHead>
                  <TableHead className="text-right">{t('products.price')}</TableHead>
                  <TableHead>{t('products.colStatus')}</TableHead>
                  <TableHead>{t('products.lastSynced')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productListings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <ChannelBadge channel={listing.channel} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {listing.channel_sku ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {listing.price ? formatLocalizedMoney(locale, listing.price, product.price_currency) : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={listing.status} domain="listing" />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {listing.last_synced_at
                        ? formatLocalizedDate(locale, listing.last_synced_at)
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
