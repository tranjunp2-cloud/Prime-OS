import { Activity, BellRing, Bot, ClipboardList, History, PackageCheck } from 'lucide-react';
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

export function CosEventAuditPage() {
  const snapshot = getPrimeSnapshot();
  const auditEvents = snapshot.orderEvents.slice(0, 12);

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title="COS Event & Audit Floor"
        description="Audit wrapper over reused OMS events, fulfillment tracking, service cases, alerts, and AI Operator recommendations. This keeps Prime OS decisions grounded in live system context."
        actions={(
          <Button asChild size="sm">
            <Link to="/intelligence/ai-operator">Review operator queue</Link>
          </Button>
        )}
      />

      <div className="space-y-6 p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-5">
          <SummaryMetricCard label="OMS events" value={snapshot.orderEvents.length} meta="Reused COS order event log." icon={<History className="size-5" />} tone="info" />
          <SummaryMetricCard label="Tracking events" value={snapshot.trackingEventsCount} meta="Fulfillment tracking context." icon={<PackageCheck className="size-5" />} tone="teal" />
          <SummaryMetricCard label="Service cases" value={snapshot.tickets.length} meta="Customer issues in audit view." icon={<ClipboardList className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Alerts" value={snapshot.alerts.length} meta="Automation signals." icon={<BellRing className="size-5" />} tone="orange" />
          <SummaryMetricCard label="AI decisions" value={snapshot.recommendations.length} meta="Operator recommendation queue." icon={<Bot className="size-5" />} tone="purple" />
        </div>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>OMS audit events</CardTitle>
            </CardHeader>
            <CardContent>
              <Table variant="embedded">
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.event_type}</TableCell>
                      <TableCell>{event.order_id}</TableCell>
                      <TableCell>{event.actor_type}</TableCell>
                      <TableCell>{event.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Cross-area decision trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.recommendations.map((recommendation) => (
                <div key={recommendation.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Activity className="size-4 text-primary" />
                      <span className="font-medium">{recommendation.target}</span>
                    </div>
                    <Badge variant="outline">{recommendation.confidence}%</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{recommendation.reasoning}</p>
                  <p className="mt-2 text-sm text-primary">{recommendation.action}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle>Alert audit map</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {snapshot.alerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border bg-muted/20 p-3">
                <Badge variant="outline">{alert.area}</Badge>
                <p className="mt-2 font-medium">{alert.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">Entity: {alert.linkedEntity}</p>
                <p className="mt-1 text-sm text-muted-foreground">Recommendation: {alert.recommendationId}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
