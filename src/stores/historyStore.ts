/**
 * History store for undo/redo with delta compression and action coalescing.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { HistoryAction, TileChange, HistoryActionType } from '../types';

const MAX_HISTORY_SIZE = 100;
const COALESCE_WINDOW_MS = 50;

interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];
  pendingAction: HistoryAction | null;
  lastChangeTime: number;
}

interface HistoryActions {
  /** Record a single tile change, coalescing rapid changes */
  recordChange: (change: TileChange, actionType: HistoryActionType) => void;
  /** Force-commit any pending action (call on pointer up) */
  commitPending: () => void;
  /** Push a complete action (for non-coalesced operations like fill) */
  pushAction: (action: Omit<HistoryAction, 'id' | 'timestamp'>) => void;
  /** Undo last action, returns the action to reverse */
  undo: () => HistoryAction | null;
  /** Redo next action, returns the action to apply */
  redo: () => HistoryAction | null;
  /** Clear all history */
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** Get history stats for debugging */
  getStats: () => { undoLevels: number; redoLevels: number; totalChanges: number };
}

type HistoryStore = HistoryState & HistoryActions;

export const useHistoryStore = create<HistoryStore>()(
  immer((set, get) => ({
    past: [],
    future: [],
    pendingAction: null,
    lastChangeTime: 0,

    recordChange: (change, actionType) => {
      const now = Date.now();

      set((state) => {
        const timeDelta = now - state.lastChangeTime;

        // Check if we should coalesce with pending action
        if (
          state.pendingAction &&
          state.pendingAction.type === actionType &&
          timeDelta < COALESCE_WINDOW_MS
        ) {
          // Check for duplicate position (don't record same tile twice in same stroke)
          const isDuplicate = state.pendingAction.changes.some(
            (c) => c.x === change.x && c.y === change.y && c.layerId === change.layerId
          );
          if (!isDuplicate) {
            state.pendingAction.changes.push(change);
          }
        } else {
          // Commit pending action and start new one
          if (state.pendingAction && state.pendingAction.changes.length > 0) {
            state.past.push(state.pendingAction);
            // Trim history if exceeds max size
            while (state.past.length > MAX_HISTORY_SIZE) {
              state.past.shift();
            }
          }

          // Clear redo stack on new action
          state.future = [];

          state.pendingAction = {
            id: crypto.randomUUID(),
            type: actionType,
            timestamp: now,
            changes: [change],
          };
        }

        state.lastChangeTime = now;
      });
    },

    commitPending: () =>
      set((state) => {
        if (state.pendingAction && state.pendingAction.changes.length > 0) {
          state.past.push(state.pendingAction);
          while (state.past.length > MAX_HISTORY_SIZE) {
            state.past.shift();
          }
          state.pendingAction = null;
        }
      }),

    pushAction: (actionData) =>
      set((state) => {
        // First commit any pending action
        if (state.pendingAction && state.pendingAction.changes.length > 0) {
          state.past.push(state.pendingAction);
          state.pendingAction = null;
        }

        // Clear redo stack
        state.future = [];

        // Add new action
        const action: HistoryAction = {
          ...actionData,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        state.past.push(action);

        // Trim history
        while (state.past.length > MAX_HISTORY_SIZE) {
          state.past.shift();
        }
      }),

    undo: () => {
      // Commit any pending changes first
      get().commitPending();

      if (get().past.length === 0) return null;

      let action: HistoryAction | undefined;

      set((state) => {
        action = state.past.pop();
        if (action) {
          state.future.push(action);
        }
      });

      return action || null;
    },

    redo: () => {
      const { future } = get();
      if (future.length === 0) return null;

      let action: HistoryAction | undefined;

      set((state) => {
        action = state.future.pop();
        if (action) {
          state.past.push(action);
        }
      });

      return action || null;
    },

    clear: () =>
      set((state) => {
        state.past = [];
        state.future = [];
        state.pendingAction = null;
      }),

    canUndo: () => {
      const state = get();
      return state.past.length > 0 || (state.pendingAction?.changes.length ?? 0) > 0;
    },

    canRedo: () => get().future.length > 0,

    getStats: () => {
      const { past, future, pendingAction } = get();
      const totalChanges =
        past.reduce((sum, a) => sum + a.changes.length, 0) + (pendingAction?.changes.length ?? 0);
      return {
        undoLevels: past.length + (pendingAction ? 1 : 0),
        redoLevels: future.length,
        totalChanges,
      };
    },
  }))
);

// Selectors
export const selectCanUndo = (state: HistoryStore) =>
  state.past.length > 0 || (state.pendingAction?.changes.length ?? 0) > 0;
export const selectCanRedo = (state: HistoryStore) => state.future.length > 0;
