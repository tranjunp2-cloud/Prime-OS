import { expect, test, type Page } from '@playwright/test';
import { expectPrimeShellReady, installPrimeSession } from './helpers/prime-session';

function parseRgb(background: string) {
  const match = background.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const [r, g, b, alpha = '1'] = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  return { r, g, b, alpha };
}

function isLightSolid(background: string) {
  const color = parseRgb(background);
  if (!color) return false;
  const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  return color.alpha >= 0.95 && luminance > 180;
}

async function installDarkPrimeSession(page: Page) {
  await installPrimeSession(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('prime-os-genesis-theme', 'dark');
  });
}

test.describe('dark mode visual regression', () => {
  test('overview semantic cards use dark-mode backgrounds instead of light tints', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 768 });
    await installDarkPrimeSession(page);
    await page.goto('/overview');
    await expectPrimeShellReady(page);
    await expect(page.locator('html')).toHaveClass(/dark/);

    const semanticBackgrounds = await page.evaluate(() => {
      const findCurrentSurface = (needle: string) => {
        const candidates = [...document.querySelectorAll('a, section, div')]
          .filter((element) => element.textContent?.includes(needle));
        const element = candidates.find((candidate) => (
          String(candidate.className).includes('bg-card')
          || String(candidate.className).includes('bg-background')
          || String(candidate.className).includes('bg-muted')
        ));
        return element ? window.getComputedStyle(element).backgroundColor : null;
      };

      return [
        findCurrentSurface('System Health'),
        findCurrentSurface('Dependency Risk Flow'),
        findCurrentSurface('Revenue at risk'),
        findCurrentSurface('Inventory pressure'),
      ];
    });

    expect(semanticBackgrounds.every(Boolean)).toBe(true);
    for (const background of semanticBackgrounds.filter((value): value is string => Boolean(value))) {
      expect(isLightSolid(background)).toBe(false);
    }
  });

  test('top search keeps a stable width and leaves room for session controls', async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 768 });
    await installDarkPrimeSession(page);
    await page.goto('/overview');
    await expectPrimeShellReady(page);

    const search = page.getByRole('combobox', { name: 'Global entity search' });
    const accountMenu = page.getByRole('button', { name: /Open account menu/ });
    await expect(search).toBeVisible();
    await expect(accountMenu).toBeVisible();

    const searchBox = await search.boundingBox();
    const accountMenuBox = await accountMenu.boundingBox();
    expect(searchBox?.width).toBeGreaterThanOrEqual(500);
    expect(searchBox?.width).toBeLessThanOrEqual(700);
    expect((accountMenuBox?.x ?? 0) - ((searchBox?.x ?? 0) + (searchBox?.width ?? 0))).toBeGreaterThan(80);

    await accountMenu.click();
    await expect(page.getByRole('menuitem', { name: /Logout/ })).toBeVisible();
  });
});
