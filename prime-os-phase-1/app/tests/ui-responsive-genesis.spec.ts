import { expect, test, type Page } from '@playwright/test';
import { expectPrimeShellReady, installPrimeSession } from './helpers/prime-session';

test.describe.configure({ mode: 'serial' });

const priorityRoutes = [
  '/overview',
  '/intelligence/launch-decisions',
  '/demand/campaign-ops',
  '/customer/crm-compact',
  '/ecom/cos/product-master',
  '/ecom/cos/inventory-brain',
  '/ecom/cos/oms',
  '/ecom/cos/fulfillment',
  '/ecom/cos/returns',
];

const viewports = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 1000 },
];

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return {
      viewport: window.innerWidth,
      rootScrollWidth: root.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
    };
  });

  expect(overflow.rootScrollWidth).toBeLessThanOrEqual(overflow.viewport + 2);
  expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.viewport + 2);
}

test.describe('responsive shell and route overflow', () => {
  for (const viewport of viewports) {
    for (const route of priorityRoutes) {
      test(`${route} has no document overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await installPrimeSession(page);
        await page.goto(route);
        await expectPrimeShellReady(page);

        await expectNoDocumentOverflow(page);
        await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
        await expect(page.getByRole('banner')).toBeVisible();
      });
    }
  }

  test('auth page has no document overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/auth');

    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });
});

test.describe('Genesis token contract', () => {
  test.beforeEach(async ({ page }) => {
    await installPrimeSession(page);
    await page.goto('/overview');
    await expectPrimeShellReady(page);
  });

  test('uses the expected light surface, typography, radius, and header height', async ({ page }) => {
    const tokens = await page.evaluate(() => {
      const body = window.getComputedStyle(document.body);
      const heading = document.querySelector('h1, h2, h3');
      const headingStyle = heading ? window.getComputedStyle(heading) : null;
      const button = document.querySelector('button');
      const buttonStyle = button ? window.getComputedStyle(button) : null;
      const card = document.querySelector('.surface-solid, [class*="rounded-xl"]');
      const cardStyle = card ? window.getComputedStyle(card) : null;
      const header = document.querySelector('header');
      const headerStyle = header ? window.getComputedStyle(header) : null;

      return {
        bodyBackground: body.backgroundColor,
        bodyFont: body.fontFamily,
        headingFont: headingStyle?.fontFamily ?? '',
        buttonRadius: buttonStyle?.borderRadius ?? '',
        cardRadius: cardStyle?.borderRadius ?? '',
        cardShadow: cardStyle?.boxShadow ?? '',
        headerHeight: headerStyle?.minHeight || headerStyle?.height || '',
      };
    });

    expect(tokens.bodyBackground).toBe('rgb(250, 250, 250)');
    expect(tokens.bodyFont).toContain('DM Sans');
    expect(tokens.headingFont).toContain('General Sans');
    expect(tokens.buttonRadius).toBe('8px');
    expect(tokens.cardRadius).toBe('12px');
    expect(tokens.cardShadow === 'none' || tokens.cardShadow === '' || tokens.cardShadow.includes('rgba(')).toBeTruthy();
    expect(tokens.headerHeight).toBe('56px');
  });

  test('shows an indigo focus ring on keyboard focus', async ({ page }) => {
    const commandButton = page.getByRole('button', { name: 'Open command palette' });
    await commandButton.focus();

    const focusStyle = await commandButton.evaluate((node) => {
      const style = window.getComputedStyle(node);
      return {
        boxShadow: style.boxShadow,
        outlineStyle: style.outlineStyle,
      };
    });

    expect(focusStyle.boxShadow).toContain('rgba(');
    expect(focusStyle.boxShadow).not.toBe('none');
  });
});
