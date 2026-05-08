import type { Page, Route } from '@playwright/test';

const qaSession = {
  role: 'admin',
  roleLabel: 'Admin',
  description: 'QA session for Prime OS UI regression.',
  canReset: true,
  canWrite: true,
  visibleResources: [],
  writableResources: [],
  hiddenResources: [],
  resourcePermissions: {},
  account: {
    id: 'prime-qa-user',
    role: 'admin',
    fullName: 'Prime QA',
    email: 'qa@primeos.local',
    workspace: 'Prime OS QA',
    seatType: 'admin',
  },
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function mockPrimeBackend(page: Page) {
  await page.route('**/api/session', async (route) => fulfillJson(route, qaSession));
  await page.route('**/api/auth/login', async (route) => fulfillJson(route, {
    token: 'prime-qa-token',
    expiresAt: '2099-01-01T00:00:00.000Z',
    session: qaSession,
  }));
  await page.route('**/api/auth/logout', async (route) => fulfillJson(route, { ok: true }));
}

export async function installPrimeSession(page: Page) {
  await mockPrimeBackend(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('prime-os-genesis-theme', 'light');
  });
  await page.goto('/overview', { waitUntil: 'domcontentloaded' });
}

export async function expectPrimeShellReady(page: Page) {
  await page.locator('#main-content').waitFor({ state: 'visible', timeout: 20_000 });
  await page
    .locator('#main-content')
    .locator('h1, h2, h3, [role="heading"], table, form')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 });
}
