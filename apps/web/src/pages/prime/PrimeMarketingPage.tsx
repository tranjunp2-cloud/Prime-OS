import { useMemo } from 'react';
import { Megaphone, Target, TrendingUp, UsersRound } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';
import {
  PrimeCrmCampaignsSimplePage,
  PrimeCrmReengagementSimplePage,
  PrimeCrmSourcesSimplePage,
} from '@/pages/prime/PrimeCrmJourneyPages';
import { PrimeTowerPage } from '@/pages/prime/PrimeTowerPage';

const views = ['overview', 'campaigns', 'audiences', 'sources', 'content', 'analytics'] as const;
type MarketingView = (typeof views)[number];

const viewLabels: Record<MarketingView, string> = {
  overview: 'Overview',
  campaigns: 'Campaigns',
  audiences: 'Audiences',
  sources: 'Sources',
  content: 'Content Studio',
  analytics: 'Analytics',
};

function MarketingAnalytics() {
  const snapshot = useMemo(() => getPrimeSnapshot(), []);
  const totalSpend = snapshot.campaigns.reduce((sum, item) => sum + item.spend, 0);
  const totalRevenue = snapshot.campaigns.reduce((sum, item) => sum + item.revenue, 0);
  const totalLeads = snapshot.campaigns.reduce((sum, item) => sum + item.leads, 0);
  const totalOrders = snapshot.campaigns.reduce((sum, item) => sum + item.orders, 0);
  const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

  const metrics = [
    { label: 'Attributed revenue', value: `$${totalRevenue.toLocaleString()}`, helper: 'Revenue connected to tracked campaigns.', icon: TrendingUp },
    { label: 'Campaign spend', value: `$${totalSpend.toLocaleString()}`, helper: 'Total spend across active and test campaigns.', icon: Megaphone },
    { label: 'Qualified demand', value: totalLeads.toLocaleString(), helper: `${totalOrders} attributed orders`, icon: UsersRound },
    { label: 'Return on investment', value: `${roi.toFixed(1)}%`, helper: 'Attributed return after campaign spend.', icon: Target },
  ];

  return (
    <div className="space-y-5 p-4 pb-16 md:p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Marketing Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">Measure campaign reach, conversion, revenue, and return in one place.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Marketing performance summary">
        {metrics.map(({ label, value, helper, icon: Icon }) => (
          <Card key={label} className="shadow-none">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
                <Icon className="size-4 text-primary" aria-hidden="true" />
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card className="shadow-none">
        <CardHeader><CardTitle className="text-base">Campaign performance</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {snapshot.campaigns.map((campaign) => {
            const conversion = campaign.leads > 0 ? (campaign.orders / campaign.leads) * 100 : 0;
            return (
              <div key={campaign.id} className="grid gap-3 border-b pb-5 last:border-0 last:pb-0 lg:grid-cols-[minmax(220px,1fr)_120px_120px_1.5fr] lg:items-center">
                <div><div className="font-medium">{campaign.name}</div><div className="text-xs text-muted-foreground">{campaign.channel} · {campaign.status}</div></div>
                <div><div className="text-xs text-muted-foreground">Revenue</div><div className="font-medium">${campaign.revenue.toLocaleString()}</div></div>
                <div><div className="text-xs text-muted-foreground">Conversion</div><div className="font-medium">{conversion.toFixed(1)}%</div></div>
                <div className="space-y-1.5"><div className="flex justify-between text-xs text-muted-foreground"><span>{campaign.orders} orders</span><span>{campaign.leads} leads</span></div><Progress value={Math.min(100, conversion * 4)} /></div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function MarketingOverview() {
  const snapshot = useMemo(() => getPrimeSnapshot(), []);
  const activeCampaigns = snapshot.campaigns.filter((item) => item.status === 'active').length;
  const leads = snapshot.campaigns.reduce((sum, item) => sum + item.leads, 0);
  const orders = snapshot.campaigns.reduce((sum, item) => sum + item.orders, 0);
  const revenue = snapshot.campaigns.reduce((sum, item) => sum + item.revenue, 0);
  const stages = [
    { label: 'Campaigns running', value: activeCampaigns, width: 100 },
    { label: 'Leads captured', value: leads, width: 82 },
    { label: 'Orders attributed', value: orders, width: Math.max(24, Math.min(72, leads ? (orders / leads) * 100 : 0)) },
  ];

  return (
    <div className="space-y-5 p-4 pb-16 md:p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Marketing Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">A focused snapshot of current campaign execution, demand, and attributed outcomes.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Marketing overview metrics">
        {[
          ['Active campaigns', activeCampaigns, 'Campaigns currently delivering.'],
          ['Leads captured', leads, 'Demand attributed to campaign sources.'],
          ['Attributed orders', orders, 'Orders connected to marketing touchpoints.'],
          ['Attributed revenue', `$${revenue.toLocaleString()}`, 'Revenue influenced by campaigns.'],
        ].map(([label, value, helper]) => (
          <Card key={String(label)} className="shadow-none"><CardContent className="p-4"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-3 text-2xl font-semibold">{value}</div><p className="mt-1 text-xs text-muted-foreground">{helper}</p></CardContent></Card>
        ))}
      </section>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Campaign funnel</CardTitle></CardHeader><CardContent className="space-y-5">{stages.map((stage) => <div key={stage.label}><div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">{stage.label}</span><span className="font-semibold">{stage.value}</span></div><Progress value={stage.width} /></div>)}</CardContent></Card>
        <Card className="shadow-none"><CardHeader><CardTitle className="text-base">Operator focus</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">{snapshot.campaigns.slice(0, 3).map((campaign) => <div key={campaign.id} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><span className="font-medium">{campaign.name}</span><span className="capitalize text-muted-foreground">{campaign.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{campaign.channel} · {campaign.leads} leads · {campaign.orders} orders</p></div>)}</CardContent></Card>
      </div>
    </div>
  );
}

export function PrimeMarketingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedView = searchParams.get('view');
  const activeView: MarketingView = views.includes(requestedView as MarketingView) ? requestedView as MarketingView : 'campaigns';

  const changeView = (view: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', view);
    setSearchParams(next, { replace: false });
  };

  return (
    <div className="min-h-full bg-background" data-testid="marketing-workspace">
      <header className="border-b px-4 py-5 md:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border bg-card text-primary shadow-sm"><Megaphone className="size-5" aria-hidden="true" /></span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
            <p className="mt-1 text-sm text-muted-foreground">Plan audiences, operate campaigns, create content, and measure performance without mixing customer record management into the workflow.</p>
          </div>
        </div>
      </header>
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-2 backdrop-blur md:px-6">
        <Tabs value={activeView} onValueChange={changeView}>
          <TabsList className="h-auto max-w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
            {views.map((view) => <TabsTrigger key={view} value={view} className="h-9 shrink-0 rounded-md px-3 text-sm data-[state=active]:bg-muted data-[state=active]:shadow-none">{viewLabels[view]}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      {activeView === 'overview' ? <MarketingOverview /> : null}
      {activeView === 'campaigns' ? <PrimeCrmCampaignsSimplePage /> : null}
      {activeView === 'audiences' ? <PrimeCrmReengagementSimplePage /> : null}
      {activeView === 'sources' ? <PrimeCrmSourcesSimplePage /> : null}
      {activeView === 'content' ? <PrimeTowerPage towerId="content-creator-ops" /> : null}
      {activeView === 'analytics' ? <MarketingAnalytics /> : null}
    </div>
  );
}
