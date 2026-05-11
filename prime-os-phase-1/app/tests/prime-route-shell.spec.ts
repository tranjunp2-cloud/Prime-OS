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
  '/finance/fin-support',
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
  ['/finance', /\/finance\/fin-support$/],
  ['/finance/health', /\/finance\/fin-support#status$/],
  ['/finance/capital-offers', /\/finance\/fin-support#lenders$/],
  ['/finance/risk-trust', /\/finance\/fin-support#blockers$/],
  ['/finance/capital-readiness', /\/finance\/fin-support#funding-application-flow$/],
  ['/finance/settlement-repayment', /\/finance\/fin-support#status$/],
  ['/finance/capital', /\/finance\/fin-support#lenders$/],
  ['/finance/lending', /\/finance\/fin-support#lenders$/],
  ['/finance/risk', /\/finance\/fin-support#blockers$/],
  ['/orders', /\/ecom\/cos\/oms$/],
  ['/products', /\/ecom\/cos\/product-master$/],
  ['/returns', /\/ecom\/cos\/returns$/],
];

const routeReady = { waitUntil: 'domcontentloaded' } as const;

test('protected routes open directly with the local bypass session', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.removeItem('prime-os-auth-token');
  });
  await page.goto('/overview', routeReady);
  await expect(page).toHaveURL(/\/overview$/);
  await expectPrimeShellReady(page);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
});

test('auth route is hidden behind the local bypass session', async ({ page }) => {
  await mockPrimeBackend(page);
  await page.goto('/auth', routeReady);

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
      await page.goto(route, routeReady);
      await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      await expectPrimeShellReady(page);
      await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open command palette' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
    });
  }

  for (const [source, target] of legacyRedirects) {
    test(`redirects ${source} without losing shell context`, async ({ page }) => {
      await page.goto(source, routeReady);
      await expect(page).toHaveURL(target as RegExp);
      await expectPrimeShellReady(page);
      await expect(page).not.toHaveURL(/\/auth$/);
    });
  }

  test('shows the overview-style Demand command room', async ({ page }) => {
    await page.goto('/demand/hub', routeReady);
    await expectPrimeShellReady(page);

    await expect(page.getByTestId('demand-command-bar')).toBeVisible();
    await expect(page.getByText('Priority Demand Queue')).toBeVisible();
    await expect(page.getByText('Demand Pipeline')).toBeVisible();
    await expect(page.getByText('Guardrail Rail')).toBeVisible();
    await expect(page.getByText('Evidence Stack')).toBeVisible();
  });

  test('shows the compact Demand child command bar and readback', async ({ page }) => {
    await page.goto('/demand/campaigns', routeReady);
    await expectPrimeShellReady(page);

    await expect(page.getByTestId('demand-child-command-bar')).toBeVisible();
    await expect(page.getByText('Which campaign can run safely now?')).toBeVisible();
    await expect(page.getByText('Proof & readback')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Demand tabs' }).getByRole('link', { name: /Campaigns/ })).toHaveAttribute('aria-current', 'page');
  });

  test('preserves Demand query context across legacy redirects', async ({ page }) => {
    await page.goto('/demand/lead-response-capture?lead=lead_1_1', routeReady);
    await expect(page).toHaveURL(/\/demand\/leads-rfqs\?lead=lead_1_1$/);
    await expectPrimeShellReady(page);

    await expect(page.getByText('Lead focus')).toBeVisible();
    await expect(page.getByText('URL context kept')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Demand tabs' }).getByRole('link', { name: /Leads & RFQs/ })).toHaveAttribute('aria-current', 'page');
  });

  test('shows the Customer Profile Floor identity workspace', async ({ page }) => {
    await page.goto('/customer/crm-compact', routeReady);
    await expectPrimeShellReady(page);

    await expect(page.getByRole('heading', { name: 'Customer Profile', exact: true })).toBeVisible();
    await expect(page.getByTestId('customer-profile-floor')).toBeVisible();
    const primaryNav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(primaryNav.locator('a[href="/customer/crm-compact?floor=overview"]')).toHaveCount(0);
    await expect(primaryNav.getByRole('link', { name: 'Account Profile' })).toBeVisible();
    await expect(primaryNav.getByRole('link', { name: 'Contact' })).toHaveCount(0);
    await expect(primaryNav.getByRole('link', { name: 'Identity Matching' })).toBeVisible();
    await expect(primaryNav.getByRole('link', { name: 'Customer Tags' })).toHaveCount(0);
    const subfloorNav = page.getByTestId('customer-subfloor-nav');
    await expect(subfloorNav).toBeVisible();
    await expect(subfloorNav.getByRole('button', { name: /Overview/ })).toHaveAttribute('aria-current', 'page');
    await expect(subfloorNav.getByRole('button', { name: /Account Profile/ })).toBeVisible();
    await expect(subfloorNav.getByRole('button', { name: /Contact/ })).toHaveCount(0);
    await expect(subfloorNav.getByRole('button', { name: /Identity Matching/ })).toBeVisible();
    await expect(subfloorNav.getByRole('button', { name: /Customer Tags/ })).toHaveCount(0);
    await expect(page.getByTestId('overview-subfloor')).toBeVisible();
    await expect(page.getByTestId('customer-relationship-overview')).toBeVisible();
    await expect(page.getByTestId('customer-timeline-events')).toBeVisible();
    await expect(page.getByTestId('customer-follow-up-queue')).toBeVisible();
    await expect(page.getByTestId('customer-continuity-preview')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Account list' })).toHaveCount(0);
    await expect(page.getByTestId('customer-360-panel')).toHaveCount(0);
    await expect(page.getByText('Contact directory')).toHaveCount(0);
  });

  test('opens Customer Profile sub-floors separately and keeps contact inside Account Profile', async ({ page }) => {
    await page.goto('/customer/crm-compact', routeReady);
    await expectPrimeShellReady(page);
    const subfloorNav = page.getByTestId('customer-subfloor-nav');

    await subfloorNav.getByRole('button', { name: /Account Profile/ }).click();
    await expect(page).toHaveURL(/floor=account/);
    await expect(page.getByRole('heading', { name: 'CRM Tower' })).toHaveCount(0);
    await expect(page.getByTestId('customer-subfloor-page-header').getByRole('heading', { name: 'Account Profile' })).toBeVisible();
    await expect(page.getByTestId('account-subfloor')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Account list' })).toBeVisible();
    await expect(page.getByTestId('account-profile-dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Open profile' }).first().click();
    await expect(page.getByTestId('account-profile-dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
    await expect(page.getByTestId('customer-portrait-section')).toBeVisible();
    await expect(page.getByTestId('customer-timeline-events')).toBeVisible();
    await expect(page.getByTestId('customer-follow-up-queue')).toBeVisible();
    await expect(page.getByTestId('customer-continuity-preview')).toBeVisible();
    await expect(page.getByTestId('customer-service-case-preview')).toBeVisible();
    await expect(page.getByTestId('account-profile-dialog').getByText('COS readback')).toBeVisible();
    await page.getByRole('button', { name: 'Edit account' }).click();
    await expect(page.getByTestId('account-tag-editor')).toBeVisible();
    await expect(page.getByTestId('account-tag-editor').getByRole('heading', { name: 'Segment tags' })).toBeVisible();
    await page.getByTestId('account-tag-editor').getByRole('button', { name: 'New segment tag' }).click();
    await page.getByLabel('Tag label').fill('VIP wholesale');
    await page.getByLabel('Usage note').fill('High-priority wholesale segment for account profile workflows.');
    await page.getByRole('button', { name: 'Create and assign' }).click();
    await expect(page.getByTestId('account-tag-editor').getByText('VIP wholesale')).toBeVisible();
    await expect(page.getByText('Tag taxonomy')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('account-profile-dialog')).toHaveCount(0);

    await page.goto('/customer/crm-compact?floor=contact', routeReady);
    await expectPrimeShellReady(page);
    await expect(page.getByTestId('customer-subfloor-page-header').getByRole('heading', { name: 'Account Profile' })).toBeVisible();
    await expect(page.getByTestId('contact-subfloor')).toHaveCount(0);

    await subfloorNav.getByRole('button', { name: /Identity Matching/ }).click();
    await expect(page).toHaveURL(/floor=identity/);
    await expect(page.getByTestId('identity-subfloor')).toBeVisible();
    await expect(page.getByText('Duplicate review queue')).toBeVisible();

    await page.goto('/customer/crm-compact?floor=tags', routeReady);
    await expectPrimeShellReady(page);
    await expect(page.getByTestId('customer-subfloor-page-header').getByRole('heading', { name: 'Account Profile' })).toBeVisible();
    await expect(page.getByTestId('account-subfloor')).toBeVisible();
    await expect(page.getByTestId('tags-subfloor')).toHaveCount(0);
  });

  test('focuses Customer Profile Floor from customer query context', async ({ page }) => {
    await page.goto('/customer/crm-compact?floor=account&customer=cust_wei_chen_example_cn', routeReady);
    await expectPrimeShellReady(page);

    await page.getByRole('button', { name: 'Open profile' }).first().click();
    await expect(page.getByTestId('account-profile-dialog')).toBeVisible();
  });

  test('keeps Customer 360 bounded by empty account filters', async ({ page }) => {
    await page.goto('/customer/crm-compact?floor=account', routeReady);
    await expectPrimeShellReady(page);

    await page.getByPlaceholder('Search account, code, email...').fill('no-such-account');
    await expect(page.getByText('No accounts match the current filters.')).toBeVisible();
    await expect(page.getByTestId('customer-360-panel')).toHaveCount(0);
  });

  test('shows Customer Service ownership, SLA, and Intelligence handoff context', async ({ page }) => {
    await page.goto('/customer/service', routeReady);
    await expectPrimeShellReady(page);

    await expect(page.getByTestId('customer-service-control-panel')).toBeVisible();
    const servicePanel = page.getByTestId('customer-service-control-panel');
    await expect(servicePanel.getByText('Case owner')).toBeVisible();
    await expect(servicePanel.getByText('SLA state')).toBeVisible();
    await expect(servicePanel.getByText('Pending action', { exact: true })).toBeVisible();
    await expect(page.getByText('Service issue to Intelligence:')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Owner' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Pending action' })).toBeVisible();
  });

  test('shows Finance trust profile, commerce evidence, and bank review guardrails', async ({ page }) => {
    await page.goto('/finance/fin-support', routeReady);
    await expectPrimeShellReady(page);

    await expect(page.getByRole('heading', { name: /Prepare a funding review package/ })).toBeVisible();
    const trustProfile = page.getByTestId('finance-trust-profile');
    await expect(trustProfile).toBeVisible();
    await expect(trustProfile.getByText('Financial Trust Profile')).toBeVisible();
    await expect(trustProfile.getByRole('heading', { name: 'Receivables / payout snapshot' })).toBeVisible();
    const evidencePack = page.getByTestId('commerce-evidence-pack');
    await expect(evidencePack).toBeVisible();
    await expect(evidencePack.getByText('Orders and OMS events')).toBeVisible();
    await expect(evidencePack.getByText('Settlement and repayment lanes')).toBeVisible();
    await expect(evidencePack.getByText('Invoices and RFQ receivables')).toBeVisible();
    await expect(evidencePack.getByText('Logistics / export records')).toBeVisible();
    await expect(evidencePack.getByText('Marketplace health')).toBeVisible();
    const bankReview = page.getByTestId('bank-review-summary');
    await expect(bankReview).toBeVisible();
    await expect(bankReview.getByText('No approval promise', { exact: true })).toBeVisible();
    await expect(bankReview.getByText(/Preview only: no approval promise/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Potential Review Routes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Readiness Signals' })).toBeVisible();
  });

  test('shows Phase 5 Intelligence evidence, lineage, and outcome loop', async ({ page }) => {
    await page.goto('/intelligence/decision-hub', routeReady);
    await expectPrimeShellReady(page);
    await expect(page.getByTestId('recommendation-evidence-panel')).toBeVisible();
    await expect(page.getByText('Recommendation evidence')).toBeVisible();
    await expect(page.getByText(/Prime AI\/model output is explanation only/)).toBeVisible();
    await expect(page.getByTestId('feedback-readback-card')).toBeVisible();

    await page.goto('/intelligence/signals', routeReady);
    await expectPrimeShellReady(page);
    await expect(page.getByTestId('signal-lineage-trail')).toBeVisible();
    await expect(page.getByText('Signal lineage')).toBeVisible();
    await expect(page.getByText(/Intelligence reads and scores this evidence/)).toBeVisible();

    await page.goto('/intelligence/launch-decisions', routeReady);
    await expectPrimeShellReady(page);
    await expect(page.getByTestId('intelligence-drag-board')).toBeVisible();
    await expect(page.getByText('Signal → decision board')).toBeVisible();
    await expect(page.getByText(/Source truth remains owned by Demand, Customer, Ecom \/ COS, and Finance/)).toBeVisible();
    await expect(page.getByTestId('launch-decision-state-board')).toBeVisible();
    await expect(page.getByText('Outcome feedback')).toBeVisible();
    await expect(page.getByText(/Demand owns execution, OMS owns order truth/)).toBeVisible();
  });

  test('shows Phase 4 partner workspaces with view and action boundaries', async ({ page }) => {
    const roleSurfaces = [
      { url: '/overview?role=factory', testId: 'partner-workspace-factory', heading: 'Factory owner operating view', boundary: /cannot edit OMS, Inventory, Finance, or Customer source truth/ },
      { url: '/overview?role=agency', testId: 'partner-workspace-agency', heading: 'Agency operator delegated workspace', boundary: /cannot change product truth, order state, finance readiness/ },
      { url: '/finance/fin-support?role=bank', testId: 'partner-workspace-bank', heading: 'Bank reviewer evidence workspace', boundary: /does not approve credit, underwrite, commit terms, or disburse funds/ },
      { url: '/demand/leads-rfqs?role=lead-provider', testId: 'partner-workspace-lead-provider', heading: 'Lead provider contribution view', boundary: /cannot access full CRM, Finance, OMS, or customer private records/ },
      { url: '/intelligence/signals?view=creators&role=creator-agency', testId: 'partner-workspace-creator-agency', heading: 'Creator agency performance view', boundary: /cannot change SKU truth, pricing, order state, or finance readiness/ },
    ];

    for (const surface of roleSurfaces) {
      await page.goto(surface.url, routeReady);
      await expectPrimeShellReady(page);
      const workspace = page.getByTestId(surface.testId);
      await expect(workspace).toBeVisible();
      await expect(workspace.getByRole('heading', { name: surface.heading })).toBeVisible();
      await expect(workspace.getByText('View / action boundary')).toBeVisible();
      await expect(workspace.getByText('Partner handoffs')).toBeVisible();
      await expect(workspace.getByText(surface.boundary)).toBeVisible();
    }
  });

  test('opens canonical Demand focused context directly', async ({ page }) => {
    await page.goto('/demand/leads-rfqs?lead=lead_1_1', routeReady);
    await expectPrimeShellReady(page);

    await expect(page).toHaveURL(/\/demand\/leads-rfqs\?lead=lead_1_1$/);
    await expect(page.getByText('Lead focus')).toBeVisible();
  });

  test('marks nested sidebar item active for OMS', async ({ page }) => {
    await page.goto('/ecom/cos/oms', routeReady);
    await expectPrimeShellReady(page);

    await expect(page.getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
  });

  test('command palette opens, filters, and navigates', async ({ page }) => {
    await page.goto('/overview', routeReady);
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
