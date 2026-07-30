/**
 * 组件面板：把 Block 版式组件与课堂互动组件插入当前页面。
 * A. 版式组件：BLOCK_CATALOG 26 个条目，按 category 分组，中文名 + 描述 tooltip
 * B. 课堂互动：7 种 interactiveType（连线/分类/排序/计时/计分/点名/翻翻卡）
 *
 * 插入 geometry 策略：
 * - 当前页无 block 元素：占满内容区 (40, 40, 1200, 640)
 * - 已有 block 元素：把最后一个 block 高度压缩一半，新元素放其下方（间距 24）
 * 插入前先 record(courseware) 快照进撤销链（压缩旧块 + 新增元素视为一次操作）。
 */
import { useMemo, useState } from 'react';
import { Blocks, MousePointerClick, Puzzle, X } from 'lucide-react';
import type { BlockDef, Element } from '@courseware/shared';
import { BLOCK_CATALOG } from '@courseware/shared';
import { useEditorStore } from '../stores/editor.store';
import { useHistoryStore } from '../stores/history.store';
import { CONTENT_AREA, makeBlockElement, makeInteractiveElement } from './default-content';

const CATEGORY_ORDER: BlockDef['category'][] = [
  'opening',
  'explain',
  'chinese',
  'math',
  'english',
  'science',
  'humanity',
  'interactive',
  'closing',
];

const CATEGORY_LABELS: Record<BlockDef['category'], string> = {
  opening: '开篇',
  explain: '讲解',
  chinese: '语文',
  math: '数学',
  english: '英语',
  science: '理科',
  humanity: '文科',
  interactive: '互动',
  closing: '收尾',
};

interface InteractiveItem {
  interactiveType: string;
  name: string;
  description: string;
}

const INTERACTIVE_ITEMS: InteractiveItem[] = [
  { interactiveType: 'matching', name: '连线题', description: '左右两列点击配对，连对显示绿色连线。' },
  { interactiveType: 'categorize', name: '拖拽分类', description: '把卡片拖入正确的分类篮，拖错弹回。' },
  { interactiveType: 'ordering', name: '排序挑战', description: '用上/下按钮把条目排成正确顺序。' },
  { interactiveType: 'timer', name: '计时器', description: '课堂倒计时，到时闪烁并播放提示音。' },
  { interactiveType: 'scoreboard', name: '计分板', description: '小组加减分，自动排名并高亮第一名。' },
  { interactiveType: 'picker', name: '随机点名', description: '名字滚动闪烁，随机抽取一名学生。' },
  { interactiveType: 'card-flip', name: '翻翻卡', description: '点击卡片 3D 翻转，查看背面答案。' },
];

type PendingInsert =
  | { kind: 'block'; blockType: string; name: string }
  | { kind: 'interactive'; item: InteractiveItem };

export function ComponentsPanel() {
  const {
    courseware,
    currentSlideId,
    updateSlide,
    addElement,
    addSlideWithElements,
  } = useEditorStore();
  const { record } = useHistoryStore();
  const [pendingInsert, setPendingInsert] = useState<PendingInsert | null>(null);

  const groupedBlocks = useMemo(() => {
    const groups = new Map<BlockDef['category'], BlockDef[]>();
    BLOCK_CATALOG.forEach((def) => {
      const list = groups.get(def.category);
      if (list) {
        list.push(def);
      } else {
        groups.set(def.category, [def]);
      }
    });
    return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      blocks: groups.get(cat) ?? [],
    }));
  }, []);

  const getElement = (pending: PendingInsert, geometry: Element['geometry']) =>
    pending.kind === 'block'
      ? makeBlockElement(pending.blockType, geometry)
      : makeInteractiveElement(
          pending.item.interactiveType,
          geometry,
          pending.item.name,
        );

  const getPendingName = (pending: PendingInsert) =>
    pending.kind === 'block' ? pending.name : pending.item.name;

  const requestInsert = (pending: PendingInsert) => {
    if (!currentSlideId) return;
    const slide = courseware.slides.find((s) => s.id === currentSlideId);
    if (!slide) return;

    if (slide.elements.length > 0) {
      setPendingInsert(pending);
      return;
    }

    record(courseware);
    addElement(
      currentSlideId,
      getElement(pending, { ...CONTENT_AREA, zIndex: 1 }),
    );
  };

  const createAsNewPage = () => {
    if (!pendingInsert) return;
    record(courseware);
    const name = getPendingName(pendingInsert);
    addSlideWithElements({
      id: '',
      order: 0,
      title: name,
      layout: {
        templateId: 'structured',
        variant: 'default',
        constraints: [],
      },
      background: { color: '#ffffff' },
      elements: [
        getElement(pendingInsert, { ...CONTENT_AREA, zIndex: 1 }),
      ],
      transition: { type: 'fade', duration: 0.6, easing: 'power2.inOut' },
      timeline: { autoPlay: true },
    });
    setPendingInsert(null);
  };

  const replaceCurrentPage = () => {
    if (!pendingInsert || !currentSlideId) return;
    record(courseware);
    const name = getPendingName(pendingInsert);
    updateSlide(currentSlideId, (slide) => {
      slide.title = name;
      slide.layout = {
        templateId: 'structured',
        variant: 'default',
        constraints: [],
      };
      slide.elements = [
        getElement(pendingInsert, { ...CONTENT_AREA, zIndex: 1 }),
      ];
    });
    setPendingInsert(null);
  };

  const insertBlock = (def: BlockDef) => {
    requestInsert({
      kind: 'block',
      blockType: def.blockType,
      name: def.name,
    });
  };

  const insertInteractive = (item: InteractiveItem) => {
    requestInsert({ kind: 'interactive', item });
  };

  if (!currentSlideId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <Blocks size={32} className="text-slate-300" />
        <p className="text-sm text-slate-500">请先在"页面"标签中新建一个页面</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="components-panel">
      {pendingInsert && (
        <div
          role="dialog"
          aria-label="选择版式插入方式"
          className="sticky top-0 z-10 rounded-xl border border-amber-200 bg-amber-50 p-3 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                当前页面已有内容
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                “{getPendingName(pendingInsert)}”是整页版式。为避免内容遮挡，建议创建新页面。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPendingInsert(null)}
              title="取消"
              className="rounded-md p-1 text-slate-500 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={createAsNewPage}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
            >
              新建页面使用（推荐）
            </button>
            <button
              type="button"
              onClick={replaceCurrentPage}
              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              替换当前页面内容
            </button>
          </div>
        </div>
      )}

      {/* A. 版式组件 */}
      <section className="space-y-2">
        <div className="flex items-center gap-1.5 px-1">
          <Blocks size={13} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-700">版式组件</span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
            {BLOCK_CATALOG.length}
          </span>
        </div>
        {groupedBlocks.map((group) => (
          <div
            key={group.category}
            className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-600">{group.label}</span>
              <span className="text-[10px] font-medium text-slate-400">
                {group.blocks.length} 个
              </span>
            </div>
            <div className="divide-y divide-slate-50">
              {group.blocks.map((def) => (
                <button
                  key={def.blockType}
                  type="button"
                  onClick={() => insertBlock(def)}
                  title={def.description}
                  data-testid={`insert-block-${def.blockType}`}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                    {def.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400">{def.blockType}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* B. 课堂互动 */}
      <section className="space-y-2">
        <div className="flex items-center gap-1.5 px-1">
          <Puzzle size={13} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-700">课堂互动</span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
            {INTERACTIVE_ITEMS.length}
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="divide-y divide-slate-50">
            {INTERACTIVE_ITEMS.map((item) => (
              <button
                key={item.interactiveType}
                type="button"
                onClick={() => insertInteractive(item)}
                title={item.description}
                data-testid={`insert-interactive-${item.interactiveType}`}
                className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                  {item.name}
                </span>
                <MousePointerClick size={12} className="shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
        <p className="px-1 text-[10px] leading-relaxed text-slate-400">
          空白页会直接应用；已有内容时可新建页面或替换当前页面，避免版式重叠。
        </p>
      </section>
    </div>
  );
}
