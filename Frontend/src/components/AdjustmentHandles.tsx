import React, { useCallback } from 'react';
import { Circle, Group } from 'react-konva';
import Konva from 'konva';
import { ShapeElement } from '../types';

interface AdjustmentHandlesProps {
  element: ShapeElement;
  visible: boolean;
  onAdjustmentChange: (adjustments: any) => void;
}

const AdjustmentHandles: React.FC<AdjustmentHandlesProps> = ({
  element,
  visible,
  onAdjustmentChange,
}) => {
  if (!visible || element.type !== 'shape') return null;

  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 100;
  const height = element.height || 100;

  const handleDrag = useCallback((adjustmentType: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    const adjustments = getAdjustmentValue(element.shapeType || 'rectangle', adjustmentType, pos, { x, y, width, height }, element);
    onAdjustmentChange(adjustments);
  }, [element, x, y, width, height, onAdjustmentChange]);

  const adjustmentPoints = getAdjustmentPoints(element.shapeType || 'rectangle', { x, y, width, height }, element.adjustments || {});

  return (
    <Group>
      {adjustmentPoints.map((point, index) => (
        <Circle
          key={`adjustment-${element.id}-${index}`}
          x={point.x}
          y={point.y}
          radius={6}
          fill="#4285f4"
          stroke="#ffffff"
          strokeWidth={2}
          draggable
          onDragMove={(e) => {
            handleDrag(point.type, e);
          }}
          onDragEnd={(e) => {
            // Don't reset position - let the handle update based on new adjustment
            const newPoints = getAdjustmentPoints(element.shapeType || 'rectangle', { x, y, width, height }, element.adjustments || {});
            const newPoint = newPoints[index];
            if (newPoint) {
              e.target.x(newPoint.x);
              e.target.y(newPoint.y);
            }
          }}
          onMouseEnter={(e) => {
            e.target.getStage()!.container().style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            e.target.getStage()!.container().style.cursor = 'default';
          }}
        />
      ))}
    </Group>
  );
};

interface AdjustmentPoint {
  x: number;
  y: number;
  type: string;
}

function getAdjustmentPoints(
  shapeType: string,
  bounds: { x: number; y: number; width: number; height: number },
  adjustments: any
): AdjustmentPoint[] {
  const { x, y, width, height } = bounds;
  const points: AdjustmentPoint[] = [];

  switch (shapeType) {
    case 'roundedRectangle':
      // Corner radius adjustment
      const cornerRadius = adjustments.cornerRadius || 10;
      points.push({
        x: x + cornerRadius,
        y: y,
        type: 'cornerRadius'
      });
      break;

    case 'triangle':
      // Top vertex position adjustment
      const topVertexRatio = adjustments.topVertexRatio || 0.5;
      points.push({
        x: x + width * topVertexRatio,
        y: y,
        type: 'topVertexRatio'
      });
      // Base width adjustment - optional second handle
      const baseWidthRatio = adjustments.baseWidthRatio || 1;
      points.push({
        x: x + width * baseWidthRatio,
        y: y + height,
        type: 'baseWidthRatio'
      });
      break;

    case 'rightTriangle':
      // Add a handle to rotate through different right angle positions
      const rightAnglePos = adjustments.rightAnglePosition || 'bottomLeft';
      
      // Position the handle based on where the right angle is
      if (rightAnglePos === 'bottomLeft') {
        points.push({
          x: x,
          y: y + height,
          type: 'rightAnglePosition'
        });
      } else if (rightAnglePos === 'bottomRight') {
        points.push({
          x: x + width,
          y: y + height,
          type: 'rightAnglePosition'
        });
      } else if (rightAnglePos === 'topLeft') {
        points.push({
          x: x,
          y: y,
          type: 'rightAnglePosition'
        });
      } else {
        points.push({
          x: x + width,
          y: y,
          type: 'rightAnglePosition'
        });
      }
      break;

    case 'diamond':
    case 'flowchartDecision':
      // Diamond shape ratio adjustment (width of diamond at center)
      const diamondRatio = adjustments.diamondRatio || 0.5;
      points.push({
        x: x + width * diamondRatio,
        y: y,
        type: 'diamondRatio'
      });
      break;

    case 'pentagon':
      // Pentagon has no adjustment points - it's a fixed regular polygon
      break;
    
    case 'hexagon':
      // Hexagon adjustment - handle at top-left like PowerPoint
      // Controls how much to cut the corners (creating angled sides)
      const hexCornerCut = adjustments.hexCornerCut || 0.15;  // Default to 15% cut
      points.push({
        x: x + width * hexCornerCut,  // Handle position matches the cut amount
        y: y,
        type: 'hexCornerCut'
      });
      break;
    
    case 'octagon':
      // Octagon adjustment - handle at top-left like PowerPoint
      // Controls how much to cut the corners (creating angled sides)
      const octCornerCut = adjustments.octCornerCut || 0.29;  // Default to 29% cut (PowerPoint default)
      points.push({
        x: x + width * octCornerCut,  // Handle position matches the cut amount
        y: y,
        type: 'octCornerCut'
      });
      break;

    case 'arrow':
    case 'rightArrow':
    case 'leftArrow':
    case 'upArrow':
    case 'downArrow':
      // Arrow head size adjustment - at the base of the arrowhead
      const arrowHeadSize = adjustments.arrowHeadSize || 0.4;
      const arrowTailWidth = adjustments.arrowTailWidth || 0.5;
      
      if (shapeType === 'rightArrow' || shapeType === 'arrow') {
        // Head size handle at the base of arrowhead
        points.push({
          x: x + width - (width * arrowHeadSize),
          y: y,  // At top edge
          type: 'arrowHeadSize'
        });
        // Tail width handle at the tail end, top edge
        points.push({
          x: x,
          y: y + (height * (1 - arrowTailWidth) / 2),
          type: 'arrowTailWidth'
        });
      } else if (shapeType === 'leftArrow') {
        // Head size handle at the base of arrowhead
        points.push({
          x: x + (width * arrowHeadSize),
          y: y,  // At top edge
          type: 'arrowHeadSize'
        });
        // Tail width handle at the tail end, top edge
        points.push({
          x: x + width,
          y: y + (height * (1 - arrowTailWidth) / 2),
          type: 'arrowTailWidth'
        });
      } else if (shapeType === 'upArrow') {
        // Head size handle at the base of arrowhead
        points.push({
          x: x,  // At left edge
          y: y + (height * arrowHeadSize),
          type: 'arrowHeadSize'
        });
        // Tail width handle at the tail end, left edge
        points.push({
          x: x + (width * (1 - arrowTailWidth) / 2),
          y: y + height,
          type: 'arrowTailWidth'
        });
      } else if (shapeType === 'downArrow') {
        // Head size handle at the base of arrowhead
        points.push({
          x: x,  // At left edge
          y: y + height - (height * arrowHeadSize),
          type: 'arrowHeadSize'
        });
        // Tail width handle at the tail end, left edge
        points.push({
          x: x + (width * (1 - arrowTailWidth) / 2),
          y: y,
          type: 'arrowTailWidth'
        });
      }
      break;
    
    case 'doubleArrow':
    case 'upDownArrow':
      // Double arrow head size adjustment
      const doubleArrowHeadSize = adjustments.arrowHeadSize || 0.3;
      const doubleArrowTailWidth = adjustments.arrowTailWidth || 0.5;
      
      if (shapeType === 'doubleArrow') {
        // Horizontal double arrow
        // Head size handle at the base of left arrowhead, top edge
        points.push({
          x: x + width * doubleArrowHeadSize,
          y: y,  // At top edge
          type: 'arrowHeadSize'
        });
        // Tail width handle at the center, top edge of shaft
        points.push({
          x: x + width / 2,
          y: y + (height * (1 - doubleArrowTailWidth) / 2),
          type: 'arrowTailWidth'
        });
      } else {
        // Vertical double arrow (upDownArrow)
        // Head size handle at the base of top arrowhead, left edge
        points.push({
          x: x,  // At left edge
          y: y + height * doubleArrowHeadSize,
          type: 'arrowHeadSize'
        });
        // Tail width handle at the center, left edge of shaft
        points.push({
          x: x + (width * (1 - doubleArrowTailWidth) / 2),
          y: y + height / 2,
          type: 'arrowTailWidth'
        });
      }
      break;
    
    case 'quadArrow':
      // Quad arrow adjustments
      const quadArrowHeadSize = adjustments.arrowHeadSize || 0.3;
      const quadArrowCenterSize = adjustments.centerSize || 0.33;
      
      // Head size handle at the base of right arrowhead, top edge
      points.push({
        x: x + width - (width * quadArrowHeadSize),
        y: y,  // At top edge
        type: 'arrowHeadSize'
      });
      // Center size handle at the top-left corner of center box
      points.push({
        x: x + width / 2 - (width * quadArrowCenterSize / 2),
        y: y + height / 2 - (height * quadArrowCenterSize / 2),
        type: 'centerSize'
      });
      break;
    
    case 'bentArrow':
      // Bent arrow adjustments
      const bentArrowHeadSize = adjustments.arrowHeadSize || 0.3;
      const bentArrowBendPosition = adjustments.bendPosition || 0.5;
      const bentArrowTailWidth = adjustments.arrowTailWidth || 0.2;
      
      // Head size handle at the base of arrowhead
      points.push({
        x: x + width - (width * bentArrowHeadSize),
        y: y + height * 0.5,  // Middle of arrow head
        type: 'arrowHeadSize'
      });
      // Bend position handle at the top edge where the bend occurs
      points.push({
        x: x + width * bentArrowBendPosition,
        y: y,
        type: 'bendPosition'
      });
      // Tail width handle at the bottom-left corner
      points.push({
        x: x,
        y: y + height - (height * bentArrowTailWidth),
        type: 'arrowTailWidth'
      });
      break;
    
    case 'uTurnArrow':
      // U-turn arrow adjustments
      const uTurnArrowHeadSize = adjustments.arrowHeadSize || 0.2;
      const uTurnArrowWidth = adjustments.arrowWidth || 0.15;
      
      // Head size handle at the arrow tip area
      points.push({
        x: x + width - (width * uTurnArrowHeadSize * 2),
        y: y + height,  // At bottom edge
        type: 'arrowHeadSize'
      });
      // Arrow width handle at the left edge, bottom
      points.push({
        x: x + width * uTurnArrowWidth,
        y: y + height,
        type: 'arrowWidth'
      });
      break;

    case 'star4':
    case 'star5':
    case 'star6':
    case 'star8':
      // Inner radius adjustment
      const starInnerRadiusRatio = adjustments.innerRadiusRatio || 0.4;
      const starOuterRadius = Math.min(width, height) / 2;
      const starInnerRadius = starOuterRadius * starInnerRadiusRatio;
      points.push({
        x: x + width / 2 + starInnerRadius,
        y: y + height / 2,
        type: 'innerRadiusRatio'
      });
      break;

    case 'trapezoid':
      // Top width adjustment
      const topWidthRatio = adjustments.topWidthRatio || 0.6;
      points.push({
        x: x + width * (1 - topWidthRatio) / 2,
        y: y,
        type: 'topWidthRatio'
      });
      break;

    case 'parallelogram':
      // Skew adjustment
      const skewRatio = adjustments.skewRatio || 0.2;
      points.push({
        x: x + width * skewRatio,
        y: y,
        type: 'skewRatio'
      });
      break;

    case 'pie':
      // Start angle adjustment
      const startAngle = adjustments.startAngle || 0;
      const endAngle = adjustments.endAngle || 90;
      const pieInnerRadius = adjustments.innerRadius || 0;
      const radius = Math.min(width, height) / 2;
      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;
      const midAngleRad = ((startAngle + endAngle) / 2 * Math.PI) / 180;
      
      // Start angle handle
      points.push({
        x: x + width / 2 + Math.cos(startAngleRad) * radius,
        y: y + height / 2 + Math.sin(startAngleRad) * radius,
        type: 'startAngle'
      });
      
      // End angle handle
      points.push({
        x: x + width / 2 + Math.cos(endAngleRad) * radius,
        y: y + height / 2 + Math.sin(endAngleRad) * radius,
        type: 'endAngle'
      });
      
      // Inner radius handle (placed at the middle angle)
      // Always show the handle at the calculated position based on inner radius
      points.push({
        x: x + width / 2 + Math.cos(midAngleRad) * radius * pieInnerRadius,
        y: y + height / 2 + Math.sin(midAngleRad) * radius * pieInnerRadius,
        type: 'innerRadius'
      });
      break;

    case 'donut':
      // Inner radius adjustment
      const innerRadiusDonut = adjustments.innerRadius || 0.5;
      points.push({
        x: x + width / 2 + (Math.min(width, height) / 2) * innerRadiusDonut,
        y: y + height / 2,
        type: 'innerRadius'
      });
      break;

    case 'speechBubble':
    case 'thoughtBubble':
    case 'roundedRectCallout':
    case 'ovalCallout':
      // Tail position adjustment
      const tailPositionX = adjustments.tailPositionX || 0.3;
      const tailPositionY = adjustments.tailPositionY || 0.8;
      points.push({
        x: x + width * tailPositionX,
        y: y + height * tailPositionY,
        type: 'tailPosition'
      });
      break;

    case 'bentArrow':
    case 'uTurnArrow':
      // Bend adjustment
      const bendRatio = adjustments.bendRatio || 0.5;
      points.push({
        x: x + width * bendRatio,
        y: y + height / 2,
        type: 'bendRatio'
      });
      break;

    case 'plus':
    case 'minus':
      // Thickness adjustment for plus and minus signs
      const thickness = adjustments.thickness || 0.33;
      points.push({
        x: x + width * thickness,
        y: y + height / 2,
        type: 'thickness'
      });
      break;

    case 'heart':
      // Heart shape curvature adjustment
      const heartCurvature = adjustments.heartCurvature || 0.5;
      points.push({
        x: x + width * 0.25,
        y: y + height * (0.25 - heartCurvature * 0.15),
        type: 'heartCurvature'
      });
      break;

    case 'cloud':
      // Cloud puffiness adjustment
      const cloudPuffiness = adjustments.cloudPuffiness || 0.25;
      points.push({
        x: x + width * 0.3,
        y: y + height * (0.6 - cloudPuffiness),
        type: 'cloudPuffiness'
      });
      break;

    case 'sun':
      // Sun ray length adjustment
      const sunRayLength = adjustments.sunRayLength || 0.5;
      points.push({
        x: x + width / 2 + (width / 2) * (0.5 + sunRayLength * 0.5),
        y: y + height / 2,
        type: 'sunRayLength'
      });
      break;

    default:
      // No adjustment points for basic shapes
      break;
  }

  return points;
}

function getAdjustmentValue(
  shapeType: string,
  adjustmentType: string,
  pointerPos: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number },
  element?: any
): any {
  const { x, y, width, height } = bounds;
  const adjustments: any = {};

  switch (adjustmentType) {
    case 'cornerRadius':
      const maxCornerRadius = Math.min(width, height) / 2;
      adjustments.cornerRadius = Math.max(0, Math.min(maxCornerRadius, pointerPos.x - x));
      break;

    case 'topVertexRatio':
      // Allow the top vertex to move horizontally
      adjustments.topVertexRatio = Math.max(0, Math.min(1, (pointerPos.x - x) / width));
      break;

    case 'baseWidthRatio':
      // Allow adjusting the base width of the triangle
      adjustments.baseWidthRatio = Math.max(0.1, Math.min(1, (pointerPos.x - x) / width));
      break;

    case 'hypotenuseRatio':
      // Allow adjusting the hypotenuse position for right triangles
      adjustments.hypotenuseRatio = Math.max(0, Math.min(1, (pointerPos.x - x) / width));
      break;

    case 'rightAnglePosition':
      // Determine which corner the user is dragging to
      const relX = (pointerPos.x - x) / width;
      const relY = (pointerPos.y - y) / height;
      
      if (relX < 0.5 && relY < 0.5) {
        adjustments.rightAnglePosition = 'topLeft';
      } else if (relX >= 0.5 && relY < 0.5) {
        adjustments.rightAnglePosition = 'topRight';
      } else if (relX < 0.5 && relY >= 0.5) {
        adjustments.rightAnglePosition = 'bottomLeft';
      } else {
        adjustments.rightAnglePosition = 'bottomRight';
      }
      break;

    case 'diamondRatio':
      // Allow adjusting the diamond shape ratio
      adjustments.diamondRatio = Math.max(0.1, Math.min(0.9, (pointerPos.x - x) / width));
      break;


    case 'arrowHeadSize':
      let ratio;
      if (shapeType === 'rightArrow' || shapeType === 'arrow') {
        ratio = (width - (pointerPos.x - x)) / width;
      } else if (shapeType === 'leftArrow') {
        ratio = (pointerPos.x - x) / width;
      } else if (shapeType === 'doubleArrow') {
        ratio = (pointerPos.x - x) / width;
      } else if (shapeType === 'upArrow') {
        ratio = (pointerPos.y - y) / height;
      } else if (shapeType === 'downArrow') {
        ratio = (height - (pointerPos.y - y)) / height;
      } else if (shapeType === 'upDownArrow') {
        ratio = (pointerPos.y - y) / height;
      } else if (shapeType === 'quadArrow') {
        ratio = (width - (pointerPos.x - x)) / width;
      } else if (shapeType === 'bentArrow') {
        ratio = (width - (pointerPos.x - x)) / width;
      } else if (shapeType === 'uTurnArrow') {
        // Handle is at bottom, measuring from right edge
        ratio = (width - (pointerPos.x - x)) / (width * 2);  // Divide by 2 for proper scaling
      } else {
        ratio = 0.3;
      }
      adjustments.arrowHeadSize = Math.max(0.1, Math.min(0.8, ratio));
      break;

    case 'arrowTailWidth':
      let tailRatio;
      if (shapeType === 'rightArrow' || shapeType === 'leftArrow' || shapeType === 'arrow' || shapeType === 'doubleArrow') {
        tailRatio = 1 - (2 * Math.abs(pointerPos.y - (y + height / 2))) / height;
      } else {
        tailRatio = 1 - (2 * Math.abs(pointerPos.x - (x + width / 2))) / width;
      }
      adjustments.arrowTailWidth = Math.max(0.1, Math.min(1, tailRatio));
      break;
    
    case 'centerSize':
      // For quad arrow center size
      const centerDist = Math.sqrt(
        Math.pow(pointerPos.x - (x + width / 2), 2) + 
        Math.pow(pointerPos.y - (y + height / 2), 2)
      );
      const maxCenterDist = Math.min(width, height) / 2;
      adjustments.centerSize = Math.max(0.1, Math.min(0.5, centerDist / maxCenterDist));
      break;
    
    case 'bendPosition':
      // For bent arrow bend position
      adjustments.bendPosition = Math.max(0.3, Math.min(0.7, (pointerPos.x - x) / width));
      break;
    
    case 'arrowWidth':
      // For u-turn arrow width
      adjustments.arrowWidth = Math.max(0.1, Math.min(0.3, (pointerPos.x - x) / width));
      break;

    case 'hexCornerCut':
      // Control the corner cut based on horizontal position of the handle
      // Handle moves with the cut amount (left edge = 0, center = 0.5)
      const cutRatio = Math.max(0, Math.min(0.5, (pointerPos.x - x) / width));
      adjustments.hexCornerCut = cutRatio;
      break;
    
    case 'octCornerCut':
      // Control the corner cut based on horizontal position of the handle
      // Handle moves with the cut amount (left edge = 0, center = 0.5)
      const octCutRatio = Math.max(0, Math.min(0.5, (pointerPos.x - x) / width));
      adjustments.octCornerCut = octCutRatio;
      break;
    
    case 'innerRadiusRatio':
      const starOuterRadius = Math.min(width, height) / 2;
      const distance = Math.sqrt(
        Math.pow(pointerPos.x - (x + width / 2), 2) + 
        Math.pow(pointerPos.y - (y + height / 2), 2)
      );
      adjustments.innerRadiusRatio = Math.max(0.1, Math.min(0.9, distance / starOuterRadius));
      break;

    case 'topWidthRatio':
      const distanceFromLeft = pointerPos.x - x;
      adjustments.topWidthRatio = Math.max(0.1, Math.min(0.9, 1 - (2 * distanceFromLeft) / width));
      break;

    case 'skewRatio':
      adjustments.skewRatio = Math.max(0, Math.min(0.5, (pointerPos.x - x) / width));
      break;

    case 'startAngle':
      const startCenterX = x + width / 2;
      const startCenterY = y + height / 2;
      let newStartAngle = Math.atan2(pointerPos.y - startCenterY, pointerPos.x - startCenterX) * 180 / Math.PI;
      adjustments.startAngle = newStartAngle;
      // Keep the end angle from existing adjustments if it exists
      if (element.adjustments?.endAngle !== undefined) {
        adjustments.endAngle = element.adjustments.endAngle;
      }
      break;

    case 'endAngle':
      const endCenterX = x + width / 2;
      const endCenterY = y + height / 2;
      let newEndAngle = Math.atan2(pointerPos.y - endCenterY, pointerPos.x - endCenterX) * 180 / Math.PI;
      adjustments.endAngle = newEndAngle;
      // Keep the start angle from existing adjustments if it exists
      if (element.adjustments?.startAngle !== undefined) {
        adjustments.startAngle = element.adjustments.startAngle;
      }
      break;

    case 'innerRadius':
      const centerX3 = x + width / 2;
      const centerY3 = y + height / 2;
      const dist = Math.sqrt(Math.pow(pointerPos.x - centerX3, 2) + Math.pow(pointerPos.y - centerY3, 2));
      const donutMaxRadius = Math.min(width, height) / 2;
      let innerRadiusRatio = dist / donutMaxRadius;
      
      // Snap to 0 if very close to center
      if (innerRadiusRatio < 0.05) {
        innerRadiusRatio = 0;
      }
      
      adjustments.innerRadius = Math.max(0, Math.min(0.95, innerRadiusRatio));
      
      // Preserve other angle adjustments for pie shape
      if (shapeType === 'pie') {
        if (element?.adjustments?.startAngle !== undefined) {
          adjustments.startAngle = element.adjustments.startAngle;
        }
        if (element?.adjustments?.endAngle !== undefined) {
          adjustments.endAngle = element.adjustments.endAngle;
        }
      }
      break;

    case 'tailPosition':
      adjustments.tailPositionX = Math.max(0.1, Math.min(0.9, (pointerPos.x - x) / width));
      adjustments.tailPositionY = Math.max(0.5, Math.min(1, (pointerPos.y - y) / height));
      break;

    case 'bendRatio':
      adjustments.bendRatio = Math.max(0.2, Math.min(0.8, (pointerPos.x - x) / width));
      break;

    case 'thickness':
      // Adjust thickness for plus/minus signs
      adjustments.thickness = Math.max(0.1, Math.min(0.5, (pointerPos.x - x) / width));
      break;

    case 'heartCurvature':
      // Adjust heart shape curvature
      const heartY = (pointerPos.y - y) / height;
      adjustments.heartCurvature = Math.max(0.2, Math.min(0.8, 1 - heartY * 2));
      break;

    case 'cloudPuffiness':
      // Adjust cloud puffiness/bubble size
      const cloudY = (pointerPos.y - y) / height;
      adjustments.cloudPuffiness = Math.max(0.15, Math.min(0.35, 0.6 - cloudY));
      break;

    case 'sunRayLength':
      // Adjust sun ray length
      const sunDistance = Math.sqrt(
        Math.pow(pointerPos.x - (x + width / 2), 2) + 
        Math.pow(pointerPos.y - (y + height / 2), 2)
      );
      const sunMaxRadius = Math.min(width, height) / 2;
      adjustments.sunRayLength = Math.max(0.3, Math.min(1, (sunDistance - sunMaxRadius * 0.5) / (sunMaxRadius * 0.5)));
      break;

    default:
      break;
  }

  return adjustments;
}

export default AdjustmentHandles;