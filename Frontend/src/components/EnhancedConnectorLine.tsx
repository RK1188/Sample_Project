import React, { useMemo } from 'react';
import { Line, Circle, Group, Path } from 'react-konva';
import Konva from 'konva';
import { SlideElement, Point } from '../types';
import { getElementConnectionPoint } from '../utils/groupUtils';

export type ConnectorType = 'straight' | 'elbow' | 'curved';

interface EnhancedConnectorLineProps {
  id: string;
  startPoint: Point;
  endPoint: Point;
  connectorType: ConnectorType;
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

const EnhancedConnectorLine: React.FC<EnhancedConnectorLineProps> = ({
  id,
  startPoint,
  endPoint,
  connectorType,
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

  // Generate path based on connector type
  const pathData = useMemo(() => {
    const { start, end } = actualPoints;
    
    switch (connectorType) {
      case 'straight':
        // Simple straight line
        return null; // Will use Line component instead
        
      case 'elbow':
        // Right-angle connector (L-shaped or Z-shaped)
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        
        // Determine the routing based on connection points
        let path = `M ${start.x} ${start.y}`;
        
        if (startConnectionPoint && endConnectionPoint) {
          // Smart routing based on connection points
          if (startConnectionPoint === 'right' && endConnectionPoint === 'left') {
            // Horizontal first, then vertical
            const midX = start.x + dx / 2;
            path += ` L ${midX} ${start.y}`;
            path += ` L ${midX} ${end.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'left' && endConnectionPoint === 'right') {
            // Horizontal first, then vertical
            const midX = start.x + dx / 2;
            path += ` L ${midX} ${start.y}`;
            path += ` L ${midX} ${end.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'bottom' && endConnectionPoint === 'top') {
            // Vertical first, then horizontal
            const midY = start.y + dy / 2;
            path += ` L ${start.x} ${midY}`;
            path += ` L ${end.x} ${midY}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'top' && endConnectionPoint === 'bottom') {
            // Vertical first, then horizontal
            const midY = start.y + dy / 2;
            path += ` L ${start.x} ${midY}`;
            path += ` L ${end.x} ${midY}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'right' && endConnectionPoint === 'top') {
            // Right then up
            path += ` L ${end.x} ${start.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'right' && endConnectionPoint === 'bottom') {
            // Right then down
            path += ` L ${end.x} ${start.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'left' && endConnectionPoint === 'top') {
            // Left then up
            path += ` L ${end.x} ${start.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'left' && endConnectionPoint === 'bottom') {
            // Left then down
            path += ` L ${end.x} ${start.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'top' && endConnectionPoint === 'left') {
            // Up then left
            path += ` L ${start.x} ${end.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'top' && endConnectionPoint === 'right') {
            // Up then right
            path += ` L ${start.x} ${end.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'bottom' && endConnectionPoint === 'left') {
            // Down then left
            path += ` L ${start.x} ${end.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else if (startConnectionPoint === 'bottom' && endConnectionPoint === 'right') {
            // Down then right
            path += ` L ${start.x} ${end.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else {
            // Default: create an L-shape
            if (Math.abs(dx) > Math.abs(dy)) {
              // Horizontal dominant
              path += ` L ${end.x} ${start.y}`;
              path += ` L ${end.x} ${end.y}`;
            } else {
              // Vertical dominant
              path += ` L ${start.x} ${end.y}`;
              path += ` L ${end.x} ${end.y}`;
            }
          }
        } else {
          // Simple elbow without smart routing
          if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal dominant
            const midX = start.x + dx / 2;
            path += ` L ${midX} ${start.y}`;
            path += ` L ${midX} ${end.y}`;
            path += ` L ${end.x} ${end.y}`;
          } else {
            // Vertical dominant
            const midY = start.y + dy / 2;
            path += ` L ${start.x} ${midY}`;
            path += ` L ${end.x} ${midY}`;
            path += ` L ${end.x} ${end.y}`;
          }
        }
        
        return path;
        
      case 'curved':
        // Bezier curve connector
        const controlOffset = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) * 0.5;
        let control1: Point, control2: Point;
        
        if (startConnectionPoint && endConnectionPoint) {
          // Smart control points based on connection directions
          control1 = { ...start };
          control2 = { ...end };
          
          // Adjust control points based on connection points
          const curveDx = end.x - start.x;
          const curveDy = end.y - start.y;
          const curveDistance = Math.max(50, Math.min(150, Math.sqrt(curveDx * curveDx + curveDy * curveDy) * 0.3));
          
          switch (startConnectionPoint) {
            case 'right':
              control1.x += curveDistance;
              break;
            case 'left':
              control1.x -= curveDistance;
              break;
            case 'top':
              control1.y -= curveDistance;
              break;
            case 'bottom':
              control1.y += curveDistance;
              break;
          }
          
          switch (endConnectionPoint) {
            case 'right':
              control2.x += curveDistance;
              break;
            case 'left':
              control2.x -= curveDistance;
              break;
            case 'top':
              control2.y -= curveDistance;
              break;
            case 'bottom':
              control2.y += curveDistance;
              break;
          }
        } else {
          // Default curve control points
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const curveDx = end.x - start.x;
          const curveDy = end.y - start.y;
          
          if (Math.abs(curveDx) > Math.abs(curveDy)) {
            // Horizontal curve
            control1 = { x: midX, y: start.y };
            control2 = { x: midX, y: end.y };
          } else {
            // Vertical curve
            control1 = { x: start.x, y: midY };
            control2 = { x: end.x, y: midY };
          }
        }
        
        return `M ${start.x} ${start.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`;
        
      default:
        return null;
    }
  }, [actualPoints, connectorType, startConnectionPoint, endConnectionPoint]);

  // Calculate arrow points for path-based connectors
  const getPathArrowAngle = (pathData: string, isStart: boolean): number => {
    if (!pathData) return 0;
    
    const { start, end } = actualPoints;
    
    if (connectorType === 'curved') {
      // For curved connectors, calculate tangent at endpoints
      const pathParts = pathData.split(' ');
      if (pathParts[0] === 'M' && pathParts[3] === 'C') {
        // Parse control points
        const control1X = parseFloat(pathParts[4]);
        const control1Y = parseFloat(pathParts[5].replace(',', ''));
        const control2X = parseFloat(pathParts[6]);
        const control2Y = parseFloat(pathParts[7].replace(',', ''));
        
        if (isStart) {
          // Tangent at start (from start to first control point)
          return Math.atan2(control1Y - start.y, control1X - start.x);
        } else {
          // Tangent at end (from second control point to end)
          return Math.atan2(end.y - control2Y, end.x - control2X);
        }
      }
    } else if (connectorType === 'elbow') {
      // For elbow connectors, calculate angle based on last segment
      const segments = pathData.match(/L\s*([\d.-]+)\s+([\d.-]+)/g);
      if (segments && segments.length > 0) {
        if (isStart) {
          // First segment direction
          const firstSegment = segments[0];
          const coords = firstSegment.match(/([\d.-]+)\s+([\d.-]+)/);
          if (coords) {
            const nextX = parseFloat(coords[1]);
            const nextY = parseFloat(coords[2]);
            return Math.atan2(nextY - start.y, nextX - start.x);
          }
        } else {
          // Last segment direction
          const lastSegment = segments[segments.length - 1];
          const prevSegment = segments.length > 1 ? segments[segments.length - 2] : null;
          
          if (prevSegment) {
            const prevCoords = prevSegment.match(/([\d.-]+)\s+([\d.-]+)/);
            if (prevCoords) {
              const prevX = parseFloat(prevCoords[1]);
              const prevY = parseFloat(prevCoords[2]);
              return Math.atan2(end.y - prevY, end.x - prevX);
            }
          }
        }
      }
    }
    
    // Fallback to straight line angle
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.atan2(dy, dx);
  };

  // Calculate arrow points
  const arrowPoints = useMemo(() => {
    const arrows: { start?: number[]; end?: number[] } = {};
    const arrowLength = 15;
    const arrowWidth = 8;
    
    if (pathData) {
      // For path-based connectors
      if (arrowStart) {
        const angle = getPathArrowAngle(pathData, true);
        const startAngle = angle + Math.PI;
        arrows.start = [
          actualPoints.start.x,
          actualPoints.start.y,
          actualPoints.start.x + Math.cos(startAngle - arrowWidth/15) * arrowLength,
          actualPoints.start.y + Math.sin(startAngle - arrowWidth/15) * arrowLength,
          actualPoints.start.x + Math.cos(startAngle + arrowWidth/15) * arrowLength,
          actualPoints.start.y + Math.sin(startAngle + arrowWidth/15) * arrowLength,
          actualPoints.start.x,
          actualPoints.start.y,
        ];
      }
      
      if (arrowEnd) {
        const angle = getPathArrowAngle(pathData, false);
        arrows.end = [
          actualPoints.end.x,
          actualPoints.end.y,
          actualPoints.end.x + Math.cos(angle - arrowWidth/15 + Math.PI) * arrowLength,
          actualPoints.end.y + Math.sin(angle - arrowWidth/15 + Math.PI) * arrowLength,
          actualPoints.end.x + Math.cos(angle + arrowWidth/15 + Math.PI) * arrowLength,
          actualPoints.end.y + Math.sin(angle + arrowWidth/15 + Math.PI) * arrowLength,
          actualPoints.end.x,
          actualPoints.end.y,
        ];
      }
    } else {
      // For straight lines
      const dx = actualPoints.end.x - actualPoints.start.x;
      const dy = actualPoints.end.y - actualPoints.start.y;
      const angle = Math.atan2(dy, dx);
      
      if (arrowStart) {
        const startAngle = angle + Math.PI;
        arrows.start = [
          actualPoints.start.x,
          actualPoints.start.y,
          actualPoints.start.x + Math.cos(startAngle - arrowWidth/15) * arrowLength,
          actualPoints.start.y + Math.sin(startAngle - arrowWidth/15) * arrowLength,
          actualPoints.start.x + Math.cos(startAngle + arrowWidth/15) * arrowLength,
          actualPoints.start.y + Math.sin(startAngle + arrowWidth/15) * arrowLength,
          actualPoints.start.x,
          actualPoints.start.y,
        ];
      }
      
      if (arrowEnd) {
        arrows.end = [
          actualPoints.end.x,
          actualPoints.end.y,
          actualPoints.end.x + Math.cos(angle - arrowWidth/15 + Math.PI) * arrowLength,
          actualPoints.end.y + Math.sin(angle - arrowWidth/15 + Math.PI) * arrowLength,
          actualPoints.end.x + Math.cos(angle + arrowWidth/15 + Math.PI) * arrowLength,
          actualPoints.end.y + Math.sin(angle + arrowWidth/15 + Math.PI) * arrowLength,
          actualPoints.end.x,
          actualPoints.end.y,
        ];
      }
    }
    
    return arrows;
  }, [actualPoints, arrowStart, arrowEnd, pathData]);

  const dashArray = strokeStyle === 'dashed' ? [10, 5] : strokeStyle === 'dotted' ? [2, 3] : undefined;

  return (
    <Group>
      {/* Main connector line/path */}
      {pathData ? (
        <Path
          id={id}
          data={pathData}
          stroke={isSelected ? '#0066FF' : stroke}
          strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
          dash={dashArray}
          fill="transparent"
          onClick={onClick}
        />
      ) : (
        <Line
          id={id}
          points={[actualPoints.start.x, actualPoints.start.y, actualPoints.end.x, actualPoints.end.y]}
          stroke={isSelected ? '#0066FF' : stroke}
          strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
          dash={dashArray}
          onClick={onClick}
        />
      )}
      
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

export default EnhancedConnectorLine;