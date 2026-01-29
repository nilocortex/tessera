/**
 * Selection and clipboard type definitions.
 */

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Selection {
  bounds: Bounds;
  layerId: string;            // source layer
  tiles: Uint16Array;         // copied tile data
  floating: boolean;          // true when selection has been cut or is being moved
  offsetX: number;            // offset from original position
  offsetY: number;
}

export interface Clipboard {
  width: number;
  height: number;
  tiles: Uint16Array;
  sourceLayerId: string;
}

export interface SelectionState {
  // Active selection
  selection: Selection | null;
  
  // Selection drag state
  isDragging: boolean;
  dragStartTile: { x: number; y: number } | null;
  dragCurrentTile: { x: number; y: number } | null;
  
  // Clipboard (persists after selection is cleared)
  clipboard: Clipboard | null;
}
