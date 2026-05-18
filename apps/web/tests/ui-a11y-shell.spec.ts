import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectPrimeShellReady, installPrimeSession, mockPrimeBackend } from './helpers/prime-session';

test.describe.configure({ mode: 'serial' });

const a11yRoutes = [
  '/auth',
  '/overview',
  '/intelligence/decision-hub',
  '/intelligence/launch-decisions',
  '/demand/leads-rfqs?lead=lead_1_1',
  '/customer/crm-compact?floor=overview',
  '/customer/crm-compact?floor=account',
  '/finance/fin-support#documents',
  '/finance/fin-support#status',
  '/ecom/cos/product-master',
  '/ecom/cos/oms',
  '/ecom/cos/fulfillment',
  '/ecom/cos/returns',
];

const detailJourneys = [
  { name: 'OMS order detail', listRoute: '/ecom/cos/oms', targetUrl: /\/ecom\/cos\/oms\/[^/]+$/ },
  { name: 'Return detail', listRoute: '/ecom/cos/returns', targetUrl: /\/ecom\/cos\/returns\/[^/]+$/ },
];

async function expectNoAxeViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
}

test.describe('accessibility smoke', () => {
  for (const route of a11yRoutes) {
    test(`${route} has no axe violations in core rules`, async ({ page }) => {
      if (route === '/auth') {
        await mockPrimeBackend(page);
      } else {
        await installPrimeSession(page);
      }

      await page.goto(route);

      if (route === '/auth') {
        await expect(page).toHaveURL(/\/overview$/);
      }
      await expectPrimeShellReady(page);

      await expectNoAxeViolations(page);
    });
  }

  for (const journey of detailJourneys) {
    test(`${journey.name} has no axe violations in core rules`, async ({ page }) => {
      await installPrimeSession(page);
      await page.goto(journey.listRoute);
      await expectPrimeShellReady(page);

      const firstRow = page.locator('tbody tr').first();
      await expect(firstRow).toBeVisible({ timeout: 20_000 });
      await firstRow.click();
      await expect(page).toHaveURL(journey.targetUrl);
      await expectPrimeShellReady(page);

      await expectNoAxeViolations(page);
    });
  }
});

test('skip link moves focus to main content', async ({ page }) => {
  await installPrimeSession(page);
  await page.goto('/overview');
  await expectPrimeShellReady(page);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('#main-content')).toBeFocused();
});

test('command palette traps keyboard context and closes with Escape', async ({ page }) => {
  await installPrimeSession(page);
  await page.goto('/overview');
  await expectPrimeShellReady(page);

  await page.getByRole('button', { name: 'Open command palette' }).click();
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByPlaceholder('Jump to a workspace, customer, demand module, or COS...')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('auth route redirects to the local bypass shell', async ({ page }) => {
  await mockPrimeBackend(page);
  await page.goto('/auth');

  await expect(page).toHaveURL(/\/overview$/);
  await expectPrimeShellReady(page);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
});
