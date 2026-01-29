/**
 * Tabs for switching between loaded tilesets.
 */
import type { Tileset } from '../types';

interface TilesetTabsProps {
  tilesets: Tileset[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function TilesetTabs({ tilesets, activeId, onSelect, onRemove }: TilesetTabsProps) {
  if (tilesets.length === 0) return null;

  return (
    <div className="tileset-tabs">
      {tilesets.map((tileset) => (
        <div
          key={tileset.id}
          className={`tileset-tab ${tileset.id === activeId ? 'active' : ''}`}
          onClick={() => onSelect(tileset.id)}
        >
          <span className="tab-name" title={tileset.name}>
            {tileset.name}
          </span>
          <span className="tab-info">
            {tileset.tileWidth}×{tileset.tileHeight}
          </span>
          <button
            type="button"
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(tileset.id);
            }}
            title="Remove tileset"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
