/**
 * Tileset loading utility.
 * Loads PNG images as PixiJS textures and extracts individual tile textures.
 */
import { Assets, Texture, Rectangle } from 'pixi.js';
import type { Tileset, TilesetConfig, TileDefinition } from '../types';
import { detectTileSize } from './tileAutoDetect';

/**
 * Extract individual tile textures from a base texture
 */
function extractTiles(
  baseTexture: Texture,
  config: TilesetConfig,
  columns: number,
  rows: number
): TileDefinition[] {
  const tiles: TileDefinition[] = [];
  let id = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = config.margin + col * (config.tileWidth + config.spacing);
      const y = config.margin + row * (config.tileHeight + config.spacing);

      const frame = { x, y, width: config.tileWidth, height: config.tileHeight };

      // Create texture with frame from base texture source
      const texture = new Texture({
        source: baseTexture.source,
        frame: new Rectangle(x, y, config.tileWidth, config.tileHeight),
      });

      tiles.push({ id: id++, frame, texture });
    }
  }

  return tiles;
}

/**
 * Calculate grid dimensions based on tileset config and image size
 */
function calculateGridDimensions(
  imageWidth: number,
  imageHeight: number,
  config: TilesetConfig
): { columns: number; rows: number } {
  const availableWidth = imageWidth - 2 * config.margin + config.spacing;
  const availableHeight = imageHeight - 2 * config.margin + config.spacing;
  const tileWithSpacing = config.tileWidth + config.spacing;
  const tileHeightWithSpacing = config.tileHeight + config.spacing;

  const columns = Math.floor(availableWidth / tileWithSpacing);
  const rows = Math.floor(availableHeight / tileHeightWithSpacing);

  return { columns: Math.max(1, columns), rows: Math.max(1, rows) };
}

/**
 * Load a tileset from a File object.
 * Auto-detects tile dimensions if not provided.
 */
export async function loadTileset(
  file: File,
  config?: Partial<TilesetConfig>
): Promise<Tileset> {
  // Create blob URL for the image
  const imageUrl = URL.createObjectURL(file);

  try {
    // Determine tile configuration
    let tileConfig: TilesetConfig;

    if (config?.tileWidth && config?.tileHeight) {
      // Use provided config
      tileConfig = {
        tileWidth: config.tileWidth,
        tileHeight: config.tileHeight,
        spacing: config.spacing ?? 0,
        margin: config.margin ?? 0,
      };
    } else {
      // Auto-detect
      const detected = await detectTileSize(imageUrl);
      tileConfig = {
        tileWidth: detected.tileWidth,
        tileHeight: detected.tileHeight,
        spacing: detected.spacing,
        margin: detected.margin,
      };
    }

    // Load as PixiJS texture using Assets API
    const baseTexture = await Assets.load<Texture>(imageUrl);

    // Calculate grid dimensions
    const { columns, rows } = calculateGridDimensions(
      baseTexture.width,
      baseTexture.height,
      tileConfig
    );

    // Extract individual tile textures
    const tiles = extractTiles(baseTexture, tileConfig, columns, rows);

    // Create tileset object
    const tileset: Tileset = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^.]+$/, ''), // Remove file extension
      imageUrl,
      ...tileConfig,
      columns,
      rows,
      tileCount: tiles.length,
      baseTexture,
      tiles,
    };

    return tileset;
  } catch (error) {
    // Clean up blob URL on error
    URL.revokeObjectURL(imageUrl);
    throw error;
  }
}

/**
 * Reload a tileset with new configuration (after manual override)
 */
export async function reloadTilesetWithConfig(
  tileset: Tileset,
  newConfig: TilesetConfig
): Promise<Tileset> {
  const { columns, rows } = calculateGridDimensions(
    tileset.baseTexture.width,
    tileset.baseTexture.height,
    newConfig
  );

  // Destroy old tile textures
  tileset.tiles.forEach(tile => tile.texture.destroy());

  // Extract new tiles with updated config
  const tiles = extractTiles(tileset.baseTexture, newConfig, columns, rows);

  return {
    ...tileset,
    ...newConfig,
    columns,
    rows,
    tileCount: tiles.length,
    tiles,
  };
}

/**
 * Clean up tileset resources (call when removing a tileset)
 */
export function destroyTileset(tileset: Tileset): void {
  // Destroy tile textures
  tileset.tiles.forEach(tile => tile.texture.destroy());

  // Destroy base texture
  tileset.baseTexture.destroy(true);

  // Revoke blob URL
  URL.revokeObjectURL(tileset.imageUrl);
}
