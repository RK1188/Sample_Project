import React, { useCallback } from 'react';
import { ChromePicker } from 'react-color';
import { useApp } from '../context/AppContext';
import { TextElement, ShapeElement } from '../types';

interface PropertiesPanelProps {
  className?: string;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ className = '' }) => {
  const { state, dispatch } = useApp();
  const { selectedElements } = state.drawingState;
  const currentSlide = state.presentation.slides[state.presentation.currentSlideIndex];
  
  if (!currentSlide || selectedElements.length === 0) {
    return (
      <div className={`properties-panel ${className}`}>
        <div className="panel-header">
          <h3>Properties</h3>
        </div>
        <div className="panel-content">
          <p>Select an element to edit its properties</p>
        </div>
      </div>
    );
  }

  const selectedElement = currentSlide.elements.find(el => el.id === selectedElements[0]);
  
  if (!selectedElement) return null;

  const handleUpdateElement = useCallback((updates: any) => {
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        slideId: currentSlide.id,
        elementId: selectedElement.id,
        updates
      }
    });
  }, [dispatch, currentSlide.id, selectedElement.id]);

  const renderTextProperties = (element: TextElement) => (
    <div className="text-properties">
      <div className="property-group">
        <label>Content</label>
        <textarea
          value={element.content}
          onChange={(e) => handleUpdateElement({ content: e.target.value })}
          rows={3}
        />
      </div>

      <div className="property-group">
        <label>Font Family</label>
        <select
          value={element.fontFamily}
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
          value={element.fontSize}
          onChange={(e) => handleUpdateElement({ fontSize: parseInt(e.target.value) })}
        />
      </div>

      <div className="property-group">
        <label>Text Align</label>
        <select
          value={element.textAlign}
          onChange={(e) => handleUpdateElement({ textAlign: e.target.value })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      <div className="property-group">
        <label>Font Weight</label>
        <button
          className={`toggle-button ${element.fontWeight === 'bold' ? 'active' : ''}`}
          onClick={() => handleUpdateElement({ 
            fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' 
          })}
        >
          Bold
        </button>
      </div>

      <div className="property-group">
        <label>Font Style</label>
        <button
          className={`toggle-button ${element.fontStyle === 'italic' ? 'active' : ''}`}
          onClick={() => handleUpdateElement({ 
            fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' 
          })}
        >
          Italic
        </button>
      </div>

      <div className="property-group">
        <label>Text Color</label>
        <input
          type="color"
          value={element.color}
          onChange={(e) => handleUpdateElement({ color: e.target.value })}
        />
      </div>
    </div>
  );

  const renderShapeProperties = (element: ShapeElement) => (
    <div className="shape-properties">
      <div className="property-group">
        <label>Shape Type</label>
        <select
          value={element.shapeType}
          onChange={(e) => handleUpdateElement({ shapeType: e.target.value })}
        >
          <option value="rectangle">Rectangle</option>
          <option value="circle">Circle</option>
          <option value="ellipse">Ellipse</option>
          <option value="triangle">Triangle</option>
        </select>
      </div>

      <div className="property-group">
        <label>Fill Color</label>
        <input
          type="color"
          value={element.fillColor}
          onChange={(e) => handleUpdateElement({ fillColor: e.target.value })}
        />
      </div>

      <div className="property-group">
        <label>Stroke Color</label>
        <input
          type="color"
          value={element.strokeColor}
          onChange={(e) => handleUpdateElement({ strokeColor: e.target.value })}
        />
      </div>

      <div className="property-group">
        <label>Stroke Width</label>
        <input
          type="number"
          min="0"
          max="20"
          value={element.strokeWidth}
          onChange={(e) => handleUpdateElement({ strokeWidth: parseInt(e.target.value) })}
        />
      </div>

      {element.shapeType === 'rectangle' && (
        <div className="property-group">
          <label>Corner Radius</label>
          <input
            type="number"
            min="0"
            max="50"
            value={element.cornerRadius || 0}
            onChange={(e) => handleUpdateElement({ cornerRadius: parseInt(e.target.value) })}
          />
        </div>
      )}
    </div>
  );

  const renderCommonProperties = () => (
    <div className="common-properties">
      <div className="property-group">
        <label>Position</label>
        <div className="position-inputs">
          <div className="input-group">
            <label>X</label>
            <input
              type="number"
              value={Math.round(selectedElement.transform?.x || selectedElement.x || 0)}
              onChange={(e) => handleUpdateElement({
                transform: {
                  ...(selectedElement.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }),
                  x: parseInt(e.target.value) || 0
                }
              })}
            />
          </div>
          <div className="input-group">
            <label>Y</label>
            <input
              type="number"
              value={Math.round(selectedElement.transform?.y || selectedElement.y || 0)}
              onChange={(e) => handleUpdateElement({
                transform: {
                  ...(selectedElement.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }),
                  y: parseInt(e.target.value) || 0
                }
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
              value={Math.round(selectedElement.size?.width || selectedElement.width || 100)}
              onChange={(e) => handleUpdateElement({
                size: {
                  ...(selectedElement.size || { width: 100, height: 100 }),
                  width: parseInt(e.target.value) || 1
                }
              })}
            />
          </div>
          <div className="input-group">
            <label>Height</label>
            <input
              type="number"
              min="1"
              value={Math.round(selectedElement.size?.height || selectedElement.height || 100)}
              onChange={(e) => handleUpdateElement({
                size: {
                  ...(selectedElement.size || { width: 100, height: 100 }),
                  height: parseInt(e.target.value) || 1
                }
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
          value={selectedElement.transform?.rotation || selectedElement.rotation || 0}
          onChange={(e) => handleUpdateElement({
            transform: {
              ...selectedElement.transform,
              rotation: parseInt(e.target.value)
            }
          })}
        />
        <span>{Math.round(selectedElement.transform?.rotation || selectedElement.rotation || 0)}°</span>
      </div>

      <div className="property-group">
        <label>Z-Index</label>
        <input
          type="number"
          value={selectedElement.zIndex || 0}
          onChange={(e) => handleUpdateElement({
            zIndex: parseInt(e.target.value) || 0
          })}
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
  );

  return (
    <div className={`properties-panel ${className}`}>
      <div className="panel-header">
        <h3>Properties</h3>
        <span className="selected-count">
          {selectedElements.length} selected
        </span>
      </div>
      
      <div className="panel-content">
        <div className="element-type-indicator">
          <span className="element-type">{selectedElement.type.toUpperCase()}</span>
        </div>

        {renderCommonProperties()}

        <div className="property-separator" />

        {selectedElement.type === 'text' && renderTextProperties(selectedElement as TextElement)}
        {selectedElement.type === 'shape' && renderShapeProperties(selectedElement as ShapeElement)}
      </div>
    </div>
  );
};

export default PropertiesPanel;