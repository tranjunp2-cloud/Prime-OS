import { expect, test } from '@playwright/test';
import { installPrimeSession } from './helpers/prime-session';
test.beforeEach(async ({ page }) => { await installPrimeSession(page); await page.goto('/builder/sites'); await expect(page.getByRole('heading', { name: 'My websites', exact: true })).toBeVisible(); });

test('create, edit, undo, reload and publish a separate snapshot', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('button', { name: 'Create website', exact: true }).click();
  await page.getByLabel('Business name').fill('Seller Demo');
  await page.getByRole('radio', { name: /Shop \/ fashion/ }).check();
  await page.getByLabel('Products or services').fill('Everyday objects');
  await page.getByLabel('Short description').fill('Thoughtfully selected essentials.');
  await page.getByRole('button', { name: 'Generate website', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open editor', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open editor', exact: true }).click();
  await expect(page).toHaveURL(/builder\/theme\?site=/);
  await page.getByLabel('Heading', { exact: true }).fill('A new story');
  await expect(page.locator('.pw-canvas h2').first()).toHaveText('A new story');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.pw-canvas h2').first()).toHaveText('Discover Seller Demo');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.reload();
  await expect(page.locator('.pw-canvas h2').first()).toHaveText('A new story');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Publish demo website', exact: true }).click();
  await expect(page).toHaveURL(/version=live/);
  await expect(page.locator('.pw-store h2').first()).toHaveText('A new story');
  await page.getByRole('link', { name: 'Back to editor' }).click();
  await page.getByLabel('Heading', { exact: true }).fill('Still a draft');
  const id = new URL(page.url()).searchParams.get('site');
  await page.goto(`/builder/preview?site=${id}&version=live`);
  await expect(page.locator('.pw-store h2').first()).toHaveText('A new story');
  await page.getByRole('link', { name: 'View draft', exact: true }).click();
  await expect(page.locator('.pw-store h2').first()).toHaveText('Still a draft');
  expect(errors).toEqual([]);
});

test('isolates websites, validates domain and persists blog', async ({ page }) => {
  await page.goto('/builder/pages?site=everyday');
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Contact');
  await page.getByLabel('Page URL').fill('contact');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('.pw-table-row').filter({ hasText: 'Contact' })).toBeVisible();
  await page.goto('/builder/pages?site=studio');
  await expect(page.locator('.pw-table-row').filter({ hasText: 'Contact' })).toHaveCount(0);
  await page.goto('/builder/domains?site=everyday');
  await page.getByLabel('Custom domain').fill('https://invalid/path');
  await page.getByRole('button', { name: 'Save domain', exact: true }).click();
  await expect(page.locator('.pw-error')).toContainText('Enter a domain');
  await page.getByLabel('Custom domain').fill('shop.example.com');
  await page.getByRole('button', { name: 'Save domain', exact: true }).click();
  await page.getByRole('button', { name: 'Simulate verification' }).click();
  await expect(page.getByText('Verified · simulated', { exact: true })).toBeVisible();
  await page.goto('/builder/pages?site=everyday');
  await page.getByRole('button', { name: 'Blog posts', exact: true }).click();
  await page.getByRole('button', { name: 'Write a post', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Our new collection');
  await page.getByLabel('Content', { exact: true }).fill('Carefully chosen essentials.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Blog posts', exact: true }).click();
  await expect(page.getByText('Our new collection', { exact: true })).toBeVisible();
});

test('product details and demo checkout', async ({ page }) => {
  await page.goto('/builder/preview?site=everyday');
  await page.locator('.pw-store-product').first().click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await page.getByRole('button', { name: 'Shopping bag (1)' }).click();
  await page.getByLabel('Email', { exact: true }).fill('demo@example.com');
  await page.getByLabel('Delivery address').fill('123 Demo Street');
  await page.getByRole('button', { name: 'Place demo order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Demo order confirmed' })).toBeVisible();
});

test('desktop, dark editor and mobile layout', async ({ page }) => {
  await page.screenshot({ path: '/private/tmp/primeweb-sites-light.png', fullPage: true });
  await page.goto('/builder/theme?site=everyday');
  await expect(page.getByLabel('Heading', { exact: true })).toBeVisible();
  await page.screenshot({ path: '/private/tmp/primeweb-editor-light.png', fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await expect(page.locator('.pw-primary').first()).toHaveCSS('background-color', 'rgb(45, 212, 191)');
  await page.screenshot({ path: '/private/tmp/primeweb-editor-dark.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/builder/sites');
  await expect(page.getByRole('button', { name: 'Create website', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '/private/tmp/primeweb-sites-mobile.png', fullPage: true });
  await page.goto('/builder/theme?site=everyday');
  await page.getByRole('button', { name: 'mobile preview', exact: true }).click();
  await page.getByLabel('Heading', { exact: true }).fill('Made for mobile');
  await expect(page.locator('.pw-canvas h2').first()).toHaveText('Made for mobile');
  expect(await page.locator('#main-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: '/private/tmp/primeweb-editor-mobile.png', fullPage: true });
});

test('AI cancellation, draft recovery, preview and editing', async ({ page }) => {
  await page.goto('/builder/sites?demo=no-data');
  await expect(page.getByRole('heading', { name: 'Build your first website with AI' })).toBeVisible();
  await page.getByRole('button', { name: 'Create my store with AI' }).click();
  await expect(page.getByRole('heading', { name: "What's your business about?" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate website', exact: true })).toBeDisabled();
  await page.getByLabel('Business name').fill('AI Example');
  await page.getByRole('radio', { name: /Shop \/ fashion/ }).check();
  await page.getByLabel('Products or services').fill('Everyday objects');
  await page.getByLabel('Short description').fill('A welcoming store for everyday objects.');
  await page.screenshot({ path: '/private/tmp/primeweb-ai-form.png', fullPage: true });
  await page.getByRole('button', { name: 'Generate website', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel generation' }).click();
  await expect(page.getByLabel('Business name')).toHaveValue('AI Example');
  await page.getByRole('button', { name: 'Generate website', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open editor', exact: true })).toBeVisible();
  const id = new URL(page.url()).searchParams.get('site');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('primeweb.prototype.v1')!));
  expect(saved.sites.filter((s: {draft: {name: string}}) => s.draft.name === 'AI Example')).toHaveLength(1);
  expect(saved.sites.find((s: {id: string}) => s.id === id).published).toBeNull();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open editor', exact: true })).toBeVisible();
  await page.screenshot({ path: '/private/tmp/primeweb-ai-preview.png', fullPage: true });
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  await expect(page.locator('.pw-ai-preview')).toHaveClass(/is-mobile/);
  await page.getByRole('button', { name: 'View full preview' }).click();
  await expect(page.getByRole('dialog')).toContainText('AI Example');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Open editor', exact: true }).click();
  await expect(page.locator('.pw-canvas')).toContainText('A welcoming store for everyday objects.');
  await page.getByRole('button', { name: 'Choose from media library', exact: true }).click();
  await page.getByRole('button', { name: 'Use media image 1', exact: true }).click();
  await expect(page.locator('.pw-store-hero-art img')).toBeVisible();
  await page.getByRole('button', { name: 'AI Chat', exact: true }).click();
  await page.getByLabel('Describe your change').fill('Made for a slower Sunday');
  await page.getByRole('button', { name: 'Generate suggestion', exact: true }).click();
  await page.getByRole('button', { name: 'Apply to hero', exact: true }).click();
  await expect(page.locator('.pw-canvas h2').first()).toContainText('Made for a slower Sunday');

});

test('publish success leads to overview and source AI discovery guide', async ({ page }) => {
  await page.goto('/builder/new?site=artisan');
  await page.getByRole('button', { name: 'Publish website', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Congratulations!');
  await page.getByRole('dialog').getByRole('button', { name: 'Go to dashboard' }).click();
  await expect(page).toHaveURL(/builder\/overview\?site=artisan&guide=ai/);
  const guide = page.getByRole('dialog', { name: 'Discover the power of AI' });
  await expect(guide).toBeVisible();
  for (const title of ['AI editor', 'AI content', 'AI SEO']) {
    await expect(guide.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect.poll(() => guide.getByRole('img', { name: `${title} walkthrough`, exact: true }).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    if (title === 'AI editor') {
      await guide.getByRole('button', { name: 'Zoom AI editor demo' }).click();
      await expect(page.getByRole('dialog', { name: 'AI editor demo', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Close zoom' }).click();
    }
    await guide.getByRole('button', { name: title === 'AI SEO' ? 'Explore CMS' : 'Continue', exact: true }).click();
  }
  await expect(guide).toHaveCount(0);
  await expect(page).toHaveURL(/builder\/overview\?site=artisan$/);
  await page.goto('/builder/overview?site=artisan&guide=ai');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('dashboard customization saves order and visibility, cancel discards edits', async ({ page }) => {
  await page.goto('/builder/overview?site=artisan');
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Customize dashboard' });
  await expect(modal.getByRole('switch')).toHaveCount(5);
  await modal.getByRole('switch', { name: 'Onboarding checklist visibility' }).click();
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('[data-dashboard-block="onboarding"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  await modal.getByRole('switch', { name: 'Onboarding checklist visibility' }).click();
  await modal.getByRole('switch', { name: 'At-a-glance stats visibility' }).click();
  await modal.getByRole('button', { name: 'Reorder Pending orders' }).focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowUp');
  await modal.getByRole('button', { name: 'Save layout' }).click();
  await expect(page.locator('[data-dashboard-block]').first()).toHaveAttribute('data-dashboard-block', 'orders');
  await expect(page.locator('[data-dashboard-block="metrics"]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-dashboard-block]').first()).toHaveAttribute('data-dashboard-block', 'orders');
  await expect(page.locator('[data-dashboard-block="onboarding"]')).toBeVisible();
  await page.getByRole('button', { name: 'Customize', exact: true }).click();
  await modal.getByRole('button', { name: 'Reset to default' }).click();
  await modal.getByRole('button', { name: 'Save layout' }).click();
  await expect(page.locator('[data-dashboard-block]').first()).toHaveAttribute('data-dashboard-block', 'metrics');
});

test('website library permits only one active site independently of browsing', async ({ page }) => {
  await expect(page.locator('.pw-library-card.is-active')).toHaveCount(1);
  await expect(page.locator('.pw-library-card.is-active')).toHaveAttribute('aria-label', 'Everyday Living');
  await page.getByRole('article', { name: 'Studio Objects', exact: true }).hover();
  await page.getByRole('article', { name: 'Studio Objects', exact: true }).getByRole('button', { name: 'Use this template' }).click();
  await expect(page.locator('.pw-library-card.is-active')).toHaveCount(1);
  await expect(page.locator('.pw-library-card.is-active')).toHaveAttribute('aria-label', 'Studio Objects');
  await page.getByRole('article', { name: 'The Artisan Edit', exact: true }).hover();
  await page.getByRole('link', { name: 'Preview The Artisan Edit', exact: true }).click();
  await page.goto('/builder/sites');
  await expect(page.locator('.pw-library-card.is-active')).toHaveAttribute('aria-label', 'Studio Objects');
  await page.reload();
  await expect(page.locator('.pw-library-card.is-active')).toHaveAttribute('aria-label', 'Studio Objects');
  await page.goto('/builder/overview');
  await expect(page.locator('.pw-dashboard')).toBeVisible();
  const active = await page.evaluate(() => JSON.parse(localStorage.getItem('primeweb.prototype.v1')!).activeId);
  expect(active).toBe('studio');
  await page.goto('/builder/sites');
  await page.getByLabel('Search websites').fill('Artisan');
  await expect(page.locator('.pw-library-card')).toHaveCount(1);
  await expect(page.locator('.pw-library-card')).toHaveAttribute('aria-label', 'The Artisan Edit');
  await page.screenshot({ path: '/private/tmp/primeweb-library.png', fullPage: true });
});

test('editor source workspace presets resize panels and persist', async ({ page }) => {
  await page.goto('/builder/theme?site=everyday');
  await page.getByRole('button', { name: 'Layout presets', exact: true }).click();
  await page.getByRole('button', { name: 'Focus', exact: true }).click();
  await expect(page.locator('.pw-editor-sidebar')).toBeHidden();
  await expect(page.locator('.pw-inspector')).toBeHidden();
  await page.getByRole('button', { name: 'Structure', exact: true }).click();
  await expect(page.locator('.pw-editor-sidebar')).toBeVisible();
  await expect(page.locator('.pw-inspector')).toBeHidden();
  await page.getByRole('button', { name: 'Content', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pw-editor-sidebar')).toBeHidden();
  await expect(page.locator('.pw-inspector')).toBeVisible();
  await page.reload();
  await expect(page.locator('.pw-editor-sidebar')).toBeHidden();
  await expect(page.locator('.pw-inspector')).toBeVisible();
  await page.getByRole('button', { name: 'Toggle left panel' }).click();
  await expect(page.locator('.pw-editor-sidebar')).toBeVisible();
  await page.getByRole('button', { name: 'Toggle right panel' }).click();
  await expect(page.locator('.pw-inspector')).toBeHidden();
});

test('editor publish lifecycle matches source toolbar', async ({ page }) => {
  await page.goto('/builder/theme?site=everyday');
  await expect(page.getByRole('button', { name: 'View live', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Update', exact: true })).toHaveCount(0);
  await page.getByLabel('Heading', { exact: true }).fill('Updated live headline');
  await expect(page.getByText('CHANGES PENDING', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByText('CHANGES PENDING', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('primeweb.prototype.v1')!).sites.find((s: {id: string}) => s.id === 'everyday').published.pages[0].blocks[1].title)).toBe('Updated live headline');
  await page.getByRole('button', { name: 'View live', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Open website' })).toHaveAttribute('href', /site=everyday&version=live/);
  await expect(page.getByRole('menuitem', { name: 'Copy link' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Unpublish', exact: true }).click();
  await page.getByRole('button', { name: 'Unpublish website', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View live', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Updated live headline');
  await page.goto('/builder/preview?site=everyday&version=live');
  await expect(page.getByRole('heading', { name: 'This website is not published' })).toBeVisible();
});

test('source component library searches, inserts after selection and supports undo', async ({ page }) => {
  await page.goto('/builder/theme?site=everyday');
  await expect(page.getByRole('button', { name: 'Add component', exact: true })).toHaveCount(0);
  await expect(page.getByPlaceholder('Search blocks')).toBeVisible();
  await page.getByPlaceholder('Search blocks').fill('Hero');
  await page.locator('.pw-editor-sidebar button[draggable="true"]').filter({ hasText: 'Hero banner' }).click();
  await expect(page.locator('.pw-canvas [aria-label="Select hero section"]')).toHaveCount(2);
  await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Hero');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.locator('.pw-canvas [aria-label="Select hero section"]')).toHaveCount(1);
  await page.getByPlaceholder('Search blocks').fill('newsletter');
  await expect(page.locator('.pw-editor-sidebar button[draggable="true"]')).toHaveCount(1);
});

test('blog-only workspace creates categories and posts with persistent filters', async ({ page }) => {
  await page.goto('/builder/pages?site=everyday');
  await expect(page.getByRole('heading', { name: 'Blogs', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add page', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Category', exact: true }).click();
  await page.getByLabel('Category name', { exact: true }).fill('Updates');
  await page.getByRole('button', { name: 'Add category', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Create post', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('New collection');
  await page.getByLabel('Category', { exact: true }).selectOption('Updates');
  await page.getByLabel('Content', { exact: true }).fill('Explore our new collection.');
  await page.getByRole('button', { name: 'Save post', exact: true }).click();
  await page.reload();
  await page.getByLabel('Search by title').fill('New collection');
  await page.getByLabel('Filter category').selectOption('Updates');
  await expect(page.locator('.pw-blog-table tbody tr')).toHaveCount(1);
  await page.getByLabel('Select New collection', { exact: true }).check();
  await page.getByRole('button', { name: 'Delete selected' }).click();
  await page.getByRole('button', { name: 'Delete posts', exact: true }).click();
  await expect(page.locator('.pw-blog-table tbody tr')).toHaveCount(0);
});
