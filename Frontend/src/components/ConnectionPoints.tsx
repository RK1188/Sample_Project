import React from 'react';
import { Group, Circle } from 'react-konva';
import Konva from 'konva';
import { SlideElement } from '../types';
import { calculateGroupBounds, getElementConnectionPoint } from '../utils/groupUtils';

interface ConnectionPointsProps {
  element: SlideElement;
  visible: boolean;
  onConnectionPointClick: (elementId: string, connectionPoint: string, position: { x: number; y: number }) => void;
}

const ConnectionPoints: React.FC<ConnectionPointsProps> = ({
  element,
  visible,
  onConnectionPointClick,
}) => {
  if (!visible) return null;

  // Use utility function to get consistent bounds calculation
  const bounds = element.type === 'group' 
    ? calculateGroupBounds(element)
    : {
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 100,
        height: element.height || 100
      };

  const connectionPoints = [
    { id: 'top', ...getElementConnectionPoint(element, 'top') },
    { id: 'bottom', ...getElementConnectionPoint(element, 'bottom') },
    { id: 'left', ...getElementConnectionPoint(element, 'left') },
    { id: 'right', ...getElementConnectionPoint(element, 'right') },
    { id: 'center', ...getElementConnectionPoint(element, 'center') },
  ];

  const handleConnectionPointClick = (connectionPoint: string, position: { x: number; y: number }) => {
    return (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      e.evt.stopPropagation();
      console.log('Connection point clicked:', element.id, connectionPoint, position);
      onConnectionPointClick(element.id, connectionPoint, position);
    };
  };

  return (
    <Group>
      {connectionPoints.map(point => (
        <Circle
          key={point.id}
          x={point.x}
          y={point.y}
          radius={6}
          fill="#0066FF"
          stroke="#FFFFFF"
          strokeWidth={2}
          opacity={0.8}
          listening={true}
          perfectDrawEnabled={false}
          onClick={handleConnectionPointClick(point.id, { x: point.x, y: point.y })}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) {
              container.style.cursor = 'crosshair';
            }
            e.target.opacity(1);
            e.target.getLayer()?.batchDraw();
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) {
              container.style.cursor = 'default';
            }
            e.target.opacity(0.8);
            e.target.getLayer()?.batchDraw();
          }}
        />
      ))}
    </Group>
  );
};

export default ConnectionPoints;