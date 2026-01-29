/**
 * Hook for editor keyboard shortcuts including selection/clipboard operations.
 */
import { useEffect, useCallback } from 'react';
import { useHistory } from './useHistory';
import { useToolStore } from '../stores/toolStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useMapStore } from '../stores/mapStore';
import { useHistoryStore } from '../stores/historyStore';
import type { ToolType } from '../types';

const TOOL_SHORTCUTS: Record<string, ToolType> = {
  b: 'brush',
  g: 'fill',
  e: 'eraser',
  h: 'pan',
  m: 'select', // M for marquee selection
  s: 'select', // S also works
};

export function useEditorKeyboard() {
  const { performUndo, performRedo, canUndo, canRedo } = useHistory();
  const { setActiveTool, setBrushSize, brushSettings } = useToolStore();
  
  // Selection store
  const {
    copy,
    cut,
    paste,
    clearSelection,
    selectAll,
    commitSelection,
    selection,
    moveSelection,
  } = useSelectionStore();
  
  const { map, setTileRaw, getTile } = useMapStore();
  const { pushAction } = useHistoryStore();

  const currentLayerId = 'default'; // Will be dynamic with layer system

  /**
   * Commit floating selection with undo support
   */
  const commitFloatingWithUndo = useCallback(() => {
    const { selection: sel } = useSelectionStore.getState();
    if (!sel?.floating) return;

    const { bounds, tiles, layerId, offsetX, offsetY } = sel;
    const targetX = bounds.x + offsetX;
    const targetY = bounds.y + offsetY;
    const changes = [];

    for (let dy = 0; dy < bounds.height; dy++) {
      for (let dx = 0; dx < bounds.width; dx++) {
        const newTileId = tiles[dy * bounds.width + dx];
        if (newTileId !== 0) {
          const x = targetX + dx;
          const y = targetY + dy;
          const oldTileId = getTile(x, y);
          if (oldTileId !== newTileId) {
            changes.push({ x, y, layerId, oldTileId, newTileId });
          }
        }
      }
    }

    commitSelection(setTileRaw);

    if (changes.length > 0) {
      pushAction({ type: 'paste', changes });
    }
  }, [getTile, setTileRaw, commitSelection, pushAction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo/Redo
      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) performUndo();
        return;
      }
      if (modKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) performRedo();
        return;
      }

      // Copy (Ctrl+C)
      if (modKey && e.key === 'c') {
        e.preventDefault();
        copy();
        return;
      }

      // Cut (Ctrl+X)
      if (modKey && e.key === 'x') {
        e.preventDefault();
        const { selection: sel } = useSelectionStore.getState();
        if (sel && !sel.floating) {
          // Record cut as undoable action
          const { bounds, layerId } = sel;
          const changes = [];
          for (let dy = 0; dy < bounds.height; dy++) {
            for (let dx = 0; dx < bounds.width; dx++) {
              const x = bounds.x + dx;
              const y = bounds.y + dy;
              const oldTileId = getTile(x, y);
              if (oldTileId !== 0) {
                changes.push({ x, y, layerId, oldTileId, newTileId: 0 });
              }
            }
          }

          cut(setTileRaw);

          if (changes.length > 0) {
            pushAction({ type: 'cut', changes });
          }
        }
        return;
      }

      // Paste (Ctrl+V)
      if (modKey && e.key === 'v') {
        e.preventDefault();
        if (useSelectionStore.getState().hasClipboard()) {
          // Commit any existing floating selection first
          const { selection: sel } = useSelectionStore.getState();
          if (sel?.floating) {
            commitFloatingWithUndo();
          }

          // Paste at current selection position or (0,0)
          const pasteX = sel?.bounds.x ?? 0;
          const pasteY = sel?.bounds.y ?? 0;
          paste(pasteX, pasteY);
        }
        return;
      }

      // Select All (Ctrl+A)
      if (modKey && e.key === 'a') {
        e.preventDefault();
        if (map) {
          selectAll(map.width, map.height, getTile, currentLayerId);
        }
        return;
      }

      // Escape - clear selection or commit floating
      if (e.key === 'Escape') {
        const { selection: sel } = useSelectionStore.getState();
        if (sel?.floating) {
          commitFloatingWithUndo();
        } else {
          clearSelection();
        }
        return;
      }

      // Enter - commit floating selection
      if (e.key === 'Enter') {
        const { selection: sel } = useSelectionStore.getState();
        if (sel?.floating) {
          commitFloatingWithUndo();
        }
        return;
      }

      // Delete - clear selection contents
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selection: sel } = useSelectionStore.getState();
        if (sel && !sel.floating) {
          e.preventDefault();
          const { bounds, layerId } = sel;
          const changes = [];

          for (let dy = 0; dy < bounds.height; dy++) {
            for (let dx = 0; dx < bounds.width; dx++) {
              const x = bounds.x + dx;
              const y = bounds.y + dy;
              const oldTileId = getTile(x, y);
              if (oldTileId !== 0) {
                setTileRaw(x, y, 0);
                changes.push({ x, y, layerId, oldTileId, newTileId: 0 });
              }
            }
          }

          if (changes.length > 0) {
            pushAction({ type: 'erase', changes });
          }
          clearSelection();
          return;
        }
      }

      // Arrow keys - move floating selection by 1 tile
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const { selection: sel } = useSelectionStore.getState();
        if (sel?.floating) {
          e.preventDefault();
          const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
          const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
          moveSelection(dx, dy);
          return;
        }
      }

      // Tool shortcuts (only if no modifier key)
      if (!modKey) {
        const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
        if (tool) {
          setActiveTool(tool);
          return;
        }
      }

      // Brush size with [ and ]
      if (e.key === '[') {
        setBrushSize(brushSettings.size - 1);
        return;
      }
      if (e.key === ']') {
        setBrushSize(brushSettings.size + 1);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    performUndo,
    performRedo,
    canUndo,
    canRedo,
    setActiveTool,
    setBrushSize,
    brushSettings.size,
    copy,
    cut,
    paste,
    clearSelection,
    selectAll,
    moveSelection,
    commitFloatingWithUndo,
    map,
    getTile,
    setTileRaw,
    pushAction,
    currentLayerId,
  ]);
}
