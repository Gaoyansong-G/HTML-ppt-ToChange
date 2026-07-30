import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Courseware } from '@courseware/shared';
import { useEditorStore } from './editor.store';

interface HistorySnapshot {
  courseware: Courseware;
  currentSlideId: string | null;
}

interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  lastCoalesceKey: string | null;
  lastRecordedAt: number;
}

interface HistoryActions {
  record: (courseware: Courseware, coalesceKey?: string) => void;
  undo: (current: Courseware) => HistorySnapshot | null;
  redo: () => HistorySnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

const MAX_HISTORY = 50;
const COALESCE_WINDOW_MS = 1000;

function cloneCourseware(courseware: Courseware): Courseware {
  return JSON.parse(JSON.stringify(courseware));
}

function makeSnapshot(courseware: Courseware): HistorySnapshot {
  return {
    courseware: cloneCourseware(courseware),
    currentSlideId: useEditorStore.getState().currentSlideId,
  };
}

export const useHistoryStore = create<HistoryState & HistoryActions>()(
  immer((set, get) => ({
    past: [],
    future: [],
    lastCoalesceKey: null,
    lastRecordedAt: 0,

    record: (courseware, coalesceKey) => {
      const snapshot = makeSnapshot(courseware);
      const now = Date.now();
      const scopedCoalesceKey = coalesceKey ? `${courseware.id}:${coalesceKey}` : null;

      set((state) => {
        if (
          scopedCoalesceKey &&
          state.lastCoalesceKey === scopedCoalesceKey &&
          now - state.lastRecordedAt <= COALESCE_WINDOW_MS
        ) {
          // Keep the first snapshot of a continuous field edit so one undo
          // restores the value from before the user started typing.
          state.lastRecordedAt = now;
          state.future = [];
          return;
        }

        const latest = state.past[state.past.length - 1];
        if (
          latest &&
          latest.currentSlideId === snapshot.currentSlideId &&
          JSON.stringify(latest.courseware) === JSON.stringify(snapshot.courseware)
        ) {
          state.lastCoalesceKey = scopedCoalesceKey;
          state.lastRecordedAt = now;
          state.future = [];
          return;
        }

        state.past.push(snapshot);
        if (state.past.length > MAX_HISTORY) {
          state.past.shift();
        }
        state.future = [];
        state.lastCoalesceKey = scopedCoalesceKey;
        state.lastRecordedAt = now;
      });
    },

    undo: (current) => {
      const state = get();
      if (state.past.length === 0) return null;

      const currentSnapshot = makeSnapshot(current);
      const previous = state.past[state.past.length - 1];

      set((s) => {
        s.past.pop();
        s.future.push(currentSnapshot);
        s.lastCoalesceKey = null;
        s.lastRecordedAt = 0;
      });

      return previous;
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return null;

      const next = state.future[state.future.length - 1];
      set((s) => {
        s.future.pop();
        s.past.push({
          courseware: cloneCourseware(next.courseware),
          currentSlideId: next.currentSlideId,
        });
        s.lastCoalesceKey = null;
        s.lastRecordedAt = 0;
      });

      return next;
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    clear: () => {
      set((state) => {
        state.past = [];
        state.future = [];
        state.lastCoalesceKey = null;
        state.lastRecordedAt = 0;
      });
    },
  })),
);

export function useHistory() {
  return useHistoryStore();
}
