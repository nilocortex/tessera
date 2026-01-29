/**
 * Tileset store for managing multiple tilesets and tile selection.
 * Uses global tile IDs (Tiled-compatible): 0 = empty, 1+ = actual tiles.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Tileset, TilesetConfig, ResolvedTile } from '../types';
import { loadTileset, destroyTileset, reloadTilesetWithConfig } from '../utils/tilesetLoader';

/** Tileset store state */
interface TilesetState {
  /** All loaded tilesets */
  tilesets: Tileset[];
  /** Currently active tileset ID */
  activeTilesetId: string | null;
  /** Selected tile (local ID in active tileset) */
  selectedTileId: number;
  /** Multi-tile selection for brush patterns (future) */
  selectedTileIds: number[];
}

/** Tileset store actions */
interface TilesetActions {
  /** Import a tileset from a file */
  importTileset: (file: File, config?: Partial<TilesetConfig>) => Promise<Tileset>;
  /** Remove a tileset by ID */
  removeTileset: (id: string) => void;
  /** Update tileset configuration and reload tiles */
  updateTilesetConfig: (id: string, config: TilesetConfig) => Promise<void>;
  /** Set the active tileset */
  setActiveTileset: (id: string) => void;
  /** Select a single tile */
  selectTile: (localId: number) => void;
  /** Select a range of tiles (for brush patterns) */
  selectTileRange: (startId: number, endId: number) => void;
  /** Convert local tile ID to global tile ID */
  getGlobalTileId: (tilesetId: string, localId: number) => number;
  /** Resolve global tile ID to tileset and local ID */
  resolveGlobalTileId: (globalId: number) => ResolvedTile | null;
  /** Get currently selected global tile ID */
  getSelectedGlobalTileId: () => number;
}

type TilesetStore = TilesetState & TilesetActions;

export const useTilesetStore = create<TilesetStore>()(
  immer((set, get) => ({
    tilesets: [],
    activeTilesetId: null,
    selectedTileId: 0,
    selectedTileIds: [0],

    importTileset: async (file, config) => {
      const tileset = await loadTileset(file, config);

      set((state) => {
        state.tilesets.push(tileset);
        // Auto-select first tileset if none active
        if (!state.activeTilesetId) {
          state.activeTilesetId = tileset.id;
        }
      });

      return tileset;
    },

    removeTileset: (id) => {
      const { tilesets } = get();
      const tileset = tilesets.find((t) => t.id === id);

      if (tileset) {
        // Clean up resources
        destroyTileset(tileset);

        set((state) => {
          const index = state.tilesets.findIndex((t) => t.id === id);
          if (index !== -1) {
            state.tilesets.splice(index, 1);
          }
          // Update active tileset if removed
          if (state.activeTilesetId === id) {
            state.activeTilesetId = state.tilesets[0]?.id || null;
            state.selectedTileId = 0;
            state.selectedTileIds = [0];
          }
        });
      }
    },

    updateTilesetConfig: async (id, config) => {
      const { tilesets } = get();
      const tileset = tilesets.find((t) => t.id === id);

      if (tileset) {
        const updated = await reloadTilesetWithConfig(tileset, config);

        set((state) => {
          const index = state.tilesets.findIndex((t) => t.id === id);
          if (index !== -1) {
            state.tilesets[index] = updated;
          }
        });
      }
    },

    setActiveTileset: (id) => {
      set((state) => {
        state.activeTilesetId = id;
        state.selectedTileId = 0;
        state.selectedTileIds = [0];
      });
    },

    selectTile: (localId) => {
      set((state) => {
        state.selectedTileId = localId;
        state.selectedTileIds = [localId];
      });
    },

    selectTileRange: (startId, endId) => {
      const { tilesets, activeTilesetId } = get();
      const tileset = tilesets.find((t) => t.id === activeTilesetId);
      if (!tileset) return;

      // Convert 1D IDs to 2D coordinates for rectangular selection
      const startRow = Math.floor(startId / tileset.columns);
      const startCol = startId % tileset.columns;
      const endRow = Math.floor(endId / tileset.columns);
      const endCol = endId % tileset.columns;

      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);

      const ids: number[] = [];
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          ids.push(row * tileset.columns + col);
        }
      }

      set((state) => {
        state.selectedTileIds = ids;
        state.selectedTileId = startId;
      });
    },

    getGlobalTileId: (tilesetId, localId) => {
      const { tilesets } = get();
      let firstGid = 1; // 0 = empty tile

      for (const ts of tilesets) {
        if (ts.id === tilesetId) {
          return firstGid + localId;
        }
        firstGid += ts.tileCount;
      }

      return 0; // Not found
    },

    resolveGlobalTileId: (globalId) => {
      if (globalId === 0) return null;

      const { tilesets } = get();
      let firstGid = 1;

      for (const ts of tilesets) {
        if (globalId >= firstGid && globalId < firstGid + ts.tileCount) {
          return { tileset: ts, localId: globalId - firstGid };
        }
        firstGid += ts.tileCount;
      }

      return null; // Not found
    },

    getSelectedGlobalTileId: () => {
      const { tilesets, activeTilesetId, selectedTileId } = get();
      if (!activeTilesetId) return 0;

      let firstGid = 1;
      for (const ts of tilesets) {
        if (ts.id === activeTilesetId) {
          return firstGid + selectedTileId;
        }
        firstGid += ts.tileCount;
      }

      return 0;
    },
  }))
);

// Selectors for common operations
export const selectActiveTileset = (state: TilesetStore) =>
  state.tilesets.find((t) => t.id === state.activeTilesetId) || null;

export const selectSelectedTileTexture = (state: TilesetStore) => {
  const tileset = state.tilesets.find((t) => t.id === state.activeTilesetId);
  return tileset?.tiles[state.selectedTileId]?.texture || null;
};

export const selectTilesetCount = (state: TilesetStore) => state.tilesets.length;
