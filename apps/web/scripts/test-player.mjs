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

  try {
    // 1. Visit home page
    console.log('1. Visiting home page...');
    await page.goto(`${BASE_URL}/`);
    await page.waitForSelector('text=播放示例课件');
    console.log('   ✅ Home page loaded with play button');

    // 2. Navigate to player
    console.log('2. Navigating to player...');
    await page.click('text=播放示例课件');
    await page.waitForURL('**/player');
    console.log('   ✅ Navigated to /player');

    // 3. Verify first slide
    console.log('3. Verifying first slide...');
    await page.waitForSelector('text=北京的春节', { timeout: 5000 });
    const title = await page.locator('text=北京的春节').first().textContent();
    console.log(`   ✅ First slide title: ${title}`);

    // Wait for entrance animations
    await page.waitForTimeout(1500);

    // 4. Navigate to next slide
    console.log('4. Navigating to next slide...');
    await page.click('button[title="下一页"]');
    await page.waitForTimeout(1000);

    await page.waitForSelector('text=春节从什么时候开始？', { timeout: 5000 });
    console.log('   ✅ Second slide loaded');

    // 5. Click reveal answer
    console.log('5. Clicking reveal answer...');
    await page.waitForSelector('text=点击查看答案', { timeout: 5000 });
    await page.click('text=点击查看答案');
    await page.waitForTimeout(500);

    const answerVisible = await page.locator('#el-answer').isVisible();
    if (answerVisible) {
      console.log('   ✅ Answer revealed');
    } else {
      throw new Error('Answer not revealed after click');
    }

    // 6. Check for errors
    if (errors.length > 0) {
      throw new Error(`Encountered ${errors.length} browser errors`);
    }

    console.log('\n✅ All player tests passed!');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTests();
