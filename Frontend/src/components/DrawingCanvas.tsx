import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Transformer, Image as KonvaImage, Arc, Group } from 'react-konva';
import Konva from 'konva';
import { useApp } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';
import { SlideElement } from '../types';
import PieShape from './PieShape';
import ConnectorLine from './ConnectorLine';
import ConnectionPoints from './ConnectionPoints';
import ShapeRenderer from './ShapeRenderer';
import TableRenderer from './TableRenderer';
import TableModal from './TableModal';
import TableContextMenu from './TableContextMenu';
import ChartRenderer from './ChartRenderer';
import ChartModal from './ChartModal';
import AdjustmentHandles from './AdjustmentHandles';
import { updateConnectorPositions } from '../utils/groupUtils';

interface DrawingCanvasProps {
  slideId: string;
  width?: number;
  height?: number;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  slideId,
  width = 960,
  height = 540
}) => {
  const { state, dispatch } = useApp();
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [tempElement, setTempElement] = useState<SlideElement | null>(null);
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [connectionState, setConnectionState] = useState<{
    isConnecting: boolean;
    startElementId?: string;
    startConnectionPoint?: string;
    startPosition?: { x: number; y: number };
  }>({ isConnecting: false });
  const [showTableModal, setShowTableModal] = useState(false);
  const [pendingTablePosition, setPendingTablePosition] = useState<{ x: number; y: number } | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);
  const [pendingChartPosition, setPendingChartPosition] = useState<{ x: number; y: number } | null>(null);
  const [tableContextMenu, setTableContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    tableId: string;
    row?: number;
    col?: number;
  }>({ visible: false, x: 0, y: 0, tableId: '' });
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }>({ x: 0, y: 0, width: 0, height: 0, visible: false });
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const dragUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const snapToGrid = true; // Enable snap to grid
  const gridSize = 10; // Grid size in pixels
  
  const currentSlide = state.presentation.slides.find(s => s.id === slideId);
  const { currentTool, selectedElements } = state.drawingState;
  
  // Helper function to snap to grid
  const snapToGridValue = (value: number): number => {
    if (!snapToGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  // Load images
  useEffect(() => {
    if (!currentSlide) return;
    
    const loadImages = async () => {
      const imageMap = new Map<string, HTMLImageElement>();
      
      for (const element of currentSlide.elements) {
        if (element.type === 'image' && element.src) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            img.src = element.src || '';
          });
          imageMap.set(element.id, img);
        }
      }
      
      setImages(imageMap);
    };
    
    loadImages();
  }, [currentSlide]);

  // Handle stage mouse down
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos || !currentSlide) return;

    const clickedOnEmpty = e.target === stage;
    
    if (clickedOnEmpty) {
      // Start selection rectangle if in select mode
      if (currentTool.type === 'select') {
        setIsDrawing(true);
        setDrawingStart(pos);
        setSelectionRect({
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          visible: true
        });
        dispatch({ type: 'DESELECT_ALL' });
        return;
      }

      // Start drawing
      setIsDrawing(true);
      setDrawingStart(pos);

      // Create temporary element based on tool
      let newElement: SlideElement | null = null;

      if (currentTool.type === 'text') {
        newElement = {
          id: `temp_${uuidv4()}`,
          type: 'text',
          x: pos.x,
          y: pos.y,
          width: 200,
          height: 50,
          text: 'New Text',
          fontSize: 18,
          fontFamily: 'Arial',
          fill: '#333333',
          rotation: 0
        };
      } else if (currentTool.type === 'shape') {
        // Get shape type from tool or default to rectangle
        let shapeType = (currentTool as any).shapeType || currentTool.id || 'rectangle';
        
        newElement = {
          id: `temp_${uuidv4()}`,
          type: 'shape',
          shapeType: shapeType as any,
          x: pos.x,
          y: pos.y,
          width: 1,
          height: 1,
          fill: '#4285f4',
          fillColor: '#4285f4',
          stroke: '#333333',
          strokeColor: '#333333',
          strokeWidth: 2,
          rotation: 0,
          // Add specific properties based on shape type
          ...(shapeType === 'pie' || shapeType === 'arc' ? {
            startAngle: 0,
            endAngle: 90,
            innerRadius: 0
          } : {}),
          ...(shapeType.includes('star') ? {
            starPoints: parseInt(shapeType.replace('star', '')) || 5,
            innerRadiusRatio: 0.5
          } : {}),
          ...(shapeType.includes('polygon') ? {
            sides: 6
          } : {}),
          // Add default adjustments for shapes that need them
          adjustments: {
            ...(shapeType === 'hexagon' ? { hexCornerCut: 0.15 } : {}),
            ...(shapeType === 'octagon' ? { octCornerCut: 0.29 } : {}),
            ...(shapeType === 'pie' ? { startAngle: 0, endAngle: 90, innerRadius: 0 } : {}),
            ...((shapeType === 'arrow' || shapeType === 'rightArrow' || shapeType === 'leftArrow' || 
                 shapeType === 'upArrow' || shapeType === 'downArrow' || shapeType === 'doubleArrow' || 
                 shapeType === 'upDownArrow') ? { arrowHeadSize: 0.4, arrowTailWidth: 0.5 } : {}),
            ...(shapeType === 'quadArrow' ? { arrowHeadSize: 0.3, centerSize: 0.33 } : {}),
            ...(shapeType === 'bentArrow' ? { arrowHeadSize: 0.3, bendPosition: 0.5, arrowTailWidth: 0.2 } : {}),
            ...(shapeType === 'uTurnArrow' ? { arrowHeadSize: 0.2, arrowWidth: 0.15 } : {}),
            ...((shapeType === 'speechBubble' || shapeType === 'thoughtBubble' || 
                 shapeType === 'roundedRectCallout' || shapeType === 'ovalCallout') ? 
                { tailPositionX: 0.3, tailPositionY: 0.8 } : {})
          }
        } as any;
      } else if (currentTool.type === 'table') {
        // For table, show the modal instead of starting drawing
        setPendingTablePosition(pos);
        setShowTableModal(true);
        return; // Don't start drawing yet
      } else if (currentTool.type === 'chart') {
        // For chart, show the modal instead of starting drawing
        setPendingChartPosition(pos);
        setShowChartModal(true);
        return; // Don't start drawing yet
      } else if (currentTool.type === 'line') {
        newElement = {
          id: `temp_${uuidv4()}`,
          type: 'line',
          startPoint: pos,
          endPoint: pos,
          stroke: '#333333',
          strokeWidth: 2,
          x: 0,
          y: 0,
          rotation: 0
        };
      }

      if (newElement) {
        setTempElement(newElement);
      }
    }
  }, [currentTool, currentSlide, dispatch]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !drawingStart) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    const width = Math.abs(pos.x - drawingStart.x);
    const height = Math.abs(pos.y - drawingStart.y);
    const x = Math.min(pos.x, drawingStart.x);
    const y = Math.min(pos.y, drawingStart.y);

    // Update selection rectangle if in select mode
    if (currentTool.type === 'select') {
      setSelectionRect({
        x,
        y,
        width,
        height,
        visible: true
      });
      return;
    }

    // Update temp element
    if (tempElement) {
      if (tempElement.type === 'shape') {
        setTempElement({
          ...tempElement,
          x,
          y,
          width,
          height
        });
      } else if (tempElement.type === 'line') {
        setTempElement({
          ...tempElement,
          endPoint: pos
        });
      }
    }
  }, [isDrawing, drawingStart, tempElement, currentTool]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentSlide) return;

    // Handle selection rectangle
    if (currentTool.type === 'select' && selectionRect.visible) {
      // Find elements within selection rectangle
      const selectedIds: string[] = [];
      currentSlide.elements.forEach(element => {
        const elementX = element.x || 0;
        const elementY = element.y || 0;
        const elementWidth = element.width || 100;
        const elementHeight = element.height || 100;
        
        // Check if element is within selection rectangle
        if (elementX >= selectionRect.x && 
            elementY >= selectionRect.y &&
            elementX + elementWidth <= selectionRect.x + selectionRect.width &&
            elementY + elementHeight <= selectionRect.y + selectionRect.height) {
          selectedIds.push(element.id);
        }
      });
      
      if (selectedIds.length > 0) {
        dispatch({ type: 'SELECT_ELEMENTS', payload: selectedIds });
      }
      
      // Hide selection rectangle
      setSelectionRect({ x: 0, y: 0, width: 0, height: 0, visible: false });
      setIsDrawing(false);
      setDrawingStart(null);
      return;
    }

    if (!tempElement) {
      setIsDrawing(false);
      setDrawingStart(null);
      return;
    }

    // Don't add if too small
    if (tempElement.type === 'shape') {
      if ((tempElement.width || 0) < 5 || (tempElement.height || 0) < 5) {
        setIsDrawing(false);
        setDrawingStart(null);
        setTempElement(null);
        return;
      }
    }

    // Create final element
    const finalElement: SlideElement = {
      ...tempElement,
      id: uuidv4() // Generate real ID
    };

    // Add to slide
    dispatch({
      type: 'ADD_ELEMENT',
      payload: {
        slideId: currentSlide.id,
        element: finalElement
      }
    });

    // Select the new element
    dispatch({
      type: 'SELECT_ELEMENTS',
      payload: [finalElement.id]
    });

    // Reset drawing state
    setIsDrawing(false);
    setDrawingStart(null);
    setTempElement(null);
  }, [isDrawing, tempElement, currentSlide, dispatch, currentTool, selectionRect]);

  // Handle element click
  const handleElementClick = useCallback((elementId: string, e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    
    const multiSelect = e.evt.ctrlKey || e.evt.metaKey;
    
    if (multiSelect) {
      const newSelection = selectedElements.includes(elementId)
        ? selectedElements.filter(id => id !== elementId)
        : [...selectedElements, elementId];
      dispatch({ type: 'SELECT_ELEMENTS', payload: newSelection });
    } else {
      dispatch({ type: 'SELECT_ELEMENTS', payload: [elementId] });
    }
  }, [selectedElements, dispatch]);

  // Handle element drag move (real-time updates with performance optimization)
  const handleDragMove = useCallback((elementId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    if (!currentSlide) return;

    const element = currentSlide.elements.find(el => el.id === elementId);
    if (!element) return;

    // Calculate new position from the Konva element
    let newX = e.target.x();
    let newY = e.target.y();

    // For circles, the position should be based on the center, but we need to store top-left
    if (element.type === 'shape' && element.shapeType === 'circle') {
      const radius = Math.min(element.width || 50, element.height || 50) / 2;
      newX = newX - radius;
      newY = newY - radius;
    }
    
    // For groups, ensure exact positioning
    if (element.type === 'group') {
      // Groups should use the position directly from the drag event
      newX = e.target.x();
      newY = e.target.y();
    }
    
    // Apply snap to grid
    newX = snapToGridValue(newX);
    newY = snapToGridValue(newY);

    // Create updated element for connector position calculations
    const updatedElement = {
      ...element,
      x: newX,
      y: newY
    };

    // Clear any pending timeout
    if (dragUpdateTimeoutRef.current) {
      clearTimeout(dragUpdateTimeoutRef.current);
    }

    // Immediate visual update for the dragged element position
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        slideId: currentSlide.id,
        elementId,
        updates: {
          x: newX,
          y: newY
        }
      }
    });

    // Update connectors immediately without throttling for smoother experience
    const connectorUpdates = updateConnectorPositions(updatedElement, currentSlide.elements);
    connectorUpdates.forEach(({ elementId: connectorId, updates }) => {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          slideId: currentSlide.id,
          elementId: connectorId,
          updates
        }
      });
    });
  }, [currentSlide, dispatch]);

  // Handle element drag end
  const handleDragEnd = useCallback((elementId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    if (!currentSlide) return;

    const element = currentSlide.elements.find(el => el.id === elementId);
    if (!element) return;

    // Clear any pending timeout to prevent conflicts
    if (dragUpdateTimeoutRef.current) {
      clearTimeout(dragUpdateTimeoutRef.current);
      dragUpdateTimeoutRef.current = null;
    }

    // Get exact final position - use element's current position since drag move already updated it
    let finalX = e.target.x();
    let finalY = e.target.y();
    
    // For circles, adjust position based on center
    if (element.type === 'shape' && element.shapeType === 'circle') {
      const radius = Math.min(element.width || 50, element.height || 50) / 2;
      finalX = finalX - radius;
      finalY = finalY - radius;
    }
    
    // For groups, ensure exact positioning without any offset
    if (element.type === 'group') {
      // Groups should use the position directly from the node
      finalX = e.target.x();
      finalY = e.target.y();
    }
    
    // Apply snap to grid for final position
    finalX = snapToGridValue(finalX);
    finalY = snapToGridValue(finalY);

    // Final position update with exact coordinates
    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        slideId: currentSlide.id,
        elementId,
        updates: {
          x: finalX,
          y: finalY
        }
      }
    });

    // Final connector update with exact positioning
    const updatedElement = {
      ...element,
      x: finalX,
      y: finalY
    };

    const connectorUpdates = updateConnectorPositions(updatedElement, currentSlide.elements);
    connectorUpdates.forEach(({ elementId: connectorId, updates }) => {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          slideId: currentSlide.id,
          elementId: connectorId,
          updates
        }
      });
    });
  }, [currentSlide, dispatch]);
  
  // Handle element transform (resize and rotate)
  // Handle adjustment changes
  const handleAdjustmentChange = useCallback((elementId: string, adjustments: any) => {
    if (!currentSlide) return;

    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        slideId: currentSlide.id,
        elementId,
        updates: {
          adjustments: {
            ...((currentSlide.elements.find(el => el.id === elementId)?.adjustments) || {}),
            ...adjustments
          }
        }
      }
    });
  }, [currentSlide, dispatch]);

  const handleTransformEnd = useCallback((elementId: string, e: Konva.KonvaEventObject<Event>) => {
    if (!currentSlide) return;
    
    const node = e.target;
    const element = currentSlide.elements.find(el => el.id === elementId);
    if (!element) return;
    
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    // Reset scale and apply it to width/height
    node.scaleX(1);
    node.scaleY(1);
    
    let updatedElement: SlideElement;
    
    // For circles, we need to adjust position when resizing
    if (element.type === 'shape' && element.shapeType === 'circle') {
      const newRadius = Math.min(node.width() * scaleX, node.height() * scaleY) / 2;
      const updates = {
        x: node.x() - newRadius,
        y: node.y() - newRadius,
        width: newRadius * 2,
        height: newRadius * 2,
        rotation: node.rotation()
      };
      
      updatedElement = { ...element, ...updates };
      
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          slideId: currentSlide.id,
          elementId,
          updates
        }
      });
    } else {
      const updates = {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation()
      };
      
      updatedElement = { ...element, ...updates };
      
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          slideId: currentSlide.id,
          elementId,
          updates
        }
      });
    }

    // Update connected connectors after transform
    const connectorUpdates = updateConnectorPositions(updatedElement, currentSlide.elements);
    connectorUpdates.forEach(({ elementId: connectorId, updates }) => {
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: {
          slideId: currentSlide.id,
          elementId: connectorId,
          updates
        }
      });
    });
  }, [currentSlide, dispatch]);

  // Render element
  const renderElement = (element: SlideElement, parentSelected: boolean = false, isChild: boolean = false): React.ReactNode => {
    const isSelected = parentSelected || selectedElements.includes(element.id);
    const isDraggable = !isChild; // Children of groups should not be draggable
    
    switch (element.type) {
      case 'text':
        return (
          <Text
            key={element.id}
            id={element.id}
            x={element.x || 0}
            y={element.y || 0}
            text={(element as any).text || (element as any).content || ''}
            fontSize={element.fontSize || 16}
            fontFamily={element.fontFamily || 'Arial'}
            fontStyle={`${element.fontWeight === 'bold' ? 'bold' : 'normal'} ${element.fontStyle === 'italic' ? 'italic' : 'normal'}`}
            textDecoration={element.textDecoration || ''}
            fill={(element as any).fill || (element as any).color || '#000000'}
            width={element.width}
            height={element.height}
            align={element.textAlign || 'left'}
            verticalAlign='top'
            rotation={element.rotation || 0}
            opacity={element.opacity || 1}
            draggable={isDraggable}
            onClick={(e) => !isChild && handleElementClick(element.id, e)}
            onDragMove={(e) => isDraggable && handleDragMove(element.id, e)}
            onDragEnd={(e) => isDraggable && handleDragEnd(element.id, e)}
            onTransformEnd={(e) => isDraggable && handleTransformEnd(element.id, e)}
            stroke={isSelected ? '#0066FF' : undefined}
            strokeWidth={isSelected ? 1 : 0}
          />
        );

      case 'shape':
        // Use ShapeRenderer for all shape types
        return (
          <ShapeRenderer
            key={element.id}
            element={element as any}
            isSelected={isSelected}
            isDraggable={isDraggable}
            onClick={(e) => !isChild && handleElementClick(element.id, e)}
            onDragMove={(e) => isDraggable && handleDragMove(element.id, e)}
            onDragEnd={(e) => isDraggable && handleDragEnd(element.id, e)}
            onTransformEnd={(e) => isDraggable && handleTransformEnd(element.id, e)}
          />
        );

      case 'chart':
        // Use ChartRenderer for charts
        return (
          <ChartRenderer
            key={element.id}
            element={element as any}
            isSelected={isSelected}
            isDraggable={isDraggable}
            onSelect={(e) => !isChild && handleElementClick(element.id, e)}
            onDragMove={(e) => isDraggable && handleDragMove(element.id, e)}
            onDragEnd={(e) => isDraggable && handleDragEnd(element.id, e)}
            onDoubleClick={() => {
              // Could open chart editor on double click
              console.log('Chart double clicked');
            }}
          />
        );

      case 'table':
        // Use TableRenderer for tables
        return (
          <TableRenderer
            key={element.id}
            element={element as any}
            isSelected={isSelected}
            isDraggable={isDraggable}
            onSelect={(e) => !isChild && handleElementClick(element.id, e)}
            onDragMove={(e) => isDraggable && handleDragMove(element.id, e)}
            onDragEnd={(e) => isDraggable && handleDragEnd(element.id, e)}
            onCellEdit={(row, col, content) => {
              if (!currentSlide) return;
              const tableElement = element as any;
              const updatedCells = [...tableElement.cells];
              updatedCells[row][col] = { ...updatedCells[row][col], content };
              
              dispatch({
                type: 'UPDATE_ELEMENT',
                payload: {
                  slideId: currentSlide.id,
                  elementId: element.id,
                  updates: { cells: updatedCells }
                }
              });
            }}
            onContextMenu={(e, row, col) => {
              e.evt.preventDefault();
              setTableContextMenu({
                visible: true,
                x: e.evt.clientX,
                y: e.evt.clientY,
                tableId: element.id,
                row,
                col
              });
            }}
          />
        );

      case 'line':
        if ((element as any).isConnector) {
          return (
            <ConnectorLine
              key={element.id}
              id={element.id}
              startPoint={element.startPoint || { x: 0, y: 0 }}
              endPoint={element.endPoint || { x: 100, y: 100 }}
              stroke={element.stroke || '#333333'}
              strokeWidth={element.strokeWidth || 2}
              strokeStyle={element.strokeStyle}
              arrowStart={(element as any).arrowStart}
              arrowEnd={(element as any).arrowEnd}
              isSelected={isSelected}
              startElementId={(element as any).startElementId}
              endElementId={(element as any).endElementId}
              startConnectionPoint={(element as any).startConnectionPoint}
              endConnectionPoint={(element as any).endConnectionPoint}
              allElements={currentSlide?.elements || []}
              onClick={(e) => handleElementClick(element.id, e)}
              onUpdate={(updates) => {
                if (!currentSlide) return;
                dispatch({
                  type: 'UPDATE_ELEMENT',
                  payload: {
                    slideId: currentSlide.id,
                    elementId: element.id,
                    updates
                  }
                });
              }}
            />
          );
        } else {
          return (
            <Line
              key={element.id}
              id={element.id}
              points={[
                element.startPoint?.x || 0,
                element.startPoint?.y || 0,
                element.endPoint?.x || 100,
                element.endPoint?.y || 100
              ]}
              stroke={isSelected ? '#0066FF' : element.stroke || '#333333'}
              strokeWidth={isSelected ? 3 : element.strokeWidth || 2}
              draggable={isDraggable}
              onClick={(e) => !isChild && handleElementClick(element.id, e)}
              onDragMove={(e) => isDraggable && handleDragMove(element.id, e)}
              onDragEnd={(e) => isDraggable && handleDragEnd(element.id, e)}
            />
          );
        }

      case 'image':
        const img = images.get(element.id);
        return img && element.src ? (
          <KonvaImage
            key={element.id}
            id={element.id}
            image={img}
            x={element.x || 0}
            y={element.y || 0}
            width={element.width || 200}
            height={element.height || 150}
            draggable={isDraggable}
            onClick={(e) => !isChild && handleElementClick(element.id, e)}
            onDragMove={(e) => isDraggable && handleDragMove(element.id, e)}
            onDragEnd={(e) => isDraggable && handleDragEnd(element.id, e)}
            stroke={isSelected ? '#0066FF' : undefined}
            strokeWidth={isSelected ? 3 : 0}
          />
        ) : null;

      case 'group': {
        // Calculate actual group bounds from children
        let groupWidth = element.width || 100;
        let groupHeight = element.height || 100;
        
        if (element.children && element.children.length > 0) {
          let maxX = 0;
          let maxY = 0;
          
          element.children.forEach(child => {
            if (child.type === 'line') {
              maxX = Math.max(maxX, child.startPoint?.x || 0, child.endPoint?.x || 0);
              maxY = Math.max(maxY, child.startPoint?.y || 0, child.endPoint?.y || 0);
            } else {
              const childRight = (child.x || 0) + (child.width || 0);
              const childBottom = (child.y || 0) + (child.height || 0);
              maxX = Math.max(maxX, childRight);
              maxY = Math.max(maxY, childBottom);
            }
          });
          
          groupWidth = Math.max(groupWidth, maxX);
          groupHeight = Math.max(groupHeight, maxY);
        }
        
        return (
          <Group
            key={element.id}
            id={element.id}
            x={element.x || 0}
            y={element.y || 0}
            rotation={element.rotation || 0}
            draggable={true}
            onClick={(e) => handleElementClick(element.id, e)}
            onDragMove={(e) => handleDragMove(element.id, e)}
            onDragEnd={(e) => handleDragEnd(element.id, e)}
            onTransformEnd={(e) => handleTransformEnd(element.id, e)}
            dragBoundFunc={(pos) => {
              // Apply snap to grid during dragging
              return {
                x: snapToGridValue(pos.x),
                y: snapToGridValue(pos.y)
              };
            }}
          >
            {/* Render group border when selected */}
            {isSelected && (
              <Rect
                x={0}
                y={0}
                width={groupWidth}
                height={groupHeight}
                stroke="#0066FF"
                strokeWidth={2}
                dash={[10, 5]}
                fill="transparent"
                listening={false}
              />
            )}
            {/* Render children elements */}
            {element.children && element.children.map(child => {
              // Create a new element with relative positioning
              const childWithRelativePos = {
                ...child,
                // Children positions are already relative to group
                x: child.x || 0,
                y: child.y || 0
              };
              // Don't show selection on individual children when group is selected
              // Pass isChild=true to prevent individual dragging
              return renderElement(childWithRelativePos, false, true);
            })}
          </Group>
        );
      }

      default:
        return null;
    }
  };

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cancel connection with Escape
      if (e.key === 'Escape' && connectionState.isConnecting) {
        e.preventDefault();
        setConnectionState({ isConnecting: false });
        return;
      }
      
      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
        return;
      }
      
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }
      
      if (!currentSlide) return;
      
      // Copy: Ctrl+C
      if (e.ctrlKey && e.key === 'c' && !e.shiftKey) {
        e.preventDefault();
        if (selectedElements.length > 0) {
          const elementsToCopy = selectedElements
            .map(id => currentSlide.elements.find(el => el.id === id))
            .filter(el => el !== undefined);
          
          dispatch({
            type: 'SET_DRAWING_STATE',
            payload: { clipboard: elementsToCopy }
          });
        }
        return;
      }
      
      // Cut: Ctrl+X
      if (e.ctrlKey && e.key === 'x' && !e.shiftKey) {
        e.preventDefault();
        if (selectedElements.length > 0) {
          const elementsToCut = selectedElements
            .map(id => currentSlide.elements.find(el => el.id === id))
            .filter(el => el !== undefined);
          
          // Copy to clipboard
          dispatch({
            type: 'SET_DRAWING_STATE',
            payload: { clipboard: elementsToCut }
          });
          
          // Delete the elements
          selectedElements.forEach(elementId => {
            dispatch({
              type: 'DELETE_ELEMENT',
              payload: { slideId: currentSlide.id, elementId }
            });
          });
        }
        return;
      }
      
      // Paste: Ctrl+V
      if (e.ctrlKey && e.key === 'v' && !e.shiftKey) {
        e.preventDefault();
        if (state.drawingState.clipboard.length > 0) {
          const pastedElements: string[] = [];
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
            
            pastedElements.push(newElement.id);
          });
          
          // Select the pasted elements
          dispatch({
            type: 'SET_DRAWING_STATE',
            payload: { selectedElements: pastedElements }
          });
        }
        return;
      }
      
      // Delete: Delete key or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElements.length > 0) {
        // Don't delete if user is typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        
        e.preventDefault();
        selectedElements.forEach(elementId => {
          dispatch({
            type: 'DELETE_ELEMENT',
            payload: { slideId: currentSlide.id, elementId }
          });
        });
        return;
      }
      
      // Select All: Ctrl+A
      if (e.ctrlKey && e.key === 'a' && !e.shiftKey) {
        e.preventDefault();
        const allElementIds = currentSlide.elements.map(el => el.id);
        dispatch({
          type: 'SET_DRAWING_STATE',
          payload: { selectedElements: allElementIds }
        });
        return;
      }
      
      // Group: Ctrl+G
      if (e.ctrlKey && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        if (selectedElements.length >= 2) {
          dispatch({
            type: 'GROUP_ELEMENTS',
            payload: {
              slideId: currentSlide.id,
              elementIds: selectedElements
            }
          });
        }
      }
      
      // Ungroup: Ctrl+Shift+G
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        if (selectedElements.length === 1) {
          const selectedElement = currentSlide.elements.find(el => el.id === selectedElements[0]);
          if (selectedElement && selectedElement.type === 'group') {
            dispatch({
              type: 'UNGROUP_ELEMENTS',
              payload: {
                slideId: currentSlide.id,
                groupId: selectedElements[0]
              }
            });
          }
        }
      }
      
      // Delete: Delete or Backspace key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElements.length > 0 && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          selectedElements.forEach(elementId => {
            dispatch({
              type: 'DELETE_ELEMENT',
              payload: {
                slideId: currentSlide.id,
                elementId
              }
            });
          });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide, selectedElements, dispatch, connectionState, state.drawingState.clipboard]);

  // Update transformer
  React.useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    
    if (!transformer || !stage) return;

    if (selectedElements.length === 0) {
      transformer.nodes([]);
    } else {
      const nodes = selectedElements
        .map(id => stage.findOne(`#${id}`))
        .filter(node => node) as Konva.Node[];
      transformer.nodes(nodes);
    }
    
    transformer.getLayer()?.batchDraw();
  }, [selectedElements]);

  // Handle chart creation from modal
  const handleCreateChart = useCallback((chartType: string, data: any, options: any) => {
    if (!pendingChartPosition || !currentSlide) {
      return;
    }
    const chartElement = {
      id: uuidv4(),
      type: 'chart' as const,
      chartType: chartType as any,
      x: pendingChartPosition.x,
      y: pendingChartPosition.y,
      width: 400,
      height: 300,
      data,
      options,
      rotation: 0,
      opacity: 1
    };

    dispatch({
      type: 'ADD_ELEMENT',
      payload: {
        slideId: currentSlide.id,
        element: chartElement
      }
    });

    setPendingChartPosition(null);
    setShowChartModal(false);
  }, [pendingChartPosition, currentSlide, dispatch]);

  // Handle table creation from modal
  const handleCreateTable = useCallback((rows: number, columns: number, style: string, options: {
    headerRow: boolean;
    headerColumn: boolean;
    alternatingRows: boolean;
  }) => {
    if (!pendingTablePosition || !currentSlide) {
      return;
    }

    const tableElement = {
      id: uuidv4(),
      type: 'table' as const,
      x: pendingTablePosition.x,
      y: pendingTablePosition.y,
      width: Math.min(800, Math.max(200, columns * 120)),
      height: Math.min(600, Math.max(100, rows * 40)),
      rows,
      columns,
      cells: Array(rows).fill(null).map((_, rowIndex) => 
        Array(columns).fill(null).map((_, colIndex) => ({
          content: rowIndex === 0 && options.headerRow ? `Header ${colIndex + 1}` : '',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          fontSize: 14,
          fontFamily: 'Arial',
          textAlign: 'center' as const,
          verticalAlign: 'middle' as const,
          padding: 5
        }))
      ),
      borderColor: '#000000',
      borderWidth: 1,
      borderStyle: 'solid' as const,
      headerRow: options.headerRow,
      headerColumn: options.headerColumn,
      alternatingRows: options.alternatingRows,
      tableStyle: style as any,
      rotation: 0
    };

    dispatch({
      type: 'ADD_ELEMENT',
      payload: {
        slideId: currentSlide.id,
        element: tableElement
      }
    });

    // Select the new table
    dispatch({
      type: 'SELECT_ELEMENTS',
      payload: [tableElement.id]
    });

    setPendingTablePosition(null);
    setShowTableModal(false); // Explicitly close modal
  }, [pendingTablePosition, currentSlide, dispatch]);

  if (!currentSlide) return null;

  return (
    <>
      <div style={{ 
        display: 'inline-block',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          backgroundColor: currentSlide.backgroundColor || currentSlide.background || '#ffffff',
          cursor: currentTool.type === 'select' ? 'default' : 'crosshair',
          display: 'block'
        }}
      >
        <Layer>
          {/* Render existing elements */}
          {currentSlide.elements.map(element => renderElement(element))}
          
          {/* Render temporary element while drawing */}
          {tempElement && renderElement(tempElement)}
          
          {/* Render adjustment handles for selected shape elements */}
          {selectedElements.length === 1 && currentSlide.elements
            .filter(el => selectedElements.includes(el.id) && el.type === 'shape')
            .map(element => (
              <AdjustmentHandles
                key={`adjustment-${element.id}`}
                element={element as any}
                visible={true}
                onAdjustmentChange={(adjustments) => handleAdjustmentChange(element.id, adjustments)}
              />
            ))
          }
          
          {/* Selection rectangle */}
          {selectionRect.visible && (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(66, 133, 244, 0.1)"
              stroke="#4285f4"
              strokeWidth={1}
              dash={[5, 5]}
            />
          )}
          
          {/* Show temporary connection line while connecting */}
          {connectionState.isConnecting && connectionState.startPosition && (
            <Line
              points={[
                connectionState.startPosition.x,
                connectionState.startPosition.y,
                connectionState.startPosition.x,
                connectionState.startPosition.y
              ]}
              stroke="#0066FF"
              strokeWidth={2}
              dash={[5, 5]}
              listening={false}
            />
          )}
          
          {/* Transformer for selected elements */}
          <Transformer ref={transformerRef} />
        </Layer>
        
        {/* Connection points layer - rendered on top */}
        <Layer listening={true}>
          {currentTool.id === 'connector' && currentSlide.elements.map(element => {
            if (element.type === 'shape' || element.type === 'text' || element.type === 'group') {
              return (
                <ConnectionPoints
                  key={`connection-${element.id}`}
                  element={element}
                  visible={true}
                  onConnectionPointClick={(elementId, connectionPoint, position) => {
                    console.log('DrawingCanvas: onConnectionPointClick called', {
                      elementId,
                      connectionPoint,
                      position,
                      isConnecting: connectionState.isConnecting,
                      startElementId: connectionState.startElementId
                    });
                    
                    if (!connectionState.isConnecting) {
                      // Start connection
                      console.log('Starting connection...');
                      setConnectionState({
                        isConnecting: true,
                        startElementId: elementId,
                        startConnectionPoint: connectionPoint,
                        startPosition: position
                      });
                    } else {
                      // Complete connection - prevent self-connection
                      console.log('Completing connection...');
                      if (currentSlide && connectionState.startElementId && connectionState.startPosition && connectionState.startElementId !== elementId) {
                        const connectorElement = {
                          id: uuidv4(),
                          type: 'line' as const,
                          isConnector: true,
                          startPoint: connectionState.startPosition,
                          endPoint: position,
                          startElementId: connectionState.startElementId,
                          endElementId: elementId,
                          startConnectionPoint: connectionState.startConnectionPoint,
                          endConnectionPoint: connectionPoint,
                          stroke: '#333333',
                          strokeWidth: 2,
                          strokeStyle: 'solid' as const,
                          arrowEnd: true,
                          x: 0,
                          y: 0,
                          rotation: 0
                        };
                        
                        console.log('Adding connector element:', connectorElement);
                        dispatch({
                          type: 'ADD_ELEMENT',
                          payload: {
                            slideId: currentSlide.id,
                            element: connectorElement as any
                          }
                        });
                      }
                      
                      // Reset connection state
                      setConnectionState({ isConnecting: false });
                    }
                  }}
                />
              );
            }
            return null;
          })}
        </Layer>
      </Stage>
    </div>
    
    {/* Chart Creation Modal */}
    <ChartModal
      isOpen={showChartModal}
      onClose={() => {
        setShowChartModal(false);
        setPendingChartPosition(null);
      }}
      onCreateChart={handleCreateChart}
    />
    
    {/* Table Creation Modal */}
    <TableModal
      isOpen={showTableModal}
      onClose={() => {
        setShowTableModal(false);
        setPendingTablePosition(null);
      }}
      onCreateTable={handleCreateTable}
    />
    
    {/* Table Context Menu */}
    <TableContextMenu
      visible={tableContextMenu.visible}
      x={tableContextMenu.x}
      y={tableContextMenu.y}
      onClose={() => setTableContextMenu({ ...tableContextMenu, visible: false })}
      onInsertRowAbove={() => {
        if (!currentSlide || !tableContextMenu.tableId || tableContextMenu.row === undefined) return;
        const tableElement = currentSlide.elements.find(el => el.id === tableContextMenu.tableId) as any;
        if (!tableElement) return;
        
        const newCells = [...tableElement.cells];
        const newRow = Array(tableElement.columns).fill(null).map(() => ({
          content: '',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          fontSize: 14,
          fontFamily: 'Arial',
          textAlign: 'center' as const,
          verticalAlign: 'middle' as const,
          padding: 5
        }));
        newCells.splice(tableContextMenu.row, 0, newRow);
        
        const newHeights = [...(tableElement.cellHeight || Array(tableElement.rows).fill(tableElement.height / tableElement.rows))];
        newHeights.splice(tableContextMenu.row, 0, tableElement.height / (tableElement.rows + 1));
        
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            slideId: currentSlide.id,
            elementId: tableContextMenu.tableId,
            updates: {
              cells: newCells,
              rows: tableElement.rows + 1,
              cellHeight: newHeights
            }
          }
        });
      }}
      onInsertRowBelow={() => {
        if (!currentSlide || !tableContextMenu.tableId || tableContextMenu.row === undefined) return;
        const tableElement = currentSlide.elements.find(el => el.id === tableContextMenu.tableId) as any;
        if (!tableElement) return;
        
        const newCells = [...tableElement.cells];
        const newRow = Array(tableElement.columns).fill(null).map(() => ({
          content: '',
          backgroundColor: '#ffffff',
          textColor: '#000000',
          fontSize: 14,
          fontFamily: 'Arial',
          textAlign: 'center' as const,
          verticalAlign: 'middle' as const,
          padding: 5
        }));
        newCells.splice(tableContextMenu.row + 1, 0, newRow);
        
        const newHeights = [...(tableElement.cellHeight || Array(tableElement.rows).fill(tableElement.height / tableElement.rows))];
        newHeights.splice(tableContextMenu.row + 1, 0, tableElement.height / (tableElement.rows + 1));
        
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            slideId: currentSlide.id,
            elementId: tableContextMenu.tableId,
            updates: {
              cells: newCells,
              rows: tableElement.rows + 1,
              cellHeight: newHeights
            }
          }
        });
      }}
      onInsertColumnLeft={() => {
        if (!currentSlide || !tableContextMenu.tableId || tableContextMenu.col === undefined) return;
        const tableElement = currentSlide.elements.find(el => el.id === tableContextMenu.tableId) as any;
        if (!tableElement) return;
        
        const newCells = tableElement.cells.map((row: any[]) => {
          const newRow = [...row];
          newRow.splice(tableContextMenu.col!, 0, {
            content: '',
            backgroundColor: '#ffffff',
            textColor: '#000000',
            fontSize: 14,
            fontFamily: 'Arial',
            textAlign: 'center' as const,
            verticalAlign: 'middle' as const,
            padding: 5
          });
          return newRow;
        });
        
        const newWidths = [...(tableElement.cellWidth || Array(tableElement.columns).fill(tableElement.width / tableElement.columns))];
        newWidths.splice(tableContextMenu.col, 0, tableElement.width / (tableElement.columns + 1));
        
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            slideId: currentSlide.id,
            elementId: tableContextMenu.tableId,
            updates: {
              cells: newCells,
              columns: tableElement.columns + 1,
              cellWidth: newWidths
            }
          }
        });
      }}
      onInsertColumnRight={() => {
        if (!currentSlide || !tableContextMenu.tableId || tableContextMenu.col === undefined) return;
        const tableElement = currentSlide.elements.find(el => el.id === tableContextMenu.tableId) as any;
        if (!tableElement) return;
        
        const newCells = tableElement.cells.map((row: any[]) => {
          const newRow = [...row];
          newRow.splice(tableContextMenu.col! + 1, 0, {
            content: '',
            backgroundColor: '#ffffff',
            textColor: '#000000',
            fontSize: 14,
            fontFamily: 'Arial',
            textAlign: 'center' as const,
            verticalAlign: 'middle' as const,
            padding: 5
          });
          return newRow;
        });
        
        const newWidths = [...(tableElement.cellWidth || Array(tableElement.columns).fill(tableElement.width / tableElement.columns))];
        newWidths.splice(tableContextMenu.col + 1, 0, tableElement.width / (tableElement.columns + 1));
        
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            slideId: currentSlide.id,
            elementId: tableContextMenu.tableId,
            updates: {
              cells: newCells,
              columns: tableElement.columns + 1,
              cellWidth: newWidths
            }
          }
        });
      }}
      onDeleteRow={() => {
        if (!currentSlide || !tableContextMenu.tableId || tableContextMenu.row === undefined) return;
        const tableElement = currentSlide.elements.find(el => el.id === tableContextMenu.tableId) as any;
        if (!tableElement || tableElement.rows <= 1) return;
        
        const newCells = [...tableElement.cells];
        newCells.splice(tableContextMenu.row, 1);
        
        const newHeights = [...(tableElement.cellHeight || Array(tableElement.rows).fill(tableElement.height / tableElement.rows))];
        newHeights.splice(tableContextMenu.row, 1);
        
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            slideId: currentSlide.id,
            elementId: tableContextMenu.tableId,
            updates: {
              cells: newCells,
              rows: tableElement.rows - 1,
              cellHeight: newHeights
            }
          }
        });
      }}
      onDeleteColumn={() => {
        if (!currentSlide || !tableContextMenu.tableId || tableContextMenu.col === undefined) return;
        const tableElement = currentSlide.elements.find(el => el.id === tableContextMenu.tableId) as any;
        if (!tableElement || tableElement.columns <= 1) return;
        
        const newCells = tableElement.cells.map((row: any[]) => {
          const newRow = [...row];
          newRow.splice(tableContextMenu.col!, 1);
          return newRow;
        });
        
        const newWidths = [...(tableElement.cellWidth || Array(tableElement.columns).fill(tableElement.width / tableElement.columns))];
        newWidths.splice(tableContextMenu.col, 1);
        
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            slideId: currentSlide.id,
            elementId: tableContextMenu.tableId,
            updates: {
              cells: newCells,
              columns: tableElement.columns - 1,
              cellWidth: newWidths
            }
          }
        });
      }}
    />
    </>
  );
};

export default DrawingCanvas;