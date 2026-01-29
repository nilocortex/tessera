/**
 * Map store with multi-layer support.
 * Each layer has its own Uint16Array tile data.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TileMap, Layer, MapMetadata, ResizeAnchor } from '../types';
import { MAP_CONSTRAINTS } from '../types';
import { useHistoryStore } from './historyStore';

/** Clamp a value between min and max */
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** Create a new layer with empty tile data */
function createLayer(name: string, width: number, height: number): Layer {
  return {
    id: crypto.randomUUID(),
    name,
    visible: true,
    locked: false,
    opacity: 1.0,
    tiles: new Uint16Array(width * height),
  };
}

/** Calculate offset for resize based on anchor point */
export function calculateResizeOffset(
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
  anchor: ResizeAnchor
): { x: number; y: number } {
  const dw = newWidth - oldWidth;
  const dh = newHeight - oldHeight;

  let x = 0;
  let y = 0;

  // Horizontal alignment
  if (anchor.includes('left')) {
    x = 0;
  } else if (anchor.includes('right')) {
    x = dw;
  } else {
    // center (or just 'top'/'bottom')
    x = Math.floor(dw / 2);
  }

  // Vertical alignment
  if (anchor.includes('top')) {
    y = 0;
  } else if (anchor.includes('bottom')) {
    y = dh;
  } else {
    // center (or just 'left'/'right')
    y = Math.floor(dh / 2);
  }

  return { x, y };
}

/** Map store state */
interface MapState {
  map: TileMap | null;
}

/** Map store actions */
interface MapActions {
  // Map operations
  createMap: (width: number, height: number, tileSize?: number) => void;
  clearMap: () => void;

  // Resize
  resizeMap: (newWidth: number, newHeight: number, anchor: ResizeAnchor) => void;

  // Metadata
  setMapMetadata: (metadata: Partial<MapMetadata>) => void;
  setCustomProperty: (key: string, value: string | number | boolean) => void;
  removeCustomProperty: (key: string) => void;

  // Tile operations
  setTile: (x: number, y: number, tileId: number, layerId?: string) => void;
  setTileRaw: (x: number, y: number, tileId: number, layerId?: string) => void;
  getTile: (x: number, y: number, layerId?: string) => number;

  // Layer management
  addLayer: (name?: string, insertIndex?: number) => string;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => string;
  setActiveLayer: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;

  // Layer visibility and locking
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;

  // Layer reordering
  moveLayerUp: (layerId: string) => void;
  moveLayerDown: (layerId: string) => void;
  moveLayer: (layerId: string, newIndex: number) => void;

  // Queries
  canEditLayer: (layerId?: string) => boolean;
  getLayer: (layerId: string) => Layer | undefined;
  getActiveLayer: () => Layer | undefined;
}

type MapStore = MapState & MapActions;

export const useMapStore = create<MapStore>()(
  immer((set, get) => ({
    map: null,

    createMap: (width: number, height: number, tileSize = MAP_CONSTRAINTS.DEFAULT_TILE_SIZE) => {
      const clampedWidth = clamp(width, MAP_CONSTRAINTS.MIN_SIZE, MAP_CONSTRAINTS.MAX_SIZE);
      const clampedHeight = clamp(height, MAP_CONSTRAINTS.MIN_SIZE, MAP_CONSTRAINTS.MAX_SIZE);

      const defaultLayer = createLayer('Layer 1', clampedWidth, clampedHeight);
      const now = Date.now();

      set((state) => {
        state.map = {
          width: clampedWidth,
          height: clampedHeight,
          tileSize,
          layers: [defaultLayer],
          activeLayerId: defaultLayer.id,
          metadata: {
            name: 'Untitled Map',
            description: '',
            createdAt: now,
            modifiedAt: now,
            customProperties: {},
          },
          version: 0,
        };
      });
    },

    clearMap: () => {
      set((state) => {
        state.map = null;
      });
    },

    resizeMap: (newWidth: number, newHeight: number, anchor: ResizeAnchor) => {
      const { map } = get();
      if (!map) return;

      const clampedWidth = clamp(newWidth, MAP_CONSTRAINTS.MIN_SIZE, MAP_CONSTRAINTS.MAX_SIZE);
      const clampedHeight = clamp(newHeight, MAP_CONSTRAINTS.MIN_SIZE, MAP_CONSTRAINTS.MAX_SIZE);

      // Save snapshot for undo before resizing
      const snapshot = {
        width: map.width,
        height: map.height,
        layers: map.layers.map((l) => ({
          id: l.id,
          tiles: new Uint16Array(l.tiles), // copy
        })),
      };

      // Calculate offset based on anchor
      const offset = calculateResizeOffset(
        map.width,
        map.height,
        clampedWidth,
        clampedHeight,
        anchor
      );

      set((state) => {
        if (!state.map) return;

        // Resize each layer
        for (const layer of state.map.layers) {
          const newTiles = new Uint16Array(clampedWidth * clampedHeight);

          // Copy tiles from old position to new position
          for (let y = 0; y < clampedHeight; y++) {
            for (let x = 0; x < clampedWidth; x++) {
              // Calculate source position
              const srcX = x - offset.x;
              const srcY = y - offset.y;

              // Check if source is in bounds of old map
              if (
                srcX >= 0 &&
                srcX < state.map.width &&
                srcY >= 0 &&
                srcY < state.map.height
              ) {
                const srcIndex = srcY * state.map.width + srcX;
                const dstIndex = y * clampedWidth + x;
                newTiles[dstIndex] = layer.tiles[srcIndex];
              }
            }
          }

          layer.tiles = newTiles;
        }

        state.map.width = clampedWidth;
        state.map.height = clampedHeight;
        state.map.metadata.modifiedAt = Date.now();
      });

      // Push to history for undo support
      useHistoryStore.getState().pushAction({
        type: 'resize',
        changes: [],
        snapshot,
      });
    },

    setMapMetadata: (metadata: Partial<MapMetadata>) =>
      set((state) => {
        if (!state.map) return;
        state.map.metadata = { ...state.map.metadata, ...metadata };
        state.map.metadata.modifiedAt = Date.now();
      }),

    setCustomProperty: (key: string, value: string | number | boolean) =>
      set((state) => {
        if (!state.map) return;
        state.map.metadata.customProperties[key] = value;
        state.map.metadata.modifiedAt = Date.now();
      }),

    removeCustomProperty: (key: string) =>
      set((state) => {
        if (!state.map) return;
        delete state.map.metadata.customProperties[key];
        state.map.metadata.modifiedAt = Date.now();
      }),

    setTile: (x: number, y: number, tileId: number, layerId?: string) => {
      const { map } = get();
      if (!map) return;

      const targetLayerId = layerId || map.activeLayerId;
      const layer = map.layers.find((l) => l.id === targetLayerId);
      if (!layer || layer.locked) return;
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;

      set((state) => {
        const targetLayer = state.map!.layers.find((l) => l.id === targetLayerId)!;
        const index = y * state.map!.width + x;
        targetLayer.tiles[index] = Math.max(0, Math.min(65535, tileId));
        state.map!.version++; // Trigger re-render
      });
    },

    setTileRaw: (x: number, y: number, tileId: number, layerId?: string) => {
      const { map } = get();
      if (!map) return;

      const targetLayerId = layerId || map.activeLayerId;
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;

      set((state) => {
        const layer = state.map!.layers.find((l) => l.id === targetLayerId);
        if (!layer) return;
        const index = y * state.map!.width + x;
        layer.tiles[index] = Math.max(0, Math.min(65535, tileId));
        state.map!.version++; // Trigger re-render
      });
    },

    getTile: (x: number, y: number, layerId?: string) => {
      const { map } = get();
      if (!map) return 0;

      const targetLayerId = layerId || map.activeLayerId;
      const layer = map.layers.find((l) => l.id === targetLayerId);
      if (!layer) return 0;
      if (x < 0 || x >= map.width || y < 0 || y >= map.height) return 0;

      const index = y * map.width + x;
      return layer.tiles[index];
    },

    // Layer management
    addLayer: (name?: string, insertIndex?: number) => {
      const { map } = get();
      if (!map || map.layers.length >= MAP_CONSTRAINTS.MAX_LAYERS) return '';

      const layerName = name || `Layer ${map.layers.length + 1}`;
      const newLayer = createLayer(layerName, map.width, map.height);

      set((state) => {
        const idx = insertIndex ?? state.map!.layers.length;
        state.map!.layers.splice(idx, 0, newLayer);
        state.map!.activeLayerId = newLayer.id;
      });

      return newLayer.id;
    },

    deleteLayer: (layerId: string) => {
      const { map } = get();
      if (!map || map.layers.length <= 1) return; // Keep at least one layer

      set((state) => {
        const idx = state.map!.layers.findIndex((l) => l.id === layerId);
        if (idx === -1) return;

        state.map!.layers.splice(idx, 1);

        // Update active layer if deleted
        if (state.map!.activeLayerId === layerId) {
          state.map!.activeLayerId = state.map!.layers[Math.max(0, idx - 1)].id;
        }
      });
    },

    duplicateLayer: (layerId: string) => {
      const { map } = get();
      if (!map || map.layers.length >= MAP_CONSTRAINTS.MAX_LAYERS) return '';

      const sourceLayer = map.layers.find((l) => l.id === layerId);
      if (!sourceLayer) return '';

      const newLayer: Layer = {
        id: crypto.randomUUID(),
        name: `${sourceLayer.name} Copy`,
        visible: sourceLayer.visible,
        locked: false,
        opacity: sourceLayer.opacity,
        tiles: new Uint16Array(sourceLayer.tiles), // Copy tile data
      };

      set((state) => {
        const idx = state.map!.layers.findIndex((l) => l.id === layerId);
        state.map!.layers.splice(idx + 1, 0, newLayer);
        state.map!.activeLayerId = newLayer.id;
      });

      return newLayer.id;
    },

    setActiveLayer: (layerId: string) =>
      set((state) => {
        if (state.map?.layers.find((l) => l.id === layerId)) {
          state.map.activeLayerId = layerId;
        }
      }),

    renameLayer: (layerId: string, name: string) =>
      set((state) => {
        const layer = state.map?.layers.find((l) => l.id === layerId);
        if (layer) layer.name = name.trim() || layer.name;
      }),

    // Layer visibility and locking
    toggleLayerVisibility: (layerId: string) =>
      set((state) => {
        const layer = state.map?.layers.find((l) => l.id === layerId);
        if (layer) layer.visible = !layer.visible;
      }),

    toggleLayerLock: (layerId: string) =>
      set((state) => {
        const layer = state.map?.layers.find((l) => l.id === layerId);
        if (layer) layer.locked = !layer.locked;
      }),

    setLayerOpacity: (layerId: string, opacity: number) =>
      set((state) => {
        const layer = state.map?.layers.find((l) => l.id === layerId);
        if (layer) layer.opacity = clamp(opacity, 0, 1);
      }),

    // Layer reordering
    moveLayerUp: (layerId: string) => {
      const { map } = get();
      if (!map) return;

      const idx = map.layers.findIndex((l) => l.id === layerId);
      if (idx <= 0) return; // Already at bottom (remember: higher index = higher z)

      set((state) => {
        const layers = state.map!.layers;
        [layers[idx - 1], layers[idx]] = [layers[idx], layers[idx - 1]];
      });
    },

    moveLayerDown: (layerId: string) => {
      const { map } = get();
      if (!map) return;

      const idx = map.layers.findIndex((l) => l.id === layerId);
      if (idx === -1 || idx >= map.layers.length - 1) return; // Already at top

      set((state) => {
        const layers = state.map!.layers;
        [layers[idx], layers[idx + 1]] = [layers[idx + 1], layers[idx]];
      });
    },

    moveLayer: (layerId: string, newIndex: number) => {
      const { map } = get();
      if (!map) return;

      const currentIdx = map.layers.findIndex((l) => l.id === layerId);
      if (currentIdx === -1) return;

      const clampedIndex = clamp(newIndex, 0, map.layers.length - 1);
      if (currentIdx === clampedIndex) return;

      set((state) => {
        const [layer] = state.map!.layers.splice(currentIdx, 1);
        state.map!.layers.splice(clampedIndex, 0, layer);
      });
    },

    // Queries
    canEditLayer: (layerId?: string) => {
      const { map } = get();
      if (!map) return false;
      const targetId = layerId || map.activeLayerId;
      const layer = map.layers.find((l) => l.id === targetId);
      return layer ? !layer.locked : false;
    },

    getLayer: (layerId: string) => get().map?.layers.find((l) => l.id === layerId),

    getActiveLayer: () => {
      const { map } = get();
      return map?.layers.find((l) => l.id === map.activeLayerId);
    },
  }))
);

// Selector helpers for performance
export const selectMap = (state: MapStore) => state.map;
export const selectMapDimensions = (state: MapStore) =>
  state.map ? { width: state.map.width, height: state.map.height } : null;
export const selectLayers = (state: MapStore) => state.map?.layers ?? [];
export const selectActiveLayerId = (state: MapStore) => state.map?.activeLayerId ?? null;
export const selectActiveLayer = (state: MapStore) =>
  state.map?.layers.find((l) => l.id === state.map?.activeLayerId);
