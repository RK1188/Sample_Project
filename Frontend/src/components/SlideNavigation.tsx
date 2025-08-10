import React, { useState, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import SlideThumbnail from './SlideThumbnail';
import { useApp } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';
import { FileService } from '../services/fileService';

interface SlideNavigationProps {
  className?: string;
}

const SlideNavigation: React.FC<SlideNavigationProps> = ({ className = '' }) => {
  const { state, dispatch } = useApp();
  const [selectedSlides, setSelectedSlides] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    slideId: string;
  } | null>(null);

  const { slides, currentSlideIndex } = state.presentation;
  const { sidebarCollapsed } = state.uiState;

  // Handle slide selection
  const handleSlideClick = useCallback((index: number) => {
    dispatch({ type: 'SET_CURRENT_SLIDE', payload: index });
  }, [dispatch]);

  // Handle slide drag and drop reordering
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    if (source.index !== destination.index) {
      dispatch({
        type: 'REORDER_SLIDES',
        payload: {
          fromIndex: source.index,
          toIndex: destination.index
        }
      });
    }
  }, [dispatch]);

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, slideId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      slideId
    });
  }, []);

  // Hide context menu
  const hideContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Add new slide
  const handleAddSlide = useCallback(() => {
    dispatch({ type: 'ADD_SLIDE' });
    hideContextMenu();
  }, [dispatch, hideContextMenu]);

  // Handle import slides
  const handleImportSlides = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validExtensions = ['.pptx', '.odp'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: 'Please upload a valid PowerPoint (.pptx) or OpenDocument (.odp) file.' 
      });
      return;
    }

    setIsImporting(true);
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const result = await FileService.importFile(file);
      
      if (result.success && result.presentation) {
        // Add slides from imported presentation to current presentation
        const importedSlides = result.presentation.slides;
        
        if (importedSlides && importedSlides.length > 0) {
          importedSlides.forEach((slide, index) => {
            dispatch({
              type: 'ADD_SLIDE',
              payload: {
                ...slide,
                id: uuidv4(), // Generate new unique ID
                title: `${slide.title || 'Imported Slide'} ${index + 1}`
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
          dispatch({ type: 'SET_ERROR', payload: 'No slides found in the imported file.' });
        }
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to import file' });
      }
    } catch (error) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsImporting(false);
      dispatch({ type: 'SET_LOADING', payload: false });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [dispatch]);

  // Duplicate slide
  const handleDuplicateSlide = useCallback(() => {
    if (!contextMenu) return;
    
    const slideIndex = slides.findIndex(s => s.id === contextMenu.slideId);
    if (slideIndex === -1) return;
    
    const originalSlide = slides[slideIndex];
    const duplicatedSlide = {
      ...originalSlide,
      id: uuidv4(),
      title: `${originalSlide.title} - Copy`,
      elements: originalSlide.elements.map(element => ({
        ...element,
        id: uuidv4(),
        selected: false
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    dispatch({ type: 'ADD_SLIDE', payload: duplicatedSlide });
    hideContextMenu();
  }, [contextMenu, slides, dispatch, hideContextMenu]);

  // Delete slide
  const handleDeleteSlide = useCallback(() => {
    if (!contextMenu || slides.length <= 1) return;
    
    dispatch({ type: 'DELETE_SLIDE', payload: contextMenu.slideId });
    hideContextMenu();
  }, [contextMenu, slides.length, dispatch, hideContextMenu]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target !== document.body) return;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (currentSlideIndex > 0) {
          handleSlideClick(currentSlideIndex - 1);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (currentSlideIndex < slides.length - 1) {
          handleSlideClick(currentSlideIndex + 1);
        }
        break;
      case 'Home':
        e.preventDefault();
        handleSlideClick(0);
        break;
      case 'End':
        e.preventDefault();
        handleSlideClick(slides.length - 1);
        break;
    }
  }, [currentSlideIndex, slides.length, handleSlideClick]);

  // Add event listeners
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', hideContextMenu);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', hideContextMenu);
    };
  }, [handleKeyDown, hideContextMenu]);

  if (sidebarCollapsed) {
    return (
      <div className={`slide-navigation collapsed ${className}`}>
        <button 
          className="expand-button"
          onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { sidebarCollapsed: false } })}
          title="Expand Sidebar"
        >
          &gt;
        </button>
      </div>
    );
  }

  return (
    <div className={`slide-navigation ${className}`}>
      <div className="navigation-header">
        <h3>Slides</h3>
        <div className="navigation-controls">
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
            className="import-nav-button"
            title="Import Slides"
            disabled={isImporting}
          >
            📥
          </button>
          <button 
            onClick={handleAddSlide}
            className="add-slide-button"
            title="Add New Slide"
          >
            +
          </button>
          <button 
            className="collapse-button"
            onClick={() => dispatch({ type: 'SET_UI_STATE', payload: { sidebarCollapsed: true } })}
            title="Collapse Sidebar"
          >
            &lt;
          </button>
        </div>
      </div>

      <div className="slides-container">
        {slides.length === 0 ? (
          <div className="no-slides-message">
            <p>No slides yet</p>
            <button onClick={handleAddSlide} className="create-slide-button">
              Create your first slide
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="slides">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="slides-list"
                >
                  {slides.map((slide, index) => (
                    <Draggable 
                      key={slide.id} 
                      draggableId={slide.id} 
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`slide-item ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <SlideThumbnail
                            slide={slide}
                            index={index}
                            isActive={index === currentSlideIndex}
                            isSelected={selectedSlides.includes(slide.id)}
                            onClick={handleSlideClick}
                            onContextMenu={handleContextMenu}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{ 
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
        >
          <button onClick={handleAddSlide}>Add New Slide</button>
          <button onClick={handleDuplicateSlide}>Duplicate Slide</button>
          {slides.length > 1 && (
            <button onClick={handleDeleteSlide} className="danger">
              Delete Slide
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SlideNavigation;