/**
 * Hook for managing undo/redo operations.
 * Connects history store to map store.
 */
import { useCallback } from 'react';
import { useHistoryStore } from '../stores/historyStore';
import { useMapStore } from '../stores/mapStore';
import type { HistoryAction, MapSnapshot } from '../types';

export function useHistory() {
  const { undo, redo, canUndo, canRedo, recordChange, commitPending, pushAction } =
    useHistoryStore();
  const { setTileRaw } = useMapStore();

  /**
   * Restore map from a snapshot (for resize undo)
   */
  const restoreMapSnapshot = useCallback((snapshot: MapSnapshot) => {
    const mapStore = useMapStore.getState();
    const { map } = mapStore;
    if (!map) return;

    // Store current state for redo
    const currentSnapshot: MapSnapshot = {
      width: map.width,
      height: map.height,
      layers: map.layers.map((l) => ({
        id: l.id,
        tiles: new Uint16Array(l.tiles),
      })),
    };

    // Restore the snapshot - need to update via set
    useMapStore.setState((state) => {
      if (!state.map) return state;

      // Restore dimensions
      state.map.width = snapshot.width;
      state.map.height = snapshot.height;

      // Restore each layer's tiles
      for (const snapshotLayer of snapshot.layers) {
        const layer = state.map.layers.find((l) => l.id === snapshotLayer.id);
        if (layer) {
          layer.tiles = new Uint16Array(snapshotLayer.tiles);
        }
      }

      state.map.metadata.modifiedAt = Date.now();

      return state;
    });

    return currentSnapshot;
  }, []);

  /**
   * Apply changes for undo (restore old values)
   */
  const applyUndo = useCallback(
    (action: HistoryAction) => {
      // Handle resize action specially - restore full snapshot
      if (action.type === 'resize' && action.snapshot) {
        return restoreMapSnapshot(action.snapshot);
      }

      // Apply tile changes in reverse order
      for (let i = action.changes.length - 1; i >= 0; i--) {
        const { x, y, oldTileId, layerId } = action.changes[i];
        setTileRaw(x, y, oldTileId, layerId);
      }
      return undefined;
    },
    [setTileRaw, restoreMapSnapshot]
  );

  /**
   * Apply changes for redo (restore new values)
   */
  const applyRedo = useCallback(
    (action: HistoryAction, redoSnapshot?: MapSnapshot) => {
      // Handle resize action specially - restore the "new" state
      if (action.type === 'resize' && redoSnapshot) {
        restoreMapSnapshot(redoSnapshot);
        return;
      }

      for (const { x, y, newTileId, layerId } of action.changes) {
        setTileRaw(x, y, newTileId, layerId);
      }
    },
    [setTileRaw, restoreMapSnapshot]
  );

  /**
   * Perform undo and apply to map
   */
  const performUndo = useCallback(() => {
    const action = undo();
    if (action) {
      const redoSnapshot = applyUndo(action);
      // For resize, update the action's snapshot to point to current state
      // so redo can restore it
      if (action.type === 'resize' && redoSnapshot) {
        // Store in the future stack for redo
        (action as HistoryAction & { redoSnapshot?: MapSnapshot }).redoSnapshot = redoSnapshot;
      }
    }
  }, [undo, applyUndo]);

  /**
   * Perform redo and apply to map
   */
  const performRedo = useCallback(() => {
    const action = redo();
    if (action) {
      const actionWithRedo = action as HistoryAction & { redoSnapshot?: MapSnapshot };
      applyRedo(action, actionWithRedo.redoSnapshot);
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
