import { useEffect } from 'react';
import { useHistory } from './useHistory';

/**
 * Hook that registers global keyboard shortcuts for the editor.
 * - Ctrl/Cmd+Z: Undo
 * - Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z: Redo
 */
export function useEditorKeyboard() {
  const { performUndo, performRedo, canUndo, canRedo } = useHistory();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) performUndo();
      } else if (modKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) performRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performUndo, performRedo, canUndo, canRedo]);
}
