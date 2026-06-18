import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();
await page.goto('http://localhost:5173/editor');
await page.waitForSelector('text=页面属性', { timeout: 10000 });
const [htmlDownload] = await Promise.all([
  page.waitForEvent('download'),
  page.click('button[title="导出独立 HTML 播放包"]'),
]);
const htmlPath = await htmlDownload.path();
const htmlPage = await context.newPage();
htmlPage.on('pageerror', err => console.error('[PAGE ERROR]', err.message));
htmlPage.on('console', msg => {
  if (msg.type() === 'error') console.error('[CONSOLE ERROR]', msg.text());
});
await htmlPage.goto(`file://${htmlPath}`);
await htmlPage.waitForTimeout(3000);
const buttons = await htmlPage.locator('button').count();
console.log('Button count:', buttons);
await browser.close();
