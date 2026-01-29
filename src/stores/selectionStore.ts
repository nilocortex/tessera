/**
 * Selection store for rectangular selection and clipboard operations.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Selection, Bounds, Clipboard, SelectionState } from '../types';

interface SelectionActions {
  // Selection creation
  startDrag: (x: number, y: number) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: (getTile: (x: number, y: number, layerId: string) => number, layerId: string) => void;
  
  // Selection operations
  clearSelection: () => void;
  selectAll: (mapWidth: number, mapHeight: number, getTile: (x: number, y: number, layerId: string) => number, layerId: string) => void;
  
  // Clipboard operations
  copy: () => void;
  cut: (setTile: (x: number, y: number, tileId: number, layerId: string) => void) => void;
  paste: (targetX: number, targetY: number) => Selection | null;
  
  // Floating selection
  moveSelection: (dx: number, dy: number) => void;
  commitSelection: (setTile: (x: number, y: number, tileId: number, layerId: string) => void) => void;
  
  // State queries
  hasSelection: () => boolean;
  hasClipboard: () => boolean;
  getSelectionBounds: () => Bounds | null;
}

type SelectionStore = SelectionState & SelectionActions;

export const useSelectionStore = create<SelectionStore>()(
  immer((set, get) => ({
    selection: null,
    isDragging: false,
    dragStartTile: null,
    dragCurrentTile: null,
    clipboard: null,

    startDrag: (x, y) => set((state) => {
      // Clear any existing selection
      state.selection = null;
      state.isDragging = true;
      state.dragStartTile = { x, y };
      state.dragCurrentTile = { x, y };
    }),

    updateDrag: (x, y) => set((state) => {
      if (state.isDragging) {
        state.dragCurrentTile = { x, y };
      }
    }),

    endDrag: (getTile, layerId) => {
      const { isDragging, dragStartTile, dragCurrentTile } = get();
      if (!isDragging || !dragStartTile || !dragCurrentTile) {
        set((state) => {
          state.isDragging = false;
          state.dragStartTile = null;
          state.dragCurrentTile = null;
        });
        return;
      }

      // Calculate normalized bounds
      const x1 = Math.min(dragStartTile.x, dragCurrentTile.x);
      const y1 = Math.min(dragStartTile.y, dragCurrentTile.y);
      const x2 = Math.max(dragStartTile.x, dragCurrentTile.x);
      const y2 = Math.max(dragStartTile.y, dragCurrentTile.y);
      
      const width = x2 - x1 + 1;
      const height = y2 - y1 + 1;
      
      // Copy tile data
      const tiles = new Uint16Array(width * height);
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          tiles[dy * width + dx] = getTile(x1 + dx, y1 + dy, layerId);
        }
      }

      set((state) => {
        state.selection = {
          bounds: { x: x1, y: y1, width, height },
          layerId,
          tiles,
          floating: false,
          offsetX: 0,
          offsetY: 0,
        };
        state.isDragging = false;
        state.dragStartTile = null;
        state.dragCurrentTile = null;
      });
    },

    clearSelection: () => set((state) => {
      state.selection = null;
      state.isDragging = false;
      state.dragStartTile = null;
      state.dragCurrentTile = null;
    }),

    selectAll: (mapWidth, mapHeight, getTile, layerId) => {
      const tiles = new Uint16Array(mapWidth * mapHeight);
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
          tiles[y * mapWidth + x] = getTile(x, y, layerId);
        }
      }
      
      set((state) => {
        state.selection = {
          bounds: { x: 0, y: 0, width: mapWidth, height: mapHeight },
          layerId,
          tiles,
          floating: false,
          offsetX: 0,
          offsetY: 0,
        };
      });
    },

    copy: () => {
      const { selection } = get();
      if (!selection) return;
      
      set((state) => {
        state.clipboard = {
          width: selection.bounds.width,
          height: selection.bounds.height,
          tiles: new Uint16Array(selection.tiles), // Copy the array
          sourceLayerId: selection.layerId,
        };
      });
    },

    cut: (setTile) => {
      const { selection } = get();
      if (!selection || selection.floating) return;
      
      // Copy to clipboard first
      get().copy();
      
      // Clear original area
      const { x, y, width, height } = selection.bounds;
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          setTile(x + dx, y + dy, 0, selection.layerId);
        }
      }
      
      // Make selection floating
      set((state) => {
        if (state.selection) {
          state.selection.floating = true;
        }
      });
    },

    paste: (targetX, targetY) => {
      const { clipboard } = get();
      if (!clipboard) return null;
      
      const pastedSelection: Selection = {
        bounds: {
          x: targetX,
          y: targetY,
          width: clipboard.width,
          height: clipboard.height,
        },
        layerId: clipboard.sourceLayerId,
        tiles: new Uint16Array(clipboard.tiles), // Copy the array
        floating: true,
        offsetX: 0,
        offsetY: 0,
      };
      
      set((state) => {
        state.selection = pastedSelection;
      });
      
      return pastedSelection;
    },

    moveSelection: (dx, dy) => set((state) => {
      if (state.selection) {
        state.selection.offsetX += dx;
        state.selection.offsetY += dy;
      }
    }),

    commitSelection: (setTile) => {
      const { selection } = get();
      if (!selection || !selection.floating) return;
      
      const { bounds, tiles, layerId, offsetX, offsetY } = selection;
      const targetX = bounds.x + offsetX;
      const targetY = bounds.y + offsetY;
      
      // Apply tiles to map
      for (let dy = 0; dy < bounds.height; dy++) {
        for (let dx = 0; dx < bounds.width; dx++) {
          const tileId = tiles[dy * bounds.width + dx];
          if (tileId !== 0) { // Don't overwrite with empty
            setTile(targetX + dx, targetY + dy, tileId, layerId);
          }
        }
      }
      
      // Clear selection
      set((state) => {
        state.selection = null;
      });
    },

    hasSelection: () => get().selection !== null,
    hasClipboard: () => get().clipboard !== null,
    
    getSelectionBounds: () => {
      const { selection, isDragging, dragStartTile, dragCurrentTile } = get();
      
      // During drag, compute bounds from drag points
      if (isDragging && dragStartTile && dragCurrentTile) {
        const x1 = Math.min(dragStartTile.x, dragCurrentTile.x);
        const y1 = Math.min(dragStartTile.y, dragCurrentTile.y);
        const x2 = Math.max(dragStartTile.x, dragCurrentTile.x);
        const y2 = Math.max(dragStartTile.y, dragCurrentTile.y);
        return { x: x1, y: y1, width: x2 - x1 + 1, height: y2 - y1 + 1 };
      }
      
      // From existing selection (with offset if floating)
      if (selection) {
        return {
          x: selection.bounds.x + selection.offsetX,
          y: selection.bounds.y + selection.offsetY,
          width: selection.bounds.width,
          height: selection.bounds.height,
        };
      }
      
      return null;
    },
  }))
);

// Selectors
export const selectHasSelection = (state: SelectionStore) => state.selection !== null;
export const selectHasClipboard = (state: SelectionStore) => state.clipboard !== null;
export const selectIsFloating = (state: SelectionStore) => state.selection?.floating ?? false;
export const selectSelection = (state: SelectionStore) => state.selection;
export const selectIsDragging = (state: SelectionStore) => state.isDragging;
