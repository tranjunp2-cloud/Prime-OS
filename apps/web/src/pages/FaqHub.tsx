import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  CircleHelp,
  FileText,
  Globe2,
  MessageCircle,
  Search,
  Settings2,
  ShoppingBag,
  Store,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  faqArticles,
  faqCategories,
  faqWorkspaceLabels,
  type FaqCategoryId,
  type FaqWorkspace,
} from '@/lib/faq-data';

type WorkspaceFilter = 'all' | FaqWorkspace;

const workspaceTabs: Array<{ id: WorkspaceFilter; label: string; icon?: LucideIcon }> = [
  { id: 'all', label: 'All' },
  { id: 'main', label: 'Main Back-office', icon: Boxes },
  { id: 'pos', label: 'POS', icon: Store },
  { id: 'primeweb', label: 'PrimeWeb', icon: Globe2 },
  { id: 'inbox', label: 'Prime Inbox', icon: MessageCircle },
];

const categoryIcons: Record<FaqCategoryId, LucideIcon> = {
  'getting-started': CircleHelp,
  'catalog-channels': Boxes,
  'orders-fulfillment': ShoppingBag,
  'pos-hardware': Wrench,
  storefront: Globe2,
  'customers-inbox': MessageCircle,
  'account-settings': Settings2,
};

function isWorkspace(value: string | null): value is FaqWorkspace {
  return value === 'main' || value === 'pos' || value === 'primeweb' || value === 'inbox';
}

export default function FaqHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const explicitFilter = searchParams.get('workspace');
  const contextWorkspace = searchParams.get('from_workspace');
  const activeWorkspace: WorkspaceFilter = explicitFilter === 'all'
    ? 'all'
    : isWorkspace(explicitFilter)
      ? explicitFilter
      : isWorkspace(contextWorkspace)
        ? contextWorkspace
        : 'all';
  const normalizedQuery = query.trim().toLowerCase();

  const visibleArticles = useMemo(() => faqArticles.filter((article) => {
    const matchesWorkspace = activeWorkspace === 'all' || article.workspaces.includes(activeWorkspace);
    const searchable = `${article.title} ${article.summary} ${article.tags.join(' ')}`.toLowerCase();
    return matchesWorkspace && (!normalizedQuery || searchable.includes(normalizedQuery));
  }), [activeWorkspace, normalizedQuery]);

  const topIssues = visibleArticles.filter((article) => article.is_top_issue).slice(0, 4);
  const articleContext = activeWorkspace !== 'all' ? activeWorkspace : isWorkspace(contextWorkspace) ? contextWorkspace : null;
  const articleHref = (slug: string) => `/faq/${slug}${articleContext ? `?from_workspace=${articleContext}` : ''}`;

  const selectWorkspace = (workspace: WorkspaceFilter) => {
    const next = new URLSearchParams(searchParams);
    next.set('workspace', workspace);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-full bg-slate-50/60 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 py-10 md:px-8 md:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <CircleHelp className="size-3.5" aria-hidden="true" /> Prime OS Help Center
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">How can we help?</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Find step-by-step guidance for commerce operations, storefronts, POS, and customer conversations.
            </p>
            <div className="mt-7">
              <label className="relative block min-w-0">
                <span className="sr-only">Search the Prime OS Help Center</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search setup, orders, products, POS, or Inbox..."
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1500px] px-4 py-7 md:px-8 md:py-9">
        {isWorkspace(contextWorkspace) && (!explicitFilter || activeWorkspace === contextWorkspace) ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50/70 px-4 py-3">
            <p className="text-sm text-indigo-900">
              Showing help relevant to <span className="font-semibold">{faqWorkspaceLabels[contextWorkspace]}</span> based on where you came from.
            </p>
            <button type="button" onClick={() => selectWorkspace('all')} className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
              View all workspaces
            </button>
          </div>
        ) : null}

        <nav aria-label="Filter help by workspace" className="scrollbar-none mb-8 flex gap-1 overflow-x-auto border-b border-slate-200">
          {workspaceTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeWorkspace === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectWorkspace(tab.id)}
                className={cn(
                  'relative flex min-h-11 shrink-0 items-center gap-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset',
                  active ? 'text-indigo-700 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-indigo-600' : 'text-slate-500 hover:text-slate-900',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}{tab.label}
              </button>
            );
          })}
        </nav>

        {normalizedQuery ? (
          <section className="mb-10" aria-labelledby="search-results-title">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Search results</p>
                <h2 id="search-results-title" className="mt-1 text-xl font-bold">{visibleArticles.length} result{visibleArticles.length === 1 ? '' : 's'} for “{query.trim()}”</h2>
              </div>
            </div>
            {visibleArticles.length ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {visibleArticles.map((article) => (
                  <Link key={article.slug} to={articleHref(article.slug)} className="group flex min-h-20 items-center gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0 hover:bg-slate-50 md:px-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><FileText className="size-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900 group-hover:text-indigo-700">{article.title}</span><span className="mt-1 block text-sm text-slate-500">{article.summary}</span></span>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><p className="font-semibold">No matching articles</p><p className="mt-1 text-sm text-slate-500">Try a shorter keyword or switch to All workspaces.</p></div>
            )}
          </section>
        ) : (
          <>
            <section className="mb-10" aria-labelledby="top-issues-title">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Troubleshooting</p>
                <h2 id="top-issues-title" className="mt-1 text-xl font-bold">Top issues right now</h2>
                <p className="mt-1 text-sm text-slate-500">Fast paths for the problems operators resolve most often.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {topIssues.map((article) => (
                  <Link key={article.slug} to={articleHref(article.slug)} className="group flex min-h-44 flex-col rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                    <span className="mb-4 grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700"><Wrench className="size-4" aria-hidden="true" /></span>
                    <span className="font-semibold leading-5 text-slate-900 group-hover:text-indigo-700">{article.title}</span>
                    <span className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{article.summary}</span>
                    <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-semibold text-indigo-700">Fix this issue <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                  </Link>
                ))}
              </div>
            </section>

            <section aria-labelledby="categories-title">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Browse by topic</p>
                <h2 id="categories-title" className="mt-1 text-xl font-bold">Help categories</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {faqCategories.map((category) => {
                  const articles = visibleArticles.filter((article) => article.category === category.id);
                  const Icon = categoryIcons[category.id];
                  if (!articles.length) return null;
                  return (
                    <article key={category.id} className="rounded-xl border border-slate-200 bg-white p-5">
                      <div className="mb-4 flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><Icon className="size-5" aria-hidden="true" /></span>
                        <div><h3 className="font-bold text-slate-900">{category.name}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{category.description}</p></div>
                      </div>
                      <div className="border-t border-slate-100 pt-2">
                        {articles.slice(0, 4).map((article) => (
                          <Link key={article.slug} to={articleHref(article.slug)} className="group flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-700">
                            <span>{article.title}</span><ChevronRight className="size-3.5 shrink-0 text-slate-400 group-hover:text-indigo-600" />
                          </Link>
                        ))}
                      </div>
                      <p className="mt-2 px-2 text-xs font-medium text-slate-400">{articles.length} article{articles.length === 1 ? '' : 's'}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
