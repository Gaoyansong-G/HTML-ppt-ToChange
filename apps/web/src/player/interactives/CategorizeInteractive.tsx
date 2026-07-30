import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Check, X } from 'lucide-react';
import { useTheme } from '../../lib/theme-context';
import {
  EmptyHint,
  InteractiveShell,
  InteractiveTitle,
  asArray,
  asRecord,
  asString,
  getInteractiveConfig,
  hashSeed,
  seededShuffle,
  themePalette,
  withAlpha,
  type InteractiveComponentProps,
} from './common';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CategorizeItem {
  id: string;
  text: string;
  categoryId: string;
}

function parseCategories(config: Record<string, unknown>, palette: string[]): Category[] {
  return asArray(config.categories)
    .map(asRecord)
    .map((c, i) => ({
      id: asString(c.id),
      name: asString(c.name),
      color: asString(c.color) || palette[i % palette.length],
    }))
    .filter((c) => c.id !== '' && c.name !== '');
}

function parseItems(config: Record<string, unknown>, validCategoryIds: Set<string>): CategorizeItem[] {
  return asArray(config.items)
    .map(asRecord)
    .map((it) => ({
      id: asString(it.id),
      text: asString(it.text),
      categoryId: asString(it.categoryId),
    }))
    .filter((it) => it.id !== '' && it.text !== '' && validCategoryIds.has(it.categoryId));
}

/**
 * 拖拽分类：顶部卡片池 HTML5 drag，下方分类篮。
 * 拖对 √ 入篮，拖错 × 抖动弹回卡片池；顶部完成度进度条。
 */
export function CategorizeInteractive({ element, mode, onInteraction }: InteractiveComponentProps) {
  const { tokens } = useTheme();
  const config = getInteractiveConfig(element);
  const title = asString(config.title);
  const palette = themePalette(tokens);

  const categories = useMemo(() => parseCategories(config, palette), [config, palette]);
  const categoryIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);
  const items = useMemo(() => parseItems(config, categoryIds), [config, categoryIds]);
  const pool = useMemo(
    () => seededShuffle(items, hashSeed(items.map((i) => i.id).join('|') + ':pool')),
    [items],
  );

  const [placedIds, setPlacedIds] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const wrongTimer = useRef<number | null>(null);
  const completionReported = useRef(false);

  useEffect(
    () => () => {
      if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
    },
    [],
  );

  useEffect(() => {
    const completed = items.length > 0 && placedIds.size === items.length;
    if (completed && !completionReported.current) {
      completionReported.current = true;
      onInteraction?.(element.id, 'COMPLETE');
    } else if (!completed) {
      completionReported.current = false;
    }
  }, [element.id, items.length, onInteraction, placedIds.size]);

  const showWrongFeedback = (itemId: string) => {
    setWrongId(itemId);
    if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
    wrongTimer.current = window.setTimeout(() => setWrongId(null), 700);
  };

  const placeItem = (itemId: string, categoryId: string) => {
    if (mode === 'editor') return;
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item || placedIds.has(itemId)) return;

    if (item.categoryId === categoryId) {
      setPlacedIds((prev) => {
        const next = new Set(prev);
        next.add(itemId);
        return next;
      });
      setSelectedId((current) => (current === itemId ? null : current));
      setWrongId(null);
      return;
    }

    showWrongFeedback(itemId);
  };

  const handleItemClick = (itemId: string) => {
    if (mode === 'editor') return;
    setSelectedId((current) => (current === itemId ? null : itemId));
    setWrongId(null);
  };

  const handleDragStart = (itemId: string) => (e: DragEvent<HTMLButtonElement>) => {
    if (mode === 'editor') return;
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (categoryId: string) => (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (mode === 'editor') return;
    const itemId = e.dataTransfer.getData('text/plain');
    placeItem(itemId, categoryId);
  };

  const handleDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleCategoryClick = (categoryId: string) => {
    if (!selectedId) return;
    placeItem(selectedId, categoryId);
  };

  if (categories.length === 0 || items.length === 0) {
    return (
      <InteractiveShell element={element} mode={mode}>
        {title && <InteractiveTitle title={title} />}
        <EmptyHint message="分类题缺少 categories 或 items 配置" />
      </InteractiveShell>
    );
  }

  const remaining = pool.filter((it) => !placedIds.has(it.id));
  const progress = items.length > 0 ? placedIds.size / items.length : 0;
  const done = placedIds.size === items.length;

  return (
    <InteractiveShell element={element} mode={mode}>
      {title && <InteractiveTitle title={title} />}
      {/* 完成度进度条 */}
      <div
        style={{
          flexShrink: 0,
          height: 8,
          borderRadius: tokens.borderRadius.full,
          background: tokens.colors.border,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.round(progress * 100)}%`,
            background: done ? tokens.colors.success : tokens.colors.primary,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div
        aria-live="polite"
        style={{
          flexShrink: 0,
          color: wrongId ? tokens.colors.danger : tokens.colors.textMuted,
          fontSize: tokens.fontSizes.xs,
          minHeight: 18,
          textAlign: 'center',
        }}
      >
        {wrongId
          ? '分类不正确，请再试一次'
          : selectedId
            ? '已选择卡片，请点击一个分类篮'
            : '点击卡片后再点击分类篮，也可以直接拖拽'}
      </div>
      {/* 待分类卡片池 */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: 8,
          minHeight: 48,
          maxHeight: '35%',
          overflowY: 'auto',
          borderRadius: tokens.borderRadius.md,
          border: `1px dashed ${tokens.colors.border}`,
          background: tokens.colors.background,
        }}
      >
        {remaining.length === 0 ? (
          <span style={{ color: tokens.colors.textMuted, fontSize: tokens.fontSizes.xs, margin: 'auto' }}>
            全部卡片已分类
          </span>
        ) : (
          remaining.map((item) => {
            const isWrong = wrongId === item.id;
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                draggable={mode === 'player'}
                onDragStart={handleDragStart(item.id)}
                onClick={() => handleItemClick(item.id)}
                disabled={mode === 'editor'}
                aria-pressed={isSelected}
                aria-label={`选择卡片：${item.text}`}
                style={{
                  padding: '4px 10px',
                  borderRadius: tokens.borderRadius.md,
                  border: `2px solid ${
                    isWrong
                      ? tokens.colors.danger
                      : isSelected
                        ? tokens.colors.accent
                        : tokens.colors.primary
                  }`,
                  background: isWrong
                    ? withAlpha(tokens.colors.danger, 0.12)
                    : withAlpha(isSelected ? tokens.colors.accent : tokens.colors.primary, 0.1),
                  color: tokens.colors.text,
                  fontSize: tokens.fontSizes.sm,
                  fontFamily: tokens.fonts.body,
                  cursor: mode === 'editor' ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  maxWidth: '100%',
                  boxShadow: isSelected ? tokens.shadows.md : tokens.shadows.sm,
                  animation: isWrong ? 'cw-shake 0.3s ease-in-out 2' : undefined,
                  transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                  touchAction: 'manipulation',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.text}
                </span>
                {isWrong && <X size={14} color={tokens.colors.danger} style={{ flexShrink: 0 }} />}
              </button>
            );
          })
        )}
      </div>
      {/* 分类篮 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, 1fr)`,
          gap: 8,
        }}
      >
        {categories.map((cat) => {
          const placed = items.filter((it) => it.categoryId === cat.id && placedIds.has(it.id));
          const selectedItem = items.find((item) => item.id === selectedId);
          return (
            <button
              key={cat.id}
              type="button"
              onDragOver={mode === 'player' ? handleDragOver : undefined}
              onDrop={mode === 'player' ? handleDrop(cat.id) : undefined}
              onClick={() => handleCategoryClick(cat.id)}
              disabled={mode === 'editor'}
              aria-label={
                selectedItem
                  ? `将“${selectedItem.text}”放入分类“${cat.name}”`
                  : `分类篮：${cat.name}，已放入 ${placed.length} 项`
              }
              style={{
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: 8,
                borderRadius: tokens.borderRadius.md,
                border: `2px solid ${cat.color}`,
                background: withAlpha(cat.color, 0.08),
                color: tokens.colors.text,
                fontFamily: tokens.fonts.body,
                cursor: mode === 'editor' ? 'default' : selectedId ? 'pointer' : 'default',
                overflowY: 'auto',
                touchAction: 'manipulation',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: tokens.fontSizes.sm,
                  color: cat.color,
                  textAlign: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.name}
              </div>
              {placed.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 8px',
                    borderRadius: tokens.borderRadius.sm,
                    background: tokens.colors.background,
                    fontSize: tokens.fontSizes.xs,
                    color: tokens.colors.text,
                    animation: 'cw-pop 0.3s ease-out',
                    flexShrink: 0,
                  }}
                >
                  <Check size={12} color={tokens.colors.success} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </button>
          );
        })}
      </div>
      {done && (
        <div
          style={{
            flexShrink: 0,
            padding: '6px 12px',
            borderRadius: tokens.borderRadius.md,
            background: withAlpha(tokens.colors.success, 0.15),
            color: tokens.colors.success,
            fontWeight: 700,
            fontSize: tokens.fontSizes.sm,
            textAlign: 'center',
            animation: 'cw-pop 0.4s ease-out',
          }}
        >
          全部分类正确！
        </div>
      )}
    </InteractiveShell>
  );
}
