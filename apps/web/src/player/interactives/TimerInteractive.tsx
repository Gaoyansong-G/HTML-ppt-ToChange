import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { useTheme } from '../../lib/theme-context';
import {
  InteractiveShell,
  InteractiveTitle,
  asBoolean,
  asNumber,
  asString,
  getInteractiveConfig,
  primaryButtonStyle,
  secondaryButtonStyle,
  type InteractiveComponentProps,
} from './common';

/** 到时提示音：WebAudio 三连蜂鸣（无音频环境静默失败） */
function playBeep() {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [0, 0.32, 0.64].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      const t = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch {
    // 音频不可用（无手势/不支持）时静默
  }
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
}

/**
 * 课堂计时器：大号倒计时数字 + SVG 圆环进度。
 * 开始/暂停/重置，到时闪烁 + WebAudio 蜂鸣。
 */
export function TimerInteractive({ element, mode, onInteraction }: InteractiveComponentProps) {
  const { tokens } = useTheme();
  const config = getInteractiveConfig(element);
  const label = asString(config.label);
  const total = useMemo(() => {
    const s = asNumber(config.seconds, 60);
    return s > 0 ? s : 60;
  }, [config]);
  const autoStart = asBoolean(config.autoStart, false);

  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  // autoStart：仅 player 模式自动开始
  useEffect(() => {
    if (autoStart && mode === 'player') setRunning(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 0.1));
    }, 100);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && remaining <= 0) {
      setRunning(false);
      setTimeUp(true);
      playBeep();
      onInteraction?.(element.id, 'COMPLETE');
    }
  }, [element.id, onInteraction, running, remaining]);

  const handleStartPause = () => {
    if (mode === 'editor') return;
    if (!running && remaining <= 0) return;
    setRunning((r) => !r);
    setTimeUp(false);
  };

  const handleReset = () => {
    if (mode === 'editor') return;
    setRunning(false);
    setRemaining(total);
    setTimeUp(false);
  };

  // 圆环参数
  const size = 140;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = total > 0 ? remaining / total : 0;
  const ringColor = timeUp
    ? tokens.colors.danger
    : progress > 0.25
      ? tokens.colors.primary
      : tokens.colors.warning;

  return (
    <InteractiveShell element={element} mode={mode}>
      {label && <InteractiveTitle title={label} />}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxHeight: '100%', maxWidth: '100%' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tokens.colors.border}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: tokens.fonts.mono,
            fontSize: tokens.fontSizes['2xl'],
            fontWeight: 700,
            color: timeUp ? tokens.colors.danger : tokens.colors.text,
            animation: timeUp ? 'cw-flash 0.5s ease-in-out infinite' : undefined,
          }}
        >
          {formatTime(remaining)}
        </div>
      </div>
      {timeUp && (
        <div
          style={{
            flexShrink: 0,
            textAlign: 'center',
            color: tokens.colors.danger,
            fontWeight: 700,
            fontSize: tokens.fontSizes.sm,
            animation: 'cw-flash 0.5s ease-in-out infinite',
          }}
        >
          时间到！
        </div>
      )}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleStartPause}
          disabled={mode === 'editor' || (!running && remaining <= 0)}
          style={{
            ...primaryButtonStyle(tokens, mode === 'editor' || (!running && remaining <= 0)),
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? '暂停' : '开始'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={mode === 'editor'}
          style={{
            ...secondaryButtonStyle(tokens, mode === 'editor'),
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RotateCcw size={14} />
          重置
        </button>
      </div>
    </InteractiveShell>
  );
}
