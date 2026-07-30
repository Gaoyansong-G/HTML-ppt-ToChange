import { randomUUID } from 'crypto';
import {
  DEFAULT_SLIDE_SIZE,
  getBlockDef,
  chooseThemeId,
  resolveTheme,
  type PageBlueprint,
  type TeachingScript,
  type Courseware,
  type Slide,
  type Element,
  type Asset,
} from '@courseware/shared';
import { createImageAsset, type ImageProvider } from './image-provider';

/**
 * Block 装配器：把 PageBlueprint（语义）确定性地装配为 Slide（几何）。
 * 铁律：LLM 不输出坐标——这里的页面流算法负责全部几何计算。
 */

const CANVAS = DEFAULT_SLIDE_SIZE; // 1280×720
const PAGE_PADDING = 40; // 页面安全边距
const BLOCK_GAP = 24; // block 纵向间距

/** 每个 phase 默认转场 */
const PHASE_TRANSITIONS: Record<string, string> = {
  'lead-in': 'zoom',
  objectives: 'fade',
  teaching: 'slide',
  practice: 'flip',
  summary: 'fade',
  homework: 'wipe',
};

/**
 * quiz 槽位归一化：LLM 可能输出字符串选项 + 字母答案，
 * 统一转为 { text, isCorrect } 结构。防 LLM 输出漂移的确定性兜底。
 */
function normalizeQuizSlot(quiz: unknown): unknown {
  if (!quiz || typeof quiz !== 'object') return quiz;
  const q = quiz as Record<string, unknown>;
  const rawOptions = Array.isArray(q.options) ? q.options : [];
  const answer = q.correctAnswer ?? q.answer;

  const answerLetters = new Set<string>();
  if (typeof answer === 'string') {
    answer.trim().split(/[,，、\s]+/).forEach((a) => {
      const m = a.match(/^[A-D]$/i);
      if (m) answerLetters.add(a.toUpperCase());
    });
  } else if (Array.isArray(answer)) {
    answer.forEach((a) => {
      if (typeof a === 'string') {
        const m = a.match(/^[A-D]$/i);
        if (m) answerLetters.add(a.toUpperCase());
      }
    });
  }

  const options = rawOptions.map((opt, i) => {
    const letter = String.fromCharCode(65 + i);
    if (typeof opt === 'string') {
      // 去掉 "A. " / "A、" 前缀
      const text = opt.replace(/^[A-Da-d][.、．\s]+/, '');
      return { text, isCorrect: answerLetters.size ? answerLetters.has(letter) : false };
    }
    if (opt && typeof opt === 'object') {
      const o = opt as Record<string, unknown>;
      return {
        text: typeof o.text === 'string' ? o.text : String(o.text ?? ''),
        isCorrect: typeof o.isCorrect === 'boolean' ? o.isCorrect : answerLetters.has(letter),
      };
    }
    return { text: String(opt ?? ''), isCorrect: answerLetters.has(letter) };
  });

  // 无正确标记且是单选：默认第一项（避免无法判定）
  const type = typeof q.type === 'string' ? q.type : 'single-choice';
  if (options.length && !options.some((o) => o.isCorrect) && type !== 'reveal') {
    options[0].isCorrect = true;
  }

  return {
    question: typeof q.question === 'string' ? q.question : '',
    type,
    options: options.length ? options : undefined,
    correctAnswer: answer,
    explanation: typeof q.explanation === 'string' ? q.explanation : '',
  };
}

/** poem 归一化：LLM 可能把诗句放在 content（整段带 / 朗读标记），拆分为 lines */
function normalizePoem(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return { title: '', author: '', dynasty: '', lines: [], translation: '', appreciation: '' };
  const o = value as Record<string, unknown>;
  let lines: string[] = [];
  if (Array.isArray(o.lines)) {
    // 剥掉 "/" 朗读停顿标记（LLM 常在 lines 里保留）
    lines = o.lines.map(asString).map((l) => l.replace(/\//g, '').trim()).filter(Boolean);
  }
  if (!lines.length && typeof o.content === 'string') {
    // content 形式：去除 "/" 朗读停顿标记，按换行/句号拆分
    const cleaned = (o.content as string).replace(/\//g, '');
    lines = cleaned
      .split(/\n|[。；;]+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.endsWith('，') || l.endsWith('。') ? l : l + '。'));
  }
  // author 形如 "[唐] 孟浩然" → 拆朝代
  let author = asString(o.author);
  let dynasty = asString(o.dynasty);
  const m = author.match(/^[\[【]([^\]】]+)[\]】]\s*(.*)$/);
  if (m) {
    if (!dynasty) dynasty = m[1];
    author = m[2] || author;
  }
  // authorInfo 并入 appreciation（无独立槽位）
  const appreciation = asString(o.appreciation) || asString(o.authorInfo);
  return {
    title: asString(o.title),
    author,
    dynasty,
    lines,
    translation: asString(o.translation),
    appreciation,
  };
}

/** 对 block slots 做槽位级归一化（按 BLOCK_CATALOG 槽位类型驱动） */
export function normalizeSlots(blockType: string, slots: Record<string, unknown>): Record<string, unknown> {
  const next = { ...slots };
  if (blockType === 'quiz' && next.quiz) {
    next.quiz = normalizeQuizSlot(next.quiz);
  }
  const def = getBlockDef(blockType);
  if (!def) return next;

  for (const slotDef of def.slots) {
    const value = next[slotDef.key];
    if (value === undefined || value === null) continue;
    switch (slotDef.type) {
      case 'text':
      case 'richtext':
        if (typeof value === 'string') next[slotDef.key] = stripHtml(value);
        break;
      case 'list':
        next[slotDef.key] = normalizeStringList(value);
        break;
      case 'pairs':
        next[slotDef.key] = normalizePairs(value);
        break;
      case 'steps':
        next[slotDef.key] = normalizeSteps(value);
        break;
      case 'events':
        next[slotDef.key] = normalizeEvents(value);
        break;
      case 'words':
        next[slotDef.key] = normalizeWords(value);
        break;
      case 'dialogue':
        next[slotDef.key] = normalizeDialogue(value);
        break;
      case 'table':
        next[slotDef.key] = normalizeTable(value);
        break;
      case 'poem':
        next[slotDef.key] = normalizePoem(value);
        break;
      default:
        break;
    }
  }
  return next;
}

/** 去除 HTML 标签（LLM 有时在富文本槽位输出 <p>/<ul> 标签） */
function stripHtml(text: string): string {
  if (!/<[a-zA-Z/][^>]*>/.test(text)) return text;
  return text
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '· ')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function asString(v: unknown): string {
  if (typeof v === 'string') return stripHtml(v);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of ['text', 'label', 'title', 'name', 'content', 'value']) {
      if (typeof o[k] === 'string') return stripHtml(o[k] as string);
    }
  }
  return v == null ? '' : String(v);
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

/** pairs 归一化：兼容 {left,right} / {key,value} / {label,text} */
function normalizePairs(value: unknown): { left: string; right: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const left = asString(o.left ?? o.key ?? o.label ?? o.name ?? o.term);
      const right = asString(o.right ?? o.value ?? o.text ?? o.description ?? o.definition);
      return left || right ? { left, right } : null;
    })
    .filter((p): p is { left: string; right: string } => !!p);
}

function normalizeSteps(value: unknown): { title: string; detail: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, i) => {
      if (typeof item === 'string') return { title: item, detail: '' };
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      return {
        title: asString(o.title ?? o.name ?? o.step) || `步骤 ${i + 1}`,
        detail: asString(o.detail ?? o.description ?? o.content),
      };
    })
    .filter((s): s is { title: string; detail: string } => !!s);
}

function normalizeEvents(value: unknown): { time: string; event: string; detail: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      return {
        time: asString(o.time ?? o.date ?? o.year),
        event: asString(o.event ?? o.title ?? o.name),
        detail: asString(o.detail ?? o.description),
      };
    })
    .filter((e): e is { time: string; event: string; detail: string } => !!e && (!!e.time || !!e.event));
}

function normalizeWords(value: unknown): { word: string; phonetic: string; meaning: string; example: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const word = asString(o.word ?? o.term ?? o.vocabulary);
      if (!word) return null;
      return {
        word,
        phonetic: asString(o.phonetic ?? o.pronunciation),
        meaning: asString(o.meaning ?? o.definition ?? o.translation),
        example: asString(o.example ?? o.sentence),
      };
    })
    .filter((w): w is { word: string; phonetic: string; meaning: string; example: string } => !!w);
}

function normalizeDialogue(value: unknown): { speaker: string; text: string; translation: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      return {
        speaker: asString(o.speaker ?? o.role ?? o.character ?? o.name),
        text: asString(o.text ?? o.content ?? o.line ?? o.sentence),
        translation: asString(o.translation ?? o.meaning),
      };
    })
    .filter((t): t is { speaker: string; text: string; translation: string } => !!t && !!t.text);
}

function normalizeTable(value: unknown): { headers: string[]; rows: string[][] } | unknown {
  if (!value || typeof value !== 'object') return value;
  const o = value as Record<string, unknown>;
  // 别名兼容：LLM 可能输出 columns/head、data/body
  const rawHeaders = o.headers ?? o.columns ?? o.head ?? o.header;
  const rawRows = o.rows ?? o.data ?? o.body ?? o.records;
  const headers = Array.isArray(rawHeaders) ? rawHeaders.map(asString) : [];
  const rows = Array.isArray(rawRows)
    ? rawRows.map((r) => (Array.isArray(r) ? r.map(asString) : [asString(r)]))
    : [];
  return { headers, rows };
}

/** 每页 block 高度分配策略（占总内容区高度的比例） */
function allocateHeights(count: number): number[] {
  if (count <= 1) return [1];
  if (count === 2) return [0.58, 0.42];
  return [0.42, 0.3, 0.28];
}

export interface BlockAssembleInput {
  script: TeachingScript;
  blueprints: PageBlueprint[];
  documentId: string;
  filename: string;
  description: string;
  subject: string;
  themeId?: string;         // 用户指定主题；缺省按学科自动
  imageProvider?: ImageProvider;
}

export async function assembleBlockCourseware(input: BlockAssembleInput): Promise<Courseware> {
  const gradeLevel = input.script.courseInfo.gradeLevel || 'unknown';
  const themeId = input.themeId || chooseThemeId(input.subject, gradeLevel);
  const theme = resolveTheme(themeId, gradeLevel);
  const assets: Asset[] = [];
  const slides: Slide[] = [];

  // 全局页序（按 script phases 顺序，blueprint 按 id 索引）
  const blueprintById = new Map(input.blueprints.map((p) => [p.id, p]));
  const orderedBlueprints: PageBlueprint[] = [];
  for (const phase of input.script.phases) {
    for (const sp of phase.pages) {
      const bp = blueprintById.get(sp.id);
      if (bp) orderedBlueprints.push(bp);
    }
  }
  // 兜底：script 中没匹配上的 blueprint 追加在尾部
  for (const bp of input.blueprints) {
    if (!orderedBlueprints.includes(bp)) orderedBlueprints.push(bp);
  }

  for (let i = 0; i < orderedBlueprints.length; i++) {
    const bp = orderedBlueprints[i];
    const elements: Element[] = [];
    const contentX = PAGE_PADDING;
    const contentY = PAGE_PADDING;
    const contentW = CANVAS.width - PAGE_PADDING * 2;
    const contentH = CANVAS.height - PAGE_PADDING * 2;

    const blocks = bp.blocks.slice(0, 3);
    const ratios = allocateHeights(blocks.length);
    let cursorY = contentY;

    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b];
      const availH = contentH - BLOCK_GAP * (blocks.length - 1);
      const h = Math.floor(availH * (ratios[b] || 1 / blocks.length));
      const geometry = {
        x: contentX,
        y: cursorY,
        width: contentW,
        height: h,
        zIndex: b,
      };
      cursorY += h + BLOCK_GAP;

      // 配图请求：为 image 槽位生成素材
      const slots = { ...(block.slots || {}) };
      if (block.assetRequest?.slot && slots[block.assetRequest.slot]) {
        const slotVal = slots[block.assetRequest.slot] as Record<string, unknown>;
        const desc = block.assetRequest.description || (slotVal?.description as string) || bp.title;
        try {
          const asset = await createImageAsset(
            desc,
            theme as Parameters<typeof createImageAsset>[1],
            800,
            600,
            { slideTitle: bp.title, subject: input.subject },
            undefined,
            input.imageProvider,
          );
          assets.push(asset);
          slots[block.assetRequest.slot] = { ...slotVal, assetId: asset.id, description: desc };
        } catch {
          slots[block.assetRequest.slot] = { ...slotVal, description: desc };
        }
      }

      elements.push({
        id: `el-${randomUUID()}`,
        type: 'block',
        semanticRole: 'body',
        name: `${block.blockType}-${b + 1}`,
        geometry,
        content: {
          blockType: block.blockType,
          variant: block.variant || 'default',
          slots: normalizeSlots(block.blockType, slots),
          emphasis: block.emphasis || [],
        },
        style: {},
        animation: {
          entrance: [
            {
              id: `anim-${randomUUID()}`,
              type: b === 0 ? 'fade' : 'slide-up',
              duration: 0.6,
              delay: b * 0.15,
              easing: 'power2.out',
              trigger: b === 0 ? 'auto' : 'after-prev',
            },
          ],
          exit: [],
        },
        interactions: [],
      } as Element);
    }

    slides.push({
      id: bp.id || `slide-${i + 1}`,
      order: i,
      title: bp.title,
      phase: bp.phase,
      speakerNotes: bp.speakerNotes || '',
      sourceRefs: bp.sourceRefs || [],
      layout: { templateId: 'block-flow', variant: 'default', constraints: [] },
      background: { color: theme.tokens.colors.background },
      elements,
      transition: {
        type: (PHASE_TRANSITIONS[bp.phase] || 'fade') as Slide['transition']['type'],
        duration: 0.6,
        easing: 'power2.inOut',
      },
      timeline: { autoPlay: true },
    } as Slide);
  }

  const now = new Date().toISOString();
  // 标题优先级：封面 block 的主标题 > 脚本第一页意图 > 描述截断
  const coverBlock = orderedBlueprints[0]?.blocks.find((b) => b.blockType === 'cover');
  const coverTitle = (coverBlock?.slots?.title as string) || '';
  const title =
    coverTitle.trim() ||
    orderedBlueprints[0]?.title?.trim() ||
    input.description.replace(/\d+\s*(页|张|page|pages)/gi, '').trim().slice(0, 30) ||
    '未命名课件';
  return {
    id: randomUUID(),
    version: '1.0',
    title,
    topicDescription: input.description,
    subject: input.subject,
    gradeLevel,
    teachingScript: input.script,
    designSystem: {
      id: theme.id,
      name: theme.name,
      tokens: theme.tokens,
    } as Courseware['designSystem'],
    slides,
    assets,
    createdAt: now,
    updatedAt: now,
  } as Courseware;
}
