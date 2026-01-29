import { useEffect, useCallback } from 'react';
import { useMapStore, useViewportStore } from './stores';
import { useEditorKeyboard } from './hooks';
import { Canvas, Toolbar, TilePalette, LayerPanel } from './components';
import './App.css';

function App() {
  const { map, createMap } = useMapStore();
  const { toggleGrid } = useViewportStore();

  // Register undo/redo keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEditorKeyboard();

  // Initialize a default map on mount
  useEffect(() => {
    if (!map) {
      createMap(16, 16, 32);
    }
  }, [map, createMap]);

  // Update window title with map name
  useEffect(() => {
    const name = map?.metadata?.name ?? 'Tessera';
    document.title = name === 'Tessera' ? 'Tessera' : `${name} - Tessera`;
  }, [map?.metadata?.name]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if focus is in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'g':
          toggleGrid();
          break;
      }
    },
    [toggleGrid]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="app">
      <Toolbar />
      <div className="app-content">
        <aside className="app-sidebar">
          <TilePalette />
          <LayerPanel />
        </aside>
        <main className="app-main">
          <Canvas />
        </main>
      </div>
    </div>
  );
}

export default App;
