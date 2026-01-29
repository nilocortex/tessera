/**
 * Visual tile palette for browsing and selecting tiles from tilesets.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useTilesetStore, selectActiveTileset } from '../stores';
import { TilesetTabs } from './TilesetTabs';
import { TilesetImportModal } from './TilesetImportModal';
import type { TileDefinition } from '../types';

/** Tile thumbnail component that renders to canvas */
function TileThumbnail({
  tile,
  selected,
  onClick,
  onShiftClick,
  displaySize,
}: {
  tile: TileDefinition;
  selected: boolean;
  onClick: () => void;
  onShiftClick: () => void;
  displaySize: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tile.texture) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get the texture source (which is a canvas or image)
    const source = tile.texture.source;
    if (!source.resource) return;

    // Draw the frame portion of the texture
    const { x, y, width, height } = tile.frame;

    // Clear and draw scaled
    ctx.clearRect(0, 0, displaySize, displaySize);
    ctx.imageSmoothingEnabled = false;

    try {
      ctx.drawImage(
        source.resource as CanvasImageSource,
        x,
        y,
        width,
        height,
        0,
        0,
        displaySize,
        displaySize
      );
    } catch {
      // Fallback if texture isn't ready
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, displaySize, displaySize);
    }
  }, [tile.texture, tile.frame, displaySize]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) {
        onShiftClick();
      } else {
        onClick();
      }
    },
    [onClick, onShiftClick]
  );

  return (
    <canvas
      ref={canvasRef}
      className={`tile-thumb ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      width={displaySize}
      height={displaySize}
      title={`Tile ${tile.id}`}
    />
  );
}

/** Prompt shown when no tilesets are loaded */
function TilesetImportPrompt({ onImport }: { onImport: () => void }) {
  return (
    <div className="tileset-import-prompt">
      <p>No tileset loaded</p>
      <button type="button" onClick={onImport}>
        Import Tileset
      </button>
    </div>
  );
}

export function TilePalette() {
  const {
    tilesets,
    activeTilesetId,
    selectedTileId,
    selectedTileIds,
    selectTile,
    selectTileRange,
    setActiveTileset,
    removeTileset,
  } = useTilesetStore();

  const activeTileset = useTilesetStore(selectActiveTileset);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate display size based on tile size (min 24px, max 48px)
  const displaySize = activeTileset
    ? Math.max(24, Math.min(48, activeTileset.tileWidth))
    : 32;

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setIsModalOpen(true);
    }
    // Reset input
    e.target.value = '';
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setImportFile(null);
  }, []);

  const handleTileClick = useCallback(
    (tileId: number) => {
      selectTile(tileId);
    },
    [selectTile]
  );

  const handleTileShiftClick = useCallback(
    (tileId: number) => {
      selectTileRange(selectedTileId, tileId);
    },
    [selectedTileId, selectTileRange]
  );

  if (tilesets.length === 0) {
    return (
      <div className="tile-palette empty">
        <TilesetImportPrompt onImport={handleImportClick} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/gif,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <TilesetImportModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          file={importFile}
        />
      </div>
    );
  }

  return (
    <div className="tile-palette">
      {/* Header with import button */}
      <div className="palette-header">
        <span className="palette-title">Tiles</span>
        <button
          type="button"
          className="import-btn"
          onClick={handleImportClick}
          title="Import tileset"
        >
          +
        </button>
      </div>

      {/* Tileset tabs */}
      <TilesetTabs
        tilesets={tilesets}
        activeId={activeTilesetId}
        onSelect={setActiveTileset}
        onRemove={removeTileset}
      />

      {/* Tile grid */}
      {activeTileset && (
        <div className="tile-grid-container">
          <div
            className="tile-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${activeTileset.columns}, ${displaySize}px)`,
              gap: '1px',
            }}
          >
            {activeTileset.tiles.map((tile) => (
              <TileThumbnail
                key={tile.id}
                tile={tile}
                selected={selectedTileIds.includes(tile.id)}
                onClick={() => handleTileClick(tile.id)}
                onShiftClick={() => handleTileShiftClick(tile.id)}
                displaySize={displaySize}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selection info */}
      {activeTileset && (
        <div className="palette-info">
          <span>Selected: {selectedTileIds.length > 1 ? `${selectedTileIds.length} tiles` : `#${selectedTileId}`}</span>
          <span>Total: {activeTileset.tileCount}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Import modal */}
      <TilesetImportModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        file={importFile}
      />
    </div>
  );
}
