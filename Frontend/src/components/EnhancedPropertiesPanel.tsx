import React, { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { SlideElement } from '../types';
import ChartPropertiesEditor from './ChartPropertiesEditor';

interface EnhancedPropertiesPanelProps {
  className?: string;
}

const EnhancedPropertiesPanel: React.FC<EnhancedPropertiesPanelProps> = ({ className = '' }) => {
  const { state, dispatch } = useApp();
  const { selectedElements } = state.drawingState;
  const currentSlide = state.presentation.slides[state.presentation.currentSlideIndex];
  
  if (!currentSlide || selectedElements.length === 0) {
    return (
      <div className={`properties-panel ${className}`}>
        <h3>Properties</h3>
        <p className="no-selection">No element selected</p>
      </div>
    );
  }
  
  const selectedElement = currentSlide.elements.find(el => el.id === selectedElements[0]);
  
  if (!selectedElement) {
    return (
      <div className={`properties-panel ${className}`}>
        <h3>Properties</h3>
        <p className="no-selection">Element not found</p>
      </div>
    );
  }

  const handleUpdateElement = useCallback((updates: Partial<SlideElement>) => {
    // Update both display properties and internal properties
    const fullUpdates: any = { ...updates };
    
    // For text elements, update both text and content
    if ('content' in updates || 'text' in updates) {
      fullUpdates.text = (updates as any).content || (updates as any).text;
      (fullUpdates as any).content = (updates as any).content || (updates as any).text;
    }
    
    // For color properties, update both color and fill
    if ('color' in updates) {
      fullUpdates.fill = (updates as any).color;
      (fullUpdates as any).color = (updates as any).color;
    }
    if ('fillColor' in updates) {
      fullUpdates.fill = (updates as any).fillColor;
      (fullUpdates as any).fillColor = (updates as any).fillColor;
    }
    
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        slideId: currentSlide.id,
        elementId: selectedElement.id,
        updates: fullUpdates
      }
    });
  }, [dispatch, currentSlide.id, selectedElement.id]);

  const renderCommonProperties = () => (
    <>
      <div className="property-group">
        <label>Position</label>
        <div className="position-inputs">
          <div className="input-group">
            <label>X</label>
            <input
              type="number"
              value={Math.round(selectedElement.x || 0)}
              onChange={(e) => handleUpdateElement({
                x: parseInt(e.target.value) || 0
              })}
            />
          </div>
          <div className="input-group">
            <label>Y</label>
            <input
              type="number"
              value={Math.round(selectedElement.y || 0)}
              onChange={(e) => handleUpdateElement({
                y: parseInt(e.target.value) || 0
              })}
            />
          </div>
        </div>
      </div>

      <div className="property-group">
        <label>Size</label>
        <div className="size-inputs">
          <div className="input-group">
            <label>Width</label>
            <input
              type="number"
              min="1"
              value={Math.round(selectedElement.width || 100)}
              onChange={(e) => handleUpdateElement({
                width: parseInt(e.target.value) || 1
              })}
            />
          </div>
          <div className="input-group">
            <label>Height</label>
            <input
              type="number"
              min="1"
              value={Math.round(selectedElement.height || 100)}
              onChange={(e) => handleUpdateElement({
                height: parseInt(e.target.value) || 1
              })}
            />
          </div>
        </div>
      </div>

      <div className="property-group">
        <label>Rotation</label>
        <input
          type="range"
          min="0"
          max="360"
          value={selectedElement.rotation || 0}
          onChange={(e) => handleUpdateElement({
            rotation: parseInt(e.target.value)
          })}
        />
        <span>{Math.round(selectedElement.rotation || 0)}°</span>
      </div>
    </>
  );

  const renderTextProperties = () => (
    <>
      <div className="property-group">
        <label>Text Content</label>
        <textarea
          value={(selectedElement as any).text || (selectedElement as any).content || ''}
          onChange={(e) => handleUpdateElement({ 
            text: e.target.value,
            ...({ content: e.target.value } as any)
          })}
          rows={3}
        />
      </div>

      <div className="property-group">
        <label>Font Family</label>
        <select
          value={selectedElement.fontFamily || 'Arial'}
          onChange={(e) => handleUpdateElement({ fontFamily: e.target.value })}
        >
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Courier New">Courier New</option>
          <option value="Verdana">Verdana</option>
        </select>
      </div>

      <div className="property-group">
        <label>Font Size</label>
        <input
          type="number"
          min="8"
          max="72"
          value={selectedElement.fontSize || 16}
          onChange={(e) => handleUpdateElement({ fontSize: parseInt(e.target.value) })}
        />
      </div>

      <div className="property-group">
        <label>Text Color</label>
        <input
          type="color"
          value={(selectedElement as any).fill || (selectedElement as any).color || '#000000'}
          onChange={(e) => handleUpdateElement({ 
            fill: e.target.value,
            ...({ color: e.target.value } as any)
          })}
        />
      </div>

      <div className="property-group">
        <label>Text Align</label>
        <select
          value={selectedElement.textAlign || 'left'}
          onChange={(e) => handleUpdateElement({ textAlign: e.target.value })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      <div className="property-group">
        <label>Font Style</label>
        <div className="button-group">
          <button
            className={`toggle-button ${selectedElement.fontWeight === 'bold' ? 'active' : ''}`}
            onClick={() => handleUpdateElement({ 
              fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' 
            })}
          >
            B
          </button>
          <button
            className={`toggle-button ${selectedElement.fontStyle === 'italic' ? 'active' : ''}`}
            onClick={() => handleUpdateElement({ 
              fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' 
            })}
          >
            I
          </button>
        </div>
      </div>
    </>
  );

  const renderShapeProperties = () => (
    <>
      <div className="property-group">
        <label>Fill Color</label>
        <input
          type="color"
          value={(selectedElement as any).fill || (selectedElement as any).fillColor || '#4285f4'}
          onChange={(e) => handleUpdateElement({ 
            fill: e.target.value,
            ...({ fillColor: e.target.value } as any)
          })}
        />
      </div>

      <div className="property-group">
        <label>Border Color</label>
        <input
          type="color"
          value={(selectedElement as any).stroke || (selectedElement as any).strokeColor || '#333333'}
          onChange={(e) => handleUpdateElement({ 
            stroke: e.target.value,
            ...({ strokeColor: e.target.value } as any)
          })}
        />
      </div>

      <div className="property-group">
        <label>Border Width</label>
        <input
          type="number"
          min="0"
          max="20"
          value={selectedElement.strokeWidth || 2}
          onChange={(e) => handleUpdateElement({ strokeWidth: parseInt(e.target.value) })}
        />
      </div>

      {selectedElement.shapeType === 'rectangle' && (
        <div className="property-group">
          <label>Corner Radius</label>
          <input
            type="number"
            min="0"
            max="50"
            value={selectedElement.cornerRadius || 0}
            onChange={(e) => handleUpdateElement({ cornerRadius: parseInt(e.target.value) })}
          />
        </div>
      )}
      
      {selectedElement.shapeType === 'pie' && (
        <>
          <div className="property-group">
            <label>Start Angle</label>
            <input
              type="range"
              min="0"
              max="360"
              value={(selectedElement as any).adjustments?.startAngle || (selectedElement as any).startAngle || 0}
              onChange={(e) => handleUpdateElement({ 
                adjustments: {
                  ...(selectedElement as any).adjustments,
                  startAngle: parseInt(e.target.value)
                }
              })}
            />
            <span>{(selectedElement as any).adjustments?.startAngle || (selectedElement as any).startAngle || 0}°</span>
          </div>
          
          <div className="property-group">
            <label>End Angle</label>
            <input
              type="range"
              min="0"
              max="360"
              value={(selectedElement as any).adjustments?.endAngle || (selectedElement as any).endAngle || 90}
              onChange={(e) => handleUpdateElement({ 
                adjustments: {
                  ...(selectedElement as any).adjustments,
                  endAngle: parseInt(e.target.value)
                }
              })}
            />
            <span>{(selectedElement as any).adjustments?.endAngle || (selectedElement as any).endAngle || 90}°</span>
          </div>
          
          <div className="property-group">
            <label>Inner Radius</label>
            <input
              type="range"
              min="0"
              max="95"
              step="5"
              value={Math.round(((selectedElement as any).adjustments?.innerRadius || 0) * 100)}
              onChange={(e) => handleUpdateElement({ 
                adjustments: {
                  ...(selectedElement as any).adjustments,
                  innerRadius: parseInt(e.target.value) / 100
                }
              })}
            />
            <span>{Math.round(((selectedElement as any).adjustments?.innerRadius || 0) * 100)}%</span>
          </div>
        </>
      )}

      <div className="property-group">
        <label>Opacity</label>
        <input
          type="range"
          min="0"
          max="100"
          value={(selectedElement.opacity || 1) * 100}
          onChange={(e) => handleUpdateElement({ opacity: parseInt(e.target.value) / 100 })}
        />
        <span>{Math.round((selectedElement.opacity || 1) * 100)}%</span>
      </div>
    </>
  );

  const renderLineProperties = () => (
    <>
      <div className="property-group">
        <label>Line Color</label>
        <input
          type="color"
          value={selectedElement.stroke || '#333333'}
          onChange={(e) => handleUpdateElement({ stroke: e.target.value })}
        />
      </div>

      <div className="property-group">
        <label>Line Width</label>
        <input
          type="number"
          min="1"
          max="20"
          value={selectedElement.strokeWidth || 2}
          onChange={(e) => handleUpdateElement({ strokeWidth: parseInt(e.target.value) })}
        />
      </div>

      <div className="property-group">
        <label>Line Style</label>
        <select
          value={selectedElement.strokeStyle || 'solid'}
          onChange={(e) => handleUpdateElement({ strokeStyle: e.target.value })}
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>
    </>
  );

  const renderImageProperties = () => (
    <>
      <div className="property-group">
        <label>Image Source</label>
        <input
          type="text"
          value={selectedElement.src || ''}
          readOnly
          disabled
        />
      </div>

      <div className="property-group">
        <label>Opacity</label>
        <input
          type="range"
          min="0"
          max="100"
          value={(selectedElement.opacity || 1) * 100}
          onChange={(e) => handleUpdateElement({ opacity: parseInt(e.target.value) / 100 })}
        />
        <span>{Math.round((selectedElement.opacity || 1) * 100)}%</span>
      </div>
    </>
  );

  const renderChartProperties = () => {
    return (
      <ChartPropertiesEditor 
        chartElement={selectedElement as any}
        onUpdateElement={handleUpdateElement}
      />
    );
  };

  const renderTableProperties = () => {
    const tableElement = selectedElement as any;
    return (
      <>
        <div className="property-group">
          <label>Table Style</label>
          <select
            value={tableElement.tableStyle || 'none'}
            onChange={(e) => handleUpdateElement({ tableStyle: e.target.value } as any)}
          >
            <option value="none">No Style</option>
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="dark">Dark</option>
            <option value="accent1">Accent 1</option>
            <option value="accent2">Accent 2</option>
          </select>
        </div>

        <div className="property-group">
          <label>Table Options</label>
          <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={tableElement.headerRow || false}
                onChange={(e) => handleUpdateElement({ headerRow: e.target.checked } as any)}
              />
              Header Row
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={tableElement.headerColumn || false}
                onChange={(e) => handleUpdateElement({ headerColumn: e.target.checked } as any)}
              />
              First Column
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={tableElement.alternatingRows || false}
                onChange={(e) => handleUpdateElement({ alternatingRows: e.target.checked } as any)}
              />
              Banded Rows
            </label>
          </div>
        </div>

        <div className="property-group">
          <label>Border</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="color"
              value={tableElement.borderColor || '#000000'}
              onChange={(e) => handleUpdateElement({ borderColor: e.target.value } as any)}
              title="Border Color"
              style={{ width: '50px' }}
            />
            <input
              type="number"
              min="0"
              max="10"
              value={tableElement.borderWidth || 1}
              onChange={(e) => handleUpdateElement({ borderWidth: parseInt(e.target.value) || 1 } as any)}
              placeholder="Width"
              style={{ width: '60px' }}
            />
            <select
              value={tableElement.borderStyle || 'solid'}
              onChange={(e) => handleUpdateElement({ borderStyle: e.target.value } as any)}
              style={{ flex: 1 }}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className={`properties-panel ${className}`}>
      <div className="properties-header">
        <h3>Properties</h3>
      </div>
      
      <div className="properties-content">
        <div className="property-section">
          <h4>Element Type: {selectedElement.type}</h4>
          {selectedElement.shapeType && (
            <p>Shape: {selectedElement.shapeType}</p>
          )}
        </div>

        <div className="property-section">
          <h4>Transform</h4>
          {renderCommonProperties()}
        </div>

        <div className="property-section">
          <h4>Style</h4>
          {selectedElement.type === 'text' && renderTextProperties()}
          {selectedElement.type === 'shape' && renderShapeProperties()}
          {selectedElement.type === 'line' && renderLineProperties()}
          {selectedElement.type === 'image' && renderImageProperties()}
          {selectedElement.type === 'wordart' && renderTextProperties()}
          {selectedElement.type === 'table' && renderTableProperties()}
          {selectedElement.type === 'chart' && renderChartProperties()}
        </div>

        <div className="property-section">
          <h4>Advanced</h4>
          <div className="property-group">
            <label>Z-Index</label>
            <input
              type="number"
              value={selectedElement.zIndex || 0}
              onChange={(e) => handleUpdateElement({ zIndex: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="property-group">
            <label>Visibility</label>
            <button
              className={`toggle-button ${(selectedElement.visible ?? true) ? 'active' : ''}`}
              onClick={() => handleUpdateElement({ visible: !(selectedElement.visible ?? true) })}
            >
              {(selectedElement.visible ?? true) ? 'Visible' : 'Hidden'}
            </button>
          </div>

          <div className="property-group">
            <label>Lock</label>
            <button
              className={`toggle-button ${(selectedElement.locked ?? false) ? 'active' : ''}`}
              onClick={() => handleUpdateElement({ locked: !(selectedElement.locked ?? false) })}
            >
              {(selectedElement.locked ?? false) ? 'Locked' : 'Unlocked'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPropertiesPanel;