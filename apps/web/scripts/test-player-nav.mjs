import { chromium } from 'playwright';
const BASE_URL = 'http://localhost:5173';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();
await page.goto(`${BASE_URL}/player`);
await page.waitForSelector('text=北京的春节', { timeout: 10000 });
console.log('First slide visible');
await page.click('button[title="下一页"]', { timeout: 5000 });
await page.waitForTimeout(2500);
const secondVisible = await page.locator('text=春节从什么时候开始？').first().isVisible().catch(() => false);
console.log('Second slide visible:', secondVisible);
if (!secondVisible) {
  await page.screenshot({ path: '/tmp/player-nav.png' });
  console.log('Screenshot saved to /tmp/player-nav.png');
}
await browser.close();
