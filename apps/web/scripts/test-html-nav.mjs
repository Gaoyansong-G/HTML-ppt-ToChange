import { chromium } from 'playwright';
const BASE_URL = 'http://localhost:5173';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();
await page.goto(`${BASE_URL}/editor`);
await page.waitForSelector('text=页面属性', { timeout: 10000 });
console.log('Editor loaded');
const [htmlDownload] = await Promise.all([
  page.waitForEvent('download'),
  page.click('button[title="导出独立 HTML 播放包"]'),
]);
const htmlPath = await htmlDownload.path();
console.log('HTML downloaded to', htmlPath);
const htmlPage = await context.newPage();
await htmlPage.goto(`file://${htmlPath}`);
await htmlPage.waitForSelector('text=北京的春节', { timeout: 10000 });
console.log('HTML first slide visible');
await htmlPage.waitForTimeout(1000);
const buttons = await htmlPage.locator('button').allInnerTexts();
console.log('Buttons:', buttons);
const titles = await htmlPage.locator('button').evaluateAll(els => els.map(e => e.getAttribute('title')));
console.log('Titles:', titles);
try {
  await htmlPage.click('button[title="下一页"]', { timeout: 5000 });
} catch (e) {
  console.log('Click failed, trying text selector', e.message);
  await htmlPage.locator('button').filter({ hasText: /下一页|›|Next/ }).first().click();
}
await htmlPage.waitForTimeout(2500);
const secondVisible = await htmlPage.locator('text=春节从什么时候开始？').first().isVisible().catch(() => false);
console.log('HTML second slide visible:', secondVisible);
await htmlPage.screenshot({ path: '/tmp/html-nav.png' });
console.log('Screenshot saved to /tmp/html-nav.png');
await browser.close();
