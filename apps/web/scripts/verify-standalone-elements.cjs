/**
 * 一次性验证：dist-standalone/standalone-player.html 单文件构建中
 * katex / mermaid 均被打包且能离线渲染（formula/diagram/audio/video）。
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const standalonePath = path.resolve(__dirname, '..', 'dist-standalone', 'standalone-player.html');

// 通过本地 http 服务提供单文件（file:// 下 addInitScript 不生效）；
// 且 standalone HTML 内置 `window.__COURSEWARE__ = null`，需模拟导出流程直接替换注入数据。
function serveFile(filePath, courseware) {
  const html = fs
    .readFileSync(filePath, 'utf-8')
    .replace('window.__COURSEWARE__ = null;', `window.__COURSEWARE__ = ${JSON.stringify(courseware)};`);
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }));
  });
}

const courseware = {
  id: 'cw-standalone-check',
  version: '1.0',
  title: 'standalone 元素验证',
  topicDescription: '验证单文件构建中四种元素渲染',
  designSystem: {
    id: 'default',
    name: 'default',
    tokens: {
      colors: { primary: '#2563eb', background: '#ffffff', text: '#1e293b' },
      fonts: { heading: 'sans-serif', body: 'sans-serif' },
      fontSizes: { base: 16 },
      spacing: { md: 16 },
      borderRadius: { md: 8 },
    },
  },
  slides: [
    {
      id: 's1',
      order: 0,
      title: 'formula+diagram',
      layout: { templateId: 'content', variant: 'default', constraints: [] },
      elements: [
        {
          id: 'f1',
          type: 'formula',
          geometry: { x: 100, y: 100, width: 600, height: 200, zIndex: 1 },
          content: { latex: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}', displayMode: true },
        },
        {
          id: 'd1',
          type: 'diagram',
          geometry: { x: 100, y: 340, width: 600, height: 300, zIndex: 1 },
          content: { type: 'mermaid', definition: 'flowchart TD\n A[开始] --> B[结束]' },
        },
      ],
    },
    {
      id: 's2',
      order: 1,
      title: 'audio+video',
      layout: { templateId: 'content', variant: 'default', constraints: [] },
      elements: [
        {
          id: 'a1',
          type: 'audio',
          geometry: { x: 100, y: 100, width: 500, height: 90, zIndex: 1 },
          content: { assetId: 'nope', autoPlay: false, loop: false },
        },
        {
          id: 'v1',
          type: 'video',
          geometry: { x: 100, y: 240, width: 480, height: 270, zIndex: 1 },
          content: { assetId: 'nope', autoPlay: false, loop: false, controls: true },
        },
      ],
    },
  ],
  assets: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function main() {
  const { server, url } = await serveFile(standalonePath, courseware);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);

  const formulaOk = await page.waitForSelector('#f1 .katex', { timeout: 15000 }).then(() => true).catch(() => false);
  const diagramOk = await page.waitForSelector('#d1 svg', { timeout: 20000 }).then(() => true).catch(() => false);
  console.log('standalone formula rendered:', formulaOk);
  console.log('standalone diagram svg rendered:', diagramOk);

  await page.click('button[title="下一页"]', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const audioOk = await page.locator('#a1').isVisible().catch(() => false);
  const videoOk = await page.locator('#v1 >> text=视频资源缺失').isVisible().catch(() => false);
  console.log('standalone audio element visible:', audioOk, '| video placeholder:', videoOk);

  await browser.close();
  server.close();
  if (errors.length) {
    console.log('page errors:');
    errors.forEach((e) => console.log('  -', e.slice(0, 300)));
  }
  if (formulaOk && diagramOk && audioOk && videoOk) {
    console.log('STANDALONE VERIFICATION PASSED');
  } else {
    console.error('STANDALONE VERIFICATION FAILED');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
