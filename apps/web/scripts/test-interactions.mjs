import { chromium } from 'playwright';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

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
    // 1. Visit player directly
    console.log('1. Visiting player...');
    await page.goto(`${BASE_URL}/player`);
    await page.waitForSelector('text=北京的春节', { timeout: 5000 });
    console.log('   ✅ Player loaded');

    await page.waitForTimeout(1000);

    // 2. Navigate to slide 3 (single-choice quiz)
    console.log('2. Navigating to quiz slide...');
    await page.click('button[title="下一页"]');
    await page.waitForTimeout(800);
    await page.click('button[title="下一页"]');
    await page.waitForTimeout(800);

    await page.waitForSelector('text=选择题：春节习俗', { timeout: 5000 });
    console.log('   ✅ Quiz slide loaded');

    // 3. Select wrong answer, submit, check incorrect
    console.log('3. Testing single-choice quiz flow...');
    await page.waitForSelector('text=正月初一', { timeout: 5000 });
    await page.locator('#el-quiz-1 button:has-text("正月初一")').first().evaluate((el) => el.click());
    await page.waitForTimeout(300);
    await page.locator('#el-quiz-1 button:has-text("提交答案")').first().evaluate((el) => el.click());
    await page.waitForTimeout(300);

    const incorrectVisible = await page.locator('text=❌ 回答错误').first().isVisible();
    if (!incorrectVisible) {
      throw new Error('Incorrect answer feedback not shown');
    }
    console.log('   ✅ Wrong answer judged as incorrect');

    // Retry and select correct answer
    await page.locator('#el-quiz-1 button:has-text("重试")').first().evaluate((el) => el.click());
    await page.waitForTimeout(300);
    await page.locator('#el-quiz-1 button:has-text("腊月的初旬")').first().evaluate((el) => el.click());
    await page.locator('#el-quiz-1 button:has-text("提交答案")').first().evaluate((el) => el.click());
    await page.waitForTimeout(300);

    const correctVisible = await page.locator('text=✅ 回答正确').first().isVisible();
    if (!correctVisible) {
      throw new Error('Correct answer feedback not shown');
    }
    console.log('   ✅ Correct answer judged as correct');

    await page.locator('#el-quiz-1 button:has-text("查看解析")').first().evaluate((el) => el.click());
    await page.waitForTimeout(300);

    const explanationVisible = await page.locator('text=正确答案是 B').first().isVisible();
    if (!explanationVisible) {
      throw new Error('Explanation not shown');
    }
    console.log('   ✅ Explanation shown');

    // 4. Navigate to slide 4 (fill-blank)
    console.log('4. Navigating to fill-blank slide...');
    await page.click('button[title="下一页"]');
    await page.waitForTimeout(800);

    await page.waitForSelector('text=填空题：最冷的时候', { timeout: 5000 });
    console.log('   ✅ Fill-blank slide loaded');

    // 5. Test fill-blank flow
    console.log('5. Testing fill-blank flow...');
    await page.waitForSelector('text=“腊七腊八，冻死', { timeout: 5000 });

    await page.locator('#el-fill-1 input[type="text"]').first().fill('寒鸦');
    await page.locator('#el-fill-1 button:has-text("提交")').first().evaluate((el) => el.click());
    await page.waitForTimeout(300);

    const fillCorrectVisible = await page.locator('text=✅ 回答正确').first().isVisible();
    if (!fillCorrectVisible) {
      throw new Error('Fill-blank correct feedback not shown');
    }
    console.log('   ✅ Fill-blank correct answer judged');

    // 6. Test AI assistant on quiz slide
    console.log('6. Testing AI assistant chat...');
    await page.click('button[title="上一页"]');
    await page.waitForTimeout(800);
    await page.waitForSelector('text=选择题：春节习俗', { timeout: 5000 });

    await page.locator('button').filter({ hasText: 'AI 助手' }).first().evaluate((el) => el.click());
    await page.waitForSelector('text=我是本页 AI 助手', { timeout: 5000 });
    console.log('   ✅ AI assistant opened with welcome message');

    await page.locator('input[placeholder="输入问题..."]').first().fill('这道题怎么做？');
    await page.locator('input[placeholder="输入问题..."]').first().press('Enter');
    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid="assistant-message"]').length >= 2;
    }, { timeout: 120000 });

    const responseText = await page.locator('[data-testid="assistant-message"]').last().innerText();
    if (responseText.includes('演示模式') || responseText.includes('模拟回答') || responseText.includes('我收到了你的问题')) {
      throw new Error('AI assistant returned mock response: ' + responseText);
    }
    if (responseText.trim().length < 5) {
      throw new Error('AI assistant response is too short: ' + responseText);
    }
    console.log('   ✅ AI assistant responded with real answer');

    // 7. Test interaction editor
    console.log('7. Testing interaction editor...');
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForSelector('text=页面属性', { timeout: 5000 });

    // Select the title element on the first slide
    const titleEl = page.locator('text=北京的春节').last();
    const box = await titleEl.boundingBox();
    if (!box) throw new Error('Title element not found on canvas');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    // Switch to 交互 tab
    const interactionTab = page.locator('button:has-text("交互")').last();
    await interactionTab.click();
    await page.waitForTimeout(200);

    const interactionTabVisible = await page.locator('button:has-text("交互")').first().isVisible();
    if (!interactionTabVisible) {
      throw new Error('Interaction tab not found in property panel');
    }
    console.log('   ✅ Interaction editor section visible');

    await page.locator('button').filter({ hasText: '+ 添加交互' }).first().evaluate((el) => el.click());
    await page.waitForTimeout(300);

    const triggerSelectVisible = await page.locator('select').first().isVisible();
    if (!triggerSelectVisible) {
      throw new Error('Interaction trigger select not rendered');
    }
    console.log('   ✅ New interaction added in editor');

    // 8. Check for errors
    if (errors.length > 0) {
      throw new Error(`Encountered ${errors.length} browser errors`);
    }

    console.log('\n✅ All interaction tests passed!');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTests();
