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
await htmlPage.waitForTimeout(3000);
const texts = await htmlPage.locator('body').innerText();
console.log('Body text sample:', texts.slice(0, 500));
console.log('Has 返回首页:', texts.includes('返回首页'));
console.log('Has 下一页:', texts.includes('下一页'));
console.log('Has 重新开始:', texts.includes('重新开始'));
await browser.close();
