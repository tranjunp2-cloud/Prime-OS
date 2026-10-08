import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { ShopDefaultWarehouseForm } from '@/components/channels/ShopDefaultWarehouseForm';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useConnectedShops } from '@/hooks/use-connected-shops';
import { shopWarehouse } from '@/lib/shop-warehouse-settings';
import type { StockLocation } from './WarehouseStockTable';

export function LinkWarehouseShopsDrawer({ warehouse, onClose, onSaved }: { warehouse: StockLocation; onClose: () => void; onSaved?: () => void }) {
  const { shops, status, error, reload } = useConnectedShops();
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const shop = shops.find(item => item.id === selected);
  const refresh = () => { void reload().catch(() => {}); };
  return <Sheet open onOpenChange={open => !open && !saving && onClose()}><SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
    <SheetHeader className="border-b p-5 pr-12"><SheetTitle>Set shop default warehouse</SheetTitle><SheetDescription>Choose a shop to use {warehouse.name} as its default stock source.</SheetDescription></SheetHeader>
    <div className="min-h-0 flex-1 space-y-5 overflow-auto p-5">
      {status === 'idle' || status === 'loading' ? <p role="status" className="text-sm">Loading shops…</p> : status === 'error' ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={refresh}>Reload shops</Button></div> : shops.length ? <>
        <label className="grid gap-2 text-sm font-medium">Shop<select className="h-11 w-full rounded-md border bg-background px-3 font-normal" value={selected} disabled={saving} onChange={e => setSelected(e.target.value)}><option value="">Choose shop</option>{shops.map(item => <option key={item.id} value={item.id}>{item.store_name} · {item.name}</option>)}</select></label>
        {shop && <><div className="flex items-center gap-3"><ChannelLogo channel={{ key: shop.platform }} /><div className="min-w-0 text-sm"><p className="font-medium">{shop.store_name}</p><p className="text-xs text-muted-foreground">Current default: {shopWarehouse(shop.warehouse)?.name ?? 'Not set'}</p></div></div>
          <ShopDefaultWarehouseForm key={shop.id} shop={shop} shops={shops} target={{ id: warehouse.id, name: warehouse.name, code: warehouse.code ?? warehouse.id, city: warehouse.address ?? '' }} onSaved={onSaved} onBusyChange={setSaving} onReload={refresh} />
        </>}
      </> : <p className="text-sm text-muted-foreground">No connected shops yet. Connect a shop in Sales Channels first.</p>}
    </div>
    <footer className="flex justify-end border-t bg-background p-4"><Button className="min-h-11" variant="outline" disabled={saving} onClick={onClose}>Done</Button></footer>
  </SheetContent></Sheet>;
}
