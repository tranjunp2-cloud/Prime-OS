import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 1000 }, { width: 844, height: 390 }, { width: 375, height: 812 }]) {
  test(`inline variant stock stays read-only and keyboard accessible at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#/products/master-catalog');
    await page.evaluate(async width => {
      const modulePath = '/src/lib/product-store.ts';
      const { getProducts } = await import(modulePath);
      const products = getProducts();
      products.push({ ...products[0], id: 'variant-stock-ui', name: 'Sketchbook · Variant stock review', sku_code: 'UI-STOCK', has_variants: true, product_type: 'variant', status: 'published', inventory: { wh_crjp: 999 },
        channels: [], channel_overrides: {}, import_result: undefined, import_sources: [], import_issues: [],
        skus: [
          { id: 'ui-blue', sku_code: 'UI-BLUE-A5', variation_name: 'Blue / A5', status: 'active', stock_by_location: { wh_crjp: 100, wh_fbsmy: 17 }, price: 3800 },
          { id: 'ui-red', sku_code: 'UI-RED-A5', variation_name: 'Red / A5', status: 'active', stock_by_location: { wh_crjp: 0 }, price: 3800 },
          { id: 'ui-white', sku_code: 'UI-WHITE-A5', variation_name: 'White / A5', status: 'active', price: 3800 },
        ],
      });
      localStorage.setItem('primeos-product-master-v5', JSON.stringify(products));
      localStorage.setItem('prime-os-genesis-theme', width === 844 ? 'light' : 'dark');
    }, viewport.width);
    await page.goto('/#/products/master-catalog?q=UI-STOCK');
    await page.reload();
    const toggle = page.getByRole('button', { name: 'Show 3 variants for Sketchbook · Variant stock review' });
    await expect(toggle).toBeVisible();
    const before = await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'));
    const parent = page.locator('tr[data-product-id="variant-stock-ui"]');
    const titleBounds = await parent.getByRole('link', { name: 'Open Product Master details for Sketchbook · Variant stock review' }).boundingBox();
    const toggleBounds = await toggle.boundingBox();
    expect(toggleBounds!.y).toBeGreaterThanOrEqual(titleBounds!.y + titleBounds!.height - 0.5);
    await expect(parent.getByText('117 · Partial')).toBeVisible();
    await expect(parent.getByText('1 variant out of stock')).toBeVisible();
    await toggle.focus(); await page.keyboard.press('Enter');
    const panel = page.getByRole('region', { name: 'Variant stock for Sketchbook · Variant stock review' });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('row', { name: /White.*UI-WHITE-A5/ })).toContainText('Not recorded');
    const stock = panel.getByRole('button', { name: 'Stock by warehouse for UI-BLUE-A5' });
    await stock.focus(); await page.keyboard.press('Space');
    const warehouses = panel.getByRole('region', { name: 'Warehouses for UI-BLUE-A5' });
    await expect(warehouses.getByText('100 units')).toBeVisible();
    await expect(warehouses.getByText('17 units')).toBeVisible();
    await expect(warehouses.getByText('Channel-managed')).toBeVisible();
    await expect(page).toHaveURL(/master-catalog\?q=UI-STOCK$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'))).toBe(before);
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/prime-variant-list-${viewport.width}.png`, fullPage: true });
    // Catalog tables may scroll internally on small screens, never the page itself.
    expect(await page.locator('#main-content').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    const hide = page.getByRole('button', { name: 'Hide 3 variants for Sketchbook · Variant stock review' });
    await hide.focus(); await page.keyboard.press('Enter');
    await expect(panel).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Show 3 variants for Sketchbook · Variant stock review' })).toBeFocused();
  });
}
