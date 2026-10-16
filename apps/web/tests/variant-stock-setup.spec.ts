import { expect, test } from '@playwright/test';

for (const width of [1440, 844, 375]) {
  test(`sets up a variant warehouse inline at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/#/products/prod_demo_variant_stock/edit?section=setup&setupSection=sales');
    const trigger = page.getByRole('button', { name: 'View inventory for White', exact: true });
    await expect(trigger).toContainText('20 units');
    await expect(trigger).toContainText('1 warehouse');
    await trigger.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('region', { name: 'Inventory for White', exact: true });
    await expect(panel.getByRole('listitem')).toHaveCount(1);
    await expect(panel.getByText('CyberRecord Japan HQ')).toBeVisible();
    await expect(panel.getByText('Available to sell')).toHaveCount(0);
    await panel.screenshot({ path: `/tmp/prime-variant-setup-${width}-one-warehouse.png` });
    const add = panel.getByRole('button', { name: 'Add stock location for White' });
    const totalBounds = await panel.getByText('Total recorded stock', { exact: true }).boundingBox();
    const addBounds = await add.boundingBox();
    expect(addBounds!.y).toBeGreaterThan(totalBounds!.y + totalBounds!.height);
    await add.click();
    const dialog = page.getByRole('dialog', { name: 'Record opening stock' });
    await expect(dialog.getByLabel('Variant SKU')).toHaveValue('DEMO-ART-WHITE');
    await expect(dialog.getByLabel('Variant SKU')).toBeDisabled();
    await expect(dialog.getByLabel('Warehouse').locator('option')).toHaveText(['Select a warehouse', 'Reseller Singapore Hub', 'Vietnam 3PL Partner']);
    await dialog.getByLabel('Warehouse').selectOption('wh_3plvn');
    await dialog.getByLabel('Opening stock', { exact: true }).fill('8');
    await dialog.screenshot({ path: `/tmp/prime-variant-setup-${width}-add-warehouse.png` });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(add).toBeFocused();
    await expect(panel.getByRole('listitem')).toHaveCount(1);
    await add.click();
    await dialog.getByLabel('Warehouse').selectOption('wh_3plvn');
    await dialog.getByLabel('Opening stock', { exact: true }).fill('8');
    await dialog.getByRole('button', { name: 'Save opening stock', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toContainText('28 units');
    await expect(trigger).toContainText('2 warehouses');
    await expect(panel.getByRole('listitem')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'View inventory for Black', exact: true })).toContainText('10 units');
    await panel.screenshot({ path: `/tmp/prime-variant-setup-${width}-two-warehouses.png` });
    await page.reload();
    await expect(trigger).toContainText('28 units');
    await expect(trigger).toContainText('2 warehouses');
    expect(await page.locator('#main-content').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  });
}
