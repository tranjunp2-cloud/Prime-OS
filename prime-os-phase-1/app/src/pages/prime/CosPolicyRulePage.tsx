import { ArrowRight, Clock, Route, ShieldCheck, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/system/PageHeader';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { getPrimeSnapshot } from '@/lib/prime/prime-data';

export function CosPolicyRulePage() {
  const snapshot = getPrimeSnapshot();
  const policyRows = [
    {
      floor: 'SLA policy',
      source: 'Reused COS SlaPolicies screen',
      target: 'Service Tower + Fulfillment Control',
      route: '/ecom/cos/policy-rule/sla',
    },
    {
      floor: 'Routing plan',
      source: 'Reused COS RoutingPlans screen',
      target: 'OMS Orchestration + Fulfillment Control',
      route: '/ecom/cos/policy-rule/routing',
    },
    {
      floor: 'Demand guardrail',
      source: 'Prime wrapper from forecast and inventory context',
      target: 'Campaign + Retargeting',
      route: '/intelligence/forecasting',
    },
  ];

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title="COS Policy & Rule Floor"
        description="Wrapper floor for rules already present in COS. SLA and routing screens are reused; Prime OS adds cross-area guardrails that read demand, inventory, service, and forecast context."
        actions={(
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/ecom/cos/policy-rule/sla">SLA policies</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/ecom/cos/policy-rule/routing">Routing plans</Link>
            </Button>
          </>
        )}
      />

      <div className="space-y-6 p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Orders governed" value={snapshot.orders.length} meta="OMS orders inherit policy context." icon={<ShieldCheck className="size-5" />} tone="info" />
          <SummaryMetricCard label="Fulfillment jobs" value={snapshot.fulfillmentJobsCount} meta="Routing policy drives handoff." icon={<Truck className="size-5" />} tone="teal" />
          <SummaryMetricCard label="Open service cases" value={snapshot.metrics.openIssues} meta="SLA policy feeds Service Tower." icon={<Clock className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Rule alerts" value={snapshot.alerts.length} meta="Guardrails for operator review." icon={<Route className="size-5" />} tone="purple" />
        </div>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Policy wrapper map</CardTitle>
            </CardHeader>
            <CardContent>
              <Table variant="embedded">
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy surface</TableHead>
                    <TableHead>Reuse source</TableHead>
                    <TableHead>Prime OS target</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policyRows.map((row) => (
                    <TableRow key={row.floor}>
                      <TableCell className="font-medium">{row.floor}</TableCell>
                      <TableCell>{row.source}</TableCell>
                      <TableCell>{row.target}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm" className="h-auto px-0">
                          <Link to={row.route}>
                            Open
                            <ArrowRight className="ml-1 size-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Rule candidates for Phase 1 demo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.forecasts.slice(0, 4).map((forecast) => (
                <div key={forecast.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{forecast.skuCode}</span>
                    <Badge variant="outline">{forecast.risk} ATS risk</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{forecast.suggestedAction}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
