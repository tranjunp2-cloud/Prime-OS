import {
  ArrowRight,
  Bot,
  Boxes,
  BrainCircuit,
  Building2,
  CircleDollarSign,
  Database,
  HeartHandshake,
  LineChart,
  Megaphone,
  ShoppingCart,
  Sparkles,
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

const areaCards = [
  {
    title: 'Intelligence Area',
    signal: 'Step 1 · Understand the market',
    detail: 'Creators, Customers, Campaigns, AI Operator, VOC, and analytics help a brand see product opportunity, trend direction, and target audience before execution begins.',
    href: '/intelligence/creators',
    icon: BrainCircuit,
  },
  {
    title: 'Ecom Area',
    signal: 'Step 2 · Set up what to sell',
    detail: 'Commerce Surface and COS turn insight into sellable readiness: product master, SKU, inventory, listing, OMS, fulfillment, policy, and audit.',
    href: '/ecom/cos/product-master',
    icon: Store,
  },
  {
    title: 'Demand Area',
    signal: 'Step 3 · Bring demand in',
    detail: 'Campaign Ops, Content & Creator Ops, Lead & Response Capture, and Retargeting & Outreach activate traffic, creators, offers, and lead conversion against live products.',
    href: '/demand/campaign-ops',
    icon: Megaphone,
  },
  {
    title: 'Customer Area',
    signal: 'Step 4 · Retain and grow',
    detail: 'CRM Compact and Service keep customer memory, follow-up, issue recovery, lifecycle context, and repeat purchase motion inside the same operating system.',
    href: '/customer/crm-compact',
    icon: HeartHandshake,
  },
  {
    title: 'Finance Area',
    signal: 'Step 5 · Expand strategic value',
    detail: 'Capital Readiness, Lending & Partner Flow, and Risk & Trust Layer show how PrimeOS can extend from operating software into finance-enabling infrastructure.',
    href: '/finance/capital',
    icon: CircleDollarSign,
  },
];

const differentiationCards = [
  {
    title: 'Not just a dashboard',
    detail: 'PrimeOS is designed to turn data into recommendation, action, and execution instead of stopping at charts or reporting.',
    icon: TrendingUp,
  },
  {
    title: 'Not just one tool',
    detail: 'The value is not a single feature like CRM, ads, KOL, or listing. The value is the closed loop across those capabilities.',
    icon: Sparkles,
  },
  {
    title: 'Not just inbound',
    detail: 'PrimeOS covers both inbound signal capture and outbound execution, so it can create opportunity and also react to it.',
    icon: ArrowRight,
  },
  {
    title: 'Not just software ops',
    detail: 'The system creates transactional intelligence that can become a strategic data layer for CR over time.',
    icon: Database,
  },
];

const crValueCards = [
  {
    title: 'CR today',
    points: [
      'Company, tax, and transaction-related business data',
      'Existing ecosystem relationships with buyers and partners',
      'Strong visibility at company level, but less at customer behavior level',
    ],
    icon: Building2,
  },
  {
    title: 'PrimeOS adds',
    points: [
      'Who buys what, through which channel, and with what repeat behavior',
      'Audience, trend, and product opportunity signals',
      'A linked layer from market insight to transaction and retention',
    ],
    icon: Database,
  },
  {
    title: 'Combined outcome',
    points: [
      'A stronger transaction intelligence platform for manufacturers and SMBs',
      'A path toward financial services, lending, or bank partnership use cases',
      'A revenue model that can grow beyond pure subscription software',
    ],
    icon: CircleDollarSign,
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
        description="PrimeOS is positioned as a closed-loop sales, marketing, commerce, and intelligence platform: understand the market, set up the product, bring demand in, retain the customer, and build transactional intelligence over time."
        actions={(
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/intelligence/creators">Open story start</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/finance/capital">Open finance layer</Link>
            </Button>
          </>
        )}
      />

      <div className="space-y-6 p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetricCard
            label="Storyline areas"
            value="5"
            meta="Intelligence -> Ecom -> Demand -> Customer -> Finance is now mapped directly into the app."
            icon={<BrainCircuit className="size-5" />}
            tone="success"
          />
          <SummaryMetricCard
            label="COS control core"
            value={`${snapshot.metrics.cosStrength}%`}
            meta="COS still anchors product, inventory, OMS, and fulfillment proof in Phase 1."
            icon={<Boxes className="size-5" />}
            tone="info"
          />
          <SummaryMetricCard
            label="Transactional intelligence"
            value={currency.format(snapshot.metrics.revenue)}
            meta="The business story is not only GMV, but who bought, how they converted, and what to do next."
            icon={<Megaphone className="size-5" />}
            tone="warning"
          />
          <SummaryMetricCard
            label="Vision layer"
            value="Live"
            meta="Finance is no longer just narrative text. It is now mapped as an explicit PrimeOS area and routing layer."
            icon={<CircleDollarSign className="size-5" />}
            tone="purple"
          />
        </div>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              <CardTitle>PrimeOS In One Line</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                PrimeOS should be told as a single platform where market understanding, commerce execution, demand creation, customer retention, and AI-assisted action stay connected.
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Pitch message:</p>
                <p className="font-medium text-foreground">A 360 sales and marketing 2-in-1 platform that moves from signal to decision to transaction to retention.</p>
              </div>
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
                Product Master, Inventory Brain, OMS, Fulfillment, Policy & Rule, and Event & Audit remain the proof that PrimeOS is not abstract strategy only. COS is still the control core.
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-4">
          {differentiationCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="rounded-lg border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <div className="rounded-lg border bg-muted/40 p-2">
                      <Icon className="size-4 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>CR Today + PrimeOS Tomorrow</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {crValueCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-lg border bg-muted/20 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-lg border bg-background p-2">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {item.points.map((point) => (
                        <div key={point} className="flex items-start gap-2">
                          <span className="mt-1 size-1.5 rounded-full bg-primary" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Safe Long-term Vision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="font-medium">What we can say safely</p>
                <p className="mt-2 text-muted-foreground">PrimeOS gives CR a missing layer of transaction visibility and customer-level intelligence that can support bigger strategic moves in the future.</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="font-medium">What the long-term vision can be</p>
                <p className="mt-2 text-muted-foreground">Financial services enablement, lending, or bank partnership scenarios for SMBs and manufacturers using operating signals from the platform.</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="font-medium">What we should avoid claiming</p>
                <p className="mt-2 text-muted-foreground">Do not position Phase 1 as if PrimeOS alone directly turns CR into a digital bank. Keep finance as a future-facing vision layer.</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <Bot className="mt-0.5 size-4 text-primary" />
                  <div>
                    <p className="font-medium">Agentic AI as acceleration layer</p>
                    <p className="mt-1 text-sm text-muted-foreground">AI should be pitched as the layer that helps operators ask, navigate, and execute faster on top of the system, not as the only product story.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Slide-ready Storyline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                'PrimeOS helps a manufacturer or brand understand the market first.',
                'Then it prepares the product, SKU, inventory, and commerce readiness inside Ecom.',
                'Then it brings traffic and demand through campaigns, creators, and lead capture.',
                'Then it retains customer memory and repeat purchase context after the transaction.',
                'Then it extends into finance-ready signals, lender routing, and trust scoring for larger strategic value.',
                'The combined result is a new layer of transactional intelligence for CR.',
              ].map((line, index) => (
                <div key={line} className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="text-muted-foreground">{line}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Linked Proof From Phase 1</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                `product + inventory + OMS + fulfillment: ${snapshot.products.length} products / ${snapshot.inventoryPositions.length} inventory rows / ${snapshot.orders.length} orders`,
                `demand + response capture: ${snapshot.campaigns.length} campaigns / ${snapshot.leads.length} leads / ${snapshot.rfqs.length} RFQs`,
                `customer memory + service: ${snapshot.customers.length} compact profiles / ${snapshot.tickets.length} service cases`,
                `intelligence + action: ${snapshot.vocInsights.length} insights / ${snapshot.recommendations.length} recommendations / ${snapshot.alerts.length} alerts`,
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3">
                  <LineChart className="mt-0.5 size-4 text-primary" />
                  <span className="text-muted-foreground">{line}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
