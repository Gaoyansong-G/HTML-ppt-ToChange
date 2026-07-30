// M1 视觉验收 v2：列表 → 播放 → 逐页截图
/* eslint-disable */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));

  await page.goto('http://localhost:5173/courseware-list', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 打印列表中的按钮结构便于调试
  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map((b) => b.textContent.trim()).slice(0, 20),
  );
  console.log('buttons:', JSON.stringify(buttons));

  // 悬停包含"人工智能"的课件卡片，点击"预览"
  const card = page.locator('.group', { hasText: '人工智能' }).first();
  await card.hover();
  await page.waitForTimeout(400);
  await card.locator('button[title="预览"]').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/m1-p1.png' });

  for (let i = 0; i < 7; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `shots/m1-p${i + 2}.png` });
  }

  await browser.close();
  console.log('done');
})().catch((e) => { console.error(e); process.exit(1); });
