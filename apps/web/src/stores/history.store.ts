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
}

interface HistoryActions {
  record: (courseware: Courseware) => void;
  undo: (current: Courseware) => HistorySnapshot | null;
  redo: () => HistorySnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

const MAX_HISTORY = 50;

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

    record: (courseware) => {
      const snapshot = makeSnapshot(courseware);
      set((state) => {
        state.past.push(snapshot);
        if (state.past.length > MAX_HISTORY) {
          state.past.shift();
        }
        state.future = [];
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
      });

      return next;
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    clear: () => {
      set((state) => {
        state.past = [];
        state.future = [];
      });
    },
  })),
);

export function useHistory() {
  return useHistoryStore();
}
