/**
 * Hook for handling tool interactions on the canvas.
 * Supports multi-layer editing with layer locking.
 */
import { useCallback, useRef } from 'react';
import { useToolStore } from '../stores/toolStore';
import { useTilesetStore } from '../stores/tilesetStore';
import { useMapStore } from '../stores/mapStore';
import { useHistoryStore } from '../stores/historyStore';
import { getBrushPositions, getLinePositions } from '../tools/brush';
import { floodFill } from '../tools/floodFill';
import type { Position, HistoryActionType } from '../types';

export function useToolHandler() {
  const activeTool = useToolStore((s) => s.activeTool);
  const brushSettings = useToolStore((s) => s.brushSettings);
  const getSelectedGlobalTileId = useTilesetStore((s) => s.getSelectedGlobalTileId);
  const { map, setTileRaw, getTile, canEditLayer, getActiveLayer } = useMapStore();
  const { recordChange, commitPending, pushAction } = useHistoryStore();

  // Track painted tiles during current stroke
  const paintedThisStroke = useRef<Set<string>>(new Set());
  const lastPosition = useRef<Position | null>(null);
  const isDrawing = useRef(false);

  /**
   * Get the current active layer ID
   */
  const getCurrentLayerId = useCallback(() => {
    return map?.activeLayerId || '';
  }, [map?.activeLayerId]);

  /**
   * Check if we can edit the current active layer
   */
  const canEdit = useCallback(() => {
    return canEditLayer();
  }, [canEditLayer]);

  /**
   * Paint a single tile and record change
   */
  const paintTile = useCallback(
    (x: number, y: number, tileId: number, actionType: HistoryActionType) => {
      const layerId = getCurrentLayerId();
      if (!layerId || !canEditLayer(layerId)) return;

      const key = `${x},${y}`;
      if (paintedThisStroke.current.has(key)) return;

      const oldTileId = getTile(x, y, layerId);
      if (oldTileId === tileId) return;

      setTileRaw(x, y, tileId, layerId);
      recordChange({ x, y, layerId, oldTileId, newTileId: tileId }, actionType);
      paintedThisStroke.current.add(key);
    },
    [getCurrentLayerId, canEditLayer, getTile, setTileRaw, recordChange]
  );

  /**
   * Apply brush at position (including all brush-size tiles)
   */
  const applyBrush = useCallback(
    (pos: Position, tileId: number, actionType: HistoryActionType) => {
      if (!map || !canEdit()) return;

      const positions = getBrushPositions(pos.x, pos.y, brushSettings, map.width, map.height);

      for (const p of positions) {
        paintTile(p.x, p.y, tileId, actionType);
      }
    },
    [map, brushSettings, paintTile, canEdit]
  );

  /**
   * Handle pointer down event
   */
  const onPointerDown = useCallback(
    (tilePos: Position) => {
      if (!map) return;

      // Check layer editability for tools that modify tiles
      if ((activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'fill') && !canEdit()) {
        // Layer is locked, don't allow editing
        return;
      }

      const layerId = getCurrentLayerId();

      switch (activeTool) {
        case 'brush': {
          paintedThisStroke.current.clear();
          isDrawing.current = true;
          lastPosition.current = tilePos;
          applyBrush(tilePos, getSelectedGlobalTileId(), 'brush');
          break;
        }

        case 'eraser': {
          paintedThisStroke.current.clear();
          isDrawing.current = true;
          lastPosition.current = tilePos;
          applyBrush(tilePos, 0, 'erase');
          break;
        }

        case 'fill': {
          const newTileId = getSelectedGlobalTileId();
          const filled = floodFill(
            tilePos.x,
            tilePos.y,
            newTileId,
            (x, y) => getTile(x, y, layerId),
            map.width,
            map.height
          );

          if (filled.length > 0) {
            // Record all changes as single action
            const changes = filled.map((p) => ({
              x: p.x,
              y: p.y,
              layerId,
              oldTileId: getTile(p.x, p.y, layerId),
              newTileId,
            }));

            // Apply all changes
            for (const p of filled) {
              setTileRaw(p.x, p.y, newTileId, layerId);
            }

            // Push as single action (not coalesced)
            pushAction({ type: 'fill', changes });
          }
          break;
        }

        case 'pan':
          // Handled by viewport
          break;
      }
    },
    [map, activeTool, applyBrush, getSelectedGlobalTileId, getTile, setTileRaw, pushAction, canEdit, getCurrentLayerId]
  );

  /**
   * Handle pointer move event (during drag)
   */
  const onPointerMove = useCallback(
    (tilePos: Position) => {
      if (!isDrawing.current || !lastPosition.current || !map) return;

      // Don't allow editing if layer is locked
      if (!canEdit()) {
        isDrawing.current = false;
        return;
      }

      if (activeTool === 'brush' || activeTool === 'eraser') {
        const tileId = activeTool === 'brush' ? getSelectedGlobalTileId() : 0;
        const actionType: HistoryActionType = activeTool === 'brush' ? 'brush' : 'erase';

        // Use Bresenham line to fill gaps during fast movement
        const linePositions = getLinePositions(
          lastPosition.current.x,
          lastPosition.current.y,
          tilePos.x,
          tilePos.y
        );

        for (const linePos of linePositions) {
          applyBrush(linePos, tileId, actionType);
        }

        lastPosition.current = tilePos;
      }
    },
    [map, activeTool, getSelectedGlobalTileId, applyBrush, canEdit]
  );

  /**
   * Handle pointer up event
   */
  const onPointerUp = useCallback(() => {
    if (isDrawing.current) {
      commitPending();
      isDrawing.current = false;
      lastPosition.current = null;
      paintedThisStroke.current.clear();
    }
  }, [commitPending]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isDrawing,
    canEdit,
  };
}
