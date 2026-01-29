/**
 * Span-based flood fill algorithm (4-way connectivity).
 * Much faster than recursive and won't stack overflow.
 */
import type { Position } from '../types';

interface FillSpan {
  x1: number; // start x (inclusive)
  x2: number; // end x (inclusive)
  y: number;
  dy: number; // direction to scan next
}

function scanLineForSpans(
  leftX: number,
  rightX: number,
  y: number,
  dy: number,
  targetTileId: number,
  getTile: (x: number, y: number) => number,
  filledSet: Set<string>,
  stack: FillSpan[],
  mapWidth: number,
  mapHeight: number
): void {
  if (y < 0 || y >= mapHeight) return;

  const key = (x: number, y: number) => `${x},${y}`;
  let spanStart = -1;

  for (let x = leftX; x <= rightX; x++) {
    const matchesTarget = getTile(x, y) === targetTileId && !filledSet.has(key(x, y));

    if (matchesTarget) {
      if (spanStart < 0) spanStart = x;
    } else {
      if (spanStart >= 0) {
        stack.push({ x1: spanStart, x2: x - 1, y, dy });
        spanStart = -1;
      }
    }
  }

  // Close final span
  if (spanStart >= 0) {
    stack.push({ x1: spanStart, x2: rightX, y, dy });
  }
}

/**
 * Span-based flood fill algorithm (4-way connectivity)
 *
 * @returns Array of positions that were filled
 */
export function floodFill(
  startX: number,
  startY: number,
  newTileId: number,
  getTile: (x: number, y: number) => number,
  mapWidth: number,
  mapHeight: number
): Position[] {
  const targetTileId = getTile(startX, startY);

  // Don't fill if already the target tile
  if (targetTileId === newTileId) return [];

  // Track filled positions
  const filled: Position[] = [];
  const filledSet = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  // Stack of spans to process
  const stack: FillSpan[] = [];

  // Initial spans going both up and down
  stack.push({ x1: startX, x2: startX, y: startY, dy: 1 });
  stack.push({ x1: startX, x2: startX, y: startY - 1, dy: -1 });

  while (stack.length > 0) {
    const { x1, x2, y, dy } = stack.pop()!;

    // Skip out of bounds rows
    if (y < 0 || y >= mapHeight) continue;

    let x = x1;

    // Extend left while target tile matches
    while (x >= 0 && getTile(x, y) === targetTileId && !filledSet.has(key(x, y))) {
      filled.push({ x, y });
      filledSet.add(key(x, y));
      x--;
    }
    const leftX = x + 1;

    // Extend right from x1 + 1
    x = x1 + 1;
    while (x < mapWidth && getTile(x, y) === targetTileId && !filledSet.has(key(x, y))) {
      filled.push({ x, y });
      filledSet.add(key(x, y));
      x++;
    }
    const rightX = x - 1;

    // Skip if we didn't fill anything on this row
    if (leftX > rightX) continue;

    // Scan line above/below for new spans
    scanLineForSpans(
      leftX,
      rightX,
      y + dy,
      dy,
      targetTileId,
      getTile,
      filledSet,
      stack,
      mapWidth,
      mapHeight
    );

    // Check for overhangs (where we extended beyond parent span)
    if (leftX < x1) {
      scanLineForSpans(
        leftX,
        x1 - 1,
        y - dy,
        -dy,
        targetTileId,
        getTile,
        filledSet,
        stack,
        mapWidth,
        mapHeight
      );
    }
    if (rightX > x2) {
      scanLineForSpans(
        x2 + 1,
        rightX,
        y - dy,
        -dy,
        targetTileId,
        getTile,
        filledSet,
        stack,
        mapWidth,
        mapHeight
      );
    }
  }

  return filled;
}
