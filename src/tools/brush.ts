/**
 * Brush tool logic for painting tiles.
 * Supports variable brush size with Bresenham line interpolation.
 */
import type { Position, BrushSettings } from '../types';

/**
 * Get all tile positions affected by brush at given center
 */
export function getBrushPositions(
  centerX: number,
  centerY: number,
  settings: BrushSettings,
  mapWidth: number,
  mapHeight: number
): Position[] {
  const positions: Position[] = [];
  const radius = Math.floor(settings.size / 2);
  const isOdd = settings.size % 2 === 1;

  // Adjust center for even-sized brushes
  const offsetX = isOdd ? 0 : 0.5;
  const offsetY = isOdd ? 0 : 0.5;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = centerX + dx;
      const y = centerY + dy;

      // Check bounds
      if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) continue;

      // Check shape
      if (settings.shape === 'circle') {
        const dist = Math.sqrt(Math.pow(dx + offsetX, 2) + Math.pow(dy + offsetY, 2));
        if (dist > radius + 0.5) continue;
      }

      positions.push({ x, y });
    }
  }

  return positions;
}

/**
 * Bresenham line algorithm to fill gaps during fast brush movement
 */
export function getLinePositions(x0: number, y0: number, x1: number, y1: number): Position[] {
  const positions: Position[] = [];

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    positions.push({ x, y });

    if (x === x1 && y === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return positions;
}
