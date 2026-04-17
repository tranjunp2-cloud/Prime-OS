import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Box, LayoutTemplate, Package, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { PageHeader } from '@/components/system/PageHeader';
import { SummaryMetricCard } from '@/components/system/SummaryMetricCard';
import { DataTable, type Column } from '@/components/system/DataTable';
import { StatusBadge } from '@/components/system/StatusBadge';
import { ChannelBadge } from '@/components/system/ChannelBadge';
import { PriorityBadge } from '@/components/system/PriorityBadge';
import { SlaIndicator } from '@/components/system/SlaIndicator';
import { EmptyState } from '@/components/system/EmptyState';
import { PageDataState } from '@/components/system/PageDataState';
import { DetailInfoCard } from '@/components/system/DetailInfoCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { getProducts } from '@/lib/product-store';
import { getInventoryPositions, getTotalATS } from '@/lib/inventory-store';
import { getWarehouses } from '@/lib/warehouse-store';
import { getOrders } from '@/lib/order-store';
import { getFulfillmentJobs, getExceptionsByJobId } from '@/lib/fulfillment-store';
import { getReturns as getLocalReturns } from '@/lib/return-store';
import { isJobReadOnly } from '@/lib/fulfillment-types';
import { FlowTypeBadge } from '@/components/fulfillment/FlowTypeBadge';
import { JobStatusBadge } from '@/components/fulfillment/JobStatusBadge';
import { ReturnStatusBadge } from '@/components/fulfillment/ReturnStatusBadge';
import { hydrateOrdersUiModel } from '@/lib/contracts/orders';
import { hydrateFulfillmentJobsUiModel } from '@/lib/contracts/fulfillment';
import { hydrateListingUiModels } from '@/lib/contracts/listings';
import { getListings } from '@/lib/listing-store';
import { getFulfillmentSlaState } from '@/lib/fulfillment-sla';

interface ReviewReturnRow {
  id: string;
  display_rma: string;
  display_order_id: string;
  reason: string;
  status: string;
  qc_grade: string | null;
  refund_amount: number | null;
}

interface ProductPreviewRow {
  id: string;
  name: string;
  sku_code: string;
  category: string;
  status: string;
  channels: string[];
}

interface InventoryPreviewRow {
  id: string;
  sku_code: string;
  product_name: string;
  warehouse_code: string;
  on_hand: number;
  ats: number;
}

function toReturnStatus(status: string) {
  switch (status) {
    case 'authorized':
      return 'approved';
    default:
      return status;
  }
}

function toReviewReturnRows() {
  return getLocalReturns().slice(0, 3).map((record) => ({
    id: record.id,
    display_rma: record.rma_number ?? record.id.slice(0, 8).toUpperCase(),
    display_order_id: record.order_id ?? '—',
    reason: record.reason ?? 'Customer return request',
    status: toReturnStatus(record.status),
    qc_grade: record.qc_grade,
    refund_amount: record.refund_amount,
  }));
}

function toProductPreviewRows(): ProductPreviewRow[] {
  return getProducts().slice(0, 3).map((product) => ({
    id: product.id,
    name: product.name,
    sku_code: product.sku_code,
    category: product.category,
    status: product.status,
    channels: product.channels.map((channel) => channel.channel),
  }));
}

function toInventoryPreviewRows(): InventoryPreviewRow[] {
  const warehouseMap = new Map(getWarehouses().map((warehouse) => [warehouse.id, warehouse.code]));
  const skuLookup = new Map(
    getProducts().flatMap((product) =>
      product.skus.map((sku) => [sku.id, { sku_code: sku.sku_code, product_name: product.name }] as const),
    ),
  );

  return getInventoryPositions().slice(0, 4).map((position) => {
    const skuMeta = skuLookup.get(position.sku_id);

    return {
      id: position.id,
      sku_code: skuMeta?.sku_code ?? position.sku_id,
      product_name: skuMeta?.product_name ?? 'Unknown Product',
      warehouse_code: warehouseMap.get(position.warehouse_id) ?? position.warehouse_id,
      on_hand: position.on_hand,
      ats: getTotalATS(position.sku_id),
    };
  });
}

function FixtureCard({
  title,
  description,
  testId,
  children,
}: {
  title: string;
  description: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Card data-testid={testId} className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function UIRegressionReview() {
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let active = true;

    void seedDemoData().then(() => {
      if (active) setBootstrapped(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const reviewData = useMemo(() => {
    if (!bootstrapped) {
      return {
        products: [] as ProductPreviewRow[],
        inventory: [] as InventoryPreviewRow[],
        listings: [] as ReturnType<typeof hydrateListingUiModels>,
        orders: [] as ReturnType<typeof hydrateOrdersUiModel>,
        jobs: [] as ReturnType<typeof hydrateFulfillmentJobsUiModel>,
        returns: [] as ReviewReturnRow[],
      };
    }

    return {
      products: toProductPreviewRows(),
      inventory: toInventoryPreviewRows(),
      listings: hydrateListingUiModels(getListings(), getProducts()).slice(0, 3),
      orders: hydrateOrdersUiModel(getOrders()).slice(0, 3),
      jobs: hydrateFulfillmentJobsUiModel(getFulfillmentJobs()).slice(0, 4),
      returns: toReviewReturnRows(),
    };
  }, [bootstrapped]);

  const readOnlyJob = reviewData.jobs.find((job) => isJobReadOnly(job)) ?? null;
  const exceptionJob = reviewData.jobs.find((job) => getExceptionsByJobId(job.id).some((exception) => !exception.resolved_at)) ?? null;

  const productColumns: Column<ProductPreviewRow>[] = [
    {
      header: 'Product',
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      header: 'SKU',
      cell: (row) => <span className="font-mono text-xs">{row.sku_code}</span>,
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} domain="product" />,
    },
    {
      header: 'Channels',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.channels.map((channel) => <ChannelBadge key={channel} platform={channel} />)}
        </div>
      ),
    },
  ];

  const inventoryColumns: Column<InventoryPreviewRow>[] = [
    { header: 'SKU', cell: (row) => <span className="font-mono text-xs">{row.sku_code}</span> },
    { header: 'Product', cell: (row) => <span className="text-sm">{row.product_name}</span> },
    { header: 'Warehouse', cell: (row) => <Badge variant="secondary">{row.warehouse_code}</Badge> },
    { header: 'On Hand', className: 'text-right', cell: (row) => <span className="block text-right font-medium">{row.on_hand}</span> },
    { header: 'ATS', className: 'text-right', cell: (row) => <span className="block text-right font-medium">{row.ats}</span> },
  ];

  const listingColumns: Column<(typeof reviewData.listings)[number]>[] = [
    { header: 'Product', cell: (row) => <span className="font-medium">{row.display_product_name}</span> },
    { header: 'Channel', cell: (row) => <ChannelBadge platform={row.channel} /> },
    { header: 'SKU', cell: (row) => <span className="font-mono text-xs">{row.display_channel_sku}</span> },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status} domain="listing" /> },
  ];

  const orderColumns: Column<(typeof reviewData.orders)[number]>[] = [
    { header: 'Order #', cell: (row) => <span className="font-mono text-xs">{row.display_order_id}</span> },
    { header: 'Customer', cell: (row) => <span className="text-sm">{row.display_customer_name}</span> },
    { header: 'Channel', cell: (row) => <ChannelBadge platform={row.channel} /> },
    { header: 'Status', cell: (row) => <StatusBadge status={row.status} domain="oms" /> },
  ];

  const fulfillmentColumns: Column<(typeof reviewData.jobs)[number]>[] = [
    { header: 'Job', cell: (row) => <span className="font-mono text-xs">{row.display_job_code}</span> },
    { header: 'Flow', cell: (row) => <FlowTypeBadge flowType={row.flow_type} /> },
    { header: 'Order', cell: (row) => <span className="font-mono text-xs">{row.display_order_id}</span> },
    { header: 'Status', cell: (row) => <JobStatusBadge status={row.status} /> },
    {
      header: 'Priority',
      cell: (row) => row.priority ? <PriorityBadge priority={row.priority} className="uppercase" /> : <span className="text-xs text-muted-foreground">—</span>,
    },
  ];

  const returnColumns: Column<ReviewReturnRow>[] = [
    { header: 'RMA', cell: (row) => <span className="font-mono text-xs">{row.display_rma}</span> },
    { header: 'Order', cell: (row) => <span className="text-sm">{row.display_order_id}</span> },
    { header: 'Reason', cell: (row) => <span className="text-sm text-muted-foreground">{row.reason}</span> },
    { header: 'Status', cell: (row) => <ReturnStatusBadge status={row.status} /> },
  ];

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8" data-testid="ui-regression-root">
      <style>{`
        [data-testid="ui-regression-root"] * {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
        }
      `}</style>

      {!bootstrapped ? (
        <div data-testid="ui-regression-loading">
          <PageDataState
            data={undefined}
            isLoading
            error={null}
            refetch={() => {}}
            emptyTitle="Preparing UI regression fixtures"
            emptyDescription="Bootstrapping deterministic demo data for review mode."
          >
            {() => null}
          </PageDataState>
        </div>
      ) : (
        <div className="flex flex-col gap-6" data-testid="ui-regression-ready">
          <PageHeader
            title="UI Regression Review"
            description="Deterministic tower previews and state fixtures for smoke QA, visual baselines, and review handoff."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="state-normal">
            <SummaryMetricCard label="Product Master" value={reviewData.products.length} meta="Normal preview rows" icon={<Package className="size-4" />} tone="info" />
            <SummaryMetricCard label="Inventory" value={reviewData.inventory.length} meta="Seeded ATS fixtures" icon={<Box className="size-4" />} tone="teal" />
            <SummaryMetricCard label="OMS" value={reviewData.orders.length} meta="Hydrated order rows" icon={<ShoppingCart className="size-4" />} tone="indigo" />
            <SummaryMetricCard label="Fulfillment" value={reviewData.jobs.length} meta="Operational queue fixtures" icon={<Truck className="size-4" />} tone="orange" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <FixtureCard
              title="Product Master"
              description="Published products should keep semantic status chips, channel badges, and stable table rhythm."
              testId="tower-product-master"
            >
              <DataTable columns={productColumns} data={reviewData.products} keyExtractor={(row) => row.id} />
            </FixtureCard>

            <FixtureCard
              title="Inventory"
              description="Inventory previews must preserve ATS readability, warehouse identity, and numeric alignment."
              testId="tower-inventory"
            >
              <DataTable columns={inventoryColumns} data={reviewData.inventory} keyExtractor={(row) => row.id} />
            </FixtureCard>

            <FixtureCard
              title="Listings"
              description="Listings should render hydrated product names and channel semantics without page-local formatting."
              testId="tower-listings"
            >
              <DataTable columns={listingColumns} data={reviewData.listings} keyExtractor={(row) => row.id} />
            </FixtureCard>

            <FixtureCard
              title="Orders"
              description="Order tables should rely on display contracts, not page-side alias guessing."
              testId="tower-orders"
            >
              <DataTable columns={orderColumns} data={reviewData.orders} keyExtractor={(row) => row.id} />
            </FixtureCard>

            <FixtureCard
              title="Fulfillment"
              description="Fulfillment rows must keep flow, job, priority, and status semantics aligned."
              testId="tower-fulfillment"
            >
              <DataTable columns={fulfillmentColumns} data={reviewData.jobs} keyExtractor={(row) => row.id} />
            </FixtureCard>

            <FixtureCard
              title="Returns"
              description="Returns previews validate RMA identity, return state chips, and refund/QC context."
              testId="tower-returns"
            >
              <DataTable columns={returnColumns} data={reviewData.returns} keyExtractor={(row) => row.id} />
            </FixtureCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <FixtureCard
              title="Empty State"
              description="Used when the surface is valid but currently has no records."
              testId="fixture-empty"
            >
              <EmptyState
                title="No listings match this view"
                description="Clear the active filters to broaden the channel listing view."
                icon={<LayoutTemplate />}
                variant="filtered"
              />
            </FixtureCard>

            <FixtureCard
              title="Loading State"
              description="Skeleton state for first paint, before real data is available."
              testId="fixture-loading-state"
            >
              <PageDataState
                data={undefined}
                isLoading
                error={null}
                refetch={() => {}}
                emptyTitle="Loading"
                emptyDescription="This placeholder should never flicker over existing data."
                mode="section"
              >
                {() => null}
              </PageDataState>
            </FixtureCard>

            <FixtureCard
              title="Error State"
              description="Retry surface for recoverable load failures."
              testId="fixture-error"
            >
              <PageDataState
                data={undefined}
                isLoading={false}
                error={new Error('Failed to sync channel listings for Rakuten JP.')}
                refetch={() => {}}
                emptyTitle="Error"
                emptyDescription="Retry action must stay visible and legible."
                mode="section"
              >
                {() => null}
              </PageDataState>
            </FixtureCard>

            <FixtureCard
              title="Read-Only State"
              description="Observer flows must expose context but not editable actions."
              testId="fixture-read-only"
            >
              {readOnlyJob ? (
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <JobStatusBadge status={readOnlyJob.status} />
                    <FlowTypeBadge flowType={readOnlyJob.flow_type} />
                    <Badge variant="outline">Read-only observer flow</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailInfoCard label="Job" value={readOnlyJob.display_job_code} />
                    <DetailInfoCard label="Order" value={readOnlyJob.display_order_id} meta={readOnlyJob.order?.display_channel_order_ref ?? undefined} />
                  </div>
                  <EmptyState
                    title="No mutable actions available"
                    description="Marketplace observer jobs stay visible for context, but operators cannot advance fulfillment actions from this surface."
                    icon={<ShieldCheck />}
                    variant="unavailable"
                  />
                </div>
              ) : (
                <EmptyState title="Read-only fixture missing" description="Seed data should always provide an observer-flow job." variant="error" />
              )}
            </FixtureCard>

            <FixtureCard
              title="Exception State"
              description="Exception surfaces must preserve danger tone, severity context, and SLA signal."
              testId="fixture-exception"
            >
              {exceptionJob ? (
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <JobStatusBadge status={exceptionJob.status} />
                    <FlowTypeBadge flowType={exceptionJob.flow_type} />
                    <PriorityBadge priority={exceptionJob.priority ?? 'critical'} className="uppercase" />
                    <SlaIndicator state={getFulfillmentSlaState(exceptionJob.sla_due_at) === 'normal' ? 'at_risk' : getFulfillmentSlaState(exceptionJob.sla_due_at)} />
                  </div>
                  <EmptyState
                    title="Operator attention required"
                    description={`${getExceptionsByJobId(exceptionJob.id).length} active exception records are attached to ${exceptionJob.display_job_code}.`}
                    icon={<AlertTriangle />}
                    variant="error"
                  />
                </div>
              ) : (
                <EmptyState title="Exception fixture missing" description="Seed data should always provide at least one active exception." variant="error" />
              )}
            </FixtureCard>

            <FixtureCard
              title="Guardrail Note"
              description="This section anchors the manual review contract to the automated snapshots."
              testId="fixture-guardrail-note"
            >
              <div className="rounded-[1.25rem] border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
                Every page or tower visual change should be checked against this route, then validated with `npm run test:smoke` and `npm run test:ui`.
              </div>
            </FixtureCard>
          </div>
        </div>
      )}
    </div>
  );
}
