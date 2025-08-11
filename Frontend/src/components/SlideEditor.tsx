import React, { useState, useCallback, useRef } from 'react';
import DrawingCanvas from './DrawingCanvas';
import EnhancedToolbar from './EnhancedToolbar';
import EnhancedPropertiesPanel from './EnhancedPropertiesPanel';
import SimpleRuler from './SimpleRuler';
import { useApp } from '../context/AppContext';
import { FileService } from '../services/fileService';

interface SlideEditorProps {
  className?: string;
}

const SlideEditor: React.FC<SlideEditorProps> = ({ className = '' }) => {
  const { state, dispatch } = useApp();
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 540 });
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showRulers, setShowRulers] = useState(true);
  const [rulerUnit, setRulerUnit] = useState<'px' | 'cm' | 'in'>('px');
  const [horizontalGuides, setHorizontalGuides] = useState<number[]>([]);
  const [verticalGuides, setVerticalGuides] = useState<number[]>([]);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const currentSlide = state.presentation.slides[state.presentation.currentSlideIndex];
  const { zoom, panX, panY } = state.viewportState;
  const { toolbarVisible, propertiesPanelVisible } = state.uiState;

  // Handle zoom
  const handleZoom = useCallback((newZoom: number) => {
    dispatch({
      type: 'SET_VIEWPORT',
      payload: { zoom: Math.max(0.1, Math.min(5, newZoom)) }
    });
  }, [dispatch]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    handleZoom(zoom * 1.2);
  }, [zoom, handleZoom]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    handleZoom(zoom / 1.2);
  }, [zoom, handleZoom]);

  // Handle zoom to fit
  const handleZoomToFit = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current.querySelector('.canvas-container');
    if (!container) return;
    
    const containerWidth = container.clientWidth - 40; // Subtract padding
    const containerHeight = container.clientHeight - 40; // Subtract padding
    
    const scaleX = containerWidth / canvasSize.width;
    const scaleY = containerHeight / canvasSize.height;
    const newZoom = Math.min(scaleX, scaleY) * 0.85; // 85% to add some padding
    
    handleZoom(newZoom);
    
    // Center the canvas
    dispatch({
      type: 'SET_VIEWPORT',
      payload: {
        panX: 0,
        panY: 0,
        zoom: newZoom
      }
    });
  }, [canvasSize, dispatch, handleZoom]);

  // Handle pan
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    dispatch({
      type: 'SET_VIEWPORT',
      payload: {
        panX: panX + deltaX,
        panY: panY + deltaY
      }
    });
  }, [panX, panY, dispatch]);

  // Handle import slides
  const handleImportSlides = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validExtensions = ['.pptx', '.odp'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      setImportError('Please upload a valid PowerPoint (.pptx) or OpenDocument (.odp) file.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const result = await FileService.importFile(file);
      
      if (result.success && result.presentation) {
        // Add slides from imported presentation to current presentation
        const importedSlides = result.presentation.slides;
        
        if (importedSlides && importedSlides.length > 0) {
          // Add each imported slide to the current presentation
          importedSlides.forEach(slide => {
            dispatch({
              type: 'ADD_SLIDE',
              payload: {
                ...slide,
                id: `${slide.id}_imported_${Date.now()}`, // Ensure unique ID
                title: `${slide.title || 'Imported Slide'}`
              }
            });
          });
          
          // Show success notification
          dispatch({
            type: 'SET_UI_STATE',
            payload: {
              notifications: [
                {
                  id: Date.now().toString(),
                  type: 'success',
                  title: 'Import Successful',
                  message: `Imported ${importedSlides.length} slide(s) successfully.`,
                  timestamp: new Date()
                }
              ]
            }
          });
        } else {
          setImportError('No slides found in the imported file.');
        }
      } else {
        setImportError(result.error || 'Failed to import file');
      }
    } catch (error) {
      setImportError(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      dispatch({ type: 'SET_LOADING', payload: false });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [dispatch]);

  // Handle delete selected elements
  const handleDeleteSelected = useCallback(() => {
    if (!currentSlide || state.drawingState.selectedElements.length === 0) return;
    
    // Use batch delete for better performance and to handle connected connectors
    dispatch({
      type: 'DELETE_ELEMENTS',
      payload: { 
        slideId: currentSlide.id, 
        elementIds: state.drawingState.selectedElements 
      }
    });
  }, [currentSlide, state.drawingState.selectedElements, dispatch]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target !== document.body) return;
    
    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        handleDeleteSelected();
        break;
      case 'Escape':
        e.preventDefault();
        dispatch({ type: 'DESELECT_ALL' });
        break;
      case '+':
      case '=':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleZoomIn();
        }
        break;
      case '-':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleZoomOut();
        }
        break;
      case '0':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleZoomToFit();
        }
        break;
    }
  }, [handleDeleteSelected, dispatch, handleZoomIn, handleZoomOut, handleZoomToFit]);

  // Add event listeners
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // Auto-fit on mount and when slide changes
  React.useEffect(() => {
    if (currentSlide) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        handleZoomToFit();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentSlide?.id]); // Only re-fit when slide changes

  if (!currentSlide) {
    return (
      <div className={`slide-editor ${className}`}>
        <div className="no-slide-message">
          <h2>No slide selected</h2>
          <p>Create a new slide to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`slide-editor ${className}`}>
      {toolbarVisible && <EnhancedToolbar />}
      
      <div className="editor-main-area" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div className="editor-content" style={{ flex: 1, position: 'relative' }}>
          {showRulers ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {/* Corner square */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 30,
                height: 30,
                backgroundColor: '#e9ecef',
                borderRight: '1px solid #dee2e6',
                borderBottom: '1px solid #dee2e6',
                zIndex: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: '#6c757d',
                fontWeight: 'bold',
              }}>
                {rulerUnit.toUpperCase()}
              </div>
              
              {/* Horizontal ruler */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 30,
                right: 0,
                height: 30,
                overflow: 'hidden',
                zIndex: 2,
              }}>
                <SimpleRuler
                  orientation="horizontal"
                  length={Math.max(window.innerWidth - 430, canvasSize.width * zoom + 100)}
                  offset={scrollX}
                  zoom={zoom}
                  unit={rulerUnit}
                  onGuideAdd={(pos) => setVerticalGuides([...verticalGuides, pos])}
                />
              </div>
              
              {/* Vertical ruler */}
              <div style={{
                position: 'absolute',
                top: 30,
                left: 0,
                width: 30,
                bottom: 0,
                overflow: 'hidden',
                zIndex: 2,
              }}>
                <SimpleRuler
                  orientation="vertical"
                  length={Math.max(window.innerHeight - 230, canvasSize.height * zoom + 100)}
                  offset={scrollY}
                  zoom={zoom}
                  unit={rulerUnit}
                  onGuideAdd={(pos) => setHorizontalGuides([...horizontalGuides, pos])}
                />
              </div>
              
              {/* Main content area */}
              <div 
                className="canvas-viewport" 
                ref={canvasContainerRef} 
                style={{ 
                  position: 'absolute',
                  top: 30,
                  left: 30,
                  right: 0,
                  bottom: 0,
                  overflow: 'auto',
                  backgroundColor: '#f0f0f0'
                }}
                onScroll={(e) => {
                  const target = e.target as HTMLDivElement;
                  setScrollX(-target.scrollLeft);
                  setScrollY(-target.scrollTop);
                }}
              >
                <div style={{
                  position: 'relative',
                  width: `${canvasSize.width * zoom + 100}px`,
                  height: `${canvasSize.height * zoom + 100}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* Canvas with guides */}
                  <div style={{
                    position: 'absolute',
                    left: '50px',
                    top: '50px',
                    width: `${canvasSize.width * zoom}px`,
                    height: `${canvasSize.height * zoom}px`
                  }}>
                    {/* Render guides */}
                    {verticalGuides.map((pos, index) => (
                      <div
                        key={`v-guide-${index}`}
                        style={{
                          position: 'absolute',
                          left: `${pos * zoom}px`,
                          top: 0,
                          width: '1px',
                          height: '100%',
                          backgroundColor: '#007bff',
                          opacity: 0.3,
                          pointerEvents: 'none',
                          zIndex: 1000
                        }}
                      />
                    ))}
                    {horizontalGuides.map((pos, index) => (
                      <div
                        key={`h-guide-${index}`}
                        style={{
                          position: 'absolute',
                          top: `${pos * zoom}px`,
                          left: 0,
                          width: '100%',
                          height: '1px',
                          backgroundColor: '#007bff',
                          opacity: 0.3,
                          pointerEvents: 'none',
                          zIndex: 1000
                        }}
                      />
                    ))}
                    {/* Canvas */}
                    <div 
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        transition: 'transform 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        backgroundColor: 'white'
                      }}
                    >
                      <DrawingCanvas
                        slideId={currentSlide.id}
                        width={canvasSize.width}
                        height={canvasSize.height}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="canvas-container" ref={canvasContainerRef}>
              <div 
                style={{
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease'
                }}
              >
                <DrawingCanvas
                  slideId={currentSlide.id}
                  width={canvasSize.width}
                  height={canvasSize.height}
                />
              </div>
            </div>
          )}
          
          <div className="editor-controls">
            <div className="zoom-controls">
              <button onClick={handleZoomOut} title="Zoom Out">-</button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} title="Zoom In">+</button>
              <button onClick={handleZoomToFit} title="Zoom to Fit">Fit</button>
            </div>
            
            <div className="ruler-controls">
              <button 
                onClick={() => setShowRulers(!showRulers)}
                className={`ruler-toggle ${showRulers ? 'active' : ''}`}
                title={showRulers ? 'Hide Rulers' : 'Show Rulers'}
              >
                📏 Rulers
              </button>
              {showRulers && (
                <select 
                  value={rulerUnit} 
                  onChange={(e) => setRulerUnit(e.target.value as 'px' | 'cm' | 'in')}
                  className="ruler-unit-select"
                  title="Ruler Unit"
                >
                  <option value="px">Pixels</option>
                  <option value="cm">Centimeters</option>
                  <option value="in">Inches</option>
                </select>
              )}
              {showRulers && (horizontalGuides.length > 0 || verticalGuides.length > 0) && (
                <button 
                  onClick={() => {
                    setHorizontalGuides([]);
                    setVerticalGuides([]);
                  }}
                  className="clear-guides-button"
                  title="Clear All Guides"
                >
                  Clear Guides
                </button>
              )}
            </div>
            
            <div className="import-controls">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pptx,.odp"
                onChange={handleImportSlides}
                style={{ display: 'none' }}
                disabled={isImporting}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="import-button"
                disabled={isImporting}
                title="Import slides from PowerPoint or OpenDocument presentation"
              >
                {isImporting ? (
                  <>
                    <span className="loading-spinner small" />
                    Importing...
                  </>
                ) : (
                  <>
                    📥 Import Slides
                  </>
                )}
              </button>
            </div>
          </div>
          
          {importError && (
            <div className="import-error-banner">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{importError}</span>
              <button 
                className="error-dismiss"
                onClick={() => setImportError(null)}
              >
                ×
              </button>
            </div>
          )}
        </div>
        
        {propertiesPanelVisible && <EnhancedPropertiesPanel />}
      </div>
    </div>
  );
};

export default SlideEditor;