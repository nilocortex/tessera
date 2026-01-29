/**
 * Modal dialog for editing map metadata and custom properties.
 * Allows setting name, description, author, version, and custom key-value pairs.
 */
import { useState, useEffect } from 'react';
import { useMapStore } from '../stores/mapStore';

interface MapPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MapPropertiesModal({ isOpen, onClose }: MapPropertiesModalProps) {
  const { map, setMapMetadata, setCustomProperty, removeCustomProperty } = useMapStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [version, setVersion] = useState('');
  const [newPropKey, setNewPropKey] = useState('');
  const [newPropValue, setNewPropValue] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && map) {
      setName(map.metadata.name);
      setDescription(map.metadata.description);
      setAuthor(map.metadata.author ?? '');
      setVersion(map.metadata.version ?? '');
      setNewPropKey('');
      setNewPropValue('');
    }
  }, [isOpen, map]);

  if (!isOpen || !map) return null;

  const handleSave = () => {
    setMapMetadata({
      name: name.trim() || 'Untitled Map',
      description,
      author: author || undefined,
      version: version || undefined,
    });
    onClose();
  };

  const handleAddProperty = () => {
    if (newPropKey.trim()) {
      // Try to parse as number or boolean
      let value: string | number | boolean = newPropValue;
      if (newPropValue === 'true') value = true;
      else if (newPropValue === 'false') value = false;
      else if (!isNaN(Number(newPropValue)) && newPropValue.trim() !== '') {
        value = Number(newPropValue);
      }

      setCustomProperty(newPropKey.trim(), value);
      setNewPropKey('');
      setNewPropValue('');
    }
  };

  const handlePropertyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddProperty();
    }
  };

  const customProps = Object.entries(map.metadata.customProperties);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog properties-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">Map Properties</h2>

        {/* Basic Information */}
        <div className="form-section">
          <h3>Basic Information</h3>

          <label>
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Map name"
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </label>

          <div className="form-row">
            <label>
              <span>Author</span>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Optional"
              />
            </label>

            <label>
              <span>Version</span>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g., 1.0.0"
              />
            </label>
          </div>
        </div>

        {/* Map Statistics */}
        <div className="form-section">
          <h3>Statistics</h3>
          <div className="stats-grid">
            <div>Size: {map.width} × {map.height} tiles</div>
            <div>Tile Size: {map.tileSize}px</div>
            <div>Layers: {map.layers.length}</div>
            <div>Total Tiles: {(map.width * map.height).toLocaleString()}</div>
            <div>Created: {formatDate(map.metadata.createdAt)}</div>
            <div>Modified: {formatDate(map.metadata.modifiedAt)}</div>
          </div>
        </div>

        {/* Custom Properties */}
        <div className="form-section">
          <h3>Custom Properties</h3>

          {customProps.length > 0 ? (
            <table className="properties-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customProps.map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => {
                          let newValue: string | number | boolean = e.target.value;
                          if (typeof value === 'number') {
                            const parsed = Number(e.target.value);
                            newValue = isNaN(parsed) ? 0 : parsed;
                          } else if (typeof value === 'boolean') {
                            newValue = e.target.value.toLowerCase() === 'true';
                          }
                          setCustomProperty(key, newValue);
                        }}
                      />
                    </td>
                    <td className="type-badge">{typeof value}</td>
                    <td>
                      <button
                        onClick={() => removeCustomProperty(key)}
                        className="delete-btn"
                        title="Remove property"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-props">No custom properties defined.</p>
          )}

          {/* Add new property */}
          <div className="add-property">
            <input
              type="text"
              placeholder="Key"
              value={newPropKey}
              onChange={(e) => setNewPropKey(e.target.value)}
              onKeyDown={handlePropertyKeyDown}
            />
            <input
              type="text"
              placeholder="Value"
              value={newPropValue}
              onChange={(e) => setNewPropValue(e.target.value)}
              onKeyDown={handlePropertyKeyDown}
            />
            <button onClick={handleAddProperty} disabled={!newPropKey.trim()}>
              Add
            </button>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="dialog-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="dialog-btn create" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default MapPropertiesModal;
