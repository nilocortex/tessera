/**
 * Toolbar component with tool buttons, undo/redo, clipboard, and view controls.
 * Positioned at top center of the viewport.
 */
import { useState, useCallback } from 'react';
import {
  useViewportStore,
  useToolStore,
  useHistoryStore,
  useSelectionStore,
  useMapStore,
  selectCanUndo,
  selectCanRedo,
  selectHasSelection,
  selectHasClipboard,
  selectIsFloating,
} from '../stores';
import { useHistory, useEditorKeyboard } from '../hooks';
import { NewMapDialog } from './NewMapDialog';
import { ResizeMapModal } from './ResizeMapModal';
import { MapPropertiesModal } from './MapPropertiesModal';
import type { ToolType } from '../types';

interface ToolButton {
  id: ToolType;
  icon: string;
  label: string;
  shortcut: string;
}

const TOOLS: ToolButton[] = [
  { id: 'select', icon: '⬚', label: 'Select', shortcut: 'M' },
  { id: 'brush', icon: '🖌️', label: 'Brush', shortcut: 'B' },
  { id: 'fill', icon: '🪣', label: 'Fill', shortcut: 'G' },
  { id: 'eraser', icon: '🧹', label: 'Eraser', shortcut: 'E' },
  { id: 'pan', icon: '✋', label: 'Pan', shortcut: 'H' },
];

export function Toolbar() {
  const [showNewMapDialog, setShowNewMapDialog] = useState(false);
  const [showResizeModal, setShowResizeModal] = useState(false);
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const { zoom, showGrid, toggleGrid } = useViewportStore();
  const map = useMapStore((state) => state.map);
  const { activeTool, brushSettings, setActiveTool, setBrushSize } = useToolStore();
  const canUndo = useHistoryStore(selectCanUndo);
  const canRedo = useHistoryStore(selectCanRedo);
  const { performUndo, performRedo } = useHistory();

  // Selection store
  const hasSelection = useSelectionStore(selectHasSelection);
  const hasClipboard = useSelectionStore(selectHasClipboard);
  const isFloating = useSelectionStore(selectIsFloating);
  const { copy, cut, paste, commitSelection } = useSelectionStore();
  const { setTileRaw, getTile } = useMapStore();
  const { pushAction } = useHistoryStore();

  // Register keyboard shortcuts
  useEditorKeyboard();

  const zoomPercent = Math.round(zoom * 100);

  /**
   * Handle cut with undo support
   */
  const handleCut = useCallback(() => {
    const { selection: sel } = useSelectionStore.getState();
    if (!sel || sel.floating) return;

    const { bounds, layerId } = sel;
    const changes = [];
    for (let dy = 0; dy < bounds.height; dy++) {
      for (let dx = 0; dx < bounds.width; dx++) {
        const x = bounds.x + dx;
        const y = bounds.y + dy;
        const oldTileId = getTile(x, y, layerId);
        if (oldTileId !== 0) {
          changes.push({ x, y, layerId, oldTileId, newTileId: 0 });
        }
      }
    }

    cut(setTileRaw);

    if (changes.length > 0) {
      pushAction({ type: 'cut', changes });
    }
  }, [cut, setTileRaw, getTile, pushAction]);

  /**
   * Handle paste with floating selection support
   */
  const handlePaste = useCallback(() => {
    if (!useSelectionStore.getState().hasClipboard()) return;

    // Commit any existing floating selection first
    const { selection: sel } = useSelectionStore.getState();
    if (sel?.floating) {
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
            const oldTileId = getTile(x, y, layerId);
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
    }

    // Paste at current selection position or (0,0)
    const pasteX = sel?.bounds.x ?? 0;
    const pasteY = sel?.bounds.y ?? 0;
    paste(pasteX, pasteY);
  }, [paste, commitSelection, setTileRaw, getTile, pushAction]);

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
        <button
          className="toolbar-btn"
          onClick={() => setShowResizeModal(true)}
          disabled={!map}
          title="Resize map"
        >
          📐 Resize
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setShowPropertiesModal(true)}
          disabled={!map}
          title="Map properties"
        >
          ⚙️ Properties
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

        {/* Clipboard operations */}
        <button
          className="toolbar-btn"
          onClick={copy}
          disabled={!hasSelection}
          title="Copy (Ctrl+C)"
        >
          📋
        </button>
        <button
          className="toolbar-btn"
          onClick={handleCut}
          disabled={!hasSelection || isFloating}
          title="Cut (Ctrl+X)"
        >
          ✂️
        </button>
        <button
          className="toolbar-btn"
          onClick={handlePaste}
          disabled={!hasClipboard}
          title="Paste (Ctrl+V)"
        >
          📥
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
      <ResizeMapModal
        isOpen={showResizeModal}
        onClose={() => setShowResizeModal(false)}
      />
      <MapPropertiesModal
        isOpen={showPropertiesModal}
        onClose={() => setShowPropertiesModal(false)}
      />
    </>
  );
}

export default Toolbar;
