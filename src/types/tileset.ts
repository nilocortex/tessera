/**
 * Type definitions for tileset system.
 * Supports multiple tilesets with global tile ID mapping (Tiled-compatible).
 */
import type { Texture } from 'pixi.js';

/** Individual tile within a tileset */
export interface TileDefinition {
  /** Local tile ID within tileset (0-indexed) */
  id: number;
  /** Frame coordinates in the tileset image */
  frame: { x: number; y: number; width: number; height: number };
  /** PixiJS texture with frame */
  texture: Texture;
}

/** A loaded tileset with extracted tile textures */
export interface Tileset {
  /** Unique identifier */
  id: string;
  /** Display name (from filename) */
  name: string;
  /** Blob URL for the image */
  imageUrl: string;
  /** Width of each tile in pixels */
  tileWidth: number;
  /** Height of each tile in pixels */
  tileHeight: number;
  /** Pixels between tiles */
  spacing: number;
  /** Pixels from tileset edges */
  margin: number;
  /** Number of tile columns */
  columns: number;
  /** Number of tile rows */
  rows: number;
  /** Total number of tiles */
  tileCount: number;
  /** Full tileset texture */
  baseTexture: Texture;
  /** Extracted tile textures */
  tiles: TileDefinition[];
}

/** Configuration for tileset import */
export interface TilesetConfig {
  tileWidth: number;
  tileHeight: number;
  spacing: number;
  margin: number;
}

/** Result of auto-detection algorithm */
export interface AutoDetectResult extends TilesetConfig {
  /** Confidence score 0.0 - 1.0 */
  confidence: number;
}

/** Reference to a tileset with global ID mapping */
export interface TilesetReference {
  tilesetId: string;
  /** First global tile ID for this tileset */
  firstGid: number;
}

/** Resolved tile information from global ID */
export interface ResolvedTile {
  tileset: Tileset;
  localId: number;
}
