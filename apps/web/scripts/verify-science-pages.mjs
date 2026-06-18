import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const API_BASE = 'http://localhost:3001/api';

const testContent = `# 水的三态变化

## 物态变化

物质常见的三种状态是固态、液态和气态。
水在自然界中以冰、水和水蒸气的形式存在。

## 熔化与凝固

物质从固态变成液态的过程叫做熔化，从液态变成固态的过程叫做凝固。
例如：冰受热熔化成水；水放热凝固成冰。

## 汽化与液化

物质从液态变成气态的过程叫做汽化，从气态变成液态的过程叫做液化。
蒸发和沸腾是汽化的两种方式。
例如：湿衣服晾干是蒸发；水烧开是沸腾。

## 升华与凝华

物质从固态直接变成气态的过程叫做升华，从气态直接变成固态的过程叫做凝华。
例如：樟脑丸变小是升华；霜的形成是凝华。

## 实验探究

器材：烧杯、酒精灯、铁架台、温度计、冰块。
步骤：
1. 将碎冰放入烧杯中，用温度计测量温度。
2. 用酒精灯加热，观察冰熔化成水的过程。
3. 继续加热，观察水沸腾的现象。
4. 记录不同阶段的温度变化。

结论：冰在 0℃ 时熔化成水；水在 100℃ 时沸腾变成水蒸气。`;

const testFilePath = resolve('./test-science.md');
writeFileSync(testFilePath, testContent);

async function upload() {
  const form = new FormData();
  form.append('file', new Blob([testContent], { type: 'text/markdown' }), '水的三态变化.md');
  const res = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

const EXPECTED_PAGES = 8;
const SUBJECT_LAYOUTS = new Set(['experiment', 'data-chart', 'steps']);

async function main() {
  console.log('1. Uploading science test document...');
  const doc = await upload();
  console.log(`   ✅ Uploaded: ${doc.id}`);

  console.log(`2. Generating ${EXPECTED_PAGES}-page science courseware (real LLM)...`);
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20 * 60 * 1000);
  try {
    const res = await fetch(`${API_BASE}/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        documentId: doc.id,
        description: `生成${EXPECTED_PAGES}页小学科学《水的三态变化》课件，包含物态变化、熔化凝固、汽化液化、升华凝华、实验探究和结论`,
        options: { includeQuiz: true, pageCount: EXPECTED_PAGES },
      }),
    });
    clearTimeout(timeout);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Generate failed (${res.status}): ${text}`);
    }
    const result = await res.json();
    const slides = result.courseware?.slides || [];
    console.log(`   ✅ Generated in ${elapsed}s: ${slides.length} slides`);

    const images = slides.flatMap((s) => s.elements.filter((e) => e.type === 'image').length);
    const totalImages = images.reduce((a, b) => a + b, 0);
    const shapes = slides.flatMap((s) => s.elements.filter((e) => e.type === 'shape').length);
    const totalShapes = shapes.reduce((a, b) => a + b, 0);
    const quizSlides = slides.filter((s) => s.elements.some((e) => e.type === 'quiz')).length;
    const subjectLayouts = slides.filter((s) => SUBJECT_LAYOUTS.has(s.layout?.templateId)).length;

    console.log('3. Validation:');
    console.log(`   - slides: ${slides.length} (expected ${EXPECTED_PAGES})`);
    console.log(`   - images: ${totalImages}`);
    console.log(`   - shapes: ${totalShapes}`);
    console.log(`   - quiz slides: ${quizSlides}`);
    console.log(`   - science layouts: ${subjectLayouts}`);

    if (slides.length !== EXPECTED_PAGES) {
      throw new Error(`Expected ${EXPECTED_PAGES} slides, got ${slides.length}`);
    }
    if (totalImages === 0) {
      throw new Error('No images found across slides');
    }
    if (quizSlides === 0) {
      throw new Error('No quiz slides found');
    }
    if (subjectLayouts === 0) {
      throw new Error('No science-specific layouts (experiment/data-chart/steps) found');
    }
    console.log('\n✅ Science courseware verification passed!');
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  } finally {
    try { unlinkSync(testFilePath); } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ Science verification failed:', err.message);
  process.exitCode = 1;
});
