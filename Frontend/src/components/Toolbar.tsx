import React, { useCallback } from 'react';
import { useApp } from '../context/AppContext';

interface ToolbarProps {
  className?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({ className = '' }) => {
  const { state, dispatch } = useApp();
  const { tools } = state;
  const { selectedElements } = state.drawingState;
  const currentSlide = state.presentation.slides[state.presentation.currentSlideIndex];

  // Handle tool selection
  const handleToolSelect = useCallback((toolId: string) => {
    const tool = tools.find(t => t.id === toolId);
    if (tool) {
      dispatch({ type: 'SET_TOOL', payload: tool });
    }
  }, [tools, dispatch]);

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
        transform: {
          x: (element.transform?.x || element.x || 0) + 20,
          y: (element.transform?.y || element.y || 0) + 20,
          rotation: element.transform?.rotation || element.rotation || 0,
          scaleX: element.transform?.scaleX || 1,
          scaleY: element.transform?.scaleY || 1
        },
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

  // Handle alignment
  const handleAlign = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!currentSlide || selectedElements.length === 0) return;
    
    const elements = selectedElements
      .map(id => currentSlide.elements.find(el => el.id === id))
      .filter(el => el !== undefined);
    
    if (elements.length === 0) return;
    
    let targetValue: number;
    
    switch (alignment) {
      case 'left':
        targetValue = Math.min(...elements.map(el => el?.transform?.x || el?.x || 0));
        elements.forEach(element => {
          if (element) {
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                slideId: currentSlide.id,
                elementId: element.id,
                updates: { transform: { 
                  x: targetValue,
                  y: element.transform?.y || element.y || 0,
                  rotation: element.transform?.rotation || element.rotation || 0,
                  scaleX: element.transform?.scaleX || 1,
                  scaleY: element.transform?.scaleY || 1
                } }
              }
            });
          }
        });
        break;
        
      case 'center':
        targetValue = elements.reduce((sum, el) => sum + (el?.transform?.x || el?.x || 0) + (el?.size?.width || el?.width || 0) / 2, 0) / elements.length;
        elements.forEach(element => {
          if (element) {
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                slideId: currentSlide.id,
                elementId: element.id,
                updates: { 
                  transform: { 
                    ...(element.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }), 
                    x: targetValue - (element.size?.width || element.width || 0) / 2 
                  } 
                }
              }
            });
          }
        });
        break;
        
      case 'right':
        targetValue = Math.max(...elements.map(el => (el?.transform?.x || el?.x || 0) + (el?.size?.width || el?.width || 0)));
        elements.forEach(element => {
          if (element) {
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                slideId: currentSlide.id,
                elementId: element.id,
                updates: { 
                  transform: { 
                    ...(element.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }), 
                    x: targetValue - (element.size?.width || element.width || 0) 
                  } 
                }
              }
            });
          }
        });
        break;
        
      case 'top':
        targetValue = Math.min(...elements.map(el => el?.transform?.y || el?.y || 0));
        elements.forEach(element => {
          if (element) {
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                slideId: currentSlide.id,
                elementId: element.id,
                updates: { transform: { 
                  x: element.transform?.x || element.x || 0,
                  y: targetValue,
                  rotation: element.transform?.rotation || element.rotation || 0,
                  scaleX: element.transform?.scaleX || 1,
                  scaleY: element.transform?.scaleY || 1
                } }
              }
            });
          }
        });
        break;
        
      case 'middle':
        targetValue = elements.reduce((sum, el) => sum + (el?.transform?.y || el?.y || 0) + (el?.size?.height || el?.height || 0) / 2, 0) / elements.length;
        elements.forEach(element => {
          if (element) {
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                slideId: currentSlide.id,
                elementId: element.id,
                updates: { 
                  transform: { 
                    ...(element.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }), 
                    y: targetValue - (element.size?.height || element.height || 0) / 2 
                  } 
                }
              }
            });
          }
        });
        break;
        
      case 'bottom':
        targetValue = Math.max(...elements.map(el => (el?.transform?.y || el?.y || 0) + (el?.size?.height || el?.height || 0)));
        elements.forEach(element => {
          if (element) {
            dispatch({
              type: 'UPDATE_ELEMENT',
              payload: {
                slideId: currentSlide.id,
                elementId: element.id,
                updates: { 
                  transform: { 
                    ...(element.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }), 
                    y: targetValue - (element.size?.height || element.height || 0) 
                  } 
                }
              }
            });
          }
        });
        break;
    }
  }, [currentSlide, selectedElements, dispatch]);

  const getToolIcon = (toolId: string) => {
    switch (toolId) {
      case 'select': return '🔍';
      case 'text': return 'T';
      case 'rectangle': return '⬜';
      case 'circle': return '⭕';
      case 'pie': return '🍕';
      case 'line': return '📏';
      case 'connector': return '⇔';
      case 'image': return '🖼️';
      default: return '?';
    }
  };

  return (
    <div className={`toolbar ${className}`}>
      <div className="toolbar-section tools">
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`toolbar-button tool-button ${tool.active ? 'active' : ''}`}
            onClick={() => handleToolSelect(tool.id)}
            title={tool.name}
          >
            <span className="tool-icon">{getToolIcon(tool.id)}</span>
            <span className="tool-name">{tool.name}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-section actions">
        <button 
          className="toolbar-button action-button"
          onClick={handleUndo}
          title="Undo (Ctrl+Z)"
          disabled={state.history?.past?.length === 0}
        >
          ↶
        </button>
        
        <button 
          className="toolbar-button action-button"
          onClick={handleRedo}
          title="Redo (Ctrl+Y)"
          disabled={state.history?.future?.length === 0}
        >
          ↷
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-section clipboard">
        <button 
          className="toolbar-button action-button"
          onClick={handleCopy}
          title="Copy"
          disabled={selectedElements.length === 0}
        >
          📋
        </button>
        
        <button 
          className="toolbar-button action-button"
          onClick={handlePaste}
          title="Paste"
          disabled={state.drawingState.clipboard.length === 0}
        >
          📄
        </button>
        
        <button 
          className="toolbar-button action-button danger"
          onClick={handleDelete}
          title="Delete"
          disabled={selectedElements.length === 0}
        >
          🗑️
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-section grouping">
        <button 
          className="toolbar-button action-button"
          onClick={handleGroup}
          title="Group selected elements (Ctrl+G)"
          disabled={selectedElements.length < 2}
        >
          🔗
        </button>
        
        <button 
          className="toolbar-button action-button"
          onClick={handleUngroup}
          title="Ungroup selected group (Ctrl+Shift+G)"
          disabled={selectedElements.length !== 1 || !currentSlide?.elements.find(el => el.id === selectedElements[0])?.type || currentSlide?.elements.find(el => el.id === selectedElements[0])?.type !== 'group'}
        >
          🔓
        </button>
      </div>

      <div className="toolbar-separator" />

      <div className="toolbar-section alignment">
        <div className="alignment-group">
          <span className="group-label">Align:</span>
          <button 
            className="toolbar-button align-button"
            onClick={() => handleAlign('left')}
            title="Align Left"
            disabled={selectedElements.length === 0}
          >
            ⫷
          </button>
          
          <button 
            className="toolbar-button align-button"
            onClick={() => handleAlign('center')}
            title="Align Center"
            disabled={selectedElements.length === 0}
          >
            ⫸
          </button>
          
          <button 
            className="toolbar-button align-button"
            onClick={() => handleAlign('right')}
            title="Align Right"
            disabled={selectedElements.length === 0}
          >
            ⫹
          </button>
          
          <button 
            className="toolbar-button align-button"
            onClick={() => handleAlign('top')}
            title="Align Top"
            disabled={selectedElements.length === 0}
          >
            ⫶
          </button>
          
          <button 
            className="toolbar-button align-button"
            onClick={() => handleAlign('middle')}
            title="Align Middle"
            disabled={selectedElements.length === 0}
          >
            ─
          </button>
          
          <button 
            className="toolbar-button align-button"
            onClick={() => handleAlign('bottom')}
            title="Align Bottom"
            disabled={selectedElements.length === 0}
          >
            ⫯
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;