/**
 * Hook for editor keyboard shortcuts.
 * Includes tool shortcuts, undo/redo, and layer management.
 */
import { useEffect } from 'react';
import { useHistory } from './useHistory';
import { useToolStore } from '../stores/toolStore';
import { useMapStore, selectLayers, selectActiveLayerId } from '../stores/mapStore';
import type { ToolType } from '../types';

const TOOL_SHORTCUTS: Record<string, ToolType> = {
  b: 'brush',
  g: 'fill',
  e: 'eraser',
  h: 'pan',
};

export function useEditorKeyboard() {
  const { performUndo, performRedo, canUndo, canRedo } = useHistory();
  const { setActiveTool, setBrushSize, brushSettings } = useToolStore();
  const layers = useMapStore(selectLayers);
  const activeLayerId = useMapStore(selectActiveLayerId);
  const { addLayer, deleteLayer, setActiveLayer, toggleLayerVisibility, toggleLayerLock } = useMapStore();

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

      // Layer shortcuts
      // Ctrl/Cmd + Shift + N: New layer
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        addLayer();
        return;
      }

      // Ctrl/Cmd + Shift + Delete/Backspace: Delete active layer
      if (modKey && e.shiftKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        if (activeLayerId && layers.length > 1) {
          deleteLayer(activeLayerId);
        }
        return;
      }

      // Alt + [ or ]: Navigate layers
      if (e.altKey && (e.key === '[' || e.key === ']')) {
        e.preventDefault();
        if (layers.length > 1 && activeLayerId) {
          const currentIndex = layers.findIndex((l) => l.id === activeLayerId);
          if (currentIndex !== -1) {
            const newIndex = e.key === '[' 
              ? Math.max(0, currentIndex - 1)
              : Math.min(layers.length - 1, currentIndex + 1);
            if (newIndex !== currentIndex) {
              setActiveLayer(layers[newIndex].id);
            }
          }
        }
        return;
      }

      // Ctrl/Cmd + H: Toggle active layer visibility
      if (modKey && e.key.toLowerCase() === 'h' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (activeLayerId) {
          toggleLayerVisibility(activeLayerId);
        }
        return;
      }

      // Ctrl/Cmd + L: Toggle active layer lock
      if (modKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (activeLayerId) {
          toggleLayerLock(activeLayerId);
        }
        return;
      }

      // Tool shortcuts (only if no modifier)
      if (!modKey && !e.altKey && !e.shiftKey) {
        const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
        if (tool) {
          setActiveTool(tool);
          return;
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
    layers,
    activeLayerId,
    addLayer,
    deleteLayer,
    setActiveLayer,
    toggleLayerVisibility,
    toggleLayerLock,
  ]);
}
