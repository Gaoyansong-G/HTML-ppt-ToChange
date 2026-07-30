import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const API_BASE = 'http://localhost:3001/api';

const testContent = `# 生态系统与生物多样性

## 生态系统的组成

生态系统由生物部分和非生物部分组成。
生物部分包括生产者、消费者和分解者。
非生物部分包括阳光、空气、水和土壤。

## 生物分类

生物可按营养方式分为：
- 自养生物：能自己制造有机物，如绿色植物。
- 异养生物：不能自己制造有机物，如动物、真菌。

## 生态系统的类型对比

| 类型 | 主要特点 | 典型代表 |
|------|----------|----------|
| 森林生态系统 | 生物多样性高 | 热带雨林 |
| 草原生态系统 | 耐旱植物多 | 非洲大草原 |
| 淡水生态系统 | 水体环境 | 湖泊、河流 |

## 案例分析：滇池蓝藻爆发

案例：20 世纪 90 年代，滇池因工业废水和生活污水排放，水体富营养化，蓝藻大面积爆发。
问题：蓝藻爆发对滇池生态系统造成了哪些影响？
分析：蓝藻覆盖水面，阻挡阳光，消耗溶解氧，导致鱼类大量死亡，生物多样性下降。

## 课堂练习

1. 生态系统的生物部分包括____、____和____。
答案：生产者、消费者、分解者
2. 请简述自养生物与异养生物的区别。
答案：自养生物能自己制造有机物，异养生物需要摄取现成的有机物。`;

const testFilePath = resolve('./test-templates.md');
writeFileSync(testFilePath, testContent);

async function upload() {
  const form = new FormData();
  form.append('file', new Blob([testContent], { type: 'text/markdown' }), '生态系统与生物多样性.md');
  const res = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

const EXPECTED_PAGES = 8;
const NEW_TEMPLATES = new Set(['table', 'case-study', 'classification', 'worksheet']);

async function main() {
  console.log('1. Uploading template test document...');
  const doc = await upload();
  console.log(`   ✅ Uploaded: ${doc.id}`);

  console.log(`2. Generating ${EXPECTED_PAGES}-page courseware with new templates...`);
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
        description: `生成${EXPECTED_PAGES}页初中生物《生态系统与生物多样性》课件，必须包含表格对比、案例分析、分类归纳和课堂练习页`,
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
    const newTemplates = slides.filter((s) => NEW_TEMPLATES.has(s.layout?.templateId)).length;
    const foundTemplates = [...new Set(slides.map((s) => s.layout?.templateId).filter((t) => NEW_TEMPLATES.has(t)))];

    console.log('3. Validation:');
    console.log(`   - slides: ${slides.length} (expected ${EXPECTED_PAGES})`);
    console.log(`   - images: ${totalImages}`);
    console.log(`   - shapes: ${totalShapes}`);
    console.log(`   - quiz slides: ${quizSlides}`);
    console.log(`   - new templates found: ${newTemplates} (${foundTemplates.join(', ')})`);

    if (slides.length !== EXPECTED_PAGES) {
      throw new Error(`Expected ${EXPECTED_PAGES} slides, got ${slides.length}`);
    }
    if (totalImages === 0) {
      throw new Error('No images found across slides');
    }
    if (quizSlides === 0) {
      throw new Error('No quiz slides found');
    }
    if (newTemplates === 0) {
      throw new Error('No new templates (table/case-study/classification/worksheet) found');
    }
    console.log('\n✅ New templates verification passed!');
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  } finally {
    try { unlinkSync(testFilePath); } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ Template verification failed:', err.message);
  process.exitCode = 1;
});
