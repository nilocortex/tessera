/**
 * Modal for importing tilesets with auto-detection and manual override.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTilesetStore } from '../stores';
import { detectTileSize } from '../utils';
import type { TilesetConfig, AutoDetectResult } from '../types';

interface TilesetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
}

export function TilesetImportModal({ isOpen, onClose, file }: TilesetImportModalProps) {
  const [config, setConfig] = useState<TilesetConfig>({
    tileWidth: 16,
    tileHeight: 16,
    spacing: 0,
    margin: 0,
  });
  const [detected, setDetected] = useState<AutoDetectResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { importTileset } = useTilesetStore();

  // Auto-detect when file changes
  useEffect(() => {
    if (!file) {
      setPreview(null);
      setDetected(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    setIsLoading(true);

    detectTileSize(url)
      .then((result) => {
        setDetected(result);
        setConfig({
          tileWidth: result.tileWidth,
          tileHeight: result.tileHeight,
          spacing: result.spacing,
          margin: result.margin,
        });
      })
      .finally(() => setIsLoading(false));

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Draw preview with grid overlay
  useEffect(() => {
    if (!preview || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Scale to fit preview area
      const maxSize = 400;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw grid overlay
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.7)';
      ctx.lineWidth = 1;

      const tileW = config.tileWidth * scale;
      const tileH = config.tileHeight * scale;
      const spacing = config.spacing * scale;
      const margin = config.margin * scale;

      // Vertical lines
      let x = margin;
      while (x < canvas.width) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        x += tileW + spacing;
      }

      // Horizontal lines
      let y = margin;
      while (y < canvas.height) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        y += tileH + spacing;
      }
    };
    img.src = preview;
  }, [preview, config]);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setIsImporting(true);
    try {
      await importTileset(file, config);
      onClose();
    } catch (error) {
      console.error('Failed to import tileset:', error);
    } finally {
      setIsImporting(false);
    }
  }, [file, config, importTileset, onClose]);

  const updateConfig = useCallback((key: keyof TilesetConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: Math.max(1, value) }));
  }, []);

  if (!isOpen) return null;

  const confidencePercent = detected ? Math.round(detected.confidence * 100) : 0;
  const confidenceColor =
    confidencePercent >= 70 ? '#22c55e' : confidencePercent >= 50 ? '#eab308' : '#ef4444';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal import-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Import Tileset</h2>

        {file && (
          <p className="file-name">
            <strong>File:</strong> {file.name}
          </p>
        )}

        <div className="import-content">
          {/* Preview Canvas */}
          <div className="preview-section">
            {isLoading ? (
              <div className="loading">Analyzing tileset...</div>
            ) : (
              <canvas ref={canvasRef} className="preview-canvas" />
            )}
          </div>

          {/* Configuration */}
          <div className="config-section">
            {detected && (
              <div className="detection-info">
                <span>Auto-detection confidence: </span>
                <span style={{ color: confidenceColor, fontWeight: 'bold' }}>
                  {confidencePercent}%
                </span>
              </div>
            )}

            <div className="config-grid">
              <label>
                Tile Width
                <input
                  type="number"
                  min="1"
                  max="256"
                  value={config.tileWidth}
                  onChange={(e) => updateConfig('tileWidth', parseInt(e.target.value) || 16)}
                />
              </label>

              <label>
                Tile Height
                <input
                  type="number"
                  min="1"
                  max="256"
                  value={config.tileHeight}
                  onChange={(e) => updateConfig('tileHeight', parseInt(e.target.value) || 16)}
                />
              </label>

              <label>
                Spacing
                <input
                  type="number"
                  min="0"
                  max="32"
                  value={config.spacing}
                  onChange={(e) => updateConfig('spacing', parseInt(e.target.value) || 0)}
                />
              </label>

              <label>
                Margin
                <input
                  type="number"
                  min="0"
                  max="32"
                  value={config.margin}
                  onChange={(e) => updateConfig('margin', parseInt(e.target.value) || 0)}
                />
              </label>
            </div>

            <div className="quick-sizes">
              <span>Quick sizes:</span>
              {[8, 16, 32, 64].map((size) => (
                <button
                  key={size}
                  type="button"
                  className="quick-size-btn"
                  onClick={() => setConfig((c) => ({ ...c, tileWidth: size, tileHeight: size }))}
                >
                  {size}×{size}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={isImporting}>
            Cancel
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleImport}
            disabled={!file || isLoading || isImporting}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
