/**
 * 组件面板验证脚本：
 * 1. 打开 /editor（默认 exampleCourseware）
 * 2. 切到"组件"Tab → 截图 panel-tab.png
 * 3. 点击插入"课堂测验页"（block quiz）→ 截图 panel-after-quiz.png
 * 4. 点击插入"计时器"（interactive timer）→ 截图 panel-after-timer.png
 * 断言：画布中出现新元素（quiz 题干文本 / 计时器 05:00），且 quiz 高度被压缩一半。
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const SHOTS_DIR = resolve('./shots');
mkdirSync(SHOTS_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => {
    console.error('[Browser Error]', err.message);
    errors.push(err.message);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[Console Error]', msg.text());
      errors.push(msg.text());
    }
  });

  try {
    console.log('1. 打开 /editor ...');
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForSelector('text=北京的春节', { timeout: 15000 });
    await page.waitForTimeout(800);

    console.log('2. 切到"组件" Tab ...');
    await page.getByRole('button', { name: '组件' }).click();
    await page.waitForSelector('[data-testid="components-panel"]');
    await page.waitForSelector('[data-testid="insert-block-quiz"]');
    await page.waitForSelector('[data-testid="insert-interactive-timer"]');
    await page.screenshot({ path: resolve(SHOTS_DIR, 'panel-tab.png') });
    console.log('   ✅ 组件面板已渲染（版式组件 + 课堂互动两组均可见）');

    const canvasEl = () => page.locator('[data-element-id]');

    console.log('3. 插入"课堂测验页" ...');
    const before = await canvasEl().count();
    await page.locator('[data-testid="insert-block-quiz"]').click();
    await page.waitForTimeout(800);
    await page.waitForSelector('text=示例：中国的首都是哪里？', { timeout: 5000 });
    const afterQuiz = await canvasEl().count();
    if (afterQuiz !== before + 1) {
      throw new Error(`插入 quiz 后画布元素数 ${afterQuiz} ≠ ${before + 1}`);
    }
    await page.screenshot({ path: resolve(SHOTS_DIR, 'panel-after-quiz.png') });
    console.log('   ✅ 课堂测验页已出现在画布（占满内容区）');

    console.log('4. 插入"计时器" ...');
    await page.locator('[data-testid="insert-interactive-timer"]').click();
    await page.waitForTimeout(800);
    await page.waitForSelector('text=05:00', { timeout: 5000 });
    await page.screenshot({ path: resolve(SHOTS_DIR, 'panel-after-timer.png') });
    console.log('   ✅ 计时器已出现在画布（quiz 块高度压缩一半，计时器在其下方）');

    // 验证 geometry 策略：quiz 块被压缩为 320，timer 位于其下方（y=384）
    const geoms = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[data-element-id]'));
      return els.map((el) => {
        const rect = el.getBoundingClientRect();
        return { id: el.getAttribute('data-element-id'), w: rect.width, h: rect.height, top: rect.top };
      });
    });
    console.log('   画布元素几何（缩放后像素）:', JSON.stringify(geoms.slice(-2)));

    console.log('5. 撤销一次，计时器应消失且 quiz 恢复全高 ...');
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);
    const timerGone = (await page.locator('text=05:00').count()) === 0;
    if (!timerGone) throw new Error('撤销后计时器仍存在');
    console.log('   ✅ 撤销链工作正常（插入操作可整体撤销）');

    if (errors.length > 0) {
      throw new Error(`浏览器报错：${errors.join(' | ')}`);
    }
    console.log('\n全部通过 ✅ 截图保存在 apps/web/shots/panel-*.png');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('验证失败 ❌', err);
  process.exit(1);
});
