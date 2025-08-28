import React, { useMemo, useState, useCallback } from 'react';
import { Group, Circle, Line } from 'react-konva';
import Konva from 'konva';
import { Point } from '../types';

interface AdjustmentPoint {
  id: string;
  point: Point;
  type: 'horizontal' | 'vertical';
  segmentIndex: number;
  segmentStart: Point;
  segmentEnd: Point;
}

interface ElbowConnectorAdjustmentPointsProps {
  connectorId: string;
  pathData: string;
  segments: Array<{ start: Point; end: Point }>;
  visible: boolean;
  onAdjustmentChange: (adjustmentPoints: Point[], newPathData: string) => void;
}

/**
 * Component for rendering and managing adjustment points on elbow connectors
 * Provides interactive handles at the center of each bent segment that can be dragged
 * to modify the connector path while maintaining orthogonal routing
 */
const ElbowConnectorAdjustmentPoints: React.FC<ElbowConnectorAdjustmentPointsProps> = ({
  connectorId,
  pathData,
  segments,
  visible,
  onAdjustmentChange,
}) => {
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);
  
  // Calculate adjustment points at the center of bent segments
  const adjustmentPoints = useMemo((): AdjustmentPoint[] => {
    if (!segments || segments.length < 3) return [];
    
    const points: AdjustmentPoint[] = [];
    
    // Find bent segments (segments that connect horizontal and vertical segments)
    for (let i = 1; i < segments.length - 1; i++) {
      const prevSegment = segments[i - 1];
      const currentSegment = segments[i];
      const nextSegment = segments[i + 1];
      
      // Check if current segment is a bend (connects perpendicular segments)
      const prevIsHorizontal = Math.abs(prevSegment.end.y - prevSegment.start.y) < 1;
      const currentIsHorizontal = Math.abs(currentSegment.end.y - currentSegment.start.y) < 1;
      const nextIsHorizontal = Math.abs(nextSegment.end.y - nextSegment.start.y) < 1;
      
      // Current segment is a bend if it's perpendicular to both adjacent segments
      if (currentIsHorizontal !== prevIsHorizontal && currentIsHorizontal !== nextIsHorizontal) {
        const centerPoint = {
          x: (currentSegment.start.x + currentSegment.end.x) / 2,
          y: (currentSegment.start.y + currentSegment.end.y) / 2,
        };
        
        points.push({
          id: `${connectorId}-adjust-${i}`,
          point: centerPoint,
          type: currentIsHorizontal ? 'vertical' : 'horizontal',
          segmentIndex: i,
          segmentStart: currentSegment.start,
          segmentEnd: currentSegment.end,
        });
      }
    }
    
    return points;
  }, [segments, connectorId]);
  
  // Handle adjustment point drag
  const handleAdjustmentDrag = useCallback((
    adjustmentPoint: AdjustmentPoint, 
    newPosition: Point
  ) => {
    if (!segments) return;
    
    // Create new segments array with the adjusted segment
    const newSegments = [...segments];
    const segmentIndex = adjustmentPoint.segmentIndex;
    
    // Calculate the offset from the original center
    const originalCenter = {
      x: (adjustmentPoint.segmentStart.x + adjustmentPoint.segmentEnd.x) / 2,
      y: (adjustmentPoint.segmentStart.y + adjustmentPoint.segmentEnd.y) / 2,
    };
    
    let offset: Point;
    
    if (adjustmentPoint.type === 'horizontal') {
      // Can only move horizontally
      offset = {
        x: newPosition.x - originalCenter.x,
        y: 0,
      };
    } else {
      // Can only move vertically  
      offset = {
        x: 0,
        y: newPosition.y - originalCenter.y,
      };
    }
    
    // Apply the offset to the bent segment
    const currentSegment = newSegments[segmentIndex];
    const newSegment = {
      start: {
        x: currentSegment.start.x + offset.x,
        y: currentSegment.start.y + offset.y,
      },
      end: {
        x: currentSegment.end.x + offset.x,
        y: currentSegment.end.y + offset.y,
      },
    };
    
    newSegments[segmentIndex] = newSegment;
    
    // Update adjacent segments to maintain connection
    if (segmentIndex > 0) {
      newSegments[segmentIndex - 1] = {
        ...newSegments[segmentIndex - 1],
        end: newSegment.start,
      };
    }
    
    if (segmentIndex < newSegments.length - 1) {
      newSegments[segmentIndex + 1] = {
        ...newSegments[segmentIndex + 1],
        start: newSegment.end,
      };
    }
    
    // Generate new path data from segments
    const newPathData = generatePathFromSegments(newSegments);
    
    // Extract adjustment points for the LineElement
    const adjustmentHandlePoints = adjustmentPoints.map(ap => {
      if (ap.id === adjustmentPoint.id) {
        return {
          x: newPosition.x,
          y: newPosition.y,
        };
      }
      return ap.point;
    });
    
    onAdjustmentChange(adjustmentHandlePoints, newPathData);
  }, [segments, adjustmentPoints, onAdjustmentChange]);
  
  // Generate SVG path data from segments
  const generatePathFromSegments = useCallback((segments: Array<{ start: Point; end: Point }>): string => {
    if (segments.length === 0) return '';
    
    let pathData = `M ${segments[0].start.x} ${segments[0].start.y}`;
    
    segments.forEach(segment => {
      pathData += ` L ${segment.end.x} ${segment.end.y}`;
    });
    
    return pathData;
  }, []);
  
  if (!visible || adjustmentPoints.length === 0) {
    return null;
  }
  
  return (
    <Group>
      {adjustmentPoints.map((adjustmentPoint) => (
        <Group key={adjustmentPoint.id}>
          {/* Adjustment handle - visual indicator */}
          <Circle
            x={adjustmentPoint.point.x}
            y={adjustmentPoint.point.y}
            radius={6}
            fill="#4285f4"
            stroke="#ffffff"
            strokeWidth={2}
            draggable={true}
            onMouseEnter={(e) => {
              e.target.getStage()!.container().style.cursor = 
                adjustmentPoint.type === 'horizontal' ? 'ew-resize' : 'ns-resize';
            }}
            onMouseLeave={(e) => {
              e.target.getStage()!.container().style.cursor = 'default';
            }}
            onDragStart={() => {
              setDraggedPointId(adjustmentPoint.id);
            }}
            onDragMove={(e) => {
              const newPosition = { x: e.target.x(), y: e.target.y() };
              
              // Apply movement constraints
              if (adjustmentPoint.type === 'horizontal') {
                // Only allow horizontal movement
                e.target.y(adjustmentPoint.point.y);
                newPosition.y = adjustmentPoint.point.y;
              } else {
                // Only allow vertical movement
                e.target.x(adjustmentPoint.point.x);
                newPosition.x = adjustmentPoint.point.x;
              }
              
              handleAdjustmentDrag(adjustmentPoint, newPosition);
            }}
            onDragEnd={() => {
              setDraggedPointId(null);
            }}
            dragBoundFunc={(pos) => {
              // Enforce movement constraints during drag
              if (adjustmentPoint.type === 'horizontal') {
                return {
                  x: pos.x,
                  y: adjustmentPoint.point.y, // Lock Y position
                };
              } else {
                return {
                  x: adjustmentPoint.point.x, // Lock X position
                  y: pos.y,
                };
              }
            }}
          />
          
          {/* Visual guide lines when dragging */}
          {draggedPointId === adjustmentPoint.id && (
            <>
              {adjustmentPoint.type === 'horizontal' ? (
                <Line
                  points={[
                    adjustmentPoint.point.x - 20,
                    adjustmentPoint.point.y,
                    adjustmentPoint.point.x + 20,
                    adjustmentPoint.point.y,
                  ]}
                  stroke="#4285f4"
                  strokeWidth={1}
                  dash={[5, 5]}
                  opacity={0.7}
                  listening={false}
                />
              ) : (
                <Line
                  points={[
                    adjustmentPoint.point.x,
                    adjustmentPoint.point.y - 20,
                    adjustmentPoint.point.x,
                    adjustmentPoint.point.y + 20,
                  ]}
                  stroke="#4285f4"
                  strokeWidth={1}
                  dash={[5, 5]}
                  opacity={0.7}
                  listening={false}
                />
              )}
            </>
          )}
        </Group>
      ))}
    </Group>
  );
};

export default ElbowConnectorAdjustmentPoints;