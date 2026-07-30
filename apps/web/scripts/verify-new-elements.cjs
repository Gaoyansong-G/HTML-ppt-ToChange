/**
 * 验证 formula/diagram/audio/video 四种新元素渲染器。
 * 前提：dev server 已在 http://localhost:5173 运行（pnpm --filter @courseware/web dev）。
 * 打开 /player（默认加载 exampleCourseware），翻到末尾两页截图到 apps/web/shots/elements-*.png。
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = process.env.WEB_URL || 'http://localhost:5173';
const SHOTS_DIR = path.resolve(__dirname, '..', 'shots');
const TOTAL_SLIDES = 6; // 原有 4 页 + 新增 2 页

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  await page.goto(`${BASE_URL}/player`);
  await page.waitForSelector('text=北京的春节', { timeout: 15000 });
  console.log('player loaded (slide 1)');
  await page.waitForTimeout(1500);

  // 翻到第 5 页（公式 + 图表）
  for (let i = 1; i < TOTAL_SLIDES - 1; i++) {
    await page.click('button[title="下一页"]', { timeout: 5000 });
    await page.waitForTimeout(1200);
  }

  // 等待 mermaid SVG 异步渲染完成（最多 15s）
  const diagramOk = await page
    .waitForSelector('#el-diagram-1 svg', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  console.log('diagram svg rendered:', diagramOk);

  // KaTeX 输出会有 .katex 节点
  const formulaOk = await page
    .waitForSelector('#el-formula-1 .katex', { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  console.log('formula katex rendered:', formulaOk);

  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SHOTS_DIR, 'elements-formula-diagram.png') });
  console.log('saved shots/elements-formula-diagram.png');

  // 翻到第 6 页（音频 + 视频占位）
  await page.click('button[title="下一页"]', { timeout: 5000 });
  await page.waitForTimeout(1500);
  const audioVisible = await page.locator('#el-audio-1').isVisible().catch(() => false);
  const videoVisible = await page.locator('#el-video-1').isVisible().catch(() => false);
  console.log('audio element visible:', audioVisible, '| video element visible:', videoVisible);
  // 音频卡片：播放按钮 + 文件名应渲染（asset 已关联）
  const audioCardOk = await page
    .locator('#el-audio-1 button[aria-label="播放"]')
    .isVisible()
    .catch(() => false);
  const audioNameOk = await page
    .locator('#el-audio-1 >> text=示例提示音.wav')
    .isVisible()
    .catch(() => false);
  console.log('audio card play button:', audioCardOk, '| filename shown:', audioNameOk);
  // 视频占位：资源缺失提示应渲染
  const videoPlaceholderOk = await page
    .locator('#el-video-1 >> text=视频资源缺失')
    .isVisible()
    .catch(() => false);
  console.log('video placeholder shown:', videoPlaceholderOk);
  await page.screenshot({ path: path.join(SHOTS_DIR, 'elements-audio-video.png') });
  console.log('saved shots/elements-audio-video.png');

  await browser.close();

  if (consoleErrors.length > 0) {
    console.log('console errors:');
    consoleErrors.forEach((e) => console.log('  -', e.slice(0, 300)));
  }
  if (!diagramOk || !formulaOk || !audioVisible || !videoVisible || !audioCardOk || !audioNameOk || !videoPlaceholderOk) {
    console.error('VERIFICATION FAILED');
    process.exitCode = 1;
  } else {
    console.log('VERIFICATION PASSED');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
