import { expect, test } from '@playwright/test';
import { expectPrimeShellReady, installPrimeSession } from './helpers/prime-session';

const towerRoutes = [
  { path: '/intelligence/decision-hub', heading: 'Decision Hub' },
  { path: '/intelligence/signals', heading: 'Signals' },
  { path: '/intelligence/launch-decisions', heading: 'Launch Decisions' },
  { path: '/demand/campaign-ops', heading: 'Campaign Ops' },
  { path: '/customer/crm-compact', heading: 'CRM Compact' },
];

test.describe('Prime tower shared layout', () => {
  test('/overview keeps the operating-loop hero compact on wide screens', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 768 });
    await installPrimeSession(page);
    await page.goto('/overview');
    await expectPrimeShellReady(page);

    const hero = page.getByTestId('prime-tower-hero');
    await expect(hero).toBeVisible();

    const heroBox = await hero.boundingBox();
    expect(heroBox?.height).toBeLessThanOrEqual(380);
    expect(heroBox?.y).toBeLessThanOrEqual(96);

    const linkedStripTop = await page.getByText(/^SKU$/).first().evaluate((node) => node.getBoundingClientRect().top);
    expect(linkedStripTop).toBeLessThan(520);
  });

  for (const route of towerRoutes) {
    test(`${route.path} keeps the tower hero compact on wide screens`, async ({ page }) => {
      await page.setViewportSize({ width: 2048, height: 768 });
      await installPrimeSession(page);
      await page.goto(route.path);
      await expectPrimeShellReady(page);

      await expect(page.getByRole('heading', { name: route.heading })).toHaveCount(1);

      const hero = page.getByTestId('prime-tower-hero');
      await expect(hero).toBeVisible();

      const heroBox = await hero.boundingBox();
      expect(heroBox?.height).toBeLessThanOrEqual(380);
      expect(heroBox?.y).toBeLessThanOrEqual(96);

      const linkedStripTop = await page.getByText(/^Area$/).first().evaluate((node) => node.getBoundingClientRect().top);
      expect(linkedStripTop).toBeLessThan(520);
    });
  }
});
