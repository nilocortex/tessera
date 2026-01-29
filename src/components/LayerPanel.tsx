/**
 * LayerPanel component for managing map layers.
 * Allows creating, deleting, reordering, renaming, and toggling layer properties.
 */
import { useState, useCallback } from 'react';
import { useMapStore, selectLayers, selectActiveLayerId } from '../stores/mapStore';
import { MAP_CONSTRAINTS } from '../types';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
  TrashIcon,
  CopyIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  LayersIcon,
} from './icons';

/** Helper to join classNames */
function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function LayerPanel() {
  const layers = useMapStore(selectLayers);
  const activeLayerId = useMapStore(selectActiveLayerId);
  const {
    addLayer,
    deleteLayer,
    duplicateLayer,
    setActiveLayer,
    renameLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setLayerOpacity,
    moveLayerUp,
    moveLayerDown,
  } = useMapStore();

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

  // Render layers in reverse order (top layer first in UI)
  const reversedLayers = [...layers].reverse();

  const handleAddLayer = useCallback(() => {
    addLayer();
  }, [addLayer]);

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      if (layers.length > 1) {
        deleteLayer(layerId);
      }
    },
    [layers.length, deleteLayer]
  );

  const handleDuplicateLayer = useCallback(
    (layerId: string) => {
      if (layers.length < MAP_CONSTRAINTS.MAX_LAYERS) {
        duplicateLayer(layerId);
      }
    },
    [layers.length, duplicateLayer]
  );

  const handleRenameSubmit = useCallback(
    (layerId: string, value: string) => {
      renameLayer(layerId, value);
      setEditingLayerId(null);
    },
    [renameLayer]
  );

  if (layers.length === 0) {
    return (
      <div className="layer-panel empty">
        <LayersIcon size={24} />
        <p>No layers</p>
      </div>
    );
  }

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <div className="layer-panel-title">
          <LayersIcon size={16} />
          <span>Layers</span>
        </div>
        <button
          className="layer-add-btn"
          onClick={handleAddLayer}
          disabled={layers.length >= MAP_CONSTRAINTS.MAX_LAYERS}
          title={`Add Layer (${layers.length}/${MAP_CONSTRAINTS.MAX_LAYERS})`}
        >
          <PlusIcon size={14} />
        </button>
      </div>

      <div className="layer-list">
        {reversedLayers.map((layer, displayIndex) => {
          const actualIndex = layers.length - 1 - displayIndex;
          const isActive = layer.id === activeLayerId;
          const isEditing = editingLayerId === layer.id;
          const isFirst = actualIndex === layers.length - 1; // Top of stack
          const isLast = actualIndex === 0; // Bottom of stack

          return (
            <div
              key={layer.id}
              className={cn(
                'layer-item',
                isActive && 'active',
                layer.locked && 'locked',
                !layer.visible && 'hidden-layer'
              )}
              onClick={() => setActiveLayer(layer.id)}
            >
              {/* Visibility toggle */}
              <button
                className="layer-btn visibility"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibility(layer.id);
                }}
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                {layer.visible ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
              </button>

              {/* Lock toggle */}
              <button
                className="layer-btn lock"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerLock(layer.id);
                }}
                title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
              >
                {layer.locked ? <LockIcon size={14} /> : <UnlockIcon size={14} />}
              </button>

              {/* Layer name (editable) */}
              {isEditing ? (
                <input
                  className="layer-name-input"
                  defaultValue={layer.name}
                  autoFocus
                  onBlur={(e) => handleRenameSubmit(layer.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameSubmit(layer.id, e.currentTarget.value);
                    }
                    if (e.key === 'Escape') {
                      setEditingLayerId(null);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="layer-name"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingLayerId(layer.id);
                  }}
                  title="Double-click to rename"
                >
                  {layer.name}
                </span>
              )}

              {/* Opacity slider */}
              <input
                type="range"
                className="layer-opacity"
                min={0}
                max={100}
                value={Math.round(layer.opacity * 100)}
                onChange={(e) => setLayerOpacity(layer.id, Number(e.target.value) / 100)}
                onClick={(e) => e.stopPropagation()}
                title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
              />

              {/* Reorder buttons */}
              <div className="layer-reorder">
                <button
                  className="layer-btn reorder-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayerDown(layer.id); // Down in array = up in z-order
                  }}
                  disabled={isFirst}
                  title="Move Up"
                >
                  <ChevronUpIcon size={12} />
                </button>
                <button
                  className="layer-btn reorder-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveLayerUp(layer.id); // Up in array = down in z-order
                  }}
                  disabled={isLast}
                  title="Move Down"
                >
                  <ChevronDownIcon size={12} />
                </button>
              </div>

              {/* Actions */}
              <button
                className="layer-btn duplicate"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicateLayer(layer.id);
                }}
                disabled={layers.length >= MAP_CONSTRAINTS.MAX_LAYERS}
                title="Duplicate Layer"
              >
                <CopyIcon size={14} />
              </button>
              <button
                className="layer-btn delete"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteLayer(layer.id);
                }}
                disabled={layers.length <= 1}
                title="Delete Layer"
              >
                <TrashIcon size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="layer-panel-footer">
        <span className="layer-count">
          {layers.length} / {MAP_CONSTRAINTS.MAX_LAYERS} layers
        </span>
      </div>
    </div>
  );
}
