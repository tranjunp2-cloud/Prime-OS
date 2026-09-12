import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createOrderStore } from '../../api/src/orders.js';
import { installPrimeSession } from './helpers/prime-session';

test('manual order survives reload and its detail works on desktop and mobile', async ({ page }) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'prime-order-browser-'));
  const store = createOrderStore(path.join(directory, 'orders.json'));
  try {
    await page.route('**/api/v1/orders', async (route) => {
      try {
        const data = route.request().method() === 'POST' ? { data: store.create(route.request().postDataJSON(), 'browser-test') } : { data: store.list(), canWrite: true };
        await route.fulfill({ json: data });
      } catch (error) { await route.fulfill({ status: 400, json: { message: (error as Error).message } }); }
    });
    await installPrimeSession(page);
    await page.goto('/orders');
    await expect(page.getByRole('button', { name: 'Create order', exact: true })).toBeEnabled();
    await page.screenshot({ path: 'test-results/orders-desktop.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Create order', exact: true }).click();
    const dialog = page.getByRole('dialog');
    for (const [label, value] of Object.entries({ 'Order reference': 'MAN-BROWSER', 'Customer name': 'Nguyen Lan', 'Phone number': '0900123456', 'Street address': '123 Le Loi', 'City / Province': 'HCM', 'Item 1 SKU': 'NOTEBOOK', 'Item 1 name': 'Notebook', 'Item 1 quantity': '2', 'Item 1 unit price': '50000' })) await dialog.getByLabel(label, { exact: true }).fill(value);
    await page.screenshot({ path: 'test-results/orders-create-desktop.png', fullPage: true, animations: 'disabled' });
    await dialog.getByRole('button', { name: 'Create order', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'MAN-BROWSER', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'MAN-BROWSER', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Order items', exact: true }).click();
    await expect(page.getByRole('cell', { name: 'Notebook NOTEBOOK' })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: 'test-results/orders-detail-mobile.png', fullPage: true, animations: 'disabled' });
    await page.goto('/orders');
    await page.getByRole('button', { name: 'Create order', exact: true }).click();
    await expect(page.getByLabel('Customer name', { exact: true })).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Create order', exact: true })).toBeInViewport();
    await page.screenshot({ path: 'test-results/orders-create-mobile.png', fullPage: true, animations: 'disabled' });
    await expect.poll(async () => (await page.getByRole('dialog').boundingBox())?.x).toBeGreaterThanOrEqual(0);
    await expect.poll(async () => { const box = await page.getByRole('dialog').boundingBox(); return Math.round((box?.x || 0) + (box?.width || 0)); }).toBeLessThanOrEqual(375);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
