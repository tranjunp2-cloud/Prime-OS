import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Layers3, Store } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const contexts = {
  main: [
    { id: 'operations', name: 'Operations', detail: 'All business operations' },
    { id: 'commerce', name: 'Commerce', detail: 'Catalog, orders, and channels' },
    { id: 'growth', name: 'Growth', detail: 'Customers and campaigns' },
  ],
  primeweb: [
    { id: 'main-store', name: 'Main Store', detail: 'Primary online storefront' },
    { id: 'outlet-store', name: 'Outlet Store', detail: 'Outlet storefront project' },
  ],
  pos: [
    { id: 'flagship-store', name: 'Flagship Store', detail: 'District 1 register group' },
    { id: 'warehouse-store', name: 'Warehouse Store', detail: 'Warehouse register group' },
  ],
};

export function ContextSelector() {
  const location = useLocation();
  const navigate = useNavigate();
  const workspace = location.pathname.startsWith('/builder') ? 'primeweb' : location.pathname.startsWith('/pos') ? 'pos' : 'main';
  const items = contexts[workspace];
  const params = new URLSearchParams(location.search);
  const active = items.find((item) => item.id === params.get('scope')) ?? items[0];
  const selectContext = (id: string) => {
    if (id === active.id) return;
    const next = new URLSearchParams(location.search);
    next.set('scope', id);
    window.dispatchEvent(new CustomEvent('workspace:switch-start', { detail: { contextId: id } }));
    navigate({ pathname: location.pathname, search: `?${next.toString()}` }, { replace: true });
  };

  return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="group flex h-11 min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-left shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800" aria-label={`Change context. Current context: ${active.name}`}><span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">{workspace === 'main' ? <Layers3 className="size-3.5" /> : <Store className="size-3.5" />}</span><span className="hidden min-w-0 sm:block"><span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{workspace === 'main' ? 'Project' : 'Store'}</span><span className="block max-w-28 truncate text-[13px] font-semibold">{active.name}</span></span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" /></button></DropdownMenuTrigger><DropdownMenuContent align="start" sideOffset={8} className="w-64 p-1.5"><DropdownMenuLabel className="px-2.5 py-2 text-xs">Select {workspace === 'main' ? 'project context' : 'store context'}</DropdownMenuLabel><DropdownMenuSeparator />{items.map((item) => <DropdownMenuItem key={item.id} onSelect={() => selectContext(item.id)} className={cn('min-h-12 rounded-md px-2.5', item.id === active.id && 'bg-primary/5')}><span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">{item.name}</span><span className="block text-xs text-muted-foreground">{item.detail}</span></span>{item.id === active.id ? <Check className="size-4 text-primary" /> : null}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
