import { useEffect, useMemo, useRef, useState } from 'react';
import { Dices, RotateCcw, Square } from 'lucide-react';
import { FitText } from '../../components/blocks/FitText';
import { useTheme } from '../../lib/theme-context';
import {
  EmptyHint,
  InteractiveShell,
  InteractiveTitle,
  asArray,
  asString,
  getInteractiveConfig,
  primaryButtonStyle,
  secondaryButtonStyle,
  withAlpha,
  type InteractiveComponentProps,
} from './common';

function parseNames(config: Record<string, unknown>): string[] {
  return asArray(config.names)
    .map((n) => asString(n))
    .filter((n) => n !== '');
}

/**
 * 随机点名：点击"开始"名字快速滚动闪烁，点击"停"定格高亮。
 * 已点过的名字自动移出候选池，可重置恢复。
 */
export function PickerInteractive({ element, mode, onInteraction }: InteractiveComponentProps) {
  const { tokens } = useTheme();
  const config = getInteractiveConfig(element);
  const title = asString(config.title);
  const names = useMemo(() => parseNames(config), [config]);

  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [rolling, setRolling] = useState(false);
  const [current, setCurrent] = useState<string>(names[0] ?? '');
  const [picked, setPicked] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const available = useMemo(() => names.filter((n) => !removed.has(n)), [names, removed]);

  useEffect(
    () => () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    },
    [],
  );

  const stopRolling = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleStart = () => {
    if (mode === 'editor' || rolling || available.length === 0) return;
    setPicked(null);
    setRolling(true);
    intervalRef.current = window.setInterval(() => {
      setCurrent(available[Math.floor(Math.random() * available.length)]);
    }, 70);
  };

  const handleStop = () => {
    if (mode === 'editor' || !rolling) return;
    stopRolling();
    setRolling(false);
    const chosen = available.includes(current) ? current : available[0];
    if (!chosen) return;
    setCurrent(chosen);
    setPicked(chosen);
    setRemoved((prev) => {
      const next = new Set(prev);
      next.add(chosen);
      return next;
    });
    onInteraction?.(element.id, 'COMPLETE');
  };

  const handleReset = () => {
    if (mode === 'editor') return;
    stopRolling();
    setRolling(false);
    setRemoved(new Set());
    setPicked(null);
    setCurrent(names[0] ?? '');
  };

  if (names.length === 0) {
    return (
      <InteractiveShell element={element} mode={mode}>
        {title && <InteractiveTitle title={title} />}
        <EmptyHint message="随机点名缺少 names 配置" />
      </InteractiveShell>
    );
  }

  return (
    <InteractiveShell element={element} mode={mode}>
      {title && <InteractiveTitle title={title} />}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: tokens.borderRadius.lg,
          border: `3px solid ${picked ? tokens.colors.accent : tokens.colors.border}`,
          background: picked ? withAlpha(tokens.colors.accent, 0.12) : tokens.colors.background,
          boxShadow: picked ? tokens.shadows.lg : tokens.shadows.sm,
          transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
          padding: 12,
        }}
      >
        {available.length === 0 && !rolling ? (
          <span style={{ color: tokens.colors.textMuted, fontSize: tokens.fontSizes.sm }}>
            所有人都点过名了，点击重置再来一轮
          </span>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              animation: rolling ? 'cw-flash 0.3s linear infinite' : picked ? 'cw-pop 0.4s ease-out' : undefined,
              color: picked ? tokens.colors.accent : tokens.colors.text,
            }}
          >
            <FitText
              fontSize={tokens.fontSizes['3xl']}
              minFontSize={16}
              fontWeight={700}
              textAlign="center"
              multiline={false}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {current || '？'}
            </FitText>
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        {!rolling ? (
          <button
            type="button"
            onClick={handleStart}
            disabled={mode === 'editor' || available.length === 0}
            style={{
              ...primaryButtonStyle(tokens, mode === 'editor' || available.length === 0),
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Dices size={14} />
            开始
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStop}
            style={{
              ...primaryButtonStyle(tokens, false),
              background: tokens.colors.danger,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Square size={14} />
            停
          </button>
        )}
        <button
          type="button"
          onClick={handleReset}
          disabled={mode === 'editor' || removed.size === 0}
          style={{
            ...secondaryButtonStyle(tokens, mode === 'editor' || removed.size === 0),
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RotateCcw size={14} />
          重置
        </button>
        <span style={{ fontSize: tokens.fontSizes.xs, color: tokens.colors.textMuted }}>
          剩余 {available.length} 人
        </span>
      </div>
    </InteractiveShell>
  );
}
