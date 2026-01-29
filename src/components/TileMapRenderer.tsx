/**
 * Renders the tile map using PixiJS with multi-layer support.
 * Each layer is rendered in its own container with independent z-order.
 * Supports both basic colored tiles and textured tiles from tilesets.
 */
import { useEffect, useRef, useMemo } from 'react';
import { Graphics, Sprite, Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useMapStore, useViewportStore, useTilesetStore } from '../stores';
import type { Layer, TileMap } from '../types';
import type { Tileset } from '../types/tileset';

interface TileMapRendererProps {
  viewport: Viewport | null;
}

// Colors
const EMPTY_TILE_COLOR = 0x16213e; // Dark blue
const GRID_COLOR = 0x2d3748; // Dark gray for grid lines
const MISSING_TILE_COLOR = 0x9333ea; // Purple for missing tiles

/** Pool of reusable sprites */
class SpritePool {
  private pool: Sprite[] = [];
  private active: Set<Sprite> = new Set();

  get(): Sprite {
    const sprite = this.pool.pop() || new Sprite();
    sprite.visible = true;
    this.active.add(sprite);
    return sprite;
  }

  release(sprite: Sprite): void {
    sprite.visible = false;
    sprite.texture = null!;
    this.active.delete(sprite);
    this.pool.push(sprite);
  }

  releaseAll(): void {
    for (const sprite of this.active) {
      sprite.visible = false;
      sprite.texture = null!;
      this.pool.push(sprite);
    }
    this.active.clear();
  }

  destroy(): void {
    for (const sprite of [...this.pool, ...this.active]) {
      sprite.destroy();
    }
    this.pool = [];
    this.active.clear();
  }
}

/** Renders tiles for a single layer */
function renderLayerTiles(
  container: Container,
  layer: Layer,
  map: TileMap,
  resolveGlobalTileId: (globalId: number) => { tileset: Tileset; localId: number } | null,
  hasTilesets: boolean,
  spritePool: SpritePool
): void {
  const { width, height, tileSize } = map;
  const graphics = new Graphics();
  container.addChild(graphics);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const globalTileId = layer.tiles[index];

      if (globalTileId === 0) continue; // Skip empty tiles

      if (hasTilesets) {
        const resolved = resolveGlobalTileId(globalTileId);

        if (resolved) {
          const { tileset, localId } = resolved;
          const tile = tileset.tiles[localId];

          if (tile?.texture) {
            const sprite = spritePool.get();
            sprite.texture = tile.texture;
            sprite.x = x * tileSize;
            sprite.y = y * tileSize;
            sprite.width = tileSize;
            sprite.height = tileSize;
            container.addChild(sprite);
          }
        } else {
          // Tile ID references missing tileset - draw placeholder
          graphics.rect(x * tileSize, y * tileSize, tileSize, tileSize).fill(MISSING_TILE_COLOR);
        }
      } else {
        // No tilesets - draw colored rectangles
        graphics.rect(x * tileSize, y * tileSize, tileSize, tileSize).fill(0x4a5568);
      }
    }
  }
}

export function TileMapRenderer({ viewport }: TileMapRendererProps) {
  const layerContainersRef = useRef<Map<string, Container>>(new Map());
  const spritePoolsRef = useRef<Map<string, SpritePool>>(new Map());
  const bgGraphicsRef = useRef<Graphics | null>(null);
  const gridGraphicsRef = useRef<Graphics | null>(null);

  const { map } = useMapStore();
  const { showGrid } = useViewportStore();
  const resolveGlobalTileId = useTilesetStore((state) => state.resolveGlobalTileId);
  const tilesets = useTilesetStore((state) => state.tilesets);

  // Memoize tileset availability check
  const hasTilesets = useMemo(() => tilesets.length > 0, [tilesets.length]);

  // Create base graphics for background and grid
  useEffect(() => {
    if (!viewport) return;

    // Create background graphics (rendered below all layers)
    const bgGraphics = new Graphics();
    bgGraphics.zIndex = -1000;
    viewport.addChild(bgGraphics);
    bgGraphicsRef.current = bgGraphics;

    // Create grid graphics (rendered above all layers)
    const gridGraphics = new Graphics();
    gridGraphics.zIndex = 10000;
    viewport.addChild(gridGraphics);
    gridGraphicsRef.current = gridGraphics;

    viewport.sortableChildren = true;

    return () => {
      bgGraphics.destroy();
      bgGraphicsRef.current = null;
      gridGraphics.destroy();
      gridGraphicsRef.current = null;
    };
  }, [viewport]);

  // Render layers when map changes
  useEffect(() => {
    if (!viewport || !map) return;

    const bgGraphics = bgGraphicsRef.current;
    const gridGraphics = gridGraphicsRef.current;
    if (!bgGraphics || !gridGraphics) return;

    const { width, height, tileSize, layers } = map;

    // Clear background and redraw
    bgGraphics.clear();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        bgGraphics.rect(x * tileSize, y * tileSize, tileSize, tileSize).fill(EMPTY_TILE_COLOR);
      }
    }

    // Track which layer IDs are still valid
    const currentLayerIds = new Set(layers.map((l) => l.id));

    // Create/update container per layer
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      let container = layerContainersRef.current.get(layer.id);
      let spritePool = spritePoolsRef.current.get(layer.id);

      if (!container) {
        container = new Container();
        container.label = `layer-${layer.name}`;
        viewport.addChild(container);
        layerContainersRef.current.set(layer.id, container);
      }

      if (!spritePool) {
        spritePool = new SpritePool();
        spritePoolsRef.current.set(layer.id, spritePool);
      }

      // Apply layer properties
      container.visible = layer.visible;
      container.alpha = layer.opacity;
      container.zIndex = i; // Layer index determines z-order

      // Clear and re-render tiles
      spritePool.releaseAll();
      container.removeChildren();

      if (layer.visible) {
        renderLayerTiles(container, layer, map, resolveGlobalTileId, hasTilesets, spritePool);
      }
    }

    // Sort viewport children by zIndex
    viewport.sortChildren();

    // Cleanup removed layers
    for (const [id, container] of layerContainersRef.current) {
      if (!currentLayerIds.has(id)) {
        container.destroy({ children: true });
        layerContainersRef.current.delete(id);
        spritePoolsRef.current.get(id)?.destroy();
        spritePoolsRef.current.delete(id);
      }
    }

    // Draw grid overlay if enabled
    gridGraphics.clear();
    if (showGrid) {
      gridGraphics.setStrokeStyle({ width: 1, color: GRID_COLOR, alpha: 0.5 });

      // Vertical lines
      for (let x = 0; x <= width; x++) {
        gridGraphics.moveTo(x * tileSize, 0).lineTo(x * tileSize, height * tileSize).stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= height; y++) {
        gridGraphics.moveTo(0, y * tileSize).lineTo(width * tileSize, y * tileSize).stroke();
      }
    }

    return () => {
      // Cleanup on unmount
      for (const container of layerContainersRef.current.values()) {
        container.destroy({ children: true });
      }
      layerContainersRef.current.clear();
      for (const pool of spritePoolsRef.current.values()) {
        pool.destroy();
      }
      spritePoolsRef.current.clear();
    };
  }, [viewport, map, map?.version, showGrid, hasTilesets, resolveGlobalTileId, tilesets]);

  // This component doesn't render React elements
  // It manages PixiJS objects imperatively
  return null;
}
