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

export interface HistoryAction {
  id: string;
  type: HistoryActionType;
  timestamp: number;
  changes: TileChange[];
  description?: string;
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
