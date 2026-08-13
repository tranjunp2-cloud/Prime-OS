import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  Clock3,
  FileText,
  Search,
  ShoppingBag,
  Store,
  UsersRound,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { cn } from '@/lib/utils';

type DocCategory = 'Getting Started' | 'Catalog' | 'Orders' | 'Warehouse' | 'Channels' | 'CRM';

type DocArticle = {
  id: string;
  title: string;
  summary: string;
  category: DocCategory;
  readTime: number;
  updated: string;
  popular?: boolean;
  helpSlug?: string;
  sections: Array<{ heading: string; body: string; steps?: string[] }>;
};

const articles: DocArticle[] = [
  { id: 'omnichannel-setup', title: 'Set up your omnichannel workspace', summary: 'Connect stores, map warehouses, and prepare order synchronization.', category: 'Getting Started', readTime: 7, updated: 'Aug 12, 2026', popular: true, sections: [{ heading: 'Before you begin', body: 'Confirm your business profile, default currency, timezone, and administrator access.' }, { heading: 'Recommended setup order', body: 'Complete the foundation before enabling live order sync.', steps: ['Create physical warehouses', 'Connect sales channels', 'Map channel locations', 'Import the master catalog', 'Enable inventory and order sync'] }] },
  { id: 'master-product', title: 'Create and publish a master product', summary: 'Build one product record and publish channel-specific listings safely.', category: 'Catalog', readTime: 6, updated: 'Aug 13, 2026', popular: true, helpSlug: 'create-your-first-master-product', sections: [{ heading: 'Master product ownership', body: 'Product Master stores the shared title, SKU structure, media, pricing baseline, and variants.' }, { heading: 'Publish to channels', body: 'Use the channel matrix to review missing requirements before publishing.', steps: ['Create the master product', 'Add variants and media', 'Select target channels', 'Resolve validation warnings', 'Publish and monitor sync status'] }] },
  { id: 'order-lifecycle', title: 'Understand the order lifecycle', summary: 'Follow orders from capture through allocation, shipment, and completion.', category: 'Orders', readTime: 5, updated: 'Aug 11, 2026', popular: true, helpSlug: 'understand-order-sync-statuses', sections: [{ heading: 'Lifecycle stages', body: 'Orders move through confirmation, warehouse allocation, reservation, fulfillment, and delivery.' }, { heading: 'Operational exceptions', body: 'Payment, stock allocation, and channel synchronization failures appear in dedicated work queues.' }] },
  { id: 'warehouse-mapping', title: 'Map channel locations to physical warehouses', summary: 'Control where marketplace orders reserve stock and dispatch.', category: 'Warehouse', readTime: 4, updated: 'Aug 13, 2026', helpSlug: 'reroute-an-order-to-another-warehouse', sections: [{ heading: 'Why mapping matters', body: 'Each channel dispatch location must resolve to a physical inventory node before Prime OS can allocate stock.' }, { heading: 'Routing priority', body: 'Primary, backup, and regional priority determine the fallback sequence when ATP is insufficient.' }] },
  { id: 'stock-levels', title: 'Read On Hand, Reserved, Safety Stock, and ATP', summary: 'Understand sellable and non-sellable inventory states.', category: 'Warehouse', readTime: 5, updated: 'Aug 13, 2026', popular: true, sections: [{ heading: 'Available to Promise', body: 'ATP is the quantity available for new orders.', steps: ['Start with On Hand', 'Subtract Reserved units', 'Subtract Safety Stock', 'Exclude Damaged or Quarantined units'] }, { heading: 'Inventory movements', body: 'In Transit stock becomes On Hand only after receipt is confirmed at the destination warehouse.' }] },
  { id: 'connect-store', title: 'Connect a marketplace store', summary: 'Authorize a store and configure price, stock, and order sync.', category: 'Channels', readTime: 6, updated: 'Aug 10, 2026', helpSlug: 'connect-a-marketplace-channel', sections: [{ heading: 'Connection flow', body: 'Authorize the marketplace account, select a physical warehouse, and enable only the services you are ready to operate.' }, { heading: 'Expired connections', body: 'Reconnect expired credentials before retrying failed sync jobs.' }] },
  { id: 'customer-profile', title: 'Use the unified customer profile', summary: 'Review identities, order history, tags, and service activity.', category: 'CRM', readTime: 5, updated: 'Aug 9, 2026', helpSlug: 'manage-customer-tags-and-segments', sections: [{ heading: 'Unified identity', body: 'Prime OS aggregates customer identities from Web, POS, marketplaces, and Inbox.' }, { heading: 'Segments and tags', body: 'Use tags for operator context and rules for repeatable customer segments.' }] },
  { id: 'stock-transfer', title: 'Create and receive a stock transfer', summary: 'Move units between physical warehouses with an auditable lifecycle.', category: 'Warehouse', readTime: 6, updated: 'Aug 13, 2026', sections: [{ heading: 'Transfer lifecycle', body: 'A transfer progresses from draft to awaiting dispatch, in transit, and received.' }, { heading: 'Receiving', body: 'Confirm the received quantity at the destination. Record damaged or missing units as exceptions.' }] },
];

const categoryMeta: Record<DocCategory, { icon: typeof BookOpen; description: string }> = {
  'Getting Started': { icon: CheckCircle2, description: 'Workspace setup and onboarding' },
  Catalog: { icon: Boxes, description: 'Products, variants, and publishing' },
  Orders: { icon: ShoppingBag, description: 'Order lifecycle and fulfillment' },
  Warehouse: { icon: Warehouse, description: 'Mapping, stock, and transfers' },
  Channels: { icon: Store, description: 'Connections and synchronization' },
  CRM: { icon: UsersRound, description: 'Customers, tags, and segments' },
};

const categories = Object.keys(categoryMeta) as DocCategory[];

export default function Docs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | DocCategory>('All');
  const articleId = searchParams.get('article');
  const [selected, setSelected] = useState<DocArticle | null>(() => articles.find((article) => article.id === articleId) ?? null);
  const filtered = useMemo(() => articles.filter((article) => {
    const matchesCategory = category === 'All' || article.category === category;
    const text = `${article.title} ${article.summary} ${article.category}`.toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase());
  }), [category, query]);

  useEffect(() => {
    setSelected(articles.find((article) => article.id === articleId) ?? null);
  }, [articleId]);

  const openArticle = (article: DocArticle) => {
    const next = new URLSearchParams(searchParams);
    next.set('article', article.id);
    setSearchParams(next, { replace: true });
  };

  const closeArticle = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('article');
    setSearchParams(next, { replace: true });
  };

  return <div className="space-y-6 p-4 pb-20 md:p-6">
    <WorkspacePageHeader title="Product Documentation" description="Learn Prime OS concepts, workflows, configuration, and operating standards." icon={BookOpen} />

    <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-5 md:p-7">
      <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Product documentation</p><h2 className="mt-2 text-2xl font-bold text-slate-900">Learn how Prime OS works</h2><p className="mt-2 text-sm text-slate-600">Explore concepts, end-to-end workflows, and configuration guides.</p><div className="relative mt-5"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search concepts, workflows, or configuration..." aria-label="Search documentation" className="h-12 bg-white pl-12 text-base shadow-sm" /></div></div>
    </section>

    <section><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Browse by category</h2><p className="mt-1 text-sm text-slate-500">Choose an operating domain to narrow the documentation.</p></div><span className="text-xs font-medium tabular-nums text-slate-500">{articles.length} articles</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{categories.map((item) => { const Icon = categoryMeta[item].icon; const count = articles.filter((article) => article.category === item).length; const active = category === item; return <button key={item} type="button" onClick={() => setCategory(active ? 'All' : item)} aria-pressed={active} className={cn('flex min-h-24 items-center gap-3 rounded-xl border bg-white p-4 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500', active ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-100' : 'border-slate-200')}><span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', active ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700')}><Icon className="size-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{item}</span><span className="mt-1 block text-xs text-slate-500">{categoryMeta[item].description}</span><span className="mt-1 block text-xs font-medium text-indigo-700">{count} article{count === 1 ? '' : 's'}</span></span></button>; })}</div></section>

    <section><div className="flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">{category === 'All' ? 'Recommended articles' : category}</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} result{filtered.length === 1 ? '' : 's'} matching the current view.</p></div>{category !== 'All' && <Button variant="ghost" size="sm" onClick={() => setCategory('All')}>Clear category</Button>}</div><div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="divide-y divide-slate-100">{filtered.map((article) => <button key={article.id} type="button" onClick={() => openArticle(article)} className="flex min-h-24 w-full items-center gap-4 p-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><FileText className="size-5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-900">{article.title}</span>{article.popular && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">Popular</span>}</span><span className="mt-1 block text-sm text-slate-500">{article.summary}</span><span className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400"><span>{article.category}</span><span className="inline-flex items-center gap-1"><Clock3 className="size-3" />{article.readTime} min read</span><span>Updated {article.updated}</span></span></span><ArrowRight className="size-4 shrink-0 text-slate-400" /></button>)}{filtered.length === 0 && <div className="grid min-h-48 place-items-center p-6 text-center"><div><Search className="mx-auto size-6 text-slate-400" /><p className="mt-3 text-sm font-semibold text-slate-900">No documentation found</p><p className="mt-1 text-xs text-slate-500">Try a different keyword or clear the category filter.</p></div></div>}</div></div></section>

    <ArticleDrawer article={selected} onClose={closeArticle} />
  </div>;
}

function ArticleDrawer({ article, onClose }: { article: DocArticle | null; onClose: () => void }) {
  return <Sheet open={Boolean(article)} onOpenChange={(open) => !open && onClose()}><SheetContent className="w-full overflow-y-auto p-0 sm:max-w-2xl">{article && <><SheetHeader className="border-b border-slate-200 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">{article.category}</p><SheetTitle className="text-left text-xl">{article.title}</SheetTitle><SheetDescription className="text-left">{article.summary}</SheetDescription><div className="flex gap-3 pt-1 text-xs text-slate-500"><span>{article.readTime} min read</span><span>Updated {article.updated}</span></div></SheetHeader><article className="space-y-7 p-5">{article.sections.map((section) => <section key={section.heading}><h2 className="text-base font-semibold text-slate-900">{section.heading}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{section.body}</p>{section.steps && <ol className="mt-3 space-y-2">{section.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm text-slate-700"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{index + 1}</span><span className="pt-0.5">{step}</span></li>)}</ol>}</section>)}{article.helpSlug ? <aside className="rounded-xl border border-amber-200 bg-amber-50/70 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Having trouble?</p><p className="mt-1 text-sm text-slate-600">Open the matching troubleshooting article for symptoms, recovery steps, and escalation options.</p><Button asChild variant="outline" className="mt-3 bg-white"><Link to={`/faq/${article.helpSlug}?from_workspace=main`}>View troubleshooting<ArrowRight className="size-4" /></Link></Button></aside> : null}</article></>}</SheetContent></Sheet>;
}
