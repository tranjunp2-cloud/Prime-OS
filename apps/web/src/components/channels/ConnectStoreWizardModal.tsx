import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Step1ChannelCatalog } from './Step1ChannelCatalog';
import { Step2StoreAuth } from './Step2StoreAuth';
import { Step3WarehouseConfig } from './Step3WarehouseConfig';
import { Step4CatalogSync } from './Step4CatalogSync';
import { channelIntegrationsApi, type AvailablePlatform, type CatalogStrategy, type ChannelCategory, type ConnectedChannelRecord, type ChannelWarehouse } from '@/lib/channel-integrations-api';

type WizardStep = 'CHANNEL_SELECTION' | 'AUTHORIZATION' | 'WAREHOUSE_MAPPING' | 'CATALOG_STRATEGY';
const order: WizardStep[] = ['CHANNEL_SELECTION', 'AUTHORIZATION', 'WAREHOUSE_MAPPING', 'CATALOG_STRATEGY'];
const labels = ['Choose channel', 'Authorize store', 'Map warehouse', 'Catalog sync'];

export function ConnectStoreWizardModal({ open, onOpenChange, onConnected }: { open: boolean; onOpenChange: (open: boolean) => void; onConnected: (channel: ConnectedChannelRecord) => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>('CHANNEL_SELECTION');
  const [platforms, setPlatforms] = useState<AvailablePlatform[]>([]);
  const [warehouses, setWarehouses] = useState<ChannelWarehouse[]>([]);
  const [selected, setSelected] = useState<AvailablePlatform | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | ChannelCategory>('All');
  const [storeName, setStoreName] = useState('');
  const [region, setRegion] = useState('VN');
  const [authCode, setAuthCode] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [services, setServices] = useState({ price: true, stock: true, orders: true });
  const [pickup, setPickup] = useState(true);
  const [returns, setReturns] = useState(true);
  const [strategy, setStrategy] = useState<CatalogStrategy>('AUTO_MATCH_SKU');
  const [authorizing, setAuthorizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const index = order.indexOf(step);

  useEffect(() => {
    if (!open) return;
    Promise.all([channelIntegrationsApi.platforms(), channelIntegrationsApi.warehouses()])
      .then(([platformResponse, warehouseResponse]) => { setPlatforms(platformResponse.data); setWarehouses(warehouseResponse.data); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load channel setup data.'));
  }, [open]);

  useEffect(() => {
    if (!open || step !== 'AUTHORIZATION' || !selected) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'PRIME_CHANNEL_AUTH_SUCCESS' || event.data?.platform !== selected.id) return;
      setAuthCode(String(event.data.auth_code)); setAuthorizing(false); setError(''); setStep('WAREHOUSE_MAPPING');
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [open, step, selected]);

  const reset = () => { setStep('CHANNEL_SELECTION'); setSelected(null); setQuery(''); setCategory('All'); setStoreName(''); setRegion('VN'); setAuthCode(''); setWarehouseId(''); setServices({ price: true, stock: true, orders: true }); setPickup(true); setReturns(true); setStrategy('AUTO_MATCH_SKU'); setAuthorizing(false); setSubmitting(false); setError(''); };
  const handleOpenChange = (next: boolean) => { onOpenChange(next); if (!next) window.setTimeout(reset, 200); };
  const title = useMemo(() => selected ? `Connect ${selected.name}` : 'Connect a store', [selected]);

  const authorize = () => {
    if (!selected || !storeName.trim()) return;
    setError(''); setAuthorizing(true);
    const popup = window.open(channelIntegrationsApi.authorizationUrl(selected.id, region), 'prime-channel-oauth', 'popup=yes,width=620,height=720');
    if (!popup) { setAuthorizing(false); setError('Your browser blocked the authorization window. Allow pop-ups and try again.'); return; }
    popup.focus();
  };

  const complete = async () => {
    if (!selected || !authCode || !warehouseId) return;
    setSubmitting(true); setError('');
    try {
      const response = await channelIntegrationsApi.connect({ platform: selected.id, store_name: storeName.trim(), region, auth_code: authCode, physical_warehouse_id: warehouseId, sync_services: services, is_default_pickup: pickup, is_default_return: returns, catalog_strategy: strategy });
      await queryClient.invalidateQueries({ queryKey: ['channels'] });
      onConnected(response.data); handleOpenChange(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Store connection failed.'); }
    finally { setSubmitting(false); }
  };

  return <Dialog open={open} onOpenChange={handleOpenChange}><DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-[760px]"><DialogHeader className="border-b px-6 py-5 pr-14"><DialogTitle>{title}</DialogTitle><DialogDescription>Connect, map, and start channel synchronization without leaving Prime OS.</DialogDescription></DialogHeader><div className="border-b px-6 py-4"><div className="mb-3 flex items-center justify-between gap-2">{labels.map((label, itemIndex) => <div key={label} className="flex min-w-0 items-center gap-2"><span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${itemIndex <= index ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{itemIndex < index ? <Check className="size-3.5" /> : itemIndex + 1}</span><span className={`hidden truncate text-xs font-medium md:block ${itemIndex <= index ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span></div>)}</div><Progress value={(index + 1) * 25} className="h-1.5" /></div><div className="max-h-[58vh] overflow-y-auto px-6 py-5">{step === 'CHANNEL_SELECTION' ? <Step1ChannelCatalog platforms={platforms} query={query} category={category} onQueryChange={setQuery} onCategoryChange={setCategory} onSelect={(value) => { setSelected(value); setRegion(value.regions[0] || 'VN'); setStoreName(`Prime ${value.name} Store`); setError(''); setStep('AUTHORIZATION'); }} /> : null}{step === 'AUTHORIZATION' && selected ? <Step2StoreAuth platform={selected} storeName={storeName} region={region} authorizing={authorizing} error={error} onStoreNameChange={setStoreName} onRegionChange={setRegion} onAuthorize={authorize} /> : null}{step === 'WAREHOUSE_MAPPING' ? <Step3WarehouseConfig warehouses={warehouses} warehouseId={warehouseId} services={services} pickup={pickup} returns={returns} onWarehouseChange={setWarehouseId} onServiceChange={(key, value) => setServices((current) => ({ ...current, [key]: value }))} onPickupChange={setPickup} onReturnChange={setReturns} /> : null}{step === 'CATALOG_STRATEGY' ? <Step4CatalogSync value={strategy} onChange={setStrategy} /> : null}{error && step !== 'AUTHORIZATION' ? <p role="alert" className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}</div>{step !== 'CHANNEL_SELECTION' && step !== 'AUTHORIZATION' ? <DialogFooter className="border-t px-6 py-4"><Button type="button" variant="outline" onClick={() => setStep(order[Math.max(0, index - 1)])}><ArrowLeft className="size-4" />Back</Button><div className="flex-1" />{step === 'WAREHOUSE_MAPPING' ? <Button type="button" disabled={!warehouseId} onClick={() => setStep('CATALOG_STRATEGY')}>Continue</Button> : <Button type="button" disabled={submitting} onClick={complete}>{submitting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}{submitting ? 'Connecting store...' : 'Complete & Start Sync'}</Button>}</DialogFooter> : null}</DialogContent></Dialog>;
}
