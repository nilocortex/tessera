import { useState } from 'react';
import { useViewportStore } from '../stores';
import { useHistoryStore, selectCanUndo, selectCanRedo } from '../stores/historyStore';
import { useHistory } from '../hooks/useHistory';
import { NewMapDialog } from './NewMapDialog';

/**
 * Toolbar component with map creation, undo/redo, and view controls.
 * Positioned at top center of the viewport.
 */
export function Toolbar() {
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const { zoom, showGrid, toggleGrid } = useViewportStore();
  const canUndo = useHistoryStore(selectCanUndo);
  const canRedo = useHistoryStore(selectCanRedo);
  const { performUndo, performRedo } = useHistory();

  const zoomPercent = Math.round(zoom * 100);

  return (
    <>
      <div className="toolbar">
        <button
          className="toolbar-btn"
          onClick={() => setShowNewMapDialog(true)}
          title="Create new map"
        >
          📄 New Map
        </button>

        <div className="toolbar-divider" />

        <button
          className="toolbar-btn"
          onClick={performUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩️ Undo
        </button>

        <button
          className="toolbar-btn"
          onClick={performRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          ↪️ Redo
        </button>

        <div className="toolbar-divider" />

        <button
          className={`toolbar-btn ${showGrid ? 'active' : ''}`}
          onClick={toggleGrid}
          title="Toggle grid (G)"
        >
          {showGrid ? '▦' : '▢'} Grid
        </button>

        <div className="toolbar-divider" />

        <span className="toolbar-zoom" title="Current zoom level">
          🔍 {zoomPercent}%
        </span>
      </div>

      {showNewMapDialog && (
        <NewMapDialog onClose={() => setShowNewMapDialog(false)} />
      )}
    </>
  );
}

export default Toolbar;
