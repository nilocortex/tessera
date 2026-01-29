/**
 * Hook for editor keyboard shortcuts.
 */
import { useEffect } from 'react';
import { useHistory } from './useHistory';
import { useToolStore } from '../stores/toolStore';
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

      // Tool shortcuts
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performUndo, performRedo, canUndo, canRedo, setActiveTool, setBrushSize, brushSettings.size]);
}
