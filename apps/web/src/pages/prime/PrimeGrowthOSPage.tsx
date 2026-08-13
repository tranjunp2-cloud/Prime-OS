import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  ExternalLink,
  Globe2,
  Loader2,
  MessageSquare,
  MoreVertical,
  PackageCheck,
  Package,
  Pencil,
  PlugZap,
  Plus,
  Play,
  RadioTower,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  ShoppingCart,
  ShoppingBag,
  Sparkles,
  Store,
  Target,
  Truck,
  Trash2,
  UsersRound,
  WalletCards,
  Warehouse,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  approveGrowthAiAction,
  connectGrowthConnector,
  createGrowthLead,
  createGrowthConnectorSampleWebhook,
  deadLetterGrowthConnectorDomainEvent,
  disconnectGrowthConnector,
  fallbackGrowthOsSnapshot,
  fetchGrowthConnectorDomainEvents,
  fetchGrowthConnectorDomainRecords,
  fetchGrowthConnectorEvents,
  fetchGrowthConnectorOAuthSession,
  fetchConnectorHealth,
  fetchGrowthOsSnapshot,
  probeGrowthConnector,
  refreshGrowthConnectorOAuthToken,
  requeueGrowthConnectorDomainEvent,
  retryGrowthConnectorDomainEvent,
  revokeGrowthConnectorOAuthToken,
  startGrowthConnectorOAuthSetup,
  testGrowthConnector,
  type GrowthAiAction,
  type GrowthConnector,
  type GrowthConnectorDomainEvent,
  type GrowthConnectorDomainEventSummary,
  type GrowthConnectorDomainRecord,
  type GrowthConnectorDomainRecordSummary,
  type GrowthConnectorReadinessBucket,
  type GrowthConnectorReadinessSummary,
  type GrowthConnectorOAuthSession,
  type GrowthConnectorProbeResult,
  type GrowthConnectorReadinessCheck,
  type GrowthConnectorWebhookEvent,
  type GrowthConnectorSetupPayload,
  type GrowthLead,
  type GrowthOsSnapshot,
  type GrowthStatus,
} from '@/lib/prime/growth-os';
import { getPrimeAuthToken, resolvePrimeBackendBase } from '@/lib/prime/backend-auth';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';
import { getFulfillmentJobs } from '@/lib/fulfillment-store';
import { cn } from '@/lib/utils';
import { WorkspacePageHeader } from '@/components/system/WorkspacePageHeader';
import { InitialSetupBanner } from '@/components/onboarding/InitialSetupBanner';

type PrimeModuleId = 'overview' | 'crm' | 'scheduled' | 'cos' | 'service' | 'connectors' | 'finance' | 'automation';
type ConnectorStatusFilter = 'all' | 'connected' | 'needs_setup' | 'watch';
type ConnectorDomainEventAction = 'retry' | 'dead-letter' | 'requeue';
type CosMode = 'control' | 'pim' | 'live' | 'oms' | 'ship';
type CosQueueAction = { title: string; detail: string; priority: 'High' | 'Medium' | 'Low'; mode: CosMode; cta: string };
type CosChannelRow = { channel: string; listings: number; active: number; connectorStatus: string };
type LiveCommerceStatus = 'Ready' | 'Watch' | 'Setup';
type LiveCommerceSession = {
  id: string;
  name: string;
  channel: string;
  host: string;
  status: LiveCommerceStatus;
  productSet: string;
  allocated: number;
  reserved: number;
  sold: number;
  orders: number;
  revenue: number;
  nextAction: string;
};
type LiveAllocation = {
  label: string;
  channel: string;
  units: number;
  owner: string;
  purpose: string;
  status: LiveCommerceStatus;
};
type ProductSetLine = {
  sku: string;
  name: string;
  quantity: number;
  role: string;
};
type FinanceMode = 'overview' | 'payments' | 'forecast' | 'risk';
type FinanceQueueAction = { title: string; detail: string; priority: 'High' | 'Medium' | 'Low'; mode: FinanceMode; cta: string };
type FinanceLedgerEntry = {
  id: string;
  source: 'COS' | 'Service';
  customer: string;
  label: string;
  status: string;
  paymentStatus: string;
  value: number;
  owner: string;
  due: string;
};

interface ModuleDefinition {
  id: PrimeModuleId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  functions: string[];
}

interface Kpi {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
}

interface ScheduledTask {
  id: string;
  title: string;
  status: 'running' | 'paused';
  enabled: boolean;
  repeat: string;
  nextRun: string;
  lastRun: string;
  owner: string;
  channel: string;
  prompt: string;
  description: string;
  lastModified: string;
  history: Array<{ id: string; time: string; trigger: string; result: 'success' | 'skipped' | 'failed' }>;
}

interface CosProfile {
  systemName: string;
  owner: string;
  channels: string;
  fulfillmentModel: string;
  paymentPolicy: string;
  sla: string;
  note: string;
}

type ScheduledStatusFilter = 'all' | ScheduledTask['status'];

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const jpyCurrency = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

const compactJpyCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'JPY',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFormat = new Intl.NumberFormat('en-US');
const primaryButtonClass = 'bg-primary text-primary-foreground hover:bg-primary/90';

function formatNoBreakCurrency(formatter: Intl.NumberFormat, value: number) {
  return formatter.formatToParts(value).map((part) => part.value).join('').replace(/\s+/g, '');
}
const cosProfileStorageKey = 'primeos.cos.profile';

const defaultCosProfile: CosProfile = {
  systemName: 'Commerce Operations System',
  owner: 'Commerce Ops',
  channels: 'Shopee, Lazada, TikTok Shop, Brand.com',
  fulfillmentModel: 'Central warehouse + campaign/session stock allocation',
  paymentPolicy: 'Paid or approved partial payment before fulfillment',
  sla: 'Confirm payment in 2h, release fulfillment same day',
  note: 'COS owns product, listing, inventory allocation, order, fulfillment, policy, and audit context.',
};

const liveCommerceTotalStock = 1000;

const liveCommerceProductSet: ProductSetLine[] = [
  { sku: 'HG-ESSENCE-30ML', name: 'HydraGlow Essence 30ml', quantity: 1, role: 'Hero SKU' },
  { sku: 'HG-MASK-5PC', name: 'HydraGlow Mask 5-pack', quantity: 1, role: 'Bundle lift' },
  { sku: 'HG-POUCH', name: 'Campaign pouch', quantity: 1, role: 'Gift with purchase' },
];

const liveCommerceAllocations: LiveAllocation[] = [
  { label: 'TikTok Live', channel: 'TikTok Shop', units: 300, owner: 'Internal live team', purpose: 'Launch livestream', status: 'Ready' },
  { label: 'Shopee Live', channel: 'Shopee', units: 200, owner: 'Marketplace ops', purpose: 'Shopee live room', status: 'Ready' },
  { label: 'KOL A Session', channel: 'KOL', units: 100, owner: 'Creator ops', purpose: 'Creator bundle code', status: 'Watch' },
  { label: 'Brand.com Campaign', channel: 'Brand.com', units: 200, owner: 'Owned commerce', purpose: 'Owned site drop', status: 'Ready' },
  { label: 'Buffer Stock', channel: 'Ops buffer', units: 200, owner: 'Inventory control', purpose: 'Oversell guardrail', status: 'Ready' },
];

const liveCommerceSessions: LiveCommerceSession[] = [
  { id: 'live-tiktok-0626', name: 'HydraGlow Launch Live', channel: 'TikTok Shop', host: 'Internal host', status: 'Ready', productSet: 'HydraGlow Live Set', allocated: 300, reserved: 74, sold: 118, orders: 118, revenue: 10620, nextAction: 'Monitor paid order capture' },
  { id: 'live-shopee-0627', name: 'Shopee Payday Live', channel: 'Shopee', host: 'Marketplace team', status: 'Ready', productSet: 'HydraGlow Live Set', allocated: 200, reserved: 42, sold: 63, orders: 63, revenue: 5670, nextAction: 'Release remaining stock after session' },
  { id: 'live-kol-a-0628', name: 'KOL A Skin Routine', channel: 'Creator/KOL', host: 'KOL A', status: 'Watch', productSet: 'HydraGlow Live Set', allocated: 100, reserved: 35, sold: 24, orders: 24, revenue: 2160, nextAction: 'Confirm creator code mapping' },
  { id: 'live-brand-0629', name: 'Brand.com Bundle Drop', channel: 'Brand.com', host: 'Owned commerce', status: 'Ready', productSet: 'HydraGlow Live Set', allocated: 200, reserved: 22, sold: 41, orders: 41, revenue: 3690, nextAction: 'Sync landing page orders' },
];

const liveCommerceChannelSupport = [
  { channel: 'Shopee', role: 'Live room allocation, order capture, campaign stock', integration: 'Seller API + order sync', status: 'Ready' },
  { channel: 'Lazada', role: 'Campaign listing, allocated stock, order capture', integration: 'Seller API planned connector', status: 'Setup' },
  { channel: 'TikTok', role: 'Live selling allocation, host/KOL session, SKU performance', integration: 'TikTok Shop connector', status: 'Ready' },
  { channel: 'Brand.com', role: 'Owned site drop, product set publishing, customer capture', integration: 'Shopify/WooCommerce or custom webhook', status: 'Ready' },
];

function getInitialCosProfile(): CosProfile {
  if (typeof window === 'undefined') return defaultCosProfile;

  try {
    const storedProfile = window.localStorage.getItem(cosProfileStorageKey);
    if (!storedProfile) return defaultCosProfile;
    return { ...defaultCosProfile, ...JSON.parse(storedProfile) };
  } catch {
    return defaultCosProfile;
  }
}

function saveCosProfileToStorage(profile: CosProfile) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(cosProfileStorageKey, JSON.stringify(profile));
  } catch {
    // Local persistence is optional; the on-screen state still updates.
  }
}

const primeModules: ModuleDefinition[] = [
  {
    id: 'overview',
    title: 'Home: Omnichannel Overview',
    subtitle: 'Revenue, orders, customers, and fulfillment across every commerce channel.',
    icon: Sparkles,
    functions: ['Commerce data', 'Channel performance', 'Fulfillment queue'],
  },
  {
    id: 'crm',
    title: 'CRM',
    subtitle: 'Lead intake and qualification.',
    icon: RadioTower,
    functions: ['Lead Capture', 'Lead Source Tracking', 'Lead Qualification'],
  },
  {
    id: 'scheduled',
    title: 'Task',
    subtitle: 'Recurring task runs, owners, and run history.',
    icon: Clock3,
    functions: ['Tasks', 'Run History', 'Templates', 'Bulk Operations'],
  },
  {
    id: 'cos',
    title: 'COS',
    subtitle: 'PIM, product sets, live commerce allocation, orders, fulfillment, and channel health.',
    icon: ShoppingCart,
    functions: ['Product Master', 'Product Sets', 'Live Commerce', 'Inventory Allocation', 'OMS', 'Fulfillment'],
  },
  {
    id: 'service',
    title: 'Service',
    subtitle: 'Bookings and staff assignment.',
    icon: CalendarCheck,
    functions: ['Service Packages', 'Bookings', 'Staff Assignment', 'Resource Management', 'Status Tracking'],
  },
  {
    id: 'connectors',
    title: 'Connectors',
    subtitle: 'Connect and monitor business channels.',
    icon: PlugZap,
    functions: ['Groups', 'Status', 'Setup', 'Sync'],
  },
  {
    id: 'finance',
    title: 'Finance',
    subtitle: 'Revenue and payments.',
    icon: CircleDollarSign,
    functions: ['Basic Finance Dashboard', 'Payment Status', 'Revenue View'],
  },
  {
    id: 'automation',
    title: 'Automation',
    subtitle: 'Event workflows, trigger rules, and AI approvals.',
    icon: Workflow,
    functions: ['Event Triggers', 'Workflow Rules', 'AI Approval Queue', 'Run Guardrails'],
  },
];

const moduleMap = new Map(primeModules.map((module) => [module.id, module]));

const moduleOwners: Record<PrimeModuleId, string> = {
  overview: 'Ops',
  crm: 'Growth',
  scheduled: 'Ops',
  cos: 'Commerce',
  service: 'Service',
  connectors: 'Growth Ops',
  finance: 'Finance',
  automation: 'Ops',
};

const connectorStatusFilters: Array<{ id: ConnectorStatusFilter; label: string }> = [
  { id: 'all', label: 'All status' },
  { id: 'connected', label: 'Connected' },
  { id: 'needs_setup', label: 'Need setup' },
  { id: 'watch', label: 'Watch' },
];

function normalizeModuleId(value: string | null): PrimeModuleId {
  if (value === 'analytics' || value === 'ai') return 'overview';
  if (value === 'integration' || value === 'integrations') return 'connectors';
  return moduleMap.has(value as PrimeModuleId) ? value as PrimeModuleId : 'overview';
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function normalizeCosMode(value: string | null): CosMode {
  return value === 'pim' || value === 'live' || value === 'oms' || value === 'ship' ? value : 'control';
}

function normalizeFinanceMode(value: string | null): FinanceMode {
  return value === 'payments' || value === 'forecast' || value === 'risk' ? value : 'overview';
}

function KpiCard({ label, value, delta, icon: Icon }: Kpi) {
  return (
    <div className="prime-dashboard-surface relative min-h-[82px] rounded-lg border px-4 py-3 sm:min-h-[88px]">
      <div className="pr-8 text-xs font-semibold leading-4 text-muted-foreground sm:text-sm">{label}</div>
      <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-md border bg-muted text-foreground">
        <Icon className="size-4" />
      </span>
      <div className="mt-2 text-2xl font-semibold leading-none tracking-normal text-foreground">{value}</div>
      {delta ? (
        <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
          <ArrowUpRight className="size-3.5" />
          {delta}
        </div>
      ) : null}
    </div>
  );
}

function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {items.map((item) => <KpiCard key={item.label} {...item} />)}
    </section>
  );
}

function Surface({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="prime-dashboard-surface min-w-0 rounded-lg border p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-normal text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm font-medium leading-5 text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex w-fit items-center rounded-md border bg-muted px-2.5 py-1 text-xs font-semibold capitalize text-muted-foreground">
      {formatStatus(status)}
    </span>
  );
}

function ModuleHeader({
  module,
  isLoading: _isLoading,
  snapshot: _snapshot,
}: {
  module: ModuleDefinition;
  isLoading: boolean;
  snapshot: GrowthOsSnapshot;
}) {
  return (
    <WorkspacePageHeader title={module.title} description={module.subtitle} icon={module.icon} />
  );
}

const metricLabelMap: Record<string, string> = {
  totalLeads: 'Total leads',
  qualifiedLeads: 'Qualified leads',
  engagedLeads: 'Engaged leads',
  convertedCustomers: 'Converted customers',
  conversionRate: 'Conversion rate',
  revenueMtd: 'Revenue MTD',
  serviceBookings: 'Service bookings',
  repeatRevenueRate: 'Repeat revenue rate',
  revenueGap: 'Revenue gap',
  aiActionsCompleted: 'AI actions completed',
};

function formatMetricLabel(key: string) {
  return metricLabelMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (match) => match.toUpperCase());
}

function formatMetricValue(key: string, value: number) {
  const lowerKey = key.toLowerCase();

  if (lowerKey.includes('rate')) {
    return `${value}%`;
  }

  if (lowerKey.includes('revenue')) {
    return currency.format(value);
  }

  return numberFormat.format(value);
}

function formatSystemDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPackagePrice(price: number | null, users: number | null) {
  const priceLabel = price === null ? 'Custom' : currency.format(price);
  const userLabel = users === null ? 'Custom users' : `${numberFormat.format(users)} users`;
  return `${priceLabel} / ${userLabel}`;
}

function joinList(items: string[]) {
  return items.length ? items.join(', ') : '-';
}

function SystemDataTable({
  columns,
  rows,
  minWidth = 720,
  maxHeight,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
  minWidth?: number;
  maxHeight?: string;
}) {
  const shouldFitContainer = minWidth === 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className={cn('overflow-auto', maxHeight)}>
        <table
          className={cn('w-full border-separate border-spacing-0 text-left', shouldFitContainer && 'table-fixed')}
          style={shouldFitContainer ? undefined : { minWidth }}
        >
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="border-b border-border px-3 py-2.5 align-top text-sm font-medium text-foreground last:border-b-0">
                    <div className="min-w-0 whitespace-normal break-words leading-5">{cell}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-8 text-center text-sm font-semibold text-muted-foreground">No data.</div>
      ) : null}
    </div>
  );
}

function MinimalDataGroup({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number | string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group border-t border-border" open={defaultOpen}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left marker:hidden">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{title}</div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span>{count}</span>
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        </div>
      </summary>
      <div className="px-4 pb-4">
        {children}
      </div>
    </details>
  );
}

function MiniSparkline({ tone = 'violet' }: { tone?: 'violet' | 'emerald' | 'rose' }) {
  const stroke = tone === 'emerald' ? '#10b981' : tone === 'rose' ? '#f43f5e' : '#635bff';
  const fill = tone === 'emerald' ? 'rgba(16,185,129,0.12)' : tone === 'rose' ? 'rgba(244,63,94,0.12)' : 'rgba(99,91,255,0.12)';

  return (
    <svg viewBox="0 0 112 46" aria-hidden="true" className="h-12 w-28 shrink-0">
      <path d="M2 42 L18 33 L31 36 L45 24 L57 29 L71 15 L84 21 L98 8 L110 4 L110 46 L2 46 Z" fill={fill} />
      <path d="M2 42 L18 33 L31 36 L45 24 L57 29 L71 15 L84 21 L98 8 L110 4" fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}

function MiniRing({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(value, 100));

  return (
    <div className="grid size-14 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#635bff ${safeValue}%, #edf0f7 0)` }} aria-label={label}>
      <div className="grid size-10 place-items-center rounded-full bg-card text-sm font-semibold text-foreground">{safeValue}%</div>
    </div>
  );
}

function PerformanceKpiCard({
  label,
  value,
  detail,
  trend,
  tone = 'violet',
  icon: Icon,
  visual,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: 'up' | 'down' | 'flat';
  tone?: 'violet' | 'emerald' | 'rose';
  icon: LucideIcon;
  visual?: ReactNode;
}) {
  const trendClass = trend === 'down' ? 'text-rose-500' : trend === 'flat' ? 'text-muted-foreground' : 'text-emerald-500';

  return (
    <article className="prime-dashboard-surface min-w-0 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold leading-none tracking-normal text-foreground">{value}</div>
          <div className={cn('mt-2 flex items-center gap-1 truncate text-xs font-semibold', trendClass)}>
            {trend === 'down' ? <AlertTriangle className="size-3.5" /> : trend === 'flat' ? <ArrowRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
            {detail}
          </div>
        </div>
        <span className={cn(
          'grid size-8 shrink-0 place-items-center rounded-md border',
          tone === 'emerald' && 'border-emerald-100 bg-emerald-50 text-emerald-600',
          tone === 'rose' && 'border-rose-100 bg-rose-50 text-rose-600',
          tone === 'violet' && 'border-violet-100 bg-violet-50 text-violet-600'
        )}>
          <Icon className="size-4" />
        </span>
      </div>
      {visual ? <div className="mt-3 flex justify-end">{visual}</div> : null}
    </article>
  );
}

function PriorityPill({ priority }: { priority: 'High' | 'Medium' | 'Low' }) {
  return (
    <span className={cn(
      'inline-flex h-6 min-w-14 items-center justify-center rounded-md px-2 text-[11px] font-semibold',
      priority === 'High' && 'bg-rose-50 text-rose-600',
      priority === 'Medium' && 'bg-amber-50 text-amber-600',
      priority === 'Low' && 'bg-blue-50 text-blue-600'
    )}>
      {priority}
    </span>
  );
}

function DashboardPanel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('prime-dashboard-surface min-w-0 rounded-lg border p-4', className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function RevenueLineChart() {
  return (
    <svg viewBox="0 0 620 230" aria-label="Revenue trend" className="h-[210px] w-full">
      {[30, 70, 110, 150, 190].map((y) => (
        <line key={y} x1="24" x2="596" y1={y} y2={y} stroke="#e6e9f2" strokeWidth="1" />
      ))}
      <path d="M44 188 C90 172 104 160 140 148 C179 135 202 132 240 113 C278 94 304 88 344 74 C384 60 410 41 454 36 C498 31 533 21 576 16" fill="none" stroke="#635bff" strokeLinecap="round" strokeWidth="4" />
      <path d="M44 199 C90 186 112 177 150 168 C190 158 218 145 254 135 C296 123 326 112 368 99 C410 86 440 74 480 66 C520 58 546 48 576 43" fill="none" stroke="#9aa5bd" strokeDasharray="7 7" strokeLinecap="round" strokeWidth="3" />
      <g className="text-[12px] font-semibold" fill="#7a8497">
        <text x="44" y="222">May 1</text>
        <text x="184" y="222">May 8</text>
        <text x="324" y="222">May 15</text>
        <text x="464" y="222">May 22</text>
        <text x="548" y="222">May 29</text>
      </g>
    </svg>
  );
}

function BreakdownDonut({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let cursor = 0;
  const stops = items.map((item) => {
    const start = cursor;
    cursor += (item.value / total) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(', ');

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_88px] sm:items-center">
      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: item.color }} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 text-foreground">{currency.format(item.value)}</span>
          </div>
        ))}
      </div>
      <div className="mx-auto grid size-20 place-items-center rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="grid size-11 place-items-center rounded-full bg-card text-xs font-semibold text-foreground">100%</div>
      </div>
    </div>
  );
}

function LegacyOverviewView({
  snapshot,
  onOpenModule,
}: {
  snapshot: GrowthOsSnapshot;
  onOpenModule: (module: PrimeModuleId) => void;
}) {
  const cosProfile = getInitialCosProfile();
  const orderValue = snapshot.commerceOrders.reduce((sum, order) => sum + order.value, 0);
  const serviceValue = snapshot.serviceBookings.reduce((sum, booking) => sum + booking.value, 0);
  const openPayments = snapshot.commerceOrders.filter((order) => order.paymentStatus !== 'paid').length;
  const activeFulfillment = snapshot.commerceOrders.filter((order) => order.status !== 'confirmed').length;
  const unassignedBookings = snapshot.serviceBookings.filter((booking) => booking.staff === 'Unassigned').length;
  const openAiActions = snapshot.aiActions.filter((item) => item.status !== 'approved').length;
  const highScoreLeads = snapshot.leads.filter((lead) => lead.score >= 85).length;
  const systemRecordCount = Object.keys(snapshot.metrics).length
    + snapshot.modules.length
    + snapshot.problemCards.length
    + snapshot.funnel.length
    + snapshot.journeyLoop.length
    + snapshot.competitors.length
    + snapshot.leads.length
    + snapshot.commerceOrders.length
    + snapshot.serviceBookings.length
    + snapshot.connectors.length
    + snapshot.aiActions.length
    + snapshot.packages.length
    + initialScheduledTasks.length
    + Object.keys(cosProfile).length;
  const dataCoverageRows = [
    ['Metrics', Object.keys(snapshot.metrics).length, 'System KPIs'],
    ['Modules', snapshot.modules.length, 'Registry'],
    ['Funnel', snapshot.funnel.length, 'Stages'],
    ['Problems', snapshot.problemCards.length, 'Risks'],
    ['Journey loop', snapshot.journeyLoop.length, 'Lifecycle'],
    ['Competitors', snapshot.competitors.length, 'Positioning'],
    ['Leads', snapshot.leads.length, 'CRM'],
    ['Orders', snapshot.commerceOrders.length, currency.format(orderValue)],
    ['Service bookings', snapshot.serviceBookings.length, currency.format(serviceValue)],
    ['AI actions', snapshot.aiActions.length, `${openAiActions} open`],
    ['Packages', snapshot.packages.length, 'Plans'],
    ['Tasks', initialScheduledTasks.length, `${initialScheduledTasks.filter((task) => task.status === 'running').length} running`],
    ['COS profile', Object.keys(cosProfile).length, 'Local config'],
  ];
  const repeatRevenue = Math.round(snapshot.metrics.revenueMtd * (snapshot.metrics.repeatRevenueRate / 100));
  const otherRevenue = Math.max(0, snapshot.metrics.revenueMtd - orderValue - serviceValue - repeatRevenue);
  const runningSchedules = initialScheduledTasks.filter((task) => task.status === 'running').length;
  const nextBestActions: Array<{
    priority: 'High' | 'Medium' | 'Low';
    icon: LucideIcon;
    title: string;
    detail: string;
    cta: string;
    module: PrimeModuleId;
  }> = [
    {
      priority: 'High',
      icon: PackageCheck,
      title: 'Fulfill 5 Shopee orders',
      detail: 'Paid orders are ready to pick, pack, and hand off.',
      cta: 'Fulfill orders',
      module: 'cos',
    },
    {
      priority: 'High',
      icon: MessageSquare,
      title: 'Respond to 3 CRM tickets',
      detail: 'Customer conversations are waiting for a response.',
      cta: 'Open tickets',
      module: 'service',
    },
    {
      priority: 'Medium',
      icon: BadgePercent,
      title: 'Approve Webstore discount',
      detail: 'Review the scheduled promotion before it goes live.',
      cta: 'Review discount',
      module: 'crm',
    },
  ];
  const revenueBreakdown = [
    { label: 'Orders', value: orderValue, color: '#635bff' },
    { label: 'Services', value: serviceValue, color: '#10b981' },
    { label: 'Repeat revenue', value: repeatRevenue, color: '#f5b51b' },
    { label: 'Other', value: otherRevenue, color: '#d6dbe7' },
  ];

  return (
    <div className="grid gap-6">
      <section aria-labelledby="operations-pipeline-heading" className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Operations pipeline</div>
            <h2 id="operations-pipeline-heading" className="mt-0.5 text-base font-semibold text-foreground">Today’s commerce flow</h2>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Catalog → Channels → Orders → Fulfillment → Stock</p>
        </div>
        <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
          {[
            { step: '01', label: 'Catalog', value: '1,240 products', detail: 'Master catalog ready', cta: 'Create product', href: '/overview?module=cos&view=pim&section=products', icon: PackageCheck, tone: 'text-primary bg-primary/10' },
            { step: '02', label: 'Channels', value: '5 connected', detail: 'Syncing normally', cta: 'View channels', href: '/overview?module=cos&view=live&section=channels', icon: Store, tone: 'text-emerald-600 bg-emerald-50' },
            { step: '03', label: 'Orders', value: `${Math.max(snapshot.commerceOrders.length, 85)} new orders`, detail: `${openPayments} awaiting payment`, cta: 'Process now', href: '/overview?module=cos&view=oms', icon: ShoppingBag, tone: 'text-primary bg-primary/10' },
            { step: '04', label: 'Fulfillment', value: `${Math.max(activeFulfillment, 12)} waiting`, detail: 'Packing queue needs action', cta: 'Call shipper', href: '/overview?module=cos&view=ship', icon: Truck, tone: 'text-amber-600 bg-amber-50' },
            { step: '05', label: 'Stock', value: '3 low-stock alerts', detail: 'Replenishment suggested', cta: 'Restock', href: '/overview?module=cos&view=pim&section=warehouse', icon: Warehouse, tone: 'text-rose-600 bg-rose-50' },
          ].map((stage) => {
            const Icon = stage.icon;
            return (
              <article key={stage.label} className="relative min-w-0 p-4 transition-colors hover:bg-muted/30">
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${stage.tone}`}><Icon className="size-4" /></span>
                  <span className="font-identifier text-[10px] font-semibold text-muted-foreground">{stage.step}</span>
                </div>
                <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{stage.label}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{stage.value}</div>
                <div className="mt-0.5 min-h-5 text-xs font-medium text-muted-foreground">{stage.detail}</div>
                <Button asChild variant="ghost" size="sm" className="mt-2 h-8 px-0 text-xs text-primary hover:bg-transparent hover:text-primary/80">
                  <Link to={stage.href}>{stage.cta}<ArrowRight className="size-3.5" /></Link>
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="important-heading" className="grid gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">Important</div>
          <h2 id="important-heading" className="mt-1 text-lg font-semibold text-foreground">What needs attention now</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PerformanceKpiCard label="Total Revenue" value={currency.format(snapshot.metrics.revenueMtd)} detail="25% vs last month" icon={CircleDollarSign} visual={<MiniSparkline />} />
        <PerformanceKpiCard label="Conversion Rate" value={`${snapshot.metrics.conversionRate}%`} detail="8% vs last month" tone="emerald" icon={Target} visual={<MiniSparkline tone="emerald" />} />
        <PerformanceKpiCard label="Total Orders" value={numberFormat.format(snapshot.commerceOrders.length)} detail={`${openPayments} awaiting payment`} icon={ShoppingBag} visual={<MiniSparkline />} />
        <PerformanceKpiCard label="Pending Fulfillments" value={numberFormat.format(activeFulfillment)} detail="Ready for warehouse action" tone="emerald" icon={Package} visual={<MiniSparkline tone="emerald" />} />
        </div>
      </section>

      <div className="grid gap-5">
        <DashboardPanel title="Tasks & Fulfillments" action={<Button variant="ghost" size="sm" className="h-8 rounded-md text-primary">View all tasks <ArrowRight className="size-3.5" /></Button>}>
          <div className="divide-y divide-border">
            {nextBestActions.slice(0, 3).map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[64px_32px_minmax(0,1fr)_auto_28px] sm:items-center">
                  <PriorityPill priority={item.priority} />
                  <span className="grid size-8 place-items-center rounded-md bg-violet-50 text-violet-600"><Icon className="size-4" /></span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{item.title}</div>
                    <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{item.detail}</div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 rounded-md px-2 text-xs text-primary" onClick={() => onOpenModule(item.module)}>
                    {item.cta}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7 rounded-md text-muted-foreground" aria-label={`${item.title} options`}>
                    <MoreVertical className="size-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </DashboardPanel>

      </div>

      <section aria-labelledby="monitor-heading" className="grid gap-3">
        <div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">Monitor</div><h2 id="monitor-heading" className="mt-1 text-lg font-semibold text-foreground">Commerce performance</h2></div>
        <div className="grid gap-5">
        <DashboardPanel title="Revenue overview" subtitle={`${currency.format(snapshot.metrics.revenueMtd)} · 25% vs last month`}>
          <div className="grid gap-4">
            <div className="min-w-0 overflow-hidden">
              <RevenueLineChart />
              <div className="mt-1 flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#635bff]" />This month</span>
                <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#9aa5bd]" />Last month</span>
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/70 p-3">
              <div className="mb-3 text-xs font-semibold text-foreground">Breakdown</div>
              <BreakdownDonut items={revenueBreakdown} />
            </div>
          </div>
        </DashboardPanel>

        </div>
      </section>

      <section aria-labelledby="reference-heading" className="grid gap-3">
        <div><div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reference</div><h2 id="reference-heading" className="mt-1 text-lg font-semibold text-foreground">Commerce data</h2></div>
        <div className="prime-dashboard-surface overflow-hidden rounded-lg border">
        <div className="px-4 py-4">
          <h2 className="text-base font-semibold text-foreground">Data explorer</h2>
          <p className="mt-1 text-sm font-medium leading-5 text-muted-foreground">{numberFormat.format(systemRecordCount)} records across {dataCoverageRows.length} datasets.</p>
        </div>

        <MinimalDataGroup title="Data coverage" count={dataCoverageRows.length}>
          <SystemDataTable
            columns={['Dataset', 'Rows', 'Scope']}
            rows={dataCoverageRows}
            minWidth={0}
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="Commerce metrics" count={Object.keys(snapshot.metrics).length}>
          <SystemDataTable
            columns={['Metric', 'Value']}
            rows={Object.entries(snapshot.metrics).map(([key, value]) => [
              formatMetricLabel(key),
              formatMetricValue(key, value),
            ])}
            minWidth={0}
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="Funnel" count={snapshot.funnel.length}>
          <SystemDataTable
            columns={['ID', 'Stage', 'Records', 'Rate', 'Description']}
            rows={snapshot.funnel.map((step) => [
              step.id,
              step.label,
              numberFormat.format(step.count),
              `${step.rate}%`,
              step.description,
            ])}
            minWidth={720}
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="Problems" count={snapshot.problemCards.length}>
          <SystemDataTable
            columns={['ID', 'Problem', 'Severity', 'Impact', 'Detail']}
            rows={snapshot.problemCards.map((problem) => [
              problem.id,
              problem.title,
              <StatusPill key={`${problem.id}-severity`} status={problem.severity} />,
              problem.impact,
              problem.detail,
            ])}
            minWidth={760}
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="Journey loop" count={snapshot.journeyLoop.length}>
          <SystemDataTable
            columns={['ID', 'Step', 'Description']}
            rows={snapshot.journeyLoop.map((step) => [step.id, step.label, step.description])}
            minWidth={700}
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="COS profile" count={Object.keys(cosProfile).length}>
          <SystemDataTable
            columns={['Field', 'Value']}
            rows={Object.entries(cosProfile).map(([key, value]) => [formatMetricLabel(key), value])}
            minWidth={0}
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="Leads" count={snapshot.leads.length}>
          <SystemDataTable
            columns={['ID', 'Company', 'Contact', 'Source', 'Stage', 'Score', 'Value', 'Owner', 'Due', 'Next action', 'Last activity']}
            rows={snapshot.leads.map((lead) => [
              lead.id,
              lead.company,
              lead.contact,
              lead.source,
              <StatusPill key={`${lead.id}-stage`} status={lead.stage} />,
              String(lead.score),
              currency.format(lead.value),
              lead.owner,
              lead.dueAt,
              lead.nextAction,
              lead.lastActivity || '-',
            ])}
            minWidth={1240}
            maxHeight="max-h-[360px]"
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="Orders" count={snapshot.commerceOrders.length}>
          <SystemDataTable
            columns={['Order', 'Customer', 'Type', 'Status', 'Payment', 'Value', 'Owner']}
            rows={snapshot.commerceOrders.map((order) => [
              order.id,
              order.customer,
              order.type,
              <StatusPill key={`${order.id}-status`} status={order.status} />,
              order.paymentStatus,
              currency.format(order.value),
              order.owner,
            ])}
            minWidth={820}
            maxHeight="max-h-[360px]"
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="Service bookings" count={snapshot.serviceBookings.length}>
        <SystemDataTable
          columns={['Booking', 'Customer', 'Service', 'Status', 'Staff', 'Schedule', 'Value']}
          rows={snapshot.serviceBookings.map((booking) => [
            booking.id,
            booking.customer,
            booking.service,
            <StatusPill key={`${booking.id}-status`} status={booking.status} />,
            booking.staff,
            booking.scheduledAt,
            currency.format(booking.value),
          ])}
          minWidth={860}
        />
        </MinimalDataGroup>

        <MinimalDataGroup title="Connectors" count={snapshot.connectors.length}>
        <SystemDataTable
          columns={['ID', 'Connector', 'Provider', 'Category', 'Status', 'Health', 'Direction', 'IO', 'Environment', 'Account', 'Credential', 'Masked', 'Last sync', 'Connected', 'Last test', 'Webhook', 'Setup', 'Capabilities', 'Required fields']}
          rows={snapshot.connectors.map((connector) => [
            connector.id,
            connector.name,
            connector.provider,
            connector.category,
            <StatusPill key={`${connector.id}-status`} status={connector.status} />,
            `${connector.syncHealth}%`,
            connector.direction === 'two_way' ? 'Two-way' : 'One-way',
            `${connector.inboundEnabled ? 'In' : '-'} / ${connector.outboundEnabled ? 'Out' : '-'}`,
            connector.environment,
            connector.accountRef || '-',
            connector.credentialStatus,
            connector.maskedCredential || '-',
            connector.lastSync,
            formatSystemDate(connector.connectedAt),
            formatSystemDate(connector.lastTestAt),
            connector.webhookUrl,
            connector.setupMode,
            joinList(connector.capabilities),
            joinList(connector.requiredFields),
          ])}
          minWidth={2040}
          maxHeight="max-h-[520px]"
        />
        </MinimalDataGroup>

        <MinimalDataGroup title="AI actions" count={snapshot.aiActions.length}>
          <SystemDataTable
            columns={['ID', 'Action', 'Module', 'Status', 'Confidence', 'Recommendation']}
            rows={snapshot.aiActions.map((action) => [
              action.id,
              action.title,
              action.module,
              <StatusPill key={`${action.id}-status`} status={action.status} />,
              `${action.confidence}%`,
              action.recommendation,
            ])}
            minWidth={880}
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="Tasks" count={initialScheduledTasks.length}>
          <SystemDataTable
            columns={['ID', 'Task', 'Status', 'Enabled', 'Repeat', 'Next run', 'Last run', 'Owner', 'Channel', 'Description', 'Prompt', 'Last modified', 'History']}
            rows={initialScheduledTasks.map((task) => [
              task.id,
              task.title,
              <StatusPill key={`${task.id}-status`} status={task.status} />,
              task.enabled ? 'Yes' : 'No',
              task.repeat,
              task.nextRun,
              task.lastRun,
              task.owner,
              task.channel,
              task.description,
              task.prompt,
              task.lastModified,
              task.history.map((item) => `${item.time} / ${item.trigger} / ${item.result}`).join('; '),
            ])}
            minWidth={1620}
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="Packages" count={snapshot.packages.length}>
          <SystemDataTable
            columns={['ID', 'Package', 'Price / Users', 'Summary', 'Features']}
            rows={snapshot.packages.map((item) => [
              item.id,
              item.name,
              formatPackagePrice(item.price, item.users),
              item.summary,
              joinList(item.features),
            ])}
            minWidth={860}
          />
        </MinimalDataGroup>

        <MinimalDataGroup title="Competitors" count={snapshot.competitors.length}>
          <SystemDataTable
            columns={['Type', 'Examples', 'Strength', 'Limitation', 'Prime difference']}
            rows={snapshot.competitors.map((item) => [
              item.type,
              item.examples,
              item.strength,
              item.limitation,
              item.primeDifference,
            ])}
            minWidth={1020}
          />
        </MinimalDataGroup>
        </div>
      </section>
    </div>
  );
}

function OverviewView({ snapshot }: { snapshot: GrowthOsSnapshot; onOpenModule: (module: PrimeModuleId) => void }) {
  const pipelineGroups = [
    { title: 'Orders', icon: ShoppingBag, href: '/orders?status=pending', tone: 'bg-indigo-50 text-indigo-600', items: [{ value: '124', label: 'Pending Confirmation' }, { value: '45', label: 'Ready to Pack' }] },
    { title: 'Fulfillment', icon: Truck, href: '/fulfillment?status=exception', tone: 'bg-amber-50 text-amber-600', items: [{ value: '12', label: 'Delivery Exceptions' }, { value: '111', label: 'Returned Orders' }] },
    { title: 'Inventory', icon: Warehouse, href: '/inventory?status=low-stock', tone: 'bg-rose-50 text-rose-600', items: [{ value: '15', label: 'Low Stock Items' }, { value: '3', label: 'Out of Stock' }] },
    { title: 'CRM', icon: UsersRound, href: '/crm/leads-rfqs', tone: 'bg-emerald-50 text-emerald-600', items: [{ value: '8', label: 'New Leads' }, { value: '5', label: 'Unassigned Tickets' }] },
  ];
  const channels = [
    { name: 'Shopee', revenue: 48600, share: 34, color: '#635bff' },
    { name: 'Lazada', revenue: 32900, share: 23, color: '#818cf8' },
    { name: 'Tiki', revenue: 17200, share: 12, color: '#38bdf8' },
    { name: 'Prime Web', revenue: 24300, share: 17, color: '#10b981', launch: 'Open Builder', href: '/builder/theme' },
    { name: 'Prime POS', revenue: 14300, share: 10, color: '#f59e0b', launch: 'Open POS', href: '/pos/register' },
    { name: 'Prime CRM', revenue: 5700, share: 4, color: '#f43f5e' },
  ];
  const channelSnapshot = [channels[0], channels[1], channels[3], channels[4]];
  const products = [
    { name: 'HydraGlow Essence 30ml', units: 428, image: '/images/products/B0G432Z31H/1.jpg' },
    { name: 'Daily Barrier Cream', units: 316, image: '/images/products/B0FH1K4CMN/1.jpg' },
    { name: 'Vitamin C Brightening Set', units: 284, image: '/images/products/B0FQHTSM8B/1.jpg' },
    { name: 'Hydrating Mask 5-pack', units: 219, image: '/images/products/B0G5Y7YCDD/1.jpg' },
  ];
  const connectionHealth = [
    { channel: 'Shopee', status: 'Connected', detail: 'Synced 1 min ago' },
    { channel: 'TikTok', status: 'Connected', detail: 'Synced 3 min ago' },
    { channel: 'Lazada', status: 'Error', detail: 'Token expired 18 min ago' },
    { channel: 'Web', status: 'Connected', detail: 'Realtime webhook active' },
  ];

  return (
    <div className="grid gap-6">
      <InitialSetupBanner />

      <section aria-labelledby="pipeline-heading" className="grid gap-3">
        <div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Action queue</div><h2 id="pipeline-heading" className="mt-1 text-lg font-semibold text-slate-900">Operations Pipeline</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {pipelineGroups.map((group) => { const Icon = group.icon; return (
            <article key={group.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3"><span className={`grid size-9 place-items-center rounded-lg ${group.tone}`}><Icon className="size-4" /></span><h3 className="font-semibold text-slate-900">{group.title}</h3><ArrowRight className="ml-auto size-4 text-slate-400" /></div>
              <div className="divide-y divide-slate-100">{group.items.map((item, index) => <Link key={item.label} to={index === 0 ? group.href : group.href} className="flex min-h-16 items-center gap-3 px-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><span className="min-w-10 text-2xl font-semibold text-slate-900">{item.value}</span><span className="text-sm font-medium text-slate-500">{item.label}</span><ChevronRight className="ml-auto size-4 text-slate-300" /></Link>)}</div>
            </article>
          ); })}
        </div>
      </section>

      <section aria-labelledby="channel-snapshot-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Live snapshot</div><h2 id="channel-snapshot-heading" className="mt-1 font-semibold text-slate-900">Channel Revenue Today</h2><p className="mt-1 text-xs font-medium text-slate-500">Quick signal only · detailed trends and attribution live in Analytics</p></div>
          <Button asChild variant="outline" size="sm" className="shrink-0"><Link to="/client-reports">View full analytics <ArrowRight className="size-3.5" /></Link></Button>
        </div>
        <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {channelSnapshot.map((channel) => <div key={channel.name} className="min-w-0 p-4 transition-colors hover:bg-slate-50"><div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: channel.color }} /><span className="truncate text-sm font-semibold text-slate-700">{channel.name}</span><span className="ml-auto text-xs font-semibold text-slate-400">{channel.share}%</span></div><div className="mt-3 text-xl font-semibold text-slate-900">{currency.format(channel.revenue)}</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.min(100, channel.share * 2.4)}%`, backgroundColor: channel.color }} /></div>{channel.launch ? <Button asChild variant="ghost" size="sm" className="mt-2 h-7 px-0 text-xs text-primary hover:bg-transparent"><a href={channel.href} target="_blank" rel="noreferrer">{channel.launch}<ExternalLink className="size-3" /></a></Button> : null}</div>)}
        </div>
      </section>

      <section aria-label="Operational health" className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Top Selling Products</h2><p className="mt-1 text-xs font-medium text-slate-500">Highest unit sales across all channels</p></div><div className="divide-y divide-slate-100">{products.map((product, index) => <div key={product.name} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50"><span className="w-5 text-xs font-semibold text-slate-400">{index + 1}</span><img src={product.image} alt="" className="size-11 rounded-lg border border-slate-200 object-cover" /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{product.name}</span><span className="shrink-0 text-sm font-semibold text-slate-900">{product.units} <span className="font-medium text-slate-400">units</span></span></div>)}</div></div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Channel Connection Health</h2><p className="mt-1 text-xs font-medium text-slate-500">Realtime marketplace API and webhook status</p></div><div className="divide-y divide-slate-100">{connectionHealth.map((connection) => <div key={connection.channel} className="flex min-h-[68px] items-center gap-3 px-5 transition-colors hover:bg-slate-50"><span className={`size-2.5 rounded-full ${connection.status === 'Error' ? 'bg-rose-500' : 'bg-emerald-500'}`} /><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-slate-800">{connection.channel}</div><div className="mt-0.5 truncate text-xs font-medium text-slate-500">{connection.detail}</div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${connection.status === 'Error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>{connection.status}</span>{connection.status === 'Error' ? <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toast.success(`${connection.channel} reconnect requested`)}><RefreshCcw className="size-3" />Reconnect</Button> : null}</div>)}</div></div>
      </section>
    </div>
  );
}

function CrmView({
  snapshot,
  onLeadCreated,
}: {
  snapshot: GrowthOsSnapshot;
  onLeadCreated: (lead: GrowthLead) => void;
}) {
  const token = getPrimeAuthToken();
  const [leadDraft, setLeadDraft] = useState({ company: '', contact: '', source: 'PrimeWeb' });
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const queryClient = useQueryClient();
  const createLeadMutation = useMutation({
    mutationFn: createGrowthLead,
    onSuccess: (lead) => {
      onLeadCreated(lead);
      setLeadDraft({ company: '', contact: '', source: 'PrimeWeb' });
      setAddLeadOpen(false);
      toast.success('Lead captured.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to capture lead.');
    },
  });

  const captureLead = () => {
    const company = leadDraft.company.trim();
    const contact = leadDraft.contact.trim();
    const source = leadDraft.source.trim() || 'PrimeWeb';

    if (!company || !contact) {
      toast.error('Company and contact are required.');
      return;
    }

    if (token) {
      createLeadMutation.mutate({ company, contact, source });
      return;
    }

    queryClient.setQueryData<GrowthOsSnapshot>(['growth-os'], (current) => {
      const base = current || snapshot;
      const lead: GrowthLead = {
        id: `local_${Date.now()}`,
        company,
        contact,
        source,
        stage: 'new',
        score: 70,
        value: 0,
        nextAction: 'Qualify lead',
        owner: 'CRM Team',
        dueAt: 'Today',
        lastActivity: 'Lead captured locally',
      };
      return { ...base, metrics: { ...base.metrics, totalLeads: base.metrics.totalLeads + 1 }, leads: [lead, ...base.leads] };
    });
    setLeadDraft({ company: '', contact: '', source: 'PrimeWeb' });
    setAddLeadOpen(false);
    toast.info('Lead captured locally.');
  };

  return (
    <>
      <KpiGrid items={[
        { label: 'Lead Capture', value: numberFormat.format(snapshot.metrics.totalLeads), delta: '18%', icon: UsersRound },
        { label: 'Qualified Leads', value: numberFormat.format(snapshot.metrics.qualifiedLeads), delta: '12%', icon: Target },
        { label: 'Source Types', value: '4', icon: RadioTower },
        { label: 'Qualification Rate', value: '27%', delta: '6%', icon: CheckCircle2 },
      ]} />
      <Surface
        title="Lead Intake"
        action={<Button className={cn('h-10 rounded-lg', primaryButtonClass)} onClick={() => setAddLeadOpen((value) => !value)}><Plus className="size-4" />New Lead</Button>}
      >
        {addLeadOpen ? (
          <div className="mb-4 grid gap-3 border-b border-border pb-4 md:grid-cols-[1fr_1fr_0.8fr_auto] md:items-end">
            <Field label="Company" value={leadDraft.company} onChange={(value) => setLeadDraft((draft) => ({ ...draft, company: value }))} />
            <Field label="Contact" value={leadDraft.contact} onChange={(value) => setLeadDraft((draft) => ({ ...draft, contact: value }))} />
            <Field label="Source" value={leadDraft.source} onChange={(value) => setLeadDraft((draft) => ({ ...draft, source: value }))} />
            <Button className={cn('h-10 rounded-lg', primaryButtonClass)} onClick={captureLead} disabled={createLeadMutation.isPending}>
              {createLeadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Capture
            </Button>
          </div>
        ) : null}
        <SimpleTable
          columns={['Lead', 'Contact', 'Source', 'Score', 'Next Action']}
          rows={snapshot.leads.map((lead) => [
            lead.company,
            lead.contact,
            lead.source,
            String(lead.score),
            lead.nextAction,
          ])}
        />
      </Surface>
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-foreground">
      {label}
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border-border bg-card" />
    </label>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-foreground">
      {label}
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="min-h-[92px] resize-none rounded-lg border-border bg-card"
      />
    </label>
  );
}

const initialScheduledTasks: ScheduledTask[] = [
  {
    id: 'reply-tracking',
    title: 'Customer reply tracking',
    status: 'running',
    enabled: true,
    repeat: 'Daily 00:00:00',
    nextRun: 'in about 16 hours',
    lastRun: 'Today 00:00',
    owner: 'AI Ops',
    channel: 'Facebook, Instagram',
    prompt: 'Find open customer conversations without a reply and prepare follow-up tasks.',
    description: 'Daily tracking for social inbox conversations that still need a response.',
    lastModified: '7 days ago',
    history: [
      { id: 'test-5', time: 'June 5, 2026 at 12:00 AM', trigger: 'Automatic', result: 'success' },
      { id: 'test-4', time: 'June 4, 2026 at 12:00 AM', trigger: 'Automatic', result: 'success' },
      { id: 'test-3', time: 'June 3, 2026 at 12:00 AM', trigger: 'Automatic', result: 'success' },
      { id: 'test-2', time: 'June 2, 2026 at 12:00 AM', trigger: 'Automatic', result: 'skipped' },
      { id: 'test-1', time: 'June 1, 2026 at 12:00 AM', trigger: 'Automatic', result: 'skipped' },
    ],
  },
  {
    id: 'inventory-alert',
    title: 'Inventory alert',
    status: 'running',
    enabled: true,
    repeat: 'Daily 09:00:00',
    nextRun: 'in about 1 hour',
    lastRun: 'Today 09:00',
    owner: 'Commerce Ops',
    channel: 'Website, TikTok Shop',
    prompt: 'Check low-stock products and create an owner-ready inventory alert.',
    description: 'Daily inventory alert for products below reorder threshold.',
    lastModified: '2 days ago',
    history: [
      { id: 'inventory-5', time: 'June 5, 2026 at 9:00 AM', trigger: 'Automatic', result: 'success' },
      { id: 'inventory-4', time: 'June 4, 2026 at 9:00 AM', trigger: 'Automatic', result: 'success' },
      { id: 'inventory-3', time: 'June 3, 2026 at 9:00 AM', trigger: 'Automatic', result: 'success' },
      { id: 'inventory-2', time: 'June 2, 2026 at 9:00 AM', trigger: 'Automatic', result: 'success' },
    ],
  },
  {
    id: 'missed-reply-recovery',
    title: 'Missed reply recovery',
    status: 'paused',
    enabled: false,
    repeat: 'Every 4 hours',
    nextRun: 'paused',
    lastRun: 'Yesterday 16:00',
    owner: 'Support',
    channel: 'WhatsApp, WeChat',
    prompt: 'Review unresolved messages older than four hours and assign the next owner.',
    description: 'Recovery workflow for customer conversations that missed SLA.',
    lastModified: 'yesterday',
    history: [
      { id: 'recovery-3', time: 'June 4, 2026 at 4:00 PM', trigger: 'Automatic', result: 'skipped' },
      { id: 'recovery-2', time: 'June 4, 2026 at 12:00 PM', trigger: 'Automatic', result: 'success' },
      { id: 'recovery-1', time: 'June 4, 2026 at 8:00 AM', trigger: 'Automatic', result: 'success' },
    ],
  },
];

function AutomationView({ snapshot }: { snapshot: GrowthOsSnapshot }) {
  const highScoreLeads = snapshot.leads.filter((lead) => lead.score >= 85).length;
  const openPayments = snapshot.commerceOrders.filter((order) => order.paymentStatus !== 'paid').length;
  const setupConnectors = snapshot.connectors.filter((connector) => connector.status === 'setup_required' || connector.status === 'disconnected').length;
  const openAiActions = snapshot.aiActions.filter((action) => action.status !== 'approved').length;
  const runningSchedules = initialScheduledTasks.filter((task) => task.status === 'running').length;
  const connectedConnectors = snapshot.connectors.filter((connector) => connector.status === 'connected').length;
  const automationRules = [
    {
      name: 'High-intent lead routing',
      trigger: 'Lead score >= 85',
      source: 'CRM',
      action: 'Assign owner and create same-day follow-up',
      status: 'active',
      runs: Math.max(highScoreLeads, 1),
      guardrail: 'Sales SLA',
    },
    {
      name: 'Payment risk recovery',
      trigger: 'Order payment is partial or unpaid',
      source: 'COS',
      action: 'Create finance review and reminder task',
      status: openPayments ? 'active' : 'ready',
      runs: openPayments,
      guardrail: 'No fulfillment release before approval',
    },
    {
      name: 'Connector failure alert',
      trigger: 'Channel setup or sync health drops',
      source: 'Connectors',
      action: 'Notify Growth Ops and open setup checklist',
      status: setupConnectors ? 'watch' : 'ready',
      runs: setupConnectors,
      guardrail: 'Credential owner required',
    },
    {
      name: 'AI recommendation approval',
      trigger: 'AI action confidence >= 75%',
      source: 'Prime AI',
      action: 'Queue recommendation for human approval',
      status: openAiActions ? 'needs_approval' : 'approved',
      runs: openAiActions,
      guardrail: 'Human approval required',
    },
    {
      name: 'Service capacity handoff',
      trigger: 'Booking has no assigned staff',
      source: 'Service',
      action: 'Route booking to service desk queue',
      status: 'active',
      runs: snapshot.serviceBookings.filter((booking) => booking.staff === 'Unassigned').length,
      guardrail: 'Booking owner required',
    },
  ];
  const activeRules = automationRules.filter((rule) => rule.status === 'active' || rule.status === 'needs_approval').length;
  const triggeredToday = automationRules.reduce((sum, rule) => sum + rule.runs, 0) + snapshot.aiActions.length;

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PerformanceKpiCard label="Active workflows" value={String(activeRules)} detail="Event rules live" icon={Workflow} visual={<MiniRing value={Math.round((activeRules / automationRules.length) * 100)} label="Active workflows" />} />
        <PerformanceKpiCard label="Triggered today" value={numberFormat.format(triggeredToday)} detail="Across CRM, COS, Service" tone="emerald" icon={Activity} visual={<MiniSparkline tone="emerald" />} />
        <PerformanceKpiCard label="AI approvals" value={String(openAiActions)} detail="Human review queue" icon={Bot} visual={<span className="grid size-12 place-items-center rounded-full bg-violet-50 text-violet-600"><Sparkles className="size-5" /></span>} />
        <PerformanceKpiCard label="Guarded runs" value="100%" detail="No direct auto-approve" trend="flat" icon={ShieldCheck} visual={<MiniSparkline />} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.68fr)]">
        <DashboardPanel title="Workflow rules" subtitle="Event-triggered automations. Task controls time-based runs." action={<Button className={cn('h-8 rounded-md px-3 text-xs', primaryButtonClass)}><Plus className="size-3.5" />New rule</Button>}>
          <div className="divide-y divide-border">
            {automationRules.map((rule) => (
              <div key={rule.name} className="grid gap-3 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(170px,0.7fr)_minmax(0,1fr)_96px] lg:items-center">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{rule.name}</div>
                  <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{rule.source}</div>
                </div>
                <div className="grid min-w-0 gap-1 text-xs font-medium leading-5 text-muted-foreground">
                  <div><span className="font-semibold text-foreground">Trigger:</span> {rule.trigger}</div>
                  <div><span className="font-semibold text-foreground">Action:</span> {rule.action}</div>
                  <div><span className="font-semibold text-foreground">Guardrail:</span> {rule.guardrail}</div>
                </div>
                <div className="flex items-center gap-2 lg:grid lg:justify-items-end">
                  <StatusPill status={rule.status} />
                  <div className="text-xs font-semibold text-muted-foreground">{rule.runs} runs</div>
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="AI approval queue" subtitle={`${openAiActions} suggestions need review.`} action={<Button variant="ghost" size="sm" className="h-8 rounded-md text-primary">Review all</Button>}>
          <div className="grid gap-2">
            {snapshot.aiActions.map((action) => (
              <div key={action.id} className="rounded-lg border border-border/70 bg-card/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{action.title}</div>
                    <div className="mt-1 text-xs font-medium leading-5 text-muted-foreground">{action.recommendation}</div>
                  </div>
                  <StatusPill status={action.status} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
                  <span>{action.module}</span>
                  <span>{action.confidence}% confidence</span>
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <DashboardPanel title="Trigger sources" subtitle="Events that can launch workflows.">
          <div className="grid gap-2">
            {[
              ['CRM', `${highScoreLeads} high-intent leads`],
              ['COS', `${openPayments} payment events`],
              ['Connectors', `${connectedConnectors}/${snapshot.connectors.length} connected`],
              ['Service', `${snapshot.serviceBookings.length} booking events`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm font-semibold">
                <span className="text-foreground">{label}</span>
                <span className="text-muted-foreground">{value}</span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Guardrails" subtitle="Automation runs with approval and safety boundaries.">
          <div className="grid gap-2">
            {automationRules.slice(0, 4).map((rule) => (
              <div key={rule.guardrail} className="rounded-md border border-border/70 bg-card/70 px-3 py-2">
                <div className="text-sm font-semibold text-foreground">{rule.guardrail}</div>
                <div className="mt-0.5 text-xs font-medium text-muted-foreground">Used by {rule.name}</div>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Task handoff" subtitle="Time-based tasks can trigger automation, but are managed separately.">
          <div className="grid gap-2">
            {initialScheduledTasks.map((task) => (
              <div key={task.id} className="rounded-md border border-border/70 bg-card/70 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 truncate text-sm font-semibold text-foreground">{task.title}</div>
                  <StatusPill status={task.status} />
                </div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">{task.repeat} · {task.nextRun}</div>
              </div>
            ))}
            <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
              {runningSchedules}/{initialScheduledTasks.length} time-based tasks can feed Automation workflows.
            </div>
          </div>
        </DashboardPanel>
      </div>
    </div>
  );
}

function ScheduledView() {
  const [schedules, setSchedules] = useState<ScheduledTask[]>(initialScheduledTasks);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScheduledStatusFilter>('all');
  const visibleSchedules = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return schedules.filter((schedule) => [
      schedule.title,
      schedule.repeat,
      schedule.nextRun,
      schedule.lastRun,
      schedule.owner,
      schedule.channel,
      schedule.prompt,
      schedule.description,
      schedule.status,
    ].some((value) => value.toLowerCase().includes(query)) && (statusFilter === 'all' || schedule.status === statusFilter));
  }, [schedules, searchTerm, statusFilter]);
  const selectedSchedule = selectedScheduleId ? schedules.find((schedule) => schedule.id === selectedScheduleId) || null : null;
  const runningCount = schedules.filter((schedule) => schedule.status === 'running').length;
  const pausedCount = schedules.length - runningCount;
  const selectedVisibleCount = visibleSchedules.filter((schedule) => selectedIds.includes(schedule.id)).length;
  const allVisibleSelected = visibleSchedules.length > 0 && selectedVisibleCount === visibleSchedules.length;
  const nextSchedule = schedules.find((schedule) => schedule.status === 'running');

  const toggleSchedule = (scheduleId: string) => {
    setSchedules((current) => current.map((schedule) => schedule.id === scheduleId
      ? {
        ...schedule,
        enabled: !schedule.enabled,
        status: schedule.enabled ? 'paused' : 'running',
        nextRun: schedule.enabled ? 'paused' : 'in about 1 hour',
        lastModified: 'just now',
      }
      : schedule));
  };

  const toggleSelected = (scheduleId: string) => {
    setSelectedIds((current) => current.includes(scheduleId)
      ? current.filter((id) => id !== scheduleId)
      : [...current, scheduleId]);
  };

  const toggleAllVisible = () => {
    const visibleIds = visibleSchedules.map((schedule) => schedule.id);
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const deleteSchedules = (ids: string[]) => {
    if (ids.length === 0) return;
    setSchedules((current) => current.filter((schedule) => !ids.includes(schedule.id)));
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
    setSelectedScheduleId((current) => current && ids.includes(current) ? null : current);
    toast.success(`${ids.length} task${ids.length === 1 ? '' : 's'} deleted.`);
  };

  const createSchedule = (fromTemplate = false) => {
    const id = `schedule-${Date.now()}`;
    const schedule: ScheduledTask = {
      id,
      title: fromTemplate ? 'Daily customer follow-up' : 'New task',
      status: 'running',
      enabled: true,
      repeat: fromTemplate ? 'Daily 10:00:00' : 'Daily 12:00:00',
      nextRun: fromTemplate ? 'in about 2 hours' : 'tomorrow',
      lastRun: 'not run yet',
      owner: fromTemplate ? 'AI Ops' : 'Unassigned',
      channel: fromTemplate ? 'Facebook, Instagram' : 'No channel selected',
      prompt: fromTemplate ? 'Review pending customer replies and assign follow-up tasks.' : 'Describe what this task should do.',
      description: fromTemplate ? 'Template for recurring customer follow-up.' : 'New task draft.',
      lastModified: 'just now',
      history: [
        { id: `${id}-run`, time: 'June 5, 2026 at 10:00 AM', trigger: 'Manual', result: 'success' },
      ],
    };
    setSchedules((current) => [schedule, ...current]);
    setSelectedScheduleId(id);
    toast.success(fromTemplate ? 'Template task created.' : 'Task created.');
  };

  const runScheduleNow = (scheduleId: string) => {
    setSchedules((current) => current.map((schedule) => schedule.id === scheduleId
      ? {
        ...schedule,
        history: [
          { id: `${scheduleId}-manual-${Date.now()}`, time: 'June 5, 2026 at 11:40 AM', trigger: 'Manual', result: 'success' },
          ...schedule.history,
        ],
        lastRun: 'Today 11:40',
        lastModified: 'just now',
      }
      : schedule));
    toast.success('Schedule run started.');
  };

  if (selectedSchedule) {
    return (
      <ScheduledDetail
        schedule={selectedSchedule}
        onBack={() => setSelectedScheduleId(null)}
        onToggle={() => toggleSchedule(selectedSchedule.id)}
        onRunNow={() => runScheduleNow(selectedSchedule.id)}
        onDelete={() => {
          deleteSchedules([selectedSchedule.id]);
          setSelectedScheduleId(null);
        }}
      />
    );
  }

  return (
    <section className="grid min-w-0 max-w-[calc(100vw_-_5.75rem)] grid-cols-[minmax(0,1fr)] gap-4 md:max-w-none">
      <div className="rounded-[14px] border border-border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-foreground">Tasks</h2>
            <div className="mt-3 grid gap-2 text-sm font-medium text-muted-foreground sm:grid-cols-3">
              <ScheduledStat label="Total" value={numberFormat.format(schedules.length)} />
              <ScheduledStat label="Running" value={numberFormat.format(runningCount)} />
              <ScheduledStat label="Next" value={nextSchedule?.nextRun || '-'} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-10 rounded-lg" onClick={() => createSchedule(true)}>
              <FileText className="size-4" />
              Template
            </Button>
            <Button className={cn('h-10 rounded-lg', primaryButtonClass)} onClick={() => createSchedule(false)}>
              <Plus className="size-4" />
              Create
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 lg:flex-row lg:items-center lg:justify-between">
          <ScheduledFilter
            value={statusFilter}
            counts={{ all: schedules.length, running: runningCount, paused: pausedCount }}
            onChange={setStatusFilter}
          />
          <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search task, owner, channel" className="w-full sm:w-[280px]" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-border bg-card">
        <div className="flex min-h-12 flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              aria-label="Select all tasks"
              className="size-4 rounded border-border"
            />
            <span>{selectedIds.length > 0 ? `${selectedIds.length} selected` : `${visibleSchedules.length} shown`}</span>
          </label>
          {selectedIds.length > 0 ? (
            <Button variant="outline" className="h-9 rounded-lg text-rose-500" onClick={() => deleteSchedules(selectedIds)}>
              <Trash2 className="size-4" />
              Delete selected
            </Button>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">Click a row to review details.</span>
          )}
        </div>

        <ScheduledTaskList
          schedules={visibleSchedules}
          selectedIds={selectedIds}
          onOpen={setSelectedScheduleId}
          onToggle={toggleSchedule}
          onCheck={toggleSelected}
        />
        {visibleSchedules.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-sm font-semibold text-foreground">No tasks found</div>
            <div className="mt-1 text-sm font-medium text-muted-foreground">Try another status or search term.</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ScheduledStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted px-3 py-2">
      <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ScheduledFilter({
  value,
  counts,
  onChange,
}: {
  value: ScheduledStatusFilter;
  counts: Record<ScheduledStatusFilter, number>;
  onChange: (value: ScheduledStatusFilter) => void;
}) {
  const items: Array<{ id: ScheduledStatusFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'running', label: 'Running' },
    { id: 'paused', label: 'Paused' },
  ];

  return (
    <div className="flex w-full min-w-0 overflow-x-auto rounded-lg border border-border bg-card p-1 sm:w-fit">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            'flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors',
            value === item.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          <span className="text-xs text-muted-foreground">{counts[item.id]}</span>
        </button>
      ))}
    </div>
  );
}

function ScheduleStatusBadge({ status }: { status: ScheduledTask['status'] }) {
  return (
    <span className={cn(
      'inline-flex h-7 w-fit items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold capitalize',
      status === 'running' ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
    )}>
      <span className={cn('size-1.5 rounded-full', status === 'running' ? 'bg-emerald-500' : 'bg-[#98a2b3]')} />
      {status}
    </span>
  );
}

function ScheduleToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? 'Pause task' : 'Run task'}
      className={cn(
        'relative h-6 w-10 shrink-0 rounded-full transition-colors',
        enabled ? 'bg-foreground' : 'bg-muted-foreground/30'
      )}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <span className={cn(
        'absolute left-1 top-1 size-4 rounded-full bg-card transition-transform',
        enabled ? 'translate-x-4' : 'translate-x-0'
      )} />
    </button>
  );
}

function ScheduledTaskList({
  schedules,
  selectedIds,
  onOpen,
  onToggle,
  onCheck,
}: {
  schedules: ScheduledTask[];
  selectedIds: string[];
  onOpen: (scheduleId: string) => void;
  onToggle: (scheduleId: string) => void;
  onCheck: (scheduleId: string) => void;
}) {
  return (
    <>
      <div className="grid gap-0 md:hidden">
        {schedules.map((schedule) => (
          <article
            key={schedule.id}
            className="grid min-w-0 gap-4 border-b border-border p-4 last:border-b-0"
            onClick={() => onOpen(schedule.id)}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(schedule.id)}
                  onChange={(event) => {
                    event.stopPropagation();
                    onCheck(schedule.id);
                  }}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Select ${schedule.title}`}
                  className="mt-1 size-4 shrink-0 rounded border-border"
                />
                <div className="min-w-0">
                  <div className="line-clamp-2 text-base font-semibold leading-5 text-foreground">{schedule.title}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-muted-foreground">{schedule.description}</div>
                </div>
              </div>
              <ScheduleToggle enabled={schedule.enabled} onToggle={() => onToggle(schedule.id)} />
            </div>

            <div className="grid grid-cols-2 gap-3 pl-7 text-sm">
              <ScheduledMeta label="Repeat" value={schedule.repeat} />
              <ScheduledMeta label="Next" value={schedule.nextRun} />
              <ScheduledMeta label="Channel" value={schedule.channel} />
              <div className="min-w-0">
                <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-muted-foreground">Status</div>
                <ScheduleStatusBadge status={schedule.status} />
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {['', 'Task', 'Schedule', 'Next run', 'Last run', 'Owner', 'Status', ''].map((column, columnIndex) => (
                <th key={`${column || 'action'}-${columnIndex}`} className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr key={schedule.id} className="group cursor-pointer" onClick={() => onOpen(schedule.id)}>
                <td className="w-12 border-b border-border px-4 py-4 group-last:border-b-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(schedule.id)}
                    onChange={(event) => {
                      event.stopPropagation();
                      onCheck(schedule.id);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${schedule.title}`}
                    className="size-4 rounded border-border"
                  />
                </td>
                <td className="max-w-[320px] border-b border-border px-4 py-4 group-last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{schedule.title}</div>
                    <div className="mt-1 truncate text-sm font-medium text-muted-foreground">{schedule.channel}</div>
                  </div>
                </td>
                <td className="border-b border-border px-4 py-4 text-sm font-medium text-foreground group-last:border-b-0">{schedule.repeat}</td>
                <td className="border-b border-border px-4 py-4 text-sm font-medium text-foreground group-last:border-b-0">{schedule.nextRun}</td>
                <td className="border-b border-border px-4 py-4 text-sm font-medium text-muted-foreground group-last:border-b-0">{schedule.lastRun}</td>
                <td className="border-b border-border px-4 py-4 text-sm font-medium text-muted-foreground group-last:border-b-0">{schedule.owner}</td>
                <td className="border-b border-border px-4 py-4 group-last:border-b-0"><ScheduleStatusBadge status={schedule.status} /></td>
                <td className="w-16 border-b border-border px-4 py-4 text-right group-last:border-b-0">
                  <ScheduleToggle enabled={schedule.enabled} onToggle={() => onToggle(schedule.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ScheduledMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="break-words text-sm font-semibold leading-5 text-foreground">{value}</div>
    </div>
  );
}

function ScheduledDetail({
  schedule,
  onBack,
  onToggle,
  onRunNow,
  onDelete,
}: {
  schedule: ScheduledTask;
  onBack: () => void;
  onToggle: () => void;
  onRunNow: () => void;
  onDelete: () => void;
}) {
  return (
    <section className="grid min-w-0 max-w-[calc(100vw_-_5.75rem)] grid-cols-[minmax(0,1fr)] gap-4 md:max-w-none">
      <div className="rounded-[14px] border border-border bg-card p-4">
        <div className="flex min-w-0 items-center gap-1 text-sm font-semibold text-muted-foreground">
          <button type="button" className="rounded-lg px-1 py-1 hover:text-foreground" onClick={onBack}>Task</button>
          <ChevronRight className="size-4 shrink-0" />
          <span className="min-w-0 truncate text-foreground">{schedule.title}</span>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold leading-tight text-foreground">{schedule.title}</h2>
              <ScheduleStatusBadge status={schedule.status} />
            </div>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-5 text-muted-foreground">{schedule.description}</p>
          </div>
          <div className="grid grid-cols-[auto_auto_1fr] gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button variant="outline" size="icon" className="size-9 rounded-lg" aria-label="Edit task">
              <Pencil className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-9 rounded-lg text-rose-500" onClick={onDelete} aria-label="Delete task">
              <Trash2 className="size-4" />
            </Button>
            <Button variant="outline" className="h-9 rounded-lg px-3" onClick={onToggle}>
              {schedule.enabled ? 'Pause' : 'Resume'}
            </Button>
            <Button className={cn('col-span-3 h-9 rounded-lg sm:col-span-1', primaryButtonClass)} onClick={onRunNow}>
              <Play className="size-4" />
              Run now
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ScheduledStat label="Repeat" value={schedule.repeat} />
        <ScheduledStat label="Next run" value={schedule.nextRun} />
        <ScheduledStat label="Last run" value={schedule.lastRun} />
        <ScheduledStat label="Owner" value={schedule.owner} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <Surface
          title="Configuration"
          action={<ScheduleToggle enabled={schedule.enabled} onToggle={onToggle} />}
        >
          <div className="grid gap-4">
            <InspectorRow label="Channel" value={schedule.channel} />
            <div className="grid gap-1.5">
              <div className="text-sm font-medium text-muted-foreground">Description</div>
              <p className="text-sm font-semibold leading-6 text-foreground">{schedule.description}</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Instructions</div>
              <div className="mt-2 rounded-lg bg-muted px-4 py-4 font-mono text-sm font-semibold leading-6 text-foreground">
                {schedule.prompt}
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <InspectorRow label="Last modified" value={schedule.lastModified} />
            </div>
          </div>
        </Surface>

        <Surface title="History">
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground">
              <CalendarCheck className="size-4" />
              Today
            </div>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground">
              <ClipboardList className="size-4" />
              All statuses
            </div>
          </div>
          <SimpleTable
            columns={['Time', 'Result']}
            rows={schedule.history.map((item) => [
              <div key={`${item.id}-time`} className="min-w-0">
                <div className="font-semibold text-foreground">{item.time}</div>
                <div className="mt-1 text-xs font-semibold text-muted-foreground">{item.trigger}</div>
              </div>,
              <RunResultBadge key={`${item.id}-result`} result={item.result} />,
            ])}
          />
        </Surface>
      </div>
    </section>
  );
}

function RunResultBadge({ result }: { result: ScheduledTask['history'][number]['result'] }) {
  return (
    <span className={cn(
      'inline-flex w-fit items-center rounded-lg px-2.5 py-1 text-xs font-semibold uppercase',
      result === 'success'
        ? 'bg-emerald-50 text-emerald-600'
        : result === 'skipped'
          ? 'bg-muted text-muted-foreground'
          : 'bg-rose-50 text-rose-600'
    )}>
      {result}
    </span>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-0 sm:w-[260px]', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-lg border-border bg-card pl-9"
      />
    </div>
  );
}

function InspectorRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={cn('flex min-w-0 justify-between gap-3 text-sm', multiline ? 'items-start' : 'items-center')}>
      <span className="shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className={cn('min-w-0 max-w-[70%] text-right font-semibold text-foreground', multiline ? 'break-words leading-5' : 'truncate')}>{value}</span>
    </div>
  );
}

function CosInlineMetric({ label, value, tone = 'text-foreground' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="inline-flex h-8 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 text-sm">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={cn('font-identifier text-sm font-semibold', tone)}>{value}</span>
    </div>
  );
}

function CosView({ snapshot }: { snapshot: GrowthOsSnapshot }) {
  const [cosProfile, setCosProfile] = useState<CosProfile>(getInitialCosProfile);
  const [draftProfile, setDraftProfile] = useState<CosProfile>(cosProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [opsQuery, setOpsQuery] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const primeSnapshot = getPrimeSnapshot();
  const fulfillmentJobs = getFulfillmentJobs();
  const products = primeSnapshot.products;
  const skuRows = products.flatMap((product) => (
    product.skus.length ? product.skus : [{
      id: `${product.id}-default`,
      sku_code: product.sku_code,
      variation_name: 'Default',
      weight_g: 0,
      units_per_carton: 0,
      status: product.status === 'published' ? 'active' as const : 'inactive' as const,
    }]
  ).map((sku) => ({ product, sku })));
  const inventoryBySkuId = primeSnapshot.inventoryPositions.reduce((map, position) => {
    const current = map.get(position.sku_id) || [];
    current.push(position);
    map.set(position.sku_id, current);
    return map;
  }, new Map<string, typeof primeSnapshot.inventoryPositions>());
  const inventoryRows = skuRows.map(({ product, sku }) => {
    const positions = inventoryBySkuId.get(sku.id) || [];
    const fallbackOnHand = Object.values(product.inventory || {}).reduce((sum, value) => sum + value, 0);
    const onHand = positions.length ? positions.reduce((sum, position) => sum + position.on_hand, 0) : fallbackOnHand;
    const reserved = positions.reduce((sum, position) => sum + position.reserved_unpaid + position.reserved_paid + position.allocated, 0);
    const inbound = positions.reduce((sum, position) => sum + position.inbound, 0);
    const safety = positions.reduce((sum, position) => sum + position.safety_stock + position.campaign_lock, 0);
    const atp = positions.length
      ? positions.reduce((sum, position) => {
        const available = position.on_hand
          - position.reserved_unpaid
          - position.reserved_paid
          - position.allocated
          - position.safety_stock
          - position.campaign_lock;
        return sum + Math.max(0, available);
      }, 0)
      : fallbackOnHand;

    return {
      productName: product.name,
      skuCode: sku.sku_code,
      atp,
      onHand,
      reserved,
      inbound,
      safety,
      signal: atp <= Math.max(10, safety) ? 'Watch' : 'Ready',
    };
  }).sort((left, right) => left.atp - right.atp);
  const lowStockRows = inventoryRows.filter((row) => row.signal === 'Watch');
  const totalOnHand = inventoryRows.reduce((sum, row) => sum + row.onHand, 0);
  const totalAtp = inventoryRows.reduce((sum, row) => sum + row.atp, 0);
  const totalReserved = inventoryRows.reduce((sum, row) => sum + row.reserved, 0);
  const liveBufferStock = liveCommerceAllocations.find((allocation) => allocation.label === 'Buffer Stock')?.units || 0;
  const liveSellingStock = liveCommerceTotalStock - liveBufferStock;
  const liveAllocatedStock = liveCommerceAllocations
    .filter((allocation) => allocation.label !== 'Buffer Stock')
    .reduce((sum, allocation) => sum + allocation.units, 0);
  const liveReservedStock = liveCommerceSessions.reduce((sum, session) => sum + session.reserved + session.sold, 0);
  const liveRevenue = liveCommerceSessions.reduce((sum, session) => sum + session.revenue, 0);
  const liveOrders = liveCommerceSessions.reduce((sum, session) => sum + session.orders, 0);
  const liveWatchCount = liveCommerceSessions.filter((session) => session.status !== 'Ready').length;
  const liveAllocationUsage = liveSellingStock ? Math.round((liveAllocatedStock / liveSellingStock) * 100) : 0;
  const liveReservationUsage = liveAllocatedStock ? Math.round((liveReservedStock / liveAllocatedStock) * 100) : 0;
  const liveOverAllocated = liveAllocatedStock + liveBufferStock > liveCommerceTotalStock;
  const listingEntries = products.flatMap((product) => product.channels.map((listing) => ({ ...listing, productName: product.name })));
  const activeListings = listingEntries.filter((listing) => listing.status === 'active').length;
  const orders = primeSnapshot.orders;
  const fallbackOrderValue = snapshot.commerceOrders.reduce((sum, order) => sum + order.value, 0);
  const totalOrderValue = orders.length ? orders.reduce((sum, order) => sum + order.total_amount, 0) : fallbackOrderValue;
  const activeOrders = orders.filter((order) => !['completed', 'cancelled', 'returned'].includes(order.status)).length;
  const orderRiskCount = orders.filter((order) => order.risk_flags.length > 0).length;
  const latestOrders = [...orders].sort((left, right) => (
    new Date(right.order_date || right.created_at).getTime() - new Date(left.order_date || left.created_at).getTime()
  )).slice(0, 5);
  const paidOrderValue = snapshot.commerceOrders.filter((order) => order.paymentStatus === 'paid').reduce((sum, order) => sum + order.value, 0);
  const openPayments = snapshot.commerceOrders.filter((order) => order.paymentStatus !== 'paid').length;
  const paymentExposure = snapshot.commerceOrders.filter((order) => order.paymentStatus !== 'paid').reduce((sum, order) => sum + order.value, 0);
  const activeFulfillment = fulfillmentJobs.filter((job) => !['done', 'cancelled'].includes(job.status)).length;
  const exceptionFulfillment = fulfillmentJobs.filter((job) => job.status === 'exception').length;
  const highRiskForecasts = primeSnapshot.forecasts.filter((forecast) => forecast.risk === 'high');
  const commerceConnectors = snapshot.connectors.filter((connector) => connector.category === 'Commerce');
  const paymentConnectors = snapshot.connectors.filter((connector) => connector.category === 'Payments');
  const commerceConnectorTotal = commerceConnectors.length;
  const connectedCommerceConnectors = commerceConnectors.filter((connector) => connector.status === 'connected').length;
  const connectedPaymentConnectors = paymentConnectors.filter((connector) => connector.status === 'connected').length;
  const catalogScore = products.length ? 100 : 0;
  const listingScore = listingEntries.length ? Math.round((activeListings / listingEntries.length) * 100) : 0;
  const inventoryScore = inventoryRows.length ? Math.round(((inventoryRows.length - lowStockRows.length) / inventoryRows.length) * 100) : 0;
  const orderScore = orders.length ? Math.round(((orders.length - orderRiskCount) / orders.length) * 100) : 100;
  const fulfillmentScore = fulfillmentJobs.length ? Math.round(((fulfillmentJobs.length - exceptionFulfillment) / fulfillmentJobs.length) * 100) : 100;
  const connectorScore = commerceConnectorTotal ? Math.round((connectedCommerceConnectors / commerceConnectorTotal) * 100) : 0;
  const readinessScore = Math.round((catalogScore + listingScore + inventoryScore + orderScore + fulfillmentScore + connectorScore) / 6);
  const orderCurrency = orders[0]?.currency || 'JPY';
  const formatOrderValue = (value: number) => (orderCurrency === 'JPY' ? jpyCurrency.format(value) : currency.format(value));
  const formatCompactOrderValue = (value: number) => formatNoBreakCurrency(orderCurrency === 'JPY' ? compactJpyCurrency : compactCurrency, value);
  const activeCosMode = normalizeCosMode(searchParams.get('view'));
  const channelRows = Array.from(new Set([
    ...listingEntries.map((listing) => listing.channel),
    ...commerceConnectors.map((connector) => connector.provider.replace('_shop', '').replace('woocommerce', 'woo')),
  ])).slice(0, 6).map((channel) => {
    const channelListings = listingEntries.filter((listing) => listing.channel === channel);
    const connector = commerceConnectors.find((candidate) => (
      candidate.provider === channel ||
      candidate.name.toLowerCase().includes(channel) ||
      channel.includes(candidate.provider.replace('_shop', ''))
    ));

    return {
      channel,
      listings: channelListings.length,
      active: channelListings.filter((listing) => listing.status === 'active').length,
      connectorStatus: connector?.status || 'not_mapped',
    };
  });

  const selectCosMode = (mode: CosMode) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('module', 'cos');
    if (mode === 'control') {
      nextParams.delete('view');
    } else {
      nextParams.set('view', mode);
    }
    setSearchParams(nextParams, { replace: false });
  };

  const getChannelHealthValue = (row: typeof channelRows[number]) => {
    if (row.listings === 0) return 'No listings';
    if (row.connectorStatus === 'not_mapped') return `${row.active}/${row.listings} - not mapped`;
    return `${row.active}/${row.listings} - ${formatStatus(row.connectorStatus)}`;
  };

  const startEditing = () => {
    setDraftProfile(cosProfile);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftProfile(cosProfile);
    setIsEditing(false);
  };

  const saveProfile = () => {
    const nextProfile: CosProfile = {
      systemName: draftProfile.systemName.trim() || defaultCosProfile.systemName,
      owner: draftProfile.owner.trim() || defaultCosProfile.owner,
      channels: draftProfile.channels.trim() || defaultCosProfile.channels,
      fulfillmentModel: draftProfile.fulfillmentModel.trim() || defaultCosProfile.fulfillmentModel,
      paymentPolicy: draftProfile.paymentPolicy.trim() || defaultCosProfile.paymentPolicy,
      sla: draftProfile.sla.trim() || defaultCosProfile.sla,
      note: draftProfile.note.trim() || defaultCosProfile.note,
    };

    setCosProfile(nextProfile);
    saveCosProfileToStorage(nextProfile);
    setIsEditing(false);
    toast.success('COS information updated.');
  };

  const actionQueue = [
    openPayments ? {
      title: 'Collect payment before release',
      detail: `${openPayments} orders hold ${currency.format(paymentExposure)} payment exposure.`,
      priority: 'High' as const,
      mode: 'oms' as const,
      cta: 'Review OMS',
    } : null,
    lowStockRows.length ? {
      title: 'Replenish low ATP SKUs',
      detail: `${lowStockRows.length} SKUs are near safety stock across ${primeSnapshot.warehousesCount} warehouses.`,
      priority: 'High' as const,
      mode: 'pim' as const,
      cta: 'Open inventory',
    } : null,
    liveWatchCount || liveOverAllocated ? {
      title: 'Check live allocation',
      detail: liveOverAllocated
        ? 'Live allocation exceeds total available stock.'
        : `${liveWatchCount} live sessions need stock or connector review before go-live.`,
      priority: liveOverAllocated ? 'High' as const : 'Medium' as const,
      mode: 'live' as const,
      cta: 'Open live plan',
    } : null,
    exceptionFulfillment ? {
      title: 'Clear fulfillment exceptions',
      detail: `${exceptionFulfillment} jobs need manual review before shipment continues.`,
      priority: 'High' as const,
      mode: 'ship' as const,
      cta: 'Open jobs',
    } : null,
    highRiskForecasts.length ? {
      title: 'Review forecast pressure',
      detail: `${highRiskForecasts.length} forecast signals can stock out if campaign demand keeps rising.`,
      priority: 'Medium' as const,
      mode: 'ship' as const,
      cta: 'Open signals',
    } : null,
    connectedCommerceConnectors < commerceConnectorTotal ? {
      title: 'Finish commerce connectors',
      detail: `${connectedCommerceConnectors}/${commerceConnectorTotal} commerce channels connected.`,
      priority: 'Medium' as const,
      mode: 'pim' as const,
      cta: 'Review health',
    } : null,
    orderRiskCount ? {
      title: 'Resolve OMS risk flags',
      detail: `${orderRiskCount} orders have SLA or high-value risk flags.`,
      priority: 'Medium' as const,
      mode: 'oms' as const,
      cta: 'Open orders',
    } : null,
  ].filter(Boolean).slice(0, 5) as CosQueueAction[];
  const clearAction = {
    title: 'COS is clear',
    detail: 'No urgent payment, stock, fulfillment, or connector blockers detected.',
    priority: 'Low' as const,
    mode: 'control' as const,
    cta: 'View audit',
  };
  const visibleActions = actionQueue.length ? actionQueue : [clearAction];
  const orderActions = visibleActions.filter((action) => action.mode === 'oms');
  const shipActions = visibleActions.filter((action) => action.mode === 'ship');
  const normalizedOpsQuery = opsQuery.trim().toLowerCase();
  const filteredQueueActions = visibleActions.filter((action) => {
    if (!normalizedOpsQuery) return true;
    return `${action.title} ${action.detail} ${action.priority} ${action.cta}`.toLowerCase().includes(normalizedOpsQuery);
  });
  const filteredChannelRows = channelRows.filter((row) => {
    if (!normalizedOpsQuery) return true;
    return `${row.channel} ${row.connectorStatus}`.toLowerCase().includes(normalizedOpsQuery);
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[hsl(var(--surface-stage))]">
      <div className="shrink-0 bg-background px-4 pt-4 md:px-6">
        <WorkspacePageHeader
          title="Commerce Operations"
          description="Control catalog, inventory, live commerce, orders, fulfillment, and channel readiness."
          icon={ShoppingCart}
          actions={(
            <>
            <CosInlineMetric label="Ready" value={`${readinessScore}%`} tone={readinessScore >= 80 ? 'text-emerald-600 dark:text-emerald-300' : 'text-warning'} />
            <div className="hidden h-6 w-px bg-border sm:block" />
            <CosInlineMetric label="Orders" value={numberFormat.format(activeOrders)} />
            <div className="hidden h-6 w-px bg-border sm:block" />
            <CosInlineMetric label="ATP" value={numberFormat.format(totalAtp)} tone={lowStockRows.length ? 'text-warning' : 'text-emerald-600 dark:text-emerald-300'} />
            <div className="hidden h-8 w-px bg-border lg:block" />
            <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => selectCosMode('pim')}>
              <PackageCheck className="size-4" />
              Catalog
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => selectCosMode('live')}>
              <RadioTower className="size-4" />
              Live plan
            </Button>
            <Button size="sm" className="h-8 px-3" onClick={() => selectCosMode('oms')}>
              <ShoppingCart className="size-4" />
              Review OMS
            </Button>
            </>
          )}
        />
      </div>

      <div
        className="grid min-h-0 min-w-[920px] flex-1 border-b border-border bg-[hsl(var(--surface-workspace))]"
        style={{ gridTemplateColumns: '72px minmax(280px, 320px) minmax(0, 1fr)' }}
      >
        <CosModeRail
          activeMode={activeCosMode}
          readinessScore={readinessScore}
          productsCount={products.length}
          liveSessionsCount={liveCommerceSessions.length}
          ordersCount={orders.length || snapshot.commerceOrders.length}
          activeFulfillment={activeFulfillment}
          onSelect={selectCosMode}
        />

        <CosOpsPanel
          activeMode={activeCosMode}
          query={opsQuery}
          onQueryChange={setOpsQuery}
          actions={filteredQueueActions}
          channelRows={filteredChannelRows}
          paymentConnectorValue={`${connectedPaymentConnectors}/${paymentConnectors.length}`}
          onSelect={selectCosMode}
        />

        <main className="min-h-0 min-w-0 overflow-y-auto bg-background p-4 scrollbar-visible">
        {activeCosMode === 'control' ? (
          <div className="grid gap-4">
            <section className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(188px,1fr))]">
              <CosKpiCard label="COS readiness" value={`${readinessScore}%`} detail={`${primeSnapshot.metrics.cosStrength}% data strength`} icon={ShieldCheck} tone={readinessScore >= 80 ? 'emerald' : 'amber'} />
              <CosKpiCard label="Order value" value={formatCompactOrderValue(totalOrderValue)} detail={`${numberFormat.format(activeOrders)} active of ${numberFormat.format(orders.length || snapshot.commerceOrders.length)}`} icon={ShoppingCart} tone="violet" />
              <CosKpiCard label="ATP available" value={numberFormat.format(totalAtp)} detail={`${numberFormat.format(totalReserved)} reserved, ${numberFormat.format(totalOnHand)} on hand`} icon={Boxes} tone={lowStockRows.length ? 'amber' : 'emerald'} />
              <CosKpiCard label="Live stock" value={`${numberFormat.format(liveAllocatedStock)}/${numberFormat.format(liveCommerceTotalStock)}`} detail={`${numberFormat.format(liveBufferStock)} buffer, ${liveReservationUsage}% committed`} icon={RadioTower} tone={liveWatchCount || liveOverAllocated ? 'amber' : 'emerald'} />
              <CosKpiCard label="Fulfillment" value={activeFulfillment ? `${activeFulfillment} active` : 'Clear'} detail={`${primeSnapshot.shipmentsCount} shipments, ${primeSnapshot.returnsCount} returns`} icon={Truck} tone={exceptionFulfillment ? 'rose' : 'emerald'} />
              <CosKpiCard label="Channels" value={`${connectedCommerceConnectors}/${commerceConnectorTotal}`} detail={`${activeListings}/${listingEntries.length || activeListings} listings mapped`} icon={PlugZap} tone={connectedCommerceConnectors === commerceConnectorTotal ? 'emerald' : 'amber'} />
            </section>

            <div className="grid items-start gap-4">
              <Surface title="ECH Kenshin Operating Map" subtitle="PIM, listings, inventory, OMS, fulfillment, and payment in one read.">
                <div className="grid gap-3 lg:grid-cols-3 2xl:grid-cols-6">
                  <CosLaneCard title="PIM" metric={`${products.length} products`} detail={`${skuRows.length} SKUs, ${products.filter((product) => product.status === 'published').length} published`} signal={catalogScore === 100 ? 'Ready' : 'Setup'} icon={PackageCheck} onSelect={() => selectCosMode('pim')} />
                  <CosLaneCard title="Listings" metric={`${activeListings}/${listingEntries.length || activeListings}`} detail={`${channelRows.length} marketplace channels mapped`} signal={listingScore >= 80 ? 'Ready' : 'Watch'} icon={PlugZap} onSelect={() => selectCosMode('pim')} />
                  <CosLaneCard title="Inventory" metric={numberFormat.format(totalAtp)} detail={`${lowStockRows.length} low ATP SKUs`} signal={lowStockRows.length ? 'Watch' : 'Ready'} icon={Warehouse} onSelect={() => selectCosMode('pim')} />
                  <CosLaneCard title="Live Commerce" metric={`${liveCommerceSessions.length} sessions`} detail={`${numberFormat.format(liveAllocatedStock)} units allocated across channel and KOL sessions`} signal={liveWatchCount || liveOverAllocated ? 'Watch' : 'Ready'} icon={RadioTower} onSelect={() => selectCosMode('live')} />
                  <CosLaneCard title="OMS" metric={String(orders.length || snapshot.commerceOrders.length)} detail={`${orderRiskCount} risk flags, ${openPayments} payments open`} signal={orderRiskCount || openPayments ? 'Watch' : 'Ready'} icon={ShoppingCart} onSelect={() => selectCosMode('oms')} />
                  <CosLaneCard title="Fulfillment" metric={activeFulfillment ? `${activeFulfillment} active` : 'Clear'} detail={`${exceptionFulfillment} exceptions, ${primeSnapshot.shipmentsCount} shipments`} signal={exceptionFulfillment ? 'Watch' : 'Ready'} icon={Truck} onSelect={() => selectCosMode('ship')} />
                </div>
              </Surface>
            </div>
          </div>
        ) : null}

        {activeCosMode === 'pim' ? (
          <div className="grid gap-4">
            <section className="grid gap-3 md:grid-cols-3">
              <CosKpiCard label="Products" value={String(products.length)} detail={`${skuRows.length} SKUs, ${products.filter((product) => product.status === 'published').length} published`} icon={PackageCheck} tone="emerald" />
              <CosKpiCard label="Listings" value={`${activeListings}/${listingEntries.length || activeListings}`} detail={`${channelRows.length} channels mapped`} icon={PlugZap} tone={listingScore >= 80 ? 'emerald' : 'amber'} />
              <CosKpiCard label="ATP available" value={numberFormat.format(totalAtp)} detail={`${lowStockRows.length} low ATP SKUs`} icon={Warehouse} tone={lowStockRows.length ? 'amber' : 'emerald'} />
            </section>

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <Surface title="Inventory Pressure" subtitle="Lowest ATP SKUs from the multi-warehouse ledger.">
                <div className="overflow-x-auto scrollbar-visible">
                  <table className="w-full min-w-[620px] text-left">
                    <thead className="border-b text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2">SKU</th>
                        <th className="px-2 py-2">Product</th>
                        <th className="px-2 py-2 text-right">ATP</th>
                        <th className="px-2 py-2 text-right">Reserved</th>
                        <th className="px-2 py-2">Signal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {inventoryRows.slice(0, 8).map((row) => (
                        <tr key={row.skuCode}>
                          <td className="px-2 py-2 font-identifier text-xs font-semibold text-foreground">{row.skuCode}</td>
                          <td className="max-w-[240px] truncate px-2 py-2 text-sm font-medium text-muted-foreground">{row.productName}</td>
                          <td className="px-2 py-2 text-right font-identifier text-sm font-semibold">{numberFormat.format(row.atp)}</td>
                          <td className="px-2 py-2 text-right font-identifier text-sm text-muted-foreground">{numberFormat.format(row.reserved)}</td>
                          <td className="px-2 py-2"><StatusPill status={row.signal} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Surface>

              <Surface title="Channel Health" subtitle="Commerce connection coverage for listed products.">
                <div className="divide-y divide-border">
                  {channelRows.map((row) => (
                    <CosMetricRow
                      key={row.channel}
                      label={`${row.channel.toUpperCase()} listings`}
                      value={getChannelHealthValue(row)}
                    />
                  ))}
                  <CosMetricRow label="Payment connectors" value={`${connectedPaymentConnectors}/${paymentConnectors.length}`} />
                </div>
              </Surface>
            </div>
          </div>
        ) : null}

        {activeCosMode === 'live' ? (
          <div className="grid gap-4">
            <section aria-labelledby="internal-channels-heading" className="grid gap-3 md:grid-cols-2">
              <h2 id="internal-channels-heading" className="sr-only">Internal sales channels</h2>
              <div className="rounded-xl border border-border bg-gradient-to-br from-indigo-50 to-background p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground"><Globe2 className="size-5" /></span>
                  <StatusPill status="Live" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">Prime Web</h3>
                <p className="mt-1 text-sm font-medium text-muted-foreground">Owned storefront · 342 products published · Last sync 2 min ago</p>
                <Button asChild variant="outline" size="sm" className="mt-4 h-9 bg-background">
                  <Link to="/builder/theme">Launch Builder <ExternalLink className="size-3.5" /></Link>
                </Button>
              </div>
              <div className="rounded-xl border border-border bg-gradient-to-br from-emerald-50 to-background p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-10 place-items-center rounded-lg bg-emerald-600 text-white"><Store className="size-5" /></span>
                  <StatusPill status="Ready" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">POS Storefront</h3>
                <p className="mt-1 text-sm font-medium text-muted-foreground">3 store registers · Inventory synced · Register ready</p>
                <Button asChild variant="outline" size="sm" className="mt-4 h-9 bg-background">
                  <Link to="/pos/register">Open Register <ExternalLink className="size-3.5" /></Link>
                </Button>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-4">
              <CosKpiCard label="Live sessions" value={String(liveCommerceSessions.length)} detail={`${liveWatchCount} sessions in watch state`} icon={RadioTower} tone={liveWatchCount ? 'amber' : 'emerald'} />
              <CosKpiCard label="Allocated stock" value={numberFormat.format(liveAllocatedStock)} detail={`${liveAllocationUsage}% of sellable stock, ${numberFormat.format(liveBufferStock)} buffer`} icon={Boxes} tone={liveOverAllocated ? 'rose' : 'emerald'} />
              <CosKpiCard label="Committed" value={numberFormat.format(liveReservedStock)} detail={`${liveReservationUsage}% sold or reserved for live sessions`} icon={ClipboardList} tone={liveReservationUsage > 85 ? 'amber' : 'emerald'} />
              <CosKpiCard label="Live orders" value={numberFormat.format(liveOrders)} detail={`${currency.format(liveRevenue)} attributed revenue`} icon={ShoppingCart} tone="violet" />
            </section>

            <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
              <Surface title="Live Selling Run Sheet" subtitle="Session-level stock, host, product set, and order capture.">
                <div className="overflow-x-auto scrollbar-visible">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="border-b text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2">Session</th>
                        <th className="px-2 py-2">Channel</th>
                        <th className="px-2 py-2">Host</th>
                        <th className="px-2 py-2 text-right">Allocated</th>
                        <th className="px-2 py-2 text-right">Sold</th>
                        <th className="px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {liveCommerceSessions.map((session) => (
                        <tr key={session.id}>
                          <td className="max-w-[220px] px-2 py-3">
                            <div className="truncate text-sm font-semibold text-foreground">{session.name}</div>
                            <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{session.productSet} - {session.nextAction}</div>
                          </td>
                          <td className="px-2 py-3 text-sm font-medium text-muted-foreground">{session.channel}</td>
                          <td className="px-2 py-3 text-sm font-medium text-muted-foreground">{session.host}</td>
                          <td className="px-2 py-3 text-right font-identifier text-sm font-semibold text-foreground">{numberFormat.format(session.allocated)}</td>
                          <td className="px-2 py-3 text-right font-identifier text-sm text-muted-foreground">{numberFormat.format(session.sold)} / {numberFormat.format(session.orders)}</td>
                          <td className="px-2 py-3"><StatusPill status={session.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Surface>

              <Surface title="Product Set" subtitle="Bundle lines used by each live session.">
                <div className="divide-y divide-border">
                  {liveCommerceProductSet.map((line) => (
                    <div key={line.sku} className="grid gap-1 py-3">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-foreground">{line.name}</div>
                          <div className="mt-0.5 font-identifier text-xs font-semibold text-muted-foreground">{line.sku}</div>
                        </div>
                        <span className="shrink-0 rounded-md border bg-background px-2 py-1 text-xs font-semibold text-foreground">x{line.quantity}</span>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">{line.role}</div>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <Surface title="Inventory Allocation" subtitle={`${numberFormat.format(liveCommerceTotalStock)} total units split by channel, session, KOL, and buffer.`}>
                <div className="grid gap-3">
                  {liveCommerceAllocations.map((allocation) => {
                    const percent = Math.round((allocation.units / liveCommerceTotalStock) * 100);
                    return (
                      <div key={allocation.label} className="grid gap-2">
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">{allocation.label}</div>
                            <div className="truncate text-xs font-medium text-muted-foreground">{allocation.channel} - {allocation.owner} - {allocation.purpose}</div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="font-identifier text-sm font-semibold text-foreground">{numberFormat.format(allocation.units)}</span>
                            <StatusPill status={allocation.status} />
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn('h-full rounded-full', allocation.status === 'Watch' ? 'bg-warning' : allocation.label === 'Buffer Stock' ? 'bg-primary' : 'bg-emerald-500')}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Surface>

              <Surface title="Guardrails" subtitle="Reservation rules for live campaign stock.">
                <div className="divide-y divide-border">
                  <CosMetricRow label="Over-allocation check" value={liveOverAllocated ? 'Blocked' : 'Pass'} />
                  <CosMetricRow label="Sellable stock assigned" value={`${numberFormat.format(liveAllocatedStock)} / ${numberFormat.format(liveSellingStock)}`} />
                  <CosMetricRow label="Buffer stock" value={numberFormat.format(liveBufferStock)} />
                  <CosMetricRow label="Reservation logic" value="On hand - unpaid - paid - allocated - safety - campaign lock" />
                  <CosMetricRow label="Performance grain" value="Campaign, channel, session, KOL" />
                </div>
              </Surface>
            </div>

            <Surface title="Channel Support Matrix" subtitle="Live selling coverage for Lark seeding conversations.">
              <div className="grid gap-3 lg:grid-cols-4">
                {liveCommerceChannelSupport.map((row) => (
                  <div key={row.channel} className="min-w-0 rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-semibold text-foreground">{row.channel}</div>
                      <StatusPill status={row.status} />
                    </div>
                    <p className="mt-3 min-h-10 text-sm font-medium leading-5 text-muted-foreground">{row.role}</p>
                    <div className="mt-3 truncate border-t border-border pt-3 text-xs font-semibold text-muted-foreground">{row.integration}</div>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        ) : null}

        {activeCosMode === 'oms' ? (
          <div className="grid gap-4">
            <section className="grid gap-3 md:grid-cols-4">
              <CosKpiCard label="Order value" value={formatOrderValue(totalOrderValue)} detail={`${numberFormat.format(activeOrders)} active orders`} icon={ShoppingCart} tone="violet" />
              <CosKpiCard label="Open payments" value={String(openPayments)} detail={currency.format(paymentExposure)} icon={WalletCards} tone={openPayments ? 'amber' : 'emerald'} />
              <CosKpiCard label="Risk flags" value={String(orderRiskCount)} detail={`${orders.length || snapshot.commerceOrders.length} total orders`} icon={AlertTriangle} tone={orderRiskCount ? 'rose' : 'emerald'} />
              <CosKpiCard label="Paid proof" value={currency.format(paidOrderValue)} detail="confirmed payment value" icon={ShieldCheck} tone="emerald" />
            </section>

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <Surface title="Latest OMS Orders" subtitle="Recent order lifecycle and risk flags.">
                <div className="divide-y divide-border">
                  {(latestOrders.length ? latestOrders : snapshot.commerceOrders).slice(0, 7).map((order) => (
                    'customer_name' in order ? (
                      <CosOrderRow
                        key={order.id}
                        title={order.order_id}
                        detail={`${order.customer_name} - ${order.channel}`}
                        value={formatOrderValue(order.total_amount)}
                        status={order.lifecycle_stage}
                        risk={order.risk_flags.length ? order.risk_flags.join(', ') : 'No risk flag'}
                      />
                    ) : (
                      <CosOrderRow
                        key={order.id}
                        title={order.customer}
                        detail={`${order.type} - ${order.paymentStatus}`}
                        value={currency.format(order.value)}
                        status={order.status}
                        risk={order.owner}
                      />
                    )
                  ))}
                </div>
              </Surface>

              <Surface title="OMS Queue" subtitle="Payment and order blockers.">
                <div className="divide-y divide-border">
                  {(orderActions.length ? orderActions : [clearAction]).map((action) => (
                    <CosActionRow key={action.title} action={action} onSelect={selectCosMode} />
                  ))}
                </div>
              </Surface>
            </div>
          </div>
        ) : null}

        {activeCosMode === 'ship' ? (
          <div className="grid gap-4">
            <section className="grid gap-3 md:grid-cols-4">
              <CosKpiCard label="Fulfillment" value={activeFulfillment ? `${activeFulfillment} active` : 'Clear'} detail={`${primeSnapshot.shipmentsCount} shipments`} icon={Truck} tone={exceptionFulfillment ? 'rose' : 'emerald'} />
              <CosKpiCard label="Exceptions" value={String(exceptionFulfillment)} detail="manual review jobs" icon={AlertTriangle} tone={exceptionFulfillment ? 'rose' : 'emerald'} />
              <CosKpiCard label="Returns" value={String(primeSnapshot.returnsCount)} detail="return cases attached" icon={RefreshCcw} tone="amber" />
              <CosKpiCard label="Forecast pressure" value={String(highRiskForecasts.length)} detail="high-risk demand signals" icon={Target} tone={highRiskForecasts.length ? 'amber' : 'emerald'} />
            </section>

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <Surface title="Fulfillment Queue" subtitle="Shipment blockers and forecast pressure.">
                <div className="divide-y divide-border">
                  {(shipActions.length ? shipActions : [clearAction]).map((action) => (
                    <CosActionRow key={action.title} action={action} onSelect={selectCosMode} />
                  ))}
                </div>
              </Surface>

              <Surface
                title="Operating Profile"
                subtitle="Core COS rules."
                action={isEditing ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-8 rounded-md px-2 text-xs" onClick={cancelEditing}>Cancel</Button>
                    <Button size="sm" className={cn('h-8 rounded-md px-2 text-xs', primaryButtonClass)} onClick={saveProfile}>Save</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 rounded-md px-2 text-xs" onClick={startEditing}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                )}
              >
                {isEditing ? (
                  <div className="grid gap-3">
                    <Field label="System name" value={draftProfile.systemName} onChange={(value) => setDraftProfile((profile) => ({ ...profile, systemName: value }))} />
                    <Field label="Owner" value={draftProfile.owner} onChange={(value) => setDraftProfile((profile) => ({ ...profile, owner: value }))} />
                    <Field label="Channels" value={draftProfile.channels} onChange={(value) => setDraftProfile((profile) => ({ ...profile, channels: value }))} />
                    <Field label="Fulfillment model" value={draftProfile.fulfillmentModel} onChange={(value) => setDraftProfile((profile) => ({ ...profile, fulfillmentModel: value }))} />
                    <Field label="Payment policy" value={draftProfile.paymentPolicy} onChange={(value) => setDraftProfile((profile) => ({ ...profile, paymentPolicy: value }))} />
                    <Field label="SLA" value={draftProfile.sla} onChange={(value) => setDraftProfile((profile) => ({ ...profile, sla: value }))} />
                    <TextareaField label="Note" value={draftProfile.note} onChange={(value) => setDraftProfile((profile) => ({ ...profile, note: value }))} />
                  </div>
                ) : (
                  <div className="grid gap-0">
                    <CosProfileRow label="System" value={cosProfile.systemName} />
                    <CosProfileRow label="Owner" value={cosProfile.owner} />
                    <CosProfileRow label="SLA" value={cosProfile.sla} />
                    <CosProfileRow label="Policy" value={cosProfile.paymentPolicy} multiline />
                  </div>
                )}
              </Surface>
            </div>
          </div>
        ) : null}
        </main>
      </div>
    </div>
  );
}

function CosOpsPanel({
  activeMode,
  query,
  onQueryChange,
  actions,
  channelRows,
  paymentConnectorValue,
  onSelect,
}: {
  activeMode: CosMode;
  query: string;
  onQueryChange: (value: string) => void;
  actions: CosQueueAction[];
  channelRows: CosChannelRow[];
  paymentConnectorValue: string;
  onSelect: (mode: CosMode) => void;
}) {
  const activeModeLabel = activeMode === 'control' ? 'Control' : activeMode === 'live' ? 'Live' : activeMode.toUpperCase();

  return (
    <section className="flex min-h-0 min-w-0 flex-col border-r border-border bg-[hsl(var(--surface-control))]">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">COS queue</h2>
          <span className="font-identifier text-xs text-muted-foreground">{activeModeLabel}</span>
        </div>
        <div className="mt-3 grid gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Find issue or channel"
              className="h-9 rounded-md border-border bg-background pl-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <CosFocusButton active={activeMode === 'control'} label="Control" icon={Activity} onClick={() => onSelect('control')} />
            <CosFocusButton active={activeMode === 'pim'} label="PIM" icon={PackageCheck} onClick={() => onSelect('pim')} />
            <CosFocusButton active={activeMode === 'live'} label="Live" icon={RadioTower} onClick={() => onSelect('live')} />
            <CosFocusButton active={activeMode === 'oms'} label="OMS" icon={ShoppingCart} onClick={() => onSelect('oms')} />
            <CosFocusButton active={activeMode === 'ship'} label="Ship" icon={Truck} onClick={() => onSelect('ship')} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-visible">
        <div className="border-b border-border px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
          Actions
        </div>
        {actions.length ? actions.map((action) => (
          <button
            key={action.title}
            type="button"
            onClick={() => onSelect(action.mode)}
            className="relative grid w-full gap-2 border-b border-border px-4 py-4 text-left transition-colors hover:bg-[hsl(var(--surface-row-hover))]"
          >
            {activeMode === action.mode ? <span className="absolute inset-y-0 left-0 w-1 bg-primary" /> : null}
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{action.title}</div>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{action.detail}</p>
              </div>
              <PriorityPill priority={action.priority} />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-primary">
              <span>{action.cta}</span>
              <ChevronRight className="size-3.5" />
            </div>
          </button>
        )) : (
          <div className="border-b border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No COS actions match this search.
          </div>
        )}

        <div className="border-b border-border px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
          Channels
        </div>
        {channelRows.length ? channelRows.map((row) => (
          <button
            key={row.channel}
            type="button"
            onClick={() => onSelect('pim')}
            className="grid w-full gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--surface-row-hover))]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-foreground">{row.channel.toUpperCase()}</span>
              <span className="font-identifier text-xs text-muted-foreground">{row.active}/{row.listings || row.active}</span>
            </div>
            <div className="truncate text-xs font-medium text-muted-foreground">{formatStatus(row.connectorStatus)}</div>
          </button>
        )) : (
          <div className="border-b border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No channels match this search.
          </div>
        )}
        <button
          type="button"
          onClick={() => onSelect('oms')}
          className="grid w-full gap-1 px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--surface-row-hover))]"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-semibold text-foreground">Payment connectors</span>
            <span className="font-identifier text-xs text-muted-foreground">{paymentConnectorValue}</span>
          </div>
          <div className="truncate text-xs font-medium text-muted-foreground">Payment readiness</div>
        </button>
      </div>
    </section>
  );
}

function CosFocusButton({ active, label, icon: Icon, onClick }: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function CosModeRail({
  activeMode,
  readinessScore,
  productsCount,
  liveSessionsCount,
  ordersCount,
  activeFulfillment,
  onSelect,
}: {
  activeMode: CosMode;
  readinessScore: number;
  productsCount: number;
  liveSessionsCount: number;
  ordersCount: number;
  activeFulfillment: number;
  onSelect: (mode: CosMode) => void;
}) {
  return (
    <aside className="border-r border-border bg-background">
      <div className="grid grid-cols-1">
        <CosRailItem active={activeMode === 'control'} label="Control" value={`${readinessScore}%`} icon={Activity} onClick={() => onSelect('control')} />
        <CosRailItem active={activeMode === 'pim'} label="PIM" value={String(productsCount)} icon={PackageCheck} onClick={() => onSelect('pim')} />
        <CosRailItem active={activeMode === 'live'} label="Live" value={String(liveSessionsCount)} icon={RadioTower} onClick={() => onSelect('live')} />
        <CosRailItem active={activeMode === 'oms'} label="OMS" value={String(ordersCount)} icon={ShoppingCart} onClick={() => onSelect('oms')} />
        <CosRailItem active={activeMode === 'ship'} label="Ship" value={String(activeFulfillment)} icon={Truck} onClick={() => onSelect('ship')} />
      </div>
    </aside>
  );
}

function CosRailItem({ active = false, label, value, icon: Icon, onClick }: {
  active?: boolean;
  label: string;
  value: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group flex min-h-[92px] w-full flex-col items-center justify-center gap-3 border-b border-border px-3 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase leading-none">{label}</span>
        <span className="mt-1 block font-identifier text-base font-semibold leading-none">{value}</span>
      </span>
    </button>
  );
}

function CosKpiCard({ label, value, detail, icon: Icon, tone }: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: 'emerald' | 'amber' | 'rose' | 'violet';
}) {
  return (
    <article className="prime-dashboard-surface min-h-[148px] min-w-0 rounded-lg border px-4 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="line-clamp-2 min-w-0 pr-1 text-xs font-semibold uppercase leading-5 text-muted-foreground">{label}</div>
        <span className={cn(
          'grid size-8 shrink-0 place-items-center rounded-md border',
          tone === 'emerald' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          tone === 'amber' && 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
          tone === 'rose' && 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
          tone === 'violet' && 'border-primary/20 bg-primary/10 text-primary',
        )}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 min-w-0 truncate whitespace-nowrap font-display text-2xl font-semibold leading-tight text-foreground tabular-nums">{value}</div>
      <div className="mt-2 line-clamp-2 text-xs font-medium leading-4 text-muted-foreground">{detail}</div>
    </article>
  );
}

function CosLaneCard({ title, metric, detail, signal, icon: Icon, onSelect }: {
  title: string;
  metric: string;
  detail: string;
  signal: 'Ready' | 'Watch' | 'Setup';
  icon: LucideIcon;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="group min-w-0 border-b border-border pb-3 text-left transition-colors last:border-b-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3 lg:last:border-r-0">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          <span className="truncate">{title}</span>
        </span>
        <StatusPill status={signal} />
      </div>
      <div className="mt-3 font-identifier text-xl font-semibold leading-none text-foreground">{metric}</div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-muted-foreground">{detail}</p>
    </button>
  );
}

function CosOrderRow({ title, detail, value, status, risk }: {
  title: string;
  detail: string;
  value: string;
  status: string;
  risk: string;
}) {
  return (
    <div className="grid gap-2 py-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{title}</div>
          <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{detail}</div>
        </div>
        <div className="shrink-0 text-right font-identifier text-sm font-semibold text-foreground">{value}</div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <StatusPill status={status} />
        <span className="truncate text-xs font-medium text-muted-foreground">{risk}</span>
      </div>
    </div>
  );
}

function CosActionRow({ action, onSelect }: {
  action: { title: string; detail: string; priority: 'High' | 'Medium' | 'Low'; mode: CosMode; cta: string };
  onSelect: (mode: CosMode) => void;
}) {
  return (
    <div className="grid gap-3 py-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{action.title}</div>
          <p className="mt-1 text-sm font-medium leading-5 text-muted-foreground">{action.detail}</p>
        </div>
        <PriorityPill priority={action.priority} />
      </div>
      <Button size="sm" variant="outline" className="h-8 w-fit rounded-md px-2 text-xs" onClick={() => onSelect(action.mode)}>
        {action.cta}
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  );
}

function CosMetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 py-3">
      <span className="min-w-0 text-sm font-medium text-muted-foreground">{label}</span>
      <span className="shrink-0 text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function CosProfileRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="grid gap-1 border-b border-border py-2.5 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={cn('min-w-0 break-words text-sm font-semibold leading-5 text-foreground', multiline ? 'text-foreground' : '')}>{value}</div>
    </div>
  );
}

function ServiceView({ snapshot }: { snapshot: GrowthOsSnapshot }) {
  const totalServiceValue = snapshot.serviceBookings.reduce((sum, booking) => sum + booking.value, 0);
  const unassignedBookings = snapshot.serviceBookings.filter((booking) => booking.staff === 'Unassigned').length;
  const activeBookings = snapshot.serviceBookings.filter((booking) => booking.status !== 'confirmed').length;

  return (
    <>
      <KpiGrid items={[
        { label: 'Bookings', value: numberFormat.format(snapshot.metrics.serviceBookings), delta: '14%', icon: CalendarCheck },
        { label: 'Queue Value', value: currency.format(totalServiceValue), icon: CircleDollarSign },
        { label: 'Unassigned', value: String(unassignedBookings), icon: UsersRound },
        { label: 'Active', value: String(activeBookings), icon: CheckCircle2 },
      ]} />
      <Surface title="Bookings">
        <SimpleTable
          columns={['Customer', 'Service', 'Staff', 'Schedule', 'Status', 'Value']}
          rows={snapshot.serviceBookings.map((booking) => [
            booking.customer,
            booking.service,
            booking.staff,
            booking.scheduledAt,
            <StatusPill key={`${booking.id}-status`} status={booking.status} />,
            currency.format(booking.value),
          ])}
        />
      </Surface>
    </>
  );
}

function getConnectorDraft(
  connector: GrowthConnector,
  drafts: Record<string, GrowthConnectorSetupPayload>,
): GrowthConnectorSetupPayload {
  return drafts[connector.id] || {
    accountRef: connector.accountRef || '',
    appId: connector.credentialMeta?.appId || '',
    accessToken: '',
    webhookUrl: connector.webhookUrl || `https://api.primeos.local/webhooks/connectors/${connector.provider}`,
    verifyToken: '',
    environment: connector.environment || 'production',
  };
}

function getConnectorSetupDescription(connector: GrowthConnector) {
  if (connector.provider === 'myinvois') {
    return 'Malaysia MyInvois sandbox or production credentials. Keep client identity and certificate vault separate by environment.';
  }

  return connector.businessUseCase || 'Connection settings.';
}

function getConnectorFieldLabel(connector: GrowthConnector, field: keyof GrowthConnectorSetupPayload) {
  if (connector.provider === 'myinvois') {
    if (field === 'accountRef') return 'Taxpayer TIN / entity reference';
    if (field === 'appId') return 'Client ID';
    if (field === 'accessToken') return 'Client secret';
    if (field === 'webhookUrl') return 'Status callback URL';
    if (field === 'verifyToken') return 'Certificate ref / secret';
  }

  if (connector.adapterProfile?.oauth) {
    if (field === 'accountRef') return 'Account / Mailbox / Property';
    if (field === 'appId') return 'OAuth Client ID';
    if (field === 'accessToken') return 'OAuth Client Secret';
    if (field === 'webhookUrl') return 'Webhook URL';
    return 'Developer token / Webhook Secret';
  }

  if (field === 'accountRef') return 'Account / Page ID';
  if (field === 'appId') return 'App ID / Client ID';
  if (field === 'accessToken') return 'Access Token / API Key';
  if (field === 'webhookUrl') return 'Webhook URL';
  return 'Verify Token / Webhook Secret';
}

function validateConnectorDraft(draft: GrowthConnectorSetupPayload, requiredFields: string[]) {
  const missing: string[] = [];

  if (requiredFields.includes('accountRef') && draft.accountRef.trim().length < 2) missing.push('Account');
  if (requiredFields.includes('appId') && draft.appId.trim().length < 2) missing.push('App ID');
  if (requiredFields.includes('accessToken') && draft.accessToken.trim().length < 8) missing.push('Access token');
  if (requiredFields.includes('webhookUrl') && !/^https?:\/\/.+/i.test(draft.webhookUrl.trim())) missing.push('Webhook URL');
  if (requiredFields.includes('verifyToken') && draft.verifyToken.trim().length < 6) missing.push('Verify token');

  return missing;
}

function ConnectorSetupField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password';
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-foreground">
      {label}
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border-border bg-card"
      />
    </label>
  );
}

function ConnectorCapability({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={cn(
      'inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold',
      enabled ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-border bg-muted text-muted-foreground'
    )}>
      {label}
    </span>
  );
}

function ConnectorStatusDot({ status }: { status: GrowthStatus }) {
  const statusLabel = status === 'connected' ? 'Connected' : status === 'watch' || status === 'tested' ? 'Attention needed' : 'Disconnected';
  return (
    <span
      role="status"
      aria-label={statusLabel}
      className={cn(
        'mt-1 size-2.5 shrink-0 rounded-full',
        status === 'connected' ? 'bg-emerald-500' : status === 'watch' || status === 'tested' ? 'bg-amber-400' : 'bg-slate-300'
      )}
    />
  );
}

const connectorPriorityRank: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const connectorPriorityWaveOrder = [
  'Wave 1 - Messaging and social capture',
  'Wave 1 - Commerce and live selling',
  'Wave 1 - Payments',
  'Wave 2 - Regional messaging',
  'Wave 2 - Email and productivity',
  'Wave 2 - Payments and compliance',
  'Wave 2 - Ads and analytics',
  'Wave 3 - Commerce expansion',
  'Wave 3 - Content and ads expansion',
  'Wave 3 - Productivity expansion',
  'Wave 4 - Regional expansion',
  'Wave 4 - Long tail',
];
const connectorPriorityFallbacks: Record<string, { priorityTier: 'P0' | 'P1' | 'P2' | 'P3'; priorityWave: string }> = {
  whatsapp: { priorityTier: 'P0', priorityWave: 'Wave 1 - Messaging and social capture' },
  messenger: { priorityTier: 'P0', priorityWave: 'Wave 1 - Messaging and social capture' },
  instagram: { priorityTier: 'P0', priorityWave: 'Wave 1 - Messaging and social capture' },
  facebook: { priorityTier: 'P0', priorityWave: 'Wave 1 - Messaging and social capture' },
  tiktok: { priorityTier: 'P0', priorityWave: 'Wave 1 - Messaging and social capture' },
  zalo: { priorityTier: 'P0', priorityWave: 'Wave 1 - Messaging and social capture' },
  shopee: { priorityTier: 'P0', priorityWave: 'Wave 1 - Commerce and live selling' },
  lazada: { priorityTier: 'P0', priorityWave: 'Wave 1 - Commerce and live selling' },
  tiktok_shop: { priorityTier: 'P0', priorityWave: 'Wave 1 - Commerce and live selling' },
  shopify: { priorityTier: 'P0', priorityWave: 'Wave 1 - Commerce and live selling' },
  stripe: { priorityTier: 'P0', priorityWave: 'Wave 1 - Payments' },
  vnpay: { priorityTier: 'P0', priorityWave: 'Wave 1 - Payments' },
  line: { priorityTier: 'P1', priorityWave: 'Wave 2 - Regional messaging' },
  telegram: { priorityTier: 'P1', priorityWave: 'Wave 2 - Regional messaging' },
  gmail: { priorityTier: 'P1', priorityWave: 'Wave 2 - Email and productivity' },
  outlook: { priorityTier: 'P1', priorityWave: 'Wave 2 - Email and productivity' },
  google_sheets: { priorityTier: 'P1', priorityWave: 'Wave 2 - Email and productivity' },
  slack: { priorityTier: 'P1', priorityWave: 'Wave 2 - Email and productivity' },
  paypal: { priorityTier: 'P1', priorityWave: 'Wave 2 - Payments and compliance' },
  momo: { priorityTier: 'P1', priorityWave: 'Wave 2 - Payments and compliance' },
  myinvois: { priorityTier: 'P1', priorityWave: 'Wave 2 - Payments and compliance' },
  meta_ads: { priorityTier: 'P1', priorityWave: 'Wave 2 - Ads and analytics' },
  tiktok_ads: { priorityTier: 'P1', priorityWave: 'Wave 2 - Ads and analytics' },
  google_analytics: { priorityTier: 'P1', priorityWave: 'Wave 2 - Ads and analytics' },
};

function getConnectorPriorityTier(connector: GrowthConnector) {
  return connector.priorityTier || connectorPriorityFallbacks[connector.provider]?.priorityTier || 'P3';
}

function getConnectorPriorityWave(connector: GrowthConnector) {
  return connector.priorityWave || connectorPriorityFallbacks[connector.provider]?.priorityWave || 'Wave 4 - Long tail';
}

function getConnectorPriorityWaveRank(wave: string) {
  const index = connectorPriorityWaveOrder.indexOf(wave);
  return index >= 0 ? index : 99;
}

function compareConnectorPriority(left: GrowthConnector, right: GrowthConnector) {
  const leftRank = connectorPriorityRank[getConnectorPriorityTier(left)] ?? 99;
  const rightRank = connectorPriorityRank[getConnectorPriorityTier(right)] ?? 99;
  if (leftRank !== rightRank) return leftRank - rightRank;

  const leftWave = getConnectorPriorityWave(left);
  const rightWave = getConnectorPriorityWave(right);
  const leftWaveRank = getConnectorPriorityWaveRank(leftWave);
  const rightWaveRank = getConnectorPriorityWaveRank(rightWave);
  if (leftWaveRank !== rightWaveRank) return leftWaveRank - rightWaveRank;
  const waveCompare = leftWave.localeCompare(rightWave);
  if (waveCompare !== 0) return waveCompare;

  const categoryCompare = left.category.localeCompare(right.category);
  if (categoryCompare !== 0) return categoryCompare;

  return left.name.localeCompare(right.name);
}

const connectorPriorityLabels: Record<string, string> = {
  P0: 'Do first',
  P1: 'Do second',
  P2: 'Expansion',
  P3: 'Long tail',
};

function createConnectorReadinessBucket(id: string, label: string, tier: string | null = null): GrowthConnectorReadinessBucket {
  return {
    id,
    label,
    tier,
    total: 0,
    connected: 0,
    tested: 0,
    setupRequired: 0,
    disconnected: 0,
    watch: 0,
    genericAdapters: 0,
    oauth: 0,
    webhook: 0,
    probe: 0,
    outbound: 0,
    coverage: 0,
    nextProviders: [],
  };
}

function addConnectorToReadinessBucket(bucket: GrowthConnectorReadinessBucket, connector: GrowthConnector) {
  bucket.total += 1;
  if (connector.status === 'connected') bucket.connected += 1;
  if (connector.status === 'tested') bucket.tested += 1;
  if (connector.status === 'setup_required') bucket.setupRequired += 1;
  if (connector.status === 'disconnected') {
    bucket.disconnected += 1;
    bucket.setupRequired += 1;
  }
  if (connector.status === 'watch') bucket.watch += 1;
  if ((connector.adapterProfile?.adapterKey || 'generic_rest_connector') === 'generic_rest_connector') bucket.genericAdapters += 1;
  if (connector.adapterProfile?.oauth) bucket.oauth += 1;
  if (connector.adapterProfile?.supportsWebhook) bucket.webhook += 1;
  if (connector.adapterProfile?.probe) bucket.probe += 1;
  if (connector.adapterProfile?.supportsOutbound || connector.outboundEnabled) bucket.outbound += 1;
  if (connector.status !== 'connected' && bucket.nextProviders.length < 6) bucket.nextProviders.push(connector.name);
}

function finalizeConnectorReadinessBucket(bucket: GrowthConnectorReadinessBucket): GrowthConnectorReadinessBucket {
  return {
    ...bucket,
    coverage: bucket.total ? Math.round((bucket.connected / bucket.total) * 100) : 0,
  };
}

function buildClientConnectorReadinessSummary(connectors: GrowthConnector[]): GrowthConnectorReadinessSummary {
  const sorted = connectors.slice().sort(compareConnectorPriority);
  const total = createConnectorReadinessBucket('all', 'All connectors');
  const tierBuckets = new Map(['P0', 'P1', 'P2', 'P3'].map((tier) => [tier, createConnectorReadinessBucket(tier, connectorPriorityLabels[tier], tier)]));
  const categoryBuckets = new Map<string, GrowthConnectorReadinessBucket>();
  const waveBuckets = new Map<string, GrowthConnectorReadinessBucket>();

  sorted.forEach((connector) => {
    const tier = getConnectorPriorityTier(connector);
    const wave = getConnectorPriorityWave(connector);
    if (!tierBuckets.has(tier)) tierBuckets.set(tier, createConnectorReadinessBucket(tier, connectorPriorityLabels[tier] || tier, tier));
    if (!categoryBuckets.has(connector.category)) categoryBuckets.set(connector.category, createConnectorReadinessBucket(connector.category.toLowerCase(), connector.category));
    if (!waveBuckets.has(wave)) waveBuckets.set(wave, createConnectorReadinessBucket(wave.toLowerCase().replace(/[^a-z0-9]+/g, '_'), wave, tier));
    addConnectorToReadinessBucket(total, connector);
    addConnectorToReadinessBucket(tierBuckets.get(tier)!, connector);
    addConnectorToReadinessBucket(categoryBuckets.get(connector.category)!, connector);
    addConnectorToReadinessBucket(waveBuckets.get(wave)!, connector);
  });

  const nextSetup = sorted
    .filter((connector) => connector.status !== 'connected')
    .slice(0, 12)
    .map((connector) => ({
      provider: connector.provider,
      name: connector.name,
      category: connector.category,
      status: connector.status,
      priorityTier: getConnectorPriorityTier(connector),
      priorityWave: getConnectorPriorityWave(connector),
      setupMode: connector.setupMode,
      requiredFields: connector.requiredFields || [],
      adapterKey: connector.adapterProfile?.adapterKey || 'generic_rest_connector',
      needsWebhook: Boolean(connector.adapterProfile?.supportsWebhook),
      needsOAuth: Boolean(connector.adapterProfile?.oauth),
      canProbe: Boolean(connector.adapterProfile?.probe),
    }));

  return {
    ...finalizeConnectorReadinessBucket(total),
    tiers: Array.from(tierBuckets.values()).map(finalizeConnectorReadinessBucket),
    categories: Array.from(categoryBuckets.values()).map(finalizeConnectorReadinessBucket),
    waves: Array.from(waveBuckets.values()).map(finalizeConnectorReadinessBucket),
    nextSetup,
  };
}

function ConnectorPriorityBadge({ connector }: { connector: GrowthConnector }) {
  const tier = getConnectorPriorityTier(connector);

  return (
    <span className={cn(
      'inline-flex h-6 items-center rounded-md border px-2 text-[11px] font-semibold',
      tier === 'P0' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      tier === 'P1' && 'border-primary/20 bg-primary/10 text-primary',
      tier === 'P2' && 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      tier === 'P3' && 'border-border bg-muted text-muted-foreground',
    )}>
      {tier}
    </span>
  );
}

function ConnectorReadinessTierCard({ bucket, onSelect }: { bucket: GrowthConnectorReadinessBucket; onSelect: () => void }) {
  const setupCount = bucket.setupRequired + bucket.watch + bucket.tested;
  const nextProviders = bucket.nextProviders.slice(0, 3).join(', ');

  return (
    <button
      type="button"
      className="min-w-0 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onSelect}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase text-muted-foreground">{bucket.id}</div>
          <div className="mt-1 truncate text-sm font-semibold text-foreground">{bucket.label}</div>
        </div>
        <span className={cn(
          'shrink-0 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums',
          bucket.coverage >= 80 && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          bucket.coverage > 0 && bucket.coverage < 80 && 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
          bucket.coverage === 0 && 'border-border bg-muted text-muted-foreground',
        )}>
          {bucket.coverage}%
        </span>
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
        <span className="text-foreground">{bucket.connected}/{bucket.total} connected</span>
        <span>{setupCount} next</span>
        <span>{bucket.webhook} webhook</span>
        <span>{bucket.oauth} OAuth</span>
      </div>
      <div className="mt-2 min-h-4 truncate text-xs font-medium text-muted-foreground">
        {nextProviders || 'Clear'}
      </div>
    </button>
  );
}

function ConnectorWebhookEventRow({ event }: { event: GrowthConnectorWebhookEvent }) {
  return (
    <div className="grid gap-1 border-b border-border py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-semibold text-foreground">{event.eventType}</div>
        <span className={cn(
          'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
          event.signatureStatus === 'verified'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : 'border-border bg-muted text-muted-foreground',
        )}>
          {event.signatureStatus || event.status}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
        <span className="truncate">{event.externalEventId}</span>
        <span>{event.webhookSecurityMode || event.adapterKey}</span>
        {event.domainRoute ? <span>{event.domainRoute}</span> : null}
        <span>{new Date(event.receivedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}

function formatDomainEventStatus(status: string) {
  if (status === 'retry_pending') return 'Retry pending';
  if (status === 'dead_letter') return 'Dead letter';
  if (status === 'requeued') return 'Requeued';
  return formatStatus(status as GrowthStatus);
}

function ConnectorQueueMetric({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' | 'rose' | 'slate' }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-muted/30 px-2.5 py-2">
      <div className="truncate text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={cn(
        'mt-1 text-base font-semibold',
        tone === 'emerald' && 'text-emerald-700 dark:text-emerald-300',
        tone === 'amber' && 'text-amber-700 dark:text-amber-300',
        tone === 'rose' && 'text-rose-700 dark:text-rose-300',
        tone === 'slate' && 'text-foreground',
      )}>
        {value}
      </div>
    </div>
  );
}

function ConnectorDomainRecordRow({ record }: { record: GrowthConnectorDomainRecord }) {
  const amount = typeof record.amount === 'number' && Number.isFinite(record.amount)
    ? `${record.currency ? `${record.currency} ` : ''}${record.amount.toLocaleString()}`
    : null;
  const detail = record.textPreview || record.orderRef || record.paymentRef || record.workflowRef || record.documentRef || record.metricRef || record.externalRef;

  return (
    <div className="grid gap-1 border-b border-border py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-semibold text-foreground">{record.domain} · {record.externalRef}</div>
        <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {formatDomainEventStatus(record.status)}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
        <span className="truncate">{detail}</span>
        {amount ? <span>{amount}</span> : null}
        <span>{new Date(record.updatedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}

function ConnectorReadinessCheckRow({ check }: { check: GrowthConnectorReadinessCheck }) {
  const statusTone = check.status === 'ready' || check.status === 'not_required'
    ? 'emerald'
    : check.status === 'missing'
      ? 'rose'
      : 'amber';

  return (
    <div className="grid gap-1 border-b border-border py-2 last:border-b-0">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-semibold text-foreground">{check.label}</div>
        <span className={cn(
          'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
          statusTone === 'emerald' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          statusTone === 'amber' && 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
          statusTone === 'rose' && 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        )}>
          {formatStatus(check.status as GrowthStatus)}
        </span>
      </div>
      <div className="break-words text-xs font-medium leading-5 text-muted-foreground">{check.detail}</div>
    </div>
  );
}

function ConnectorOAuthSessionRow({ session }: { session: GrowthConnectorOAuthSession }) {
  const isReady = session.status === 'authorization_code_received' || session.status === 'token_exchanged';
  const isFailed = session.status === 'failed' || session.status === 'expired' || session.status === 'token_exchange_failed';
  const isRevoked = session.status === 'revoked';

  return (
    <div className="grid gap-1 border-t border-border pt-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-semibold text-foreground">{session.oauthProvider} OAuth</div>
        <span className={cn(
          'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
          isReady && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          isFailed && 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
          isRevoked && 'border-border bg-muted text-muted-foreground',
          !isReady && !isFailed && !isRevoked && 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        )}>
          {formatDomainEventStatus(session.status)}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
        <span className="truncate">{session.accountRef}</span>
        {session.accessTokenLast4 ? <span>token ****{session.accessTokenLast4}</span> : null}
        <span>{new Date(session.revokedAt || session.tokenExpiresAt || session.expiresAt).toLocaleString()}</span>
      </div>
      {session.error ? <div className="text-xs font-medium leading-5 text-rose-700 dark:text-rose-300">{session.error}</div> : null}
    </div>
  );
}

function ConnectorProbeResultRow({ result }: { result: GrowthConnectorProbeResult }) {
  return (
    <div className="grid gap-1 border-t border-border pt-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-semibold text-foreground">Live probe</div>
        <span className={cn(
          'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
          result.ok
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        )}>
          {formatStatus(result.status)}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
        <span>HTTP {result.httpStatus}</span>
        <span>{result.latencyMs}ms</span>
        {result.expectedPath ? <span>{result.expectedPath}</span> : null}
        <span>{new Date(result.checkedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}

function ConnectorHealthBar() {
  const { data: healthData } = useQuery({
    queryKey: ['growth-os', 'connector-health'],
    queryFn: fetchConnectorHealth,
    refetchInterval: 60000,
    enabled: !!getPrimeAuthToken(),
  });

  if (!healthData?.stats?.byHealth) return null;

  const { byHealth } = healthData.stats;
  const healthLabels: Record<string, { label: string; color: string }> = {
    healthy: { label: 'Healthy', color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
    unhealthy: { label: 'Unhealthy', color: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/20' },
    missing_credential: { label: 'No cred', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/20' },
    not_monitored: { label: 'Not monitored', color: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/20' },
    stale: { label: 'Stale', color: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/20' },
    error: { label: 'Error', color: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/20' },
    unknown: { label: 'Unknown', color: 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/20' },
  };

  return (
    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credential health:</span>
      {Object.entries(byHealth).map(([status, count]) => {
        const meta = healthLabels[status] || { label: status, color: 'bg-slate-500/20 text-slate-600 border-slate-500/20' };
        return (
          <span key={status} className={cn('rounded-md border px-2 py-0.5', meta.color)}>
            {count} {meta.label}
          </span>
        );
      })}
      {healthData.stats.monitorRunning ? (
        <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
          Monitor active
        </span>
      ) : null}
    </div>
  );
}

function ConnectorDomainEventRow({
  event,
  busy,
  onAction,
}: {
  event: GrowthConnectorDomainEvent;
  busy: boolean;
  onAction: (eventId: string, action: ConnectorDomainEventAction) => void;
}) {
  const canRetry = event.status === 'retry_pending' || event.status === 'requeued';
  const isDeadLettered = event.status === 'dead_letter';

  return (
    <div className="grid gap-2 border-b border-border py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{event.domain} · {event.eventType}</div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
            <span className="truncate">{event.externalEventId}</span>
            <span>{event.attemptCount}/{event.maxAttempts} attempts</span>
            {event.nextRetryAt ? <span>{new Date(event.nextRetryAt).toLocaleString()}</span> : null}
          </div>
        </div>
        <span className={cn(
          'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
          event.status === 'routed' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          canRetry && 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
          isDeadLettered && 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
          !['routed', 'retry_pending', 'requeued', 'dead_letter'].includes(event.status) && 'border-border bg-muted text-muted-foreground',
        )}>
          {formatDomainEventStatus(event.status)}
        </span>
      </div>
      {event.lastError ? (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-xs font-medium leading-5 text-amber-800 dark:text-amber-200">{event.lastError}</div>
      ) : null}
      <div className="flex min-w-0 flex-wrap gap-2">
        {canRetry ? (
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-md px-2 text-xs" disabled={busy} onClick={() => onAction(event.id, 'retry')}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
            Retry
          </Button>
        ) : null}
        {isDeadLettered ? (
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-md px-2 text-xs" disabled={busy} onClick={() => onAction(event.id, 'requeue')}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            Requeue
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs text-muted-foreground" disabled={busy} onClick={() => onAction(event.id, 'dead-letter')}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <AlertTriangle className="size-3.5" />}
            Dead-letter
          </Button>
        )}
      </div>
    </div>
  );
}

function getEmptyConnectorDomainEventSummary(): GrowthConnectorDomainEventSummary {
  return {
    total: 0,
    routed: 0,
    retryPending: 0,
    deadLetter: 0,
    byStatus: {},
    byDomain: {},
  };
}

function getEmptyConnectorDomainRecordSummary(): GrowthConnectorDomainRecordSummary {
  return {
    total: 0,
    byDomain: {},
  };
}

function connectorMatchesStatusFilter(connector: GrowthConnector, filter: ConnectorStatusFilter) {
  if (filter === 'all') return true;
  if (filter === 'connected') return connector.status === 'connected';
  if (filter === 'needs_setup') return connector.status === 'setup_required' || connector.status === 'disconnected';
  return connector.status === 'watch' || connector.status === 'tested';
}

function ConnectorsView({ snapshot }: { snapshot: GrowthOsSnapshot }) {
  const queryClient = useQueryClient();
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [statusFilter, setStatusFilter] = useState<ConnectorStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [drafts, setDrafts] = useState<Record<string, GrowthConnectorSetupPayload>>({});
  const [connectorTestChecks, setConnectorTestChecks] = useState<Record<string, GrowthConnectorReadinessCheck[]>>({});
  const [oauthSessions, setOauthSessions] = useState<Record<string, GrowthConnectorOAuthSession>>({});
  const [connectorProbeResults, setConnectorProbeResults] = useState<Record<string, GrowthConnectorProbeResult>>({});
  const selectedConnector = snapshot.connectors.find((connector) => connector.id === selectedConnectorId) || null;
  const connectedCount = snapshot.connectors.filter((connector) => connector.status === 'connected').length;
  const setupCount = snapshot.connectors.filter((connector) => connector.status === 'setup_required' || connector.status === 'disconnected').length;
  const watchCount = snapshot.connectors.filter((connector) => connector.status === 'watch' || connector.status === 'tested').length;
  const firstWaveConnectors = snapshot.connectors.filter((connector) => getConnectorPriorityTier(connector) === 'P0');
  const firstWaveConnectedCount = firstWaveConnectors.filter((connector) => connector.status === 'connected').length;
  const connectorReadiness = useMemo(
    () => snapshot.connectorReadiness || buildClientConnectorReadinessSummary(snapshot.connectors),
    [snapshot.connectorReadiness, snapshot.connectors],
  );
  const readinessTierBuckets = connectorReadiness.tiers.filter((bucket) => bucket.total > 0);
  const statusCounts: Record<ConnectorStatusFilter, number> = {
    all: snapshot.connectors.length,
    connected: connectedCount,
    needs_setup: setupCount,
    watch: watchCount,
  };
  const groupCounts = useMemo(() => snapshot.connectors.reduce((counts, connector) => {
    counts.set(connector.category, (counts.get(connector.category) || 0) + 1);
    return counts;
  }, new Map<string, number>()), [snapshot.connectors]);
  const groups = useMemo(() => ['All', ...Array.from(groupCounts.keys()).sort((left, right) => left.localeCompare(right))], [groupCounts]);
  const visibleConnectors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return snapshot.connectors.filter((connector) => {
      const groupMatch = query ? true : selectedGroup === 'All' || connector.category === selectedGroup;
      const queryMatch = !query || [
        connector.name,
        connector.category,
        connector.status,
        connector.setupMode,
        connector.provider,
        getConnectorPriorityTier(connector),
        getConnectorPriorityWave(connector),
        connector.adapterProfile?.adapterKey,
      ].some((value) => String(value || '').toLowerCase().includes(query));
      const statusMatch = query ? true : connectorMatchesStatusFilter(connector, statusFilter);
      return groupMatch && queryMatch && statusMatch;
    }).sort(compareConnectorPriority);
  }, [searchTerm, selectedGroup, snapshot.connectors, statusFilter]);
  const connectorEventsQuery = useQuery({
    queryKey: ['growth-os', 'connector-events', selectedConnectorId],
    queryFn: () => fetchGrowthConnectorEvents(selectedConnectorId || ''),
    enabled: Boolean(selectedConnectorId && getPrimeAuthToken()),
    staleTime: 10_000,
  });
  const connectorDomainEventsQuery = useQuery({
    queryKey: ['growth-os', 'connector-domain-events', selectedConnectorId],
    queryFn: () => fetchGrowthConnectorDomainEvents(selectedConnectorId || ''),
    enabled: Boolean(selectedConnectorId && getPrimeAuthToken()),
    staleTime: 10_000,
  });
  const connectorDomainRecordsQuery = useQuery({
    queryKey: ['growth-os', 'connector-domain-records', selectedConnectorId],
    queryFn: () => fetchGrowthConnectorDomainRecords(selectedConnectorId || ''),
    enabled: Boolean(selectedConnectorId && getPrimeAuthToken()),
    staleTime: 10_000,
  });
  const selectedConnectorEvents = connectorEventsQuery.data?.events || [];
  const selectedConnectorDomainEvents = connectorDomainEventsQuery.data?.events || [];
  const selectedConnectorDomainSummary = connectorDomainEventsQuery.data?.summary || getEmptyConnectorDomainEventSummary();
  const selectedConnectorDomainRecords = connectorDomainRecordsQuery.data?.records || [];
  const selectedConnectorDomainRecordSummary = connectorDomainRecordsQuery.data?.summary || getEmptyConnectorDomainRecordSummary();
  const selectedConnectorTestChecks = selectedConnector ? connectorTestChecks[selectedConnector.id] || [] : [];
  const selectedOAuthSession = selectedConnector ? oauthSessions[selectedConnector.id] || null : null;
  const selectedProbeResult = selectedConnector ? connectorProbeResults[selectedConnector.id] || null : null;
  const oauthSessionQuery = useQuery({
    queryKey: ['growth-os', 'connector-oauth-session', selectedConnector?.id, selectedOAuthSession?.state],
    queryFn: () => fetchGrowthConnectorOAuthSession(selectedConnector?.id || '', selectedOAuthSession?.state || ''),
    enabled: Boolean(selectedConnector?.id && selectedOAuthSession?.state && getPrimeAuthToken()),
    staleTime: 5_000,
  });
  useEffect(() => {
    if (!oauthSessionQuery.data) return;
    setOauthSessions((current) => ({
      ...current,
      [oauthSessionQuery.data.connectorId]: oauthSessionQuery.data,
    }));
  }, [oauthSessionQuery.data]);
  const applyConnectorToCache = (connector: GrowthConnector) => {
    queryClient.setQueryData<GrowthOsSnapshot>(['growth-os'], (current) => {
      const base = current || snapshot;
      const connectors = base.connectors.map((item) => item.id === connector.id ? connector : item);
      return {
        ...base,
        connectors,
        connectorReadiness: buildClientConnectorReadinessSummary(connectors),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const testMutation = useMutation({
    mutationFn: ({ connectorId, payload }: { connectorId: string; payload: GrowthConnectorSetupPayload }) => testGrowthConnector(connectorId, payload),
    onSuccess: (result) => {
      applyConnectorToCache(result.connector);
      setConnectorTestChecks((current) => ({
        ...current,
        [result.connector.id]: result.readinessChecks || [],
      }));
      if (result.liveProbe) {
        setConnectorProbeResults((current) => ({
          ...current,
          [result.connector.id]: {
            ok: result.liveProbe.ok,
            checkedAt: result.checkedAt,
            connectorId: result.connector.id,
            provider: result.connector.provider,
            adapterKey: result.adapterProfile?.adapterKey || '',
            probe: result.liveProbe.description || 'Live provider probe',
            status: result.liveProbe.ok ? 'ready' : 'watch',
            httpStatus: result.liveProbe.httpStatus || 0,
            latencyMs: result.liveProbe.latencyMs || 0,
            expectedPath: result.liveProbe.expectedPath || null,
            expectedMatched: result.liveProbe.expectedMatched ?? false,
            responseSummary: {
              keys: result.liveProbe.responseKeys || [],
              type: 'object',
            },
          },
        }));
      }
      toast.success(
        result.liveProbe
          ? result.liveProbe.ok
            ? `${result.connector.name} test passed — live API probe OK.`
            : `${result.connector.name} fields valid, probe returned HTTP ${result.liveProbe.httpStatus}.`
          : `${result.connector.name} test passed.`,
        { position: 'top-center' },
      );
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to test connector.'),
  });

  const connectMutation = useMutation({
    mutationFn: ({ connectorId, payload }: { connectorId: string; payload: GrowthConnectorSetupPayload }) => connectGrowthConnector(connectorId, payload),
    onSuccess: (connector) => {
      applyConnectorToCache(connector);
      setSelectedConnectorId(null);
      if (connector._connectProbe) {
        const probe = connector._connectProbe;
        setConnectorProbeResults((current) => ({
          ...current,
          [connector.id]: {
            ok: probe.ok,
            checkedAt: new Date().toISOString(),
            connectorId: connector.id,
            provider: connector.provider,
            adapterKey: connector.adapterProfile?.adapterKey || '',
            probe: probe.description || 'Live provider probe on connect',
            status: probe.ok ? 'ready' : 'watch',
            httpStatus: probe.httpStatus || 0,
            latencyMs: probe.latencyMs || 0,
            expectedPath: probe.expectedPath || null,
            expectedMatched: probe.expectedMatched ?? false,
            responseSummary: { keys: [], type: 'object' },
          },
        }));
        toast.success(
          probe.ok
            ? `${connector.name} connected — live API probe OK.`
            : `${connector.name} connected — probe returned HTTP ${probe.httpStatus}.`,
          { position: 'top-center' },
        );
      } else {
        toast.success(`${connector.name} connected.`, { position: 'top-center' });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to connect channel.'),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGrowthConnector,
    onSuccess: (connector) => {
      applyConnectorToCache(connector);
      setSelectedConnectorId(null);
      toast.success(`${connector.name} disconnected.`, { position: 'top-center' });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to disconnect channel.'),
  });

  const domainEventMutation = useMutation({
    mutationFn: ({ connectorId, eventId, action }: { connectorId: string; eventId: string; action: ConnectorDomainEventAction }) => {
      if (action === 'retry') return retryGrowthConnectorDomainEvent(connectorId, eventId);
      if (action === 'requeue') return requeueGrowthConnectorDomainEvent(connectorId, eventId);
      return deadLetterGrowthConnectorDomainEvent(connectorId, eventId);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['growth-os', 'connector-domain-events', variables.connectorId] });
      queryClient.invalidateQueries({ queryKey: ['growth-os', 'connector-domain-records', variables.connectorId] });
      toast.success('Domain event queue updated.', { position: 'top-center' });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to update domain event queue.'),
  });

  const sampleWebhookMutation = useMutation({
    mutationFn: ({ connectorId }: { connectorId: string }) => createGrowthConnectorSampleWebhook(connectorId),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['growth-os'] });
      queryClient.invalidateQueries({ queryKey: ['growth-os', 'connector-events', variables.connectorId] });
      queryClient.invalidateQueries({ queryKey: ['growth-os', 'connector-domain-events', variables.connectorId] });
      queryClient.invalidateQueries({ queryKey: ['growth-os', 'connector-domain-records', variables.connectorId] });
      toast.success(`${result.event.domainRoute || 'Connector'} sample event accepted.`, { position: 'top-center' });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to generate sample webhook.'),
  });

  const oauthStartMutation = useMutation({
    mutationFn: ({ connector, payload }: { connector: GrowthConnector; payload: GrowthConnectorSetupPayload }) => {
      const redirectBase = resolvePrimeBackendBase().replace(/\/+$/, '');
      return startGrowthConnectorOAuthSetup(connector.id, {
        accountRef: payload.accountRef,
        appId: payload.appId,
        clientSecret: payload.accessToken || undefined,
        redirectUri: `${redirectBase}/oauth/connectors/${encodeURIComponent(connector.id)}/callback`,
      });
    },
    onSuccess: (session) => {
      setOauthSessions((current) => ({ ...current, [session.connectorId]: session }));
      window.open(session.authorizationUrl, '_blank', 'noopener,noreferrer');
      toast.success('OAuth setup opened.', { position: 'top-center' });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to start OAuth setup.'),
  });

  const oauthRefreshMutation = useMutation({
    mutationFn: ({ connectorId, state }: { connectorId: string; state: string }) => refreshGrowthConnectorOAuthToken(connectorId, state),
    onSuccess: (result) => {
      applyConnectorToCache(result.connector);
      setOauthSessions((current) => ({ ...current, [result.session.connectorId]: result.session }));
      toast.success('OAuth token refreshed.', { position: 'top-center' });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to refresh OAuth token.'),
  });

  const oauthRevokeMutation = useMutation({
    mutationFn: ({ connectorId, state }: { connectorId: string; state: string }) => revokeGrowthConnectorOAuthToken(connectorId, state),
    onSuccess: (result) => {
      applyConnectorToCache(result.connector);
      setOauthSessions((current) => ({ ...current, [result.session.connectorId]: result.session }));
      toast.success(result.providerCalled ? 'OAuth token revoked.' : 'OAuth token removed locally.', { position: 'top-center' });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to revoke OAuth token.'),
  });

  const connectorProbeMutation = useMutation({
    mutationFn: ({ connectorId, state }: { connectorId: string; state?: string }) => probeGrowthConnector(connectorId, { state }),
    onSuccess: (result) => {
      setConnectorProbeResults((current) => ({ ...current, [result.connectorId]: result }));
      queryClient.invalidateQueries({ queryKey: ['growth-os'] });
      toast.success(result.ok ? 'Connector probe passed.' : 'Connector probe needs attention.', { position: 'top-center' });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to run connector probe.'),
  });

  const updateDraft = (connector: GrowthConnector, field: keyof GrowthConnectorSetupPayload, value: string) => {
    setDrafts((current) => ({
      ...current,
      [connector.id]: {
        ...getConnectorDraft(connector, current),
        [field]: value,
      },
    }));
  };

  const submitConnector = (mode: 'test' | 'connect') => {
    if (!selectedConnector) {
      toast.error('Select a connector first.');
      return;
    }
    if (!getPrimeAuthToken()) {
      toast.error('Login is required for connector setup.');
      return;
    }

    const payload = getConnectorDraft(selectedConnector, drafts);
    const missing = validateConnectorDraft(payload, selectedConnector.requiredFields || []);
    if (missing.length > 0) {
      toast.error(`Check setup fields: ${missing.join(', ')}.`);
      return;
    }

    if (mode === 'test') {
      testMutation.mutate({ connectorId: selectedConnector.id, payload });
      return;
    }

    connectMutation.mutate({ connectorId: selectedConnector.id, payload });
  };

  const disconnectSelectedConnector = () => {
    if (!selectedConnector) return;
    if (!getPrimeAuthToken()) {
      toast.error('Login is required for connector setup.');
      return;
    }
    disconnectMutation.mutate(selectedConnector.id);
  };

  const updateDomainEventQueue = (eventId: string, action: ConnectorDomainEventAction) => {
    if (!selectedConnector) return;
    if (!getPrimeAuthToken()) {
      toast.error('Login is required for connector queue actions.');
      return;
    }
    domainEventMutation.mutate({ connectorId: selectedConnector.id, eventId, action });
  };

  const generateSampleWebhook = () => {
    if (!selectedConnector) return;
    if (!getPrimeAuthToken()) {
      toast.error('Login is required to generate sample webhooks.');
      return;
    }
    sampleWebhookMutation.mutate({ connectorId: selectedConnector.id });
  };

  const startSelectedOAuthSetup = () => {
    if (!selectedConnector) return;
    if (!getPrimeAuthToken()) {
      toast.error('Login is required for OAuth setup.');
      return;
    }
    const payload = getConnectorDraft(selectedConnector, drafts);
    const missing = validateConnectorDraft(payload, ['accountRef', 'appId']);
    if (missing.length > 0) {
      toast.error(`Check OAuth fields: ${missing.join(', ')}.`);
      return;
    }
    oauthStartMutation.mutate({ connector: selectedConnector, payload });
  };

  const refreshSelectedOAuthToken = () => {
    if (!selectedConnector || !selectedOAuthSession) return;
    if (!getPrimeAuthToken()) {
      toast.error('Login is required for OAuth setup.');
      return;
    }
    oauthRefreshMutation.mutate({ connectorId: selectedConnector.id, state: selectedOAuthSession.state });
  };

  const revokeSelectedOAuthToken = () => {
    if (!selectedConnector || !selectedOAuthSession) return;
    if (!getPrimeAuthToken()) {
      toast.error('Login is required for OAuth setup.');
      return;
    }
    oauthRevokeMutation.mutate({ connectorId: selectedConnector.id, state: selectedOAuthSession.state });
  };

  const probeSelectedConnector = () => {
    if (!selectedConnector) return;
    if (!getPrimeAuthToken()) {
      toast.error('Login is required for connector probes.');
      return;
    }
    connectorProbeMutation.mutate({ connectorId: selectedConnector.id, state: selectedOAuthSession?.state });
  };

  const draft = selectedConnector ? getConnectorDraft(selectedConnector, drafts) : null;
  const selectedIsTesting = testMutation.isPending && testMutation.variables?.connectorId === selectedConnector?.id;
  const selectedIsConnecting = connectMutation.isPending && connectMutation.variables?.connectorId === selectedConnector?.id;
  const selectedIsDisconnecting = disconnectMutation.isPending && disconnectMutation.variables === selectedConnector?.id;
  const selectedCanSampleWebhook = selectedConnector ? ['connected', 'tested'].includes(selectedConnector.status) : false;
  const selectedIsSamplingWebhook = sampleWebhookMutation.isPending && sampleWebhookMutation.variables?.connectorId === selectedConnector?.id;
  const hasSearch = searchTerm.trim().length > 0;
  const renderConnectorRow = (connector: GrowthConnector) => {
    const selected = selectedConnector?.id === connector.id;
    const isConnected = connector.status === 'connected';
    const canShowSync = connector.status === 'connected' || connector.status === 'watch' || connector.status === 'tested';

    return (
      <button
        key={connector.id}
        type="button"
        className={cn(
          'flex min-w-0 w-full flex-col gap-2 border-b border-border bg-card px-4 py-3.5 text-left transition-colors last:border-b-0 md:flex-row md:items-center md:justify-between',
          selected ? 'bg-card' : 'hover:bg-card'
        )}
        onClick={() => setSelectedConnectorId(connector.id)}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <ConnectorStatusDot status={connector.status} />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">{connector.name}</h3>
              <ConnectorPriorityBadge connector={connector} />
            </div>
            <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{connector.category} · {connector.setupMode}</div>
            <div className="mt-1 line-clamp-1 text-xs font-medium text-muted-foreground">{getConnectorPriorityWave(connector)}</div>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 pl-5 text-xs font-semibold text-muted-foreground md:pl-0">
          <span className={cn('capitalize', isConnected ? 'text-emerald-600' : 'text-muted-foreground')}>{formatStatus(connector.status)}</span>
          {canShowSync ? <span>{connector.syncHealth}%</span> : null}
          {canShowSync ? <span className="hidden sm:inline">{connector.lastSync}</span> : null}
          <div className="ml-auto flex items-center md:ml-0">
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-w-0">
      <Surface
        title="Connector setup"
        subtitle={`${connectedCount}/${snapshot.connectors.length} connected. Wave 1: ${firstWaveConnectedCount}/${firstWaveConnectors.length} connected. ${setupCount} need setup.`}
      >
        <div className="grid gap-2 lg:grid-cols-4">
          {readinessTierBuckets.map((bucket) => (
            <ConnectorReadinessTierCard
              key={bucket.id}
              bucket={bucket}
              onSelect={() => {
                setSearchTerm(String(bucket.id));
                setSelectedGroup('All');
                setStatusFilter('all');
              }}
            />
          ))}
        </div>

        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="rounded-md border border-border bg-muted px-2 py-1 text-foreground">
            {connectorReadiness.connected}/{connectorReadiness.total} connected
          </span>
          <span className="rounded-md border border-border bg-muted px-2 py-1">
            {connectorReadiness.webhook} webhook
          </span>
          <span className="rounded-md border border-border bg-muted px-2 py-1">
            {connectorReadiness.oauth} OAuth
          </span>
          <span className="rounded-md border border-border bg-muted px-2 py-1">
            {connectorReadiness.probe} probes
          </span>
          {connectorReadiness.genericAdapters ? (
            <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
              {connectorReadiness.genericAdapters} generic
            </span>
          ) : null}
        </div>

        <ConnectorHealthBar />

        {connectorReadiness.nextSetup.length ? (
          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            {connectorReadiness.nextSetup.slice(0, 8).map((item) => (
              <button
                key={item.provider}
                type="button"
                className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setSearchTerm(item.provider);
                  setSelectedGroup('All');
                  setStatusFilter('all');
                }}
              >
                <span className="text-foreground">{item.priorityTier}</span>
                <span className="truncate">{item.name}</span>
                {item.needsOAuth ? <span className="text-primary">OAuth</span> : null}
                {item.needsWebhook ? <span className="text-emerald-700 dark:text-emerald-300">Webhook</span> : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_160px]">
          <SearchBox value={searchTerm} onChange={(value) => {
            setSearchTerm(value);
            if (value.trim()) {
              setSelectedGroup('All');
              setStatusFilter('all');
            }
          }} placeholder="Search connectors" className="sm:w-full" />
          <select
            aria-label="Connector group"
            value={selectedGroup}
            onChange={(event) => setSelectedGroup(event.target.value)}
            className="h-10 min-w-0 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            {groups.map((group) => {
              return <option key={group} value={group}>{group === 'All' ? 'All groups' : group}</option>;
            })}
          </select>
          <select
            aria-label="Connector status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ConnectorStatusFilter)}
            className="h-10 min-w-0 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            {connectorStatusFilters.map((filter) => (
              <option key={filter.id} value={filter.id}>{filter.label}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex min-w-0 items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
          <span>{visibleConnectors.length} connector{visibleConnectors.length === 1 ? '' : 's'}</span>
          {hasSearch ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg px-2 text-muted-foreground"
              onClick={() => {
                setSearchTerm('');
                setSelectedGroup('All');
                setStatusFilter('all');
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>

        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
          {visibleConnectors.map(renderConnectorRow)}
          {visibleConnectors.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm font-semibold text-muted-foreground">No connectors found.</div>
          ) : null}
        </div>
      </Surface>

      <Dialog open={Boolean(selectedConnector && draft)} onOpenChange={(open) => {
        if (!open) setSelectedConnectorId(null);
      }}>
        <DialogContent className="max-h-[88vh] w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-lg border-border bg-card p-0 opacity-100 shadow-[0_24px_80px_rgba(8,30,84,0.24)]">
          {selectedConnector && draft ? (
            <div className="flex max-h-[88vh] flex-col">
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-10 text-left">
                <DialogTitle className="text-xl font-semibold text-foreground">{selectedConnector.name} Setup</DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground">{getConnectorSetupDescription(selectedConnector)}</DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2 rounded-lg border border-border bg-card p-3">
                    <InspectorRow label="Group" value={selectedConnector.category} />
                    <InspectorRow label="Status" value={formatStatus(selectedConnector.status)} />
                    <InspectorRow label="Priority" value={`${getConnectorPriorityTier(selectedConnector)} · ${getConnectorPriorityWave(selectedConnector)}`} multiline />
                    <InspectorRow label="Adapter" value={selectedConnector.adapterProfile?.adapterKey || 'generic_rest_connector'} />
                    <InspectorRow label="Direction" value={selectedConnector.direction === 'two_way' ? 'Two-way' : 'One-way'} />
                    <InspectorRow label="Credential" value={selectedConnector.maskedCredential || 'Not stored'} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ConnectorCapability label="Inbound" enabled={selectedConnector.inboundEnabled} />
                    <ConnectorCapability label="Outbound" enabled={selectedConnector.outboundEnabled} />
                  </div>

                  <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-3">
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Use case</div>
                      <p className="mt-1 text-sm font-medium leading-5 text-foreground">{selectedConnector.businessUseCase || 'Generic setup connector.'}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Credential hint</div>
                      <p className="mt-1 text-sm font-medium leading-5 text-foreground">{selectedConnector.credentialHint || 'Account reference and access token or API key.'}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Setup checklist</div>
                      <ul className="mt-2 grid gap-1.5 text-sm font-medium leading-5 text-muted-foreground">
                        {(selectedConnector.setupChecklist?.length ? selectedConnector.setupChecklist : ['Collect account reference', 'Add access credential', 'Run test connection', 'Connect when validated']).map((item) => (
                          <li key={item} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground">Adapter readiness</div>
                      <div className="mt-2 grid gap-2 text-sm font-medium leading-5 text-muted-foreground">
                        <div>
                          <span className="text-foreground">Scopes: </span>
                          {(selectedConnector.adapterProfile?.requiredScopes || ['account_reference', 'credential_validation']).join(', ')}
                        </div>
                        <div>
                          <span className="text-foreground">Webhook events: </span>
                          {(selectedConnector.adapterProfile?.webhookEvents || ['connector.ping']).join(', ')}
                        </div>
                        <div>
                          <span className="text-foreground">Test strategy: </span>
                          {selectedConnector.adapterProfile?.testStrategy || 'Validate setup fields and store encrypted demo credential.'}
                        </div>
                        <div>
                          <span className="text-foreground">Webhook security: </span>
                          {selectedConnector.adapterProfile?.webhookSecurity?.description || 'No provider-specific webhook signature configured.'}
                        </div>
                      </div>
                      {selectedConnectorTestChecks.length ? (
                        <div className="mt-3 border-t border-border pt-2">
                          {selectedConnectorTestChecks.map((check) => (
                            <ConnectorReadinessCheckRow key={check.key} check={check} />
                          ))}
                        </div>
                      ) : null}
                      {selectedConnector.adapterProfile?.probe && !selectedConnector.adapterProfile?.oauth ? (
                        <div className="mt-3 grid gap-2 border-t border-border pt-3">
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold uppercase text-muted-foreground">Live Provider Probe</div>
                              <div className="mt-1 truncate text-sm font-medium text-foreground">{selectedConnector.adapterProfile.probe.description}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-md px-2 text-xs"
                                disabled={connectorProbeMutation.isPending}
                                onClick={probeSelectedConnector}
                              >
                                {connectorProbeMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RadioTower className="size-3.5" />}
                                Probe
                              </Button>
                            </div>
                          </div>
                          {selectedProbeResult ? <ConnectorProbeResultRow result={selectedProbeResult} /> : null}
                        </div>
                      ) : null}
                      {selectedConnector.adapterProfile?.oauth ? (
                        <div className="mt-3 grid gap-2 border-t border-border pt-3">
                          <div className="flex min-w-0 items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold uppercase text-muted-foreground">OAuth</div>
                              <div className="mt-1 truncate text-sm font-medium text-foreground">{selectedConnector.adapterProfile.oauth.provider}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {selectedOAuthSession ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 rounded-md px-2"
                                  disabled={oauthSessionQuery.isFetching}
                                  onClick={() => oauthSessionQuery.refetch()}
                                >
                                  {oauthSessionQuery.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
                                </Button>
                              ) : null}
                              {selectedOAuthSession?.status === 'token_exchanged' && selectedOAuthSession.refreshTokenLast4 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-md px-2 text-xs"
                                  disabled={oauthRefreshMutation.isPending}
                                  onClick={refreshSelectedOAuthToken}
                                >
                                  {oauthRefreshMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
                                  Token
                                </Button>
                              ) : null}
                              {selectedOAuthSession?.status === 'token_exchanged' ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 rounded-md px-2 text-xs text-muted-foreground"
                                  disabled={oauthRevokeMutation.isPending}
                                  onClick={revokeSelectedOAuthToken}
                                >
                                  {oauthRevokeMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                                  Revoke
                                </Button>
                              ) : null}
                              {selectedConnector.adapterProfile?.probe ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-md px-2 text-xs"
                                  disabled={connectorProbeMutation.isPending}
                                  onClick={probeSelectedConnector}
                                >
                                  {connectorProbeMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RadioTower className="size-3.5" />}
                                  Probe
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-md px-2 text-xs"
                                disabled={oauthStartMutation.isPending}
                                onClick={startSelectedOAuthSetup}
                              >
                                {oauthStartMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUpRight className="size-3.5" />}
                                OAuth
                              </Button>
                            </div>
                          </div>
                          <div className="line-clamp-2 text-xs font-medium leading-5 text-muted-foreground">
                            {selectedConnector.adapterProfile.oauth.scopes.length ? selectedConnector.adapterProfile.oauth.scopes.join(', ') : 'Workspace authorization'}
                          </div>
                          {selectedOAuthSession ? <ConnectorOAuthSessionRow session={selectedOAuthSession} /> : null}
                          {selectedProbeResult ? <ConnectorProbeResultRow result={selectedProbeResult} /> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase text-muted-foreground">Webhook events</div>
                        <div className="mt-1 text-sm font-medium text-muted-foreground">
                          {selectedConnectorEvents.length ? `${selectedConnectorEvents.length} recent event${selectedConnectorEvents.length === 1 ? '' : 's'}` : 'No accepted events yet'}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-md px-2 text-xs"
                          disabled={!selectedCanSampleWebhook || selectedIsSamplingWebhook || !getPrimeAuthToken()}
                          onClick={generateSampleWebhook}
                        >
                          {selectedIsSamplingWebhook ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                          Sample
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-md px-2"
                          disabled={connectorEventsQuery.isFetching || !getPrimeAuthToken()}
                          onClick={() => connectorEventsQuery.refetch()}
                        >
                          {connectorEventsQuery.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 divide-y divide-border">
                      {connectorEventsQuery.isLoading ? (
                        <div className="py-3 text-sm font-medium text-muted-foreground">Loading events...</div>
                      ) : selectedConnectorEvents.length ? (
                        selectedConnectorEvents.slice(0, 4).map((event) => <ConnectorWebhookEventRow key={event.id} event={event} />)
                      ) : (
                        <div className="py-3 text-sm font-medium leading-5 text-muted-foreground">Send a signed webhook to this connector to see accepted event metadata.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase text-muted-foreground">Domain queue</div>
                        <div className="mt-1 text-sm font-medium text-muted-foreground">
                          {selectedConnectorDomainSummary.total ? `${selectedConnectorDomainSummary.total} routed domain event${selectedConnectorDomainSummary.total === 1 ? '' : 's'}` : 'No routed domain events yet'}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-md px-2"
                        disabled={(connectorDomainEventsQuery.isFetching || connectorDomainRecordsQuery.isFetching) || !getPrimeAuthToken()}
                        onClick={() => {
                          connectorDomainEventsQuery.refetch();
                          connectorDomainRecordsQuery.refetch();
                        }}
                      >
                        {connectorDomainEventsQuery.isFetching || connectorDomainRecordsQuery.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <ConnectorQueueMetric label="Routed" value={selectedConnectorDomainSummary.routed} tone="emerald" />
                      <ConnectorQueueMetric label="Retry" value={selectedConnectorDomainSummary.retryPending} tone={selectedConnectorDomainSummary.retryPending ? 'amber' : 'slate'} />
                      <ConnectorQueueMetric label="DLQ" value={selectedConnectorDomainSummary.deadLetter} tone={selectedConnectorDomainSummary.deadLetter ? 'rose' : 'slate'} />
                      <ConnectorQueueMetric label="Records" value={selectedConnectorDomainRecordSummary.total} tone={selectedConnectorDomainRecordSummary.total ? 'emerald' : 'slate'} />
                    </div>
                    <div className="mt-2 divide-y divide-border">
                      {connectorDomainEventsQuery.isLoading ? (
                        <div className="py-3 text-sm font-medium text-muted-foreground">Loading domain queue...</div>
                      ) : selectedConnectorDomainEvents.length ? (
                        selectedConnectorDomainEvents.slice(0, 4).map((event) => (
                          <ConnectorDomainEventRow
                            key={event.id}
                            event={event}
                            busy={domainEventMutation.isPending && domainEventMutation.variables?.eventId === event.id}
                            onAction={updateDomainEventQueue}
                          />
                        ))
                      ) : (
                        <div className="py-3 text-sm font-medium leading-5 text-muted-foreground">No domain events.</div>
                      )}
                    </div>
                    <div className="mt-3 border-t border-border pt-3">
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase text-muted-foreground">Domain records</div>
                        <div className="flex min-w-0 flex-wrap justify-end gap-1.5">
                          {Object.entries(selectedConnectorDomainRecordSummary.byDomain)
                            .filter(([, value]) => value > 0)
                            .slice(0, 4)
                            .map(([domain, value]) => (
                              <span key={domain} className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                {domain} {value}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="mt-2 divide-y divide-border">
                        {connectorDomainRecordsQuery.isLoading ? (
                          <div className="py-3 text-sm font-medium text-muted-foreground">Loading records...</div>
                        ) : selectedConnectorDomainRecords.length ? (
                          selectedConnectorDomainRecords.slice(0, 3).map((record) => <ConnectorDomainRecordRow key={record.id} record={record} />)
                        ) : (
                          <div className="py-3 text-sm font-medium leading-5 text-muted-foreground">No materialized records.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedConnector.provider === 'myinvois' ? (
                    <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 text-sm leading-6 text-amber-900">
                      Sandbox first. Production credentials and certificate vault stay separate.
                    </div>
                  ) : null}

                  <div className="grid gap-3">
                    {(!selectedConnector.requiredFields || selectedConnector.requiredFields.includes('accountRef')) ? (
                      <ConnectorSetupField label={getConnectorFieldLabel(selectedConnector, 'accountRef')} value={draft.accountRef} onChange={(value) => updateDraft(selectedConnector, 'accountRef', value)} />
                    ) : null}
                    {selectedConnector.requiredFields?.includes('appId') ? (
                      <ConnectorSetupField label={getConnectorFieldLabel(selectedConnector, 'appId')} value={draft.appId} onChange={(value) => updateDraft(selectedConnector, 'appId', value)} />
                    ) : null}
                    {(!selectedConnector.requiredFields || selectedConnector.requiredFields.includes('accessToken')) ? (
                      <ConnectorSetupField label={getConnectorFieldLabel(selectedConnector, 'accessToken')} value={draft.accessToken} type="password" onChange={(value) => updateDraft(selectedConnector, 'accessToken', value)} />
                    ) : null}
                    {selectedConnector.requiredFields?.includes('webhookUrl') ? (
                      <ConnectorSetupField label={getConnectorFieldLabel(selectedConnector, 'webhookUrl')} value={draft.webhookUrl} onChange={(value) => updateDraft(selectedConnector, 'webhookUrl', value)} />
                    ) : null}
                    {selectedConnector.requiredFields?.includes('verifyToken') ? (
                      <ConnectorSetupField label={getConnectorFieldLabel(selectedConnector, 'verifyToken')} value={draft.verifyToken} type="password" onChange={(value) => updateDraft(selectedConnector, 'verifyToken', value)} />
                    ) : null}
                  </div>
                </div>
              </div>

              {selectedConnector.provider === 'telegram' && selectedConnector.status === 'connected' ? (
                <div className="mt-2 rounded-lg border border-border bg-muted/30 p-4 text-center">
                  <p className="text-sm font-medium text-foreground">Connected</p>
                  <a
                    href="/customer/service"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    <MessageSquare className="size-4" />
                    Open Inbox
                  </a>
                </div>
              ) : null}

              <div className="shrink-0 border-t border-border bg-card px-5 py-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-10 rounded-lg" disabled={selectedIsTesting || selectedIsConnecting} onClick={() => submitConnector('test')}>
                    {selectedIsTesting ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                    Test
                  </Button>
                  <Button className={cn('h-10 rounded-lg', primaryButtonClass)} disabled={selectedIsConnecting || selectedIsTesting} onClick={() => submitConnector('connect')}>
                    {selectedIsConnecting ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                    Connect
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="mt-2 h-9 w-full rounded-lg text-muted-foreground hover:text-foreground"
                  disabled={selectedConnector.status !== 'connected' || selectedIsDisconnecting}
                  onClick={disconnectSelectedConnector}
                >
                  {selectedIsDisconnecting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Disconnect
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinanceView({ snapshot }: { snapshot: GrowthOsSnapshot }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [financeQuery, setFinanceQuery] = useState('');
  const activeFinanceMode = normalizeFinanceMode(searchParams.get('view'));
  const orderValue = snapshot.commerceOrders.reduce((sum, order) => sum + order.value, 0);
  const serviceValue = snapshot.serviceBookings.reduce((sum, booking) => sum + booking.value, 0);
  const paidOrderValue = snapshot.commerceOrders.filter((order) => order.paymentStatus === 'paid').reduce((sum, order) => sum + order.value, 0);
  const openPaymentValue = snapshot.commerceOrders.filter((order) => order.paymentStatus !== 'paid').reduce((sum, order) => sum + order.value, 0);
  const paidOrders = snapshot.commerceOrders.filter((order) => order.paymentStatus === 'paid').length;
  const openPaymentCount = snapshot.commerceOrders.length - paidOrders;
  const revenueTarget = snapshot.metrics.revenueMtd + snapshot.metrics.revenueGap;
  const targetCoverage = revenueTarget ? Math.round((snapshot.metrics.revenueMtd / revenueTarget) * 100) : 100;
  const orderCollectionRate = orderValue ? Math.round((paidOrderValue / orderValue) * 100) : 100;
  const proposalPipeline = snapshot.leads.filter((lead) => lead.stage === 'proposal').reduce((sum, lead) => sum + lead.value, 0);
  const qualifiedPipeline = snapshot.leads.filter((lead) => lead.stage === 'qualified' || lead.stage === 'engaged').reduce((sum, lead) => sum + lead.value, 0);
  const repeatRevenueValue = Math.round(snapshot.metrics.revenueMtd * (snapshot.metrics.repeatRevenueRate / 100));
  const unassignedServiceValue = snapshot.serviceBookings.filter((booking) => booking.staff === 'Unassigned').reduce((sum, booking) => sum + booking.value, 0);
  const paymentConnectors = snapshot.connectors.filter((connector) => connector.category === 'Payments');
  const connectedPaymentConnectors = paymentConnectors.filter((connector) => connector.status === 'connected').length;
  const connectorCoverage = paymentConnectors.length ? Math.round((connectedPaymentConnectors / paymentConnectors.length) * 100) : 100;
  const financeHealth = Math.round((targetCoverage + orderCollectionRate + snapshot.metrics.repeatRevenueRate + connectorCoverage) / 4);
  const riskCount = openPaymentCount
    + (snapshot.metrics.revenueGap > 0 ? 1 : 0)
    + (connectedPaymentConnectors < paymentConnectors.length ? 1 : 0)
    + (unassignedServiceValue > 0 ? 1 : 0);
  const ledgerEntries: FinanceLedgerEntry[] = [
    ...snapshot.commerceOrders.map((order) => ({
      id: order.id,
      source: 'COS' as const,
      customer: order.customer,
      label: order.type,
      status: order.status,
      paymentStatus: order.paymentStatus,
      value: order.value,
      owner: order.owner,
      due: order.paymentStatus === 'paid' ? 'Collected' : 'Due now',
    })),
    ...snapshot.serviceBookings.map((booking) => ({
      id: booking.id,
      source: 'Service' as const,
      customer: booking.customer,
      label: booking.service,
      status: booking.status,
      paymentStatus: booking.status === 'confirmed' ? 'scheduled' : 'pending',
      value: booking.value,
      owner: booking.staff,
      due: booking.scheduledAt,
    })),
  ];
  const financeActions = [
    openPaymentCount ? {
      title: 'Collect open COS payments',
      detail: `${openPaymentCount} orders still hold ${currency.format(openPaymentValue)} outside collected cash.`,
      priority: 'High' as const,
      mode: 'payments' as const,
      cta: 'Open ledger',
    } : null,
    snapshot.metrics.revenueGap ? {
      title: 'Close revenue gap',
      detail: `${currency.format(snapshot.metrics.revenueGap)} remains to hit the current target.`,
      priority: 'High' as const,
      mode: 'forecast' as const,
      cta: 'View bridge',
    } : null,
    unassignedServiceValue ? {
      title: 'Price service capacity',
      detail: `${currency.format(unassignedServiceValue)} service work is not fully assigned yet.`,
      priority: 'Medium' as const,
      mode: 'payments' as const,
      cta: 'Review services',
    } : null,
    connectedPaymentConnectors < paymentConnectors.length ? {
      title: 'Finish payment connectors',
      detail: `${connectedPaymentConnectors}/${paymentConnectors.length} payment rails are connected.`,
      priority: 'Medium' as const,
      mode: 'risk' as const,
      cta: 'Review controls',
    } : null,
    snapshot.metrics.repeatRevenueRate < 40 ? {
      title: 'Lift repeat revenue',
      detail: `Repeat revenue is ${snapshot.metrics.repeatRevenueRate}%; target a win-back or renewal push.`,
      priority: 'Medium' as const,
      mode: 'forecast' as const,
      cta: 'Plan recovery',
    } : null,
  ].filter(Boolean) as FinanceQueueAction[];
  const clearAction: FinanceQueueAction = {
    title: 'Finance controls are clear',
    detail: 'No urgent receivable, connector, or forecast blocker is detected.',
    priority: 'Low',
    mode: 'overview',
    cta: 'View health',
  };
  const visibleActions = financeActions.length ? financeActions : [clearAction];
  const normalizedQuery = financeQuery.trim().toLowerCase();
  const filteredActions = visibleActions.filter((action) => {
    if (!normalizedQuery) return true;
    return `${action.title} ${action.detail} ${action.priority} ${action.cta}`.toLowerCase().includes(normalizedQuery);
  });
  const filteredLedger = ledgerEntries.filter((entry) => {
    if (!normalizedQuery) return true;
    return `${entry.source} ${entry.customer} ${entry.label} ${entry.status} ${entry.paymentStatus} ${entry.owner}`.toLowerCase().includes(normalizedQuery);
  });
  const paymentActions = visibleActions.filter((action) => action.mode === 'payments');
  const forecastActions = visibleActions.filter((action) => action.mode === 'forecast');
  const riskActions = visibleActions.filter((action) => action.mode === 'risk');

  const selectFinanceMode = (mode: FinanceMode) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('module', 'finance');
    if (mode === 'overview') {
      nextParams.delete('view');
    } else {
      nextParams.set('view', mode);
    }
    setSearchParams(nextParams, { replace: false });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[hsl(var(--surface-stage))]">
      <div className="shrink-0 bg-background px-4 pt-4 md:px-6">
        <WorkspacePageHeader
          title="Finance Operations"
          description="Monitor revenue, collections, receivables, forecast coverage, and finance controls."
          icon={CircleDollarSign}
          actions={(
            <>
            <CosInlineMetric label="MTD" value={compactCurrency.format(snapshot.metrics.revenueMtd)} />
            <CosInlineMetric label="Paid" value={compactCurrency.format(paidOrderValue)} tone="text-emerald-600 dark:text-emerald-300" />
            <CosInlineMetric label="A/R" value={compactCurrency.format(openPaymentValue)} tone={openPaymentCount ? 'text-warning' : 'text-emerald-600 dark:text-emerald-300'} />
            <CosInlineMetric label="Gap" value={compactCurrency.format(snapshot.metrics.revenueGap)} tone={snapshot.metrics.revenueGap ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-300'} />
            <div className="hidden h-8 w-px bg-border lg:block" />
            <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => selectFinanceMode('payments')}>
              <WalletCards className="size-4" />
              Collect
            </Button>
            <Button size="sm" className="h-8 px-3" onClick={() => selectFinanceMode('forecast')}>
              <Target className="size-4" />
              Forecast
            </Button>
            </>
          )}
        />
      </div>

      <div
        className="grid min-h-0 min-w-[920px] flex-1 border-b border-border bg-[hsl(var(--surface-workspace))]"
        style={{ gridTemplateColumns: '72px minmax(280px, 320px) minmax(0, 1fr)' }}
      >
        <FinanceModeRail
          activeMode={activeFinanceMode}
          healthScore={financeHealth}
          openPayments={openPaymentCount}
          gapValue={snapshot.metrics.revenueGap}
          riskCount={riskCount}
          onSelect={selectFinanceMode}
        />

        <FinanceOpsPanel
          activeMode={activeFinanceMode}
          query={financeQuery}
          onQueryChange={setFinanceQuery}
          actions={filteredActions}
          ledgerEntries={filteredLedger}
          onSelect={selectFinanceMode}
        />

        <main className="min-h-0 min-w-0 overflow-y-auto bg-background p-4 scrollbar-visible">
          {activeFinanceMode === 'overview' ? (
            <div className="grid gap-4">
              <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <CosKpiCard label="Revenue MTD" value={currency.format(snapshot.metrics.revenueMtd)} detail={`${targetCoverage}% of ${currency.format(revenueTarget)} target`} icon={CircleDollarSign} tone="emerald" />
                <CosKpiCard label="Collected" value={currency.format(paidOrderValue)} detail={`${paidOrders}/${snapshot.commerceOrders.length} COS orders paid`} icon={WalletCards} tone={orderCollectionRate >= 80 ? 'emerald' : 'amber'} />
                <CosKpiCard label="Receivables" value={currency.format(openPaymentValue)} detail={`${openPaymentCount} open payments`} icon={ClipboardList} tone={openPaymentCount ? 'amber' : 'emerald'} />
                <CosKpiCard label="Revenue gap" value={currency.format(snapshot.metrics.revenueGap)} detail={`${currency.format(proposalPipeline)} proposal pipeline`} icon={Target} tone={snapshot.metrics.revenueGap ? 'rose' : 'emerald'} />
              </section>

              <div className="grid items-start gap-4">
                <Surface title="Revenue Command Map" subtitle="MTD revenue, cash collection, service value, pipeline, and risk in one read.">
                  <div className="grid gap-3 lg:grid-cols-3 2xl:grid-cols-5">
                    <FinanceLaneCard title="MTD" metric={currency.format(snapshot.metrics.revenueMtd)} detail={`${targetCoverage}% target coverage`} signal={targetCoverage >= 80 ? 'Ready' : 'Watch'} icon={CircleDollarSign} onSelect={() => selectFinanceMode('overview')} />
                    <FinanceLaneCard title="COS cash" metric={currency.format(orderValue)} detail={`${currency.format(paidOrderValue)} collected, ${currency.format(openPaymentValue)} open`} signal={openPaymentCount ? 'Watch' : 'Ready'} icon={ShoppingCart} onSelect={() => selectFinanceMode('payments')} />
                    <FinanceLaneCard title="Service" metric={currency.format(serviceValue)} detail={`${snapshot.serviceBookings.length} active bookings`} signal={unassignedServiceValue ? 'Watch' : 'Ready'} icon={CalendarCheck} onSelect={() => selectFinanceMode('payments')} />
                    <FinanceLaneCard title="Pipeline" metric={currency.format(proposalPipeline + qualifiedPipeline)} detail={`${snapshot.leads.length} lead records feeding forecast`} signal={snapshot.metrics.revenueGap ? 'Action' : 'Ready'} icon={BarChart3} onSelect={() => selectFinanceMode('forecast')} />
                    <FinanceLaneCard title="Controls" metric={`${riskCount} risks`} detail={`${connectedPaymentConnectors}/${paymentConnectors.length} payment connectors`} signal={riskCount ? 'Watch' : 'Ready'} icon={ShieldCheck} onSelect={() => selectFinanceMode('risk')} />
                  </div>
                </Surface>
              </div>
            </div>
          ) : null}

          {activeFinanceMode === 'payments' ? (
            <div className="grid gap-4">
              <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <CosKpiCard label="Collected" value={currency.format(paidOrderValue)} detail={`${orderCollectionRate}% COS collection rate`} icon={WalletCards} tone={orderCollectionRate >= 80 ? 'emerald' : 'amber'} />
                <CosKpiCard label="Open A/R" value={currency.format(openPaymentValue)} detail={`${openPaymentCount} open commerce orders`} icon={ClipboardList} tone={openPaymentCount ? 'amber' : 'emerald'} />
                <CosKpiCard label="Service value" value={currency.format(serviceValue)} detail={`${snapshot.serviceBookings.length} booking records`} icon={CalendarCheck} tone="emerald" />
                <CosKpiCard label="Unassigned" value={currency.format(unassignedServiceValue)} detail="service value needing owner" icon={UsersRound} tone={unassignedServiceValue ? 'amber' : 'emerald'} />
              </section>

              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Surface title="Receivables Ledger" subtitle="COS and Service money records with owner and collection status.">
                  <div className="divide-y divide-border">
                    {ledgerEntries.map((entry) => <FinanceLedgerRow key={entry.id} entry={entry} />)}
                  </div>
                </Surface>

                <Surface title="Collection Queue" subtitle="Payments and service value to clear first.">
                  <div className="divide-y divide-border">
                    {(paymentActions.length ? paymentActions : [clearAction]).map((action) => (
                      <FinanceActionRow key={action.title} action={action} onSelect={selectFinanceMode} />
                    ))}
                  </div>
                </Surface>
              </div>
            </div>
          ) : null}

          {activeFinanceMode === 'forecast' ? (
            <div className="grid gap-4">
              <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <CosKpiCard label="Target" value={currency.format(revenueTarget)} detail={`${targetCoverage}% covered by MTD`} icon={Target} tone="violet" />
                <CosKpiCard label="Gap" value={currency.format(snapshot.metrics.revenueGap)} detail="remaining target delta" icon={AlertTriangle} tone={snapshot.metrics.revenueGap ? 'rose' : 'emerald'} />
                <CosKpiCard label="Proposal pipe" value={currency.format(proposalPipeline)} detail="proposal-stage lead value" icon={BarChart3} tone={proposalPipeline >= snapshot.metrics.revenueGap ? 'emerald' : 'amber'} />
                <CosKpiCard label="Repeat revenue" value={currency.format(repeatRevenueValue)} detail={`${snapshot.metrics.repeatRevenueRate}% of MTD`} icon={RefreshCcw} tone={snapshot.metrics.repeatRevenueRate >= 40 ? 'emerald' : 'amber'} />
              </section>

              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <Surface title="Gap Bridge" subtitle="Which finance levers can close the remaining target.">
                  <div className="grid gap-3">
                    <FinanceBridgeRow label="Collect receivables" value={currency.format(openPaymentValue)} detail={`${openPaymentCount} COS payments`} progress={snapshot.metrics.revenueGap ? Math.round((openPaymentValue / snapshot.metrics.revenueGap) * 100) : 100} />
                    <FinanceBridgeRow label="Close proposals" value={currency.format(proposalPipeline)} detail="proposal-stage pipeline" progress={snapshot.metrics.revenueGap ? Math.round((proposalPipeline / snapshot.metrics.revenueGap) * 100) : 100} />
                    <FinanceBridgeRow label="Service bookings" value={currency.format(serviceValue)} detail={`${snapshot.serviceBookings.length} active bookings`} progress={snapshot.metrics.revenueGap ? Math.round((serviceValue / snapshot.metrics.revenueGap) * 100) : 100} />
                    <FinanceBridgeRow label="Repeat base" value={currency.format(repeatRevenueValue)} detail={`${snapshot.metrics.repeatRevenueRate}% repeat revenue`} progress={snapshot.metrics.revenueMtd ? snapshot.metrics.repeatRevenueRate : 0} />
                  </div>
                </Surface>

                <Surface title="Forecast Queue" subtitle="Actions that change the revenue bridge.">
                  <div className="divide-y divide-border">
                    {(forecastActions.length ? forecastActions : [clearAction]).map((action) => (
                      <FinanceActionRow key={action.title} action={action} onSelect={selectFinanceMode} />
                    ))}
                  </div>
                </Surface>
              </div>
            </div>
          ) : null}

          {activeFinanceMode === 'risk' ? (
            <div className="grid gap-4">
              <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <CosKpiCard label="Finance health" value={`${financeHealth}%`} detail="collection, target, repeat, connector coverage" icon={ShieldCheck} tone={financeHealth >= 80 ? 'emerald' : 'amber'} />
                <CosKpiCard label="Risk items" value={String(riskCount)} detail="payments, gap, service, connector checks" icon={AlertTriangle} tone={riskCount ? 'rose' : 'emerald'} />
                <CosKpiCard label="Payment rails" value={`${connectedPaymentConnectors}/${paymentConnectors.length}`} detail="connected payment connectors" icon={PlugZap} tone={connectedPaymentConnectors === paymentConnectors.length ? 'emerald' : 'amber'} />
                <CosKpiCard label="AI actions" value={String(snapshot.aiActions.length)} detail={`${snapshot.metrics.aiActionsCompleted} completed actions`} icon={Bot} tone="violet" />
              </section>

              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <Surface title="Finance Controls" subtitle="Operating checks before cash, forecast, and reporting are trusted.">
                  <div className="divide-y divide-border">
                    <FinanceControlRow label="Payment proof" value={`${paidOrders}/${snapshot.commerceOrders.length} COS orders paid`} status={openPaymentCount ? 'Watch' : 'Ready'} />
                    <FinanceControlRow label="Revenue target" value={`${targetCoverage}% covered`} status={snapshot.metrics.revenueGap ? 'Action' : 'Ready'} />
                    <FinanceControlRow label="Service ownership" value={unassignedServiceValue ? `${currency.format(unassignedServiceValue)} unassigned` : 'All assigned'} status={unassignedServiceValue ? 'Watch' : 'Ready'} />
                    <FinanceControlRow label="Payment connectors" value={`${connectedPaymentConnectors}/${paymentConnectors.length} connected`} status={connectedPaymentConnectors === paymentConnectors.length ? 'Ready' : 'Setup'} />
                    <FinanceControlRow label="Repeat base" value={`${snapshot.metrics.repeatRevenueRate}% repeat revenue`} status={snapshot.metrics.repeatRevenueRate >= 40 ? 'Ready' : 'Watch'} />
                  </div>
                </Surface>

                <Surface title="Risk Queue" subtitle="Finance blockers to resolve.">
                  <div className="divide-y divide-border">
                    {(riskActions.length ? riskActions : [clearAction]).map((action) => (
                      <FinanceActionRow key={action.title} action={action} onSelect={selectFinanceMode} />
                    ))}
                  </div>
                </Surface>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function FinanceModeRail({
  activeMode,
  healthScore,
  openPayments,
  gapValue,
  riskCount,
  onSelect,
}: {
  activeMode: FinanceMode;
  healthScore: number;
  openPayments: number;
  gapValue: number;
  riskCount: number;
  onSelect: (mode: FinanceMode) => void;
}) {
  return (
    <aside className="border-r border-border bg-background">
      <div className="grid grid-cols-1">
        <FinanceRailItem active={activeMode === 'overview'} label="Control" value={`${healthScore}%`} icon={CircleDollarSign} onClick={() => onSelect('overview')} />
        <FinanceRailItem active={activeMode === 'payments'} label="Pay" value={String(openPayments)} icon={WalletCards} onClick={() => onSelect('payments')} />
        <FinanceRailItem active={activeMode === 'forecast'} label="Plan" value={compactCurrency.format(gapValue)} icon={Target} onClick={() => onSelect('forecast')} />
        <FinanceRailItem active={activeMode === 'risk'} label="Risk" value={String(riskCount)} icon={ShieldCheck} onClick={() => onSelect('risk')} />
      </div>
    </aside>
  );
}

function FinanceRailItem({ active = false, label, value, icon: Icon, onClick }: {
  active?: boolean;
  label: string;
  value: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group flex min-h-[92px] w-full flex-col items-center justify-center gap-3 border-b border-border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase leading-none">{label}</span>
        <span className="mt-1 block font-identifier text-sm font-semibold leading-none">{value}</span>
      </span>
    </button>
  );
}

function FinanceOpsPanel({
  activeMode,
  query,
  onQueryChange,
  actions,
  ledgerEntries,
  onSelect,
}: {
  activeMode: FinanceMode;
  query: string;
  onQueryChange: (value: string) => void;
  actions: FinanceQueueAction[];
  ledgerEntries: FinanceLedgerEntry[];
  onSelect: (mode: FinanceMode) => void;
}) {
  const activeModeLabel = activeMode === 'overview' ? 'Control' : activeMode === 'payments' ? 'Payments' : activeMode === 'forecast' ? 'Forecast' : 'Risk';

  return (
    <section className="flex min-h-0 min-w-0 flex-col border-r border-border bg-[hsl(var(--surface-control))]">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Finance queue</h2>
          <span className="font-identifier text-xs text-muted-foreground">{activeModeLabel}</span>
        </div>
        <div className="mt-3 grid gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Find payment or risk"
              className="h-9 rounded-md border-border bg-background pl-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <FinanceFocusButton active={activeMode === 'overview'} label="Control" icon={CircleDollarSign} onClick={() => onSelect('overview')} />
            <FinanceFocusButton active={activeMode === 'payments'} label="Pay" icon={WalletCards} onClick={() => onSelect('payments')} />
            <FinanceFocusButton active={activeMode === 'forecast'} label="Plan" icon={Target} onClick={() => onSelect('forecast')} />
            <FinanceFocusButton active={activeMode === 'risk'} label="Risk" icon={ShieldCheck} onClick={() => onSelect('risk')} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-visible">
        <div className="border-b border-border px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
          Actions
        </div>
        {actions.length ? actions.map((action) => (
          <button
            key={action.title}
            type="button"
            onClick={() => onSelect(action.mode)}
            className="relative grid w-full gap-2 border-b border-border px-4 py-4 text-left transition-colors hover:bg-[hsl(var(--surface-row-hover))]"
          >
            {activeMode === action.mode ? <span className="absolute inset-y-0 left-0 w-1 bg-primary" /> : null}
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{action.title}</div>
                <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{action.detail}</p>
              </div>
              <PriorityPill priority={action.priority} />
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-primary">
              <span>{action.cta}</span>
              <ChevronRight className="size-3.5" />
            </div>
          </button>
        )) : (
          <div className="border-b border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No finance actions match this search.
          </div>
        )}

        <div className="border-b border-border px-4 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
          Ledger
        </div>
        {ledgerEntries.length ? ledgerEntries.slice(0, 8).map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelect('payments')}
            className="grid w-full gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-[hsl(var(--surface-row-hover))]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-foreground">{entry.customer}</span>
              <span className="font-identifier text-xs text-foreground">{currency.format(entry.value)}</span>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
              <span className="truncate">{entry.source} / {entry.paymentStatus}</span>
              <span className="shrink-0">{entry.due}</span>
            </div>
          </button>
        )) : (
          <div className="border-b border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No ledger items match this search.
          </div>
        )}
      </div>
    </section>
  );
}

function FinanceFocusButton({ active, label, icon: Icon, onClick }: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function FinanceLaneCard({ title, metric, detail, signal, icon: Icon, onSelect }: {
  title: string;
  metric: string;
  detail: string;
  signal: 'Ready' | 'Watch' | 'Action';
  icon: LucideIcon;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="group min-w-0 border-b border-border pb-3 text-left transition-colors last:border-b-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:border-b-0 lg:border-r lg:pb-0 lg:pr-3 lg:last:border-r-0">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          <span className="truncate">{title}</span>
        </span>
        <StatusPill status={signal} />
      </div>
      <div className="mt-3 font-identifier text-xl font-semibold leading-none text-foreground">{metric}</div>
      <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-muted-foreground">{detail}</p>
    </button>
  );
}

function FinanceActionRow({ action, onSelect }: {
  action: FinanceQueueAction;
  onSelect: (mode: FinanceMode) => void;
}) {
  return (
    <div className="grid gap-3 py-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{action.title}</div>
          <p className="mt-1 text-sm font-medium leading-5 text-muted-foreground">{action.detail}</p>
        </div>
        <PriorityPill priority={action.priority} />
      </div>
      <Button size="sm" variant="outline" className="h-8 w-fit rounded-md px-2 text-xs" onClick={() => onSelect(action.mode)}>
        {action.cta}
        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  );
}

function FinanceLedgerRow({ entry }: { entry: FinanceLedgerEntry }) {
  return (
    <div className="grid gap-2 py-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{entry.customer}</div>
          <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{entry.source} / {entry.label} / {entry.owner}</div>
        </div>
        <div className="shrink-0 text-right font-identifier text-sm font-semibold text-foreground">{currency.format(entry.value)}</div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          <StatusPill status={entry.paymentStatus} />
          <StatusPill status={entry.status} />
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">{entry.due}</span>
      </div>
    </div>
  );
}

function FinanceBridgeRow({ label, value, detail, progress }: { label: string; value: string; detail: string; progress: number }) {
  const safeProgress = Math.max(0, Math.min(progress, 100));

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-background p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{label}</div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">{detail}</div>
        </div>
        <span className="shrink-0 font-identifier text-sm font-semibold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${safeProgress}%` }} />
      </div>
    </div>
  );
}

function FinanceControlRow({ label, value, status }: { label: string; value: string; status: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{value}</div>
      </div>
      <StatusPill status={status} />
    </div>
  );
}

function buildAgentAnswer(question: string, snapshot: GrowthOsSnapshot) {
  const normalized = question.toLowerCase();
  if (normalized.includes('revenue') || normalized.includes('finance')) {
    return `Revenue MTD is ${currency.format(snapshot.metrics.revenueMtd)}. Gap is ${currency.format(snapshot.metrics.revenueGap)}. Priority: close proposal leads and confirm pending payments.`;
  }
  if (normalized.includes('scheduled') || normalized.includes('schedule') || normalized.includes('automation')) {
    return `There are 2 time-based tasks and both are running. Next priority: review run history and confirm recurring automations are still useful.`;
  }
  if (normalized.includes('lead') || normalized.includes('conversion')) {
    return `${numberFormat.format(snapshot.metrics.totalLeads)} leads, ${numberFormat.format(snapshot.metrics.qualifiedLeads)} qualified, ${snapshot.metrics.conversionRate}% conversion. Priority: follow up leads above 85 score today.`;
  }
  if (normalized.includes('service') || normalized.includes('booking')) {
    return `${numberFormat.format(snapshot.metrics.serviceBookings)} service bookings. Priority: assign staff to requested bookings before tomorrow morning.`;
  }
  if (normalized.includes('connector') || normalized.includes('whatsapp') || normalized.includes('facebook') || normalized.includes('instagram') || normalized.includes('tiktok') || normalized.includes('wechat')) {
    const connected = snapshot.connectors.filter((connector) => connector.status === 'connected').length;
    const setupRequired = snapshot.connectors.filter((connector) => connector.status === 'setup_required' || connector.status === 'disconnected').length;
    return `${connected}/${snapshot.connectors.length} connectors are connected. ${setupRequired} still need setup. Open Connectors to test credentials and sync status.`;
  }

  return `Current focus: ${numberFormat.format(snapshot.metrics.qualifiedLeads)} qualified leads, ${currency.format(snapshot.metrics.revenueMtd)} revenue MTD, ${snapshot.aiActions.filter((item) => item.status !== 'approved').length} AI actions pending.`;
}

function AgentChatPopup({ snapshot }: { snapshot: GrowthOsSnapshot }) {
  const queryClient = useQueryClient();
  const token = getPrimeAuthToken();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; body: string }>>([
    {
      role: 'agent',
      body: `PrimeOS is live. Ask about leads, conversion, revenue, service, or next action.`,
    },
  ]);
  const approveMutation = useMutation({
    mutationFn: approveGrowthAiAction,
    onSuccess: (action) => {
      queryClient.setQueryData<GrowthOsSnapshot>(['growth-os'], (current) => {
        const base = current || snapshot;
        return {
          ...base,
          aiActions: base.aiActions.map((item) => item.id === action.id ? action : item),
          metrics: { ...base.metrics, aiActionsCompleted: base.metrics.aiActionsCompleted + 1 },
        };
      });
      toast.success('AI action approved.');
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to approve action.'),
  });

  const approve = (action: GrowthAiAction) => {
    if (token) {
      approveMutation.mutate(action.id);
      return;
    }

    queryClient.setQueryData<GrowthOsSnapshot>(['growth-os'], (current) => {
      const base = current || snapshot;
      return { ...base, aiActions: base.aiActions.map((item) => item.id === action.id ? { ...item, status: 'approved' } : item) };
    });
    toast.info('AI action approved locally.');
  };

  const sendMessage = () => {
    const question = draft.trim();
    if (!question) return;

    setMessages((current) => [
      ...current,
      { role: 'user', body: question },
      { role: 'agent', body: buildAgentAnswer(question, snapshot) },
    ]);
    setDraft('');
  };

  if (!open) {
    return (
      <Button
        type="button"
        className={cn('fixed bottom-5 right-4 z-50 size-10 rounded-full p-0 shadow-[0_16px_36px_rgba(8,30,84,0.18)] sm:right-5 sm:size-11', primaryButtonClass)}
        onClick={() => setOpen(true)}
        aria-label="Open Agent"
      >
        <MessageSquare className="size-4" />
      </Button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-50 flex max-h-[72vh] w-[360px] max-w-[calc(100vw-6rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[0_24px_70px_rgba(8,30,84,0.22)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">PrimeOS Agent</div>
          <div className="text-xs font-medium text-muted-foreground">{snapshot.aiActions.filter((item) => item.status !== 'approved').length} pending actions</div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => setOpen(false)} aria-label="Close Agent">
          <X className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="grid gap-2">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                'max-w-[92%] rounded-lg px-3 py-2 text-sm font-medium leading-5',
                message.role === 'user'
                  ? 'ml-auto bg-primary text-background'
                  : 'border border-border bg-card text-foreground'
              )}
            >
              {message.body}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Suggested actions</div>
          {snapshot.aiActions.slice(0, 3).map((action) => (
            <div key={action.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">{action.title}</div>
                  <div className="mt-1 text-xs font-semibold text-muted-foreground">{action.confidence}% confidence</div>
                </div>
                <Button size="sm" variant={action.status === 'approved' ? 'secondary' : 'outline'} className="h-8 rounded-lg" disabled={action.status === 'approved' || approveMutation.isPending} onClick={() => approve(action)}>
                  {action.status === 'approved' ? 'Done' : 'Approve'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
        <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') sendMessage();
            }}
            placeholder="Ask about the business"
            className="h-10 rounded-lg border-border"
          />
          <Button type="button" size="icon" className={cn('h-10 w-10 rounded-lg', primaryButtonClass)} onClick={sendMessage} aria-label="Send message">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function SimpleTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <>
    <div className="grid gap-2 sm:hidden">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="prime-dashboard-surface rounded-lg border p-3">
            <div className="text-sm font-semibold text-foreground">{row[0]}</div>
            <div className="mt-3 grid gap-2">
              {row.slice(1).map((cell, cellIndex) => (
                <div key={`${rowIndex}-${cellIndex}`} className="flex items-start justify-between gap-3 text-sm">
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">{columns[cellIndex + 1]}</span>
                  <span className="min-w-0 max-w-[62%] text-right font-medium text-foreground">{cell}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="group">
                  {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="border-b px-3 py-2.5 text-sm font-medium text-foreground group-last:border-b-0">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function PrimeGrowthOSPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const activeModuleId = normalizeModuleId(searchParams.get('module'));
  const activeModule = moduleMap.get(activeModuleId) || primeModules[0];
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['growth-os'],
    queryFn: fetchGrowthOsSnapshot,
    staleTime: 60_000,
  });

  if (error && !data) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle className="size-12 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Failed to load PrimeOS data</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{error.message || 'An unexpected error occurred. Please try again.'}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCcw className="mr-2 size-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading && !data && activeModuleId !== 'cos' && activeModuleId !== 'finance') {
    return (
      <div className="prime-stage h-full overflow-y-auto">
        <div className="flex min-h-full w-full min-w-0 flex-col gap-5 px-4 pb-24 pt-5 sm:px-6 lg:px-7 xl:pr-20">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-1 h-4 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  const snapshot = data || fallbackGrowthOsSnapshot;

  const openModule = (module: PrimeModuleId) => {
    setSearchParams(module === 'overview' ? {} : { module });
  };

  const addLeadToCache = (lead: GrowthLead) => {
    queryClient.setQueryData<GrowthOsSnapshot>(['growth-os'], (current) => {
      const base = current || snapshot;
      return { ...base, metrics: { ...base.metrics, totalLeads: base.metrics.totalLeads + 1 }, leads: [lead, ...base.leads] };
    });
  };

  if (activeModuleId === 'cos') {
    return (
      <div className="prime-stage h-full overflow-hidden text-foreground">
        <CosView snapshot={snapshot} />
      </div>
    );
  }

  if (activeModuleId === 'finance') {
    return (
      <div className="prime-stage h-full overflow-hidden text-foreground">
        <FinanceView snapshot={snapshot} />
      </div>
    );
  }

  return (
    <div className="prime-stage h-full overflow-y-auto overflow-x-hidden text-foreground">
      <div className="flex min-h-full w-full min-w-0 flex-col gap-5 px-4 pb-24 pt-4 sm:px-6 lg:px-7 xl:pr-20">
        <ModuleHeader module={activeModule} isLoading={isLoading} snapshot={snapshot} />
        {activeModuleId === 'overview' ? <OverviewView snapshot={snapshot} onOpenModule={openModule} /> : null}
        {activeModuleId === 'crm' ? <CrmView snapshot={snapshot} onLeadCreated={addLeadToCache} /> : null}
        {activeModuleId === 'scheduled' ? <ScheduledView /> : null}
        {activeModuleId === 'service' ? <ServiceView snapshot={snapshot} /> : null}
        {activeModuleId === 'connectors' ? <ConnectorsView snapshot={snapshot} /> : null}
        {activeModuleId === 'automation' ? <AutomationView snapshot={snapshot} /> : null}
      </div>
    </div>
  );
}
