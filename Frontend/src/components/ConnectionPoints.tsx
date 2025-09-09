import React from 'react';
import { Group, Circle, Text, Rect } from 'react-konva';
import Konva from 'konva';
import { SlideElement } from '../types';
import { calculateGroupBounds, getElementConnectionPoint } from '../utils/groupUtils';

interface ConnectionPointsProps {
  element: SlideElement;
  visible: boolean;
  onConnectionPointClick: (elementId: string, connectionPoint: string, position: { x: number; y: number }) => void;
  highlightedConnectionPoint?: string; // Highlight specific connection point during drag
  isDragTarget?: boolean; // Whether this element is currently the drag target
  showSuggestion?: boolean; // Show connection points as suggestions (faded)
  suggestionDistance?: number; // Distance for suggestion visibility
  mousePosition?: { x: number; y: number }; // Current mouse position for proximity calculations
}

const ConnectionPoints: React.FC<ConnectionPointsProps> = ({
  element,
  visible,
  onConnectionPointClick,
  highlightedConnectionPoint,
  isDragTarget = false,
  showSuggestion = false,
  suggestionDistance = 100,
  mousePosition,
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

  // Calculate proximity-based visibility for suggestion mode
  const getPointProximity = (point: { x: number; y: number }) => {
    if (!mousePosition || !showSuggestion) return 0;
    return Math.sqrt(
      Math.pow(point.x - mousePosition.x, 2) + 
      Math.pow(point.y - mousePosition.y, 2)
    );
  };

  // Find the closest connection point for highlighting with improved logic
  const closestPoint = mousePosition && showSuggestion 
    ? connectionPoints.reduce((closest, point) => {
        const distance = getPointProximity(point);
        const closestDistance = getPointProximity(closest);
        
        // Only consider points within suggestion distance
        if (distance <= suggestionDistance && distance < closestDistance) {
          return point;
        }
        return closest;
      })
    : null;

  // Calculate how many connection points are nearby for visual feedback
  const nearbyPointsCount = mousePosition && showSuggestion 
    ? connectionPoints.filter(point => getPointProximity(point) <= suggestionDistance).length
    : 0;

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
      {connectionPoints.map(point => {
        const isHighlighted = highlightedConnectionPoint === point.id;
        const isTargetElement = isDragTarget;
        const isClosestInSuggestion = showSuggestion && closestPoint?.id === point.id;
        const proximity = getPointProximity(point);
        const isInSuggestionRange = proximity <= suggestionDistance;
        
        // Enhanced visual properties based on state - Google Slides style
        let radius = 6;
        let fill = "#0066FF";
        let stroke = "#FFFFFF";
        let strokeWidth = 2;
        let opacity = 0.8;
        let visible = true;
        let showPulseAnimation = false;
        
        if (isHighlighted && isTargetElement) {
          // Actively highlighted target point - bright red for confirmed selection
          radius = 14;
          fill = "#FF4444";
          stroke = "#FFFFFF";
          strokeWidth = 4;
          opacity = 1;
          showPulseAnimation = true;
        } else if (isClosestInSuggestion && isInSuggestionRange) {
          // Suggested connection point (closest when dragging nearby) - Google Slides blue
          radius = 12;
          fill = "#4285F4";
          stroke = "#FFFFFF";
          strokeWidth = 3;
          opacity = 0.95;
          
          // Enhanced visual feedback based on proximity
          const normalizedDistance = Math.min(1, proximity / suggestionDistance);
          const intensityFactor = 1 - normalizedDistance;
          
          // Closer = larger and more opaque
          radius = 8 + (intensityFactor * 6);
          opacity = 0.7 + (intensityFactor * 0.3);
          
          // Very close points get a subtle pulse
          if (proximity <= suggestionDistance * 0.3) {
            showPulseAnimation = true;
          }
        } else if (showSuggestion && isInSuggestionRange) {
          // Other nearby points when in suggestion mode - subtle hints
          const normalizedDistance = Math.min(1, proximity / suggestionDistance);
          const intensityFactor = 1 - normalizedDistance;
          
          radius = 4 + (intensityFactor * 3);
          opacity = 0.3 + (intensityFactor * 0.4);
          fill = "#757575"; // Neutral gray for non-primary suggestions
          stroke = "#FFFFFF";
          strokeWidth = 1;
        } else if (showSuggestion) {
          // Hide distant points when in suggestion mode for cleaner UI
          visible = false;
        }
        
        // Ultra-responsive feedback: highlight when very close
        if (showSuggestion && proximity <= 20) {
          fill = "#FF6B35"; // Orange for immediate proximity
          strokeWidth = 4;
          showPulseAnimation = true;
        }
        
        if (!visible) return null;
        
        // Show tooltip for the closest connection point when dragging
        const showTooltip = isClosestInSuggestion && showSuggestion && proximity <= 50;
        
        return (
          <Group key={point.id}>
            <Circle
              x={point.x}
              y={point.y}
              radius={radius}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
              listening={true}
              perfectDrawEnabled={false}
              onClick={handleConnectionPointClick(point.id, { x: point.x, y: point.y })}
              onMouseEnter={(e) => {
                const container = e.target.getStage()?.container();
                if (container) {
                  container.style.cursor = 'crosshair';
                }
                if (!isHighlighted || !isTargetElement) {
                  const target = e.target as Konva.Circle;
                  target.radius(radius + 2);
                  target.opacity(Math.min(1, opacity + 0.2));
                  target.getLayer()?.batchDraw();
                }
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage()?.container();
                if (container) {
                  container.style.cursor = 'default';
                }
                if (!isHighlighted || !isTargetElement) {
                  const target = e.target as Konva.Circle;
                  target.radius(radius);
                  target.opacity(opacity);
                  target.getLayer()?.batchDraw();
                }
              }}
            />
            
            {/* Connection point suggestion tooltip */}
            {showTooltip && (
              <Group>
                <Rect
                  x={point.x - 25}
                  y={point.y - 35}
                  width={50}
                  height={20}
                  fill="#333333"
                  stroke="#FFFFFF"
                  strokeWidth={1}
                  cornerRadius={4}
                  opacity={0.9}
                  listening={false}
                />
                <Text
                  x={point.x - 25}
                  y={point.y - 32}
                  width={50}
                  height={20}
                  text={`${point.id} (${Math.round(proximity)}px)`}
                  fontSize={10}
                  fontFamily="Arial"
                  fill="#FFFFFF"
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            )}
          </Group>
        );
      })}
    </Group>
  );
};

export default ConnectionPoints;