import { useEffect, useCallback } from 'react';
import { useMapStore, useViewportStore } from './stores';
import { Canvas, Toolbar } from './components';
import './App.css';

function App() {
  const { map, createMap } = useMapStore();
  const { toggleGrid } = useViewportStore();

  // Initialize a default map on mount
  useEffect(() => {
    if (!map) {
      createMap(16, 16, 32);
    }
  }, [map, createMap]);

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
      <main className="app-main">
        <Canvas />
      </main>
    </div>
  );
}

export default App;
