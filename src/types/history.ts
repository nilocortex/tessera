/**
 * History system type definitions for undo/redo.
 * Uses delta compression - only stores changed tiles.
 */

export interface TileChange {
  x: number;
  y: number;
  layerId: string;
  oldTileId: number;
  newTileId: number;
}

/** Snapshot of map state for resize undo */
export interface MapSnapshot {
  width: number;
  height: number;
  layers: Array<{
    id: string;
    tiles: Uint16Array;
  }>;
}

export interface HistoryAction {
  id: string;
  type: HistoryActionType;
  timestamp: number;
  changes: TileChange[];
  description?: string;
  /** Snapshot for resize operations (stores full map state) */
  snapshot?: MapSnapshot;
}

export type HistoryActionType =
  | 'brush'
  | 'fill'
  | 'erase'
  | 'paste'
  | 'cut'
  | 'layer-create'
  | 'layer-delete'
  | 'layer-merge'
  | 'resize'
  | 'batch';
