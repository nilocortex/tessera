/**
 * Core type definitions for the tile map system.
 * Uses Uint16Array for memory-efficient tile storage (65,536 tile types).
 */

/** Represents a single layer in the map */
export interface Layer {
  /** Unique identifier for the layer */
  id: string;
  /** Display name of the layer */
  name: string;
  /** Whether the layer is visible */
  visible: boolean;
  /** Whether the layer is locked (prevents editing) */
  locked: boolean;
  /** Layer opacity (0.0 - 1.0) */
  opacity: number;
  /** Flat array of tile IDs stored as Uint16Array for performance */
  tiles: Uint16Array;
}

/** Represents a 2D tile map with multiple layers */
export interface TileMap {
  /** Map width in tiles (8-256) */
  width: number;
  /** Map height in tiles (8-256) */
  height: number;
  /** Size of each tile in pixels */
  tileSize: number;
  /** Array of layers (index determines z-order, 0 = bottom) */
  layers: Layer[];
  /** Currently active layer ID */
  activeLayerId: string;
}

/** Configuration for creating a new map */
export interface MapConfig {
  width: number;
  height: number;
  tileSize: number;
}

/** Tile coordinate */
export interface TileCoord {
  x: number;
  y: number;
}

/** Constants for map constraints */
export const MAP_CONSTRAINTS = {
  MIN_SIZE: 8,
  MAX_SIZE: 256,
  DEFAULT_TILE_SIZE: 32,
  MAX_LAYERS: 20,
} as const;
