/**
 * Hook for managing undo/redo operations.
 * Connects history store to map store.
 */
import { useCallback } from 'react';
import { useHistoryStore } from '../stores/historyStore';
import { useMapStore } from '../stores/mapStore';
import type { HistoryAction } from '../types';

export function useHistory() {
  const { undo, redo, canUndo, canRedo, recordChange, commitPending, pushAction } =
    useHistoryStore();
  const { setTileRaw } = useMapStore();

  /**
   * Apply changes for undo (restore old values)
   */
  const applyUndo = useCallback(
    (action: HistoryAction) => {
      // Apply in reverse order
      for (let i = action.changes.length - 1; i >= 0; i--) {
        const { x, y, oldTileId } = action.changes[i];
        setTileRaw(x, y, oldTileId);
      }
    },
    [setTileRaw]
  );

  /**
   * Apply changes for redo (restore new values)
   */
  const applyRedo = useCallback(
    (action: HistoryAction) => {
      for (const { x, y, newTileId } of action.changes) {
        setTileRaw(x, y, newTileId);
      }
    },
    [setTileRaw]
  );

  /**
   * Perform undo and apply to map
   */
  const performUndo = useCallback(() => {
    const action = undo();
    if (action) {
      applyUndo(action);
    }
  }, [undo, applyUndo]);

  /**
   * Perform redo and apply to map
   */
  const performRedo = useCallback(() => {
    const action = redo();
    if (action) {
      applyRedo(action);
    }
  }, [redo, applyRedo]);

  return {
    performUndo,
    performRedo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    recordChange,
    commitPending,
    pushAction,
  };
}
