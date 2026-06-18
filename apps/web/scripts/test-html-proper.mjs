import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();
await page.goto('http://localhost:5173/editor');
await page.waitForSelector('text=页面属性', { timeout: 10000 });
const [htmlDownload] = await Promise.all([
  page.waitForEvent('download'),
  page.click('button[title="导出独立 HTML 播放包"]'),
]);
const tempPath = await htmlDownload.path();
const htmlPath = path.join(os.tmpdir(), `standalone-${Date.now()}.html`);
fs.copyFileSync(tempPath, htmlPath);
console.log('HTML copied to', htmlPath);
const htmlPage = await context.newPage();
htmlPage.on('pageerror', err => console.error('[PAGE ERROR]', err.message));
htmlPage.on('console', msg => {
  if (msg.type() === 'error') console.error('[CONSOLE ERROR]', msg.text());
});
await htmlPage.goto(`file://${htmlPath}`);
await htmlPage.waitForSelector('text=北京的春节', { timeout: 10000 });
console.log('HTML first slide visible');
await htmlPage.waitForTimeout(1500);
const buttons = await htmlPage.locator('button').count();
console.log('Button count:', buttons);
await htmlPage.click('button[title="下一页"]', { timeout: 5000 });
await htmlPage.waitForTimeout(2500);
const secondVisible = await htmlPage.locator('text=春节从什么时候开始？').first().isVisible().catch(() => false);
console.log('HTML second slide visible:', secondVisible);
await htmlPage.screenshot({ path: '/tmp/html-proper.png' });
console.log('Screenshot saved');
await browser.close();
