import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BadgePercent,
  Barcode,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileText,
  Globe2,
  GripVertical,
  Image,
  Layers3,
  Link2,
  Menu,
  Monitor,
  Package,
  PanelTop,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  Save,
  ScanLine,
  Search,
  Settings2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Tablet,
  Tags,
  Trash2,
  UserPlus,
  Wifi,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type TouchpointWorkspaceKind = 'primeweb' | 'pos';
type Device = 'desktop' | 'tablet' | 'mobile';

const builderViews: Record<string, { title: string; description: string; icon: LucideIcon }> = {
  '/builder/pages': { title: 'Pages & Content', description: 'Create storefront pages, reusable content blocks, and publishing schedules.', icon: FileText },
  '/builder/navigation': { title: 'Navigation & Menus', description: 'Build responsive menus and connect destinations without code.', icon: Menu },
  '/builder/banners': { title: 'Banners & Popups', description: 'Launch promotional banners, announcement bars, and targeted popups.', icon: Image },
  '/builder/domains': { title: 'Custom Domains & SEO', description: 'Manage domains, redirects, metadata, and search visibility.', icon: Globe2 },
  '/builder/integrations': { title: 'Pixel Integrations', description: 'Connect analytics, ads, conversion pixels, and consent signals.', icon: Link2 },
};

const posViews: Record<string, { title: string; description: string; icon: LucideIcon; action: string }> = {
  '/pos/shifts': { title: 'Shift Management', description: 'Open or close cashier shifts, reconcile cash, and issue Z-Reports.', icon: CircleDollarSign, action: 'Close current shift' },
  '/pos/transactions': { title: 'Today Transactions', description: 'Review, search, and reprint receipts from today’s register activity.', icon: ReceiptText, action: 'Export transactions' },
  '/pos/returns': { title: 'Return / Refund Counter', description: 'Find the original sale, validate return eligibility, and refund securely.', icon: RotateCcw, action: 'Start a return' },
  '/pos/hardware': { title: 'Hardware Setup', description: 'Connect and test receipt printers, barcode scanners, and cash drawers.', icon: Settings2, action: 'Scan for devices' },
};

const builderSections = [
  { id: 'announcement', label: 'Announcement Bar', icon: PanelTop },
  { id: 'header', label: 'Header & Navigation', icon: Menu },
  { id: 'hero', label: 'Hero Banner', icon: Image },
  { id: 'collection', label: 'Featured Collection', icon: Layers3 },
  { id: 'value', label: 'Value Propositions', icon: Sparkles },
  { id: 'footer', label: 'Footer', icon: PanelTop },
];

const products = [
  { id: 'p1', name: 'Cloud Runner', category: 'Footwear', price: 129, stock: 18, color: 'bg-blue-50 text-blue-600' },
  { id: 'p2', name: 'Everyday Tote', category: 'Accessories', price: 48, stock: 32, color: 'bg-amber-50 text-amber-600' },
  { id: 'p3', name: 'Studio Hoodie', category: 'Apparel', price: 82, stock: 14, color: 'bg-violet-50 text-violet-600' },
  { id: 'p4', name: 'Motion Cap', category: 'Accessories', price: 32, stock: 25, color: 'bg-emerald-50 text-emerald-600' },
  { id: 'p5', name: 'Transit Bottle', category: 'Lifestyle', price: 28, stock: 41, color: 'bg-cyan-50 text-cyan-600' },
  { id: 'p6', name: 'Core Tee', category: 'Apparel', price: 39, stock: 38, color: 'bg-rose-50 text-rose-600' },
  { id: 'p7', name: 'Weekend Pack', category: 'Bags', price: 96, stock: 9, color: 'bg-orange-50 text-orange-600' },
  { id: 'p8', name: 'Flex Socks', category: 'Apparel', price: 18, stock: 62, color: 'bg-indigo-50 text-indigo-600' },
];

function PrimeWebStudio() {
  const [device, setDevice] = useState<Device>('desktop');
  const [selectedSection, setSelectedSection] = useState('collection');
  const [binding, setBinding] = useState('Main Workspace / New Arrivals');
  const selectedLabel = builderSections.find((section) => section.id === selectedSection)?.label ?? 'Section';
  const canvasWidth = device === 'desktop' ? 'max-w-5xl' : device === 'tablet' ? 'max-w-[720px]' : 'max-w-[390px]';

  return (
    <div className="flex min-h-full flex-col bg-slate-100 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 xl:h-[calc(100vh-var(--header-height))] xl:overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">PrimeWeb Studio</p><h1 className="text-lg font-semibold">Theme Editor · Horizon</h1></div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-zinc-700 dark:bg-zinc-800" aria-label="Preview device">
            {([{ id: 'desktop', icon: Monitor }, { id: 'tablet', icon: Tablet }, { id: 'mobile', icon: Smartphone }] as const).map(({ id, icon: Icon }) => <button key={id} type="button" onClick={() => setDevice(id)} className={cn('grid size-10 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', device === id ? 'bg-white text-primary shadow-sm dark:bg-zinc-700' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white')} aria-label={`${id} preview`} aria-pressed={device === id}><Icon className="size-4" /></button>)}
          </div>
          <Button variant="outline" className="min-h-11"><Save className="size-4" />Save</Button>
          <Button className="min-h-11">Publish</Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[240px_minmax(420px,1fr)_290px]">
        <aside className="overflow-y-auto border-b border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 xl:border-b-0 xl:border-r" aria-label="Page sections">
          <div className="mb-3 flex items-center justify-between px-2"><div><h2 className="text-sm font-semibold">Home page</h2><p className="text-xs text-slate-500 dark:text-zinc-400">Sections</p></div><button type="button" className="grid size-11 place-items-center rounded-md hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-zinc-800" aria-label="Add section"><Plus className="size-4" /></button></div>
          <div className="grid gap-1">{builderSections.map((section) => { const Icon = section.icon; return <button key={section.id} type="button" onClick={() => setSelectedSection(section.id)} className={cn('flex min-h-11 items-center gap-2 rounded-md px-2 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary', selectedSection === section.id ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800')}><GripVertical className="size-3.5 text-slate-400" /><Icon className="size-4" /><span className="min-w-0 flex-1 truncate">{section.label}</span><ChevronRight className="size-3.5" /></button>; })}</div>
          <Button variant="outline" className="mt-3 min-h-11 w-full"><Plus className="size-4" />Add section</Button>
        </aside>

        <section className="min-w-0 overflow-auto bg-slate-200/70 p-4 dark:bg-zinc-950 md:p-6" aria-label="Storefront preview canvas">
          <div className={cn('mx-auto overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl transition-[max-width] duration-300 motion-reduce:transition-none dark:border-zinc-700 dark:bg-zinc-900', canvasWidth)}>
            <div className="flex h-7 items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 dark:border-zinc-800 dark:bg-zinc-950"><span className="size-2 rounded-full bg-red-400" /><span className="size-2 rounded-full bg-amber-400" /><span className="size-2 rounded-full bg-emerald-400" /><span className="ml-3 truncate text-[10px] text-slate-400">preview.unifi.store</span></div>
            <div className="bg-slate-900 px-3 py-2 text-center text-[10px] font-medium text-white">Free shipping on orders over $80</div>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-zinc-800"><div className="text-lg font-black tracking-tight">NORTH.</div><div className={cn('items-center gap-5 text-xs font-medium', device === 'mobile' ? 'hidden' : 'flex')}><span>New</span><span>Shop</span><span>Collections</span></div><ShoppingBag className="size-4" /></div>
            <div className="grid min-h-56 place-items-center bg-gradient-to-br from-emerald-100 via-white to-cyan-100 px-6 py-12 text-center dark:from-emerald-950 dark:via-zinc-900 dark:to-cyan-950"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">New season</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Move your way.</h2><p className="mx-auto mt-3 max-w-md text-xs leading-5 text-slate-600 dark:text-zinc-300">Everyday essentials designed for work, travel, and everything between.</p><button type="button" className="mt-5 min-h-10 rounded-md bg-slate-900 px-5 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">Shop collection</button></div></div>
            <div className={cn('p-5 transition-colors', selectedSection === 'collection' && 'ring-2 ring-inset ring-primary')}>
              <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Live collection</p><h3 className="mt-1 text-xl font-bold">New Arrivals</h3></div><span className="text-[10px] text-slate-500 dark:text-zinc-400">Synced from Main</span></div>
              <div className={cn('grid gap-3', device === 'mobile' ? 'grid-cols-2' : 'grid-cols-3')}>{products.slice(0, 3).map((product) => <div key={product.id}><div className={cn('grid aspect-square place-items-center rounded-lg', product.color)}><Package className="size-8" /></div><p className="mt-2 truncate text-xs font-semibold">{product.name}</p><p className="text-[11px] text-slate-500">${product.price}.00</p></div>)}</div>
            </div>
          </div>
        </section>

        <aside className="overflow-y-auto border-t border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 xl:border-l xl:border-t-0" aria-label="Style and data inspector">
          <div className="mb-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Inspector</p><h2 className="mt-1 text-sm font-semibold">{selectedLabel}</h2></div>
          <div className="space-y-5">
            <section><div className="mb-2 flex items-center gap-2"><Link2 className="size-4 text-primary" /><h3 className="text-xs font-semibold">Live data binding</h3></div><label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400" htmlFor="collection-binding">Source collection</label><select id="collection-binding" value={binding} onChange={(event) => setBinding(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700 dark:bg-zinc-950"><option>Main Workspace / New Arrivals</option><option>Main Workspace / Best Sellers</option><option>Main Workspace / Summer Edit</option></select><div className="mt-2 flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-2 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Check className="size-3.5" />Live sync active · 24 products</div></section>
            <section className="border-t border-slate-200 pt-4 dark:border-zinc-800"><h3 className="text-xs font-semibold">Content</h3><label className="mt-3 block text-[11px] font-medium text-slate-500" htmlFor="section-heading">Heading</label><input id="section-heading" defaultValue="New Arrivals" className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-transparent px-3 text-xs outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700" /><label className="mt-3 block text-[11px] font-medium text-slate-500" htmlFor="product-limit">Products shown</label><input id="product-limit" type="number" defaultValue="6" className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-transparent px-3 text-xs outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700" /></section>
            <section className="border-t border-slate-200 pt-4 dark:border-zinc-800"><h3 className="text-xs font-semibold">Style</h3><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className="min-h-11 rounded-md border-2 border-primary bg-primary/5 text-xs font-medium">Grid</button><button type="button" className="min-h-11 rounded-md border border-slate-200 text-xs font-medium dark:border-zinc-700">Carousel</button></div></section>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PrimeWebManagementView({ config }: { config: (typeof builderViews)[string] }) {
  const Icon = config.icon;
  return <div className="min-h-full bg-slate-50 p-4 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 md:p-8"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6 dark:border-zinc-800"><div><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></span><h1 className="mt-4 text-2xl font-bold tracking-tight">{config.title}</h1><p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-zinc-400">{config.description}</p></div><Button className="min-h-11"><Plus className="size-4" />Create new</Button></div><div className="mt-6 grid gap-4 lg:grid-cols-3">{['Published', 'Drafts', 'Needs attention'].map((label, index) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold">{[12, 4, 2][index]}</p></div>)}</div><div className="mt-6 rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"><div className="border-b border-slate-200 px-5 py-4 text-sm font-semibold dark:border-zinc-800">Recent activity</div>{['Homepage Summer Edit', 'Main navigation', 'Welcome campaign'].map((item, index) => <div key={item} className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-5 last:border-0 dark:border-zinc-800"><span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item}</p><p className="text-xs text-slate-500">Updated {index + 1} hour{index ? 's' : ''} ago</p></div><Button variant="ghost" size="sm">Edit</Button></div>)}</div></div>;
}

type CartLine = { id: string; name: string; price: number; quantity: number };

function PosStatusBar() {
  const [online, setOnline] = useState(true);
  return <footer className="sticky bottom-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-amber-200 bg-white px-4 py-2.5 text-xs shadow-[0_-6px_20px_rgba(15,23,42,0.08)] dark:border-amber-900 dark:bg-zinc-900"><div className="flex flex-wrap items-center gap-4"><span className="flex items-center gap-2 font-semibold"><span className="size-2 rounded-full bg-emerald-500" />Active Shift · 08:42</span><span className="text-slate-500 dark:text-zinc-400">Cash balance <strong className="text-slate-900 dark:text-white">$1,248.00</strong></span></div><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => setOnline((value) => !value)} className={cn('flex min-h-9 items-center gap-1.5 rounded-md px-2 font-semibold', online ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300')}>{online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}{online ? 'Online · Synced' : 'Offline mode'}</button><span className="flex items-center gap-1.5"><Printer className="size-3.5" /><span className="size-2 rounded-full bg-emerald-500" />Printer ready</span><span className="flex items-center gap-1.5"><Barcode className="size-3.5" /><span className="size-2 rounded-full bg-emerald-500" />Scanner ready</span></div></footer>;
}

function PosRegister() {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([{ id: 'p1', name: 'Cloud Runner', price: 129, quantity: 1 }, { id: 'p2', name: 'Everyday Tote', price: 48, quantity: 1 }]);
  const [itemDiscount, setItemDiscount] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState(false);
  const visibleProducts = products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase()));
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const discount = (itemDiscount ? 8 : 0) + (orderDiscount ? subtotal * 0.1 : 0);
  const total = Math.max(0, subtotal - discount);
  const addProduct = (product: typeof products[number]) => setCart((current) => current.some((line) => line.id === product.id) ? current.map((line) => line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { id: product.id, name: product.name, price: product.price, quantity: 1 }]);
  const changeQuantity = (id: string, delta: number) => setCart((current) => current.map((line) => line.id === id ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line).filter((line) => line.quantity > 0));

  return <div className="flex min-h-full flex-col bg-slate-100 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 xl:h-[calc(100vh-var(--header-height))] xl:overflow-hidden"><div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_380px]">
    <section className="min-w-0 p-4 md:p-6 xl:overflow-y-auto"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">POS Workspace</p><h1 className="text-2xl font-bold">Fast Checkout</h1></div><div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">Register 01 · Flagship Store</div></div>
      <div className="relative mb-5"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus placeholder="Search products or scan barcode…" className="h-14 w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-28 text-base font-medium shadow-sm outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-zinc-700 dark:bg-zinc-900" aria-label="Search products or scan barcode" /><button type="button" className="absolute right-2 top-1/2 flex min-h-11 -translate-y-1/2 items-center gap-2 rounded-lg bg-slate-100 px-3 text-xs font-semibold hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-zinc-800 dark:hover:bg-zinc-700"><ScanLine className="size-4" />Scan</button></div>
      <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Top-selling items</h2><span className="text-xs text-slate-500">{visibleProducts.length} products</span></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visibleProducts.map((product) => <button key={product.id} type="button" onClick={() => addProduct(product)} className="group min-h-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-primary/50 hover:ring-2 hover:ring-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-800 dark:bg-zinc-900"><div className={cn('grid h-20 place-items-center rounded-lg', product.color)}><Package className="size-8" /></div><p className="mt-3 truncate text-sm font-semibold">{product.name}</p><div className="mt-1 flex items-center justify-between"><span className="text-sm font-bold text-primary">${product.price}.00</span><span className="text-[10px] text-slate-400">{product.stock} left</span></div></button>)}</div>
    </section>

    <aside className="flex min-h-[640px] flex-col border-t border-slate-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 xl:min-h-0 xl:border-l xl:border-t-0" aria-label="Current cart"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-zinc-800"><div><h2 className="text-lg font-bold">Current Cart</h2><p className="text-xs text-slate-500">Order #POS-1048</p></div><button type="button" onClick={() => setCart([])} className="grid size-11 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:hover:bg-red-950/30" aria-label="Clear cart"><Trash2 className="size-4" /></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{cart.length ? <div className="space-y-3">{cart.map((line) => <div key={line.id} className="rounded-lg border border-slate-200 p-3 dark:border-zinc-800"><div className="flex gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Package className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{line.name}</p><p className="text-xs text-slate-500">${line.price.toFixed(2)}</p></div><strong className="text-sm">${(line.price * line.quantity).toFixed(2)}</strong></div><div className="mt-3 flex items-center justify-end gap-2"><button type="button" onClick={() => changeQuantity(line.id, -1)} className="grid size-10 place-items-center rounded-md bg-slate-100 text-lg hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700" aria-label={`Decrease ${line.name}`}>−</button><span className="w-7 text-center text-sm font-bold">{line.quantity}</span><button type="button" onClick={() => changeQuantity(line.id, 1)} className="grid size-10 place-items-center rounded-md bg-slate-100 text-lg hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700" aria-label={`Increase ${line.name}`}>+</button></div></div>)}</div> : <div className="grid min-h-48 place-items-center text-center"><div><ShoppingBag className="mx-auto size-8 text-slate-300" /><p className="mt-3 text-sm font-semibold">Cart is empty</p><p className="mt-1 text-xs text-slate-500">Tap a product to add it.</p></div></div>}</div>
      <div className="space-y-3 border-t border-slate-200 p-4 dark:border-zinc-800"><label className="flex min-h-11 items-center gap-3 rounded-lg bg-slate-50 px-3 dark:bg-zinc-800"><UserPlus className="size-4 text-primary" /><input placeholder="Attach loyalty customer" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Attach loyalty customer" /><ChevronRight className="size-4 text-slate-400" /></label><div className="grid grid-cols-2 gap-2"><label className="flex min-h-12 items-center justify-between rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-zinc-700"><span className="flex items-center gap-2"><Tags className="size-4" />Item discount</span><Switch checked={itemDiscount} onCheckedChange={setItemDiscount} aria-label="Item discount" /></label><label className="flex min-h-12 items-center justify-between rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-zinc-700"><span className="flex items-center gap-2"><BadgePercent className="size-4" />Order discount</span><Switch checked={orderDiscount} onCheckedChange={setOrderDiscount} aria-label="Order discount" /></label></div><div className="space-y-2 border-t border-dashed border-slate-200 pt-3 text-sm dark:border-zinc-700"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>{discount > 0 ? <div className="flex justify-between text-emerald-600"><span>Discount</span><span>−${discount.toFixed(2)}</span></div> : null}<div className="flex items-end justify-between"><strong>Total</strong><strong className="text-2xl">${total.toFixed(2)}</strong></div></div><button type="button" disabled={!cart.length} className="flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 text-lg font-black tracking-wide text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"><CreditCard className="size-6" />PAYMENT</button></div>
    </aside>
  </div><PosStatusBar /></div>;
}

function PosOperationalView({ config }: { config: (typeof posViews)[string] }) {
  const Icon = config.icon;
  return <div className="flex min-h-full flex-col bg-slate-100 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 xl:h-[calc(100vh-var(--header-height))] xl:overflow-hidden"><div className="flex-1 overflow-y-auto p-4 md:p-8"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6 dark:border-zinc-800"><div><span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-6" /></span><h1 className="mt-4 text-2xl font-bold">{config.title}</h1><p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-zinc-400">{config.description}</p></div><Button size="lg" className="min-h-12">{config.action}</Button></div><div className="mt-6 grid gap-4 lg:grid-cols-3">{['Current status', 'Today', 'Needs action'].map((label, index) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold">{['Active', '47', '2'][index]}</p></div>)}</div><div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"><div className="border-b border-slate-200 px-5 py-4 text-sm font-semibold dark:border-zinc-800">Recent register activity</div>{['Register 01 · Sale completed', 'Receipt #1047 · Card payment', 'Register 02 · Cash drawer opened'].map((item, index) => <div key={item} className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-5 last:border-0 dark:border-zinc-800"><span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item}</p><p className="text-xs text-slate-500">{index + 2} minutes ago</p></div><ChevronRight className="size-4 text-slate-400" /></div>)}</div></div><PosStatusBar /></div>;
}

export function TouchpointWorkspace({ kind }: { kind: TouchpointWorkspaceKind }) {
  const { pathname } = useLocation();
  if (kind === 'primeweb') return pathname === '/builder/theme' ? <PrimeWebStudio /> : <PrimeWebManagementView config={builderViews[pathname] ?? builderViews['/builder/pages']} />;
  return pathname === '/pos/register' ? <PosRegister /> : <PosOperationalView config={posViews[pathname] ?? posViews['/pos/shifts']} />;
}
