import { writeFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const API_BASE = 'http://localhost:3001/api';

const testContent = `# Present Simple Tense

## What is the Present Simple Tense?

We use the present simple tense to talk about habits, general truths, and permanent situations.
Example: The sun rises in the east.

## Form

Affirmative: Subject + base form of verb (+ s/es for he/she/it).
- I play football.
- She plays the piano.

Negative: Subject + do/does + not + base form.
- They do not like spinach.
- He does not watch TV.

Questions: Do/Does + subject + base form?
- Do you speak English?
- Does he walk to school?

## Time expressions

Common time expressions: always, usually, often, sometimes, never, every day, on Mondays.

## Example dialogue

A: What do you do after school?
B: I usually do my homework and then play basketball.

## Practice

Fill in the blanks with the correct form of the verb in brackets.
1. She _______ (go) to school by bus every day.
2. They _______ (not/like) cold weather.
3. _______ you _______ (speak) French?`;

const testFilePath = resolve('./test-english.md');
writeFileSync(testFilePath, testContent);

async function upload() {
  const form = new FormData();
  form.append('file', new Blob([testContent], { type: 'text/markdown' }), 'Present Simple Tense.md');
  const res = await fetch(`${API_BASE}/documents/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

const EXPECTED_PAGES = 8;
const SUBJECT_LAYOUTS = new Set(['grammar', 'dialogue', 'vocabulary', 'reading']);

async function main() {
  console.log('1. Uploading English test document...');
  const doc = await upload();
  console.log(`   ✅ Uploaded: ${doc.id}`);

  console.log(`2. Generating ${EXPECTED_PAGES}-page English courseware (real LLM)...`);
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
        description: `生成${EXPECTED_PAGES}页初中英语《Present Simple Tense》课件，包含定义、肯定/否定/疑问结构、时间状语、例句对话和练习`,
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
    console.log(`   - English layouts: ${subjectLayouts}`);

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
      throw new Error('No English-specific layouts (grammar/dialogue/vocabulary/reading) found');
    }
    console.log('\n✅ English courseware verification passed!');
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  } finally {
    try { unlinkSync(testFilePath); } catch {}
  }
}

main().catch((err) => {
  console.error('\n❌ English verification failed:', err.message);
  process.exitCode = 1;
});
