import { useCallback } from 'react';
import { useHistoryStore } from '../stores/historyStore';
import { useMapStore } from '../stores/mapStore';
import type { HistoryAction, HistoryActionType } from '../types';

/**
 * Hook for managing undo/redo operations.
 * Connects history store to map store.
 */
export function useHistory() {
  const { undo, redo, canUndo, canRedo, recordChange, commitPending, pushAction } = useHistoryStore();
  const { setTileRaw, getTile } = useMapStore();

  /**
   * Apply changes for undo (restore old values)
   */
  const applyUndo = useCallback((action: HistoryAction) => {
    // Apply in reverse order
    for (let i = action.changes.length - 1; i >= 0; i--) {
      const { x, y, layerId, oldTileId } = action.changes[i];
      setTileRaw(x, y, oldTileId, layerId);
    }
  }, [setTileRaw]);

  /**
   * Apply changes for redo (restore new values)
   */
  const applyRedo = useCallback((action: HistoryAction) => {
    for (const { x, y, layerId, newTileId } of action.changes) {
      setTileRaw(x, y, newTileId, layerId);
    }
  }, [setTileRaw]);

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

  /**
   * Record a tile change with old value lookup
   */
  const recordTileChange = useCallback((
    x: number, 
    y: number, 
    newTileId: number, 
    layerId: string,
    actionType: HistoryActionType
  ) => {
    const oldTileId = getTile(x, y, layerId);
    if (oldTileId !== newTileId) {
      recordChange({ x, y, layerId, oldTileId, newTileId }, actionType);
    }
  }, [getTile, recordChange]);

  return {
    performUndo,
    performRedo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    recordTileChange,
    commitPending,
    pushAction,
  };
}
