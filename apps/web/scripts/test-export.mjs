import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import JSZip from 'jszip';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

async function createTestPackage(courseware) {
  const zip = new JSZip();
  zip.file('courseware.json', JSON.stringify(courseware));
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const tmpPath = path.join(os.tmpdir(), `test-import-${Date.now()}.courseware.zip`);
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
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
    // 1. Open editor
    console.log('1. Opening editor...');
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForSelector('text=页面属性', { timeout: 5000 });
    console.log('   ✅ Editor loaded');

    // 2. Export .courseware package
    console.log('2. Exporting .courseware package...');
    const [packageDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button[title="导出 .courseware 项目包"]'),
    ]);
    const packagePath = await packageDownload.path();
    if (!packagePath || !fs.existsSync(packagePath)) {
      throw new Error('.courseware package download failed');
    }
    const packageStats = fs.statSync(packagePath);
    if (packageStats.size === 0) {
      throw new Error('.courseware package is empty');
    }
    console.log(`   ✅ .courseware package downloaded (${packageStats.size} bytes)`);

    // 3. Import .courseware package
    console.log('3. Importing .courseware package...');
    const testCourseware = {
      id: 'cw-import-test',
      version: '1.0',
      title: '导入测试课件',
      topicDescription: '用于测试导入功能',
      designSystem: {
        id: 'default',
        name: '默认风格',
        tokens: {
          colors: { primary: '#2563eb', background: '#ffffff', text: '#1e293b' },
          fonts: { heading: 'sans-serif', body: 'sans-serif', mono: 'monospace' },
          fontSizes: { xs: 12, sm: 14, base: 16, lg: 18, xl: 24 },
          spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
          borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
        },
      },
      slides: [
        {
          id: 'slide-import-1',
          order: 0,
          title: '导入测试',
          layout: { templateId: 'title', variant: 'center', constraints: [] },
          background: { color: '#f8fafc' },
          elements: [
            {
              id: 'el-import-1',
              type: 'text',
              semanticRole: 'title',
              geometry: { x: 240, y: 300, width: 800, height: 100, zIndex: 1 },
              content: { text: '导入成功' },
              style: { color: '#1e293b', fontSize: 48, textAlign: 'center' },
              animation: { entrance: [], exit: [] },
              interactions: [],
            },
          ],
          transition: { type: 'fade', duration: 0.5, easing: 'power2.out' },
          timeline: { autoPlay: true },
        },
      ],
      assets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const importPath = await createTestPackage(testCourseware);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(importPath);
    await page.waitForTimeout(1000);

    const titleVisible = await page.locator('text=导入测试课件').first().isVisible();
    if (!titleVisible) {
      throw new Error('Imported courseware title not shown');
    }
    console.log('   ✅ .courseware package imported');

    // 4. Export HTML package
    console.log('4. Exporting standalone HTML package...');
    const [htmlDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button[title="导出独立 HTML 播放包"]'),
    ]);
    const htmlPath = await htmlDownload.path();
    if (!htmlPath || !fs.existsSync(htmlPath)) {
      throw new Error('HTML package download failed');
    }
    const htmlStats = fs.statSync(htmlPath);
    if (htmlStats.size === 0) {
      throw new Error('HTML package is empty');
    }
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    if (!htmlContent.includes('window.__COURSEWARE__')) {
      throw new Error('HTML package does not contain courseware data injection');
    }
    if (!htmlContent.includes('导入测试课件')) {
      throw new Error('HTML package does not contain imported courseware data');
    }
    console.log(`   ✅ HTML package downloaded (${htmlStats.size} bytes)`);

    // 5. Verify exported HTML can be opened and rendered
    console.log('5. Verifying standalone HTML playback...');
    const htmlPage = await context.newPage();
    await htmlPage.goto(`file://${htmlPath}`);
    await htmlPage.waitForSelector('text=导入测试课件', { timeout: 10000 });
    console.log('   ✅ Standalone HTML rendered correctly');
    await htmlPage.close();

    // 6. Verify backend CRUD
    console.log('6. Verifying backend courseware CRUD...');
    const listResponse = await page.evaluate(async () => {
      const res = await fetch('/api/courseware');
      return { status: res.status, body: await res.json() };
    });
    if (listResponse.status !== 200) {
      throw new Error(`Courseware list API failed: ${listResponse.status}`);
    }
    console.log(`   ✅ Courseware list API returned ${listResponse.body.length} items`);

    // 7. Check for errors
    if (errors.length > 0) {
      throw new Error(`Encountered ${errors.length} browser errors`);
    }

    console.log('\n✅ All export tests passed!');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTests();
