import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const API_BASE = 'http://localhost:3001/api';

const testContent = `# 宿建德江

## 原文

移舟泊烟渚，日暮客愁新。
野旷天低树，江清月近人。

## 作者

孟浩然

## 赏析

此诗先写羁旅夜泊，再叙日暮添愁；然后写到宇宙广袤宁静，明月伴人更亲。一隐一现，虚实相间，互为补充。`;

const testFilePath = resolve('./test-sudengdejiang.md');
writeFileSync(testFilePath, testContent);

async function upload() {
  const form = new FormData();
  form.append('file', new Blob([testContent], { type: 'text/markdown' }), '宿建德江.md');
  const res = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

async function main() {
  console.log('1. Uploading test document...');
  const doc = await upload();
  console.log(`   ✅ Uploaded: ${doc.id}`);

  console.log('2. Generating 14-page courseware (real LLM)...');
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
  try {
    const res = await fetch(`${API_BASE}/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        documentId: doc.id,
        description: '生成14页小学六年级语文《宿建德江》课件，要求包含原文、翻译、赏析、作者介绍和课堂互动',
        options: { includeQuiz: true },
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

    console.log('3. Validation:');
    console.log(`   - slides: ${slides.length} (expected 14)`);
    console.log(`   - images: ${totalImages}`);
    console.log(`   - shapes: ${totalShapes}`);

    if (slides.length !== 14) {
      throw new Error(`Expected 14 slides, got ${slides.length}`);
    }
    if (totalImages === 0) {
      throw new Error('No images found across slides');
    }
    console.log('\n✅ 14-page verification passed!');
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

main().catch((err) => {
  console.error('\n❌ Verification failed:', err.message);
  process.exitCode = 1;
});
