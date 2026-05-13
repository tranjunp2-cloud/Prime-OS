import { ArrowRight, BadgeDollarSign, ClipboardList, MousePointerClick, ShoppingCart, Store } from 'lucide-react';
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
import { getPrimeSnapshot, getProductMasterHref, getSkuLabel } from '@/lib/prime/prime-data';

const currency = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
});

export function CommerceSurfacePage() {
  const snapshot = getPrimeSnapshot();
  const convertedRfqs = snapshot.rfqs.filter((rfq) => rfq.status === 'converted');
  const quoteValue = snapshot.rfqs.reduce((sum, rfq) => sum + rfq.value, 0);

  return (
    <div className="min-h-full bg-background">
      <PageHeader
        title="Commerce Surface Tower"
        description="Lightweight storefront, RFQ, assisted commerce, pricing, checkout, and conversion tracking layer that feeds the COS execution core."
        actions={(
          <Button asChild size="sm">
            <Link to="/ecom/cos/oms">Open OMS handoff</Link>
          </Button>
        )}
      />

      <div className="space-y-6 p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryMetricCard label="Storefront signals" value={snapshot.campaigns.reduce((sum, item) => sum + item.traffic, 0).toLocaleString()} meta="Traffic inherited from Demand Area." icon={<MousePointerClick className="size-5" />} tone="info" />
          <SummaryMetricCard label="RFQ pipeline" value={snapshot.rfqs.length} meta={currency.format(quoteValue)} icon={<ClipboardList className="size-5" />} tone="warning" />
          <SummaryMetricCard label="Converted orders" value={convertedRfqs.length} meta="RFQs mapped to COS OMS orders." icon={<ShoppingCart className="size-5" />} tone="success" />
          <SummaryMetricCard label="Product source" value={snapshot.products.length} meta="Product Master remains SSOT." icon={<Store className="size-5" />} tone="teal" />
        </div>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>RFQ / assisted commerce queue</CardTitle>
            </CardHeader>
            <CardContent>
              <Table variant="embedded">
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ</TableHead>
                    <TableHead>Requested by</TableHead>
                    <TableHead>SKU context</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>COS handoff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.rfqs.map((rfq) => (
                    <TableRow key={rfq.id}>
                      <TableCell className="font-medium">{rfq.id}</TableCell>
                      <TableCell>{rfq.requestedBy}</TableCell>
                      <TableCell>
                        <Button asChild variant="link" size="sm" className="h-auto p-0 text-left font-medium">
                          <Link to={getProductMasterHref(rfq.skuId)}>{getSkuLabel(rfq.skuId)}</Link>
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">{rfq.quantity}</TableCell>
                      <TableCell className="text-right">{currency.format(rfq.value)}</TableCell>
                      <TableCell>
                        {rfq.orderId ? (
                          <Button asChild variant="ghost" size="sm" className="h-auto px-0">
                            <Link to={`/ecom/cos/oms/${rfq.orderId}`}>
                              OMS order
                              <ArrowRight className="ml-1 size-3.5" />
                            </Link>
                          </Button>
                        ) : (
                          <Badge variant="outline">{rfq.status}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle>Commerce controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: 'Storefront control',
                  detail: 'Expose published Product Master items and suppress SKUs that Inventory Brain marks risky.',
                },
                {
                  label: 'Pricing / quote guardrail',
                  detail: 'Use retail price from COS Product Master and RFQ quantity to frame assisted commerce offers.',
                },
                {
                  label: 'Checkout / conversion tracking',
                  detail: 'Converted quote points to an OMS order id so execution evidence is not separate from demand.',
                },
                {
                  label: 'Operator handoff',
                  detail: 'AI Operator can recommend campaign throttle, customer follow-up, or ops alert using the same entity context.',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <BadgeDollarSign className="size-4 text-primary" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
