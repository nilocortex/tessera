/**
 * Modal dialog for resizing the map with anchor point selection.
 * Preserves existing tiles based on the chosen anchor position.
 */
import { useState, useEffect } from 'react';
import { useMapStore, calculateResizeOffset } from '../stores/mapStore';
import type { ResizeAnchor } from '../types';
import { MAP_CONSTRAINTS } from '../types';

interface ResizeMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ANCHORS: { id: ResizeAnchor; label: string; row: number; col: number }[] = [
  { id: 'top-left', label: '↖', row: 0, col: 0 },
  { id: 'top', label: '↑', row: 0, col: 1 },
  { id: 'top-right', label: '↗', row: 0, col: 2 },
  { id: 'left', label: '←', row: 1, col: 0 },
  { id: 'center', label: '•', row: 1, col: 1 },
  { id: 'right', label: '→', row: 1, col: 2 },
  { id: 'bottom-left', label: '↙', row: 2, col: 0 },
  { id: 'bottom', label: '↓', row: 2, col: 1 },
  { id: 'bottom-right', label: '↘', row: 2, col: 2 },
];

export function ResizeMapModal({ isOpen, onClose }: ResizeMapModalProps) {
  const { map, resizeMap } = useMapStore();

  const [width, setWidth] = useState(map?.width ?? 32);
  const [height, setHeight] = useState(map?.height ?? 32);
  const [anchor, setAnchor] = useState<ResizeAnchor>('center');

  // Reset values when modal opens
  useEffect(() => {
    if (isOpen && map) {
      setWidth(map.width);
      setHeight(map.height);
      setAnchor('center');
    }
  }, [isOpen, map]);

  if (!isOpen || !map) return null;

  const handleResize = () => {
    resizeMap(width, height, anchor);
    onClose();
  };

  const hasChanges = width !== map.width || height !== map.height;
  const isShrinking = width < map.width || height < map.height;

  const clamp = (value: number) =>
    Math.max(MAP_CONSTRAINTS.MIN_SIZE, Math.min(MAP_CONSTRAINTS.MAX_SIZE, value));

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setWidth(clamp(value));
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setHeight(clamp(value));
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog resize-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Resize Map</h2>

        <div className="dialog-section">
          <div className="current-size">
            Current: {map.width} × {map.height} tiles
          </div>
        </div>

        <div className="dialog-section">
          <label className="dialog-label">New Size</label>
          <div className="size-inputs">
            <div className="input-group">
              <label htmlFor="resize-width">Width</label>
              <input
                id="resize-width"
                type="number"
                min={MAP_CONSTRAINTS.MIN_SIZE}
                max={MAP_CONSTRAINTS.MAX_SIZE}
                value={width}
                onChange={handleWidthChange}
              />
            </div>
            <span className="size-separator">×</span>
            <div className="input-group">
              <label htmlFor="resize-height">Height</label>
              <input
                id="resize-height"
                type="number"
                min={MAP_CONSTRAINTS.MIN_SIZE}
                max={MAP_CONSTRAINTS.MAX_SIZE}
                value={height}
                onChange={handleHeightChange}
              />
            </div>
          </div>
        </div>

        <div className="dialog-section">
          <label className="dialog-label">Anchor Point</label>
          <div className="anchor-grid">
            {ANCHORS.map((a) => (
              <button
                key={a.id}
                className={`anchor-btn ${anchor === a.id ? 'active' : ''}`}
                onClick={() => setAnchor(a.id)}
                title={a.id.replace('-', ' ')}
                style={{
                  gridRow: a.row + 1,
                  gridColumn: a.col + 1,
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="anchor-description">
            Content anchored to the {anchor.replace('-', ' ')}
          </p>
        </div>

        <div className="dialog-section">
          <label className="dialog-label">Preview</label>
          <ResizePreview
            oldWidth={map.width}
            oldHeight={map.height}
            newWidth={width}
            newHeight={height}
            anchor={anchor}
          />
        </div>

        {isShrinking && (
          <div className="warning-box">
            ⚠️ Tiles outside the new bounds will be deleted.
          </div>
        )}

        <div className="dialog-actions">
          <button className="dialog-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="dialog-btn create"
            onClick={handleResize}
            disabled={!hasChanges}
          >
            Resize
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Visual preview showing how old bounds map to new bounds.
 */
function ResizePreview({
  oldWidth,
  oldHeight,
  newWidth,
  newHeight,
  anchor,
}: {
  oldWidth: number;
  oldHeight: number;
  newWidth: number;
  newHeight: number;
  anchor: ResizeAnchor;
}) {
  const maxDim = Math.max(oldWidth, oldHeight, newWidth, newHeight);
  const containerSize = 100;
  const scale = (containerSize - 10) / maxDim;

  const offset = calculateResizeOffset(oldWidth, oldHeight, newWidth, newHeight, anchor);

  // Calculate positions centered in container
  const newW = newWidth * scale;
  const newH = newHeight * scale;
  const oldW = oldWidth * scale;
  const oldH = oldHeight * scale;

  // New bounds always centered
  const newX = (containerSize - newW) / 2;
  const newY = (containerSize - newH) / 2;

  // Old bounds offset from new
  const oldX = newX + offset.x * scale;
  const oldY = newY + offset.y * scale;

  return (
    <div
      className="resize-preview"
      style={{
        width: containerSize,
        height: containerSize,
        position: 'relative',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '4px',
        margin: '8px auto',
      }}
    >
      {/* New bounds (background) */}
      <div
        style={{
          position: 'absolute',
          left: newX,
          top: newY,
          width: newW,
          height: newH,
          background: 'rgba(100, 100, 120, 0.3)',
          border: '2px dashed #666',
          borderRadius: '2px',
        }}
      />
      {/* Old bounds (overlay) - existing content */}
      <div
        style={{
          position: 'absolute',
          left: oldX,
          top: oldY,
          width: oldW,
          height: oldH,
          background: 'rgba(59, 130, 246, 0.5)',
          border: '2px solid #3b82f6',
          borderRadius: '2px',
        }}
      />
      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: -24,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          fontSize: '0.65rem',
          color: '#94a3b8',
        }}
      >
        <span>
          <span style={{ color: '#3b82f6' }}>■</span> Current
        </span>
        <span>
          <span style={{ color: '#666' }}>□</span> New
        </span>
      </div>
    </div>
  );
}

export default ResizeMapModal;
