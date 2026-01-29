/**
 * Tool store for managing active tool and settings.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ToolType, BrushSettings } from '../types';

interface ToolState {
  activeTool: ToolType;
  brushSettings: BrushSettings;
}

interface ToolActions {
  setActiveTool: (tool: ToolType) => void;
  setBrushSize: (size: number) => void;
  setBrushShape: (shape: 'square' | 'circle') => void;
}

type ToolStore = ToolState & ToolActions;

export const useToolStore = create<ToolStore>()(
  immer((set) => ({
    activeTool: 'brush',
    brushSettings: {
      size: 1,
      shape: 'square',
    },

    setActiveTool: (tool) =>
      set((state) => {
        state.activeTool = tool;
      }),

    setBrushSize: (size) =>
      set((state) => {
        state.brushSettings.size = Math.max(1, Math.min(16, size));
      }),

    setBrushShape: (shape) =>
      set((state) => {
        state.brushSettings.shape = shape;
      }),
  }))
);

// Selectors
export const selectActiveTool = (state: ToolStore) => state.activeTool;
export const selectBrushSettings = (state: ToolStore) => state.brushSettings;
