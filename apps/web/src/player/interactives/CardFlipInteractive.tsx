import { useEffect, useMemo, useRef, useState } from 'react';
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
  withAlpha,
  type InteractiveComponentProps,
} from './common';

interface FlipCard {
  id: string;
  front: string;
  back: string;
}

function parseCards(config: Record<string, unknown>): FlipCard[] {
  return asArray(config.cards)
    .map(asRecord)
    .map((c) => ({ id: asString(c.id), front: asString(c.front), back: asString(c.back) }))
    .filter((c) => c.id !== '' && (c.front !== '' || c.back !== ''));
}

/**
 * 翻翻卡：卡片网格，点击 3D 翻转（CSS rotateY）显示背面，可翻回。
 */
export function CardFlipInteractive({ element, mode, onInteraction }: InteractiveComponentProps) {
  const { tokens } = useTheme();
  const config = getInteractiveConfig(element);
  const title = asString(config.title);
  const cards = useMemo(() => parseCards(config), [config]);

  const [flippedIds, setFlippedIds] = useState<Set<string>>(() => new Set());
  const completionReported = useRef(false);

  useEffect(() => {
    const completed = cards.length > 0 && flippedIds.size === cards.length;
    if (completed && !completionReported.current) {
      completionReported.current = true;
      onInteraction?.(element.id, 'COMPLETE');
    }
  }, [cards.length, element.id, flippedIds.size, onInteraction]);

  if (cards.length === 0) {
    return (
      <InteractiveShell element={element} mode={mode}>
        {title && <InteractiveTitle title={title} />}
        <EmptyHint message="翻翻卡缺少 cards 配置" />
      </InteractiveShell>
    );
  }

  const toggle = (id: string) => {
    if (mode === 'editor') return;
    setFlippedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns = cards.length <= 1 ? 1 : cards.length <= 4 ? 2 : cards.length <= 9 ? 3 : 4;

  const faceBase = {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: tokens.borderRadius.lg,
    backfaceVisibility: 'hidden' as const,
    WebkitBackfaceVisibility: 'hidden' as const,
    overflow: 'hidden',
  };

  return (
    <InteractiveShell element={element} mode={mode}>
      {title && <InteractiveTitle title={title} />}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridAutoRows: '1fr',
          gap: 10,
          overflowY: 'auto',
        }}
      >
        {cards.map((card) => {
          const flipped = flippedIds.has(card.id);
          return (
            <div
              key={card.id}
              onClick={() => toggle(card.id)}
              role="button"
              tabIndex={mode === 'editor' ? -1 : 0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(card.id);
                }
              }}
              style={{
                position: 'relative',
                minHeight: 60,
                perspective: 800,
                cursor: mode === 'editor' ? 'default' : 'pointer',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transformStyle: 'preserve-3d',
                  WebkitTransformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* 正面 */}
                <div
                  style={{
                    ...faceBase,
                    background: withAlpha(tokens.colors.primary, 0.1),
                    border: `2px solid ${tokens.colors.primary}`,
                    color: tokens.colors.text,
                    boxShadow: tokens.shadows.sm,
                  }}
                >
                  <FitText fontSize={tokens.fontSizes.base} minFontSize={10} fontWeight={600} textAlign="center" multiline>
                    {card.front}
                  </FitText>
                </div>
                {/* 背面 */}
                <div
                  style={{
                    ...faceBase,
                    background: withAlpha(tokens.colors.accent, 0.14),
                    border: `2px solid ${tokens.colors.accent}`,
                    color: tokens.colors.text,
                    transform: 'rotateY(180deg)',
                    boxShadow: tokens.shadows.sm,
                  }}
                >
                  <FitText fontSize={tokens.fontSizes.base} minFontSize={10} textAlign="center" multiline>
                    {card.back}
                  </FitText>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </InteractiveShell>
  );
}
