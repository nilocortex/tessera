/**
 * Tests for history store - verifying undo/redo with 50+ levels
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore } from '../historyStore';

describe('historyStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useHistoryStore.setState({
      past: [],
      future: [],
      pendingAction: null,
      lastChangeTime: 0,
    });
  });

  it('should support 50+ undo levels', () => {
    const store = useHistoryStore.getState();
    
    // Push 60 distinct actions
    for (let i = 0; i < 60; i++) {
      store.pushAction({
        type: 'brush',
        changes: [{ x: i, y: 0, layerId: 'default', oldTileId: 0, newTileId: i + 1 }],
      });
    }

    const stats = store.getStats();
    expect(stats.undoLevels).toBe(60);

    // Verify we can undo all 60
    let undoCount = 0;
    while (store.canUndo()) {
      store.undo();
      undoCount++;
    }
    expect(undoCount).toBe(60);
  });

  it('should coalesce rapid brush strokes within 50ms window', async () => {
    const store = useHistoryStore.getState();
    
    // Record multiple changes rapidly (simulating brush strokes)
    store.recordChange({ x: 0, y: 0, layerId: 'default', oldTileId: 0, newTileId: 1 }, 'brush');
    store.recordChange({ x: 1, y: 0, layerId: 'default', oldTileId: 0, newTileId: 1 }, 'brush');
    store.recordChange({ x: 2, y: 0, layerId: 'default', oldTileId: 0, newTileId: 1 }, 'brush');
    store.commitPending();

    const stats = store.getStats();
    // All 3 changes should be coalesced into 1 action
    expect(stats.undoLevels).toBe(1);
    expect(stats.totalChanges).toBe(3);
  });

  it('should clear redo stack on new action', () => {
    const store = useHistoryStore.getState();
    
    // Push some actions
    store.pushAction({
      type: 'brush',
      changes: [{ x: 0, y: 0, layerId: 'default', oldTileId: 0, newTileId: 1 }],
    });
    store.pushAction({
      type: 'brush',
      changes: [{ x: 1, y: 0, layerId: 'default', oldTileId: 0, newTileId: 2 }],
    });

    // Undo one action
    store.undo();
    expect(store.canRedo()).toBe(true);

    // Push new action - should clear redo
    store.pushAction({
      type: 'brush',
      changes: [{ x: 2, y: 0, layerId: 'default', oldTileId: 0, newTileId: 3 }],
    });
    expect(store.canRedo()).toBe(false);
  });

  it('should undo and redo correctly', () => {
    const store = useHistoryStore.getState();
    
    store.pushAction({
      type: 'brush',
      changes: [{ x: 5, y: 5, layerId: 'default', oldTileId: 0, newTileId: 10 }],
    });

    // Undo
    const undoneAction = store.undo();
    expect(undoneAction).not.toBeNull();
    expect(undoneAction?.changes[0].newTileId).toBe(10);
    expect(store.canUndo()).toBe(false);
    expect(store.canRedo()).toBe(true);

    // Redo
    const redoneAction = store.redo();
    expect(redoneAction).not.toBeNull();
    expect(redoneAction?.changes[0].newTileId).toBe(10);
    expect(store.canUndo()).toBe(true);
    expect(store.canRedo()).toBe(false);
  });

  it('should limit history to MAX_HISTORY_SIZE (100)', () => {
    const store = useHistoryStore.getState();
    
    // Push 120 actions
    for (let i = 0; i < 120; i++) {
      store.pushAction({
        type: 'brush',
        changes: [{ x: i, y: 0, layerId: 'default', oldTileId: 0, newTileId: i + 1 }],
      });
    }

    const stats = store.getStats();
    // Should be capped at 100
    expect(stats.undoLevels).toBe(100);
  });

  it('should not duplicate tiles in same stroke', () => {
    const store = useHistoryStore.getState();
    
    // Record same position multiple times
    store.recordChange({ x: 0, y: 0, layerId: 'default', oldTileId: 0, newTileId: 1 }, 'brush');
    store.recordChange({ x: 0, y: 0, layerId: 'default', oldTileId: 0, newTileId: 2 }, 'brush');
    store.recordChange({ x: 0, y: 0, layerId: 'default', oldTileId: 0, newTileId: 3 }, 'brush');
    store.commitPending();

    const stats = store.getStats();
    // Should only have 1 change (duplicates filtered)
    expect(stats.totalChanges).toBe(1);
  });
});
