import { expect, test, type Page } from '@playwright/test';
import { expectPrimeShellReady, installPrimeSession } from './helpers/prime-session';

async function openFirstBodyRow(pageUrl: string, expectedUrl: RegExp, page: Page) {
  await page.goto(pageUrl);
  await expectPrimeShellReady(page);
  const firstRow = page.locator('tbody tr').first();
  await expect(firstRow).toBeVisible({ timeout: 20_000 });
  await firstRow.click();
  await expect(page).toHaveURL(expectedUrl);
  await expectPrimeShellReady(page);
}

test.beforeEach(async ({ page }) => {
  await installPrimeSession(page);
});

test('product master opens product detail and edit routes without falling to overview', async ({ page }) => {
  await page.goto('/ecom/cos/product-master');
  await expectPrimeShellReady(page);

  const firstProductLink = page.locator('tbody a[href^="/ecom/cos/product-master/"]').first();
  await expect(firstProductLink).toBeVisible({ timeout: 20_000 });
  await firstProductLink.click();
  await expect(page).toHaveURL(/\/ecom\/cos\/product-master\/[^/]+$/);
  await expectPrimeShellReady(page);

  await page.getByRole('button', { name: /edit/i }).first().click();
  await expect(page).toHaveURL(/\/ecom\/cos\/product-master\/[^/]+\/edit$/);
  await expectPrimeShellReady(page);
});

test('product master edit action stays inside the canonical COS route', async ({ page }) => {
  await page.goto('/ecom/cos/product-master');
  await expectPrimeShellReady(page);

  await page.getByLabel(/edit product/i).first().click();
  await expect(page).toHaveURL(/\/ecom\/cos\/product-master\/[^/]+\/edit$/);
  await expectPrimeShellReady(page);
});

test('product editor uses the shell scroll container without nested viewport scroll', async ({ page }) => {
  await page.goto('/ecom/cos/product-master');
  await expectPrimeShellReady(page);

  await page.getByLabel(/edit product/i).first().click();
  await expect(page).toHaveURL(/\/ecom\/cos\/product-master\/[^/]+\/edit$/);
  await expectPrimeShellReady(page);

  await expect(page.getByTestId('product-editor-page')).toBeVisible();
  await expect(page.getByText('Shipping & Return')).toBeVisible();

  const layout = await page.evaluate(() => {
    const main = document.querySelector('#main-content');
    const pageRoot = document.querySelector('[data-testid="product-editor-page"]');
    const content = document.querySelector('[data-testid="product-editor-content"]');

    return {
      mainOverflowY: main ? getComputedStyle(main).overflowY : '',
      pageMinHeight: pageRoot ? getComputedStyle(pageRoot).minHeight : '',
      contentOverflowY: content ? getComputedStyle(content).overflowY : '',
    };
  });

  expect(layout.mainOverflowY).toBe('auto');
  expect(layout.pageMinHeight).toBe('100%');
  expect(layout.contentOverflowY).toBe('visible');
});

test('OMS order row opens the canonical order detail route', async ({ page }) => {
  await openFirstBodyRow('/ecom/cos/oms', /\/ecom\/cos\/oms\/[^/]+$/, page);
});

test('fulfillment job row opens the canonical job detail route', async ({ page }) => {
  await openFirstBodyRow('/ecom/cos/fulfillment', /\/ecom\/cos\/fulfillment\/jobs\/[^/]+$/, page);
});

test('returns row opens the canonical return detail route', async ({ page }) => {
  await openFirstBodyRow('/ecom/cos/returns', /\/ecom\/cos\/returns\/[^/]+$/, page);
});

test('legacy COS detail URLs resolve to canonical modules instead of overview', async ({ page }) => {
  await page.goto('/orders/ord-legacy-check');
  await expect(page).toHaveURL(/\/ecom\/cos\/oms\/ord-legacy-check$/);

  await page.goto('/fulfillment/jobs/job-legacy-check');
  await expect(page).toHaveURL(/\/ecom\/cos\/fulfillment\/jobs\/job-legacy-check$/);

  await page.goto('/returns/rma-legacy-check');
  await expect(page).toHaveURL(/\/ecom\/cos\/returns\/rma-legacy-check$/);

  await page.goto('/products/prod-legacy-check');
  await expect(page).toHaveURL(/\/ecom\/cos\/product-master\/prod-legacy-check$/);
});
