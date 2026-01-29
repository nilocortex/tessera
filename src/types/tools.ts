/**
 * Tool type definitions for the editor.
 */

export type ToolType = 'brush' | 'fill' | 'eraser' | 'select' | 'pan';

export interface BrushSettings {
  size: number;               // 1-16 tiles
  shape: 'square' | 'circle';
}

export interface ToolState {
  activeTool: ToolType;
  brush: BrushSettings;
}

export interface Position {
  x: number;
  y: number;
}

export interface TileOperation {
  position: Position;
  tileId: number;
}
