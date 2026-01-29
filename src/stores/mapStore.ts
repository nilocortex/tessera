import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TileMap } from '../types';
import { MAP_CONSTRAINTS } from '../types';

/** Clamp a value between min and max */
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** Map store state */
interface MapState {
  map: TileMap | null;
}

/** Map store actions */
interface MapActions {
  /** Create a new map with given dimensions (clamped to 8-64) */
  createMap: (width: number, height: number, tileSize?: number) => void;
  /** Clear the current map */
  clearMap: () => void;
  /** Set a tile at the given coordinates */
  setTile: (x: number, y: number, tileId: number) => void;
  /** Get the tile ID at the given coordinates (returns 0 if out of bounds) */
  getTile: (x: number, y: number) => number;
}

type MapStore = MapState & MapActions;

export const useMapStore = create<MapStore>()(
  immer((set, get) => ({
    map: null,

    createMap: (width: number, height: number, tileSize = MAP_CONSTRAINTS.DEFAULT_TILE_SIZE) => {
      const clampedWidth = clamp(width, MAP_CONSTRAINTS.MIN_SIZE, MAP_CONSTRAINTS.MAX_SIZE);
      const clampedHeight = clamp(height, MAP_CONSTRAINTS.MIN_SIZE, MAP_CONSTRAINTS.MAX_SIZE);
      const totalTiles = clampedWidth * clampedHeight;

      set((state) => {
        state.map = {
          width: clampedWidth,
          height: clampedHeight,
          tileSize,
          tiles: new Uint16Array(totalTiles),
        };
      });
    },

    clearMap: () => {
      set((state) => {
        state.map = null;
      });
    },

    setTile: (x: number, y: number, tileId: number) => {
      set((state) => {
        if (!state.map) return;
        if (x < 0 || x >= state.map.width || y < 0 || y >= state.map.height) return;
        
        const index = y * state.map.width + x;
        // Clamp tileId to valid Uint16 range
        state.map.tiles[index] = Math.max(0, Math.min(65535, tileId));
      });
    },

    getTile: (x: number, y: number) => {
      const { map } = get();
      if (!map) return 0;
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) return 0;
      
      const index = y * map.width + x;
      return map.tiles[index];
    },
  }))
);

// Selector helpers for performance
export const selectMap = (state: MapStore) => state.map;
export const selectMapDimensions = (state: MapStore) => 
  state.map ? { width: state.map.width, height: state.map.height } : null;
