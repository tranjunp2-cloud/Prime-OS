import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Mail,
  Megaphone,
  Send,
  ShoppingCart,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

type ReportStatus = 'ready' | 'scheduled' | 'needs_data' | 'draft';
type ReportTone = 'success' | 'warning' | 'primary' | 'muted';

type ClientReport = {
  id: string;
  client: string;
  market: string;
  report: string;
  period: string;
  status: ReportStatus;
  owner: string;
  delivery: string;
  sections: string[];
  nextAction: string;
};

type ReportTemplate = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  cadence: string;
  sections: string[];
};

const statusMeta: Record<ReportStatus, { label: string; className: string; icon: LucideIcon }> = {
  ready: {
    label: 'Ready',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  scheduled: {
    label: 'Scheduled',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    icon: CalendarDays,
  },
  needs_data: {
    label: 'Needs data',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    icon: AlertTriangle,
  },
  draft: {
    label: 'Draft',
    className: 'border-border bg-muted text-muted-foreground',
    icon: Clock3,
  },
};

const toneClass: Record<ReportTone, string> = {
  success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  primary: 'border-primary/25 bg-primary/10 text-primary',
  muted: 'border-border bg-card text-foreground',
};

const metricCards = [
  { label: 'Clients covered', value: '08', detail: 'Reporting workspaces', icon: UsersRound, tone: 'primary' as ReportTone },
  { label: 'Ready to send', value: '05', detail: 'Awaiting client delivery', icon: Send, tone: 'success' as ReportTone },
  { label: 'Needs source data', value: '02', detail: 'Connector or spend gap', icon: AlertTriangle, tone: 'warning' as ReportTone },
  { label: 'Scheduled reports', value: '12', detail: 'Weekly and monthly runs', icon: CalendarDays, tone: 'muted' as ReportTone },
];

const clientReports: ClientReport[] = [
  {
    id: 'cr_001',
    client: 'Nordic Desk JP',
    market: 'Japan',
    report: 'Monthly Business Review',
    period: 'Jul 2026',
    status: 'ready',
    owner: 'Admatik Ops',
    delivery: 'Email + portal',
    sections: ['GMV', 'orders', 'marketplace health', 'next actions'],
    nextAction: 'Send to client owner',
  },
  {
    id: 'cr_002',
    client: 'Venus Beauty SEA',
    market: 'SEA',
    report: 'Campaign Recap',
    period: 'Wk 31',
    status: 'scheduled',
    owner: 'Growth Team',
    delivery: 'Friday 09:00',
    sections: ['ad spend', 'lead quality', 'booking conversion'],
    nextAction: 'Wait for scheduled send',
  },
  {
    id: 'cr_003',
    client: 'Atelier Coffee VN',
    market: 'Vietnam',
    report: 'Marketplace Operations',
    period: 'Jul 2026',
    status: 'needs_data',
    owner: 'Connector Ops',
    delivery: 'Manual review',
    sections: ['Shopee', 'TikTok Shop', 'listing blockers'],
    nextAction: 'Reconnect TikTok Shop spend',
  },
  {
    id: 'cr_004',
    client: 'Prime Studio Services',
    market: 'Vietnam',
    report: 'Service Booking Report',
    period: 'Jul 2026',
    status: 'draft',
    owner: 'Service Team',
    delivery: 'Client portal',
    sections: ['booking sources', 'lead conversion', 'rebooking'],
    nextAction: 'Generate final summary',
  },
];

const reportTemplates: ReportTemplate[] = [
  {
    id: 'tpl_mbr',
    title: 'Monthly Business Review',
    description: 'Client-facing summary for revenue, orders, lead conversion, channel health, and recommended next actions.',
    icon: FileText,
    cadence: 'Monthly',
    sections: ['Executive summary', 'Revenue movement', 'Channel health', 'Action plan'],
  },
  {
    id: 'tpl_campaign',
    title: 'Campaign Recap',
    description: 'Shows which campaign created leads, customers, bookings, and revenue so Admatik can prove impact.',
    icon: Megaphone,
    cadence: 'Weekly or campaign end',
    sections: ['Spend', 'Lead quality', 'Conversion', 'Scale decision'],
  },
  {
    id: 'tpl_marketplace',
    title: 'Marketplace Operations',
    description: 'Turns connector, listing, order, and fulfillment signals into a client-ready marketplace status report.',
    icon: ShoppingCart,
    cadence: 'Weekly',
    sections: ['Marketplace status', 'Order issues', 'Listing blockers', 'Sync health'],
  },
  {
    id: 'tpl_finance',
    title: 'Revenue Evidence Pack',
    description: 'Packages settlements, refunds, invoices, and marketplace proof for owner or finance review.',
    icon: CircleDollarSign,
    cadence: 'Monthly',
    sections: ['Settlements', 'Refunds', 'Invoices', 'Evidence gaps'],
  },
];

const scheduledDeliveries = [
  { client: 'Nordic Desk JP', report: 'Monthly Business Review', time: 'Today 16:00', channel: 'Email', status: 'Ready' },
  { client: 'Venus Beauty SEA', report: 'Campaign Recap', time: 'Fri 09:00', channel: 'Portal', status: 'Scheduled' },
  { client: 'Atelier Coffee VN', report: 'Marketplace Operations', time: 'Blocked', channel: 'Manual', status: 'Needs data' },
  { client: 'Prime Studio Services', report: 'Service Booking Report', time: 'Tomorrow 10:30', channel: 'Portal', status: 'Draft' },
];

const clientCoverage = [
  { client: 'Nordic Desk JP', dataCoverage: 96, lastGenerated: 'Today 11:45', reports: '4 active', issue: 'None' },
  { client: 'Venus Beauty SEA', dataCoverage: 91, lastGenerated: 'Today 09:20', reports: '3 active', issue: 'None' },
  { client: 'Atelier Coffee VN', dataCoverage: 74, lastGenerated: 'Yesterday 17:10', reports: '2 active', issue: 'Ad spend gap' },
  { client: 'Prime Studio Services', dataCoverage: 82, lastGenerated: 'Yesterday 14:35', reports: '2 active', issue: 'Draft approval' },
];

function StatusBadge({ status }: { status: ReportStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <Badge variant="outline" className={cn('gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold', meta.className)}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}

export function PrimeClientReportsPage() {
  return (
    <div className="space-y-6 p-4 pb-28 md:p-6 md:pb-28">
      <header className="border-b pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Building2 className="size-4 text-primary" />
              Reports / Client Delivery
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Client Reports</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Generate, review, schedule, and send client-facing reports. This page packages PrimeOS performance evidence instead of duplicating the live Performance dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-9 rounded-md">
              <Download className="size-4" />
              Export index
            </Button>
            <Button className="h-9 rounded-md">
              <FileText className="size-4" />
              New report
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Client report summary">
        {metricCards.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card key={metric.label} className={cn('rounded-lg shadow-sm', toneClass[metric.tone])}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">{metric.label}</div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">{metric.value}</div>
                  <div className="mt-1 text-xs font-medium text-muted-foreground">{metric.detail}</div>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-background/70">
                  <Icon className="size-4" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden rounded-lg shadow-sm">
          <CardHeader className="border-b px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Client reporting queue</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Reports are grouped by client, period, delivery state, and source-data readiness.</p>
              </div>
              <Badge variant="secondary" className="rounded-md">{clientReports.length} reports</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table variant="compact">
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Next action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{report.client}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{report.market} - Owner {report.owner}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{report.report}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{report.period}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {report.sections.slice(0, 3).map((section) => (
                          <span key={section} className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{section}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={report.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Mail className="size-3.5" />
                        {report.delivery}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-foreground">{report.nextAction}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm">
          <CardHeader className="border-b px-4 py-4">
            <CardTitle className="text-base">Scheduled delivery</CardTitle>
            <p className="text-xs text-muted-foreground">What Admatik sends next, and where it is blocked.</p>
          </CardHeader>
          <CardContent className="grid gap-3 p-4">
            {scheduledDeliveries.map((item) => (
              <div key={`${item.client}-${item.report}`} className="rounded-md border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{item.client}</div>
                    <div className="mt-1 truncate text-xs font-medium text-muted-foreground">{item.report}</div>
                  </div>
                  <span className="rounded-md border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground">{item.status}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{item.time}</span>
                  <span>{item.channel}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-3 lg:grid-cols-4" aria-label="Report templates">
        {reportTemplates.map((template) => {
          const Icon = template.icon;

          return (
            <Card key={template.id} className="rounded-lg shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <Badge variant="outline" className="rounded-md">{template.cadence}</Badge>
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground">{template.title}</h2>
                <p className="mt-2 min-h-16 text-xs leading-5 text-muted-foreground">{template.description}</p>
                <div className="mt-4 grid gap-1.5 text-xs font-medium text-muted-foreground">
                  {template.sections.map((section) => (
                    <div key={section} className="flex items-center gap-2">
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span>{section}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="overflow-hidden rounded-lg shadow-sm">
        <CardHeader className="border-b px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Client coverage and readiness</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Report readiness should reflect data completeness, not only visual dashboard availability.</p>
            </div>
            <Button variant="outline" className="h-8 rounded-md text-xs">
              <Send className="size-3.5" />
              Send ready reports
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table variant="compact">
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Data coverage</TableHead>
                <TableHead>Last generated</TableHead>
                <TableHead>Active reports</TableHead>
                <TableHead>Issue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientCoverage.map((client) => (
                <TableRow key={client.client}>
                  <TableCell className="font-semibold text-foreground">{client.client}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={client.dataCoverage} className="h-2 min-w-28" />
                      <span className="w-10 text-right text-xs font-semibold text-foreground">{client.dataCoverage}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{client.lastGenerated}</TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">{client.reports}</TableCell>
                  <TableCell className={cn('text-xs font-semibold', client.issue === 'None' ? 'text-emerald-600' : 'text-amber-700 dark:text-amber-300')}>
                    {client.issue}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
