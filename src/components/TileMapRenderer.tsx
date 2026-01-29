/**
 * Renders the tile map using PixiJS Graphics
 * Uses v8 API: .rect().fill() instead of .beginFill().drawRect()
 */
import { useEffect, useRef } from 'react';
import { Graphics } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { useMapStore, useViewportStore } from '../stores';

interface TileMapRendererProps {
  viewport: Viewport | null;
}

// Colors
const EMPTY_TILE_COLOR = 0x16213e;  // Dark blue
const FILLED_TILE_COLOR = 0x4a5568; // Gray
const GRID_COLOR = 0x2d3748;        // Dark gray for grid lines

export function TileMapRenderer({ viewport }: TileMapRendererProps) {
  const graphicsRef = useRef<Graphics | null>(null);
  const { map } = useMapStore();
  const { showGrid } = useViewportStore();

  // Create graphics object and add to viewport
  useEffect(() => {
    if (!viewport) return;

    const graphics = new Graphics();
    viewport.addChild(graphics);
    graphicsRef.current = graphics;

    return () => {
      graphics.destroy();
      graphicsRef.current = null;
    };
  }, [viewport]);

  // Redraw tiles when map or grid state changes
  useEffect(() => {
    const graphics = graphicsRef.current;
    if (!graphics || !map) return;

    const { width, height, tileSize, tiles } = map;

    // Clear previous drawings
    graphics.clear();

    // Draw tiles
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const tileValue = tiles[index];
        const color = tileValue === 0 ? EMPTY_TILE_COLOR : FILLED_TILE_COLOR;

        // PixiJS v8 API: .rect().fill()
        graphics
          .rect(x * tileSize, y * tileSize, tileSize, tileSize)
          .fill(color);
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
  }, [map, showGrid]);

  // This component doesn't render React elements
  // It manages the Graphics object imperatively
  return null;
}
