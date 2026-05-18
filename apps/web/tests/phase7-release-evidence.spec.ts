import { expect, test, type Page } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expectPrimeShellReady, mockPrimeBackend } from './helpers/prime-session';

type Locale = 'en-US' | 'vi-VN' | 'ja-JP';

type ProofRoute = {
  id: string;
  label: string;
  owner: string;
  route: string;
  dynamic?: 'first-oms-order' | 'first-return';
};

const outputDir = path.resolve(process.cwd(), '../../research/screenshots/phase-7-release-proof');

const proofRoutes: ProofRoute[] = [
  { id: '01-intelligence-decision-hub', label: 'Intelligence decision hub', owner: 'Intelligence', route: '/intelligence/decision-hub' },
  { id: '02-demand-leads-rfqs', label: 'Demand lead and RFQ context', owner: 'Demand', route: '/demand/leads-rfqs?lead=lead_1_1' },
  { id: '03-customer-profile-overview', label: 'Customer profile overview', owner: 'Customer', route: '/customer/crm-compact?floor=overview' },
  { id: '04-customer-account-profile', label: 'Customer account profile', owner: 'Customer', route: '/customer/crm-compact?floor=account' },
  { id: '05-ecom-oms-detail', label: 'OMS order detail', owner: 'Ecom / COS', route: '/ecom/cos/oms', dynamic: 'first-oms-order' },
  { id: '06-ecom-return-detail', label: 'Return detail', owner: 'Ecom / COS', route: '/ecom/cos/returns', dynamic: 'first-return' },
  { id: '07-finance-documents', label: 'Finance evidence documents', owner: 'Finance', route: '/finance/fin-support#documents' },
  { id: '08-finance-status', label: 'Finance readiness status', owner: 'Finance', route: '/finance/fin-support#status' },
  { id: '09-intelligence-launch-decisions', label: 'Intelligence outcome feedback', owner: 'Intelligence', route: '/intelligence/launch-decisions' },
];

const localeRuns: Array<{ locale: Locale; viewport: { width: number; height: number }; suffix: string }> = [
  { locale: 'en-US', viewport: { width: 1440, height: 1000 }, suffix: 'desktop-en' },
  { locale: 'vi-VN', viewport: { width: 1440, height: 1000 }, suffix: 'desktop-vi' },
  { locale: 'ja-JP', viewport: { width: 1440, height: 1000 }, suffix: 'desktop-ja' },
  { locale: 'en-US', viewport: { width: 390, height: 844 }, suffix: 'mobile-en' },
];

async function prepareSession(page: Page, locale: Locale) {
  await mockPrimeBackend(page);
  await page.addInitScript((selectedLocale) => {
    window.localStorage.setItem('prime-os-genesis-theme', 'light');
    window.localStorage.setItem('ech.locale', selectedLocale);
  }, locale);
}

async function openProofRoute(page: Page, proofRoute: ProofRoute) {
  await page.goto(proofRoute.route, { waitUntil: 'domcontentloaded' });
  await expectPrimeShellReady(page);

  if (proofRoute.dynamic) {
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 20_000 });
    await firstRow.click();
    await expect(page).toHaveURL(proofRoute.dynamic === 'first-oms-order'
      ? /\/ecom\/cos\/oms\/[^/]+$/
      : /\/ecom\/cos\/returns\/[^/]+$/);
    await expectPrimeShellReady(page);
  }
}

test.describe('Phase 7 release evidence', () => {
  test('captures proof route screenshots and writes manifest/index', async ({ page }) => {
    test.setTimeout(180_000);
    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });

    const manifest: Array<{
      id: string;
      label: string;
      owner: string;
      locale: Locale;
      viewport: string;
      url: string;
      screenshot: string;
      status: 'ok';
    }> = [];

    for (const run of localeRuns) {
      await page.setViewportSize(run.viewport);
      await prepareSession(page, run.locale);

      for (const proofRoute of proofRoutes) {
        await openProofRoute(page, proofRoute);
        const screenshot = `${proofRoute.id}-${run.suffix}.png`;
        await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: false });
        manifest.push({
          id: proofRoute.id,
          label: proofRoute.label,
          owner: proofRoute.owner,
          locale: run.locale,
          viewport: `${run.viewport.width}x${run.viewport.height}`,
          url: page.url(),
          screenshot,
          status: 'ok',
        });
      }
    }

    await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), count: manifest.length, screenshots: manifest }, null, 2)}\n`);
    await writeFile(path.join(outputDir, 'index.html'), renderIndex(manifest));
    expect(manifest).toHaveLength(proofRoutes.length * localeRuns.length);
  });

  test('proof routes emit no fatal console or page errors', async ({ page }) => {
    test.setTimeout(90_000);
    const failures: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
        failures.push(`console:${message.text()}`);
      }
    });
    page.on('pageerror', (error) => failures.push(`pageerror:${error.message}`));

    await page.setViewportSize({ width: 1440, height: 1000 });
    await prepareSession(page, 'en-US');

    for (const proofRoute of proofRoutes) {
      await openProofRoute(page, proofRoute);
    }

    expect(failures).toEqual([]);
  });
});

function renderIndex(manifest: Array<{ id: string; label: string; owner: string; locale: Locale; viewport: string; url: string; screenshot: string; status: 'ok' }>) {
  const cards = manifest.map((item) => `
    <article>
      <img src="${item.screenshot}" alt="${item.label} ${item.locale} ${item.viewport}" />
      <h2>${item.id}</h2>
      <p>${item.label}</p>
      <p>${item.owner} · ${item.locale} · ${item.viewport}</p>
      <code>${item.url}</code>
    </article>
  `).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Prime OS Phase 7 Release Proof Screenshots</title>
<style>
body { margin: 24px; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
main { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
article { border: 1px solid #334155; border-radius: 14px; padding: 12px; background: #111827; }
img { width: 100%; border-radius: 10px; border: 1px solid #334155; background: white; }
h1 { margin-bottom: 4px; }
h2 { font-size: 14px; margin: 10px 0 4px; }
p, code { color: #cbd5e1; font-size: 12px; overflow-wrap: anywhere; }
</style>
</head>
<body>
<h1>Prime OS Phase 7 Release Proof Screenshots</h1>
<p>${manifest.length} screenshots across official proof routes, EN/VI/JA desktop, and EN mobile.</p>
<main>${cards}</main>
</body>
</html>`;
}
