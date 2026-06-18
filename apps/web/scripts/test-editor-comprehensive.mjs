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
  const countOverlays = () => page.locator('[data-testid="element-overlay"]').count();

  try {
    console.log('1. Load editor');
    await page.goto(`${BASE_URL}/editor`);
    await page.waitForSelector('text=页面属性');
    console.log('   ✅ Editor loaded');

    console.log('2. Add shape via toolbar');
    const initialOverlays = await countOverlays();
    await page.click('button[title="矩形"]');
    await page.waitForTimeout(300);
    const afterShape = await countOverlays();
    if (afterShape !== initialOverlays + 1) throw new Error(`Shape not added: ${afterShape}`);
    console.log('   ✅ Shape added');

    console.log('3. Drag shape');
    const shapeOverlay = page.locator('[data-testid="element-overlay"]').last();
    const box1 = await shapeOverlay.boundingBox();
    if (!box1) throw new Error('Shape overlay not found');
    const dragStartBox = { ...box1 };
    await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
    await page.mouse.down();
    await page.mouse.move(box1.x + box1.width / 2 + 50, box1.y + box1.height / 2 + 30, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const dragEndBox = await page.locator('[data-testid="element-overlay"]').last().boundingBox();
    console.log('   ✅ Shape dragged');

    console.log('3b. Undo / redo drag');
    await page.click('button[title="撤销 (Ctrl+Z)"]');
    await page.waitForTimeout(300);
    const undoBox = await page.locator('[data-testid="element-overlay"]').last().boundingBox();
    const undoCount = await countOverlays();
    if (undoCount !== initialOverlays + 1) throw new Error(`Undo drag changed element count: ${undoCount}`);
    if (!undoBox || undoBox.x !== dragStartBox.x || undoBox.y !== dragStartBox.y) throw new Error('Undo did not restore shape position');
    await page.click('button[title="重做 (Ctrl+Shift+Z)"]');
    await page.waitForTimeout(300);
    const redoBox = await page.locator('[data-testid="element-overlay"]').last().boundingBox();
    const redoCount = await countOverlays();
    if (redoCount !== initialOverlays + 1) throw new Error(`Redo drag changed element count: ${redoCount}`);
    if (!redoBox || redoBox.x !== dragEndBox.x || redoBox.y !== dragEndBox.y) throw new Error('Redo did not restore dragged position');
    console.log('   ✅ Drag undo/redo works');

    console.log('3c. Edit animation timeline');
    await page.locator('[data-testid="element-overlay"]').last().click({ force: true });
    await page.waitForTimeout(200);
    const animSelect = page.locator('[data-testid="animation-type-select"]').first();
    await animSelect.waitFor({ state: 'visible', timeout: 2000 });
    await animSelect.selectOption('slide-up');
    await page.waitForTimeout(200);
    const animValue = await animSelect.inputValue();
    if (animValue !== 'slide-up') throw new Error(`Animation type not updated: ${animValue}`);
    console.log('   ✅ Animation timeline editable');

    console.log('4. Resize shape');
    const resizedOverlay = page.locator('[data-testid="element-overlay"]').last();
    const box2 = await resizedOverlay.boundingBox();
    if (!box2) throw new Error('Resized overlay not found');
    // Bottom-right handle at element right/bottom minus 4 offset, 8px handle
    const handleX = box2.x + box2.width - 4 + 4;
    const handleY = box2.y + box2.height - 4 + 4;
    await page.mouse.move(handleX, handleY);
    await page.mouse.down();
    await page.mouse.move(handleX + 40, handleY + 30, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    console.log('   ✅ Shape resized');

    console.log('5. Rotate shape');
    const rotatedOverlay = page.locator('[data-testid="element-overlay"]').last();
    const box3 = await rotatedOverlay.boundingBox();
    if (!box3) throw new Error('Overlay not found for rotate');
    // Rotate handle is centered top, 40px above element
    const rotateX = box3.x + box3.width / 2;
    const rotateY = box3.y - 40 + 6;
    await page.mouse.move(rotateX, rotateY);
    await page.mouse.down();
    await page.mouse.move(rotateX + 30, rotateY + 20, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    console.log('   ✅ Shape rotated');

    console.log('6. Duplicate via floating toolbar');
    const beforeDup = await countOverlays();
    await page.click('button[title="复制"]');
    await page.waitForTimeout(300);
    const afterDup = await countOverlays();
    if (afterDup !== beforeDup + 1) throw new Error(`Duplicate failed: ${afterDup}`);
    console.log('   ✅ Shape duplicated');

    console.log('7. Add text and inline edit');
    await page.click('button[title="文本"]');
    await page.waitForTimeout(300);
    const textOverlay = page.locator('[data-testid="element-overlay"]').last();
    await textOverlay.dblclick();
    await page.waitForSelector('[data-testid="inline-text-editor"]');
    await page.locator('[data-testid="inline-text-editor"]').first().fill('编辑测试文本');
    await page.keyboard.down('Control');
    await page.keyboard.press('Enter');
    await page.keyboard.up('Control');
    await page.waitForTimeout(300);
    const updated = await page.locator('text=编辑测试文本').first().isVisible();
    if (!updated) throw new Error('Inline text edit not committed');
    console.log('   ✅ Text inline edited');

    console.log('8. Multi-select and group');
    const overlays = page.locator('[data-testid="element-overlay"]');
    const beforeGroupCount = await overlays.count();
    console.log(`   before group overlays: ${beforeGroupCount}`);
    if (beforeGroupCount < 2) throw new Error(`Not enough elements to group: ${beforeGroupCount}`);
    // Text element is already selected (last overlay). Ctrl+click the title (first overlay) to multi-select.
    const second = overlays.nth(0);
    await second.click({ force: true, modifiers: ['Control'] });
    await page.waitForTimeout(300);
    const multiPanel = await page.locator('text=已选择').first().isVisible().catch(() => false);
    if (!multiPanel) throw new Error('Multi-selection panel not shown');
    // Use the property panel "组合" button
    const groupBtn = page.locator('button:has-text("组合")').first();
    await groupBtn.click();
    await page.waitForTimeout(300);
    const afterGroupCount = await overlays.count();
    console.log(`   after group overlays: ${afterGroupCount}`);
    if (afterGroupCount !== beforeGroupCount - 1) throw new Error(`Grouping failed: ${afterGroupCount}`);
    console.log('   ✅ Elements grouped');

    console.log('9. Ungroup');
    const groupOverlay = overlays.last();
    await groupOverlay.click({ force: true });
    await page.waitForTimeout(200);
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('g');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    await page.waitForTimeout(300);
    const ungroupCount = await overlays.count();
    if (ungroupCount !== beforeGroupCount) throw new Error(`Ungroup failed: ${ungroupCount}`);
    console.log('   ✅ Group ungrouped');

    console.log('10. Add slide via template picker');
    const initialSlideCount = await countSlides();
    const addSlideBtn = page.locator('button[title="新增页面"]').first();
    await addSlideBtn.scrollIntoViewIfNeeded();
    await addSlideBtn.click();
    await page.waitForSelector('[data-testid="template-title"]');
    await page.click('[data-testid="template-title"]');
    await page.waitForTimeout(300);
    const afterSlideCount = await countSlides();
    if (afterSlideCount !== initialSlideCount + 1) throw new Error(`Slide not added: ${afterSlideCount}`);
    console.log('   ✅ Slide added from template');

    console.log('11. Undo / redo slide addition');
    await page.click('button[title="撤销 (Ctrl+Z)"]');
    await page.waitForTimeout(300);
    const undoSlideCount = await countSlides();
    if (undoSlideCount !== initialSlideCount) throw new Error(`Undo failed: ${undoSlideCount}`);
    await page.click('button[title="重做 (Ctrl+Shift+Z)"]');
    await page.waitForTimeout(300);
    const redoSlideCount = await countSlides();
    if (redoSlideCount !== initialSlideCount + 1) throw new Error(`Redo failed: ${redoSlideCount}`);
    console.log('   ✅ Undo/redo works');

    console.log('12. Change geometry via property panel');
    const propOverlay = overlays.first();
    await propOverlay.click({ force: true });
    const xInput = page.locator('label:has-text("X") + input[type="number"]');
    await xInput.waitFor({ state: 'visible', timeout: 2000 });
    const originalPropBox = await propOverlay.boundingBox();
    await xInput.fill('200');
    await xInput.blur();
    await page.waitForTimeout(200);
    const movedBox = await overlays.first().boundingBox();
    if (!movedBox || !originalPropBox || movedBox.x === originalPropBox.x) throw new Error('Geometry X did not update');
    console.log('   ✅ Geometry updated via property panel');

    console.log('13. Layer actions (bring to front / delete)');
    const beforeLayerCount = await countOverlays();
    await page.click('button[title="置顶 (Ctrl+])"]');
    await page.waitForTimeout(200);
    const afterFrontCount = await countOverlays();
    if (afterFrontCount !== beforeLayerCount) throw new Error('Bring to front changed overlay count');
    await page.click('button[title="删除 (Delete)"]');
    await page.waitForTimeout(200);
    const afterDeleteCount = await countOverlays();
    if (afterDeleteCount !== beforeLayerCount - 1) throw new Error(`Delete failed: ${afterDeleteCount}`);
    console.log('   ✅ Layer actions work');

    console.log('14. Context menu insert');
    const beforeContextCount = await countOverlays();
    await page.mouse.click(700, 400, { button: 'right' });
    await page.waitForSelector('.fixed:has-text("插入元素")');
    await page.locator('.fixed:has-text("插入元素") button:has-text("矩形")').click();
    await page.waitForTimeout(300);
    const afterContextCount = await countOverlays();
    if (afterContextCount !== beforeContextCount + 1) throw new Error(`Context insert failed: ${afterContextCount}`);
    console.log('   ✅ Context menu insert works');

    console.log('15. Zoom controls');
    const scaleTextBefore = await page.locator('.absolute.bottom-3.left-3 span').textContent();
    await page.click('button[title="放大 (Ctrl+滚轮向上)"]');
    await page.waitForTimeout(200);
    const scaleTextAfter = await page.locator('.absolute.bottom-3.left-3 span').textContent();
    if (scaleTextAfter === scaleTextBefore) throw new Error('Zoom did not change scale');
    console.log('   ✅ Zoom controls work');

    console.log('16. Quiz content editing');
    await page.click('button[title="单选题"]');
    await page.waitForTimeout(300);
    const quizOverlay = overlays.last();
    await quizOverlay.click({ force: true });
    await page.waitForTimeout(200);
    await page.click('text=内容');
    await page.waitForTimeout(200);
    await page.locator('[data-testid="quiz-question-input"]').fill('测试题目内容');
    // The default single-choice already has 3 options; change the first option text and mark second correct.
    const optionInputs = page.locator('[data-testid="quiz-option-text"]');
    await optionInputs.first().fill('选项一');
    await optionInputs.nth(1).fill('正确答案');
    // Mark second option correct by clicking its radio (second radio in quiz editor)
    await page.locator('input[type="radio"]').nth(1).click();
    await page.waitForTimeout(200);
    const quizQuestionVisible = await page.locator('text=测试题目内容').first().isVisible();
    if (!quizQuestionVisible) throw new Error('Quiz question not updated on canvas');
    console.log('   ✅ Quiz content edited');

    if (errors.length > 0) {
      throw new Error(`Encountered ${errors.length} browser errors`);
    }

    console.log('\n✅ All comprehensive editor tests passed!');
  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runTests();
