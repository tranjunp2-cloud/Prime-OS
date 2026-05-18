import { beforeAll, describe, expect, it } from 'vitest';
import { seedDemoData } from '@/lib/demo-data-seeder';
import { hydrateFulfillmentJobItemUiModel } from '@/lib/contracts/fulfillment';
import { getFulfillmentJobItems, getFulfillmentJobs } from '@/lib/fulfillment-store';
import { getResolvedProductSkuById } from '@/lib/product-store';

beforeAll(async () => {
  await seedDemoData('fulfillment_linkage_qa');
});

describe('fulfillment mock linkage', () => {
  it('links every seeded fulfillment item back to Product Master by sku_id', () => {
    const items = getFulfillmentJobs().flatMap((job) => getFulfillmentJobItems(job.id));

    expect(items.length).toBeGreaterThan(0);

    for (const item of items) {
      const resolved = getResolvedProductSkuById(item.sku_id);
      const hydrated = hydrateFulfillmentJobItemUiModel(item);

      expect(resolved, `Expected Product Master SKU for item ${item.id}`).toBeTruthy();
      expect(hydrated.resolved_product_id, `Expected product route for item ${item.id}`).toBe(resolved?.product.id);
      expect(hydrated.display_sku_code, `Expected canonical sku code for item ${item.id}`).toBe(resolved?.sku.sku_code);
      expect(hydrated.display_product_name, `Expected product name for item ${item.id}`).toBe(resolved?.product.name);
    }
  });

  it('preserves remote joined product ids for Supabase-backed fulfillment items', () => {
    const hydrated = hydrateFulfillmentJobItemUiModel({
      id: 'fji_remote',
      job_id: 'job_remote',
      sku_id: 'sku_remote',
      qty: 1,
      quantity_ordered: 1,
      picked_qty: 0,
      packed_qty: 0,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sku: {
        sku_code: 'NISSIN-RAOH-TONKOTSU-90G',
        variation_name: 'Tonkotsu Single Pack',
        product: {
          id: 'prod_remote',
          title: '[Demo] NISSIN Raoh Instant Ramen Tonkotsu Flavor 90g',
        },
      },
    });

    expect(hydrated.resolved_product_id).toBe('prod_remote');
    expect(hydrated.display_sku_code).toBe('NISSIN-RAOH-TONKOTSU-90G');
    expect(hydrated.display_product_name).toContain('NISSIN');
  });
});
