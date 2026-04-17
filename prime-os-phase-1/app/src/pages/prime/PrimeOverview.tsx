import { ArrowRight, Bot, Boxes, HeartHandshake, LineChart, Megaphone, ShoppingCart } from 'lucide-react';
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

const areaCards = [
  {
    title: 'Demand Area',
    signal: 'Creates opportunity',
    detail: 'Acquisition, campaigns, content, lead capture, and retargeting create traceable opportunity against COS products.',
    href: '/demand/campaign',
    icon: Megaphone,
  },
  {
    title: 'Customer Area',
    signal: 'Retains context',
    detail: 'CRM Compact keeps identity, profile, timeline, segmentation, notes, follow-up, loyalty, and B2B account context together.',
    href: '/customer/crm-compact',
    icon: HeartHandshake,
  },
  {
    title: 'Ecom Area',
    signal: 'Executes through COS',
    detail: 'Commerce Surface hands RFQ and assisted commerce into Product Master, Inventory Brain, OMS, Fulfillment, Policy, and Audit.',
    href: '/ecom/cos/oms',
    icon: ShoppingCart,
  },
  {
    title: 'Intelligence Area',
    signal: 'Learns and optimizes',
    detail: 'Analytics, attribution, forecast, VOC, alerts, and AI Operator read linked system context before recommending action.',
    href: '/intelligence/ai-operator',
    icon: Bot,
  },
];

export function PrimeOverview() {
  const snapshot = getPrimeSnapshot();
  const cosProof = [
    { label: 'Products', value: snapshot.products.length },
    { label: 'Inventory rows', value: snapshot.inventoryPositions.length },
    { label: 'Orders', value: snapshot.orders.length },
    { label: 'Fulfillment jobs', value: snapshot.fulfillmentJobsCount },
    { label: 'Shipments', value: snapshot.shipmentsCount },
    { label: 'Audit events', value: snapshot.orderEvents.length + snapshot.trackingEventsCount },
  ];

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title="Prime OS Phase 1"
        description="COS-first commerce operating system prototype: Demand creates opportunity, Customer retains context, Ecom executes, Intelligence learns, and COS remains the control core."
        actions={(
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/ecom/cos/product-master">Open COS core</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/intelligence/ai-operator">Open AI Operator</Link>
            </Button>
          </>
        )}
      />

      <div className="space-y-6 p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetricCard
            label="COS reuse strength"
            value={`${snapshot.metrics.cosStrength}%`}
            meta="Product, inventory, OMS, and fulfillment stores are live in Phase 1."
            icon={<Boxes className="size-5" />}
            tone="success"
          />
          <SummaryMetricCard
            label="COS revenue context"
            value={currency.format(snapshot.metrics.revenue)}
            meta="Computed from reused OMS mock orders."
            icon={<ShoppingCart className="size-5" />}
            tone="info"
          />
          <SummaryMetricCard
            label="Prime opportunity"
            value={currency.format(snapshot.metrics.opportunityValue)}
            meta="Generated RFQ pipeline linked to campaign and order context."
            icon={<Megaphone className="size-5" />}
            tone="warning"
          />
          <SummaryMetricCard
            label="High-risk alerts"
            value={snapshot.metrics.highRiskAlerts}
            meta={`${snapshot.metrics.openIssues} open customer or ops issues.`}
            icon={<LineChart className="size-5" />}
            tone={snapshot.metrics.highRiskAlerts > 0 ? 'danger' : 'muted'}
          />
        </div>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {areaCards.map((area) => {
              const Icon = area.icon;
              return (
                <Card key={area.title} className="rounded-lg border">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="outline" className="mb-3">{area.signal}</Badge>
                        <CardTitle>{area.title}</CardTitle>
                      </div>
                      <div className="rounded-lg border bg-muted/40 p-2">
                        <Icon className="size-5 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="min-h-[4.5rem] text-sm text-muted-foreground">{area.detail}</p>
                    <Button asChild variant="ghost" size="sm" className="mt-4 px-0">
                      <Link to={area.href}>
                        Open area
                        <ArrowRight className="ml-1.5 size-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>COS Tower as Control Core</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cosProof.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <Progress value={Math.min(100, Math.max(12, item.value * 8))} className="h-2" />
                </div>
              ))}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                Product Master, Inventory Brain, OMS, Fulfillment, Policy & Rule, and Event & Audit are mapped into Ecom Area without replacing the original COS proof assets.
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Linked Mock Backbone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                `product + SKU + inventory position: ${snapshot.products.length} products / ${snapshot.inventoryPositions.length} rows`,
                `campaign + traffic + lead + RFQ: ${snapshot.campaigns.length} campaigns / ${snapshot.leads.length} leads / ${snapshot.rfqs.length} RFQs`,
                `customer + order + ticket + timeline: ${snapshot.customers.length} compact profiles / ${snapshot.tickets.length} service cases`,
                `VOC + forecast + AI recommendation + alert: ${snapshot.vocInsights.length} insights / ${snapshot.recommendations.length} recommendations / ${snapshot.alerts.length} alerts`,
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3">
                  <span className="mt-1 size-2 rounded-full bg-primary" />
                  <span>{line}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>BOD Demo Flow Proof</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.demoFlows.map((flow) => (
                <div key={flow.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{flow.id.replace('flow_', 'Flow ')}</Badge>
                    <span className="font-medium">{flow.name}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {flow.path.map((step, index) => (
                      <span key={`${flow.id}-${step}`} className="inline-flex items-center gap-1.5">
                        {index > 0 ? <ArrowRight className="size-3" /> : null}
                        {step}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{flow.proofPoint}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
