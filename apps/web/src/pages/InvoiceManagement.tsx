import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Ban,
  CalendarRange,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  MoreHorizontal,
  Printer,
  ReceiptText,
  Search,
  Send,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { cn } from '@/lib/utils';

type InvoiceStatus = 'Draft' | 'Issued' | 'Pending' | 'Error' | 'Cancelled';
type InvoiceChannel = 'WebStore' | 'POS' | 'Social Inbox';

type InvoiceItem = {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vat: number;
  total: number;
};

type SyncLog = {
  at: string;
  provider: 'MISA' | 'VNPT';
  event: string;
  detail: string;
  result: 'Success' | 'Error' | 'Pending';
};

type Invoice = {
  id: string;
  orderRef: string;
  customer: string;
  companyName: string;
  taxCode: string;
  billingAddress: string;
  channel: InvoiceChannel;
  total: number;
  status: InvoiceStatus;
  invoiceDate: string;
  lookupCode?: string;
  issuanceDate?: string;
  provider: 'MISA' | 'VNPT';
  items: InvoiceItem[];
  logs: SyncLog[];
};

const initialInvoices: Invoice[] = [
  {
    id: 'INV-2026-0813-001', orderRef: 'ORD-10492', customer: 'Nguyen Minh Anh', companyName: 'An Phat Retail JSC', taxCode: '0314587291', billingAddress: '28 Nguyen Hue, District 1, Ho Chi Minh City', channel: 'WebStore', total: 12650000, status: 'Issued', invoiceDate: '2026-08-13', lookupCode: 'C1-26-8F2A-9B71', issuanceDate: '2026-08-13 09:42', provider: 'MISA',
    items: [
      { sku: 'SKU-SKIN-104', name: 'Premium Skincare Set', quantity: 2, unitPrice: 4500000, vat: 10, total: 9900000 },
      { sku: 'SKU-SERUM-021', name: 'Vitamin C Serum', quantity: 2, unitPrice: 1250000, vat: 10, total: 2750000 },
    ],
    logs: [
      { at: '13 Aug 2026 · 09:42:18', provider: 'MISA', event: 'Invoice issued', detail: 'Tax authority lookup code received successfully.', result: 'Success' },
      { at: '13 Aug 2026 · 09:41:54', provider: 'MISA', event: 'POST /einvoices', detail: 'Payload accepted. Request ID misa_req_82f191.', result: 'Success' },
    ],
  },
  {
    id: 'INV-2026-0813-002', orderRef: 'POS-TB-8821', customer: 'Tran Bao Chau', companyName: 'Bao Chau Trading', taxCode: '0319021846', billingAddress: '112 Cong Hoa, Tan Binh District, Ho Chi Minh City', channel: 'POS', total: 2340000, status: 'Pending', invoiceDate: '2026-08-13', provider: 'VNPT',
    items: [{ sku: 'SKU-POS-441', name: 'Retail Essentials Bundle', quantity: 2, unitPrice: 1063636, vat: 10, total: 2340000 }],
    logs: [
      { at: '13 Aug 2026 · 10:05:31', provider: 'VNPT', event: 'Queued for issuance', detail: 'Waiting for provider acknowledgement.', result: 'Pending' },
      { at: '13 Aug 2026 · 10:05:12', provider: 'VNPT', event: 'POST /publish', detail: 'Request accepted into processing queue.', result: 'Success' },
    ],
  },
  {
    id: 'INV-2026-0812-018', orderRef: 'SOC-48290', customer: 'Le Hoang Nam', companyName: 'Nam Viet Distribution Co., Ltd.', taxCode: '0107726384', billingAddress: '46 Duy Tan, Cau Giay District, Hanoi', channel: 'Social Inbox', total: 8920000, status: 'Error', invoiceDate: '2026-08-12', provider: 'MISA',
    items: [{ sku: 'SKU-WHOLE-220', name: 'Wholesale Product Case', quantity: 8, unitPrice: 1013636, vat: 10, total: 8920000 }],
    logs: [
      { at: '12 Aug 2026 · 16:22:09', provider: 'MISA', event: 'Issuance failed', detail: 'HTTP 422 · Buyer tax code did not match the registered company name.', result: 'Error' },
      { at: '12 Aug 2026 · 16:21:57', provider: 'MISA', event: 'POST /einvoices', detail: 'Request ID misa_req_33b09e.', result: 'Success' },
    ],
  },
  {
    id: 'INV-2026-0812-017', orderRef: 'ORD-10461', customer: 'Pham Thuy Linh', companyName: 'Linh Beauty Studio', taxCode: '0316641085', billingAddress: '19 Vo Van Tan, District 3, Ho Chi Minh City', channel: 'WebStore', total: 4785000, status: 'Draft', invoiceDate: '2026-08-12', provider: 'VNPT',
    items: [{ sku: 'SKU-BEAUTY-078', name: 'Professional Beauty Kit', quantity: 3, unitPrice: 1450000, vat: 10, total: 4785000 }],
    logs: [{ at: '12 Aug 2026 · 14:08:40', provider: 'VNPT', event: 'Draft created', detail: 'Waiting for review before issuance.', result: 'Pending' }],
  },
  {
    id: 'INV-2026-0811-034', orderRef: 'POS-D1-7248', customer: 'Do Quang Huy', companyName: 'Huy Nguyen Services', taxCode: '0311742390', billingAddress: '84 Nguyen Trai, District 5, Ho Chi Minh City', channel: 'POS', total: 1650000, status: 'Cancelled', invoiceDate: '2026-08-11', lookupCode: 'C1-26-11A0-4D62', issuanceDate: '2026-08-11 18:12', provider: 'VNPT',
    items: [{ sku: 'SKU-ACC-035', name: 'Store Accessories Pack', quantity: 3, unitPrice: 500000, vat: 10, total: 1650000 }],
    logs: [
      { at: '11 Aug 2026 · 18:45:10', provider: 'VNPT', event: 'Invoice cancelled', detail: 'Cancellation accepted by tax authority.', result: 'Success' },
      { at: '11 Aug 2026 · 18:12:42', provider: 'VNPT', event: 'Invoice issued', detail: 'Original invoice issued successfully.', result: 'Success' },
    ],
  },
  {
    id: 'INV-2026-0810-026', orderRef: 'ORD-10398', customer: 'Vo Thanh Mai', companyName: 'Mai Lifestyle Company', taxCode: '0315504278', billingAddress: '8 Le Loi, Hai Chau District, Da Nang', channel: 'WebStore', total: 18450000, status: 'Issued', invoiceDate: '2026-08-10', lookupCode: 'C1-26-72D4-014C', issuanceDate: '2026-08-10 11:26', provider: 'MISA',
    items: [
      { sku: 'SKU-HOME-321', name: 'Lifestyle Collection', quantity: 5, unitPrice: 3000000, vat: 10, total: 16500000 },
      { sku: 'SKU-SHIP-001', name: 'Premium Delivery Service', quantity: 1, unitPrice: 1950000, vat: 0, total: 1950000 },
    ],
    logs: [{ at: '10 Aug 2026 · 11:26:03', provider: 'MISA', event: 'Invoice issued', detail: 'Tax authority lookup code received successfully.', result: 'Success' }],
  },
];

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

const statusClass: Record<InvoiceStatus, string> = {
  Draft: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  Issued: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300',
  Pending: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
  Error: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};

const channelClass: Record<InvoiceChannel, string> = {
  WebStore: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300',
  POS: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
  'Social Inbox': 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300',
};

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant="outline" className={cn('font-semibold', statusClass[status])}>{status}</Badge>;
}

function InvoiceChannelBadge({ channel }: { channel: InvoiceChannel }) {
  return <Badge variant="outline" className={cn('font-medium', channelClass[channel])}>{channel}</Badge>;
}

export default function InvoiceManagement() {
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<'all' | InvoiceChannel>('all');
  const [status, setStatus] = useState<'all' | InvoiceStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    const invoiceId = searchParams.get('invoice_id');
    const sourceId = searchParams.get('source_id');
    const match = invoices.find((invoice) => invoice.id === invoiceId || invoice.orderRef === sourceId);
    if (!match) return;
    setSearch(invoiceId || sourceId || '');
    setActiveInvoiceId(match.id);
  }, [invoices, searchParams]);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch = !query || `${invoice.id} ${invoice.orderRef} ${invoice.customer} ${invoice.companyName} ${invoice.taxCode}`.toLowerCase().includes(query);
      const matchesChannel = channel === 'all' || invoice.channel === channel;
      const matchesStatus = status === 'all' || invoice.status === status;
      const matchesFrom = !dateFrom || invoice.invoiceDate >= dateFrom;
      const matchesTo = !dateTo || invoice.invoiceDate <= dateTo;
      return matchesSearch && matchesChannel && matchesStatus && matchesFrom && matchesTo;
    });
  }, [channel, dateFrom, dateTo, invoices, search, status]);

  const activeInvoice = invoices.find((invoice) => invoice.id === activeInvoiceId) ?? null;
  const selectedEligibleCount = invoices.filter((invoice) => selectedIds.has(invoice.id) && !['Issued', 'Cancelled'].includes(invoice.status)).length;
  const visibleSelectedCount = filteredInvoices.filter((invoice) => selectedIds.has(invoice.id)).length;
  const allVisibleSelected = filteredInvoices.length > 0 && visibleSelectedCount === filteredInvoices.length;

  const summary = useMemo(() => ({
    total: invoices.filter((invoice) => invoice.status !== 'Cancelled').reduce((sum, invoice) => sum + invoice.total, 0),
    issued: invoices.filter((invoice) => invoice.status === 'Issued').length,
    pending: invoices.filter((invoice) => invoice.status === 'Pending').length,
    errors: invoices.filter((invoice) => invoice.status === 'Error').length,
  }), [invoices]);

  const toggleVisibleSelection = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      filteredInvoices.forEach((invoice) => checked ? next.add(invoice.id) : next.delete(invoice.id));
      return next;
    });
  };

  const updateStatus = (invoiceId: string, nextStatus: InvoiceStatus) => {
    setInvoices((current) => current.map((invoice) => invoice.id === invoiceId ? {
      ...invoice,
      status: nextStatus,
      issuanceDate: nextStatus === 'Issued' ? '2026-08-13 11:58' : invoice.issuanceDate,
      lookupCode: nextStatus === 'Issued' ? invoice.lookupCode ?? 'C1-26-NEW-ISSUED' : invoice.lookupCode,
    } : invoice));
  };

  const issueInvoice = (invoiceId: string) => {
    updateStatus(invoiceId, 'Issued');
    toast.success(`${invoiceId} issued successfully`);
  };

  const cancelInvoice = (invoiceId: string) => {
    if (!window.confirm(`Cancel ${invoiceId}? This action will be recorded in the e-invoice audit log.`)) return;
    updateStatus(invoiceId, 'Cancelled');
    toast.success(`${invoiceId} cancelled`);
  };

  const bulkIssue = () => {
    if (!selectedEligibleCount) {
      toast.info('Select at least one draft, pending, or error invoice');
      return;
    }
    setInvoices((current) => current.map((invoice) => selectedIds.has(invoice.id) && !['Issued', 'Cancelled'].includes(invoice.status) ? {
      ...invoice,
      status: 'Issued',
      issuanceDate: '2026-08-13 11:58',
      lookupCode: invoice.lookupCode ?? `C1-26-BULK-${invoice.id.slice(-3)}`,
    } : invoice));
    toast.success(`${selectedEligibleCount} e-invoice${selectedEligibleCount > 1 ? 's' : ''} issued`);
    setSelectedIds(new Set());
  };

  const createManualInvoice = () => {
    const nextNumber = String(invoices.length + 1).padStart(3, '0');
    const draft: Invoice = {
      id: `INV-MANUAL-${nextNumber}`,
      orderRef: 'Manual invoice',
      customer: 'New customer',
      companyName: 'Buyer information required',
      taxCode: 'Not provided',
      billingAddress: 'Not provided',
      channel: 'WebStore',
      total: 0,
      status: 'Draft',
      invoiceDate: '2026-08-13',
      provider: 'MISA',
      items: [],
      logs: [{ at: '13 Aug 2026 · 11:58:00', provider: 'MISA', event: 'Manual draft created', detail: 'Buyer and item information must be completed before issuance.', result: 'Pending' }],
    };
    setInvoices((current) => [draft, ...current]);
    setActiveInvoiceId(draft.id);
    toast.success('Manual invoice draft created');
  };

  const clearFilters = () => {
    setSearch('');
    setChannel('all');
    setStatus('all');
    setDateFrom('');
    setDateTo('');
  };

  const summaryCards = [
    { label: 'Total Invoiced Value', value: money.format(summary.total), detail: 'Excludes cancelled invoices', icon: CircleDollarSign, tone: 'text-primary bg-primary/10' },
    { label: 'E-Invoices Issued', value: String(summary.issued), detail: 'Successfully registered', icon: FileCheck2, tone: 'text-emerald-600 bg-emerald-500/10' },
    { label: 'Pending E-Invoices', value: String(summary.pending), detail: 'Waiting for provider response', icon: Clock3, tone: 'text-amber-600 bg-amber-500/10' },
    { label: 'E-Invoice Sync Errors', value: String(summary.errors), detail: 'Require review', icon: TriangleAlert, tone: 'text-rose-600 bg-rose-500/10' },
  ];

  return (
    <main className="min-h-full space-y-5 bg-[hsl(var(--surface-stage))] p-4 pb-24 md:p-6">
      <WorkspacePageHeader
        title="Invoice Management"
        description="Create, issue, and reconcile sales and e-invoices across every commerce channel."
        icon={ReceiptText}
        actions={<div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" onClick={createManualInvoice}><FilePlus2 />Create Manual Invoice</Button><Button onClick={bulkIssue} disabled={!selectedEligibleCount}><Send />Bulk Issue E-Invoice{selectedEligibleCount ? ` (${selectedEligibleCount})` : ''}</Button></div>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Invoice summary">
        {summaryCards.map(({ label, value, detail, icon: Icon, tone }) => <Card key={label} className="shadow-none"><CardContent className="flex items-start gap-4 p-5"><span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone)}><Icon className="size-5" /></span><div className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 truncate text-2xl font-bold tracking-tight tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></CardContent></Card>)}
      </section>

      <Card className="overflow-hidden shadow-none">
        <div className="border-b border-border p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_190px_190px_minmax(290px,auto)_auto]">
            <label className="relative block"><span className="sr-only">Search invoices</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 pl-9" placeholder="Invoice ID, order, customer, or tax code" /></label>
            <Select value={channel} onValueChange={(value) => setChannel(value as 'all' | InvoiceChannel)}><SelectTrigger className="h-10"><SelectValue placeholder="All channels" /></SelectTrigger><SelectContent><SelectItem value="all">All Channels</SelectItem><SelectItem value="WebStore">WebStore</SelectItem><SelectItem value="POS">POS</SelectItem><SelectItem value="Social Inbox">Social Inbox</SelectItem></SelectContent></Select>
            <Select value={status} onValueChange={(value) => setStatus(value as 'all' | InvoiceStatus)}><SelectTrigger className="h-10"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All E-Invoice Statuses</SelectItem>{(['Draft', 'Issued', 'Pending', 'Error', 'Cancelled'] as InvoiceStatus[]).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg border border-input bg-background px-3"><CalendarRange className="size-4 text-muted-foreground" /><label><span className="sr-only">Date from</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-9 w-full bg-transparent text-xs outline-none" /></label><label><span className="sr-only">Date to</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-9 w-full bg-transparent text-xs outline-none" /></label></div>
            <Button variant="ghost" className="h-10" onClick={clearFilters}>Clear</Button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filteredInvoices.length} invoice{filteredInvoices.length === 1 ? '' : 's'}</span>{selectedIds.size ? <span className="font-medium text-primary">{selectedIds.size} selected</span> : null}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1160px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3"><Checkbox aria-label="Select all visible invoices" checked={allVisibleSelected ? true : visibleSelectedCount ? 'indeterminate' : false} onCheckedChange={(checked) => toggleVisibleSelection(checked === true)} /></th>
                <th className="px-3 py-3">Invoice ID</th><th className="px-3 py-3">Order Reference</th><th className="px-3 py-3">Customer & Tax Code</th><th className="px-3 py-3">Channel</th><th className="px-3 py-3 text-right">Total incl. VAT</th><th className="px-3 py-3">E-Invoice Status</th><th className="w-14 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} tabIndex={0} role="button" aria-label={`Open ${invoice.id}`} onClick={() => setActiveInvoiceId(invoice.id)} onKeyDown={(event) => { if (event.key === 'Enter') setActiveInvoiceId(invoice.id); }} className="cursor-pointer bg-background transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><Checkbox aria-label={`Select ${invoice.id}`} checked={selectedIds.has(invoice.id)} onCheckedChange={(checked) => setSelectedIds((current) => { const next = new Set(current); checked === true ? next.add(invoice.id) : next.delete(invoice.id); return next; })} /></td>
                  <td className="px-3 py-3"><p className="font-semibold text-foreground">{invoice.id}</p><p className="mt-1 text-xs text-muted-foreground">{invoice.invoiceDate}</p></td>
                  <td className="px-3 py-3"><button type="button" onClick={(event) => { event.stopPropagation(); toast.info(`Opening ${invoice.orderRef}`); }} className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{invoice.orderRef}<ExternalLink className="size-3" /></button></td>
                  <td className="px-3 py-3"><p className="font-medium">{invoice.customer}</p><p className="mt-1 text-xs text-muted-foreground">{invoice.taxCode}</p></td>
                  <td className="px-3 py-3"><InvoiceChannelBadge channel={invoice.channel} /></td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{money.format(invoice.total)}</td>
                  <td className="px-3 py-3"><InvoiceStatusBadge status={invoice.status} /></td>
                  <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${invoice.id}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onSelect={() => setActiveInvoiceId(invoice.id)}><ReceiptText className="mr-2 size-4" />View PDF</DropdownMenuItem><DropdownMenuItem onSelect={() => toast.success(`${invoice.id} sent to printer`)}><Printer className="mr-2 size-4" />Print</DropdownMenuItem><DropdownMenuItem disabled={invoice.status === 'Issued' || invoice.status === 'Cancelled'} onSelect={() => issueInvoice(invoice.id)}><Send className="mr-2 size-4" />Issue E-Invoice</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem disabled={invoice.status === 'Cancelled'} onSelect={() => cancelInvoice(invoice.id)} className="text-destructive focus:text-destructive"><Ban className="mr-2 size-4" />Cancel</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredInvoices.length ? <div className="grid min-h-56 place-items-center p-8 text-center"><div><ReceiptText className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">No invoices found</h2><p className="mt-1 text-sm text-muted-foreground">Try changing or clearing the current filters.</p><Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button></div></div> : null}
        </div>
      </Card>

      <Sheet open={Boolean(activeInvoice)} onOpenChange={(open) => { if (!open) setActiveInvoiceId(null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl lg:max-w-4xl">
          {activeInvoice ? <InvoiceDetail invoice={activeInvoice} onIssue={() => issueInvoice(activeInvoice.id)} onCancel={() => cancelInvoice(activeInvoice.id)} /> : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function InvoiceDetail({ invoice, onIssue, onCancel }: { invoice: Invoice; onIssue: () => void; onCancel: () => void }) {
  return <div>
    <SheetHeader className="border-b border-border px-6 py-5 pr-14"><div className="flex flex-wrap items-center gap-2"><SheetTitle>{invoice.id}</SheetTitle><InvoiceStatusBadge status={invoice.status} /></div><SheetDescription>{invoice.orderRef} · {invoice.channel} · {money.format(invoice.total)}</SheetDescription></SheetHeader>
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => toast.success(`${invoice.id} sent to printer`)}><Printer />Print</Button><Button disabled={invoice.status === 'Issued' || invoice.status === 'Cancelled'} onClick={onIssue}><Send />Issue E-Invoice</Button><Button variant="ghost" disabled={invoice.status === 'Cancelled'} onClick={onCancel} className="text-destructive hover:text-destructive"><Ban />Cancel</Button></div>

      <section className="grid gap-3 md:grid-cols-3" aria-label="E-Invoice metadata">
        <DetailBlock label="Tax Authority Lookup Code" value={invoice.lookupCode ?? 'Not issued'} />
        <DetailBlock label="Issuance Date" value={invoice.issuanceDate ?? 'Not issued'} />
        <DetailBlock label="E-Invoice Provider" value={invoice.provider} />
      </section>

      <section className="rounded-xl border border-border"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Buyer Tax Information</h2></div><dl className="grid gap-4 p-4 sm:grid-cols-2"><DetailTerm label="Company Name" value={invoice.companyName} /><DetailTerm label="Tax Code" value={invoice.taxCode} /><div className="sm:col-span-2"><DetailTerm label="Billing Address" value={invoice.billingAddress} /></div></dl></section>

      <section className="overflow-hidden rounded-xl border border-border"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">Invoice Items</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">SKU / Item</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Unit Price</th><th className="px-4 py-3 text-right">VAT</th><th className="px-4 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-border">{invoice.items.map((item) => <tr key={item.sku}><td className="px-4 py-3"><p className="font-medium">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.sku}</p></td><td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td><td className="px-4 py-3 text-right tabular-nums">{money.format(item.unitPrice)}</td><td className="px-4 py-3 text-right tabular-nums">{item.vat}%</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{money.format(item.total)}</td></tr>)}</tbody><tfoot className="border-t border-border bg-muted/20"><tr><td colSpan={4} className="px-4 py-3 text-right font-medium">Total incl. VAT</td><td className="px-4 py-3 text-right text-base font-bold tabular-nums">{money.format(invoice.total)}</td></tr></tfoot></table>{!invoice.items.length ? <p className="p-6 text-center text-sm text-muted-foreground">Add invoice items before issuing this manual draft.</p> : null}</div></section>

      <section className="rounded-xl border border-border"><div className="border-b border-border px-4 py-3"><h2 className="font-semibold">E-Invoice Sync Logs</h2><p className="mt-1 text-xs text-muted-foreground">API requests, provider responses, and error traces.</p></div><div className="divide-y divide-border">{invoice.logs.map((log, index) => <div key={`${log.at}-${index}`} className="flex gap-3 p-4"><span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-full', log.result === 'Success' ? 'bg-emerald-500/10 text-emerald-600' : log.result === 'Error' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600')}>{log.result === 'Success' ? <CheckCircle2 className="size-4" /> : log.result === 'Error' ? <TriangleAlert className="size-4" /> : <Clock3 className="size-4" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{log.event}</p><Badge variant="outline">{log.provider}</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{log.detail}</p><p className="mt-2 text-[11px] text-muted-foreground">{log.at}</p></div></div>)}</div></section>
    </div>
  </div>;
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 break-words text-sm font-semibold">{value}</p></div>;
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>;
}
