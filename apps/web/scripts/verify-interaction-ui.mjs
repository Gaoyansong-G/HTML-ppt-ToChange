import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const now = '2026-01-01T00:00:00.000Z';

const designSystem = {
  id: 'default',
  name: '测试主题',
  tokens: {
    colors: {
      primary: '#2563eb',
      secondary: '#7c3aed',
      accent: '#f59e0b',
      success: '#16a34a',
      warning: '#f59e0b',
      danger: '#dc2626',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#cbd5e1',
    },
    fonts: {
      heading: 'sans-serif',
      body: 'sans-serif',
      mono: 'monospace',
    },
    fontSizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 24,
      '2xl': 32,
      '3xl': 40,
      '4xl': 56,
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 },
    borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    shadows: {
      sm: '0 1px 2px rgba(15, 23, 42, 0.08)',
      md: '0 8px 20px rgba(15, 23, 42, 0.12)',
      lg: '0 16px 32px rgba(15, 23, 42, 0.16)',
    },
  },
};

const baseElement = (id, type, geometry, content, extra = {}) => ({
  id,
  type,
  geometry,
  content,
  style: {},
  animation: { entrance: [], exit: [] },
  interactions: [],
  ...extra,
});

const courseware = {
  id: 'e2e-interactions',
  version: '1.0',
  revision: 1,
  title: '课堂互动浏览器回归',
  topicDescription: '验证互动控件与完成联动',
  gradeLevel: 'primary',
  designSystem,
  slides: [
    {
      id: 'interaction-slide',
      order: 0,
      title: '互动回归',
      layout: { templateId: 'blank', variant: 'default', constraints: [] },
      background: { color: '#ffffff' },
      elements: [
        baseElement(
          'categorize-interactive',
          'interactive',
          { x: 20, y: 40, width: 600, height: 540, zIndex: 1 },
          {
            interactiveType: 'categorize',
            config: {
              title: '给卡片分类',
              categories: [
                { id: 'fruit', name: '水果', color: '#2563eb' },
                { id: 'animal', name: '动物', color: '#7c3aed' },
              ],
              items: [
                { id: 'apple', text: '苹果', categoryId: 'fruit' },
                { id: 'dog', text: '小狗', categoryId: 'animal' },
              ],
            },
          },
          {
            interactions: [
              {
                id: 'categorize-complete',
                trigger: 'interactive-complete',
                actions: [
                  {
                    id: 'show-categorize-success',
                    type: 'show',
                    targetId: 'categorize-success',
                  },
                ],
              },
            ],
          },
        ),
        baseElement(
          'scoreboard-interactive',
          'interactive',
          { x: 660, y: 40, width: 600, height: 540, zIndex: 1 },
          {
            interactiveType: 'scoreboard',
            config: {
              title: '小组计分',
              teams: [
                { id: 'team-1', name: '第一组', color: '#2563eb' },
                { id: 'team-2', name: '第二组', color: '#7c3aed' },
              ],
            },
          },
          {
            interactions: [
              {
                id: 'scoreboard-complete',
                trigger: 'interactive-complete',
                actions: [
                  {
                    id: 'show-scoreboard-success',
                    type: 'show',
                    targetId: 'scoreboard-success',
                  },
                ],
              },
            ],
          },
        ),
        baseElement(
          'categorize-success',
          'text',
          { x: 100, y: 620, width: 440, height: 50, zIndex: 5 },
          { text: '分类完成联动成功' },
          {
            initiallyHidden: true,
            style: {
              color: '#16a34a',
              fontSize: 24,
              fontWeight: 700,
              textAlign: 'center',
            },
          },
        ),
        baseElement(
          'scoreboard-success',
          'text',
          { x: 740, y: 620, width: 440, height: 50, zIndex: 5 },
          { text: '计分完成联动成功' },
          {
            initiallyHidden: true,
            style: {
              color: '#16a34a',
              fontSize: 24,
              fontWeight: 700,
              textAlign: 'center',
            },
          },
        ),
      ],
      transition: { type: 'fade', duration: 0.1 },
      timeline: { autoPlay: true },
    },
  ],
  assets: [],
  createdAt: now,
  updatedAt: now,
};

const vite = await createServer({
  root,
  logLevel: 'silent',
  server: { host: '127.0.0.1', port: 0 },
});

let browser;
try {
  await vite.listen();
  const address = vite.httpServer?.address();
  assert.ok(address && typeof address === 'object');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.route(
    'http://localhost:3001/api/courseware/e2e-interactions',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify(courseware),
      });
    },
  );

  await page.goto(
    `http://127.0.0.1:${address.port}/courseware/e2e-interactions/present`,
    { waitUntil: 'networkidle' },
  );

  await page.getByText('课堂互动浏览器回归', { exact: true }).waitFor();
  assert.equal(await page.locator('#categorize-interactive').evaluate((node) => node.tagName), 'DIV');
  assert.equal(await page.locator('#scoreboard-interactive').evaluate((node) => node.tagName), 'DIV');

  const categorizeSuccess = page.getByText('分类完成联动成功', { exact: true });
  const scoreboardSuccess = page.getByText('计分完成联动成功', { exact: true });
  assert.equal(await categorizeSuccess.isVisible(), false);
  assert.equal(await scoreboardSuccess.isVisible(), false);

  const apple = page.getByRole('button', { name: '选择卡片：苹果' });
  await apple.tap();
  assert.equal(await apple.getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: '将“苹果”放入分类“动物”' }).tap();
  await page.getByText('分类不正确，请再试一次', { exact: true }).waitFor();
  assert.equal(
    await apple.getAttribute('aria-pressed'),
    'true',
    'a wrong basket should keep the card selected for another attempt',
  );
  await page.getByRole('button', { name: '将“苹果”放入分类“水果”' }).tap();
  await apple.waitFor({ state: 'detached' });

  const dog = page.getByRole('button', { name: '选择卡片：小狗' });
  await dog.focus();
  await dog.press('Enter');
  assert.equal(await dog.getAttribute('aria-pressed'), 'true');
  const animalBasket = page.getByRole('button', {
    name: '将“小狗”放入分类“动物”',
  });
  await animalBasket.focus();
  await animalBasket.press('Enter');

  await page.getByText('全部分类正确！', { exact: true }).waitFor();
  await categorizeSuccess.waitFor({ state: 'visible' });

  await page.getByRole('button', { name: '第一组 加一分' }).tap();
  const finishScoreboard = page.getByRole('button', { name: '结束计分' });
  assert.equal(await finishScoreboard.isEnabled(), true);
  await finishScoreboard.tap();
  await page.getByRole('status').getByText('🏆 第一组 获胜', { exact: true }).waitFor();
  await scoreboardSuccess.waitFor({ state: 'visible' });

  assert.deepEqual(
    pageErrors.map((error) => error.message),
    [],
    'the browser interaction flow must not produce uncaught errors',
  );

  await context.close();
  process.stdout.write('interaction browser UI checks passed\n');
} finally {
  await browser?.close();
  await vite.close();
}
