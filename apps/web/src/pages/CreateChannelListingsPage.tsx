import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Globe2, MessageSquare, MonitorSmartphone, ShoppingBag, Store } from 'lucide-react';
import { ChannelListingWizard, type ChannelWizardDraft, type WizardChannel } from '@/components/products/ChannelListingWizard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getProductById, updateProduct, type ChannelListing, type Product } from '@/lib/product-store';

type ChannelKey = 'webstore' | 'pos' | 'shopee' | 'lazada' | 'tiktok' | 'amazon' | 'rakuten' | 'social';

const channels: Array<WizardChannel & { key: ChannelKey }> = [
  { key: 'webstore', label: 'PrimeWeb', description: 'Online storefront', icon: Globe2, iconClassName: 'bg-emerald-50 text-emerald-600' },
  { key: 'pos', label: 'PrimePOS', description: 'Retail outlets', icon: Store, iconClassName: 'bg-violet-50 text-violet-600' },
  { key: 'shopee', label: 'Shopee', description: 'Marketplace', icon: ShoppingBag, iconClassName: 'bg-orange-50 text-orange-600' },
  { key: 'lazada', label: 'Lazada', description: 'Marketplace', icon: ShoppingBag, iconClassName: 'bg-blue-50 text-blue-600' },
  { key: 'tiktok', label: 'TikTok Shop', description: 'Social commerce', icon: MonitorSmartphone, iconClassName: 'bg-slate-100 text-slate-700' },
  { key: 'amazon', label: 'Amazon', description: 'Global marketplace', icon: ShoppingBag, iconClassName: 'bg-amber-50 text-amber-700' },
  { key: 'rakuten', label: 'Rakuten', description: 'Marketplace', icon: ShoppingBag, iconClassName: 'bg-rose-50 text-rose-700' },
  { key: 'social', label: 'Social Inbox', description: 'Chat-assisted sales', icon: MessageSquare, iconClassName: 'bg-sky-50 text-sky-600' },
];

const listingChannel: Record<ChannelKey, ChannelListing['channel']> = { webstore: 'website', pos: 'pos', shopee: 'shopee', lazada: 'lazada', tiktok: 'tiktok', amazon: 'amazon', rakuten: 'rakuten', social: 'social' };

function initialDraft(product: Product, key: ChannelKey): ChannelWizardDraft {
  const saved = product.channel_overrides?.[key];
  const currentListing = product.channels.find(item => item.channel === listingChannel[key]);
  return {
    enabled: saved?.enabled ?? Boolean(currentListing), title: saved?.title ?? (key === 'webstore' ? product.meta_title || product.name : product.name), price_markup: saved?.price_markup ? String(saved.price_markup) : '', description: saved?.description ?? (key === 'webstore' ? product.meta_description || product.description : ''), listing_sku: saved?.listing_sku ?? currentListing?.external_id ?? '', category: saved?.category ?? '', fulfillment: saved?.fulfillment ?? '', variant_scope: saved?.variant_scope ?? 'all', listing_mode: saved?.listing_mode ?? (key === 'amazon' ? 'offer_only' : 'master'), identifier: saved?.identifier ?? (key === 'amazon' ? product.asin : product.gtin), condition: saved?.condition ?? (key === 'amazon' ? 'new_new' : ''), stock_quantity: saved?.stock_quantity ?? '', warehouse: saved?.warehouse ?? '', brand: saved?.brand ?? product.brand, shipping_option: saved?.shipping_option ?? '', bullet_points: saved?.bullet_points ?? '', search_terms: saved?.search_terms ?? '', preorder_days: saved?.preorder_days ?? '', warranty: saved?.warranty ?? '', certification: saved?.certification ?? '', video_url: saved?.video_url ?? '', web_slug: saved?.web_slug ?? (key === 'webstore' ? `/products/${product.slug}` : ''), pos_barcode: saved?.pos_barcode ?? product.gtin, visibility: saved?.visibility ?? '', sync_policy: saved?.sync_policy ?? 'automatic', safety_buffer: saved?.safety_buffer ?? '0', allocation_cap: saved?.allocation_cap ?? '', media_scope: saved?.media_scope ?? 'all', compliance_notes: saved?.compliance_notes ?? '', tax_code: saved?.tax_code ?? '', attribute_material: saved?.attribute_material ?? '', attribute_color: saved?.attribute_color ?? '',
  };
}

export default function CreateChannelListingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const product = id ? getProductById(id) : undefined;
  const [drafts, setDrafts] = useState<Record<string, ChannelWizardDraft>>(() => product ? Object.fromEntries(channels.map(channel => [channel.key, initialDraft(product, channel.key)])) : {});
  const stock = useMemo(() => product ? Object.values(product.inventory).reduce((sum, value) => sum + Number(value || 0), 0) : 0, [product]);

  if (!product) return <div className="grid min-h-[60vh] place-items-center p-6 text-center"><div><h1 className="text-xl font-semibold">Product Master not found</h1><p className="mt-2 text-sm text-muted-foreground">Return to the catalog and choose an existing product.</p><Button className="mt-4" onClick={() => navigate('/products/master-catalog')}>Back to Product Master</Button></div></div>;

  function updateDraft(channel: string, patch: Partial<ChannelWizardDraft>) {
    setDrafts(current => ({ ...current, [channel]: { ...current[channel], ...patch } }));
  }

  function syncListingsToMaster() {
    const selected = channels.filter(channel => drafts[channel.key].enabled);
    const selectedTypes = new Set(selected.map(channel => listingChannel[channel.key]));
    const retained = product.channels.filter(channel => !selectedTypes.has(channel.channel));
    const created: ChannelListing[] = selected.map(channel => {
      const existing = product.channels.find(item => item.channel === listingChannel[channel.key]);
      return { channel: listingChannel[channel.key], external_id: drafts[channel.key].listing_sku, status: 'pending', listing_url: existing?.listing_url ?? null, last_synced_at: null };
    });
    const overrides = Object.fromEntries(channels.map(channel => {
      const value = drafts[channel.key];
      return [channel.key, { ...value, price_markup: Number(value.price_markup || 0) }];
    })) as Product['channel_overrides'];
    updateProduct(product.id, { id: product.id, channels: [...retained, ...created], channel_overrides: overrides });
    toast({ title: 'Channel listings synchronized', description: `${created.length} listings were added to ${product.name}.` });
  }

  return <ChannelListingWizard embedded open onOpenChange={() => navigate(`/products/${product.id}/edit?section=distribution`)} channels={channels} drafts={drafts} masterSku={product.sku_code} productName={product.name} productCategory={product.category} availableStock={stock} imageCount={product.images.length} productType={product.product_type} onChange={updateDraft} onSubmitted={syncListingsToMaster} />;
}
