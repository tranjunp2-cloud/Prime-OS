import { beforeAll, describe, expect, it } from 'vitest';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { getOrders } from '@/lib/order-store';
import { getFulfillmentJobs } from '@/lib/fulfillment-store';
import { getProducts } from '@/lib/product-store';
import { getListings } from '@/lib/listing-store';
import { getReturns as getReturnRecords } from '@/lib/return-store';
import { hydrateOrderUiModel } from '@/lib/contracts/orders';
import { hydrateFulfillmentJobUiModel } from '@/lib/contracts/fulfillment';
import { hydrateListingUiModels } from '@/lib/contracts/listings';
import { hydrateReturnUiModel } from '@/lib/contracts/returns';

function toPartnerReturn(record: ReturnType<typeof getReturnRecords>[number]) {
  return {
    id: record.id,
    rma_number: record.rma_number ?? record.id.slice(0, 8).toUpperCase(),
    rma_code: record.rma_number ?? record.id.slice(0, 8).toUpperCase(),
    order_id: record.order_id ?? '',
    user_id: 'ui_smoke',
    status: record.status === 'authorized' ? 'approved' : record.status,
    reason: record.reason,
    customer_name: 'Smoke Test Customer',
    customer_email: null,
    total_refund_amount: record.refund_amount,
    refund_amount: record.refund_amount,
    warehouse_id: null,
    received_at: record.received_at,
    completed_at: record.completed_at,
    created_at: record.created_at,
    updated_at: record.completed_at ?? record.received_at ?? record.created_at,
    qc_grade: record.qc_grade,
    disposition: record.disposition,
  };
}

beforeAll(async () => {
  await seedDemoData('ui_smoke');
});

describe('Phase 6 contract smoke', () => {
  it('hydrates orders into stable display identifiers', () => {
    const source = getOrders().find((order) => order.allocated_warehouse_id || order.warehouse_id) ?? getOrders()[0];
    const order = hydrateOrderUiModel(source);

    expect(order.display_order_id).toBeTruthy();
    expect(order.display_customer_name).toBeTruthy();
    expect(order.resolved_warehouse_id).toBeTruthy();
  });

  it('hydrates fulfillment jobs into display-safe summaries', () => {
    const job = hydrateFulfillmentJobUiModel(getFulfillmentJobs()[0]);

    expect(job.display_job_code).toBeTruthy();
    expect(job.display_order_id).toBeTruthy();
    expect(job.display_customer_name).toBeTruthy();
  });

  it('hydrates listings with product references and display text', () => {
    const listing = hydrateListingUiModels(getListings(), getProducts())[0];

    expect(listing.display_product_name).toBeTruthy();
    expect(listing.display_channel_sku).toBeTruthy();
    expect(listing.display_price).toContain(listing.currency);
  });

  it('hydrates returns into RMA-first display identity', () => {
    const ret = hydrateReturnUiModel(toPartnerReturn(getReturnRecords()[0]));

    expect(ret.display_rma).toBeTruthy();
    expect(ret.display_customer_name).toBeTruthy();
  });
});
