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
await htmlPage.goto(`file://${htmlPath}`);
await htmlPage.waitForSelector('text=北京的春节', { timeout: 10000 });
await htmlPage.waitForTimeout(2000);
await htmlPage.screenshot({ path: '/tmp/html-screenshot.png' });
console.log('Screenshot saved');
const html = await htmlPage.content();
console.log('HTML length', html.length);
await browser.close();
