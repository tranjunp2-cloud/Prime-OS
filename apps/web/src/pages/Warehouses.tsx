import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Boxes,
  Building2,
  Check,
  Info,
  ClipboardCheck,
  Clock3,
  Link2,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Truck,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getWarehouses } from '@/lib/warehouse-store';

type MappingTab = 'channel' | 'physical';
type WarehouseSection = 'mapping' | 'stock' | 'transfers' | 'adjustments';
type OperationType = 'transfer' | 'adjustment' | null;

type PhysicalWarehouse = {
  id: string;
  name: string;
  code: string;
  address: string;
  region: string;
  type: 'Self-managed' | '3PL / Marketplace';
  skus: number;
  onHand: number;
  reserved: number;
  inTransit: number;
  damaged: number;
  safety: number;
  channels: string[];
  rank: number;
  role: string;
};

const channelLocations = [
  { channel: 'Shopee', mark: 'S', tone: 'text-orange-600', location: 'Shopee Malaysia Fulfillment', linked: 'Fulfillment By Shopee Malaysia', pickup: true, returns: true },
  { channel: 'Lazada', mark: 'L', tone: 'text-violet-600', location: 'Lazada Vietnam Hub', linked: 'Vietnam 3PL Partner', pickup: true, returns: false },
  { channel: 'PrimeWeb', mark: 'PW', tone: 'text-indigo-600', location: 'PrimeWeb Online Store', linked: 'CyberRecord Japan HQ', pickup: true, returns: true },
  { channel: 'PrimePOS', mark: 'POS', tone: 'text-sky-700', location: 'Singapore Retail Outlet', linked: 'Reseller Singapore', pickup: true, returns: true },
  { channel: 'Amazon', mark: 'a', tone: 'text-slate-950', location: 'Amazon JP Merchant Node', linked: null, pickup: false, returns: false },
  { channel: 'Rakuten', mark: 'R', tone: 'text-red-600', location: 'Rakuten Tokyo Store', linked: null, pickup: false, returns: true },
];

const inventoryMetrics = [
  { skus: 1240, onHand: 52140, reserved: 5840, inTransit: 1860, damaged: 245, safety: 1100, channels: ['PW', 'A'], role: 'Primary' },
  { skus: 986, onHand: 36720, reserved: 3980, inTransit: 2400, damaged: 184, safety: 900, channels: ['POS'], role: 'Regional' },
  { skus: 742, onHand: 22480, reserved: 2630, inTransit: 970, damaged: 112, safety: 900, channels: ['S'], role: 'Marketplace' },
  { skus: 318, onHand: 5480, reserved: 780, inTransit: 340, damaged: 35, safety: 420, channels: ['L'], role: '3PL' },
  { skus: 684, onHand: 18940, reserved: 2140, inTransit: 620, damaged: 76, safety: 700, channels: ['A'], role: 'Marketplace' },
];
const initialWarehouses: PhysicalWarehouse[] = getWarehouses().map((warehouse, index) => {
  const metrics = inventoryMetrics[index] ?? inventoryMetrics[0];
  return { id: warehouse.id, name: warehouse.name, code: warehouse.code, address: warehouse.address ?? 'Address managed by marketplace', region: warehouse.country, type: warehouse.type === 'internal' ? 'Self-managed' : '3PL / Marketplace', ...metrics, rank: index + 1 };
});

const stockRows = [
  { sku: 'PRIME-LAMP-001', product: 'Compact Smart Lamp', warehouse: 'HCM Central Warehouse', onHand: 520, reserved: 86, inTransit: 120, damaged: 4, safety: 40 },
  { sku: 'AUDIO-PRO-BLK', product: 'Studio Wireless Headphones', warehouse: 'Binh Duong Distribution Center', onHand: 284, reserved: 48, inTransit: 0, damaged: 7, safety: 25 },
  { sku: 'DESK-HUB-7IN1', product: 'USB-C Desk Hub 7-in-1', warehouse: 'Hanoi Fulfillment Hub', onHand: 192, reserved: 61, inTransit: 80, damaged: 2, safety: 30 },
  { sku: 'BOTTLE-750-SL', product: 'Thermal Bottle 750ml', warehouse: 'District 1 Branch', onHand: 74, reserved: 29, inTransit: 20, damaged: 3, safety: 15 },
  { sku: 'CAM-HOME-2K', product: 'Home Camera 2K', warehouse: 'HCM Central Warehouse', onHand: 96, reserved: 72, inTransit: 0, damaged: 1, safety: 20 },
];

const transfers = [
  { id: 'TRF-2026-0084', from: 'HCM Central', to: 'Hanoi Hub', skus: 18, units: 640, status: 'In transit', eta: 'Aug 14, 16:00' },
  { id: 'TRF-2026-0083', from: 'Binh Duong DC', to: 'District 1 Branch', skus: 7, units: 124, status: 'Awaiting dispatch', eta: 'Aug 13, 18:30' },
  { id: 'TRF-2026-0082', from: 'Hanoi Hub', to: 'HCM Central', skus: 12, units: 310, status: 'Received', eta: 'Aug 12, 10:20' },
];

const adjustments = [
  { id: 'ADJ-2026-0317', warehouse: 'HCM Central', sku: 'CAM-HOME-2K', delta: -3, reason: 'Cycle count variance', owner: 'Minh Tran', time: 'Today, 14:22' },
  { id: 'ADJ-2026-0316', warehouse: 'District 1 Branch', sku: 'BOTTLE-750-SL', delta: -2, reason: 'Damaged stock', owner: 'Lan Nguyen', time: 'Today, 11:05' },
  { id: 'ADJ-2026-0315', warehouse: 'Binh Duong DC', sku: 'AUDIO-PRO-BLK', delta: 12, reason: 'Inbound recount', owner: 'Quang Le', time: 'Yesterday, 17:40' },
];

function getSection(pathname: string): WarehouseSection {
  if (pathname.includes('/stock')) return 'stock';
  if (pathname.includes('/transfers')) return 'transfers';
  if (pathname.includes('/adjustments')) return 'adjustments';
  return 'mapping';
}

const getAtp = (warehouse: PhysicalWarehouse) => Math.max(0, warehouse.onHand - warehouse.reserved - warehouse.safety);

const stockDefinitions: Record<string, string> = {
  'On Hand': 'Total units physically recorded at the warehouse, including units already reserved for orders.',
  Reserved: 'Units allocated to open orders and therefore unavailable for new sales.',
  'Safety Stock': 'Buffer units withheld from sales to reduce overselling and fulfillment risk.',
  ATP: 'Available to Promise: units that can be sold now. Calculated as On Hand − Reserved − Safety Stock.',
  'Available to Promise': 'Units available for new orders. Calculated as On Hand − Reserved − Safety Stock.',
  'In Transit': 'Units moving between warehouses that have not yet been received at the destination.',
  Damaged: 'Units marked damaged or quarantined. These units are not sellable and are excluded from ATP.',
  'Damaged / Quarantine': 'Units marked damaged or awaiting inspection. These units are not sellable and are excluded from ATP.',
};

function BrandMark({ mark, tone }: { mark: string; tone?: string }) {
  return <span className={cn('inline-flex h-7 min-w-8 items-center justify-center text-xs font-black tracking-[-0.06em]', tone ?? 'text-slate-600')}>{mark}</span>;
}

function AddressIndicator({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><span className="grid size-5 place-items-center rounded-full bg-emerald-50"><Check className="size-3" /></span>Default</span>
    : <span className="text-xs text-slate-400">Not set</span>;
}

export default function Warehouses() {
  const { toast } = useToast();
  const location = useLocation();
  const section = getSection(location.pathname);
  const [mappingTab, setMappingTab] = useState<MappingTab>('channel');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailWarehouse, setDetailWarehouse] = useState<PhysicalWarehouse | null>(null);
  const [operation, setOperation] = useState<OperationType>(null);
  const [warehouses, setWarehouses] = useState(initialWarehouses);

  const filteredWarehouses = useMemo(() => warehouses.filter((warehouse) => !search || `${warehouse.name} ${warehouse.code} ${warehouse.address} ${warehouse.region} ${warehouse.type}`.toLowerCase().includes(search.toLowerCase())), [search, warehouses]);
  const filteredStock = useMemo(() => stockRows.filter((row) => !search || `${row.sku} ${row.product} ${row.warehouse}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const header = {
    mapping: {
      title: 'Warehouses & Mapping',
      description: 'Manage physical locations, channel mappings, and fulfillment routing rules.',
      icon: WarehouseIcon,
      actions: <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" />Add Physical Warehouse</Button>,
    },
    stock: {
      title: 'Inventory Overview',
      description: 'Monitor sellable and non-sellable stock across every physical location.',
      icon: Boxes,
      actions: <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setOperation('adjustment')}><ClipboardCheck className="size-4" />Adjust Stock</Button><Button onClick={() => setOperation('transfer')}><ArrowRightLeft className="size-4" />Transfer Stock</Button></div>,
    },
    transfers: {
      title: 'Stock Transfers',
      description: 'Move inventory between locations and track every fulfillment milestone.',
      icon: ArrowRightLeft,
      actions: undefined,
    },
    adjustments: {
      title: 'Stock Adjustments',
      description: 'Review auditable inventory changes, reason codes, and operator ownership.',
      icon: ClipboardCheck,
      actions: undefined,
    },
  }[section];

  return <TooltipProvider delayDuration={150}><div className="space-y-5 p-4 md:p-6">
    <WorkspacePageHeader
      title={header.title}
      description={header.description}
      icon={header.icon}
      actions={header.actions}
    />

    {section === 'mapping' && <MappingSection mappingTab={mappingTab} setMappingTab={setMappingTab} warehouses={warehouses} filteredWarehouses={filteredWarehouses} search={search} setSearch={setSearch} onOpenWarehouse={setDetailWarehouse} onLink={(locationName) => toast({ title: 'Warehouse linker opened', description: `Select a physical node for ${locationName}.` })} />}
    {section === 'stock' && <StockLevels search={search} setSearch={setSearch} rows={filteredStock} onOpenWarehouse={(name) => setDetailWarehouse(warehouses.find((item) => item.name === name) ?? null)} />}
    {section === 'transfers' && <TransferList onCreate={() => setOperation('transfer')} />}
    {section === 'adjustments' && <AdjustmentList onCreate={() => setOperation('adjustment')} />}

    <CreateWarehouseDrawer open={createOpen} onClose={() => setCreateOpen(false)} onCreate={(warehouse) => {
      setWarehouses((current) => [...current, { ...warehouse, id: `wh-${Date.now()}`, type: 'Self-managed', skus: 0, onHand: 0, reserved: 0, inTransit: 0, damaged: 0, safety: 0, channels: [], role: warehouse.rank === 1 ? 'Primary' : 'Backup' }]);
      setCreateOpen(false);
      toast({ title: 'Physical warehouse added', description: `${warehouse.name} is ready to link to sales channels.` });
    }} />
    <WarehouseDetailDrawer warehouse={detailWarehouse} onClose={() => setDetailWarehouse(null)} onTransfer={() => { setDetailWarehouse(null); setOperation('transfer'); }} onAdjust={() => { setDetailWarehouse(null); setOperation('adjustment'); }} />
    <OperationDrawer type={operation} warehouses={warehouses} onClose={() => setOperation(null)} onSubmit={(title, description) => { setOperation(null); toast({ title, description }); }} />
  </div></TooltipProvider>;
}

function MappingSection({ mappingTab, setMappingTab, warehouses, filteredWarehouses, search, setSearch, onOpenWarehouse, onLink }: { mappingTab: MappingTab; setMappingTab: (tab: MappingTab) => void; warehouses: PhysicalWarehouse[]; filteredWarehouses: PhysicalWarehouse[]; search: string; setSearch: (value: string) => void; onOpenWarehouse: (warehouse: PhysicalWarehouse) => void; onLink: (name: string) => void }) {
  const [routingRules, setRoutingRules] = useState({ geographic: true, fallback: true, split: false });
  return <div className="space-y-4">
    <div><h2 className="text-lg font-semibold text-slate-900">Warehouse Mapping & Routing</h2><p className="mt-1 text-sm text-slate-500">Connect channel locations to physical nodes and define fulfillment priority.</p></div>
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Warehouse mapping type">
      {[{ key: 'channel' as const, label: 'Channel Locations', count: channelLocations.length }, { key: 'physical' as const, label: 'Physical Warehouses', count: warehouses.length }].map((item) => <button key={item.key} type="button" onClick={() => setMappingTab(item.key)} className={cn('relative min-h-11 shrink-0 px-4 text-sm font-semibold transition-colors', mappingTab === item.key ? 'text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-slate-500 hover:text-slate-900')}>{item.label}<span className={cn('ml-2 text-xs tabular-nums', mappingTab === item.key ? 'text-primary/75' : 'text-slate-400')}>{item.count}</span></button>)}
    </nav>
    {mappingTab === 'channel'
      ? <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><SectionHeading title="Channel warehouse mapping" description="Marketplace dispatch and return locations linked to physical stock nodes." /><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left"><TableHead headers={['Store & Channel', 'Channel Warehouse Name', 'Linked Physical Warehouse', 'Default Pick-up', 'Default Return', 'Actions']} /><tbody className="divide-y divide-slate-100">{channelLocations.map((item) => <tr key={item.location} className="hover:bg-slate-50/60"><td className="px-4 py-3"><span className="inline-flex items-center gap-2"><BrandMark mark={item.mark} tone={item.tone} /><span className="text-sm font-semibold text-slate-900">{item.channel}</span></span></td><td className="px-4 py-3 text-sm font-medium text-slate-700">{item.location}</td><td className="px-4 py-3">{item.linked ? <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"><WarehouseIcon className="size-3.5" />{item.linked}</span> : <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"><AlertTriangle className="size-3.5" />Unmapped</span>}</td><td className="px-4 py-3"><AddressIndicator active={item.pickup} /></td><td className="px-4 py-3"><AddressIndicator active={item.returns} /></td><td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => onLink(item.location)}><Link2 className="size-4" />Link Warehouse</Button></td></tr>)}</tbody></table></div></section>
      : <><SearchField value={search} onChange={setSearch} placeholder="Search by warehouse name, code, address, type, or region..." /><PhysicalWarehouseTable warehouses={filteredWarehouses} onOpen={onOpenWarehouse} /></>}
    <section className="rounded-xl border border-slate-200 bg-white">
      <SectionHeading title="Smart routing rules" description="Apply automatic routing after channel-to-warehouse mapping is resolved." />
      <div className="grid divide-y divide-slate-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {[
          { key: 'geographic' as const, title: 'Geographic routing', description: 'Route orders to the closest eligible warehouse by customer region.', icon: MapPin },
          { key: 'fallback' as const, title: 'Out-of-stock fallback', description: 'Automatically reroute to the next warehouse when primary ATP is insufficient.', icon: ShieldCheck },
          { key: 'split' as const, title: 'Split order fulfillment', description: 'Allow one order to ship from multiple warehouses when no single node can fulfill it.', icon: ArrowRightLeft },
        ].map((rule) => {
          const Icon = rule.icon;
          const enabled = routingRules[rule.key];
          return <div key={rule.key} className="flex items-start gap-3 p-4"><span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', enabled ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500')}><Icon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h4 className="text-sm font-semibold text-slate-900">{rule.title}</h4><button type="button" role="switch" aria-checked={enabled} aria-label={`${rule.title}: ${enabled ? 'enabled' : 'disabled'}`} onClick={() => setRoutingRules((current) => ({ ...current, [rule.key]: !enabled }))} className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', enabled ? 'bg-indigo-600' : 'bg-slate-200')}><span className={cn('absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform', enabled && 'translate-x-5')} /></button></div><p className="mt-1 text-xs leading-5 text-slate-500">{rule.description}</p></div></div>;
        })}
      </div>
    </section>
  </div>;
}

function PhysicalWarehouseTable({ warehouses, onOpen }: { warehouses: PhysicalWarehouse[]; onOpen: (warehouse: PhysicalWarehouse) => void }) {
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-left"><TableHead headers={['Physical Warehouse', 'Address & Type', 'Stock Breakdown', 'Linked Channels', 'Priority', 'Actions']} /><tbody className="divide-y divide-slate-100">{warehouses.map((warehouse) => <tr key={warehouse.id} className="cursor-pointer hover:bg-slate-50/60" onClick={() => onOpen(warehouse)}><td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><Building2 className="size-4" /></span><div><p className="text-sm font-semibold text-slate-900">{warehouse.name}</p><p className="mt-1 font-mono text-xs font-semibold text-slate-500">{warehouse.code}</p></div></div></td><td className="max-w-[280px] px-4 py-3"><p className="text-sm font-medium text-slate-700">{warehouse.address}</p><div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin className="size-3" />{warehouse.region}</span><span>·</span><span>{warehouse.type}</span></div></td><td className="px-4 py-3"><p className="text-sm font-semibold tabular-nums text-slate-900">{getAtp(warehouse).toLocaleString()} ATP</p><p className="mt-1 text-xs tabular-nums text-slate-500">{warehouse.onHand.toLocaleString()} on hand · {warehouse.reserved.toLocaleString()} reserved</p></td><td className="px-4 py-3"><div className="flex -space-x-1">{warehouse.channels.map((mark) => <span key={mark} className="grid size-8 place-items-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-600">{mark}</span>)}</div></td><td className="px-4 py-3"><span className={cn('inline-flex rounded-md border px-2 py-1 text-xs font-semibold', warehouse.rank === 1 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>#{warehouse.rank} {warehouse.role}</span></td><td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="size-9 text-indigo-700" onClick={() => onOpen(warehouse)} aria-label={`View ${warehouse.name}`}><ArrowRight className="size-4" /></Button><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-9" aria-label={`More actions for ${warehouse.name}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onOpen(warehouse)}>View warehouse details</DropdownMenuItem><DropdownMenuItem>Manage channel links</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-rose-600">Deactivate warehouse</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td></tr>)}</tbody></table></div>{warehouses.length === 0 && <EmptyState title="No matching warehouses found" />}</section>;
}

function StockLevels({ search, setSearch, rows, onOpenWarehouse }: { search: string; setSearch: (value: string) => void; rows: typeof stockRows; onOpenWarehouse: (name: string) => void }) {
  const totals = rows.reduce((sum, row) => ({ onHand: sum.onHand + row.onHand, reserved: sum.reserved + row.reserved, transit: sum.transit + row.inTransit, damaged: sum.damaged + row.damaged, atp: sum.atp + Math.max(0, row.onHand - row.reserved - row.safety) }), { onHand: 0, reserved: 0, transit: 0, damaged: 0, atp: 0 });
  return <div className="space-y-4"><div><h2 className="text-lg font-semibold text-slate-900">Stock Levels</h2><p className="mt-1 text-sm text-slate-500">Sellable and non-sellable inventory by SKU and physical location.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[['On Hand', totals.onHand], ['Reserved', totals.reserved], ['Available to Promise', totals.atp], ['In Transit', totals.transit], ['Damaged / Quarantine', totals.damaged]].map(([label, value], index) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><MetricLabel label={String(label)} /><p className={cn('mt-2 text-2xl font-bold tabular-nums', index === 2 ? 'text-indigo-700' : 'text-slate-900')}>{Number(value).toLocaleString()}</p></div>)}</div><SearchField value={search} onChange={setSearch} placeholder="Search SKU, product, or warehouse..." /><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left"><TableHead headers={['SKU & Product', 'Warehouse', 'On Hand', 'Reserved', 'Safety Stock', 'ATP', 'In Transit', 'Damaged']} rightAlignedColumns={[2, 3, 4, 5, 6, 7]} /><tbody className="divide-y divide-slate-100">{rows.map((row) => { const atp = Math.max(0, row.onHand - row.reserved - row.safety); const low = atp <= row.safety; return <tr key={`${row.sku}-${row.warehouse}`} className="hover:bg-slate-50/60"><td className="px-4 py-3"><p className="text-sm font-semibold text-slate-900">{row.product}</p><p className="mt-1 font-mono text-xs text-slate-500">{row.sku}</p></td><td className="px-4 py-3"><button type="button" onClick={() => onOpenWarehouse(row.warehouse)} className="text-sm font-medium text-indigo-700 hover:underline">{row.warehouse}</button></td>{[row.onHand, row.reserved, row.safety].map((value, index) => <td key={index} className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{value.toLocaleString()}</td>)}<td className="px-4 py-3 text-right"><span className={cn('text-sm font-bold tabular-nums', low ? 'text-amber-700' : 'text-emerald-700')}>{atp.toLocaleString()}</span>{low && <span className="ml-2 text-xs font-semibold text-amber-700">Low</span>}</td><td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{row.inTransit.toLocaleString()}</td><td className="px-4 py-3 text-right text-sm tabular-nums text-rose-700">{row.damaged.toLocaleString()}</td></tr>; })}</tbody></table></div></section></div>;
}

function TransferList({ onCreate }: { onCreate: () => void }) {
  return <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Stock Transfers</h2><p className="mt-1 text-sm text-slate-500">Track dispatch, in-transit, and receiving milestones between locations.</p></div><Button onClick={onCreate}><Plus className="size-4" />Create Transfer</Button></div><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><TableHead headers={['Transfer ID', 'Route', 'Inventory', 'Status', 'Expected / Completed']} /><tbody className="divide-y divide-slate-100">{transfers.map((item) => <tr key={item.id} className="hover:bg-slate-50/60"><td className="px-4 py-4 font-mono text-xs font-semibold text-indigo-700">{item.id}</td><td className="px-4 py-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span>{item.from}</span><ArrowRight className="size-4 text-slate-400" /><span>{item.to}</span></div></td><td className="px-4 py-4 text-sm tabular-nums text-slate-700">{item.skus} SKUs · {item.units.toLocaleString()} units</td><td className="px-4 py-4"><StatusBadge status={item.status} /></td><td className="px-4 py-4 text-sm text-slate-600">{item.eta}</td></tr>)}</tbody></table></div></section></div>;
}

function AdjustmentList({ onCreate }: { onCreate: () => void }) {
  return <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Stock Adjustments</h2><p className="mt-1 text-sm text-slate-500">Auditable stock changes with reason codes and operator ownership.</p></div><Button onClick={onCreate}><Plus className="size-4" />New Adjustment</Button></div><div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span className="font-semibold">Inventory control:</span> adjustments change on-hand stock and require a reason code.</div><section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><TableHead headers={['Adjustment ID', 'Warehouse', 'SKU', 'Quantity Change', 'Reason', 'Operator & Time']} rightAlignedColumns={[3]} /><tbody className="divide-y divide-slate-100">{adjustments.map((item) => <tr key={item.id} className="hover:bg-slate-50/60"><td className="px-4 py-4 font-mono text-xs font-semibold text-indigo-700">{item.id}</td><td className="px-4 py-4 text-sm font-medium text-slate-900">{item.warehouse}</td><td className="px-4 py-4 font-mono text-xs text-slate-600">{item.sku}</td><td className={cn('px-4 py-4 text-right text-sm font-bold tabular-nums', item.delta > 0 ? 'text-emerald-700' : 'text-rose-700')}>{item.delta > 0 ? '+' : ''}{item.delta}</td><td className="px-4 py-4 text-sm text-slate-700">{item.reason}</td><td className="px-4 py-4"><p className="text-sm font-medium text-slate-700">{item.owner}</p><p className="mt-1 text-xs text-slate-500">{item.time}</p></td></tr>)}</tbody></table></div></section></div>;
}

function WarehouseDetailDrawer({ warehouse, onClose, onTransfer, onAdjust }: { warehouse: PhysicalWarehouse | null; onClose: () => void; onTransfer: () => void; onAdjust: () => void }) {
  if (!warehouse) return null;
  const metrics = [
    ['On Hand', warehouse.onHand, 'text-slate-900'],
    ['Reserved', warehouse.reserved, 'text-amber-700'],
    ['ATP', getAtp(warehouse), 'text-emerald-700'],
    ['In Transit', warehouse.inTransit, 'text-indigo-700'],
    ['Damaged', warehouse.damaged, 'text-rose-700'],
    ['Safety Stock', warehouse.safety, 'text-slate-700'],
  ];
  return <Sheet open onOpenChange={(open) => !open && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-2xl"><SheetHeader className="border-b border-slate-200 p-5"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><WarehouseIcon className="size-5" /></span><div><SheetTitle>{warehouse.name}</SheetTitle><SheetDescription>{warehouse.code} · {warehouse.type} · {warehouse.region}</SheetDescription></div></div></SheetHeader><div className="flex-1 space-y-5 overflow-y-auto p-5 pb-24"><section><h3 className="text-sm font-semibold text-slate-900">Stock breakdown</h3><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{metrics.map(([label, value, tone]) => <div key={String(label)} className="rounded-lg border border-slate-200 p-3"><p className="text-xs font-medium text-slate-500">{label}</p><p className={cn('mt-1 text-xl font-bold tabular-nums', tone)}>{Number(value).toLocaleString()}</p></div>)}</div><p className="mt-2 text-xs text-slate-500">ATP = On Hand − Reserved − Safety Stock</p></section><section><h3 className="text-sm font-semibold text-slate-900">Recent inventory activity</h3><div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">{[['Inbound receipt posted', '+240 units', 'Today, 09:32'], ['Order reservations created', '-86 ATP', 'Today, 08:45'], ['Cycle count completed', '3 variances', 'Yesterday, 16:20']].map(([title, value, time]) => <div key={title} className="flex items-center justify-between gap-4 p-3"><div><p className="text-sm font-medium text-slate-800">{title}</p><p className="mt-1 text-xs text-slate-500">{time}</p></div><span className="text-sm font-semibold tabular-nums text-slate-700">{value}</span></div>)}</div></section><section className="rounded-lg border border-slate-200 p-4"><h3 className="text-sm font-semibold text-slate-900">Fulfillment configuration</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><p className="text-sm text-slate-600"><span className="block text-xs text-slate-500">Priority</span>#{warehouse.rank} {warehouse.role}</p><p className="text-sm text-slate-600"><span className="block text-xs text-slate-500">Linked channels</span>{warehouse.channels.join(', ') || 'None'}</p></div></section></div><div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><Button variant="outline" onClick={onAdjust}><ClipboardCheck className="size-4" />Adjust Stock</Button><Button onClick={onTransfer}><ArrowRightLeft className="size-4" />Transfer Stock</Button></div></SheetContent></Sheet>;
}

function OperationDrawer({ type, warehouses, onClose, onSubmit }: { type: OperationType; warehouses: PhysicalWarehouse[]; onClose: () => void; onSubmit: (title: string, description: string) => void }) {
  const [from, setFrom] = useState(warehouses[0]?.id ?? '');
  const [to, setTo] = useState(warehouses[1]?.id ?? '');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Cycle count variance');
  if (!type) return null;
  const transfer = type === 'transfer';
  return <Sheet open onOpenChange={(open) => !open && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl"><SheetHeader className="border-b border-slate-200 p-5"><SheetTitle>{transfer ? 'Create Stock Transfer' : 'Create Stock Adjustment'}</SheetTitle><SheetDescription>{transfer ? 'Move stock through dispatch, in-transit, and receipt milestones.' : 'Record an auditable increase or decrease to on-hand stock.'}</SheetDescription></SheetHeader><div className="flex-1 space-y-5 overflow-y-auto p-5 pb-24"><FormSection title={transfer ? 'Transfer Route' : 'Warehouse'}><div className="grid gap-3 sm:grid-cols-2"><SelectField label={transfer ? 'Source Warehouse' : 'Physical Warehouse'} value={from} onChange={setFrom} options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} />{transfer && <SelectField label="Destination Warehouse" value={to} onChange={setTo} options={warehouses.filter((warehouse) => warehouse.id !== from).map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))} />}</div></FormSection><FormSection title="Inventory"><div className="grid gap-3 sm:grid-cols-2"><Field label="Master SKU" value={sku} onChange={setSku} placeholder="PRIME-LAMP-001" /><Field label={transfer ? 'Transfer Quantity' : 'Quantity Change'} value={quantity} onChange={setQuantity} placeholder={transfer ? '500' : '-3'} /></div></FormSection>{!transfer && <FormSection title="Audit Reason"><SelectField label="Reason Code" value={reason} onChange={setReason} options={['Cycle count variance', 'Damaged stock', 'Lost stock', 'Inbound recount', 'Return disposition'].map((value) => ({ value, label: value }))} /><p className="mt-2 text-xs text-slate-500">The operator and timestamp will be recorded automatically.</p></FormSection>}{transfer && from === to && <p className="text-sm font-medium text-rose-700">Source and destination warehouses must be different.</p>}</div><div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!sku || !quantity || (transfer && from === to)} onClick={() => onSubmit(transfer ? 'Transfer created' : 'Adjustment recorded', transfer ? `${quantity} units of ${sku} are awaiting dispatch.` : `${sku} stock changed by ${quantity}.`)}>{transfer ? 'Create Transfer' : 'Record Adjustment'}</Button></div></SheetContent></Sheet>;
}

function CreateWarehouseDrawer({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (warehouse: Pick<PhysicalWarehouse, 'name' | 'code' | 'address' | 'region' | 'rank'>) => void }) {
  const [name, setName] = useState(''); const [code, setCode] = useState(''); const [manager, setManager] = useState(''); const [phone, setPhone] = useState(''); const [province, setProvince] = useState('Ho Chi Minh City'); const [district, setDistrict] = useState(''); const [ward, setWard] = useState(''); const [street, setStreet] = useState(''); const [zip, setZip] = useState(''); const [rank, setRank] = useState(2); const [negative, setNegative] = useState(false);
  return <Sheet open={open} onOpenChange={(value) => !value && onClose()}><SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl"><SheetHeader className="border-b border-slate-200 p-5"><SheetTitle>Add Physical Warehouse</SheetTitle><SheetDescription>Create an inventory node and configure its fulfillment priority.</SheetDescription></SheetHeader><div className="flex-1 space-y-5 overflow-y-auto p-5 pb-24"><FormSection title="General Information"><div className="grid gap-3 sm:grid-cols-2"><Field label="Warehouse Name" value={name} onChange={setName} placeholder="HCM Central Warehouse" /><Field label="Warehouse Code" value={code} onChange={setCode} placeholder="WH-HCM-01" /><Field label="Manager" value={manager} onChange={setManager} placeholder="Nguyen Van A" /><Field label="Phone Number" value={phone} onChange={setPhone} placeholder="0901 234 567" /></div></FormSection><FormSection title="Full Address"><div className="grid gap-3 sm:grid-cols-2"><SelectField label="Province / City" value={province} onChange={setProvince} options={['Ho Chi Minh City', 'Hanoi', 'Binh Duong', 'Da Nang'].map((value) => ({ value, label: value }))} /><Field label="District" value={district} onChange={setDistrict} placeholder="District 7" /><Field label="Ward" value={ward} onChange={setWard} placeholder="Tan Phong" /><Field label="Postal Code" value={zip} onChange={setZip} placeholder="700000" /><div className="sm:col-span-2"><Field label="Street Address" value={street} onChange={setStreet} placeholder="12 Nguyen Van Linh" /></div></div></FormSection><FormSection title="Fulfillment Settings"><div className="grid gap-3 sm:grid-cols-2"><SelectField label="Dispatch Priority" value={String(rank)} onChange={(value) => setRank(Number(value))} options={[{ value: '1', label: '#1 Primary' }, { value: '2', label: '#2 Backup' }, { value: '3', label: '#3 Regional' }, { value: '4', label: '#4 Store' }]} /><label className="flex min-h-10 items-center gap-3 self-end rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={negative} onChange={(event) => setNegative(event.target.checked)} className="size-4" />Allow Negative Stock</label></div><p className="mt-2 text-xs text-slate-500">Negative stock is currently {negative ? 'enabled' : 'disabled'}.</p></FormSection></div><div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!name || !code || !street} onClick={() => onCreate({ name, code: code.toUpperCase(), address: `${street}, ${ward}, ${district}, ${province} ${zip}`.replace(/, ,/g, ','), region: province === 'Hanoi' ? 'North' : province === 'Da Nang' ? 'Central' : 'South', rank })}>Create Physical Warehouse</Button></div></SheetContent></Sheet>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'Received' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'In transit' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  const Icon = status === 'Received' ? Check : status === 'In transit' ? Truck : Clock3;
  return <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold', tone)}><Icon className="size-3.5" />{status}</span>;
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) { return <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 pl-9" /></div>; }
function SectionHeading({ title, description }: { title: string; description: string }) { return <div className="border-b border-slate-200 px-4 py-3"><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">{description}</p></div>; }
function MetricLabel({ label }: { label: string }) { return <div className="flex items-center gap-1"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>{stockDefinitions[label] && <DefinitionTooltip label={label} description={stockDefinitions[label]} />}</div>; }
function DefinitionTooltip({ label, description }: { label: string; description: string }) { return <Tooltip><TooltipTrigger asChild><button type="button" className="grid size-7 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`What does ${label} mean?`}><Info className="size-3.5" /></button></TooltipTrigger><TooltipContent side="top" className="max-w-72 text-xs leading-relaxed"><span className="font-semibold">{label}:</span> {description}</TooltipContent></Tooltip>; }
function TableHead({ headers, rightAlignedColumns = [] }: { headers: string[]; rightAlignedColumns?: number[] }) { return <thead className="border-b border-slate-200 bg-slate-50/60"><tr>{headers.map((header, index) => { const rightAligned = header === 'Actions' || rightAlignedColumns.includes(index); return <th key={header} className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500', rightAligned && 'text-right')}><span className={cn('flex w-full items-center gap-1', rightAligned && 'justify-end')}>{header}{stockDefinitions[header] && <DefinitionTooltip label={header} description={stockDefinitions[header]} />}</span></th>; })}</tr></thead>; }
function EmptyState({ title }: { title: string }) { return <div className="grid min-h-48 place-items-center border-t border-slate-100 text-center"><div><Search className="mx-auto size-5 text-slate-400" /><p className="mt-2 text-sm font-semibold text-slate-900">{title}</p></div></div>; }
function FormSection({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-xl border border-slate-200 p-4"><h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>{children}</section>; }
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="grid gap-1.5 text-xs font-semibold text-slate-600">{label}<Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 text-sm" /></label>; }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) { return <label className="grid gap-1.5 text-xs font-semibold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
