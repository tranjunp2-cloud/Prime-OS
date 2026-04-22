import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  CircleDollarSign,
  HeartHandshake,
  Megaphone,
  ShoppingCart,
  Store,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PageHeader } from '@/components/system/PageHeader';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';

const currency = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

const journeySteps = [
  {
    step: 1,
    area: 'Intelligence',
    question: 'What should I sell and to whom?',
    href: '/intelligence/creators',
    icon: BarChart3,
    metricLabel: 'Insights',
  },
  {
    step: 2,
    area: 'Ecom',
    question: 'Is my product ready to sell?',
    href: '/ecom/cos/product-master',
    icon: Store,
    metricLabel: 'Products',
  },
  {
    step: 3,
    area: 'Demand',
    question: 'Am I reaching the right people?',
    href: '/demand/campaign-ops',
    icon: Megaphone,
    metricLabel: 'Campaigns',
  },
  {
    step: 4,
    area: 'Customer',
    question: 'Am I turning buyers into repeat customers?',
    href: '/customer/crm-compact',
    icon: HeartHandshake,
    metricLabel: 'Profiles',
  },
  {
    step: 5,
    area: 'Finance',
    question: 'Can my operating data support growth capital?',
    href: '/finance/capital',
    icon: CircleDollarSign,
    metricLabel: 'Score',
  },
];

export function PrimeOverview() {
  const snapshot = getPrimeSnapshot();

  const totalTraffic = snapshot.campaigns.reduce((sum, c) => sum + c.traffic, 0);
  const totalLeads = snapshot.leads.length;
  const totalOrders = snapshot.orders.length;
  const repeatCustomers = snapshot.customers.filter((c) => c.totalOrders > 1).length;
  const highRiskSkus = snapshot.forecasts.filter((f) => f.risk === 'high').length;
  const openTickets = snapshot.tickets.filter((t) => t.status !== 'resolved').length;
  const topCreator = snapshot.campaigns[0];
  const leadToOrder = snapshot.metrics.leadToOrderRate;

  const repaymentReadiness = snapshot.customers.length
    ? Math.min(96, 62 + snapshot.customers.filter((c) => c.totalOrders > 0).length * 4)
    : 0;

  const areaMetricValues: Record<string, string> = {
    Intelligence: `${snapshot.vocInsights.length + snapshot.insightModels.length}`,
    Ecom: `${snapshot.products.length}`,
    Demand: `${snapshot.campaigns.length}`,
    Customer: `${snapshot.customers.length}`,
    Finance: `${repaymentReadiness}%`,
  };

  const areaHealthStatus: Record<string, 'healthy' | 'warning' | 'critical'> = {
    Intelligence: snapshot.vocInsights.length > 0 ? 'healthy' : 'warning',
    Ecom: snapshot.products.length > 0 && snapshot.inventoryPositions.length > 0 ? 'healthy' : 'warning',
    Demand: snapshot.campaigns.length > 0 ? 'healthy' : 'warning',
    Customer: openTickets > 2 ? 'warning' : 'healthy',
    Finance: repaymentReadiness > 70 ? 'healthy' : repaymentReadiness > 40 ? 'warning' : 'critical',
  };

  const healthDot = (status: 'healthy' | 'warning' | 'critical') => {
    if (status === 'healthy') return 'bg-emerald-500';
    if (status === 'warning') return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title="Prime OS"
        description="One system to understand the market, sell the product, reach the customer, keep them coming back, and prove you are ready to scale."
        actions={(
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/intelligence/creators">Start from Intelligence</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/ecom/cos/oms">Check live orders</Link>
            </Button>
          </>
        )}
      />

      <div className="space-y-6 p-4 md:p-6">
        {/* Operating state at a glance */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryMetricCard
            label="Products ready"
            value={snapshot.products.length}
            meta={`${snapshot.inventoryPositions.length} inventory rows across ${snapshot.warehousesCount} warehouses.`}
            icon={<Boxes className="size-5" />}
            tone="info"
          />
          <SummaryMetricCard
            label="Traffic this period"
            value={totalTraffic.toLocaleString()}
            meta={`${snapshot.campaigns.length} campaigns running across ${new Set(snapshot.campaigns.map((c) => c.channel)).size} channels.`}
            icon={<Megaphone className="size-5" />}
            tone="success"
          />
          <SummaryMetricCard
            label="Leads → Orders"
            value={`${totalLeads} → ${totalOrders}`}
            meta={`${leadToOrder}% conversion rate from lead to completed order.`}
            icon={<TrendingUp className="size-5" />}
            tone="warning"
          />
          <SummaryMetricCard
            label="Revenue"
            value={currency.format(snapshot.metrics.revenue)}
            meta={`${repeatCustomers} repeat customers out of ${snapshot.customers.length} total.`}
            icon={<ShoppingCart className="size-5" />}
            tone="success"
          />
          <SummaryMetricCard
            label="Needs attention"
            value={highRiskSkus + openTickets}
            meta={`${highRiskSkus} SKU at stock risk, ${openTickets} open service cases.`}
            icon={<AlertTriangle className="size-5" />}
            tone={highRiskSkus + openTickets > 0 ? 'danger' : 'muted'}
          />
        </div>

        {/* Seller journey — the 5 questions */}
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Your seller journey</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              {journeySteps.map((step) => {
                const Icon = step.icon;
                const health = areaHealthStatus[step.area];
                const metricValue = areaMetricValues[step.area];
                return (
                  <Link
                    key={step.area}
                    to={step.href}
                    className="group flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{step.step}</Badge>
                        <Icon className="size-4 text-primary" />
                        <span className="font-medium">{step.area}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${healthDot(health)}`} />
                        <span className="text-xs font-semibold text-muted-foreground">{metricValue}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{step.question}</p>
                    <span className="mt-auto inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Open <ArrowRight className="size-3" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* What is happening right now + Control tower */}
        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>What is happening right now</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topCreator ? (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">Top campaign: {topCreator.name}</span>
                    <Badge variant="outline">{topCreator.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Running on {topCreator.channel} · SKU {topCreator.skuCode} · {topCreator.traffic.toLocaleString()} traffic · {topCreator.leads} leads · {topCreator.rfqs} RFQs · {currency.format(topCreator.revenue)} revenue
                  </p>
                </div>
              ) : null}

              {snapshot.forecasts.filter((f) => f.risk !== 'low').slice(0, 2).map((forecast) => (
                <div key={forecast.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">Inventory watch: {forecast.skuCode}</span>
                    <Badge variant={forecast.risk === 'high' ? 'destructive' : 'outline'}>{forecast.risk} risk</Badge>
                  </div>
                  <Progress value={forecast.ats ? Math.min(100, Math.round((forecast.demand7d / Math.max(forecast.ats, 1)) * 100)) : 100} className="mt-2 h-2" />
                  <p className="mt-2 text-sm text-muted-foreground">{forecast.suggestedAction}</p>
                </div>
              ))}

              {snapshot.tickets.filter((t) => t.priority === 'high').slice(0, 2).map((ticket) => (
                <div key={ticket.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">Service: {ticket.subject}</span>
                    <Badge variant="destructive">{ticket.priority}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Linked to {ticket.linkedEntity} · SLA: {ticket.sla}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Control tower</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { channel: 'Product catalog', status: snapshot.products.length > 0 ? 'live' as const : 'offline' as const, count: snapshot.products.length, unit: 'SKUs' },
                { channel: 'Inventory', status: snapshot.inventoryPositions.length > 0 ? 'live' as const : 'offline' as const, count: snapshot.inventoryPositions.length, unit: 'positions' },
                { channel: 'Order management', status: snapshot.orders.length > 0 ? 'live' as const : 'idle' as const, count: snapshot.orders.length, unit: 'orders' },
                { channel: 'Fulfillment', status: snapshot.fulfillmentJobsCount > 0 ? 'live' as const : 'idle' as const, count: snapshot.fulfillmentJobsCount, unit: 'jobs' },
                { channel: 'Campaigns', status: snapshot.campaigns.length > 0 ? 'live' as const : 'idle' as const, count: snapshot.campaigns.length, unit: 'active' },
                { channel: 'Customer profiles', status: snapshot.customers.length > 0 ? 'live' as const : 'idle' as const, count: snapshot.customers.length, unit: 'profiles' },
                { channel: 'AI operator', status: snapshot.recommendations.length > 0 ? 'live' as const : 'idle' as const, count: snapshot.recommendations.length, unit: 'actions' },
                { channel: 'Finance signals', status: repaymentReadiness > 50 ? 'live' as const : 'idle' as const, count: repaymentReadiness, unit: '% ready' },
              ].map((item) => (
                <div key={item.channel} className="flex items-center gap-3 text-sm">
                  <span className={`size-2 rounded-full ${item.status === 'live' ? 'bg-emerald-500' : item.status === 'idle' ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} />
                  <span className="flex-1 text-muted-foreground">{item.channel}</span>
                  <span className="font-semibold">{item.count}</span>
                  <span className="w-16 text-xs text-muted-foreground">{item.unit}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Where to act next */}
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Where to act next</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.recommendations.map((rec) => (
              <div key={rec.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{rec.target}</span>
                  <Badge variant="outline">{rec.confidence}%</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{rec.reasoning}</p>
                <p className="mt-2 text-sm text-primary">{rec.action}</p>
              </div>
            ))}

            {snapshot.activationPlays.map((play) => (
              <div key={play.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{play.audience}</span>
                  <Badge variant="outline">+{play.projectedLift}% lift</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{play.trigger}</p>
                <p className="mt-2 text-sm text-primary">{play.nextBestAction}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
