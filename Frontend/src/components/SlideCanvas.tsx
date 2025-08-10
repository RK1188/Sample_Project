import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Group, Transformer } from 'react-konva';
import Konva from 'konva';
import { useApp } from '../context/AppContext';
import { SlideElementType, TextElement, ShapeElement, LineElement, Point } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SlideCanvasProps {
  slideId: string;
  width: number;
  height: number;
  isEditing?: boolean;
}

const SlideCanvas: React.FC<SlideCanvasProps> = ({ 
  slideId, 
  width, 
  height, 
  isEditing = true 
}) => {
  const { state, dispatch } = useApp();
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);

  const slide = state.presentation.slides.find(s => s.id === slideId);
  const selectedElements = state.drawingState.selectedElements;
  const currentTool = state.drawingState.currentTool;

  // Handle element selection
  const handleElementSelect = useCallback((elementId: string, addToSelection = false) => {
    if (!isEditing) return;

    let newSelection: string[];
    if (addToSelection && selectedElements.includes(elementId)) {
      newSelection = selectedElements.filter(id => id !== elementId);
    } else if (addToSelection) {
      newSelection = [...selectedElements, elementId];
    } else {
      newSelection = [elementId];
    }

    dispatch({ type: 'SELECT_ELEMENTS', payload: newSelection });
  }, [dispatch, selectedElements, isEditing]);

  // Handle stage click (deselect or start drawing)
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isEditing) return;

    const clickedOnEmpty = e.target === e.target.getStage();
    
    if (clickedOnEmpty) {
      if (currentTool.type === 'select') {
        dispatch({ type: 'DESELECT_ALL' });
      } else {
        // Start drawing based on current tool
        const pos = e.target.getStage()?.getPointerPosition();
        if (pos) {
          handleStartDrawing(pos);
        }
      }
    }
  }, [dispatch, currentTool, isEditing]);

  // Handle start drawing
  const handleStartDrawing = useCallback((pos: Point) => {
    if (!slide) return;

    setIsDrawing(true);
    const newElement = createElementFromTool(currentTool.type, pos);
    
    if (newElement) {
      dispatch({
        type: 'ADD_ELEMENT',
        payload: { slideId: slide.id, element: newElement }
      });
      dispatch({ type: 'SELECT_ELEMENTS', payload: [newElement.id] });
    }
  }, [slide, currentTool, dispatch]);

  // Create element based on tool type
  const createElementFromTool = (toolType: string, pos: Point): SlideElementType | null => {
    const baseElement = {
      id: uuidv4(),
      transform: {
        x: pos.x,
        y: pos.y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      },
      zIndex: slide ? slide.elements.length : 0,
      visible: true,
      locked: false,
      selected: true
    };

    switch (toolType) {
      case 'text':
        return {
          ...baseElement,
          type: 'text',
          content: 'New Text',
          size: { width: 200, height: 50 },
          fontSize: 18,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          color: '#333333'
        } as TextElement;

      case 'shape':
        if (currentTool.id === 'rectangle') {
          return {
            ...baseElement,
            type: 'shape',
            shapeType: 'rectangle',
            size: { width: 150, height: 100 },
            fillColor: '#4285f4',
            strokeColor: '#333333',
            strokeWidth: 2
          } as ShapeElement;
        } else if (currentTool.id === 'circle') {
          return {
            ...baseElement,
            type: 'shape',
            shapeType: 'circle',
            size: { width: 100, height: 100 },
            fillColor: '#34a853',
            strokeColor: '#333333',
            strokeWidth: 2
          } as ShapeElement;
        }
        break;

      case 'line':
        return {
          ...baseElement,
          type: 'line',
          size: { width: 100, height: 2 },
          startPoint: { x: 0, y: 0 },
          endPoint: { x: 100, y: 0 },
          strokeColor: '#333333',
          strokeWidth: 2,
          strokeStyle: 'solid'
        } as LineElement;
    }

    return null;
  };

  // Handle mouse move during drawing
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !slide) return;

    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    
    if (point && selectedElements.length > 0) {
      const elementId = selectedElements[0];
      const element = slide.elements.find(el => el.id === elementId);
      
      if (element && (element.type === 'shape' || element.type === 'line')) {
        const startX = element.transform?.x || element.x || 0;
        const startY = element.transform?.y || element.y || 0;
        const width = Math.abs(point.x - startX);
        const height = Math.abs(point.y - startY);
        
        dispatch({
          type: 'UPDATE_ELEMENT',
          payload: {
            slideId: slide.id,
            elementId,
            updates: {
              size: { width, height },
              transform: {
                ...(element.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }),
                x: Math.min(startX, point.x),
                y: Math.min(startY, point.y)
              }
            }
          }
        });
      }
    }
  }, [isDrawing, slide, selectedElements, dispatch]);

  // Handle mouse up (end drawing)
  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const transformer = transformerRef.current;
    const stage = stageRef.current;
    
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

  // Handle element transformation
  const handleTransform = useCallback((elementId: string) => {
    if (!slide) return;

    const stage = stageRef.current;
    if (!stage) return;

    const node = stage.findOne(`#${elementId}`);
    if (!node) return;

    const element = slide.elements.find(el => el.id === elementId);
    if (!element) return;

    dispatch({
      type: 'UPDATE_ELEMENT',
      payload: {
        slideId: slide.id,
        elementId,
        updates: {
          transform: {
            x: node.x(),
            y: node.y(),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation()
          },
          size: {
            width: node.width() * node.scaleX(),
            height: node.height() * node.scaleY()
          }
        }
      }
    });
  }, [slide, dispatch]);

  // Render element based on type
  const renderElement = (element: SlideElementType) => {
    const commonProps = {
      id: element.id,
      x: element.transform?.x || element.x || 0,
      y: element.transform?.y || element.y || 0,
      rotation: element.transform?.rotation || element.rotation || 0,
      scaleX: element.transform?.scaleX || 1,
      scaleY: element.transform?.scaleY || 1,
      draggable: isEditing,
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        handleElementSelect(element.id, e.evt.ctrlKey || e.evt.metaKey);
      },
      onTransformEnd: () => handleTransform(element.id)
    };

    switch (element.type) {
      case 'text':
        return (
          <Text
            key={element.id}
            {...commonProps}
            text={('content' in element && (element as any).content) ? (element as any).content : (element as any).text || ''}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily}
            fontStyle={('fontStyle' in element && (element as any).fontStyle) ? (element as any).fontStyle : 'normal'}
            fill={('color' in element && (element as any).color) ? (element as any).color : (element as any).fill || '#000000'}
            width={element.size?.width || element.width || 200}
            height={element.size?.height || element.height || 50}
            align={('textAlign' in element && (element as any).textAlign) ? (element as any).textAlign : 'left'}
            verticalAlign="top"
          />
        );

      case 'shape':
        if (element.shapeType === 'rectangle') {
          return (
            <Rect
              key={element.id}
              {...commonProps}
              width={element.size?.width || element.width || 150}
              height={element.size?.height || element.height || 100}
              fill={('fillColor' in element && (element as any).fillColor) ? (element as any).fillColor : (element as any).fill || '#4285f4'}
              stroke={('strokeColor' in element && (element as any).strokeColor) ? (element as any).strokeColor : (element as any).stroke || '#333333'}
              strokeWidth={('strokeWidth' in element && (element as any).strokeWidth) ? (element as any).strokeWidth : 2}
              cornerRadius={('cornerRadius' in element && (element as any).cornerRadius) ? (element as any).cornerRadius : 0}
            />
          );
        } else if (element.shapeType === 'circle') {
          const radius = Math.min(element.size?.width || element.width || 100, element.size?.height || element.height || 100) / 2;
          return (
            <Circle
              key={element.id}
              {...commonProps}
              radius={radius}
              fill={('fillColor' in element && (element as any).fillColor) ? (element as any).fillColor : (element as any).fill || '#4285f4'}
              stroke={('strokeColor' in element && (element as any).strokeColor) ? (element as any).strokeColor : (element as any).stroke || '#333333'}
              strokeWidth={('strokeWidth' in element && (element as any).strokeWidth) ? (element as any).strokeWidth : 2}
            />
          );
        }
        break;

      case 'line':
        return (
          <Line
            key={element.id}
            {...commonProps}
            points={[
              (element as any).startPoint?.x || 0,
              (element as any).startPoint?.y || 0,
              (element as any).endPoint?.x || 100,
              (element as any).endPoint?.y || 100
            ]}
            stroke={('strokeColor' in element && (element as any).strokeColor) ? (element as any).strokeColor : (element as any).stroke || '#000000'}
            strokeWidth={element.strokeWidth}
            lineCap="round"
            lineJoin="round"
          />
        );

      default:
        return null;
    }
  };

  if (!slide) return null;

  return (
    <div className="slide-canvas">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          border: '1px solid #e0e0e0',
          backgroundColor: slide.backgroundColor || '#ffffff',
          cursor: currentTool.type === 'select' ? 'default' : 'crosshair'
        }}
      >
        <Layer>
          {slide.elements.map(renderElement)}
          {isEditing && <Transformer ref={transformerRef} />}
        </Layer>
      </Stage>
    </div>
  );
};

export default SlideCanvas;