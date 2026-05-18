import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/__ui-regression');
  await expect(page.getByTestId('ui-regression-ready')).toBeVisible();
});

test('captures the normal tower review overview', async ({ page }) => {
  await expect(page.getByTestId('state-normal')).toHaveScreenshot('state-normal-overview.png');
});

test('captures empty, loading, and error states', async ({ page }) => {
  await expect(page.getByTestId('fixture-empty')).toHaveScreenshot('state-empty.png');
  await expect(page.getByTestId('fixture-loading-state')).toHaveScreenshot('state-loading.png');
  await expect(page.getByTestId('fixture-error')).toHaveScreenshot('state-error.png');
});

test('captures read-only and exception operational states', async ({ page }) => {
  await expect(page.getByTestId('fixture-read-only')).toHaveScreenshot('state-read-only.png');
  await expect(page.getByTestId('fixture-exception')).toHaveScreenshot('state-exception.png');
});
