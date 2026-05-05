import { expect, test } from '@playwright/test';
import { expectPrimeShellReady, installPrimeSession, mockPrimeBackend } from './helpers/prime-session';

const coreRoutes = [
  '/overview',
  '/intelligence/decision-hub',
  '/intelligence/signals',
  '/intelligence/launch-decisions',
  '/demand/hub',
  '/demand/sources',
  '/demand/campaigns',
  '/demand/content-social',
  '/demand/leads-rfqs',
  '/demand/re-engage',
  '/customer/crm-compact',
  '/customer/service',
  '/finance/health',
  '/finance/capital-offers',
  '/finance/risk-trust',
  '/ecom/cos/product-master',
  '/ecom/cos/oms',
  '/ecom/cos/fulfillment',
  '/ecom/cos/returns',
];

const legacyRedirects = [
  ['/intelligence', /\/intelligence$/],
  ['/intelligence/creators', /\/intelligence\/signals\?view=creators$/],
  ['/intelligence/trends', /\/intelligence\/signals\?view=customer-trends$/],
  ['/intelligence/analytics', /\/intelligence\/decision-hub\?capability=analytics$/],
  ['/intelligence/alerts', /\/intelligence\/decision-hub\?view=alerts$/],
  ['/demand/campaign-ops', /\/demand\/campaigns$/],
  ['/demand/content-creator-ops', /\/demand\/content-social\?view=creator-proof$/],
  ['/demand/lead-response-capture', /\/demand\/leads-rfqs$/],
  ['/demand/retargeting-outreach', /\/demand\/re-engage$/],
  ['/demand/acquisition', /\/demand\/sources$/],
  ['/demand/campaign', /\/demand\/campaigns$/],
  ['/demand/lead-capture', /\/demand\/leads-rfqs$/],
  ['/demand/retargeting', /\/demand\/re-engage$/],
  ['/finance/capital', /\/finance\/capital-offers$/],
  ['/orders', /\/ecom\/cos\/oms$/],
  ['/products', /\/ecom\/cos\/product-master$/],
  ['/returns', /\/ecom\/cos\/returns$/],
];

test('protected routes open directly with the local bypass session', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.removeItem('prime-os-auth-token');
  });
  await page.goto('/overview');
  await expect(page).toHaveURL(/\/overview$/);
  await expectPrimeShellReady(page);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
});

test('auth route is hidden behind the local bypass session', async ({ page }) => {
  await mockPrimeBackend(page);
  await page.goto('/auth');

  await expect(page).toHaveURL(/\/overview$/);
  await expectPrimeShellReady(page);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
});

test.describe('authenticated route shell', () => {
  test.beforeEach(async ({ page }) => {
    await installPrimeSession(page);
  });

  for (const route of coreRoutes) {
    test(`loads ${route} inside the Prime shell`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      await expectPrimeShellReady(page);
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open command palette' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
    });
  }

  for (const [source, target] of legacyRedirects) {
    test(`redirects ${source} without losing shell context`, async ({ page }) => {
      await page.goto(source);
      await expect(page).toHaveURL(target as RegExp);
      await expectPrimeShellReady(page);
      await expect(page).not.toHaveURL(/\/auth$/);
    });
  }

  test('shows the overview-style Demand command room', async ({ page }) => {
    await page.goto('/demand/hub');
    await expectPrimeShellReady(page);

    await expect(page.getByTestId('demand-command-bar')).toBeVisible();
    await expect(page.getByText('Priority Demand Queue')).toBeVisible();
    await expect(page.getByText('Demand Pipeline')).toBeVisible();
    await expect(page.getByText('Guardrail Rail')).toBeVisible();
    await expect(page.getByText('Evidence Stack')).toBeVisible();
  });

  test('shows the compact Demand child command bar and readback', async ({ page }) => {
    await page.goto('/demand/campaigns');
    await expectPrimeShellReady(page);

    await expect(page.getByTestId('demand-child-command-bar')).toBeVisible();
    await expect(page.getByText('Which campaign can run safely now?')).toBeVisible();
    await expect(page.getByText('Proof & readback')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Demand tabs' }).getByRole('link', { name: /Campaigns/ })).toHaveAttribute('aria-current', 'page');
  });

  test('preserves Demand query context across legacy redirects', async ({ page }) => {
    await page.goto('/demand/lead-response-capture?lead=lead_1_1');
    await expect(page).toHaveURL(/\/demand\/leads-rfqs\?lead=lead_1_1$/);
    await expectPrimeShellReady(page);

    await expect(page.getByText('Lead focus')).toBeVisible();
    await expect(page.getByText('URL context kept')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Demand tabs' }).getByRole('link', { name: /Leads & RFQs/ })).toHaveAttribute('aria-current', 'page');
  });

  test('opens canonical Demand focused context directly', async ({ page }) => {
    await page.goto('/demand/leads-rfqs?lead=lead_1_1');
    await expectPrimeShellReady(page);

    await expect(page).toHaveURL(/\/demand\/leads-rfqs\?lead=lead_1_1$/);
    await expect(page.getByText('Lead focus')).toBeVisible();
  });

  test('marks nested sidebar item active for OMS', async ({ page }) => {
    await page.goto('/ecom/cos/oms');
    await expectPrimeShellReady(page);

    await expect(page.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
  });

  test('command palette opens, filters, and navigates', async ({ page }) => {
    await page.goto('/overview');
    await expectPrimeShellReady(page);

    await page.keyboard.press('Control+K');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder('Jump to a workspace, customer, demand module, or COS...').fill('Launch Decisions');
    await dialog.getByText('Launch Decisions').click();

    await expect(page).toHaveURL(/\/intelligence\/launch-decisions$/);
    await expectPrimeShellReady(page);
  });
});
