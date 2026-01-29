import { useState } from 'react';
import { useMapStore } from '../stores';
import { MAP_CONSTRAINTS } from '../types';

interface NewMapDialogProps {
  onClose: () => void;
}

const PRESETS = [
  { label: '8×8', width: 8, height: 8 },
  { label: '16×16', width: 16, height: 16 },
  { label: '32×32', width: 32, height: 32 },
  { label: '64×64', width: 64, height: 64 },
] as const;

/**
 * Dialog for creating a new map with preset or custom dimensions.
 */
export function NewMapDialog({ onClose }: NewMapDialogProps) {
  const createMap = useMapStore((state) => state.createMap);
  const [width, setWidth] = useState(16);
  const [height, setHeight] = useState(16);

  const clamp = (value: number) =>
    Math.max(MAP_CONSTRAINTS.MIN_SIZE, Math.min(MAP_CONSTRAINTS.MAX_SIZE, value));

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleCreate = () => {
    createMap(width, height);
    onClose();
  };

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

  const totalTiles = width * height;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">New Map</h2>

        <div className="dialog-section">
          <label className="dialog-label">Presets</label>
          <div className="preset-buttons">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                className={`preset-btn ${
                  width === preset.width && height === preset.height ? 'active' : ''
                }`}
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="dialog-section">
          <label className="dialog-label">Custom Size</label>
          <div className="size-inputs">
            <div className="input-group">
              <label htmlFor="map-width">Width</label>
              <input
                id="map-width"
                type="number"
                min={MAP_CONSTRAINTS.MIN_SIZE}
                max={MAP_CONSTRAINTS.MAX_SIZE}
                value={width}
                onChange={handleWidthChange}
              />
            </div>
            <span className="size-separator">×</span>
            <div className="input-group">
              <label htmlFor="map-height">Height</label>
              <input
                id="map-height"
                type="number"
                min={MAP_CONSTRAINTS.MIN_SIZE}
                max={MAP_CONSTRAINTS.MAX_SIZE}
                value={height}
                onChange={handleHeightChange}
              />
            </div>
          </div>
          <p className="tile-count">Total: {totalTiles.toLocaleString()} tiles</p>
        </div>

        <div className="dialog-actions">
          <button className="dialog-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="dialog-btn create" onClick={handleCreate}>
            Create Map
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewMapDialog;
