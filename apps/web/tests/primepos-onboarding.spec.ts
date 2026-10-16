import { expect, test, type Page } from '@playwright/test';

async function start(page: Page, empty = false) {
  await page.addInitScript(mode => { localStorage.setItem('prime-os-genesis-theme', 'light'); localStorage.setItem('prime:demo-data-mode:v1', mode); }, empty ? 'no-data' : 'with-data');
  await page.goto('/#/pos/register');
  await expect(page.getByRole('heading', { name: 'Set up your point of sale' })).toBeVisible();
}
async function identity(page: Page) {
  await page.getByLabel('Store name', { exact: true }).fill('QA Central');
  await page.getByLabel('Store address').fill('Tokyo, Japan');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}
async function fixture(page: Page) {
  await page.evaluate(async () => {
    const sourcePath = '/src/lib/product-store.ts', stockPath = '/src/lib/warehouse-stock-operations.ts';
    const masters = await import(sourcePath), stock = await import(stockPath);
    const base = masters.getProducts()[0];
    masters.addProduct({ ...base, id: 'pos-browser-test', name: 'POS QA notebook', sku_code: 'POS-QA', product_type: 'single', has_variants: false, skus: [], retail_price: 500, price_currency: 'JPY', status: 'published', inventory: {}, warehouse_positions: [], inventory_adjustments: [], inventory_transfers: [] });
    stock.recordWarehouseCounts([{ productId: 'pos-browser-test', sku: 'POS-QA', warehouseId: 'wh_crjp', quantity: 10, expected: null, reason: 'Opening stock', confirmNoHolds: true }]);
  });
}

test('first visit → resumable setup → select Master → shared-stock sale', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page); await fixture(page); await identity(page);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Where stock and prices come from' })).toBeVisible();
  await page.getByLabel('Stock location', { exact: true }).selectOption('wh_crjp');
  await page.getByLabel('Selling currency').selectOption('JPY');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Search Product Master').fill('POS-QA');
  await expect(page.locator('.pos-master-option')).toContainText('10 available');
  await page.getByRole('checkbox', { name: 'Select POS-QA', exact: true }).check();
  await page.screenshot({ path: '/private/tmp/prime-pos-setup-review.png', fullPage: true });
  await page.getByRole('button', { name: 'Save & open POS' }).click();
  await expect(page.getByRole('button', { name: 'Add POS QA notebook', exact: true })).toBeEnabled();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Set up your point of sale' })).toHaveCount(0);
  await page.goto('/#/pos/shifts'); await page.getByLabel('Opening cash (JPY)').fill('1000');
  await page.getByRole('button', { name: 'Open shift', exact: true }).click();
  await page.goto('/#/pos/register'); await page.getByRole('button', { name: 'Add POS QA notebook', exact: true }).click();
  await page.getByRole('button', { name: /Take payment/ }).click();
  await page.getByRole('button', { name: 'Card', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo payment' }).click();
  await expect(page.getByRole('dialog')).toContainText('JPY');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  expect(await page.evaluate(async () => { const path = '/src/lib/product-store.ts'; return (await import(path)).getProducts().find((p: { id: string }) => p.id === 'pos-browser-test').inventory.wh_crjp; })).toBe(9);
  await page.goto('/#/pos/products'); await expect(page.locator('.pos-catalog-row')).toContainText('9 available');
  await page.screenshot({ path: '/private/tmp/prime-pos-products-light.png', fullPage: true });
  await page.getByLabel('Demo role').selectOption('cashier'); await expect(page.getByRole('button', { name: 'Add from Product Master' })).toBeDisabled();
  await page.goto('/#/pos/settings'); await expect(page.getByLabel('Store name', { exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('empty catalog: create stock location, skip products and add later without repeated setup', async ({ page }) => {
  await start(page, true); await identity(page);
  await expect(page.getByLabel('Stock location', { exact: true }).locator('option')).toHaveCount(1);
  await page.getByRole('button', { name: 'Create stock location', exact: true }).click();
  await page.getByLabel('Warehouse code').fill('QA-EMPTY');
  await page.getByRole('button', { name: 'Create location', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No Product Masters yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Add products later' }).click();
  await expect(page.getByRole('heading', { name: 'Add products to start selling' })).toBeVisible();
  await page.reload(); await expect(page).toHaveURL(/#\/pos\/register$/);
  await page.goto('/#/pos/products'); await page.getByRole('button', { name: 'Add from Product Master' }).click();
  await expect(page.getByRole('dialog')).toContainText('No Product Masters yet'); await page.keyboard.press('Escape');
  await page.goto('/#/pos/setup'); await expect(page.getByLabel('Existing store')).toHaveValue(await page.evaluate(() => JSON.parse(localStorage.getItem('prime.pos-demo.v1')!).stores[0].id));
  await page.getByRole('button', { name: 'Use this register' }).click(); await expect(page).toHaveURL(/#\/pos\/register$/);
});

test('setup and product picker remain usable on mobile, light and dark', async ({ page }) => {
  await start(page); await fixture(page);
  await page.screenshot({ path: '/private/tmp/prime-pos-onboarding-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: '/private/tmp/prime-pos-onboarding-mobile.png', fullPage: true });
  await expect.poll(() => page.locator('#main-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await identity(page); await page.getByLabel('Stock location', { exact: true }).selectOption('wh_crjp');
  await page.getByLabel('Selling currency').selectOption('JPY'); await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Search Product Master').fill('POS-QA'); await page.getByRole('checkbox', { name: 'Select POS-QA', exact: true }).check();
  await page.evaluate(() => { document.documentElement.classList.remove('light'); document.documentElement.classList.add('dark'); });
  await expect.poll(() => page.locator('#main-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: '/private/tmp/prime-pos-picker-mobile-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Save & open POS' }).click(); await page.goto('/#/pos/products');
  await expect.poll(() => page.locator('#main-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: '/private/tmp/prime-pos-products-mobile-dark.png', fullPage: true });
});
