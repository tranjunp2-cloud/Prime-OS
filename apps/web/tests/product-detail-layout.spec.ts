import { expect, test, type Page } from '@playwright/test';

const activeId = 'prod_import_test_matched_02';
const draftId = 'prod_import_test_incomplete_02';
const sections = [
  ['overview', 'Overview'], ['setup', 'Product setup'],
  ['distribution', 'Channel listings'], ['activity', 'Activity history'],
] as const;

for (const width of [1440, 844, 375]) {
  test(`suggested Material is removable and variant removal is reviewed at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 1000 });
    await page.goto(`/#/products/${activeId}/edit?section=setup`);
    const fixtureId = 'removable-material-test';
    await page.evaluate(async ({ activeId, fixtureId, width }) => {
      if (width === 844) localStorage.setItem('prime-os-genesis-theme', 'light');
      const productModule = '/src/lib/product-store.ts';
      const catalogModule = '/src/lib/product-catalog-settings-store.ts';
      const { getProducts } = await import(productModule);
      const { getProductCatalogSettings } = await import(catalogModule);
      const catalog = getProductCatalogSettings();
      catalog.categories.find((category: { id: string }) => category.id === 'art-supplies').attributes[0].required = true;
      delete catalog.attributeRequirementsVersion;
      localStorage.setItem('prime-product-catalog-settings-v2', JSON.stringify(catalog));
      const products = getProducts();
      const source = products.find((product: { id: string }) => product.id === activeId);
      products.push({ ...source, id: fixtureId, name: 'Removable material fixture', sku_code: 'MATERIAL-TEST', category: 'Art Supplies', categoryId: 'art-supplies',
        status: 'draft', channels: [], channel_overrides: {}, import_result: undefined, import_sources: [], revisions: [], record_version: 1,
        product_type: 'variant', has_variants: true, attribute_setup: { attributes: [], excludedKeys: [] },
        specifications: [{ attributeKey: 'material', name: 'Material', value: 'Paper' }],
        variant_options: [{ attributeKey: 'material', name: 'Material', values: ['Paper'] }, { attributeKey: 'color', name: 'Color', values: ['White', 'Black'] }],
        inventory: { wh_crjp: 5 },
        skus: ['White', 'Black'].map((value, index) => ({ id: `material-${index}`, sku_code: `KEEP-${value.toUpperCase()}`, status: 'active', variation_name: `Paper / ${value}`, option_values: { material: 'Paper', color: value }, price: 100 + index * 25, stock_by_location: { wh_crjp: index + 2 } })),
      });
      localStorage.setItem('primeos-product-master-v5', JSON.stringify(products));
    }, { activeId, fixtureId, width });
    await page.goto(`/#/products/${fixtureId}/edit?section=setup&setupSection=sales`);
    await page.reload();
    const attributes = page.getByRole('region', { name: 'Attributes', exact: true });
    const remove = attributes.getByRole('button', { name: 'Remove Material attribute' });
    await expect(remove).toBeVisible();
    await expect(attributes.getByText('Required by category')).toHaveCount(0);
    await remove.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/prime-material-optional-${width}.png` });
    const before = await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'));
    await remove.click();
    const dialog = page.getByRole('alertdialog', { name: 'Remove Material?' });
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: `/tmp/prime-material-removal-${width}.png` });
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(remove).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'))).toBe(before);
    await remove.click();
    await dialog.getByRole('button', { name: 'Remove attribute', exact: true }).click();
    await expect(page.getByText('Review affected SKUs', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'))).toBe(before);
    for (const value of ['White', 'Black']) await page.getByLabel(`Keep SKU KEEP-${value.toUpperCase()} as`).selectOption(value);
    await page.getByLabel(/I reviewed the existing SKU mappings/).check();
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(attributes.getByRole('button', { name: 'Remove Material attribute' })).toHaveCount(0);
    const saved = await page.evaluate(id => JSON.parse(localStorage.getItem('primeos-product-master-v5')!).find((product: { id: string }) => product.id === id), fixtureId);
    expect(saved.attribute_setup.excludedKeys).toContain('material');
    expect(saved.skus).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'material-0', price: 100, stock_by_location: { wh_crjp: 2 } }),
      expect.objectContaining({ id: 'material-1', price: 125, stock_by_location: { wh_crjp: 3 } }),
    ]));
    expect(await page.locator('#main-content').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  });
}

for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }, { width: 844, height: 390 }]) {
  test(`Product setup jump navigation and scroll tracking at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`/#/products/${draftId}/edit?section=setup`);
    if (viewport.width === 844) { await page.evaluate(() => localStorage.setItem('prime-os-genesis-theme', 'light')); await page.reload(); }
    const storedBefore = await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'));
    await page.locator('#product-name').fill('Draft preserved while jumping');
    const nav = page.getByRole('navigation', { name: 'Product editor workspaces' });
    const compact = nav.getByLabel('Jump to Product setup section');
    const jump = async (id: string, label: string) => {
      if (await compact.isVisible()) await compact.selectOption(id);
      else {
        const button = nav.getByRole('list', { name: 'Product setup sections' }).getByRole('button', { name: label, exact: true });
        await button.focus(); await page.keyboard.press('Enter');
      }
    };
    await jump('sales', 'Attributes, pricing & inventory');
    const sales = page.locator('#product-section-pricing');
    await expect(sales).toBeFocused();
    await expect(page).toHaveURL(/setupSection=sales/);
    if (await compact.isVisible()) {
      await expect(compact).toHaveValue('sales');
      expect(await compact.evaluate(element => {
        const select = element as HTMLSelectElement;
        const style = getComputedStyle(select);
        const context = document.createElement('canvas').getContext('2d')!;
        context.font = style.font;
        return select.clientWidth - context.measureText(select.selectedOptions[0].text).width
          - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 24;
      })).toBeGreaterThanOrEqual(0);
    }
    else await expect(nav.getByRole('button', { name: 'Attributes, pricing & inventory', exact: true })).toHaveAttribute('aria-current', 'location');
    expect(await sales.evaluate(element => {
      const header = document.querySelector('[data-testid="product-editor-header"]')!;
      const nav = document.querySelector('[aria-label="Product editor workspaces"]')!;
      const mobile = nav.querySelector('[data-workspace-mobile]')!;
      const cutoff = Math.max(document.getElementById('main-content')!.getBoundingClientRect().top,
        getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().bottom : 0,
        getComputedStyle(mobile).display !== 'none' ? nav.getBoundingClientRect().bottom : 0);
      return element.getBoundingClientRect().top - cutoff;
    })).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: `/tmp/prime-setup-navigation-${viewport.width}.png` });
    await page.locator('#main-content').evaluate(element => element.scrollTo({ top: 0, behavior: 'instant' }));
    if (await compact.isVisible()) await expect(compact).toHaveValue('basic');
    else await expect(nav.getByRole('button', { name: 'Basic information', exact: true })).toHaveAttribute('aria-current', 'location');
    await jump('shipping', 'Dimensions & shipping');
    await expect(page.locator('#product-section-shipping details')).toHaveAttribute('open', '');
    await expect(page.getByLabel('Package weight unit')).toBeVisible();
    await jump('trade', 'Customs information');
    await expect(page.locator('#product-section-more')).toBeFocused();
    await expect(page.locator('#product-section-more button').first()).toHaveAttribute('aria-expanded', 'true');
    await jump('basic', 'Basic information');
    await expect(page.locator('#product-name')).toHaveValue('Draft preserved while jumping');
    expect(await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'))).toBe(storedBefore);
    expect(await page.locator('#main-content').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  });
}

test('a direct Product setup section link opens and focuses its collapsed section', async ({ page }) => {
  await page.goto(`/#/products/${draftId}/edit?section=setup&setupSection=shipping`);
  await expect(page.locator('#product-section-shipping')).toBeFocused();
  await expect(page.locator('#product-section-shipping details')).toHaveAttribute('open', '');
  await page.reload();
  await expect(page.locator('#product-section-shipping')).toBeFocused();
  await expect(page.getByRole('list', { name: 'Product setup sections' }).getByRole('button', { name: 'Dimensions & shipping', exact: true })).toHaveAttribute('aria-current', 'location');
});

for (const width of [1440, 844, 375]) {
  test(`edit attribute values inline without leaving Product data at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 1000 });
    await page.goto(`/#/products/${activeId}/edit?section=product-data`);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const fixtureId = 'inline-product-attributes';
    await page.evaluate(async ({ activeId, fixtureId, width }) => {
      const moduleUrl = '/src/lib/product-store.ts';
      const { getProducts } = await import(moduleUrl);
      const products = getProducts();
      const source = products.find((product: { id: string }) => product.id === activeId);
      products.push({ ...source, id: fixtureId, name: 'Inline attribute test', sku_code: 'INLINE-ATTRIBUTES', status: 'draft',
        has_variants: false, product_type: 'single', variant_options: [], channels: [], channel_overrides: {},
        import_result: undefined, import_sources: [], revisions: [], record_version: 1,
        specifications: [{ attributeKey: 'material', name: 'Material', value: 'Paper' }, { attributeKey: 'color', name: 'Color', value: 'White' }] });
      localStorage.setItem('primeos-product-master-v5', JSON.stringify(products));
      if (width === 844) localStorage.setItem('prime-os-genesis-theme', 'light');
    }, { activeId, fixtureId, width });
    await page.goto(`/#/products/${fixtureId}/edit?section=product-data`);
    await page.reload();
    const attributes = page.getByRole('region', { name: 'Attributes', exact: true });
    await expect(attributes).toBeVisible();
    const catalogBefore = await page.evaluate(() => localStorage.getItem('prime-product-catalog-settings-v2'));
    await expect(page.getByRole('button', { name: 'Manage attribute setup' })).toHaveCount(0);
    await page.locator('#product-name').fill('Draft title retained');
    await attributes.getByRole('button', { name: 'Add Material value' }).click();
    await attributes.getByLabel('New material value').fill('Recycled paper');
    await attributes.getByLabel('New material value').press('Enter');
    await expect(attributes.getByRole('button', { name: 'Add Material value' })).toBeFocused();
    await expect(attributes.getByRole('button', { name: 'Recycled paper', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await attributes.getByRole('button', { name: 'Add Color value' }).click();
    await attributes.getByLabel('New color value').fill('Midnight Blue');
    await attributes.scrollIntoViewIfNeeded();
    await attributes.screenshot({ path: `/tmp/prime-inline-attributes-${width}.png` });
    await attributes.getByLabel('New color value').press('Escape');
    await expect(attributes.getByRole('combobox', { name: 'Color', exact: true })).toHaveValue('White');
    await expect(attributes.getByRole('button', { name: 'Add Color value' })).toBeFocused();
    await attributes.getByRole('button', { name: 'Add Color value' }).click();
    await attributes.getByLabel('New color value').fill('Midnight Blue');
    await attributes.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/products/${fixtureId}/edit\\?section=product-data`));
    await expect(page.locator('#product-name')).toHaveValue('Draft title retained');
    expect(await page.evaluate(fixtureId => JSON.parse(localStorage.getItem('primeos-product-master-v5')!).find((product: { id: string }) => product.id === fixtureId).specifications, fixtureId))
      .toEqual([{ attributeKey: 'material', name: 'Material', value: 'Paper' }, { attributeKey: 'color', name: 'Color', value: 'White' }]);
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(attributes.getByRole('combobox', { name: 'Color', exact: true })).toHaveValue('Midnight Blue');
    await expect(attributes.getByRole('button', { name: 'Recycled paper', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('prime-product-catalog-settings-v2'))).toBe(catalogBefore);
    expect(await page.locator('#main-content').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

for (const width of [1440, 375, 844]) {
  test(`Add attribute opens choices immediately at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 1000 });
    await page.goto(`/#/products/${draftId}/edit?section=setup`);
    if (width === 844) { await page.evaluate(() => localStorage.setItem('prime-os-genesis-theme', 'light')); await page.reload(); }
    const attributes = page.getByRole('region', { name: 'Attributes', exact: true });
    const trigger = attributes.getByRole('button', { name: 'Add attribute', exact: true });
    const before = await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'));
    const sectionLabels = await page.locator('#product-setup-navigation button').allTextContents();
    await trigger.click();
    const menu = page.getByRole('menu', { name: 'Available attributes' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Size', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Add attribute', exact: true })).toHaveCount(0);
    await expect(page.locator('#product-setup-navigation button')).toHaveText(sectionLabels);
    const box = (await menu.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(width === 844 ? 390 : 1000);
    await page.screenshot({ path: `/tmp/prime-direct-attribute-menu-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await trigger.press('ArrowDown');
    await menu.getByRole('menuitem', { name: 'Size', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(menu).toHaveCount(0);
    await expect(attributes.getByRole('button', { name: 'Remove Size attribute' })).toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'))).toBe(before);
  });
}

test('create and remove product-local attributes in Product setup and retain them after reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/products/' + draftId + '/edit?section=setup');
  const catalog = await page.evaluate(() => localStorage.getItem('prime-product-catalog-settings-v2'));
  const attributes = page.getByRole('region', { name: 'Attributes', exact: true });
  await attributes.getByRole('button', { name: 'Add attribute', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Create new attribute' }).click();
  await expect(attributes.getByLabel('Attribute name')).toBeFocused();
  await attributes.getByLabel('Attribute name').fill('Surface finish');
  await attributes.getByRole('button', { name: 'Add to product' }).click();
  await attributes.getByRole('button', { name: 'Add Surface finish value' }).click();
  await attributes.getByLabel('New surface finish value').fill('Matte');
  await attributes.getByLabel('New surface finish value').press('Enter');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(attributes.getByRole('button', { name: 'Matte', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await attributes.getByRole('button', { name: 'Remove Surface finish attribute' }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(attributes.getByRole('button', { name: 'Matte', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('prime-product-catalog-settings-v2'))).toBe(catalog);
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 375, height: 812 }, { width: 844, height: 390 }]) {
  test(`create category in the picker preserves product draft at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`/#/products/${activeId}/edit?section=product-data`);
    if (viewport.width === 844) {
      await page.evaluate(() => localStorage.setItem('prime-os-genesis-theme', 'light'));
      await page.reload();
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('#product-name').fill('Unsaved title stays here');
    const productBefore = await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'));
    await page.locator('#product-category-trigger').click();
    const picker = page.getByRole('dialog', { name: 'Select product category' });
    await picker.getByRole('textbox', { name: 'Search categories' }).fill('Quick Sketchbooks');
    await picker.getByRole('button', { name: 'Create “Quick Sketchbooks”' }).click();
    const creator = page.getByRole('dialog', { name: 'Create product category' });
    await expect(creator.getByLabel('Category name')).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await expect(creator.getByLabel('Category name')).toHaveValue('Quick Sketchbooks');
    await creator.getByLabel('Parent category').selectOption('');
    await creator.getByText('Add description').click();
    await creator.getByLabel('Description', { exact: true }).fill('Drawing notebooks');
    await creator.getByRole('button', { name: 'Create & select' }).scrollIntoViewIfNeeded();
    await expect(creator.getByRole('button', { name: 'Create & select' })).toBeInViewport();
    expect(await creator.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await creator.screenshot({ path: `/tmp/prime-category-create-${viewport.width}.png` });
    await creator.getByRole('button', { name: 'Create & select' }).click();
    await expect(picker.getByRole('status')).toContainText('shared catalog');
    await expect(picker.getByRole('button', { name: 'Confirm Category' })).toBeFocused();
    await picker.getByRole('button', { name: 'Confirm Category' }).click();
    const review = page.getByRole('dialog', { name: 'Review category change' });
    await expect(review).toBeVisible();
    await review.getByRole('button', { name: 'Apply to draft' }).click();
    await expect(page.locator('#product-category-trigger')).toBeFocused();
    await expect(page.locator('#product-category-trigger')).toContainText('Quick Sketchbooks');
    await expect(page.locator('#product-name')).toHaveValue('Unsaved title stays here');
    expect(await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'))).toBe(productBefore);
    const created = await page.evaluate(() => JSON.parse(localStorage.getItem('prime-product-catalog-settings-v2')!).categories.find((category: { name: string }) => category.name === 'Quick Sketchbooks'));
    expect(created.parentId).toBeNull();
    expect(created.description).toBe('Drawing notebooks');
    await page.locator('#product-category-trigger').click();
    await picker.getByRole('button', { name: 'Create category' }).click();
    await creator.getByRole('button', { name: 'Back' }).click();
    await expect(picker.getByRole('textbox', { name: 'Search categories' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#product-category-trigger')).toBeFocused();
    expect(errors).toEqual([]);
  });
}

for (const width of [1920, 1440, 844, 375]) {
  test(`unified variant setup and sparse SKU matrix at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 1000 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/#/products/${activeId}/edit`);
    await expect(page.getByTestId('product-overview-snapshot')).toBeVisible();
    await page.evaluate(async () => {
      const moduleUrl = '/src/lib/product-store.ts';
      const { getProducts } = await import(moduleUrl);
      const base = getProducts().find((item: { has_variants: boolean; category: string }) => !item.has_variants && item.category === 'Art Supplies');
      const fixture = { ...base, id: 'variant-flow-test', sku_code: 'FLOW-ORIGINAL', name: 'Notebook variant flow', status: 'draft',
        has_variants: false, product_type: 'single', retail_price: 100, description: 'Paper notebook',
        channels: [], channel_overrides: {}, import_result: undefined, import_sources: [], revisions: [], record_version: 1,
        variant_options: [], inventory: { wh_crjp: 8, wh_rslsg: 4 },
        specifications: [{ attributeKey: 'material', name: 'Material', value: 'Paper' }, { attributeKey: 'color', name: 'Color', value: 'White' }],
        skus: [{ id: 'flow-original', sku_code: 'FLOW-ORIGINAL', variation_name: 'Default', status: 'active', weight_g: 0, units_per_carton: 1, price: 100 }],
      };
      localStorage.setItem('primeos-product-master-v5', JSON.stringify([...getProducts().filter((item: { id: string }) => item.id !== fixture.id), fixture]));
    });
    await page.goto('/#/products/variant-flow-test/edit?section=commerce');
    if (width === 844) await page.evaluate(() => localStorage.setItem('prime-os-genesis-theme', 'light'));
    await page.reload();
    await expect(page.getByRole('button', { name: 'About product structure', exact: true })).toHaveCount(0);
    await page.getByRole('radio', { name: 'Product with variants', exact: true }).check();
    const editor = page.getByRole('region', { name: 'Attributes and SKU matrix' });
    await expect(editor.getByLabel('Create variants from Color')).toBeChecked();
    await expect(editor.getByLabel('Create variants from Material')).toBeChecked();
    await expect(editor.getByLabel('Price for Paper / White')).toHaveValue('100');
    await expect(editor.getByRole('table', { name: 'Variant pricing matrix' }).locator('tbody > tr')).toHaveCount(1);
    await expect(editor.getByRole('button', { name: 'View inventory for Paper / White', exact: true })).toContainText('12 units');
    await expect(editor.getByRole('button', { name: 'About variant options', exact: true })).toHaveCount(0);
    const pricing = page.locator('#product-section-pricing');
    await expect(pricing.getByTestId('product-workspace-header').getByRole('button')).toHaveCount(0);
    for (const choice of await page.locator('#product-structure-choice label').all()) {
      expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.locator('#main-content').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await pricing.screenshot({ path: `/tmp/prime-compact-pricing-${width}.png` });
    // The default matrix is ready without role checkboxes; the seller can still replace an axis.
    await editor.getByRole('button', { name: 'Remove Material attribute' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove attribute', exact: true }).click();
    await editor.getByRole('button', { name: 'Add Color value' }).click();
    await editor.getByLabel('New color value').fill('Black');
    await editor.getByRole('button', { name: 'Add', exact: true }).click();
    await editor.getByRole('button', { name: 'Add attribute', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Size', exact: true }).click();
    await expect(editor.getByLabel('Create variants from Size')).toBeChecked();
    for (const value of ['A4', 'A5']) {
      await editor.getByRole('button', { name: 'Add Size value' }).click();
      await editor.getByLabel('New size value').fill(value);
      await editor.getByRole('button', { name: 'Add', exact: true }).click();
    }
    await editor.getByLabel('Include Black / A5', { exact: true }).uncheck();
    await editor.getByLabel('Keep SKU FLOW-ORIGINAL as').selectOption('White / A4');
    await editor.screenshot({ path: `/tmp/prime-variant-setup-${width}.png` });
    await expect(editor.getByRole('heading', { name: /SKU matrix/ })).toContainText('3 variants');
    await expect(editor.getByRole('button', { name: 'Apply SKU setup' })).toHaveCount(0);
    await expect(editor).toBeVisible();
    const table = page.getByRole('table', { name: 'Variant pricing matrix' });
    await expect(table.locator('tbody > tr')).toHaveCount(4);
    await page.getByLabel('Price for Black / A4').fill('125');
    await page.getByRole('button', { name: 'View inventory for Black / A4', exact: true }).click();
    await page.getByLabel('Add warehouse for Black / A4', { exact: true }).selectOption('wh_crjp');
    await page.getByLabel('Opening stock for Black / A4 at CyberRecord Japan HQ', { exact: true }).fill('6');
    await page.getByRole('group', { name: 'Opening stock for Black / A4', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/prime-setup-opening-' + width + '.png' });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('primeos-product-master-v5')!).find((p: {id: string}) => p.id === 'variant-flow-test').has_variants)).toBe(false);
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(table.locator('tbody > tr')).toHaveCount(3);
    await expect(page.getByLabel('Price for Black / A4')).toHaveValue('125');
    await expect(page.getByRole('button', { name: 'View inventory for Black / A4', exact: true })).toContainText('6 units');
    await expect(page.getByRole('button', { name: 'View inventory for White / A4', exact: true })).toContainText('12 units');
    expect(await page.locator('#main-content').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `/tmp/prime-variant-pricing-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('linked listings retain complete shop data in the table and editor after reload', async ({ page }) => {
  await page.goto(`/#/products/${activeId}/edit?section=distribution`);
  const table = page.getByRole('table', { name: 'Channel listings' });
  await expect(table).toBeVisible();
  await page.reload();
  for (const value of ['SHP-TEST2-MYTH-10', 'AMZ-TEST2-MYTH-10', 'RKT-TEST2-MYTH-10', '3,200 JPY', '22 USD', '1,980 JPY']) await expect(table).toContainText(value);
  await expect(table).not.toContainText('Not recorded');
  await expect(table).not.toContainText('Listing data incomplete');
  await expect(page.getByText('Demo data', { exact: true })).toBeVisible();
  for (let index = 0; index < 3; index++) {
    const row = table.getByRole('row').nth(index + 1);
    await row.getByRole('button', { name: 'Manage listing', exact: true }).click();
    const editor = page.getByRole('dialog');
    await expect(editor.getByText('Demo data · Not live shop values')).toBeVisible();
    await expect(editor.getByLabel('Listing title', { exact: true })).not.toHaveValue('');
    await expect(editor.getByLabel('Description', { exact: true })).not.toHaveValue('');
    await expect(editor.getByLabel('Shop category', { exact: true })).not.toHaveValue('');
    await editor.getByRole('tab', { name: 'Images', exact: true }).click();
    await expect(editor.getByRole('img', { name: /^Listing image \d$/ })).toHaveCount(3);
    await editor.getByRole('tab', { name: 'Price & stock', exact: true }).click();
    await expect(editor.getByLabel('Listing price', { exact: true })).not.toHaveValue('');
    await expect(editor.getByLabel('Shop stock', { exact: true })).not.toHaveValue('');
    await page.keyboard.press('Escape');
    await expect(editor).not.toBeVisible();
  }
  await page.screenshot({ path: '/tmp/prime-linked-listings-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(table).toBeVisible();
  expect(await page.locator('#main-content').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: '/tmp/prime-linked-listings-mobile.png', fullPage: true });
});

test('legacy empty linked data is explicitly flagged without borrowing Master values', async ({ page }) => {
  await page.goto(`/#/products/${activeId}/edit`);
  await expect(page.getByTestId('product-overview-snapshot')).toBeVisible();
  await page.evaluate(async id => {
    const moduleUrl = '/src/lib/product-store.ts';
    const { getProducts } = await import(moduleUrl);
    const products = getProducts();
    const original = products.find((product: { id: string }) => product.id === id);
    const fixture = { ...original, id: 'missing-listing-data-test', sku_code: 'MISSING-DATA-TEST', import_result: undefined,
      import_sources: [], channel_overrides: {}, channels: [{ channel: 'amazon', external_id: 'unknown-live-id', store_name: 'My real shop', status: 'active', listing_url: null, last_synced_at: null }] };
    localStorage.setItem('primeos-product-master-v5', JSON.stringify([...products, fixture]));
  }, activeId);
  await page.goto('/#/products/missing-listing-data-test/edit?section=distribution');
  await page.reload();
  const table = page.getByRole('table', { name: 'Channel listings' });
  await expect(table).toContainText('Listing data incomplete · Link needs review');
  await expect(table).toContainText('Missing listing data: Shop SKU, Title, Description, Category, Product image, Listing price & currency, Shop stock, SKU structure');
  await expect(table.getByRole('link', { name: 'Re-import from connected shop' })).toBeVisible();
  await table.getByRole('button', { name: 'Review missing data' }).click();
  const editor = page.getByRole('dialog');
  await expect(editor.getByLabel('Listing title', { exact: true })).toHaveValue('');
  await expect(editor.getByLabel('Description', { exact: true })).toHaveValue('');
});

async function selectSection(page: Page, id: string, label: string) {
  const picker = page.getByRole('combobox', { name: 'Product editor section' });
  if (await picker.isVisible()) await picker.selectOption(id);
  else await page.getByRole('navigation', { name: 'Product editor workspaces' }).getByRole('button', { name: label, exact: true }).click();
  if (id === 'overview') {
    await expect(page.getByTestId('product-overview-snapshot')).toBeVisible();
    await expect(page.getByTestId('product-workspace-header')).toHaveCount(0);
  } else await expect(page.getByTestId('product-workspace-header').getByRole('heading', { name: label, exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('prime-os-genesis-theme')) localStorage.setItem('prime-os-genesis-theme', 'dark'); });
});

for (const width of [1920, 1440, 1280, 1024, 768, 375]) {
  test(`consistent workspaces and right-side readiness at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/#/products/${activeId}/edit`);
    await expect(page.getByTestId('product-overview-snapshot')).toBeVisible();
    await expect(page.getByTestId('product-editor-header').getByText('Category: Art Supplies', { exact: true })).toBeVisible();
    const main = page.getByTestId('product-editor-main');
    const layout = page.getByTestId('product-editor-layout');
    const mainWidth = (await main.boundingBox())!.width;
    const editorWidth = await page.getByTestId('product-editor-page').evaluate(el => el.clientWidth);
    if (editorWidth < 640) {
      const title = (await page.getByTestId('product-editor-header').getByRole('heading', { level: 1 }).boundingBox())!;
      const actions = (await page.getByRole('button', { name: 'Product actions' }).boundingBox())!;
      expect(title.y).toBeGreaterThanOrEqual(actions.y + actions.height);
    }
    for (const [id, label] of sections) {
      await selectSection(page, id, label);
      const inCardHeader = page.getByTestId('product-workspace-header');
      const card = id === 'overview' ? page.getByTestId('product-overview-snapshot') : inCardHeader.locator('..');
      await expect(card).toHaveClass(/bg-card/);
      expect(Math.abs((await card.boundingBox())!.y - (await main.boundingBox())!.y)).toBeLessThanOrEqual(1);
      await expect(layout).toHaveAttribute('data-has-readiness', 'true');
      expect(Math.abs((await main.boundingBox())!.width - mainWidth)).toBeLessThan(2);
      const sidebar = page.getByTestId(editorWidth >= 768 ? 'product-editor-readiness' : 'product-editor-readiness-compact');
      await expect(sidebar).toBeVisible();
      const right = (await sidebar.boundingBox())!;
      if (editorWidth >= 768) {
        const content = (await main.boundingBox())!;
        expect(right.x).toBeGreaterThanOrEqual(content.x + content.width);
        expect(right.y).toBeLessThanOrEqual(content.y + 1);
      }
      const overflow = await page.locator('#main-content').evaluate(el => el.scrollWidth - el.clientWidth);
      expect(overflow, `horizontal overflow in ${label}`).toBeLessThanOrEqual(1);
      if (editorWidth >= 1024) {
        const navigation = page.getByRole('navigation', { name: 'Product editor workspaces' });
        await expect(navigation).toHaveCSS('border-top-width', '1px');
        expect(Math.abs((await navigation.boundingBox())!.y - (await card.boundingBox())!.y)).toBeLessThanOrEqual(1);
      }
    }
    await selectSection(page, 'setup', 'Product setup');
    const sku = page.locator('#product-master-sku');
    await expect(sku).toHaveAttribute('readonly', '');
    await expect(sku).toHaveAttribute('aria-describedby', 'master-sku-lock-reason');
    await expect(page.getByRole('button', { name: 'Change Master SKU', exact: true })).toBeVisible();
    const skuLayout = await sku.evaluate(element => {
      const field = element.getBoundingClientRect();
      const grid = element.closest('.grid')!.getBoundingClientRect();
      return { left: field.left - grid.left, width: field.width - grid.width };
    });
    expect(Math.abs(skuLayout.left), 'SKU must align with the form grid').toBeLessThanOrEqual(1);
    expect(Math.abs(skuLayout.width), 'SKU must fill the form grid').toBeLessThanOrEqual(1);
    await page.locator('#main-content').evaluate(el => { el.scrollTop = 600; });
    const readiness = page.getByTestId(editorWidth >= 768 ? 'product-editor-readiness' : 'product-editor-readiness-compact');
    await expect(readiness).toBeInViewport();
  });
}

test('header remains compact while overview exposes product facts and a full image preview', async ({ page }) => {
  await page.goto(`/#/products/${activeId}/edit`);
  const header = page.getByTestId('product-editor-header');
  await expect(header.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(header.getByText('SKU: TEST2-MYTH-ART-10', { exact: true })).toBeVisible();
  await expect(header.getByText(/^Product type:|^Variants:|^Brand:/)).toHaveCount(0);
  await expect(header.getByText('Category: Art Supplies', { exact: true })).toBeVisible();
  await expect(header.getByText(/All changes saved|Unsaved changes|Not saved yet/)).toHaveCount(0);
  const summary = page.getByTestId('product-overview-snapshot');
  await expect(summary.getByRole('heading', { name: 'Overview', level: 2 })).toHaveCount(0);
  await expect(summary.getByTestId('product-workspace-header')).toHaveCount(0);
  const topInset = await summary.evaluate(element => element.firstElementChild!.getBoundingClientRect().top - element.getBoundingClientRect().top);
  expect(topInset).toBeLessThanOrEqual(1);
  await expect(summary.getByText('Master SKU', { exact: true })).toBeVisible();
  await expect(summary.getByText('TEST2-MYTH-ART-10', { exact: true })).toBeVisible();
  await expect(summary.getByText('Brand', { exact: true })).toBeVisible();
  await expect(summary.getByText('CYBER-RECORDS', { exact: true })).toBeVisible();
  await expect(summary.getByText('Art Supplies', { exact: true })).toBeVisible();
  await expect(summary.getByText('Description', { exact: true })).toBeVisible();
  await expect(summary.getByText('1 sellable SKU', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Master active', exact: true })).toHaveCount(0);
  const headerImage = header.getByTestId('product-header-image');
  await expect(headerImage.locator('img')).toHaveCount(1);
  await expect(headerImage).toHaveText('');
  await expect(header.getByRole('button', { name: /View product images|View product media/ })).toHaveCount(0);
  await expect(headerImage.locator('.lucide-zoom-in')).toHaveCount(0);
  await headerImage.click();
  await expect(page.getByRole('dialog', { name: 'Product images' })).toHaveCount(0);
  await header.getByRole('button', { name: 'Back to Product Master' }).focus();
  await page.keyboard.press('Tab');
  await expect(header.getByRole('button', { name: 'Product actions' })).toBeFocused();
  const overviewGallery = summary.getByRole('button', { name: 'View product images (3)' });
  await expect(overviewGallery).toHaveText('View 3 images');
  await overviewGallery.click();
  await page.getByRole('dialog', { name: 'Product images' }).press('ArrowRight');
  await expect(page.getByText('Image 2 of 3')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(overviewGallery).toBeFocused();
  await summary.getByRole('button', { name: 'View product data' }).click();
  await expect(page.getByTestId('product-workspace-header').getByRole('heading', { name: 'Product setup', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View all readiness checks' }).click();
  const readiness = page.getByRole('region', { name: 'Product readiness' });
  await expect(readiness.getByRole('list', { name: 'All readiness checks' }).getByRole('listitem')).toHaveCount(6);
  await expect(readiness.getByRole('button', { name: 'Hide readiness checks' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('dialog', { name: 'Product readiness checks' })).toHaveCount(0);
});

test('readiness expands in place with keyboard, collapses, and links to a field without saving', async ({ page }) => {
  await page.goto(`/#/products/${activeId}/edit`);
  const readiness = page.getByRole('region', { name: 'Product readiness' });
  const savedBefore = await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'));
  const toggle = readiness.getByRole('button', { name: 'View all readiness checks' });
  const before = (await toggle.boundingBox())!;
  await toggle.focus();
  await page.keyboard.press('Enter');
  const collapse = readiness.getByRole('button', { name: 'Hide readiness checks' });
  await expect(collapse).toBeFocused();
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expect(readiness.getByRole('list', { name: 'All readiness checks' })).toBeVisible();
  expect(Math.abs((await collapse.boundingBox())!.y - before.y)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(readiness.getByRole('list', { name: 'All readiness checks' })).toHaveCount(0);
  await toggle.click();
  await readiness.getByRole('list', { name: 'All readiness checks' }).getByRole('button', { name: /Add a product title/ }).click();
  await expect(page.locator('#product-name')).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'))).toBe(savedBefore);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('content language selector hugs its label and resizes without increasing the header height', async ({ page }) => {
  const header = page.getByTestId('product-workspace-header');
  for (const width of [1920, 1440, 1280, 1024, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/#/products/${activeId}/edit?section=product-data`);
    const english = header.getByRole('button', { name: 'Content: English', exact: true });
    await expect(english).toBeVisible();
    // Measure after the app sidebar finishes collapsing at the mobile breakpoint.
    await page.locator('.app-sidebar-light').evaluate(async element => {
      await Promise.all(element.getAnimations().map(animation => animation.finished));
    });
    const savedBefore = await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'));
    const headerHeight = (await header.boundingBox())!.height;
    const buttonHeight = (await english.boundingBox())!.height;
    const englishWidth = (await english.boundingBox())!.width;
    await english.click();
    await page.getByRole('menuitemradio', { name: /^Bahasa Melayu / }).click();
    const malay = header.getByRole('button', { name: 'Content: Bahasa Melayu', exact: true });
    await expect(malay).toBeVisible();
    await expect(malay).toHaveAttribute('title', 'Content: Bahasa Melayu');
    await expect(malay).toHaveCSS('white-space', 'nowrap');
    expect((await malay.boundingBox())!.height).toBe(buttonHeight);
    expect((await malay.boundingBox())!.width, `Button did not grow for a longer label at ${width}px`).toBeGreaterThan(englishWidth + 15);
    expect(buttonHeight).toBe(44);
    expect((await header.boundingBox())!.height, `Header height changed at ${width}px`).toBe(headerHeight);
    expect(await malay.locator('[lang="ms-MY"]').evaluate(el => el.getClientRects().length)).toBe(1);
    expect(await header.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    const label = malay.locator('span.truncate');
    if ((await page.getByTestId('product-editor-main').boundingBox())!.width > 560) {
      expect(await label.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    }
    await malay.click();
    await page.getByRole('menuitemradio', { name: 'English Primary' }).click();
    expect((await english.boundingBox())!.width).toBe(englishWidth);
    expect(await page.evaluate(() => localStorage.getItem('primeos-product-master-v5'))).toBe(savedBefore);
  }
});

test('draft keeps actionable readiness, light theme and narrow landscape remain usable', async ({ page }) => {
  await page.goto(`/#/products/${draftId}/edit`);
  await expect(page.getByRole('button', { name: 'Complete product', exact: true })).toBeVisible();
  await page.evaluate(() => { localStorage.setItem('prime-os-genesis-theme', 'light'); });
  await page.reload();
  const summary = page.getByTestId('product-overview-snapshot');
  await expect(summary.getByRole('button', { name: 'View product media — no images' })).toBeVisible();
  await expect(page.getByTestId('product-editor-header').getByRole('button', { name: 'View product media — no images' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Product readiness' })).toBeVisible();
  await selectSection(page, 'setup', 'Product setup');
  await page.locator('#product-name').fill('');
  await expect(page.getByRole('region', { name: 'Product readiness' })).toHaveAttribute('data-complete', 'false');
  await expect(page.getByRole('button', { name: 'Complete product', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View all readiness checks' }).click();
  await expect(page.getByRole('list', { name: 'All readiness checks' }).getByRole('button', { name: /Add a product title/ })).toContainText('Needs attention');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.setViewportSize({ width: 812, height: 375 });
  await expect(page.locator('#product-name')).toHaveValue('');
  await expect(page.getByTestId('product-editor-readiness-compact')).toBeVisible();
  await page.getByRole('button', { name: /Product readiness:/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Complete this product' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Add a product title', exact: true })).toBeVisible();
});

test('activation requires an image and explicit warehouse assignment, including zero stock', async ({ page }) => {
  await page.goto(`/#/products/${activeId}/edit`);
  await expect(page.getByTestId('product-overview-snapshot')).toBeVisible();
  const fixtureId = 'e2e-required-image-warehouse';
  await page.evaluate(async ({ activeId, fixtureId }) => {
    const key = 'primeos-product-master-v5';
    const moduleUrl = '/src/lib/product-store.ts';
    const { getProducts } = await import(moduleUrl);
    const products = getProducts();
    const source = products.find((product: { id: string }) => product.id === activeId);
    products.push({ ...source, id: fixtureId, sku_code: 'E2E-REQUIRED-IMAGE-WAREHOUSE', status: 'draft',
      images: [], inventory: {}, channels: [], import_result: undefined, import_sources: [] });
    localStorage.setItem(key, JSON.stringify(products));
  }, { activeId, fixtureId });
  await page.goto(`/#/products/${fixtureId}/edit`);
  await page.reload();
  const readiness = page.getByRole('region', { name: 'Product readiness' });
  await expect(readiness.getByText('4/6', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate Master', exact: true })).toHaveCount(0);
  await readiness.getByRole('button', { name: /Assign at least 1 warehouse/ }).click();
  await expect(page.locator('#product-inventory-panel')).toBeInViewport();
  await page.getByRole('button', { name: 'Add stock location', exact: true }).click();
  const stockDialog = page.getByRole('dialog');
  await stockDialog.getByRole('combobox', { name: 'Warehouse', exact: true }).selectOption('wh_crjp');
  await stockDialog.getByLabel('Opening stock', { exact: true }).fill('0');
  await stockDialog.getByRole('button', { name: 'Save opening stock', exact: true }).click();
  await expect(readiness.getByText('5/6', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate Master', exact: true })).toHaveCount(0);
  await readiness.getByRole('button', { name: /Add at least 1 product image/ }).click();
  await page.getByLabel('Upload product images', { exact: true }).setInputFiles({
    name: 'required-cover.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=', 'base64'),
  });
  await expect(readiness.getByText('6/6', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Activate Master', exact: true }).click();
  await page.getByRole('dialog', { name: 'Activate this Product Master?' }).getByRole('button', { name: 'Activate Master', exact: true }).click();
  await expect.poll(() => page.evaluate(fixtureId => {
    const products = JSON.parse(localStorage.getItem('primeos-product-master-v5')!);
    return products.find((product: { id: string }) => product.id === fixtureId)?.status;
  }, fixtureId)).toBe('published');
  const saved = await page.evaluate(fixtureId => JSON.parse(localStorage.getItem('primeos-product-master-v5')!)
    .find((product: { id: string }) => product.id === fixtureId), fixtureId);
  expect(saved.inventory).toEqual({ wh_crjp: 0 });
  expect(saved.images).toHaveLength(1);
  expect(saved.channels).toHaveLength(0);
});
