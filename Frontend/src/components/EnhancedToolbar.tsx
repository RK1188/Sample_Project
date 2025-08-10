import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

interface EnhancedToolbarProps {
  className?: string;
}

// Shape categories for Google Slides-like organization
const shapeCategories = {
  basic: [
    { id: 'rectangle', name: 'Rectangle', icon: '▭' },
    { id: 'roundedRectangle', name: 'Rounded Rectangle', icon: '▢' },
    { id: 'circle', name: 'Circle', icon: '○' },
    { id: 'ellipse', name: 'Ellipse', icon: '⬭' },
    { id: 'triangle', name: 'Triangle', icon: '△' },
    { id: 'rightTriangle', name: 'Right Triangle', icon: '◣' },
    { id: 'diamond', name: 'Diamond', icon: '◇' },
    { id: 'pentagon', name: 'Pentagon', icon: '⬟' },
    { id: 'hexagon', name: 'Hexagon', icon: '⬢' },
    { id: 'octagon', name: 'Octagon', icon: '⬡' },
    { id: 'trapezoid', name: 'Trapezoid', icon: '⏢' },
    { id: 'parallelogram', name: 'Parallelogram', icon: '▱' },
  ],
  arrows: [
    { id: 'arrow', name: 'Arrow', icon: '→' },
    { id: 'doubleArrow', name: 'Double Arrow', icon: '↔' },
    { id: 'upArrow', name: 'Up Arrow', icon: '↑' },
    { id: 'downArrow', name: 'Down Arrow', icon: '↓' },
    { id: 'leftArrow', name: 'Left Arrow', icon: '←' },
    { id: 'rightArrow', name: 'Right Arrow', icon: '→' },
    { id: 'upDownArrow', name: 'Up-Down Arrow', icon: '↕' },
    { id: 'quadArrow', name: 'Quad Arrow', icon: '✚' },
    { id: 'bentArrow', name: 'Bent Arrow', icon: '↱' },
    { id: 'uTurnArrow', name: 'U-Turn Arrow', icon: '↩' },
  ],
  callouts: [
    { id: 'speechBubble', name: 'Speech Bubble', icon: '💬' },
    { id: 'thoughtBubble', name: 'Thought Bubble', icon: '💭' },
    { id: 'roundedRectCallout', name: 'Rounded Rect Callout', icon: '🗨' },
    { id: 'ovalCallout', name: 'Oval Callout', icon: '🗯' },
  ],
  stars: [
    { id: 'star4', name: '4-Point Star', icon: '✦' },
    { id: 'star5', name: '5-Point Star', icon: '⭐' },
    { id: 'star6', name: '6-Point Star', icon: '✶' },
    { id: 'star8', name: '8-Point Star', icon: '✴' },
  ],
  symbols: [
    { id: 'plus', name: 'Plus', icon: '✚' },
    { id: 'minus', name: 'Minus', icon: '━' },
    { id: 'multiply', name: 'Multiply', icon: '✕' },
    { id: 'divide', name: 'Divide', icon: '÷' },
    { id: 'equal', name: 'Equal', icon: '=' },
    { id: 'heart', name: 'Heart', icon: '❤' },
    { id: 'lightningBolt', name: 'Lightning', icon: '⚡' },
    { id: 'sun', name: 'Sun', icon: '☀' },
    { id: 'moon', name: 'Moon', icon: '🌙' },
    { id: 'cloud', name: 'Cloud', icon: '☁' },
    { id: 'smileyFace', name: 'Smiley', icon: '😊' },
    { id: 'pie', name: 'Pie Chart', icon: '🥧' },
    { id: 'donut', name: 'Donut', icon: '🍩' },
  ],
  flowchart: [
    { id: 'flowchartProcess', name: 'Process', icon: '▭' },
    { id: 'flowchartDecision', name: 'Decision', icon: '◇' },
    { id: 'flowchartData', name: 'Data', icon: '▱' },
    { id: 'flowchartDocument', name: 'Document', icon: '📄' },
    { id: 'flowchartTerminator', name: 'Terminator', icon: '⬭' },
    { id: 'flowchartConnector', name: 'Connector', icon: '○' },
  ]
};

const EnhancedToolbar: React.FC<EnhancedToolbarProps> = ({ className = '' }) => {
  const { state, dispatch } = useApp();
  const [showShapeMenu, setShowShapeMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('basic');
  const [menuPosition, setMenuPosition] = useState({ top: 60, left: 220 });
  const shapeButtonRef = useRef<HTMLButtonElement>(null);
  const { tools } = state;
  const { selectedElements } = state.drawingState;
  const currentSlide = state.presentation.slides[state.presentation.currentSlideIndex];

  // Update menu position based on button location
  const updateMenuPosition = useCallback(() => {
    if (shapeButtonRef.current) {
      const rect = shapeButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: Math.max(0, rect.left)
      });
    }
  }, []);

  // Handle tool selection
  const handleToolSelect = useCallback((toolId: string) => {
    const tool = tools.find(t => t.id === toolId);
    if (tool) {
      dispatch({ type: 'SET_TOOL', payload: tool });
    }
  }, [tools, dispatch]);

  // Handle shape selection
  const handleShapeSelect = useCallback((shapeType: string) => {
    // Set the current tool to shape with the selected shape type
    dispatch({ 
      type: 'SET_TOOL', 
      payload: { 
        id: shapeType, 
        name: shapeType, 
        icon: '⬜', 
        type: 'shape', 
        active: true,
        shapeType: shapeType as any
      } 
    });
    setShowShapeMenu(false);
  }, [dispatch]);

  // Handle undo/redo
  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, [dispatch]);

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, [dispatch]);

  // Handle copy/paste
  const handleCopy = useCallback(() => {
    if (!currentSlide || selectedElements.length === 0) return;
    
    const elementsToCopy = selectedElements
      .map(id => currentSlide.elements.find(el => el.id === id))
      .filter(el => el !== undefined);
    
    dispatch({
      type: 'SET_DRAWING_STATE',
      payload: { clipboard: elementsToCopy }
    });
  }, [currentSlide, selectedElements, dispatch]);

  const handlePaste = useCallback(() => {
    if (!currentSlide || state.drawingState.clipboard.length === 0) return;
    
    state.drawingState.clipboard.forEach((element, index) => {
      const newElement: any = {
        ...element,
        id: `${element.id}_copy_${Date.now()}_${index}`,
        x: (element.x || 0) + 20,
        y: (element.y || 0) + 20,
        selected: false
      };
      
      dispatch({
        type: 'ADD_ELEMENT',
        payload: { slideId: currentSlide.id, element: newElement }
      });
    });
  }, [currentSlide, state.drawingState.clipboard, dispatch]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!currentSlide || selectedElements.length === 0) return;
    
    selectedElements.forEach(elementId => {
      dispatch({
        type: 'DELETE_ELEMENT',
        payload: { slideId: currentSlide.id, elementId }
      });
    });
  }, [currentSlide, selectedElements, dispatch]);

  // Handle group
  const handleGroup = useCallback(() => {
    if (!currentSlide || selectedElements.length < 2) return;
    
    dispatch({
      type: 'GROUP_ELEMENTS',
      payload: {
        slideId: currentSlide.id,
        elementIds: selectedElements
      }
    });
  }, [currentSlide, selectedElements, dispatch]);

  // Handle ungroup
  const handleUngroup = useCallback(() => {
    if (!currentSlide || selectedElements.length !== 1) return;
    
    const selectedElement = currentSlide.elements.find(el => el.id === selectedElements[0]);
    if (!selectedElement || selectedElement.type !== 'group') return;
    
    dispatch({
      type: 'UNGROUP_ELEMENTS',
      payload: {
        slideId: currentSlide.id,
        groupId: selectedElements[0]
      }
    });
  }, [currentSlide, selectedElements, dispatch]);

  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;
  const hasSelection = selectedElements.length > 0;
  const canGroup = selectedElements.length >= 2;
  const canUngroup = selectedElements.length === 1 && 
    currentSlide?.elements.find(el => el.id === selectedElements[0])?.type === 'group';

  return (
    <div className={`enhanced-toolbar ${className}`}>
      {/* Main tools */}
      <div className="toolbar-section">
        <button 
          className={`toolbar-button ${state.drawingState.currentTool.id === 'select' ? 'active' : ''}`}
          onClick={() => handleToolSelect('select')}
          title="Select"
        >
          <span className="toolbar-icon">🔍</span>
          <span className="toolbar-label">Select</span>
        </button>
        <button 
          className={`toolbar-button ${state.drawingState.currentTool.type === 'text' ? 'active' : ''}`}
          onClick={() => handleToolSelect('text')}
          title="Text"
        >
          <span className="toolbar-icon">📝</span>
          <span className="toolbar-label">Text</span>
        </button>
        
        {/* Shape dropdown */}
        <div className="shape-dropdown">
          <button 
            ref={shapeButtonRef}
            className={`toolbar-button ${state.drawingState.currentTool.type === 'shape' ? 'active' : ''}`}
            onClick={() => {
              updateMenuPosition();
              setShowShapeMenu(!showShapeMenu);
            }}
            title="Shapes"
          >
            <span className="toolbar-icon">⬜</span>
            <span className="toolbar-label">Shapes ▼</span>
          </button>
          
          {showShapeMenu && (
            <div 
              className="shape-menu"
              style={{
                top: menuPosition.top,
                left: menuPosition.left
              }}
            >
              <div className="shape-categories">
                {Object.keys(shapeCategories).map(category => (
                  <button
                    key={category}
                    className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
              <div className="shape-grid">
                {shapeCategories[selectedCategory as keyof typeof shapeCategories].map(shape => (
                  <button
                    key={shape.id}
                    className="shape-item"
                    onClick={() => handleShapeSelect(shape.id)}
                    title={shape.name}
                  >
                    <span className="shape-icon">{shape.icon}</span>
                    <span className="shape-name">{shape.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <button 
          className={`toolbar-button ${state.drawingState.currentTool.id === 'line' ? 'active' : ''}`}
          onClick={() => handleToolSelect('line')}
          title="Line"
        >
          <span className="toolbar-icon">📏</span>
          <span className="toolbar-label">Line</span>
        </button>
        <button 
          className={`toolbar-button ${state.drawingState.currentTool.id === 'connector' ? 'active' : ''}`}
          onClick={() => handleToolSelect('connector')}
          title="Connector"
        >
          <span className="toolbar-icon">⇔</span>
          <span className="toolbar-label">Connector</span>
        </button>
        <button 
          className={`toolbar-button ${state.drawingState.currentTool.id === 'image' ? 'active' : ''}`}
          onClick={() => handleToolSelect('image')}
          title="Image"
        >
          <span className="toolbar-icon">🖼️</span>
          <span className="toolbar-label">Image</span>
        </button>
        <button 
          className={`toolbar-button ${state.drawingState.currentTool.id === 'table' ? 'active' : ''}`}
          onClick={() => handleToolSelect('table')}
          title="Table"
        >
          <span className="toolbar-icon">⊞</span>
          <span className="toolbar-label">Table</span>
        </button>
        <button 
          className={`toolbar-button ${state.drawingState.currentTool.id === 'chart' ? 'active' : ''}`}
          onClick={() => handleToolSelect('chart')}
          title="Chart"
        >
          <span className="toolbar-icon">📊</span>
          <span className="toolbar-label">Chart</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Edit tools */}
      <div className="toolbar-section">
        <button 
          className="toolbar-button"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <span className="toolbar-icon">↶</span>
          <span className="toolbar-label">Undo</span>
        </button>
        <button 
          className="toolbar-button"
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <span className="toolbar-icon">↷</span>
          <span className="toolbar-label">Redo</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Selection tools */}
      <div className="toolbar-section">
        <button 
          className="toolbar-button"
          onClick={handleCopy}
          disabled={!hasSelection}
          title="Copy"
        >
          <span className="toolbar-icon">📋</span>
          <span className="toolbar-label">Copy</span>
        </button>
        <button 
          className="toolbar-button"
          onClick={handlePaste}
          disabled={state.drawingState.clipboard.length === 0}
          title="Paste"
        >
          <span className="toolbar-icon">📌</span>
          <span className="toolbar-label">Paste</span>
        </button>
        <button 
          className="toolbar-button"
          onClick={handleDelete}
          disabled={!hasSelection}
          title="Delete"
        >
          <span className="toolbar-icon">🗑️</span>
          <span className="toolbar-label">Delete</span>
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Group tools */}
      <div className="toolbar-section">
        <button 
          className="toolbar-button"
          onClick={handleGroup}
          disabled={!canGroup}
          title="Group (Ctrl+G)"
        >
          <span className="toolbar-icon">🔗</span>
          <span className="toolbar-label">Group</span>
        </button>
        <button 
          className="toolbar-button"
          onClick={handleUngroup}
          disabled={!canUngroup}
          title="Ungroup (Ctrl+Shift+G)"
        >
          <span className="toolbar-icon">🔓</span>
          <span className="toolbar-label">Ungroup</span>
        </button>
      </div>
    </div>
  );
};

export default EnhancedToolbar;