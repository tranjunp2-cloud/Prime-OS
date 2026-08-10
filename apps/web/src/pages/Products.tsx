import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Package, Search, X, CheckCircle2, Loader2, ChevronDown, ChevronRight, Sparkles, List, LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/system/PageHeader';
import { ChannelBadge } from '@/components/system/ChannelBadge';
import { ConfirmDialog } from '@/components/system/ConfirmDialog';
import { StatusBadge } from '@/components/system/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getProducts, deleteProduct, getAllSkus, type Product } from '@/lib/product-store';
import { CreateProductDialog } from '@/components/products/CreateProductDialog';
import type { AmazonVariant } from '@/lib/amazon-catalog';
import { useI18n } from '@/lib/i18n/I18nContext';
import { formatLocalizedDate, formatLocalizedMoney, formatMessage } from '@/lib/i18n/format';
import {
  PRODUCT_TYPE_COLORS,
  getProductImage,
} from '@/lib/constants';
import { SkuBadge } from '@/components/system/SkuBadge';

// ─── Delete Confirmation ────────────────────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isConfirming?: boolean;
  title: string;
  description: string;
  confirmText: string;
  confirmingText: string;
  cancelText: string;
}

function DeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isConfirming = false,
  title,
  description,
  confirmText,
  confirmingText,
  cancelText,
}: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={confirmText}
      confirmingText={confirmingText}
      cancelText={cancelText}
      variant="destructive"
      isConfirming={isConfirming}
      onConfirm={onConfirm}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Products() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { locale, t } = useI18n();

  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Simulate initial load hydration (in-memory store is sync)
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 120);
    return () => clearTimeout(t);
  }, []);

  // Refresh list from store
  const products = getProducts();
  const allSkus = getAllSkus();

  async function handleDelete(id: string) {
    const p = products.find(x => x.id === id);
    setDeletingId(id);
    await new Promise(r => setTimeout(r, 400)); // simulate async
    deleteProduct(id);
    setDeletingId(null);
    setDeleteTarget(null);
    toast({
      title: t('products.deleteSuccessTitle'),
      description: p ? formatMessage(t('products.deleteSuccessDesc'), { name: p.name }) : t('products.deleteSuccessTitle'),
    });
  }

  function handleCreateConfirm(params: {
    productFamily: string;
    sku: string;
    hasVariants: boolean;
    amazonAsin?: string;
    amazonTitle?: string;
    amazonBrand?: string;
    amazonImages?: string[];
    amazonMsrp?: number;
    selectedVariants?: AmazonVariant[];
  }) {
    const query = new URLSearchParams({
      sku: params.sku,
      family: params.productFamily,
    });
    if (params.hasVariants) query.set('variants', '1');
    if (params.amazonAsin) query.set('asin', params.amazonAsin);
    if (params.amazonTitle) query.set('title', params.amazonTitle);
    if (params.amazonBrand) query.set('brand', params.amazonBrand);
    if (params.amazonMsrp) query.set('msrp', String(params.amazonMsrp));
    if (params.selectedVariants) {
      query.set('variantsJson', JSON.stringify(params.selectedVariants));
    }
    navigate(`/ecom/cos/product-master/new?${query.toString()}`);
  }

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.sku_code.toLowerCase().includes(search.toLowerCase())
  );

  const publishedCount = products.filter(p => p.status === 'published').length;
  const draftCount = products.filter(p => p.status === 'draft').length;
  const featuredProducts = filtered.slice(0, 6);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <PageHeader
        title={t('sidebar.productMaster')}
        description={
          <span className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              {formatMessage(t('products.publishedCount'), { count: publishedCount })}
            </span>
            <span className="text-muted-foreground">{formatMessage(t('products.draftCount'), { count: draftCount })}</span>
            <span className="text-muted-foreground">· {formatMessage(t('products.totalCount'), { count: products.length })}</span>
          </span>
        }
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" /> {t('products.createNewProduct')}
          </Button>
        }
      />

      <div className="surface-toolbar rounded-lg px-3 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-fit rounded-lg border bg-background p-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              className="h-8 rounded-md px-3"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
            >
              <List className="size-3.5" />
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              className="h-8 rounded-md px-3"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="size-3.5" />
              Grid
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full min-w-[260px] flex-1 lg:w-[360px] lg:flex-none">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('products.searchByNameBrand')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="rounded-lg pl-9 pr-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>
            {search && (
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {formatMessage(t('products.resultCount'), {
                  count: filtered.length,
                  suffix: filtered.length !== 1 ? 's' : '',
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'grid' && featuredProducts.length > 0 && (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Product gallery">
          {featuredProducts.map((p) => {
            const imgUrl = getProductImage(p.id, p.asin);
            const variantCount = p.skus?.length ?? 0;
            return (
              <Card key={p.id} className="group overflow-hidden hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <Link to={`/ecom/cos/product-master/${p.id}`} className="block">
                  <div className="relative h-[200px] overflow-hidden bg-muted">
                    <img
                      src={imgUrl}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${p.id}/600/400`; }}
                    />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <Badge variant={p.status === 'published' ? 'default' : 'secondary'}>{p.status}</Badge>
                      {variantCount > 0 && <Badge variant="secondary">{variantCount} {t('products.variantLabel')}</Badge>}
                    </div>
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-primary">{p.name}</h2>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{p.brand || '—'} · {p.category || '—'}</p>
                      </div>
                      <Sparkles className="mt-1 size-4 shrink-0 text-primary" />
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                      <SkuBadge sku={p.sku_code} />
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {formatLocalizedMoney(locale, p.retail_price, p.price_currency)}
                      </span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </section>
      )}

      {/* Table */}
      {viewMode === 'list' && (isLoading ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>{t('products.colProduct')}</TableHead>
                  <TableHead>{t('products.colType')}</TableHead>
                  <TableHead className="w-[176px]">{t('products.colSku')}</TableHead>
                  <TableHead>{t('products.colCategory')}</TableHead>
                  <TableHead>{t('products.colChannels')}</TableHead>
                  <TableHead className="text-right">{t('products.colOriginalPrice')}</TableHead>
                  <TableHead className="text-right">{t('products.colRetailPrice')}</TableHead>
                  <TableHead>{t('products.colStatus')}</TableHead>
                  <TableHead>{t('products.colUpdated')}</TableHead>
                  <TableHead className="w-24">{t('products.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="w-8"><Skeleton className="h-6 w-6 rounded" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-3 w-16" /></TableCell>
                    <TableCell><div className="flex gap-1"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-8 w-8 rounded-lg" /></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>{t('products.colProduct')}</TableHead>
                  <TableHead>{t('products.colType')}</TableHead>
                  <TableHead className="w-[176px]">{t('products.colSku')}</TableHead>
                  <TableHead>{t('products.colCategory')}</TableHead>
                  <TableHead>{t('products.colChannels')}</TableHead>
                  <TableHead className="text-right">{t('products.colOriginalPrice')}</TableHead>
                  <TableHead className="text-right">{t('products.colRetailPrice')}</TableHead>
                  <TableHead>{t('products.colStatus')}</TableHead>
                  <TableHead>{t('products.colUpdated')}</TableHead>
                  <TableHead className="w-24">{t('products.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11}>
                      <div className="py-12 text-center text-muted-foreground">
                        <Package className="size-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">{search ? t('products.noProductsFound') : t('products.noProductsYet')}</p>
                        <p className="text-sm mt-1">
                          {search ? t('products.noProductsFoundDesc') : t('products.noProductsYetDesc')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const imgUrl = getProductImage(p.id, p.asin);
                    const isExpanded = expandedIds.has(p.id);
                    const variantCount = p.skus?.length ?? 0;
                    const isVariantParent = p.has_variants && variantCount > 0;

                    return (
                      <React.Fragment key={p.id}>
                        <TableRow className="group">
                          {/* Expand toggle (variant parents) */}
                          <TableCell className="w-8">
                            {isVariantParent ? (
                              <button
                                onClick={() => {
                                  setExpandedIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(p.id)) next.delete(p.id);
                                    else next.add(p.id);
                                    return next;
                                  });
                                }}
                                className="size-6 rounded flex items-center justify-center hover:bg-muted transition-colors"
                                aria-label={isExpanded ? t('products.collapseVariants') : t('products.expandVariants')}
                              >
                                {isExpanded
                                  ? <ChevronDown className="size-3.5 text-muted-foreground" />
                                  : <ChevronRight className="size-3.5 text-muted-foreground" />}
                              </button>
                            ) : (
                              <span className="size-6 block" />
                            )}
                          </TableCell>
                          {/* Product */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={imgUrl}
                                alt={p.name}
                                className="w-12 h-12 rounded-lg object-cover shrink-0 bg-muted ring-1 ring-border"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${p.id}/64/64`; }}
                              />
                              <div className="min-w-0">
                                    <Link
                                      to={`/ecom/cos/product-master/${p.id}`}
                                      className="block max-w-[200px] truncate text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary hover:underline"
                                    >
                                      {p.name}
                                    </Link>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs text-muted-foreground truncate max-w-[160px]">{p.brand || '—'}</span>
                                  {isVariantParent && (
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                                      isExpanded
                                        ? 'bg-emerald-500/14 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-300'
                                        : 'bg-sky-500/14 text-sky-700 dark:bg-sky-500/18 dark:text-sky-300'
                                    }`}>
                                      {variantCount} {t('products.variantLabel')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          {/* Type */}
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${PRODUCT_TYPE_COLORS[p.product_type] ?? 'bg-muted text-muted-foreground'}`}>
                              {p.product_type}
                            </span>
                          </TableCell>
                          {/* SKU */}
                          <TableCell className="min-w-[176px]">
                            <SkuBadge sku={p.sku_code} />
                          </TableCell>
                          {/* Category */}
                          <TableCell className="text-muted-foreground text-sm">{p.category || '—'}</TableCell>
                          {/* Channels */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {p.channels.length > 0
                                ? p.channels.map(ch => <ChannelBadge key={ch.channel} channel={ch.channel} />)
                                : <span className="text-xs text-muted-foreground">—</span>
                              }
                            </div>
                          </TableCell>
                          {/* Original Price */}
                          <TableCell className="text-right text-sm font-mono">
                            {p.original_price ? formatLocalizedMoney(locale, p.original_price, p.price_currency) : '—'}
                          </TableCell>
                          {/* Retail Price */}
                          <TableCell className="text-right text-sm font-mono">
                            {p.retail_price ? formatLocalizedMoney(locale, p.retail_price, p.price_currency) : '—'}
                          </TableCell>
                          {/* Status */}
                          <TableCell>
                            <StatusBadge status={p.status} domain="product" />
                          </TableCell>
                          {/* Updated */}
                          <TableCell className="text-muted-foreground text-xs">
                            {formatLocalizedDate(locale, p.updated_at)}
                          </TableCell>
                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={t('products.editProduct')}
                                onClick={() => navigate(`/ecom/cos/product-master/${p.id}/edit`)}
                              >
                                <Pencil className="size-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive opacity-60 group-hover:opacity-100"
                                aria-label={t('products.deleteProduct')}
                                disabled={deletingId === p.id}
                                onClick={() => setDeleteTarget(p)}
                              >
                                {deletingId === p.id
                                  ? <Loader2 className="size-3.5 animate-spin" />
                                  : <Trash2 className="size-3.5" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Variant child rows */}
                        {isExpanded && isVariantParent && p.skus.map(sku => {
                          const variantImgUrl = p.images?.[0] ? `${p.images[0]}` : imgUrl;
                          return (
                            <TableRow key={`${p.id}-${sku.id}`} className="bg-muted/20 hover:bg-muted/30 transition-colors">
                              <TableCell className="w-8" />
                              <TableCell colSpan={2}>
                                <div className="flex items-center gap-2 pl-4">
                                  <img
                                    src={variantImgUrl}
                                    alt={sku.variation_name}
                                    className="w-10 h-10 rounded object-cover shrink-0 bg-muted opacity-80"
                                    loading="lazy"
                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${sku.id}/64/64`; }}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                      {sku.variation_name}
                                    </p>
                                    <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-500/14 dark:text-sky-300">
                                      {t('products.variantLabel')}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="min-w-[176px]">
                                <SkuBadge sku={sku.sku_code} tone="variant" />
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{p.category || '—'}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {p.channels.length > 0
                                    ? p.channels.map(ch => <ChannelBadge key={ch.channel} channel={ch.channel} />)
                                    : <span className="text-xs text-muted-foreground">—</span>
                                  }
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm font-mono text-muted-foreground">—</TableCell>
                              <TableCell className="text-right text-sm font-mono text-muted-foreground">—</TableCell>
                              <TableCell>
                                <StatusBadge status={p.status} domain="product" />
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {formatLocalizedDate(locale, p.updated_at)}
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Create Dialog */}
      <CreateProductDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        existingSkus={allSkus}
        onConfirm={handleCreateConfirm}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={v => { if (!v) setDeleteTarget(null); }}
        isConfirming={deletingId === deleteTarget?.id}
        title={t('products.deleteTitle')}
        description={deleteTarget ? formatMessage(t('products.deleteDesc'), { title: deleteTarget.name }) : t('products.deleteTitle')}
        confirmText={t('products.deleteProductConfirm')}
        confirmingText={t('products.deleting')}
        cancelText={t('products.keepProduct')}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}
