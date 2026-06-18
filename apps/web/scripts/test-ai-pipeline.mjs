import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const API_BASE = 'http://localhost:3001/api';

async function runTests() {
  // Create a temporary markdown file for upload
  const testFilePath = resolve('./test-source.md');
  const testContent = `# 人工智能简介

## 什么是人工智能

人工智能（AI）是指由人制造出来的系统所表现出来的智能。

## 人工智能的应用

人工智能在医疗、教育、交通等领域有广泛应用。

## 机器学习

机器学习是人工智能的一个分支，通过数据训练模型。

## 深度学习

深度学习使用神经网络模拟人脑的工作方式。

## 课堂小结

本节课介绍了人工智能的基本概念和应用。`;

  writeFileSync(testFilePath, testContent);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
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
    // 1. Backend: upload document
    console.log('1. Uploading document to backend...');
    const uploadResponse = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: createFormData(testFilePath),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Document upload failed: ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log(`   ✅ Document uploaded: ${uploadResult.id}`);

    // 2. Backend: generate outline
    console.log('2. Generating outline via backend...');
    const outlineResponse = await fetch(`${API_BASE}/ai/outline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: uploadResult.id,
        description: '生成 5 页人工智能入门课件',
        options: { includeQuiz: true },
      }),
    });

    if (!outlineResponse.ok) {
      throw new Error(`Outline generation failed: ${outlineResponse.statusText}`);
    }

    const outlineResult = await outlineResponse.json();
    if (!outlineResult.outline || !outlineResult.outline.slides?.length) {
      throw new Error('Backend outline is empty');
    }
    console.log(`   ✅ Outline generated: ${outlineResult.outline.slides.length} slides`);

    // 3. Frontend: visit wizard
    console.log('3. Visiting AI wizard...');
    await page.goto(`${BASE_URL}/wizard`);
    await page.waitForSelector('text=AI 课件生成向导');
    console.log('   ✅ Wizard loaded');

    // 4. Upload file via wizard
    console.log('4. Uploading file in wizard...');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    await page.click('text=下一步');
    await page.waitForTimeout(1000);

    const step2Visible = await page.locator('text=描述课件范围').isVisible();
    if (!step2Visible) {
      throw new Error('Wizard did not proceed to step 2');
    }
    console.log('   ✅ Wizard proceeded to step 2');

    // 5. Describe and generate
    console.log('5. Describing and generating...');
    await page.fill('textarea', '生成 5 页人工智能入门课件');
    await page.click('text=生成大纲');
    await page.waitForSelector('text=确认课件大纲', { timeout: 300000 });
    await page.click('text=确认并生成课件');
    await page.locator('text=课件生成完成！').waitFor({ timeout: 600000 });
    console.log('   ✅ Wizard completed generation');

    // 6. Preview player should show generated courseware, not example
    console.log('6. Previewing generated courseware...');
    await page.locator('button:has-text("预览播放")').click();
    await page.waitForURL('**/player', { timeout: 30000 });
    await page.waitForSelector('text=人工智能', { timeout: 10000 });
    const beijingTitleVisible = await page.locator('text=北京的春节').first().isVisible().catch(() => false);
    if (beijingTitleVisible) {
      throw new Error('Player still shows example courseware instead of generated courseware');
    }
    console.log('   ✅ Player preview shows generated courseware');

    // 7. Navigate to editor
    console.log('7. Navigating to editor...');
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForSelector('text=页面属性', { timeout: 30000 });
    console.log('   ✅ Entered editor with generated courseware');

    // 8. Check for errors
    if (errors.length > 0) {
      throw new Error(`Encountered ${errors.length} browser errors`);
    }

    console.log('\n✅ All AI pipeline tests passed!');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

function createFormData(filePath) {
  const form = new FormData();
  const blob = new Blob([readFileSync(filePath)], { type: 'text/markdown' });
  form.append('file', blob, 'test-source.md');
  return form;
}

runTests();
