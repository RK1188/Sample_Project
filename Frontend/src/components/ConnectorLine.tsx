import React, { useMemo } from 'react';
import { Line, Circle, Group } from 'react-konva';
import Konva from 'konva';
import { SlideElement, Point } from '../types';
import { getElementConnectionPoint } from '../utils/groupUtils';

interface ConnectorLineProps {
  id: string;
  startPoint: Point;
  endPoint: Point;
  stroke: string;
  strokeWidth: number;
  strokeStyle?: string;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  isSelected: boolean;
  startElementId?: string;
  endElementId?: string;
  startConnectionPoint?: string;
  endConnectionPoint?: string;
  allElements: SlideElement[];
  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onUpdate: (updates: any) => void;
}

const ConnectorLine: React.FC<ConnectorLineProps> = ({
  id,
  startPoint,
  endPoint,
  stroke,
  strokeWidth,
  strokeStyle,
  arrowStart,
  arrowEnd,
  isSelected,
  startElementId,
  endElementId,
  startConnectionPoint,
  endConnectionPoint,
  allElements,
  onClick,
  onUpdate,
}) => {
  
  // Calculate actual connection points based on connected elements
  const actualPoints = useMemo(() => {
    let actualStart = startPoint;
    let actualEnd = endPoint;
    
    // If connected to elements, calculate connection points using utility function
    if (startElementId && startConnectionPoint) {
      const startElement = allElements.find(el => el.id === startElementId);
      if (startElement) {
        actualStart = getElementConnectionPoint(startElement, startConnectionPoint);
      }
    }
    
    if (endElementId && endConnectionPoint) {
      const endElement = allElements.find(el => el.id === endElementId);
      if (endElement) {
        actualEnd = getElementConnectionPoint(endElement, endConnectionPoint);
      }
    }
    
    return { start: actualStart, end: actualEnd };
  }, [startPoint, endPoint, startElementId, endElementId, startConnectionPoint, endConnectionPoint, allElements]);

  // Calculate arrow points
  const arrowPoints = useMemo(() => {
    const dx = actualPoints.end.x - actualPoints.start.x;
    const dy = actualPoints.end.y - actualPoints.start.y;
    const angle = Math.atan2(dy, dx);
    const length = 15;
    const width = 8;
    
    const arrows: { start?: number[]; end?: number[] } = {};
    
    if (arrowStart) {
      const startAngle = angle + Math.PI;
      arrows.start = [
        actualPoints.start.x,
        actualPoints.start.y,
        actualPoints.start.x + Math.cos(startAngle - width/15) * length,
        actualPoints.start.y + Math.sin(startAngle - width/15) * length,
        actualPoints.start.x + Math.cos(startAngle + width/15) * length,
        actualPoints.start.y + Math.sin(startAngle + width/15) * length,
        actualPoints.start.x,
        actualPoints.start.y,
      ];
    }
    
    if (arrowEnd) {
      arrows.end = [
        actualPoints.end.x,
        actualPoints.end.y,
        actualPoints.end.x + Math.cos(angle - width/15 + Math.PI) * length,
        actualPoints.end.y + Math.sin(angle - width/15 + Math.PI) * length,
        actualPoints.end.x + Math.cos(angle + width/15 + Math.PI) * length,
        actualPoints.end.y + Math.sin(angle + width/15 + Math.PI) * length,
        actualPoints.end.x,
        actualPoints.end.y,
      ];
    }
    
    return arrows;
  }, [actualPoints, arrowStart, arrowEnd]);

  return (
    <Group>
      {/* Main line */}
      <Line
        id={id}
        points={[actualPoints.start.x, actualPoints.start.y, actualPoints.end.x, actualPoints.end.y]}
        stroke={isSelected ? '#0066FF' : stroke}
        strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
        dash={strokeStyle === 'dashed' ? [10, 5] : strokeStyle === 'dotted' ? [2, 3] : undefined}
        onClick={onClick}
      />
      
      {/* Arrow at start */}
      {arrowStart && arrowPoints.start && (
        <Line
          points={arrowPoints.start}
          stroke={isSelected ? '#0066FF' : stroke}
          strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
          fill={isSelected ? '#0066FF' : stroke}
          closed={true}
          listening={false}
        />
      )}
      
      {/* Arrow at end */}
      {arrowEnd && arrowPoints.end && (
        <Line
          points={arrowPoints.end}
          stroke={isSelected ? '#0066FF' : stroke}
          strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
          fill={isSelected ? '#0066FF' : stroke}
          closed={true}
          listening={false}
        />
      )}
      
      {/* Connection point indicators when selected */}
      {isSelected && (
        <>
          <Circle
            x={actualPoints.start.x}
            y={actualPoints.start.y}
            radius={4}
            fill="#00AA00"
            stroke="#FFFFFF"
            strokeWidth={1}
            listening={false}
          />
          <Circle
            x={actualPoints.end.x}
            y={actualPoints.end.y}
            radius={4}
            fill="#AA0000"
            stroke="#FFFFFF"
            strokeWidth={1}
            listening={false}
          />
        </>
      )}
    </Group>
  );
};


export default ConnectorLine;