/**
 * Hook for handling tool interactions on the canvas.
 * Supports multi-layer editing with layer locking and selection tools.
 */
import { useCallback, useRef } from 'react';
import { useToolStore } from '../stores/toolStore';
import { useTilesetStore } from '../stores/tilesetStore';
import { useMapStore } from '../stores/mapStore';
import { useHistoryStore } from '../stores/historyStore';
import { useSelectionStore } from '../stores/selectionStore';
import { getBrushPositions, getLinePositions } from '../tools/brush';
import { floodFill } from '../tools/floodFill';
import type { Position, HistoryActionType, Bounds } from '../types';

function isPointInBounds(point: Position, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x < bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y < bounds.y + bounds.height
  );
}

export function useToolHandler() {
  const activeTool = useToolStore((s) => s.activeTool);
  const brushSettings = useToolStore((s) => s.brushSettings);
  const getSelectedGlobalTileId = useTilesetStore((s) => s.getSelectedGlobalTileId);
  const { map, setTileRaw, getTile, canEditLayer } = useMapStore();
  const { recordChange, commitPending, pushAction } = useHistoryStore();

  // Selection store
  const {
    startDrag,
    updateDrag,
    endDrag,
    selection,
    moveSelection,
    commitSelection,
    getSelectionBounds,
  } = useSelectionStore();

  // Track painted tiles during current stroke
  const paintedThisStroke = useRef<Set<string>>(new Set());
  const lastPosition = useRef<Position | null>(null);
  const isDrawing = useRef(false);

  // Track selection drag start for moving floating selections
  const selectionDragStart = useRef<Position | null>(null);
  const isMovingSelection = useRef(false);

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

      const layerId = getCurrentLayerId();

      switch (activeTool) {
        case 'select': {
          // Check if clicking on existing floating selection
          if (selection?.floating) {
            const bounds = getSelectionBounds();
            if (bounds && isPointInBounds(tilePos, bounds)) {
              // Start moving the selection
              selectionDragStart.current = tilePos;
              isMovingSelection.current = true;
              return;
            } else {
              // Clicked outside - commit floating selection and start new selection
              const { bounds, tiles, layerId: selLayerId, offsetX, offsetY } = selection;
              const targetX = bounds.x + offsetX;
              const targetY = bounds.y + offsetY;
              const changes = [];

              for (let dy = 0; dy < bounds.height; dy++) {
                for (let dx = 0; dx < bounds.width; dx++) {
                  const newTileId = tiles[dy * bounds.width + dx];
                  if (newTileId !== 0) {
                    const x = targetX + dx;
                    const y = targetY + dy;
                    const oldTileId = getTile(x, y, selLayerId);
                    if (oldTileId !== newTileId) {
                      changes.push({ x, y, layerId: selLayerId, oldTileId, newTileId });
                    }
                  }
                }
              }

              commitSelection(setTileRaw);

              if (changes.length > 0) {
                pushAction({ type: 'paste', changes });
              }
            }
          }

          // Start new selection drag
          startDrag(tilePos.x, tilePos.y);
          break;
        }

        case 'brush': {
          if (!canEdit()) return;
          paintedThisStroke.current.clear();
          isDrawing.current = true;
          lastPosition.current = tilePos;
          applyBrush(tilePos, getSelectedGlobalTileId(), 'brush');
          break;
        }

        case 'eraser': {
          if (!canEdit()) return;
          paintedThisStroke.current.clear();
          isDrawing.current = true;
          lastPosition.current = tilePos;
          applyBrush(tilePos, 0, 'erase');
          break;
        }

        case 'fill': {
          if (!canEdit()) return;
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
    [
      map,
      activeTool,
      applyBrush,
      getSelectedGlobalTileId,
      getTile,
      setTileRaw,
      pushAction,
      canEdit,
      getCurrentLayerId,
      selection,
      startDrag,
      commitSelection,
      getSelectionBounds,
    ]
  );

  /**
   * Handle pointer move event (during drag)
   */
  const onPointerMove = useCallback(
    (tilePos: Position) => {
      if (!map) return;

      // Handle selection tool
      if (activeTool === 'select') {
        const { isDragging: selDragging, selection: sel } = useSelectionStore.getState();

        if (selDragging) {
          updateDrag(tilePos.x, tilePos.y);
        } else if (sel?.floating && isMovingSelection.current && selectionDragStart.current) {
          // Move floating selection
          const dx = tilePos.x - selectionDragStart.current.x;
          const dy = tilePos.y - selectionDragStart.current.y;
          if (dx !== 0 || dy !== 0) {
            moveSelection(dx, dy);
            selectionDragStart.current = tilePos;
          }
        }
        return;
      }

      if (!isDrawing.current || !lastPosition.current) return;

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
    [map, activeTool, getSelectedGlobalTileId, applyBrush, canEdit, updateDrag, moveSelection]
  );

  /**
   * Handle pointer up event
   */
  const onPointerUp = useCallback(() => {
    // Handle selection tool
    if (activeTool === 'select') {
      const { isDragging: selDragging } = useSelectionStore.getState();
      const layerId = getCurrentLayerId();
      if (selDragging) {
        endDrag((x, y, lid) => getTile(x, y, lid), layerId);
      }
      selectionDragStart.current = null;
      isMovingSelection.current = false;
      return;
    }

    if (isDrawing.current) {
      commitPending();
      isDrawing.current = false;
      lastPosition.current = null;
      paintedThisStroke.current.clear();
    }
  }, [commitPending, activeTool, endDrag, getTile, getCurrentLayerId]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isDrawing,
    canEdit,
  };
}
