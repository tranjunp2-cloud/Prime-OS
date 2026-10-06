import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChannelListingWizard, type ChannelWizardDraft } from '@/components/products/ChannelListingWizard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getProductById } from '@/lib/product-store';
import { availableListingDestinations, createChannelListingDrafts, freshChannelListingDrafts } from '@/lib/channel-listing-creation';
import { getStoredMasterReadiness } from '@/lib/product-master-readiness';

export default function CreateChannelListingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [product] = useState(() => id ? getProductById(id) : undefined);
  const [channels] = useState(() => availableListingDestinations(product));
  const [drafts, setDrafts] = useState<Record<string, ChannelWizardDraft>>(() => product ? freshChannelListingDrafts(product) : {});
  const back = () => navigate(product ? `/products/${product.id}/edit?section=distribution` : '/products/master-catalog');
  if (!product || product.status === 'archived' || !getStoredMasterReadiness(product).ready) return <div className="grid min-h-[60vh] place-items-center p-6 text-center"><div><h1 className="text-xl font-semibold">{!product ? 'Product Master not found' : product.status === 'archived' ? 'This Master is archived' : 'Complete Product Master data first'}</h1><p className="mt-2 text-sm text-muted-foreground">Return to Product Master before creating new listing drafts.</p><Button className="mt-4" onClick={back}>Back to Product Master</Button></div></div>;
  return <ChannelListingWizard embedded open onOpenChange={back} channels={channels} drafts={drafts}
    masterSku={product.sku_code} productName={product.name} productCategory={product.category}
    availableStock={Object.values(product.inventory).reduce((sum, value) => sum + Number(value || 0), 0)}
    imageCount={product.images.length} productType={product.product_type}
    basePrice={product.retail_price} baseCurrency={product.price_currency} localizedContent={product.localized_content}
    onChange={(channel, patch) => setDrafts(current => ({ ...current, [channel]: { ...current[channel], ...patch } }))}
    onSubmitted={selected => {
      createChannelListingDrafts(product.id, selected, product.record_version ?? 1);
      toast({ title: 'Listing drafts created', description: 'Existing listings and Master data are unchanged. No shop update sent.' });
    }} />;
}
