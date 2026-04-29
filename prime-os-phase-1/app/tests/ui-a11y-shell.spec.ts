import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectPrimeShellReady, installPrimeSession, mockPrimeBackend } from './helpers/prime-session';

test.describe.configure({ mode: 'serial' });

const a11yRoutes = [
  '/auth',
  '/overview',
  '/intelligence/launch-decisions',
  '/demand/campaign-ops',
  '/customer/crm-compact',
  '/ecom/cos/product-master',
  '/ecom/cos/oms',
  '/ecom/cos/fulfillment',
  '/ecom/cos/returns',
];

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
        await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
      } else {
        await expectPrimeShellReady(page);
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(results.violations).toEqual([]);
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

test('auth form exposes visible labels and error state', async ({ page }) => {
  await mockPrimeBackend(page);
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Invalid email or password.' }),
    });
  });

  await page.goto('/auth');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await page.getByLabel('Email').fill('wrong@example.com');
  await page.getByLabel('Password').fill('bad-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.locator('form').getByText('Invalid email or password.')).toBeVisible();
});
