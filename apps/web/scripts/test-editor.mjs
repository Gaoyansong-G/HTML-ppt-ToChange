import { chromium } from 'playwright';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

async function runTests() {
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

  const countSlides = () => page.locator('[data-testid="slide-thumbnail"]').count();

  try {
    // 1. Visit editor
    console.log('1. Visiting editor...');
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForSelector('text=页面属性');
    console.log('   ✅ Editor loaded');

    // 2. Verify slides panel
    console.log('2. Verifying slides panel...');
    await page.waitForSelector('text=北京的春节');
    const slideCount = await countSlides();
    console.log(`   ✅ Slides panel shows ${slideCount} slides`);

    // 3. Select an element and edit text inline
    console.log('3. Selecting and editing text element inline...');
    const textOverlay = page
      .locator('[data-element-id]')
      .filter({ hasText: '老舍 · 小学六年级语文' })
      .locator('[data-testid="element-overlay"]')
      .first();
    await textOverlay.dblclick();
    await page.waitForSelector('[data-testid="inline-text-editor"]');

    const editor = page.locator('[data-testid="inline-text-editor"]').first();
    await editor.fill('老舍 · 六年级语文 · 编辑测试');
    // Blur to commit
    await page.mouse.click(100, 100);
    await page.waitForTimeout(300);

    const updatedText = await page.locator('text=编辑测试').first().isVisible();
    if (!updatedText) {
      throw new Error('Text content not updated on canvas');
    }
    console.log('   ✅ Text content updated via inline editor');

    // 4. Edit color
    console.log('4. Editing text color...');
    // Re-select the title element to ensure style controls are visible
    const titleOverlay = page
      .locator('[data-element-id]')
      .filter({ hasText: '北京的春节' })
      .locator('[data-testid="element-overlay"]')
      .first();
    await titleOverlay.click();
    await page.waitForTimeout(200);
    await page.click('text=外观');
    await page.waitForTimeout(200);
    const colorInput = page.locator('input[type="color"]').first();
    await colorInput.fill('#ff0000');
    await page.waitForTimeout(200);
    console.log('   ✅ Color changed');

    // 5. Add a new slide via template picker
    console.log('5. Adding new slide...');
    const initialSlideCount = await countSlides();
    await page.click('button[title="新增页面"]');
    await page.click('[data-testid="template-blank"]');
    await page.waitForTimeout(300);
    const newSlideCount = await countSlides();
    if (newSlideCount !== initialSlideCount + 1) {
      throw new Error(`Expected ${initialSlideCount + 1} slides, got ${newSlideCount}`);
    }
    console.log('   ✅ New slide added');

    // 6. Undo
    console.log('6. Undoing new slide...');
    await page.click('button[title="撤销 (Ctrl+Z)"]');
    await page.waitForTimeout(300);
    const undoSlideCount = await countSlides();
    if (undoSlideCount !== initialSlideCount) {
      throw new Error(`Undo failed: expected ${initialSlideCount}, got ${undoSlideCount}`);
    }
    console.log('   ✅ Undo works');

    // 7. Redo
    console.log('7. Redoing new slide...');
    await page.click('button[title="重做 (Ctrl+Shift+Z)"]');
    await page.waitForTimeout(300);
    const redoSlideCount = await countSlides();
    if (redoSlideCount !== initialSlideCount + 1) {
      throw new Error(`Redo failed: expected ${initialSlideCount + 1}, got ${redoSlideCount}`);
    }
    console.log('   ✅ Redo works');

    // 8. Check for errors
    if (errors.length > 0) {
      throw new Error(`Encountered ${errors.length} browser errors`);
    }

    console.log('\n✅ All editor tests passed!');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTests();
