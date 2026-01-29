/**
 * Core type definitions for the tile map system.
 * Uses Uint16Array for memory-efficient tile storage (65,536 tile types).
 */

/** Represents a 2D tile map with configurable dimensions */
export interface TileMap {
  /** Map width in tiles (8-64) */
  width: number;
  /** Map height in tiles (8-64) */
  height: number;
  /** Size of each tile in pixels */
  tileSize: number;
  /** Flat array of tile IDs stored as Uint16Array for performance */
  tiles: Uint16Array;
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
  MAX_SIZE: 64,
  DEFAULT_TILE_SIZE: 32,
} as const;
