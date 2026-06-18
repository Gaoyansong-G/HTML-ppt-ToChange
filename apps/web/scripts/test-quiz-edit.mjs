import { chromium } from 'playwright';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

async function testQuizEdit(type, label) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  const countOverlays = () => page.locator('[data-testid="element-overlay"]').count();

  try {
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForSelector('text=页面属性');

    const before = await countOverlays();
    const btnTitle = type === 'single-choice' ? '单选题' : type === 'multiple-choice' ? '多选题' : '填空题';
    await page.click(`button[title="${btnTitle}"]`);
    await page.waitForTimeout(300);
    const afterAdd = await countOverlays();
    if (afterAdd !== before + 1) throw new Error(`${label} not added: ${afterAdd}`);

    await page.locator('[data-testid="element-overlay"]').last().click({ force: true });
    await page.waitForTimeout(200);
    await page.click('text=内容');
    await page.waitForTimeout(200);
    await page.locator('[data-testid="quiz-question-input"]').fill(`${label}测试题`);
    await page.waitForTimeout(300);

    if (type === 'multiple-choice') {
      const optionInputs = page.locator('[data-testid="quiz-option-text"]');
      await optionInputs.first().fill('多选选项A');
      await optionInputs.nth(1).fill('多选选项B');
      await page.locator('input[type="checkbox"]').first().check();
      await page.waitForTimeout(200);
    }
    if (type === 'fill-blank') {
      const answerInput = page.locator('label:has-text("正确答案") + input, label:has-text("揭示内容") + input').first();
      await answerInput.fill('填空答案');
      await page.waitForTimeout(200);
    }

    const visible = await page.locator(`text=${label}测试题`).first().isVisible();
    if (!visible) throw new Error(`${label} question not visible`);

    const finalCount = await countOverlays();
    if (finalCount !== afterAdd) throw new Error(`${label} card disappeared: ${finalCount}`);

    // Regression: pressing Backspace inside the question textarea should NOT delete the selected quiz card.
    await page.locator('[data-testid="quiz-question-input"]').focus();
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(200);
    const afterBackspaceCount = await countOverlays();
    if (afterBackspaceCount !== afterAdd) throw new Error(`${label} card deleted by Backspace in textarea: ${afterBackspaceCount}`);

    console.log(`✅ ${label} edit works`);
  } catch (err) {
    console.error(`❌ ${label} failed:`, err.message);
    if (errors.length) console.error('Browser errors:', errors);
  } finally {
    await browser.close();
  }
}

(async () => {
  await testQuizEdit('single-choice', '单选题');
  await testQuizEdit('multiple-choice', '多选题');
  await testQuizEdit('fill-blank', '填空题');
})();
