import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const API_BASE = 'http://localhost:3001/api';

const testContent = `# 一元二次方程的解法

## 什么是一元二次方程

只含有一个未知数，并且未知数的最高次数是 2 的整式方程，叫做一元二次方程。
一般形式：\\( ax^2 + bx + c = 0 \\)（\\( a \\neq 0 \\)）。

## 直接开平方法

对于形如 \\( x^2 = p \\) 的方程，可以直接开平方求解。
例如 \\( x^2 = 9 \\)，则 \\( x = \\pm 3 \\)。

## 配方法

通过配方把方程化为 \\( (x + m)^2 = n \\) 的形式，再开平方。
步骤：移项、二次项系数化为 1、配方、开平方。

## 公式法

求根公式：\\( x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\)。
当 \\( \\Delta > 0 \\) 时有两个不等实根；\\( \\Delta = 0 \\) 时有两个相等实根；\\( \\Delta < 0 \\) 时无实根。

## 例题

解方程 \\( x^2 - 5x + 6 = 0 \\)。
因式分解得 \\( (x - 2)(x - 3) = 0 \\)，所以 \\( x_1 = 2, x_2 = 3 \\)。

## 课堂小结

一元二次方程的解法有直接开平方法、配方法、公式法和因式分解法，要根据方程特点选择合适的方法。`;

const testFilePath = resolve('./test-math.md');
writeFileSync(testFilePath, testContent);

async function upload() {
  const form = new FormData();
  form.append('file', new Blob([testContent], { type: 'text/markdown' }), '一元二次方程的解法.md');
  const res = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

const EXPECTED_PAGES = 8;
const SUBJECT_LAYOUTS = new Set(['formula', 'derivation', 'data-chart', 'content']);

async function main() {
  console.log('1. Uploading math test document...');
  const doc = await upload();
  console.log(`   ✅ Uploaded: ${doc.id}`);

  console.log(`2. Generating ${EXPECTED_PAGES}-page math courseware (real LLM)...`);
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
        description: `生成${EXPECTED_PAGES}页初中数学《一元二次方程的解法》课件，包含定义、直接开平方法、配方法、公式法、例题和课堂小结`,
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
    console.log(`   - math layouts: ${subjectLayouts}`);

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
      throw new Error('No math-specific layouts (formula/derivation/data-chart) found');
    }
    console.log('\n✅ Math courseware verification passed!');
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  } finally {
    try { unlinkSync(testFilePath); } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ Math verification failed:', err.message);
  process.exitCode = 1;
});
