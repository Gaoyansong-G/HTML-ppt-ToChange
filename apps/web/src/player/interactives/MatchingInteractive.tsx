import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
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
  seededShuffle,
  withAlpha,
  type InteractiveComponentProps,
} from './common';

interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

interface MatchLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function parsePairs(config: Record<string, unknown>): MatchingPair[] {
  return asArray(config.pairs)
    .map(asRecord)
    .map((p) => ({ id: asString(p.id), left: asString(p.left), right: asString(p.right) }))
    .filter((p) => p.id !== '' && (p.left !== '' || p.right !== ''));
}

/**
 * 连线题：左列点击选中 + 右列点击配对。
 * 连对绿色连线（SVG overlay），连错红色抖动，全部连对显示祝贺。
 */
export function MatchingInteractive({ element, mode, onInteraction }: InteractiveComponentProps) {
  const { tokens } = useTheme();
  const config = getInteractiveConfig(element);
  const title = asString(config.title);
  const pairs = useMemo(() => parsePairs(config), [config]);

  // 右列打乱展示（确定性种子，避免渲染间乱跳）
  const rightItems = useMemo(
    () => seededShuffle(pairs, hashSeed(pairs.map((p) => p.id).join('|') + ':right')),
    [pairs],
  );

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(() => new Set());
  const [wrong, setWrong] = useState<{ leftId: string; rightId: string } | null>(null);
  const [lines, setLines] = useState<MatchLine[]>([]);

  const wrongTimer = useRef<number | null>(null);
  const completionReported = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef(new Map<string, HTMLButtonElement>());
  const rightRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(
    () => () => {
      if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
    },
    [],
  );

  useEffect(() => {
    const completed = pairs.length > 0 && matchedIds.size === pairs.length;
    if (completed && !completionReported.current) {
      completionReported.current = true;
      onInteraction?.(element.id, 'COMPLETE');
    } else if (!completed) {
      completionReported.current = false;
    }
  }, [element.id, matchedIds.size, onInteraction, pairs.length]);

  // 已配对卡片之间画连线（相对容器坐标）
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      setLines([]);
      return;
    }
    const cRect = container.getBoundingClientRect();
    const next: MatchLine[] = [];
    matchedIds.forEach((pairId) => {
      const l = leftRefs.current.get(pairId);
      const r = rightRefs.current.get(pairId);
      if (!l || !r) return;
      const lr = l.getBoundingClientRect();
      const rr = r.getBoundingClientRect();
      next.push({
        id: pairId,
        x1: lr.right - cRect.left,
        y1: lr.top + lr.height / 2 - cRect.top,
        x2: rr.left - cRect.left,
        y2: rr.top + rr.height / 2 - cRect.top,
      });
    });
    setLines(next);
  }, [matchedIds, pairs, rightItems]);

  const handleLeftClick = (id: string) => {
    if (mode === 'editor' || matchedIds.has(id)) return;
    setSelectedLeft((prev) => (prev === id ? null : id));
  };

  const handleRightClick = (rightId: string) => {
    if (mode === 'editor' || matchedIds.has(rightId) || !selectedLeft) return;
    if (selectedLeft === rightId) {
      setMatchedIds((prev) => {
        const next = new Set(prev);
        next.add(rightId);
        return next;
      });
      setSelectedLeft(null);
    } else {
      setWrong({ leftId: selectedLeft, rightId });
      if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
      wrongTimer.current = window.setTimeout(() => setWrong(null), 600);
      setSelectedLeft(null);
    }
  };

  if (pairs.length === 0) {
    return (
      <InteractiveShell element={element} mode={mode}>
        {title && <InteractiveTitle title={title} />}
        <EmptyHint message="连线题缺少 pairs 配置" />
      </InteractiveShell>
    );
  }

  const allMatched = matchedIds.size === pairs.length;

  const cardStyle = (side: 'left' | 'right', pairId: string) => {
    const isMatched = matchedIds.has(pairId);
    const isSelected = side === 'left' && selectedLeft === pairId;
    const isWrong =
      wrong !== null && (wrong.leftId === pairId || wrong.rightId === pairId);
    let borderColor = tokens.colors.border;
    let background = tokens.colors.background;
    if (isMatched) {
      borderColor = tokens.colors.success;
      background = withAlpha(tokens.colors.success, 0.12);
    } else if (isWrong) {
      borderColor = tokens.colors.danger;
      background = withAlpha(tokens.colors.danger, 0.12);
    } else if (isSelected) {
      borderColor = tokens.colors.primary;
      background = withAlpha(tokens.colors.primary, 0.1);
    }
    return {
      border: `2px solid ${borderColor}`,
      background,
      borderRadius: tokens.borderRadius.md,
      padding: '6px 10px',
      minHeight: 40,
      flex: '1 1 0',
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      cursor: isMatched || mode === 'editor' ? 'default' : 'pointer',
      boxShadow: isSelected ? tokens.shadows.md : tokens.shadows.sm,
      animation: isWrong ? 'cw-shake 0.3s ease-in-out 2' : undefined,
      transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
      opacity: isMatched ? 0.9 : 1,
      fontFamily: tokens.fonts.body,
      color: tokens.colors.text,
      fontSize: tokens.fontSizes.sm,
      textAlign: 'left' as const,
    };
  };

  return (
    <InteractiveShell element={element} mode={mode}>
      {title && <InteractiveTitle title={title} />}
      <div
        ref={containerRef}
        style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', gap: 48 }}
      >
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {lines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={tokens.colors.success}
              strokeWidth={3}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, overflowY: 'auto' }}>
          {pairs.map((pair) => (
            <button
              key={pair.id}
              type="button"
              ref={(el) => {
                if (el) leftRefs.current.set(pair.id, el);
                else leftRefs.current.delete(pair.id);
              }}
              onClick={() => handleLeftClick(pair.id)}
              disabled={mode === 'editor'}
              style={cardStyle('left', pair.id)}
            >
              <span style={{ flex: 1, minWidth: 0, height: '100%' }}>
                <FitText fontSize={tokens.fontSizes.sm} minFontSize={10} multiline>
                  {pair.left}
                </FitText>
              </span>
              {matchedIds.has(pair.id) && (
                <Check size={16} color={tokens.colors.success} style={{ flexShrink: 0 }} />
              )}
              {wrong?.leftId === pair.id && (
                <X size={16} color={tokens.colors.danger} style={{ flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, overflowY: 'auto' }}>
          {rightItems.map((pair) => (
            <button
              key={pair.id}
              type="button"
              ref={(el) => {
                if (el) rightRefs.current.set(pair.id, el);
                else rightRefs.current.delete(pair.id);
              }}
              onClick={() => handleRightClick(pair.id)}
              disabled={mode === 'editor'}
              style={cardStyle('right', pair.id)}
            >
              <span style={{ flex: 1, minWidth: 0, height: '100%' }}>
                <FitText fontSize={tokens.fontSizes.sm} minFontSize={10} multiline>
                  {pair.right}
                </FitText>
              </span>
              {wrong?.rightId === pair.id && (
                <X size={16} color={tokens.colors.danger} style={{ flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      </div>
      {allMatched && (
        <div
          style={{
            flexShrink: 0,
            padding: '8px 12px',
            borderRadius: tokens.borderRadius.md,
            background: withAlpha(tokens.colors.success, 0.15),
            color: tokens.colors.success,
            fontWeight: 700,
            fontSize: tokens.fontSizes.sm,
            textAlign: 'center',
            animation: 'cw-pop 0.4s ease-out',
          }}
        >
          全部连对，太棒了！
        </div>
      )}
    </InteractiveShell>
  );
}
