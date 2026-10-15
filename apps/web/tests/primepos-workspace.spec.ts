import { expect, test } from '@playwright/test';
test.beforeEach(async ({page})=>{await page.addInitScript(()=>{localStorage.setItem('prime-os-genesis-theme','light');localStorage.setItem('prime:demo-data-mode:v1','with-data');});});
const go=async(page:import('@playwright/test').Page,path:string)=>{await page.goto(`/#${path}`);await expect(page.locator('#main-content')).toBeVisible();if(path!=='/orders?status=completed') await expect(page.locator('.pos-page')).toBeVisible();};
test('retail sale, shared Main record, partial refund and close shift',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await go(page,'/pos/shifts');await page.getByLabel('Opening cash (USD)').fill('100');await page.getByRole('button',{name:'Open shift',exact:true}).click();
 await go(page,'/pos/register');await page.getByRole('button',{name:'Add Everyday canvas tote',exact:true}).click();await page.getByRole('button',{name:'Increase Everyday canvas tote'}).click();
 await page.getByRole('button',{name:'Add customer',exact:true}).click();await page.getByRole('button',{name:'Add new customer'}).click();await page.getByLabel('Customer name').fill('Seller Demo');await page.getByLabel('Phone number').fill('0991234567');await page.getByRole('button',{name:'Save customer'}).click();
 await page.getByRole('button',{name:'Add discount',exact:true}).click();await page.getByLabel('Discount percentage').fill('10');await page.getByRole('button',{name:'Apply discount'}).click();
 await page.getByRole('button',{name:/Take payment/}).click();await page.getByLabel('Cash received').fill('50');await page.getByRole('button',{name:'Confirm demo payment'}).click();await expect(page.getByRole('dialog')).toContainText('$43.20');await expect(page.getByRole('dialog')).toContainText('$6.80');await page.getByRole('button',{name:'Done',exact:true}).click();
 await go(page,'/orders?status=completed');await page.getByLabel('Search orders', {exact:true}).fill('POS-1049');await expect(page.getByRole('row').filter({hasText:'POS-1049'})).toContainText('Seller Demo');
 await go(page,'/settings/stores?tab=transactions');await expect(page.getByRole('row').filter({hasText:'POS-1049'})).toContainText('Seller Demo');
 await go(page,'/settings/stores?tab=stock');await expect(page.getByRole('row').filter({hasText:'ESS-001'})).toContainText('22');
 await go(page,'/pos/transactions');await page.getByRole('link',{name:'Return',exact:true}).click();await page.getByLabel('Return quantity for Everyday canvas tote').fill('1');await page.getByRole('button',{name:'Review refund'}).click();await expect(page.getByRole('dialog')).toContainText('$21.60');await page.getByRole('button',{name:'Confirm demo refund'}).click();await page.getByRole('button',{name:'Done',exact:true}).click();
 await go(page,'/pos/shifts');await page.getByRole('button',{name:'Close shift',exact:true}).click();await page.getByLabel('Counted cash (USD)').fill('121.60');await page.getByRole('button',{name:'Confirm close'}).click();await expect(page.getByRole('table')).toContainText('Closed');
 await page.reload();await expect(page.getByRole('table')).toContainText('$121.60');expect(errors).toEqual([]);
});
test('Main assortment and incoming shipment affect the POS',async({page})=>{
 await go(page,'/settings/stores?tab=catalog');await page.getByRole('checkbox',{name:'Sell Everyday canvas tote at Central Flagship'}).uncheck();
 await go(page,'/pos/register');await expect(page.getByRole('button',{name:'Add Everyday canvas tote',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Add Relaxed everyday hoodie'})).toBeDisabled();
 await go(page,'/pos/receiving');await page.getByRole('button',{name:'Receive stock',exact:true}).click();await page.getByLabel('Received quantity').fill('10');await page.getByLabel('Receiving note').fill('Two units missing');await page.getByRole('button',{name:'Confirm received'}).click();
 await go(page,'/pos/register');await expect(page.getByRole('button',{name:'Add Relaxed everyday hoodie'})).toBeEnabled();
 await go(page,'/settings/stores?tab=stock');await expect(page.getByRole('row').filter({hasText:'ESS-006'})).toContainText('10');
 await page.getByLabel('Demo role').selectOption('cashier');await expect(page.getByRole('button',{name:'Create shipment'})).toBeDisabled();
});
test('café floor, kitchen and payment share table state',async({page})=>{
 await go(page,'/pos/shifts');await page.getByLabel('Current store').selectOption('riverside');await page.getByRole('button',{name:'Open shift',exact:true}).click();await expect(page.getByRole('link',{name:'Kitchen',exact:true})).toBeVisible();
 await go(page,'/pos/register');await page.getByRole('button',{name:'Add Oat milk latte'}).click();await page.getByRole('button',{name:'Send to kitchen',exact:true}).click();await page.getByLabel('Table',{exact:true}).selectOption('01');await page.getByRole('button',{name:'Send order',exact:true}).click();
 await go(page,'/pos/kitchen');await page.getByRole('button',{name:'Start preparing'}).click();await page.getByRole('button',{name:'Mark ready'}).click();await page.getByRole('button',{name:'Mark served'}).click();
 await go(page,'/pos/tables');await page.getByRole('button',{name:/Table 01 Occupied/}).click();await page.getByRole('button',{name:'Review & take payment'}).click();await page.getByRole('button',{name:/Take payment/}).click();await page.getByRole('button',{name:'Card',exact:true}).click();await page.getByRole('button',{name:'Confirm demo payment'}).click();await page.getByRole('button',{name:'Done',exact:true}).click();
 await go(page,'/pos/tables');await expect(page.getByRole('button',{name:/Table 01 Available/})).toBeVisible();
});
test('device simulation, held carts and persistence',async({page})=>{
 await go(page,'/pos/hardware');await page.locator('.pos-device').filter({has:page.getByRole('heading',{name:'Receipt printer',exact:true})}).getByRole('button',{name:'Connect',exact:true}).click();await page.locator('.pos-device').filter({has:page.getByRole('heading',{name:'Receipt printer',exact:true})}).getByRole('button',{name:'Test',exact:true}).click();await page.getByRole('button',{name:'Run simulated test'}).click();await expect(page.getByRole('status')).toContainText('successfully');await page.keyboard.press('Escape');
 await go(page,'/pos/register');await page.getByRole('button',{name:'Add Everyday canvas tote',exact:true}).click();await page.getByRole('button',{name:'Hold',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Held carts (1)'}).click();await page.getByRole('dialog').getByRole('button',{name:/Walk-in 1/}).click();await expect(page.getByLabel('Current cart')).toContainText('Everyday canvas tote');
});
test('desktop and mobile layouts in light and dark',async({page})=>{
 await go(page,'/settings/stores');await page.screenshot({path:'/private/tmp/prime-pos-main-light.png',fullPage:true});
 await go(page,'/pos/register');await page.getByRole('button',{name:'Add Everyday canvas tote',exact:true}).click();await page.getByRole('button',{name:'Add Studio ceramic mug',exact:true}).click();await page.locator('#main-content').evaluate(el=>{el.scrollTop=0;});await page.screenshot({path:'/private/tmp/prime-pos-register-light.png',fullPage:true});
 await page.evaluate(()=>{document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');});await expect(page.locator('.pos-product').first()).toHaveCSS('background-color','rgb(28, 28, 38)');await page.screenshot({path:'/private/tmp/prime-pos-register-dark.png',fullPage:true});
 await page.setViewportSize({width:375,height:812});await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#main-content')).toBeVisible();await expect.poll(()=>page.locator('#main-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.screenshot({path:'/private/tmp/prime-pos-register-mobile.png',fullPage:true});
 await go(page,'/settings/stores');await expect.poll(()=>page.locator('#main-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await page.screenshot({path:'/private/tmp/prime-pos-main-mobile.png',fullPage:true});
});
