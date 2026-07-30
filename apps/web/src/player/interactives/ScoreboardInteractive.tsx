import { useMemo, useState } from 'react';
import { Flag, Minus, Plus, RotateCcw, Trophy } from 'lucide-react';
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
  primaryButtonStyle,
  secondaryButtonStyle,
  themePalette,
  withAlpha,
  type InteractiveComponentProps,
} from './common';

interface Team {
  id: string;
  name: string;
  color: string;
}

function parseTeams(config: Record<string, unknown>, palette: string[]): Team[] {
  return asArray(config.teams)
    .map(asRecord)
    .map((t, i) => ({
      id: asString(t.id),
      name: asString(t.name),
      color: asString(t.color) || palette[i % palette.length],
    }))
    .filter((t) => t.id !== '' && t.name !== '');
}

/**
 * 小组计分板：各组卡片 + 分数 + 加减分按钮。
 * 分数变化放大动画（key 重挂载 + CSS animation），按分数排序并高亮第一名。
 */
export function ScoreboardInteractive({
  element,
  mode,
  onInteraction,
}: InteractiveComponentProps) {
  const { tokens } = useTheme();
  const config = getInteractiveConfig(element);
  const title = asString(config.title);
  const palette = themePalette(tokens);

  const teams = useMemo(() => parseTeams(config, palette), [config, palette]);
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    teams.forEach((t) => {
      init[t.id] = 0;
    });
    return init;
  });
  const [completed, setCompleted] = useState(false);

  if (teams.length === 0) {
    return (
      <InteractiveShell element={element} mode={mode}>
        {title && <InteractiveTitle title={title} />}
        <EmptyHint message="计分板缺少 teams 配置" />
      </InteractiveShell>
    );
  }

  const changeScore = (teamId: string, delta: number) => {
    if (mode === 'editor' || completed) return;
    setScores((prev) => ({ ...prev, [teamId]: Math.max(0, (prev[teamId] ?? 0) + delta) }));
  };

  const maxScore = Math.max(...teams.map((t) => scores[t.id] ?? 0), 0);
  const sorted = [...teams].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const winners = teams.filter((team) => (scores[team.id] ?? 0) === maxScore);

  const handleFinish = () => {
    if (mode === 'editor' || completed || maxScore <= 0) return;
    setCompleted(true);
    onInteraction?.(element.id, 'COMPLETE');
  };

  const handleReset = () => {
    if (mode === 'editor') return;
    const resetScores: Record<string, number> = {};
    teams.forEach((team) => {
      resetScores[team.id] = 0;
    });
    setScores(resetScores);
    setCompleted(false);
  };

  return (
    <InteractiveShell element={element} mode={mode}>
      {title && <InteractiveTitle title={title} />}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        {sorted.map((team, rank) => {
          const score = scores[team.id] ?? 0;
          const isLeader = maxScore > 0 && score === maxScore;
          return (
            <div
              key={team.id}
              style={{
                flex: '1 1 0',
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                borderRadius: tokens.borderRadius.lg,
                border: `2px solid ${isLeader ? tokens.colors.accent : team.color}`,
                background: isLeader ? withAlpha(tokens.colors.accent, 0.12) : withAlpha(team.color, 0.08),
                boxShadow: isLeader ? tokens.shadows.md : tokens.shadows.sm,
                transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 24,
                  height: 24,
                  borderRadius: tokens.borderRadius.full,
                  background: team.color,
                  color: '#ffffff',
                  fontSize: tokens.fontSizes.xs,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {rank + 1}
              </span>
              <span style={{ flex: 1, minWidth: 0, height: '100%', maxHeight: 48 }}>
                <FitText fontSize={tokens.fontSizes.base} minFontSize={10} fontWeight={600} multiline={false}>
                  {team.name}
                </FitText>
              </span>
              {isLeader && (
                <Trophy size={18} color={tokens.colors.accent} style={{ flexShrink: 0 }} />
              )}
              <button
                type="button"
                onClick={() => changeScore(team.id, -1)}
                disabled={mode === 'editor' || completed || score <= 0}
                aria-label={`${team.name} 减一分`}
                style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: tokens.borderRadius.full,
                  border: `1px solid ${tokens.colors.border}`,
                  background: tokens.colors.background,
                  color: tokens.colors.text,
                  cursor:
                    mode === 'editor' || completed || score <= 0
                      ? 'not-allowed'
                      : 'pointer',
                  opacity: mode === 'editor' || completed || score <= 0 ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Minus size={14} />
              </button>
              <span
                key={score}
                style={{
                  flexShrink: 0,
                  minWidth: 40,
                  textAlign: 'center',
                  fontFamily: tokens.fonts.mono,
                  fontSize: tokens.fontSizes.xl,
                  fontWeight: 700,
                  color: isLeader ? tokens.colors.accent : tokens.colors.text,
                  animation: mode === 'player' ? 'cw-bump 0.4s ease-out' : undefined,
                }}
              >
                {score}
              </span>
              <button
                type="button"
                onClick={() => changeScore(team.id, 1)}
                disabled={mode === 'editor' || completed}
                aria-label={`${team.name} 加一分`}
                style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: tokens.borderRadius.full,
                  border: 'none',
                  background: team.color,
                  color: '#ffffff',
                  cursor: mode === 'editor' || completed ? 'not-allowed' : 'pointer',
                  opacity: mode === 'editor' || completed ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          );
        })}
      </div>
      {completed && (
        <div
          role="status"
          style={{
            flexShrink: 0,
            padding: '7px 12px',
            borderRadius: tokens.borderRadius.md,
            background: withAlpha(tokens.colors.accent, 0.14),
            color: tokens.colors.text,
            fontSize: tokens.fontSizes.sm,
            fontWeight: 700,
            textAlign: 'center',
            animation: 'cw-pop 0.4s ease-out',
          }}
        >
          {winners.length === 1
            ? `🏆 ${winners[0]?.name ?? ''} 获胜`
            : `🏆 ${winners.map((team) => team.name).join('、')} 并列第一`}
        </div>
      )}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {completed ? (
          <button
            type="button"
            onClick={() => setCompleted(false)}
            disabled={mode === 'editor'}
            style={secondaryButtonStyle(tokens, mode === 'editor')}
          >
            继续计分
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={mode === 'editor' || maxScore <= 0}
            style={{
              ...primaryButtonStyle(tokens, mode === 'editor' || maxScore <= 0),
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Flag size={14} />
            结束计分
          </button>
        )}
        <button
          type="button"
          onClick={handleReset}
          disabled={mode === 'editor' || (!completed && maxScore <= 0)}
          style={{
            ...secondaryButtonStyle(
              tokens,
              mode === 'editor' || (!completed && maxScore <= 0),
            ),
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
