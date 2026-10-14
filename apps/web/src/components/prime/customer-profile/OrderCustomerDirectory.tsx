import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/system/EmptyState';
import { ordersApi } from '@/lib/orders-api';
import { buildOrderCustomers, customerDate, customerMatchesSearch } from '@/lib/order-customers';
import { readCustomerGroups, customerGroupingKey } from '@/lib/customer-grouping-storage';
import { CustomerChannelLogos } from './CustomerChannelLogos';
import { CustomerAvatar } from './CustomerAvatar';
import { CustomerRankBadge, RankLabel } from './CustomerRankBadge';
import { CustomerRankFilter } from './CustomerRankFilter';
import { OrderCustomerDetail } from './OrderCustomerDetail';
import { customerProfileIdentity, readCustomerProfile } from '@/lib/customer-profile-details';
import { RankSettingsDrawer } from './RankSettingsDrawer';
import { customerRank, rankPosition, rankSettingsKey, readRankSettings, saveRankSettings, withDemoRankDefaults, type RankConfig, type RankState } from '@/lib/customer-ranks';

const pageSize = 15;

export function OrderCustomerDirectory({ noDataDemo = false, scope, rankScope = scope, canManageRanks = false }: { noDataDemo?: boolean; scope: string; rankScope?: string; canManageRanks?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('all');
  const [rankFilter, setRankFilter] = useState('all');
  const [rankSort, setRankSort] = useState<'none' | 'ascending' | 'descending'>('none');
  const [storedRankSettings, setRankSettings] = useState(() => readRankSettings(rankScope));
  const [applyingRanks, setApplyingRanks] = useState(false);
  const [page, setPage] = useState(0);
  const [groupingState, setGroupingState] = useState(() => readCustomerGroups(scope));
  const [notice, setNotice] = useState('');
  const [profileVersion, setProfileVersion] = useState(0);
  const listRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const query = useQuery({ queryKey: ['customers', 'order-directory', scope], queryFn: ordersApi.list, enabled: !noDataDemo, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true });
  const rankSettings = useMemo(() => withDemoRankDefaults(storedRankSettings, query.data?.data || []), [storedRankSettings, query.data]);
  useEffect(() => {
    const update = (event: StorageEvent) => { if (event.key === customerGroupingKey(scope) || event.key === null) setGroupingState(readCustomerGroups(scope)); };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, [scope]);
  const rawCustomers = useMemo(() => buildOrderCustomers(query.data?.data || [], groupingState.groups), [query.data, groupingState.groups]);
  // profileVersion invalidates browser-storage reads after a save or a cross-tab update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const customers = useMemo(() => rawCustomers.map(customer => ({ ...customer, name: readCustomerProfile(scope, customerProfileIdentity(customer, groupingState.groups)).value.displayName || customer.name })), [rawCustomers, scope, groupingState.groups, profileVersion]);
  const ranks = useMemo(() => new Map(customers.map(customer => [customer.id, customerRank(customer, rankSettings.config)])), [customers, rankSettings.config]);
  const channels = useMemo(() => [...new Set(customers.flatMap(customer => customer.channels))].sort(), [customers]);
  const matching = useMemo(() => customers.filter(customer => customerMatchesSearch(customer, search) && (channel === 'all' || customer.channels.includes(channel))), [customers, search, channel]);
  const rankCounts = useMemo(() => matching.reduce<Partial<Record<RankState, number>>>((counts, customer) => { const key = ranks.get(customer.id)!.key; counts[key] = (counts[key] || 0) + 1; return counts; }, {}), [matching, ranks]);
  const filtered = useMemo(() => {
    const matches = matching.filter(customer => rankFilter === 'all' || ranks.get(customer.id)?.key === rankFilter);
    if (rankSort !== 'none') matches.sort((a, b) => (rankPosition(ranks.get(a.id)!.key) - rankPosition(ranks.get(b.id)!.key)) * (rankSort === 'ascending' ? 1 : -1));
    return matches;
  }, [matching, rankFilter, ranks, rankSort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const selected = rawCustomers.find(customer => customer.id === params.get('customer'));
  const detailOpen = Boolean(params.get('customer'));
  useEffect(() => { if (!detailOpen && openerRef.current) { if (openerRef.current.isConnected) openerRef.current.focus(); else listRef.current?.focus(); } }, [detailOpen]);
  useEffect(() => { const update = (event: StorageEvent) => { if (!event.key || event.key.startsWith('prime.customer-profile.v1:')) setProfileVersion(value => value + 1); }; window.addEventListener('storage', update); return () => window.removeEventListener('storage', update); }, []);
  useEffect(() => {
    function update(event: StorageEvent) { if (event.key === rankSettingsKey(rankScope) || event.key === null) setRankSettings(readRankSettings(rankScope)); }
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, [rankScope]);
  function selectCustomer(id?: string, section?: string) {
    if (id) openerRef.current = document.activeElement as HTMLElement | null;
    setNotice('');
    const next = new URLSearchParams(params);
    if (id) next.set('customer', id); else next.delete('customer');
    if (section) next.set('section', section); else next.delete('section');
    next.delete('tab');
    setParams(next, { replace: !id });
  }
  function resetFilters() { setSearch(''); setChannel('all'); setRankFilter('all'); setPage(0); }
  function openCustomerRow(event: MouseEvent<HTMLTableRowElement>, id: string) {
    const target = event.target;
    // Keep channel tooltips, rank actions and their portalled content independent.
    // The existing name button remains the row's native keyboard action.
    if (event.defaultPrevented || !(target instanceof Element) || !event.currentTarget.contains(target)
      || target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"]')) return;
    selectCustomer(id);
  }
  function closeRankSettings() { const next = new URLSearchParams(params); next.delete('rank-settings'); setParams(next, { replace: true }); }
  async function applyRankSettings(config: RankConfig, revision: number) {
    if (!canManageRanks || !query.data?.canWrite) throw new Error('Only an admin with write access can change rank settings.');
    setApplyingRanks(true);
    try {
      // Yield to paint the pending state before the synchronous browser-storage write.
      await new Promise(resolve => setTimeout(resolve, 0));
      const saved = saveRankSettings(rankScope, config, revision);
      setRankSettings(saved); setRankFilter('all'); setPage(0);
      setNotice('Rank settings applied to all loaded customers. Saved in this browser only.');
    } catch (error) {
      setRankSettings(readRankSettings(rankScope));
      if (error instanceof DOMException) throw new Error('Could not save in this browser. Allow browser storage and try again. Nothing was changed.');
      throw error;
    } finally { setApplyingRanks(false); }
  }

  if (!noDataDemo && query.isPending) return <div role="status" className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading customers from orders…</div>;
  if (!noDataDemo && query.isError) return <EmptyState variant="error" title="Customers could not be loaded" description="We couldn't load the order data. Try again to see your customers." action={<Button onClick={() => void query.refetch()} disabled={query.isFetching}>{query.isFetching ? 'Retrying…' : 'Try again'}</Button>} />;
  if (noDataDemo || !customers.length) return <section aria-label="Get started with customers" data-testid="customer-accounts-empty-state"><EmptyState className="min-h-[360px] border-0 bg-transparent shadow-none sm:min-h-[420px]" icon={<UsersRound aria-hidden="true" />} title="No customers yet" description="Customers appear here automatically when orders come in. Connect a sales channel to bring in your first orders." action={<div className="flex flex-col gap-3 sm:flex-row"><Button className="min-h-11" asChild><Link to="/sales-channels/connected-channels">Connect sales channel<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link></Button><Button variant="outline" className="min-h-11" asChild><Link to="/orders">View orders</Link></Button></div>} /></section>;

  return <>
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
    {groupingState.error && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{groupingState.error}</p>}
    {rankSettings.error && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{rankSettings.error}</p>}
    {!detailOpen && <section ref={listRef} tabIndex={-1} className="overflow-hidden rounded-xl border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Customer list">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 sm:px-5">
        <div className="flex shrink-0 items-center gap-2"><h2 className="text-sm font-semibold">Customer list</h2><span aria-label={`${customers.length} customers`} className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{customers.length}</span></div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap xl:w-auto xl:flex-1">
        <div className="relative min-w-0 flex-1 sm:min-w-48"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input aria-label="Search customers" placeholder="Search name, email or phone…" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} className="h-11 pl-9" /></div>
        <select aria-label="Filter by sales channel" value={channel} onChange={event => { setChannel(event.target.value); setPage(0); }} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-44"><option value="all">All channels</option>{channels.map(name => <option key={name} value={name}>{name}</option>)}</select>
        <CustomerRankFilter value={rankFilter} counts={rankCounts} onChange={value => { setRankFilter(value); setPage(0); }} />
        <select aria-label="Sort customers" value={rankSort} onChange={event => { setRankSort(event.target.value as typeof rankSort); setPage(0); }} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-52 lg:hidden"><option value="none">Most recent order</option><option value="descending">Rank: highest first</option><option value="ascending">Rank: lowest first</option></select>
        {(search || channel !== 'all' || rankFilter !== 'all') && <Button variant="ghost" onClick={resetFilters} className="h-11">Clear filters</Button>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching} className="ml-auto h-11 gap-2"><RefreshCw aria-hidden="true" className={`size-3.5 ${query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} />{query.isFetching ? 'Refreshing…' : 'Refresh'}</Button>
      </div>
      {!rankSettings.config?.enabled && !rankSettings.error && <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-5 py-3 text-xs text-muted-foreground"><p>Ranks are not configured. Set spending thresholds to start ranking customers.</p><Button variant="link" size="sm" className="min-h-11 p-0" onClick={() => { const next = new URLSearchParams(params); next.set('rank-settings', '1'); setParams(next, { replace: true }); }}>{canManageRanks ? 'Set up ranks' : 'View rank settings'}<ArrowRight className="ml-1 size-3.5" aria-hidden="true" /></Button></div>}
      {!filtered.length ? <EmptyState variant="filtered" className="border-0 shadow-none" icon={<Search aria-hidden="true" />} title="No matching customers" description="Try another name, email or phone, or clear your filters." action={<Button variant="outline" onClick={resetFilters}>Reset filters</Button>} /> : <>
        <div className="hidden lg:block"><table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">Customers from orders, {rankSort === 'none' ? 'most recent order first' : `rank ${rankSort}`}. Ranks include all channels.</caption>
          <thead className="border-b bg-muted/35 text-xs font-medium text-muted-foreground"><tr><th className="w-[25%] px-5 py-3 font-medium" scope="col">Customer</th><th className="w-[16%] px-4 py-3 font-medium" scope="col">Phone</th><th className="w-[17%] px-4 py-3 font-medium" scope="col">Channels</th><th className="w-[9%] px-4 py-3 text-right font-medium" scope="col">Orders</th><th className="w-[18%] px-4 py-1 font-medium" scope="col" aria-sort={rankSort}><button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { setRankSort(current => current === 'none' ? 'descending' : current === 'descending' ? 'ascending' : 'none'); setPage(0); }} aria-label="Sort by rank">Rank{rankSort === 'none' ? <ArrowUpDown className="size-3.5" aria-hidden="true" /> : rankSort === 'descending' ? <ArrowDown className="size-3.5" aria-hidden="true" /> : <ArrowUp className="size-3.5" aria-hidden="true" />}</button></th><th className="px-5 py-3 text-right font-medium" scope="col">Last order</th></tr></thead>
          <tbody className="divide-y">{visible.map(customer => <tr key={customer.id} onClick={event => openCustomerRow(event, customer.id)} className="group cursor-pointer transition-colors hover:bg-muted/30 focus-within:bg-muted/30 motion-reduce:transition-none">
            <td className="px-5 py-4"><button type="button" onClick={() => selectCustomer(customer.id)} aria-label={`View customer ${customer.name}`} className="flex min-h-11 w-full items-center gap-3 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CustomerAvatar name={customer.name} /><span className="min-w-0"><span className="block truncate font-medium group-hover:text-primary">{customer.name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{customer.email || 'Email not provided'}</span></span></button></td>
            <td className="break-words px-4 py-4 text-muted-foreground">{customer.phone || 'Not provided'}</td><td className="px-4 py-4"><CustomerChannelLogos orders={customer.orders} /></td><td className="px-4 py-4 text-right tabular-nums">{customer.orders.length}</td><td className="px-4 py-4" aria-busy={applyingRanks}>{applyingRanks ? <span role="status" className="text-xs text-muted-foreground">Updating…</span> : <CustomerRankBadge rank={ranks.get(customer.id)!} name={customer.name} onClick={() => selectCustomer(customer.id, 'rank')} />}</td><td className="px-5 py-4 text-right text-muted-foreground">{customerDate(customer.lastOrderAt)}</td>
          </tr>)}</tbody>
        </table></div>
        <div className="divide-y lg:hidden">{visible.map(customer => <button key={customer.id} type="button" onClick={() => selectCustomer(customer.id)} aria-label={`View customer ${customer.name}`} className="block w-full space-y-4 p-4 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <span className="flex items-center gap-3"><CustomerAvatar name={customer.name} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{customer.name}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{customer.email || customer.phone || 'Contact not provided'}</span></span><ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /></span>
          <span className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{customer.orders.length} {customer.orders.length === 1 ? 'order' : 'orders'}<span className="ml-2 text-xs text-muted-foreground">· {customerDate(customer.lastOrderAt)}</span></span><RankLabel rank={ranks.get(customer.id)!.key} /></span>
        </button>)}</div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground sm:px-5"><p role="status">{currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, filtered.length)} of {filtered.length} customers{channel !== 'all' ? ' · Totals across all channels' : ''}</p>{pageCount > 1 && <div className="flex items-center gap-2"><Button variant="outline" size="icon" className="size-10" aria-label="Previous customers" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="size-4" /></Button><span>{currentPage + 1} / {pageCount}</span><Button variant="outline" size="icon" className="size-10" aria-label="Next customers" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight className="size-4" /></Button></div>}</div>
      </>}
    </section>}
    {params.get('rank-settings') === '1' && <RankSettingsDrawer settings={rankSettings} customers={customers} canManage={canManageRanks && Boolean(query.data?.canWrite)} onClose={closeRankSettings} onSave={applyRankSettings} />}
    {detailOpen && (selected ? <OrderCustomerDetail key={customerProfileIdentity(selected, groupingState.groups)} customer={selected} rank={ranks.get(selected.id)!} scope={scope} identity={customerProfileIdentity(selected, groupingState.groups)} canWrite={Boolean(query.data?.canWrite)} onBack={() => selectCustomer()} onSaved={() => setProfileVersion(value => value + 1)} onRankSettings={() => { const next = new URLSearchParams(params); next.set('rank-settings', '1'); setParams(next, { replace: true }); }} /> : <EmptyState title="Customer unavailable" description="This profile is not in the loaded orders. It may have been separated or removed." action={<Button variant="outline" onClick={() => selectCustomer()}>Back to customers</Button>} />)}

  </>;
}
