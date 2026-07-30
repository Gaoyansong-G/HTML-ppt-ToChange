import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, X } from 'lucide-react';
import { FitText } from '../../components/blocks/FitText';
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
  primaryButtonStyle,
  secondaryButtonStyle,
  seededShuffle,
  withAlpha,
  type InteractiveComponentProps,
} from './common';

interface OrderingItem {
  id: string;
  text: string;
}

function parseItems(config: Record<string, unknown>): OrderingItem[] {
  return asArray(config.items)
    .map(asRecord)
    .map((it) => ({ id: asString(it.id), text: asString(it.text) }))
    .filter((it) => it.id !== '' && it.text !== '');
}

function parseCorrectOrder(config: Record<string, unknown>, items: OrderingItem[]): string[] {
  const valid = new Set(items.map((it) => it.id));
  const raw = asArray(config.correctOrder)
    .map((v) => asString(v))
    .filter((id) => id !== '' && valid.has(id));
  // correctOrder 缺失或不完整时回退为 items 原始顺序
  if (raw.length !== items.length) return items.map((it) => it.id);
  return raw;
}

/**
 * 排序题：打乱卡片列表，用上/下按钮排序（不用拖拽更稳）。
 * "检查答案"逐位标对错，支持重试与重新打乱。
 */
export function OrderingInteractive({ element, mode, onInteraction }: InteractiveComponentProps) {
  const { tokens } = useTheme();
  const config = getInteractiveConfig(element);
  const title = asString(config.title);

  const items = useMemo(() => parseItems(config), [config]);
  const correctOrder = useMemo(() => parseCorrectOrder(config, items), [config, items]);

  const initialOrder = useMemo(() => {
    const ids = items.map((it) => it.id);
    let shuffled = seededShuffle(ids, hashSeed(ids.join('|') + ':order'));
    // 万一乱序结果恰好等于正确答案，直接反转
    if (shuffled.length > 1 && shuffled.every((id, i) => id === correctOrder[i])) {
      shuffled = [...shuffled].reverse();
    }
    return shuffled;
  }, [items, correctOrder]);

  const [order, setOrder] = useState<string[]>(initialOrder);
  const [checked, setChecked] = useState(false);

  if (items.length === 0) {
    return (
      <InteractiveShell element={element} mode={mode}>
        {title && <InteractiveTitle title={title} />}
        <EmptyHint message="排序题缺少 items 配置" />
      </InteractiveShell>
    );
  }

  const itemById = new Map(items.map((it) => [it.id, it]));
  const results = order.map((id, i) => id === correctOrder[i]);
  const allCorrect = checked && results.every(Boolean);

  const move = (index: number, dir: -1 | 1) => {
    if (mode === 'editor') return;
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
    setChecked(false);
  };

  const handleCheck = () => {
    setChecked(true);
    if (results.every(Boolean)) {
      onInteraction?.(element.id, 'COMPLETE');
    }
  };
  const handleRetry = () => setChecked(false);
  const handleReshuffle = () => {
    setOrder(seededShuffle(initialOrder, hashSeed(initialOrder.join('|') + Date.now().toString())));
    setChecked(false);
  };

  return (
    <InteractiveShell element={element} mode={mode}>
      {title && <InteractiveTitle title={title} />}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
        {order.map((id, index) => {
          const item = itemById.get(id);
          if (!item) return null;
          const isCorrectPos = checked && results[index];
          const isWrongPos = checked && !results[index];
          let borderColor = tokens.colors.border;
          let background = tokens.colors.background;
          if (isCorrectPos) {
            borderColor = tokens.colors.success;
            background = withAlpha(tokens.colors.success, 0.12);
          } else if (isWrongPos) {
            borderColor = tokens.colors.danger;
            background = withAlpha(tokens.colors.danger, 0.12);
          }
          return (
            <div
              key={id}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                minHeight: 40,
                borderRadius: tokens.borderRadius.md,
                border: `2px solid ${borderColor}`,
                background,
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: tokens.borderRadius.full,
                  background: tokens.colors.primary,
                  color: '#ffffff',
                  fontSize: tokens.fontSizes.xs,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {index + 1}
              </span>
              <span style={{ flex: 1, minWidth: 0, height: 32 }}>
                <FitText fontSize={tokens.fontSizes.sm} minFontSize={10} multiline>
                  {item.text}
                </FitText>
              </span>
              {isCorrectPos && <Check size={16} color={tokens.colors.success} style={{ flexShrink: 0 }} />}
              {isWrongPos && <X size={16} color={tokens.colors.danger} style={{ flexShrink: 0 }} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={mode === 'editor' || index === 0}
                  aria-label="上移"
                  style={{
                    border: `1px solid ${tokens.colors.border}`,
                    background: tokens.colors.background,
                    borderRadius: tokens.borderRadius.sm,
                    padding: 2,
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    opacity: index === 0 ? 0.4 : 1,
                    display: 'flex',
                  }}
                >
                  <ArrowUp size={14} color={tokens.colors.text} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={mode === 'editor' || index === order.length - 1}
                  aria-label="下移"
                  style={{
                    border: `1px solid ${tokens.colors.border}`,
                    background: tokens.colors.background,
                    borderRadius: tokens.borderRadius.sm,
                    padding: 2,
                    cursor: index === order.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: index === order.length - 1 ? 0.4 : 1,
                    display: 'flex',
                  }}
                >
                  <ArrowDown size={14} color={tokens.colors.text} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleCheck}
          disabled={mode === 'editor' || checked}
          style={primaryButtonStyle(tokens, mode === 'editor' || checked)}
        >
          检查答案
        </button>
        {checked && !allCorrect && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={mode === 'editor'}
            style={secondaryButtonStyle(tokens, mode === 'editor')}
          >
            继续调整
          </button>
        )}
        {allCorrect && (
          <button
            type="button"
            onClick={handleReshuffle}
            disabled={mode === 'editor'}
            style={secondaryButtonStyle(tokens, mode === 'editor')}
          >
            重新打乱
          </button>
        )}
        {allCorrect && (
          <span
            style={{
              color: tokens.colors.success,
              fontWeight: 700,
              fontSize: tokens.fontSizes.sm,
              animation: 'cw-pop 0.4s ease-out',
            }}
          >
            排序完全正确！
          </span>
        )}
      </div>
    </InteractiveShell>
  );
}
