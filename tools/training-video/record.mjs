#!/usr/bin/env node
// Records the screen scenes of docs/video/kich-ban-product-warehouses-orders.md (v2).
// Each scene runs in a fresh browser context, so demo state never leaks between takes.
//
//   node tools/training-video/record.mjs              # all scenes
//   node tools/training-video/record.mjs 8a 8b        # selected scenes
//   node tools/training-video/record.mjs --headed     # watch while recording
//   node tools/training-video/record.mjs --fit        # stretch each scene's pauses toward its narration length
//
// Output: outputs/training-video/<scene>.mp4 plus <scene>.markers.json (highlight
// timings and boxes, relative to the start of the clip, for zooms in post-production).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clipSeconds, narrationTargets } from './shared.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(path.join(root, 'apps/web/package.json'))('playwright');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => args.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const BASE_URL = option('base', process.env.BASE_URL ?? 'http://127.0.0.1:5177');
const OUT = path.resolve(root, option('out', 'outputs/training-video'));
// Multiplies every pause; 0.3 is handy for a quick dry run of the selectors.
const PACE = Number(option('pace', '1'));
const VOICE_TIMING = path.join(OUT, 'voice', 'timing.json');
const SIZE = { width: 1920, height: 1080 };

const session = {
  role: 'admin', roleLabel: 'Admin', description: 'Training video session.', canReset: true, canWrite: true,
  visibleResources: [], writableResources: [], hiddenResources: [], resourcePermissions: {},
  account: { id: 'training-video', role: 'admin', fullName: 'Prime Trainer', email: 'trainer@primeos.local', workspace: 'Prime OS', seatType: 'admin' },
};

// Headless video has no mouse pointer, so draw one and pulse it on click.
function installCursor() {
  const install = () => {
    if (document.getElementById('__tv-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = '__tv-cursor';
    cursor.style.cssText = 'position:fixed;left:-40px;top:-40px;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;'
      + 'background:rgba(79,70,229,.28);border:2px solid #4f46e5;box-shadow:0 0 0 4px rgba(255,255,255,.7);'
      + 'z-index:2147483647;pointer-events:none;transition:transform .12s ease,background .12s ease';
    document.documentElement.appendChild(cursor);
    const saved = sessionStorage.getItem('__tv-cursor');
    if (saved) { const [x, y] = JSON.parse(saved); cursor.style.left = `${x}px`; cursor.style.top = `${y}px`; }
    addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`;
      sessionStorage.setItem('__tv-cursor', JSON.stringify([event.clientX, event.clientY]));
    }, true);
    addEventListener('mousedown', () => { cursor.style.transform = 'scale(.7)'; cursor.style.background = 'rgba(79,70,229,.6)'; }, true);
    addEventListener('mouseup', () => { cursor.style.transform = ''; cursor.style.background = 'rgba(79,70,229,.28)'; }, true);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install); else install();
}

class Take {
  constructor(page, id, pace) {
    this.pace = pace;
    this.page = page;
    this.id = id;
    this.mouse = { x: SIZE.width / 2, y: SIZE.height / 2 };
    this.markers = [];
    this.t0 = 0;
  }

  /** Starts the clip: everything before this (loading, setup) is trimmed away. */
  start() { this.t0 = Date.now(); }
  now() { return this.t0 ? (Date.now() - this.t0) / 1000 : 0; }
  mark(label, box, duration) { this.markers.push({ t: Number(this.now().toFixed(2)), label, ...(box ? { box } : {}), ...(duration ? { duration: Number(duration.toFixed(2)) } : {}) }); }
  hold(ms) { return this.page.waitForTimeout(ms * this.pace); }
  /** Anchors the next action to the narration line starting with `line`; compose.mjs lines them up. */
  sync(line) { this.markers.push({ t: Number(this.now().toFixed(2)), sync: line }); }

  async go(route, ready) {
    await this.page.goto(`${BASE_URL}/#${route}`);
    if (ready) await ready.waitFor({ state: 'visible', timeout: 20_000 });
    await this.page.mouse.move(this.mouse.x, this.mouse.y);
    await this.page.waitForTimeout(600);
  }

  async moveTo(locator) {
    try {
      await locator.scrollIntoViewIfNeeded({ timeout: 10_000 });
    } catch {
      throw new Error(`không thấy ${locator}`);
    }
    const box = await locator.boundingBox();
    if (!box) throw new Error(`${locator} không hiển thị`);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const distance = Math.hypot(x - this.mouse.x, y - this.mouse.y);
    await this.page.mouse.move(x, y, { steps: Math.max(8, Math.round(distance / 18)) });
    this.mouse = { x, y };
    return box;
  }

  async hover(locator, ms = 700) { await this.moveTo(locator); await this.hold(ms); }

  async click(locator, ms = 600) {
    await this.moveTo(locator);
    await this.hold(250);
    await locator.click();
    await this.hold(ms);
  }

  async type(locator, text, ms = 500) {
    await this.click(locator, 150);
    await locator.fill('');
    await this.page.keyboard.type(text, { delay: 70 });
    await this.hold(ms);
  }

  async select(locator, label, ms = 600) {
    await this.moveTo(locator);
    await this.hold(250);
    await locator.selectOption({ label });
    await this.hold(ms);
  }

  /** Draws an amber frame around the element, and records it as a zoom marker. */
  async highlight(locator, label, ms = 1800) {
    const box = await this.moveTo(locator);
    this.mark(label, { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) }, (ms * this.pace) / 1000);
    await this.page.evaluate(({ box, ms }) => {
      const frame = document.createElement('div');
      frame.style.cssText = `position:fixed;left:${box.x - 6}px;top:${box.y - 6}px;width:${box.width + 12}px;height:${box.height + 12}px;`
        + 'border:3px solid #f59e0b;border-radius:10px;box-shadow:0 0 0 9999px rgba(15,23,42,.18);'
        + 'z-index:2147483646;pointer-events:none;opacity:0;transition:opacity .25s ease';
      document.documentElement.appendChild(frame);
      requestAnimationFrame(() => { frame.style.opacity = '1'; });
      setTimeout(() => { frame.style.opacity = '0'; setTimeout(() => frame.remove(), 300); }, ms);
    }, { box, ms: ms * this.pace });
    await this.hold(ms + 300);
  }
}

const sidebar = (page, name) => page.getByRole('navigation').getByRole('link', { name, exact: true }).first();
const orderSheet = (page) => page.getByRole('dialog').first();
const openOrder = (take, id) => take.go(`/orders?order=${id}`, take.page.getByRole('dialog').getByText(id, { exact: true }).first());

const scenes = {
  // Cảnh 1 — Danh sách Product Master
  async 1(take) {
    const { page } = take;
    await take.go('/products/master-catalog', page.getByRole('heading', { name: 'Product Master' }));
    take.start();
    await take.hold(1500);
    const tabs = page.getByRole('navigation', { name: 'Catalog status' });
    const tab = (name) => tabs.getByRole('button', { name: new RegExp(`^${name}`) });
    const firstRow = page.locator('tbody tr').first();
    take.sync('đây là bản gốc của mỗi sản phẩm');
    await take.hover(firstRow.locator('td').nth(1), 1800);
    await take.hover(page.locator('tbody tr').nth(1).locator('td').nth(1), 1200);
    take.sync('rồi từ đây mới nối ra các shop');
    await take.hover(page.locator('tbody tr').nth(3).locator('td').nth(5), 1500);
    take.sync('Tab mình dùng nhiều nhất');
    for (const name of ['All', 'To do', 'Active', 'Archived']) await take.hover(tab(name), 600);
    await take.click(tab('To do'), 2200);
    await take.click(tab('All'), 1200);
    const columns = [['Master Status cho biết', /Master status/i], ['Master Stock là', /Master stock/i], ['còn Linked Listings', /Linked listings/i]];
    for (const [line, name] of columns) {
      take.sync(line);
      await take.highlight(page.getByRole('columnheader', { name }).first(), String(name), 2400);
    }
    await take.hold(1500);
  },

  // Cảnh 2 — Từ sản phẩm sang tồn kho theo kho
  async 2(take) {
    const { page } = take;
    await take.go('/products/master-catalog', page.getByLabel('Search products'));
    take.start();
    await take.hold(800);
    await take.type(page.getByLabel('Search products'), 'notebook', 1200);
    take.sync('có ba biến thể');
    await take.click(page.getByRole('button', { name: /Show 3 variants for Black Hardcover Notebook/ }), 1500);
    take.sync('Bấm vào số tồn');
    // Clicking a variant's recorded stock expands its per-warehouse breakdown inline.
    await take.click(page.getByRole('row').filter({ hasText: 'CR-NTB-BLK-A5-A4' }).getByRole('button').last(), 1000);
    const breakdown = page.locator('div').filter({ hasText: 'CyberRecord Japan HQ' }).filter({ hasText: 'Fulfillment By Amazon JP' }).last();
    await take.highlight(breakdown, 'Stock by warehouse', 3500);
    await take.hold(1500);
  },

  // Cảnh 3 — Tạo Product Master mới
  async 3(take) {
    const { page } = take;
    await take.go('/products/master-catalog', page.getByRole('button', { name: 'Create Product Master' }));
    take.start();
    await take.hold(800);
    await take.click(page.getByRole('button', { name: 'Create Product Master' }), 1000);
    const dialog = page.getByRole('dialog').last();
    await take.type(dialog.getByLabel('Product name'), 'Classic Leather Sneakers');
    await chooseCategory(take, dialog);
    await take.click(dialog.getByRole('radio', { name: /With variants/ }));
    take.sync('SKU thì bấm Generate SKU');
    await take.click(dialog.getByRole('button', { name: 'Generate SKU' }), 900);
    take.sync('Bấm Create draft');
    await take.click(dialog.getByRole('button', { name: /Create draft & continue/ }), 1500);
    await page.getByTestId('product-editor-page').waitFor({ timeout: 20_000 });
    await take.hold(1200);
    take.sync('Trong trang chỉnh sửa');
    for (const name of ['Overview', 'Product setup', 'Channel listings']) await take.hover(page.getByTestId('product-editor-layout').getByRole('button', { name: new RegExp(`^${name}`) }).first(), 700);
    take.sync('các bạn nhớ giúp mình ô Product readiness');
    await take.highlight(page.getByTestId('product-editor-readiness'), 'Product readiness', 3200);
    take.sync('nút trên cùng là Complete product');
    await take.highlight(page.getByTestId('product-editor-header').getByRole('button', { name: /Complete product|Activate Master/ }), 'Complete product', 2200);
    take.sync('Còn nếu có sẵn file Excel');
    await take.click(page.getByRole('button', { name: 'Back to Product Master' }), 1200);
    await take.highlight(page.getByRole('button', { name: 'Import products' }), 'Import products', 2600);
    await take.hold(1000);
  },

  // Cảnh 3b — Review & link listing từ shop
  async '3b'(take) {
    const { page } = take;
    await take.go('/products/master-catalog', page.getByRole('button', { name: /Review & link/ }));
    take.start();
    await take.hold(800);
    await take.highlight(page.getByRole('button', { name: /Review & link/ }), 'Review & link', 2200);
    take.sync('Khi kết nối shop');
    await take.hover(page.getByText(/shop listings to review/).first(), 1500);
    take.sync('Banner phía trên');
    await take.highlight(page.getByText(/shop listings to review/).first(), 'Listings to review', 2400);
    await take.click(page.getByRole('button', { name: /Review & link/ }), 1500);
    const sheet = page.getByRole('dialog', { name: 'Review shop listings' });
    for (const step of ['Choose listings', 'Check the match', 'Link or create']) await take.hover(page.getByRole('heading', { name: step }).first(), 700);
    await take.click(page.getByRole('button', { name: 'Got it' }).filter({ visible: true }).first(), 1000);
    take.sync('Hệ thống đã tự gom');
    const suggestion = sheet.getByText('Artist Precision Paint Brush Set — 12-piece', { exact: true }).first();
    await take.highlight(suggestion.locator('xpath=ancestor::*[self::td or @role="cell"][1]'), 'Suggested Master', 2600);
    take.sync('Listing nào không có gợi ý');
    await take.click(sheet.getByRole('button', { name: /^No suggestion/ }), 900);
    await take.highlight(sheet.getByRole('button', { name: 'Choose Master' }).first(), 'Choose Master', 1800);
    take.sync('Ví dụ bộ cọ vẽ');
    await take.click(sheet.getByRole('button', { name: /^All\s*\d/ }), 900);
    await take.hover(suggestion, 900);
    take.sync('mình bấm Review 5 listings');
    await take.click(sheet.getByRole('button', { name: 'Review 5 listings' }).first(), 1800);
    const compare = page.getByRole('dialog').last();
    take.sync('Bảng so sánh đặt từng listing');
    await take.highlight(compare.getByText('Master field', { exact: true }).locator('xpath=ancestor::*[self::tr or @role="row"][1]'), 'Listings side by side', 3000);
    take.sync('Cột cuối là giá trị');
    await take.highlight(compare.getByText('Master · value to save', { exact: true }).locator('xpath=ancestor::*[self::th or self::td or @role="columnheader" or @role="cell"][1]'), 'Master value to save', 2400);
    take.sync('Các bạn kiểm tra đúng sản phẩm');
    await take.hover(compare.getByText(/^Title/).first(), 1500);
    take.sync('Kiểm tra xong thì tick');
    await take.click(compare.getByRole('checkbox', { name: /I reviewed all/ }), 900);
    take.sync('bấm Link all 5 listings');
    await take.click(compare.getByRole('button', { name: /^Link all 5 listings/ }), 1500);
    take.sync('xem lại một lần');
    await take.hover(page.getByRole('dialog').last().getByText('Review before saving', { exact: true }), 1500);
    await take.click(page.getByRole('dialog').last().getByRole('button', { name: /^Link all 5 listings/ }), 1500);
    take.sync('Vậy là năm listing');
    await take.highlight(page.getByRole('dialog').last().getByText(/5 listings linked to 1 Master/), 'Linked', 2500);
    take.sync('Bước này chỉ lưu liên kết');
    await take.highlight(page.getByRole('dialog').last().getByText(/Master status and details unchanged/), 'Nothing else changed', 3500);
    await take.hold(800);
  },

  // Cảnh 4 — Tổng quan Warehouses
  async 4(take) {
    const { page } = take;
    await take.go('/warehouses', page.getByRole('heading', { name: 'My warehouses' }));
    take.start();
    await take.hold(1500);
    const list = page.getByLabel('Choose a warehouse');
    take.sync('Bên trái là danh sách kho');
    await take.hover(warehouseButton(list, 'CyberRecord Japan HQ'), 900);
    await take.hover(warehouseButton(list, 'Reseller Singapore Hub'), 900);
    take.sync('kho đối tác 3PL');
    await take.hover(warehouseButton(list, 'Vietnam 3PL Partner'), 1200);
    take.sync('và kho do sàn vận hành');
    await take.hover(warehouseButton(list, 'Fulfillment By Shopee MY'), 1200);
    await take.hover(warehouseButton(list, 'Fulfillment By Amazon JP'), 1200);
    take.sync('Mấy kho của sàn');
    await take.highlight(warehouseButton(list, 'Fulfillment By Shopee MY'), 'Read only warehouse', 2200);
    take.sync('Mình chọn CyberRecord');
    await take.click(warehouseButton(list, 'CyberRecord Japan HQ'), 1500);
    const lines = { Stock: 'Stock là hàng thực', 'For orders': 'For orders là phần', 'Other holds': 'Other holds là', 'Available (ATP)': 'và Available' };
    for (const name of ['Stock', 'For orders', 'Other holds', 'Available (ATP)']) {
      take.sync(lines[name]);
      await take.highlight(page.getByRole('columnheader', { name: new RegExp(`^${escape(name)}`) }).first(), name, 2300);
    }
    await take.hold(1200);
  },

  // Cảnh 5 — Thao tác tồn kho
  async 5(take) {
    const { page } = take;
    await take.go('/warehouses', page.getByRole('heading', { name: 'My warehouses' }));
    await warehouseButton(page.getByLabel('Choose a warehouse'), 'CyberRecord Japan HQ').click();
    await page.waitForTimeout(1200);
    take.start();
    await take.hold(800);
    const row = page.getByRole('row').filter({ hasText: 'CR-BSH-SET-12' }).first();
    await take.click(row.getByRole('button', { name: /Actions/ }), 700);
    const menu = page.getByRole('menu');
    for (const name of [/Receive stock/, /Adjust stock/, /Record opening stock/, /Transfer stock/, /Manage holds/]) {
      const item = menu.getByRole('menuitem', { name });
      if (await item.count()) await take.hover(item.first(), 500);
    }
    // Item tooltips can close the menu while hovering; reopen it before choosing.
    if (!(await menu.isVisible())) await take.click(row.getByRole('button', { name: /Actions/ }), 600);
    take.sync('chọn Adjust stock');
    await take.click(menu.getByRole('menuitem', { name: /Adjust stock/ }), 1000);
    const dialog = page.getByRole('dialog').last();
    take.sync('nhập số đếm thực tế');
    await take.type(dialog.getByRole('spinbutton').first(), '70');
    const reason = dialog.getByRole('combobox').filter({ hasText: /Physical stock count|reason/i }).first();
    if (await reason.count() && await reason.evaluate((el) => el.tagName === 'SELECT')) await take.select(reason, 'Physical stock count');
    take.sync('rồi Record adjustment');
    await take.click(dialog.getByRole('button', { name: /Record adjustment/ }), 1200);
    await take.highlight(page.getByText(/→/).first(), 'Adjustment result', 2800);
    take.sync('Mọi thay đổi đều nằm trong Stock activity');
    await take.click(page.getByRole('button', { name: 'Stock activity' }), 1200);
    await take.highlight(page.getByRole('dialog').last(), 'Stock activity', 3000);
    await page.keyboard.press('Escape');
    await take.hold(800);
  },

  // Cảnh 6 — Cầu nối sang đơn hàng
  async 6(take) {
    const { page } = take;
    await take.go('/warehouses', page.getByRole('heading', { name: 'My warehouses' }));
    await warehouseButton(page.getByLabel('Choose a warehouse'), 'CyberRecord Japan HQ').click();
    await page.waitForTimeout(1200);
    take.start();
    await take.hold(800);
    await take.highlight(page.getByRole('columnheader', { name: /^For orders/ }).first(), 'For orders', 1500);
    take.sync('bấm vào là thấy');
    await take.click(page.getByRole('button', { name: /^Order holds for Black Hardcover Notebook/ }).first(), 1000);
    await take.highlight(page.locator('[role=dialog], [data-radix-popper-content-wrapper]').last(), 'Order references', 3500);
    await page.keyboard.press('Escape');
    await take.hold(800);
  },

  // Cảnh 7 — Danh sách Orders
  async 7(take) {
    const { page } = take;
    await take.go('/orders', page.getByRole('table', { name: 'Orders' }));
    take.start();
    await take.hold(1500);
    const orders = page.getByRole('table', { name: 'Orders' });
    take.sync('Trang Orders gom đơn');
    await take.highlight(page.getByRole('columnheader', { name: /Sales channel/i }).first(), 'Sales channel', 2000);
    for (const channel of ['PrimeWeb', 'PrimePOS', 'Shopee', 'TikTok Shop', 'Lazada']) {
      const cell = orders.getByText(channel, { exact: true }).first();
      if (!(await cell.count())) continue;
      take.sync(`${channel === 'PrimePOS' ? 'POS' : channel},`);
      await take.hover(cell, 500);
    }
    const tabs = page.getByLabel('Order lifecycle');
    take.sync('Các tab đi theo');
    for (const name of ['All', 'Awaiting confirmation', 'Preparing', 'Ready to ship', 'Shipping', 'Delivered', 'Completed']) {
      await take.hover(tabs.getByText(name, { exact: true }).first(), 450);
    }
    const review = page.getByRole('button', { name: /Needs review/ }).first();
    take.sync('Bật Needs review');
    await take.click(review, 2200);
    take.sync('Còn cột Next action');
    await take.highlight(page.getByRole('columnheader', { name: /Next action/i }).first(), 'Next action', 2500);
    await take.click(review, 1200);
  },

  // Cảnh 8a — Đơn thiếu mapping
  async '8a'(take) {
    const { page } = take;
    await openOrder(take, 'DEMO-MAP-UNLINKED');
    take.start();
    await take.hold(1500);
    const sheet = orderSheet(page);
    await take.highlight(sheet.getByText('Map every order line to a Master SKU with stock first.'), 'Blocked next step', 2600);
    await take.highlight(sheet.getByText(/Some items cannot be matched to a Master SKU/), 'Needs review', 2600);
    take.sync('Dòng bảng pha màu');
    await take.highlight(sheet.getByRole('note').filter({ hasText: 'Needs product mapping' }), 'Needs product mapping', 3000);
    take.sync('Bấm Map product');
    await take.click(sheet.getByRole('button', { name: 'Map product' }), 1500);
    const review = page.getByRole('dialog').last();
    await take.highlight(review.getByText('Find a Product Master', { exact: true }).last(), 'Find a Product Master', 2200);
    await take.highlight(review.getByRole('button', { name: 'Create new Master' }), 'Create new Master', 2200);
    await take.click(review.getByRole('button', { name: 'Back to order' }), 1500);
  },

  // Cảnh 8b — Đơn thiếu tồn, sửa ngay ở Warehouses
  async '8b'(take) {
    const { page } = take;
    await openOrder(take, 'DEMO-MAP-STOCK');
    take.start();
    await take.hold(1200);
    take.sync('Đơn thứ hai thì lỗi khác');
    await take.highlight(orderSheet(page).getByRole('note').filter({ hasText: 'Not enough stock' }), 'Not enough stock', 3500);
    take.sync('Mình sang Warehouses');
    await take.click(orderSheet(page).getByRole('button', { name: 'Close' }).last(), 800);
    await take.click(sidebar(page, 'Warehouses'), 1200);
    await warehouseButton(page.getByLabel('Choose a warehouse'), 'Vietnam 3PL Partner').waitFor();
    await take.click(warehouseButton(page.getByLabel('Choose a warehouse'), 'Vietnam 3PL Partner'), 1200);
    await take.type(page.getByPlaceholder(/Search product or SKU/), 'CR-BSH-SET-12', 1200);
    take.sync('nên mình bấm Record opening stock');
    await take.click(page.getByRole('button', { name: 'Record opening stock' }).first(), 1200);
    const sheet = page.getByRole('dialog').last();
    await take.type(sheet.getByLabel('Find existing products'), 'CR-BSH-SET-12', 900);
    take.sync('nhập số thực tế đang có');
    await take.type(sheet.getByLabel('Opening stock for CR-BSH-SET-12'), '10', 700);
    await take.click(sheet.getByRole('checkbox').last(), 700);
    take.sync('rồi lưu');
    await take.click(sheet.getByRole('button', { name: 'Save opening stock' }), 1200);
    await take.highlight(page.getByText(/Opening stock saved/).first(), 'Opening stock saved', 2600);
    take.sync('Quay lại đơn');
    await take.click(sidebar(page, 'Orders'), 600);
    await take.type(page.getByLabel('Search orders'), 'DEMO-MAP-STOCK', 600);
    await take.click(page.getByRole('table', { name: 'Orders' }).getByText('DEMO-MAP-STOCK', { exact: true }).first(), 1000);
    take.sync('nút Prepare shipment đã bấm được');
    await take.highlight(orderSheet(page).getByRole('button', { name: 'Prepare shipment' }).first(), 'Unblocked', 3000);
    take.sync('Các bạn để ý là mỗi cảnh báo');
    await take.highlight(orderSheet(page).getByRole('table', { name: 'Order items' }), 'Order items', 3500);
    await take.hold(1000);
  },

  // Cảnh 9 — Xử lý đơn tới khi hoàn tất
  async 9(take) {
    const { page } = take;
    await openOrder(take, 'DEMO-PREPARE-PAID');
    take.start();
    await take.hold(1200);
    const sheet = orderSheet(page);
    take.sync('Thanh trên cùng là sáu bước');
    await take.highlight(sheet.getByRole('list', { name: 'Order lifecycle' }), 'Lifecycle', 2600);
    take.sync('ô Next step');
    await take.highlight(sheet.getByText('Next step', { exact: true }).locator('..'), 'Next step', 2200);
    take.sync('Dispatch warehouse là kho xuất');
    await take.highlight(sheet.getByText('Dispatch warehouse', { exact: true }).locator('..'), 'Dispatch warehouse', 2000);
    take.sync('cột Inventory');
    await take.highlight(sheet.getByRole('table', { name: 'Order items' }).getByRole('columnheader', { name: 'Inventory' }), 'Inventory', 2000);
    take.sync('Bấm Prepare shipment');
    await prepareShipment(take);
    take.sync('Shipper lấy hàng');
    await advance(take, 'Record carrier pickup');
    take.sync('mình bấm Simulate tracking update');
    await simulateDelivery(take);
    take.sync('Giao xong thì Complete order');
    await advance(take, 'Complete order');
    take.sync('Tem và phiếu đóng gói');
    await take.highlight(orderSheet(page).getByText('Shipping & packaging', { exact: true }).first(), 'Shipping documents', 2500);
    await take.hold(1200);
  },

  // Cảnh 9b — Xử lý đơn hàng loạt
  async '9b'(take) {
    const { page } = take;
    await take.go('/orders', page.getByRole('table', { name: 'Orders' }));
    take.start();
    await take.hold(1200);
    const actions = page.getByLabel('Available actions');
    const table = page.getByRole('table', { name: 'Orders' });
    const bar = page.getByLabel('Bulk order actions');
    const batch = () => page.getByRole('dialog').last();
    take.sync('nên trang Orders có ba thao tác');
    await take.highlight(actions, 'Available actions', 3000);
    take.sync('lọc Available actions theo Can confirm');
    await take.select(actions, 'Can confirm', 800);
    for (const id of ['DEMO-CONFIRM-COD', 'DEMO-CONFIRM-PAID', 'DEMO-CONFIRM-BANK']) {
      const row = table.getByText(id, { exact: true }).first();
      if (await row.count()) await take.hover(row, 700);
    }
    take.sync('rồi chọn tất cả');
    await take.click(table.getByRole('checkbox').first(), 900);
    take.sync('Thanh thao tác hiện ra');
    await take.highlight(bar, 'Bulk actions bar', 2000);
    take.sync('Con số trong ngoặc');
    await take.highlight(bar.getByRole('button', { name: /^Confirm orders/ }), 'Eligible count', 1800);
    await take.hover(bar.getByRole('button', { name: /^Print packing slips/ }), 900);
    take.sync('Bấm Confirm orders');
    await take.click(bar.getByRole('button', { name: /^Confirm orders/ }), 1200);
    take.sync('Hệ thống kiểm tra lại');
    await take.highlight(batch().getByText(/eligible · \d+ will be skipped/), 'Eligibility', 2600);
    take.sync('Xác nhận xong');
    await take.click(batch().getByRole('button', { name: /^Confirm \d+ orders/ }), 1200);
    take.sync('cả ba đơn chuyển sang Preparing');
    await take.highlight(batch().getByText(/succeeded · \d+ failed/), 'Confirmed', 2400);
    take.sync('Print packing slips.');
    await take.click(batch().getByRole('button', { name: /^Print packing slips/ }), 1200);
    take.sync('Phiếu đóng gói được gửi');
    await take.highlight(batch().getByText(/packing slips sent to the print dialog/), 'Packing slips sent', 2600);
    await take.click(batch().getByRole('button', { name: 'Done' }), 900);
    take.sync('Lọc các đơn chưa in tem');
    await take.select(actions, 'Shipping label not printed', 1200);
    take.sync('chọn tất cả,');
    await take.click(table.getByRole('checkbox').first(), 900);
    take.sync('rồi bấm Shipping labels');
    await take.click(bar.getByRole('button', { name: /^Shipping labels/ }), 1200);
    take.sync('Mỗi đơn có link mở tem gốc');
    await take.highlight(batch().getByRole('button', { name: /Open sample label/ }).first(), 'Sample label', 2200);
    await take.hover(batch().getByRole('button', { name: /Open sample label/ }).last(), 1200);
    await take.click(batch().getByRole('button', { name: 'Done' }), 1000);
  },
};

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const warehouseButton = (list, name) => list.locator('button, [role=button], a').filter({ hasText: name }).first();

async function chooseCategory(take, dialog) {
  await take.click(dialog.getByRole('combobox'), 600);
  const option = take.page.getByRole('option').filter({ hasText: /Stationery/ }).first();
  await take.click((await option.count()) ? option : take.page.getByRole('option').first(), 600);
}

async function prepareShipment(take) {
  const { page } = take;
  await take.click(orderSheet(page).getByRole('button', { name: 'Prepare shipment' }).first(), 1500);
  const form = page.getByRole('dialog').last();
  const tracking = form.getByLabel(/Tracking number/i);
  if (await tracking.count() && !(await tracking.first().inputValue())) await take.type(tracking.first(), 'SPX-TRAIN-0001');
  const useQuantities = form.getByRole('button', { name: /Use order quantities/ });
  if (await useQuantities.count()) await take.click(useQuantities.first(), 900);
  const packed = form.getByRole('checkbox').last();
  take.sync('tick xác nhận');
  if (await packed.count() && !(await packed.isChecked())) await take.click(packed, 800);
  take.sync('rồi Mark ready to ship');
  await take.click(form.getByRole('button', { name: /Mark ready to ship/ }), 1800);
}

async function advance(take, name) {
  const { page } = take;
  await take.click(orderSheet(page).getByRole('button', { name }).first(), 1200);
  const form = page.getByRole('dialog').last();
  const evidence = form.getByPlaceholder('Receipt number or evidence reference');
  if (await evidence.count()) await take.type(evidence.first(), 'PICKUP-0001');
  const sample = form.getByRole('button', { name: 'Use sample values' });
  if (await sample.count()) await take.click(sample.first(), 600);
  const confirm = form.getByRole('button', { name: new RegExp(`^${escape(name)}`) }).last();
  if (await confirm.count() && await form.evaluate((el) => !el.getAttribute('aria-label')?.startsWith('Order '))) await take.click(confirm, 1600);
  await take.hold(800);
}

// Demo orders move from Shipping to Delivered through the simulated carrier feed.
async function simulateDelivery(take) {
  const { page } = take;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await orderSheet(page).getByRole('button', { name: 'Complete order' }).count()) return;
    await take.click(orderSheet(page).getByRole('button', { name: /Simulate tracking update/ }).first(), 700);
    const items = page.getByRole('menuitem');
    const delivered = items.filter({ hasText: /Delivered/i });
    await take.click((await delivered.count()) ? delivered.first() : items.first(), 1500);
  }
}

async function record(browser, id, pace) {
  const raw = path.join(OUT, '.raw', id);
  fs.rmSync(raw, { recursive: true, force: true });
  const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, recordVideo: { dir: raw, size: SIZE } });
  await context.route('**/api/session', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) }));
  await context.addInitScript(() => {
    localStorage.setItem('prime-os-genesis-theme', 'light');
    localStorage.setItem('prime:demo-data-mode:v1', 'with-data');
    sessionStorage.setItem('prime-os-auth-token', 'prime-qa-token');
  });
  await context.addInitScript(installCursor);
  const page = await context.newPage();
  const take = new Take(page, id, pace);
  const opened = Date.now();
  let failure;
  try {
    await scenes[id](take);
  } catch (error) {
    failure = error;
    await page.screenshot({ path: path.join(OUT, `${id}.error.png`) }).catch(() => {});
  }
  const video = page.video();
  await context.close();
  const source = await video.path();
  const offset = take.t0 ? (take.t0 - opened) / 1000 : 0;
  const target = path.join(OUT, `${id}.mp4`);
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', offset.toFixed(2), '-i', source, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-r', '30', target]);
  } catch {
    fs.copyFileSync(source, target.replace(/\.mp4$/, '.webm'));
    console.warn('  ! không tìm thấy ffmpeg — giữ file .webm chưa cắt đầu.');
  }
  fs.writeFileSync(path.join(OUT, `${id}.markers.json`), JSON.stringify({ scene: id, size: SIZE, pace, markers: take.markers }, null, 2));
  fs.rmSync(raw, { recursive: true, force: true });
  if (failure) throw failure;
}

// With --fit, scale the pace of each scene by narration ÷ last clip length. Pauses are only part of
// a clip, so this lands close rather than exact; compose.mjs absorbs the rest.
const fitTargets = flag('fit') && fs.existsSync(VOICE_TIMING)
  ? narrationTargets(JSON.parse(fs.readFileSync(VOICE_TIMING, 'utf8')), (id) => fs.existsSync(path.join(OUT, `${id}.mp4`)) ? clipSeconds(path.join(OUT, `${id}.mp4`)) : 0)
  : null;
function paceFor(id) {
  const clip = path.join(OUT, `${id}.mp4`);
  const markers = path.join(OUT, `${id}.markers.json`);
  if (!fitTargets?.[id] || !fs.existsSync(clip)) return PACE;
  const previous = fs.existsSync(markers) ? JSON.parse(fs.readFileSync(markers, 'utf8')).pace ?? 1 : 1;
  return Math.min(3, Math.max(0.5, previous * fitTargets[id] / clipSeconds(clip)));
}

// Numeric keys would otherwise sort ahead of 8a/8b.
const ORDER = ['1', '2', '3', '3b', '4', '5', '6', '7', '8a', '8b', '9', '9b'];
const requested = args.filter((arg) => !arg.startsWith('--'));
const ids = requested.length ? requested : ORDER;
const unknown = ids.filter((id) => !scenes[id]);
if (unknown.length) {
  console.error(`Không có cảnh: ${unknown.join(', ')}. Các cảnh: ${ORDER.join(', ')}`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: option('channel', 'chrome'), headless: !flag('headed') });
const failed = [];
for (const id of ids) {
  process.stdout.write(`Cảnh ${id} … `);
  try {
    // One retry: a fresh context usually clears timing flakes in the demo app.
    const pace = paceFor(id);
    await record(browser, id, pace).catch(() => record(browser, id, pace));
    fs.rmSync(path.join(OUT, `${id}.error.png`), { force: true });
    console.log('xong');
  } catch (error) {
    failed.push(id);
    console.log(`LỖI\n  ${error.message.split('\n')[0]}\n  → xem ${path.relative(root, path.join(OUT, `${id}.error.png`))}`);
  }
}
await browser.close();
console.log(`\nClip ở ${path.relative(root, OUT)}/`);
if (failed.length) { console.log(`Cảnh lỗi: ${failed.join(', ')}`); process.exit(1); }
