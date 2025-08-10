import React, { useRef, useState, useCallback } from 'react';
import { Group, Arc, Circle, Line } from 'react-konva';
import Konva from 'konva';

interface PieShapeProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  rotation: number;
  opacity: number;
  isSelected: boolean;
  draggable: boolean;
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  onUpdate: (updates: any) => void;
}

const PieShape: React.FC<PieShapeProps> = ({
  id,
  x,
  y,
  width,
  height,
  fill,
  stroke,
  strokeWidth,
  startAngle,
  endAngle,
  innerRadius,
  rotation,
  opacity,
  isSelected,
  draggable,
  onClick,
  onDragEnd,
  onTransformEnd,
  onUpdate,
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const [isDraggingHandle, setIsDraggingHandle] = useState<'start' | 'end' | 'inner' | null>(null);

  const radius = Math.min(width, height) / 2;
  const centerX = x + radius;
  const centerY = y + radius;
  const innerRad = (innerRadius / 100) * radius;

  // Calculate handle positions
  const actualStartAngle = Math.min(startAngle, endAngle);
  const actualEndAngle = Math.max(startAngle, endAngle);
  
  const startAngleRad = ((actualStartAngle + rotation) * Math.PI) / 180;
  const endAngleRad = ((actualEndAngle + rotation) * Math.PI) / 180;
  const handleRadius = radius + 20;

  const startHandleX = centerX + Math.cos(startAngleRad) * handleRadius;
  const startHandleY = centerY + Math.sin(startAngleRad) * handleRadius;
  const endHandleX = centerX + Math.cos(endAngleRad) * handleRadius;
  const endHandleY = centerY + Math.sin(endAngleRad) * handleRadius;
  
  // Inner radius handle position (on the middle of the arc)
  const midAngle = ((actualStartAngle + actualEndAngle) / 2 + rotation) * Math.PI / 180;
  const innerHandleRadius = Math.max(innerRad + 15, radius * 0.3);
  const innerHandleX = centerX + Math.cos(midAngle) * innerHandleRadius;
  const innerHandleY = centerY + Math.sin(midAngle) * innerHandleRadius;

  const handleAngleDrag = useCallback((e: Konva.KonvaEventObject<DragEvent>, handleType: 'start' | 'end') => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    
    const dx = pointerPosition.x - centerX;
    const dy = pointerPosition.y - centerY;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    
    // Normalize angle to 0-360
    if (angle < 0) angle += 360;
    
    // Subtract rotation to get the actual angle relative to the shape
    angle = angle - rotation;
    if (angle < 0) angle += 360;
    
    const roundedAngle = Math.round(angle);
    
    if (handleType === 'start') {
      onUpdate({ startAngle: roundedAngle });
    } else {
      onUpdate({ endAngle: roundedAngle });
    }
  }, [centerX, centerY, rotation, onUpdate]);
  
  const handleInnerRadiusDrag = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    
    const distance = Math.sqrt(
      Math.pow(pointerPosition.x - centerX, 2) + 
      Math.pow(pointerPosition.y - centerY, 2)
    );
    
    const newInnerRadiusPercent = Math.max(0, Math.min(90, (distance / radius) * 100));
    onUpdate({ innerRadius: Math.round(newInnerRadiusPercent) });
  }, [centerX, centerY, radius, onUpdate]);

  return (
    <Group
      ref={groupRef}
      id={id}
      draggable={draggable && isDraggingHandle === null}
      onClick={isDraggingHandle === null ? onClick : undefined}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      {/* Main pie arc */}
      <Arc
        x={centerX}
        y={centerY}
        innerRadius={innerRad}
        outerRadius={radius}
        angle={Math.abs(endAngle - startAngle)}
        rotation={rotation + Math.min(startAngle, endAngle)}
        fill={fill}
        stroke={isSelected ? '#0066FF' : stroke}
        strokeWidth={isSelected ? 3 : strokeWidth}
        opacity={opacity}
        listening={isDraggingHandle === null}
      />
      
      {/* Selection indicators and adjustment handles */}
      {isSelected && (
        <>
          {/* Outer circle guide */}
          <Circle
            x={centerX}
            y={centerY}
            radius={handleRadius}
            stroke="#E0E0E0"
            strokeWidth={1}
            dash={[2, 4]}
            listening={false}
          />
          
          {/* Start angle handle */}
          <Line
            points={[centerX, centerY, startHandleX, startHandleY]}
            stroke={isDraggingHandle === 'start' ? '#0080FF' : '#0066FF'}
            strokeWidth={isDraggingHandle === 'start' ? 2 : 1}
            dash={[3, 3]}
            listening={false}
          />
          <Circle
            x={startHandleX}
            y={startHandleY}
            radius={isDraggingHandle === 'start' ? 6 : 5}
            fill={isDraggingHandle === 'start' ? '#0080FF' : '#0066FF'}
            stroke="#FFFFFF"
            strokeWidth={2}
            draggable={true}
            onDragStart={(e) => {
              e.cancelBubble = true;
              setIsDraggingHandle('start');
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              setIsDraggingHandle(null);
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              if (isDraggingHandle === 'start') {
                handleAngleDrag(e, 'start');
              }
            }}
          />
          
          {/* End angle handle */}
          <Line
            points={[centerX, centerY, endHandleX, endHandleY]}
            stroke={isDraggingHandle === 'end' ? '#FF8800' : '#FF6600'}
            strokeWidth={isDraggingHandle === 'end' ? 2 : 1}
            dash={[3, 3]}
            listening={false}
          />
          <Circle
            x={endHandleX}
            y={endHandleY}
            radius={isDraggingHandle === 'end' ? 6 : 5}
            fill={isDraggingHandle === 'end' ? '#FF8800' : '#FF6600'}
            stroke="#FFFFFF"
            strokeWidth={2}
            draggable={true}
            onDragStart={(e) => {
              e.cancelBubble = true;
              setIsDraggingHandle('end');
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              setIsDraggingHandle(null);
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              if (isDraggingHandle === 'end') {
                handleAngleDrag(e, 'end');
              }
            }}
          />
          
          {/* Inner radius guide line */}
          {innerRadius > 0 && (
            <Circle
              x={centerX}
              y={centerY}
              radius={innerRad}
              stroke="#A0A0A0"
              strokeWidth={1}
              dash={[2, 2]}
              listening={false}
            />
          )}
          
          {/* Inner radius handle */}
          <Circle
            x={innerHandleX}
            y={innerHandleY}
            radius={isDraggingHandle === 'inner' ? 5 : 4}
            fill={isDraggingHandle === 'inner' ? '#00CC00' : '#00AA00'}
            stroke="#FFFFFF"
            strokeWidth={2}
            draggable={true}
            onDragStart={(e) => {
              e.cancelBubble = true;
              setIsDraggingHandle('inner');
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              setIsDraggingHandle(null);
            }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              if (isDraggingHandle === 'inner') {
                handleInnerRadiusDrag(e);
              }
            }}
          />
        </>
      )}
    </Group>
  );
};

export default PieShape;