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

## 能量流动

生态系统中能量通过食物链传递，逐级递减。
生产者固定太阳能，消费者通过取食获得能量。

## 课堂练习

1. 生态系统的生物部分包括____、____和____。
答案：生产者、消费者、分解者
2. 请简述自养生物与异养生物的区别。
答案：自养生物能自己制造有机物，异养生物需要摄取现成的有机物。`;

const testFilePath = resolve('./test-image-fallback.md');
writeFileSync(testFilePath, testContent);

async function upload() {
  const form = new FormData();
  form.append('file', new Blob([testContent], { type: 'text/markdown' }), '生态系统与生物多样性.md');
  const res = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

const EXPECTED_PAGES = 5;
const EXPECTED_KEYWORDS = ['生态', '细胞', '生物', '能量', '生产者'];
const SCIENCE_SYMBOLS = ['M320 140', '烧杯', '试管', '地球', '分子'];

function decodeSvg(dataUrl) {
  const prefix = 'data:image/svg+xml;utf8,';
  if (!dataUrl.startsWith(prefix)) return null;
  try {
    return decodeURIComponent(dataUrl.slice(prefix.length));
  } catch {
    return null;
  }
}

async function main() {
  console.log('1. Uploading image fallback test document...');
  const doc = await upload();
  console.log(`   ✅ Uploaded: ${doc.id}`);

  console.log(`2. Generating ${EXPECTED_PAGES}-page courseware with forced SVG fallback...`);
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
        description: `生成${EXPECTED_PAGES}页初中生物《生态系统与生物多样性》课件，必须包含生态系统的组成、生物分类、能量流动和课堂练习`,
        options: { includeQuiz: true, pageCount: EXPECTED_PAGES, imageProvider: 'svg' },
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
    const assets = result.courseware?.assets || [];
    console.log(`   ✅ Generated in ${elapsed}s: ${slides.length} slides, ${assets.length} assets`);

    if (slides.length !== EXPECTED_PAGES) {
      throw new Error(`Expected ${EXPECTED_PAGES} slides, got ${slides.length}`);
    }

    const imageAssets = assets.filter((a) => a.type === 'image');
    if (imageAssets.length === 0) {
      throw new Error('No image assets found');
    }

    const svgAssets = imageAssets.filter((a) => a.url?.startsWith('data:image/svg+xml'));
    console.log(`   - image assets: ${imageAssets.length}, SVG fallback: ${svgAssets.length}`);
    console.log('   - asset descriptions:', imageAssets.map((a) => a.description).join(' | '));

    if (svgAssets.length < imageAssets.length) {
      throw new Error(`Expected all image assets to be SVG fallback, got ${svgAssets.length}/${imageAssets.length}`);
    }

    let keywordHits = 0;
    let symbolHits = 0;
    for (const asset of svgAssets) {
      const svg = decodeSvg(asset.url);
      if (!svg) {
        throw new Error(`Failed to decode SVG for asset ${asset.id}`);
      }
      const hasKeyword = EXPECTED_KEYWORDS.some((kw) => svg.includes(kw));
      const hasSymbol = SCIENCE_SYMBOLS.some((sym) => svg.includes(sym));
      if (hasKeyword) keywordHits++;
      if (hasSymbol) symbolHits++;
    }

    const captions = slides.flatMap((s) => s.elements.filter((e) => e.type === 'text' && e.semanticRole === 'caption'));
    const balanceAnchors = slides.flatMap((s) => s.elements.filter((e) => e.type === 'shape' && e.semanticRole === 'shape' && e.name === 'balance-anchor'));

    console.log('3. Validation:');
    console.log(`   - SVG assets with content keywords: ${keywordHits}/${svgAssets.length}`);
    console.log(`   - SVG assets with science symbols: ${symbolHits}/${svgAssets.length}`);
    console.log(`   - captions added for isolated images: ${captions.length}`);
    console.log(`   - right-side balance anchors added: ${balanceAnchors.length}`);

    if (keywordHits === 0 && symbolHits === 0) {
      throw new Error('SVG fallbacks lack content keywords or science symbols');
    }
    if (imageAssets.length > 0 && captions.length === 0) {
      throw new Error('Expected at least one caption for isolated images');
    }

    console.log('\n✅ Image fallback verification passed!');
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  } finally {
    try { unlinkSync(testFilePath); } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ Image fallback verification failed:', err.message);
  process.exitCode = 1;
});
