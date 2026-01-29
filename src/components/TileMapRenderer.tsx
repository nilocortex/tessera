/**
 * Renders the tile map using PixiJS.
 * Supports both basic colored tiles and textured tiles from tilesets.
 * Uses sprite pooling for efficient rendering.
 */
import { useEffect, useRef, useMemo } from 'react';
import { Graphics, Sprite, Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useMapStore, useViewportStore, useTilesetStore } from '../stores';

interface TileMapRendererProps {
  viewport: Viewport | null;
}

// Colors
const EMPTY_TILE_COLOR = 0x16213e; // Dark blue
const GRID_COLOR = 0x2d3748; // Dark gray for grid lines

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

export function TileMapRenderer({ viewport }: TileMapRendererProps) {
  const graphicsRef = useRef<Graphics | null>(null);
  const containerRef = useRef<Container | null>(null);
  const spritePoolRef = useRef<SpritePool | null>(null);

  const { map } = useMapStore();
  const { showGrid } = useViewportStore();
  const resolveGlobalTileId = useTilesetStore((state) => state.resolveGlobalTileId);
  const tilesets = useTilesetStore((state) => state.tilesets);

  // Memoize tileset availability check
  const hasTilesets = useMemo(() => tilesets.length > 0, [tilesets.length]);

  // Create graphics and container, add to viewport
  useEffect(() => {
    if (!viewport) return;

    // Create sprite pool
    spritePoolRef.current = new SpritePool();

    // Create container for tile sprites
    const container = new Container();
    container.sortableChildren = false;
    viewport.addChild(container);
    containerRef.current = container;

    // Create graphics for grid and empty tiles
    const graphics = new Graphics();
    viewport.addChild(graphics);
    graphicsRef.current = graphics;

    return () => {
      spritePoolRef.current?.destroy();
      spritePoolRef.current = null;
      container.destroy({ children: true });
      containerRef.current = null;
      graphics.destroy();
      graphicsRef.current = null;
    };
  }, [viewport]);

  // Redraw tiles when map, tilesets, or grid state changes
  useEffect(() => {
    const graphics = graphicsRef.current;
    const container = containerRef.current;
    const spritePool = spritePoolRef.current;

    if (!graphics || !container || !spritePool || !map) return;

    const { width, height, tileSize, tiles } = map;

    // Clear previous drawings
    graphics.clear();
    spritePool.releaseAll();

    // Draw empty tile background first
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const globalTileId = tiles[index];

        if (globalTileId === 0 || !hasTilesets) {
          // Empty tile - draw background
          graphics
            .rect(x * tileSize, y * tileSize, tileSize, tileSize)
            .fill(EMPTY_TILE_COLOR);
        }
      }
    }

    // Draw textured tiles
    if (hasTilesets) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = y * width + x;
          const globalTileId = tiles[index];

          if (globalTileId !== 0) {
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
              graphics
                .rect(x * tileSize, y * tileSize, tileSize, tileSize)
                .fill(0x9333ea); // Purple for missing tiles
            }
          }
        }
      }
    }

    // Draw grid overlay if enabled
    if (showGrid) {
      graphics.setStrokeStyle({ width: 1, color: GRID_COLOR, alpha: 0.5 });

      // Vertical lines
      for (let x = 0; x <= width; x++) {
        graphics
          .moveTo(x * tileSize, 0)
          .lineTo(x * tileSize, height * tileSize)
          .stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= height; y++) {
        graphics
          .moveTo(0, y * tileSize)
          .lineTo(width * tileSize, y * tileSize)
          .stroke();
      }
    }
  }, [map, showGrid, hasTilesets, resolveGlobalTileId, tilesets]);

  // This component doesn't render React elements
  // It manages PixiJS objects imperatively
  return null;
}
