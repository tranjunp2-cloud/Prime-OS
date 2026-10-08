import { useRef } from 'react';
import { ChevronRight, Info } from 'lucide-react';
import { ChannelLogo } from '@/components/channels/ChannelLogo';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { channelNames } from '@/lib/warehouse-stock-view';
import type { ShopLinksState, WarehouseShopSummary } from '@/lib/warehouse-shop-sources';

export function WarehouseShopsCell({ summary, status, productName, warehouseName, onOpen }: {
  summary: WarehouseShopSummary; status: ShopLinksState; productName: string; warehouseName: string; onOpen: () => void;
}) {
  if (status !== 'ready') return <span className="text-xs text-muted-foreground">{status === 'loading' ? 'Loading shops…' : 'Shops unavailable'}</span>;
  const count = summary.shops.length;
  const unknown = summary.unconfirmed.length > 0;
  if (!count && !unknown) return <span className="text-xs text-muted-foreground" title="No active listing currently uses this warehouse as its confirmed stock source. Existing or manual orders may still hold stock; select For orders to see their source.">No shops currently using</span>;
  const label = count ? `${count} ${count === 1 ? 'shop' : 'shops'}` : 'Shop source unconfirmed';
  const platforms = [...new Set(summary.shops.map(item => item.shop.platform))];
  return <button type="button" aria-haspopup="dialog" aria-label={`Shops using ${warehouseName} for ${productName}`}
    title={`${label}${unknown ? ' · Some listing sources are unconfirmed' : ''}. View shops and stock sync settings.`}
    className="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded px-1 text-left text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    onClick={event => { event.stopPropagation(); onOpen(); }}>
    {platforms.slice(0, 2).map(key => <ChannelLogo key={key} channel={{ key }} size="sm" />)}
    <span>{label}</span>{unknown && <Info aria-hidden="true" className="size-3 text-muted-foreground" />}<ChevronRight aria-hidden="true" className="ml-auto size-3 text-muted-foreground" />
  </button>;
}

export function WarehouseShopsDrawer({ summary, productName, warehouseName, onClose }: {
  summary: WarehouseShopSummary; productName: string; warehouseName: string; onClose: () => void;
}) {
  const trigger = useRef(document.activeElement);
  return <Sheet open onOpenChange={open => !open && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-lg" onCloseAutoFocus={event => {
    if (trigger.current instanceof HTMLElement && trigger.current.isConnected) { event.preventDefault(); trigger.current.focus({ preventScroll: true }); }
  }}>
    <SheetHeader><SheetTitle>Shops using this warehouse</SheetTitle><SheetDescription>{productName} · {warehouseName}</SheetDescription></SheetHeader>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">{summary.shops.length ? 'These shops have an active listing of this product with this warehouse configured as its stock source. A source link does not confirm that stock has been sent to the shop.' : 'No shop has a confirmed stock source here for this product. See the missing information below.'}</p>
    <div className="mt-5 space-y-3">{summary.shops.map(({ shop, listings }) => <section key={shop.id} className="rounded-lg border p-4">
      <div className="flex items-start gap-3"><ChannelLogo channel={{ key: shop.platform, label: shop.name }} size="lg" /><div className="min-w-0"><h3 className="break-words text-sm font-semibold">{shop.store_name}</h3><p className="mt-1 text-xs text-muted-foreground">{shop.name} · {shop.status === 'CONNECTED' ? 'Connected' : shop.status === 'EXPIRED' ? 'Connection expired' : shop.status === 'INITIAL_SYNCING' ? 'Initial sync in progress' : 'Sync needs attention'}</p></div></div>
      <p className="mt-3 text-sm">Shop stock sync: <strong>{shop.sync_services.stock ? 'Enabled' : 'Disabled'}</strong></p>
      <ul className="mt-3 space-y-3 border-t pt-3">{listings.map((item, index) => <li key={`${item.listing.external_id}:${index}`} className="space-y-1 text-xs leading-5">
        <p className="break-all font-medium">{item.listing.shop_sku || item.listing.external_id || 'Active listing'}</p>
        <p className="text-muted-foreground">Source: {item.source === 'listing' ? 'Selected for this listing' : 'Shop default warehouse'}</p>
        <p>Listing stock sync: {item.stockSync === 'enabled' ? 'Enabled' : item.stockSync === 'disabled' ? 'Disabled' : 'Not configured'}</p>
      </li>)}</ul>
    </section>)}</div>
    {summary.unconfirmed.length > 0 && <section className="mt-5 rounded-lg border p-4"><h3 className="text-sm font-semibold">Unconfirmed sources ({summary.unconfirmed.length})</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">These listings are excluded from the shop count until their shop and stock source can be verified.</p><ul className="mt-3 space-y-3">{summary.unconfirmed.map((item, index) => <li key={`${item.listing.external_id}:${index}`} className="text-xs leading-5"><p className="font-medium">{item.shopName || channelNames[item.listing.channel]}{item.listing.external_id ? ` · ${item.listing.external_id}` : ''}</p><p className="text-muted-foreground">{item.reason}</p></li>)}</ul></section>}
  </SheetContent></Sheet>;
}
