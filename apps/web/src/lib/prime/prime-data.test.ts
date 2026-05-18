import { describe, expect, it } from 'vitest';
import { getPrimeSnapshot, getProductMasterHref } from './prime-data';

describe('Prime seed entity links', () => {
  it('routes demand SKU ids to Product Master variant detail', () => {
    const snapshot = getPrimeSnapshot();
    const lead = snapshot.leads[0];

    expect(getProductMasterHref(lead.skuId, lead.productId)).toBe('/ecom/cos/product-master/prod_001?variant=sku_001a');
  });

  it('resolves SKU codes from forecast and campaign read models', () => {
    const snapshot = getPrimeSnapshot();
    const campaign = snapshot.campaigns[0];
    const forecast = snapshot.forecasts[0];

    expect(getProductMasterHref(campaign.skuCode)).toBe('/ecom/cos/product-master/prod_001?variant=sku_001a');
    expect(getProductMasterHref(forecast.skuId)).toBe('/ecom/cos/product-master/prod_001?variant=sku_001a');
  });
});
