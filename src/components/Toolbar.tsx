/**
 * Toolbar component with tool buttons, undo/redo, and view controls.
 * Positioned at top center of the viewport.
 */
import { useState } from 'react';
import { useViewportStore, useToolStore, useHistoryStore, selectCanUndo, selectCanRedo } from '../stores';
import { useHistory, useEditorKeyboard } from '../hooks';
import { NewMapDialog } from './NewMapDialog';
import type { ToolType } from '../types';

interface ToolButton {
  id: ToolType;
  icon: string;
  label: string;
  shortcut: string;
}

const TOOLS: ToolButton[] = [
  { id: 'brush', icon: '🖌️', label: 'Brush', shortcut: 'B' },
  { id: 'fill', icon: '🪣', label: 'Fill', shortcut: 'G' },
  { id: 'eraser', icon: '🧹', label: 'Eraser', shortcut: 'E' },
  { id: 'pan', icon: '✋', label: 'Pan', shortcut: 'H' },
];

export function Toolbar() {
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const { zoom, showGrid, toggleGrid } = useViewportStore();
  const { activeTool, brushSettings, setActiveTool, setBrushSize } = useToolStore();
  const canUndo = useHistoryStore(selectCanUndo);
  const canRedo = useHistoryStore(selectCanRedo);
  const { performUndo, performRedo } = useHistory();

  // Register keyboard shortcuts
  useEditorKeyboard();

  const zoomPercent = Math.round(zoom * 100);

  return (
    <>
      <div className="toolbar">
        {/* File operations */}
        <button
          className="toolbar-btn"
          onClick={() => setShowNewMapDialog(true)}
          title="Create new map"
        >
          📄 New
        </button>

        <div className="toolbar-divider" />

        {/* Undo/Redo */}
        <button
          className="toolbar-btn"
          onClick={performUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩️
        </button>
        <button
          className="toolbar-btn"
          onClick={performRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          ↪️
        </button>

        <div className="toolbar-divider" />

        {/* Tool buttons */}
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            className={`toolbar-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
          </button>
        ))}

        <div className="toolbar-divider" />

        {/* Brush size slider (only show for brush/eraser) */}
        {(activeTool === 'brush' || activeTool === 'eraser') && (
          <div className="toolbar-brush-size">
            <span title="Brush size ([ / ] to adjust)">Size: {brushSettings.size}</span>
            <input
              type="range"
              min={1}
              max={16}
              value={brushSettings.size}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="brush-slider"
            />
          </div>
        )}

        <div className="toolbar-divider" />

        {/* View controls */}
        <button
          className={`toolbar-btn ${showGrid ? 'active' : ''}`}
          onClick={toggleGrid}
          title="Toggle grid (G)"
        >
          {showGrid ? '▦' : '▢'} Grid
        </button>

        <span className="toolbar-zoom" title="Current zoom level">
          🔍 {zoomPercent}%
        </span>
      </div>

      {showNewMapDialog && <NewMapDialog onClose={() => setShowNewMapDialog(false)} />}
    </>
  );
}

export default Toolbar;
