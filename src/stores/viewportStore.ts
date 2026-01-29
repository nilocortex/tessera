import { create } from 'zustand';

/** Viewport constraints */
const VIEWPORT_CONSTRAINTS = {
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 4,
  DEFAULT_ZOOM: 1,
} as const;

/** Clamp a value between min and max */
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** Viewport store state */
interface ViewportState {
  /** Current zoom level (0.25 - 4) */
  zoom: number;
  /** Whether to show the grid overlay */
  showGrid: boolean;
}

/** Viewport store actions */
interface ViewportActions {
  /** Set zoom level (clamped to valid range) */
  setZoom: (zoom: number) => void;
  /** Toggle grid visibility */
  toggleGrid: () => void;
  /** Explicitly set grid visibility */
  setShowGrid: (show: boolean) => void;
}

type ViewportStore = ViewportState & ViewportActions;

export const useViewportStore = create<ViewportStore>()((set) => ({
  zoom: VIEWPORT_CONSTRAINTS.DEFAULT_ZOOM,
  showGrid: true,

  setZoom: (zoom: number) => {
    set({
      zoom: clamp(zoom, VIEWPORT_CONSTRAINTS.MIN_ZOOM, VIEWPORT_CONSTRAINTS.MAX_ZOOM),
    });
  },

  toggleGrid: () => {
    set((state) => ({ showGrid: !state.showGrid }));
  },

  setShowGrid: (show: boolean) => {
    set({ showGrid: show });
  },
}));

// Selector helpers
export const selectZoom = (state: ViewportStore) => state.zoom;
export const selectShowGrid = (state: ViewportStore) => state.showGrid;

export { VIEWPORT_CONSTRAINTS };
