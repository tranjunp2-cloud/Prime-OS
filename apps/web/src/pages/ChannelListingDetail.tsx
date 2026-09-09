import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, RefreshCw, Save, Unplug } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getProductById } from '@/lib/product-store';
import { getProductImage } from '@/lib/constants';

const channelNames: Record<string, string> = { primeweb: 'PrimeWeb', pos: 'PrimePOS', shopee: 'Shopee', lazada: 'Lazada', rakuten: 'Rakuten' };

export default function ChannelListingDetail() {
  const { productId = '', channelKey = '' } = useParams<{ productId: string; channelKey: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const product = getProductById(productId);
  const channel = channelNames[channelKey];
  const [title, setTitle] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(String(product?.retail_price ?? 0));
  const [status, setStatus] = useState<'synced' | 'syncing' | 'unpublished'>('synced');

  if (!product || !channel) return <div className="p-6"><Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Listing unavailable</AlertTitle><AlertDescription>The product or sales channel could not be found.</AlertDescription></Alert><Button className="mt-4" variant="outline" onClick={() => navigate('/products/channel-listings')}><ArrowLeft className="size-4" />Back to Channel Listings</Button></div>;

  const liveUrl = channelKey === 'primeweb' ? `https://store.primeweb.example/products/${product.slug || product.id}` : `https://${channelKey}.example/listing/${product.sku_code}`;
  const sync = () => { setStatus('syncing'); window.setTimeout(() => setStatus('synced'), 700); toast({ title: `${channel} sync queued`, description: 'Only this channel listing will be updated.' }); };

  return <div className="space-y-5 p-4 md:p-6"><header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start"><Button variant="ghost" size="icon" onClick={() => navigate('/products/channel-listings')} aria-label="Back to Channel Listings"><ArrowLeft className="size-4" /></Button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{channel} Listing</h1><Badge variant="outline" className={status === 'synced' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'syncing' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}>{status === 'synced' ? 'Synced' : status === 'syncing' ? 'Syncing' : 'Unpublished'}</Badge></div><p className="mt-1 text-sm text-muted-foreground">Channel-owned content and offer · Product Master remains unchanged</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><a href={liveUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />View live listing</a></Button><Button variant="outline" onClick={sync} disabled={status === 'syncing'}><RefreshCw className={status === 'syncing' ? 'size-4 animate-spin' : 'size-4'} />Sync now</Button><Button onClick={() => toast({ title: `${channel} draft saved`, description: 'Channel-only overrides were saved.' })}><Save className="size-4" />Save changes</Button></div></header>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"><main className="space-y-5"><Card><CardHeader><CardTitle className="text-base">Channel content</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="channel-title">Listing title</Label><Input id="channel-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="channel-description">Description</Label><Textarea id="channel-description" rows={8} value={description} onChange={(event) => setDescription(event.target.value)} /></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Offer</CardTitle></CardHeader><CardContent><div className="max-w-xs space-y-2"><Label htmlFor="channel-price">Channel price ({product.price_currency})</Label><Input id="channel-price" type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} /></div></CardContent></Card></main>
      <aside className="space-y-4"><Card><CardContent className="pt-6"><div className="flex items-center gap-3"><img src={getProductImage(product.id, product.asin)} alt="" className="size-14 rounded-lg border object-cover" /><div><p className="font-semibold">{product.name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{product.sku_code}</p></div></div><div className="mt-4 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">Values start from Product Master and become {channel}-only overrides after saving.</div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Listing health</CardTitle></CardHeader><CardContent className="space-y-3"><p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" />Required content complete</p><p className="text-xs text-muted-foreground">External ID: {channelKey.toUpperCase()}-{product.sku_code}</p><p className="text-xs text-muted-foreground">Last synced: 4 minutes ago · simulated</p></CardContent></Card><Button variant="outline" className="w-full border-rose-200 text-rose-700" onClick={() => setStatus('unpublished')}><Unplug className="size-4" />Unpublish from {channel}</Button></aside></div>
  </div>;
}
