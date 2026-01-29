/**
 * Auto-detection algorithm for tile dimensions.
 * Analyzes transparent pixel patterns to detect tile boundaries.
 */
import type { AutoDetectResult } from '../types';

/** Common tile sizes to try as fallback */
const COMMON_SIZES = [8, 16, 24, 32, 48, 64];

/** Default timeout for auto-detection (ms) */
const DETECT_TIMEOUT = 5000;

/**
 * Load an image from URL and return HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

/**
 * Get image data from loaded image
 */
function getImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Find columns that are fully transparent (alpha < threshold)
 */
function findTransparentColumns(imageData: ImageData, threshold = 10): number[] {
  const { width, height, data } = imageData;
  const cols: number[] = [];

  for (let x = 0; x < width; x++) {
    let isTransparent = true;
    for (let y = 0; y < height && isTransparent; y++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > threshold) isTransparent = false;
    }
    if (isTransparent) cols.push(x);
  }
  return cols;
}

/**
 * Find rows that are fully transparent (alpha < threshold)
 */
function findTransparentRows(imageData: ImageData, threshold = 10): number[] {
  const { width, height, data } = imageData;
  const rows: number[] = [];

  for (let y = 0; y < height; y++) {
    let isTransparent = true;
    for (let x = 0; x < width && isTransparent; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > threshold) isTransparent = false;
    }
    if (isTransparent) rows.push(y);
  }
  return rows;
}

/**
 * Find intervals between consecutive positions
 * Returns the most common interval (tile size + spacing)
 */
function findIntervals(positions: number[]): Map<number, number> {
  const intervals = new Map<number, number>();

  // Find gaps between transparent lines (non-consecutive)
  let prevEnd = -1;
  let segmentStart = -1;

  for (let i = 0; i < positions.length; i++) {
    if (segmentStart === -1) {
      segmentStart = positions[i];
    }

    // Check if next position is consecutive
    if (i === positions.length - 1 || positions[i + 1] !== positions[i] + 1) {
      // End of a transparent segment
      if (prevEnd >= 0) {
        const interval = segmentStart - prevEnd;
        intervals.set(interval, (intervals.get(interval) || 0) + 1);
      }
      prevEnd = positions[i];
      segmentStart = -1;
    }
  }

  return intervals;
}

/**
 * Find the best tile size from intervals or common sizes
 */
function findBestSize(
  intervals: Map<number, number>,
  imageSize: number,
  commonSizes: number[]
): number {
  // First try to find most common interval
  let bestInterval = 0;
  let bestCount = 0;

  for (const [interval, count] of intervals) {
    // Prefer intervals that are close to common sizes
    const nearCommon = commonSizes.some(s => Math.abs(interval - s) <= 2);
    const adjustedCount = nearCommon ? count * 1.5 : count;
    if (adjustedCount > bestCount) {
      bestCount = adjustedCount;
      bestInterval = interval;
    }
  }

  if (bestInterval > 4 && bestCount >= 2) {
    return bestInterval;
  }

  // Fallback: find common size that evenly divides image
  for (const size of commonSizes) {
    if (imageSize % size === 0) {
      return size;
    }
  }

  // Last resort: return 16 or find closest divisor
  for (const size of commonSizes) {
    const remainder = imageSize % size;
    if (remainder < size / 4) {
      return size;
    }
  }

  return 16;
}

/**
 * Detect spacing from transparent column/row patterns
 */
function detectSpacing(
  transparentCols: number[],
  transparentRows: number[]
): number {
  // Find consecutive transparent pixels (spacing width)
  const colSpacings: number[] = [];
  let count = 1;

  for (let i = 1; i < transparentCols.length; i++) {
    if (transparentCols[i] === transparentCols[i - 1] + 1) {
      count++;
    } else {
      if (count > 0) colSpacings.push(count);
      count = 1;
    }
  }
  if (count > 0) colSpacings.push(count);

  const rowSpacings: number[] = [];
  count = 1;
  for (let i = 1; i < transparentRows.length; i++) {
    if (transparentRows[i] === transparentRows[i - 1] + 1) {
      count++;
    } else {
      if (count > 0) rowSpacings.push(count);
      count = 1;
    }
  }
  if (count > 0) rowSpacings.push(count);

  // Find most common spacing
  const spacingCounts = new Map<number, number>();
  [...colSpacings, ...rowSpacings].forEach(s => {
    spacingCounts.set(s, (spacingCounts.get(s) || 0) + 1);
  });

  let bestSpacing = 0;
  let bestCount = 0;
  for (const [spacing, spacingCount] of spacingCounts) {
    if (spacingCount > bestCount && spacing > 0 && spacing <= 4) {
      bestCount = spacingCount;
      bestSpacing = spacing;
    }
  }

  return bestSpacing;
}

/**
 * Detect margin from first transparent column/row
 */
function detectMargin(
  transparentCols: number[],
  transparentRows: number[]
): number {
  // Check if there's a transparent edge
  const colMargin = transparentCols[0] === 0 
    ? transparentCols.findIndex((c, i) => i > 0 && c !== i) 
    : 0;
  const rowMargin = transparentRows[0] === 0 
    ? transparentRows.findIndex((r, i) => i > 0 && r !== i) 
    : 0;

  // Use smaller of the two, capped at 4
  return Math.min(Math.max(colMargin, 0), Math.max(rowMargin, 0), 4);
}

/**
 * Calculate confidence score based on detection quality
 */
function calculateConfidence(
  tileWidth: number,
  tileHeight: number,
  colIntervals: Map<number, number>,
  rowIntervals: Map<number, number>,
  imageWidth: number,
  imageHeight: number
): number {
  let confidence = 0.5;

  // Boost for common sizes
  if (COMMON_SIZES.includes(tileWidth)) confidence += 0.1;
  if (COMMON_SIZES.includes(tileHeight)) confidence += 0.1;

  // Boost for square tiles
  if (tileWidth === tileHeight) confidence += 0.1;

  // Boost for consistent intervals
  const colTotal = Array.from(colIntervals.values()).reduce((a, b) => a + b, 0);
  const rowTotal = Array.from(rowIntervals.values()).reduce((a, b) => a + b, 0);
  if (colTotal >= 3) confidence += 0.1;
  if (rowTotal >= 3) confidence += 0.1;

  // Boost for clean division
  if (imageWidth % tileWidth === 0) confidence += 0.05;
  if (imageHeight % tileHeight === 0) confidence += 0.05;

  return Math.min(confidence, 1.0);
}

/**
 * Auto-detect tile size from a tileset image.
 * Analyzes transparent pixel patterns to find tile boundaries.
 */
export async function detectTileSize(imageUrl: string): Promise<AutoDetectResult> {
  // Use a timeout to prevent hanging
  const timeoutPromise = new Promise<AutoDetectResult>((_, reject) =>
    setTimeout(() => reject(new Error('Detection timeout')), DETECT_TIMEOUT)
  );

  const detectPromise = (async (): Promise<AutoDetectResult> => {
    try {
      const img = await loadImage(imageUrl);
      const imageData = getImageData(img);

      // Find transparent regions
      const transparentCols = findTransparentColumns(imageData);
      const transparentRows = findTransparentRows(imageData);

      // Find intervals between transparent regions
      const colIntervals = findIntervals(transparentCols);
      const rowIntervals = findIntervals(transparentRows);

      // Determine tile size
      let tileWidth = findBestSize(colIntervals, img.width, COMMON_SIZES);
      let tileHeight = findBestSize(rowIntervals, img.height, COMMON_SIZES);

      // Detect spacing and margin
      const spacing = detectSpacing(transparentCols, transparentRows);
      const margin = detectMargin(transparentCols, transparentRows);

      // Adjust tile size if spacing was detected
      if (spacing > 0 && tileWidth > spacing) {
        tileWidth = tileWidth - spacing;
      }
      if (spacing > 0 && tileHeight > spacing) {
        tileHeight = tileHeight - spacing;
      }

      // Calculate confidence
      const confidence = calculateConfidence(
        tileWidth,
        tileHeight,
        colIntervals,
        rowIntervals,
        img.width,
        img.height
      );

      return { tileWidth, tileHeight, spacing, margin, confidence };
    } catch {
      // Return default values on error
      return {
        tileWidth: 16,
        tileHeight: 16,
        spacing: 0,
        margin: 0,
        confidence: 0.3,
      };
    }
  })();

  try {
    return await Promise.race([detectPromise, timeoutPromise]);
  } catch {
    // Return default on timeout
    return {
      tileWidth: 16,
      tileHeight: 16,
      spacing: 0,
      margin: 0,
      confidence: 0.3,
    };
  }
}

/**
 * Quick estimation based on image dimensions (no pixel analysis)
 */
export function estimateTileSize(width: number, height: number): TilesetConfig {
  // Try common sizes in order of preference
  for (const size of [32, 16, 64, 48, 24, 8]) {
    if (width % size === 0 && height % size === 0) {
      return { tileWidth: size, tileHeight: size, spacing: 0, margin: 0 };
    }
  }
  
  // Fallback
  return { tileWidth: 16, tileHeight: 16, spacing: 0, margin: 0 };
}

// Re-export type for convenience
type TilesetConfig = { tileWidth: number; tileHeight: number; spacing: number; margin: number };
