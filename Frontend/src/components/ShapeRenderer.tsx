import React from 'react';
import { Shape, Path, RegularPolygon, Star, Arrow, Ring, Wedge, Arc, Rect, Circle, Ellipse, Line } from 'react-konva';
import { ShapeElement } from '../types';

interface ShapeRendererProps {
  element: ShapeElement;
  isSelected?: boolean;
  isDraggable?: boolean;
  onClick?: (e: any) => void;
  onDragMove?: (e: any) => void;
  onDragEnd?: (e: any) => void;
  onTransformEnd?: (e: any) => void;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({
  element,
  isSelected = false,
  isDraggable = true,
  onClick,
  onDragMove,
  onDragEnd,
  onTransformEnd,
}) => {
  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 100;
  const height = element.height || 100;
  const fill = (element as any).fill || element.fillColor || '#4285f4';
  const stroke = isSelected ? '#0066FF' : ((element as any).stroke || element.strokeColor || '#333333');
  const strokeWidth = isSelected ? 3 : (element.strokeWidth || 2);
  const rotation = element.rotation || 0;
  const opacity = element.opacity || 1;
  const adjustments = element.adjustments || {};

  // Common props for all shapes
  const commonProps = {
    id: element.id,
    x,
    y,
    fill,
    stroke,
    strokeWidth,
    rotation,
    opacity,
    draggable: isDraggable,
    onClick,
    onDragMove,
    onDragEnd,
    onTransformEnd,
  };

  // Render based on shape type
  switch (element.shapeType) {
    // Basic Rectangle
    case 'rectangle':
    case 'flowchartProcess':
    case 'flowchartCard':
      return (
        <Rect
          {...commonProps}
          width={width}
          height={height}
          cornerRadius={0}
        />
      );

    // Rounded Rectangle
    case 'roundedRectangle':
    case 'flowchartAlternateProcess':
    case 'flowchartTerminator':
      const cornerRadius = adjustments.cornerRadius !== undefined ? adjustments.cornerRadius : Math.min(width, height) * 0.1;
      return (
        <Rect
          {...commonProps}
          width={width}
          height={height}
          cornerRadius={cornerRadius}
        />
      );

    // Circle
    case 'circle':
    case 'flowchartConnector':
    case 'flowchartSummingJunction':
    case 'flowchartOr':
      const radius = Math.min(width, height) / 2;
      return (
        <Circle
          {...commonProps}
          x={x + radius}
          y={y + radius}
          radius={radius}
        />
      );

    // Ellipse
    case 'ellipse':
    case 'flowchartTerminator':
      return (
        <Ellipse
          {...commonProps}
          x={x + width / 2}
          y={y + height / 2}
          radiusX={width / 2}
          radiusY={height / 2}
        />
      );

    // Triangle
    case 'triangle':
      const topVertexRatio = adjustments.topVertexRatio !== undefined ? adjustments.topVertexRatio : 0.5;
      const baseWidthRatio = adjustments.baseWidthRatio !== undefined ? adjustments.baseWidthRatio : 1;
      const baseOffset = (1 - baseWidthRatio) * width / 2;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.moveTo(width * topVertexRatio, 0);
            context.lineTo(width - baseOffset, height);
            context.lineTo(baseOffset, height);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Right Triangle
    case 'rightTriangle':
      const hypotenuseRatio = adjustments.hypotenuseRatio !== undefined ? adjustments.hypotenuseRatio : 1;
      const rightAnglePosition = adjustments.rightAnglePosition || 'bottomLeft';
      
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            
            if (rightAnglePosition === 'bottomLeft') {
              // Right angle at bottom-left
              context.moveTo(0, 0);  // Top left
              context.lineTo(width, height);  // Bottom right
              context.lineTo(0, height);  // Bottom left (right angle)
            } else if (rightAnglePosition === 'bottomRight') {
              // Right angle at bottom-right
              context.moveTo(0, height);  // Bottom left
              context.lineTo(width, 0);  // Top right
              context.lineTo(width, height);  // Bottom right (right angle)
            } else if (rightAnglePosition === 'topLeft') {
              // Right angle at top-left
              context.moveTo(0, 0);  // Top left (right angle)
              context.lineTo(width, 0);  // Top right
              context.lineTo(width, height);  // Bottom right
            } else {
              // Right angle at top-right (default)
              context.moveTo(0, 0);  // Top left
              context.lineTo(width, 0);  // Top right (right angle)
              context.lineTo(0, height);  // Bottom left
            }
            
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Diamond
    case 'diamond':
    case 'flowchartDecision':
      const diamondRatio = adjustments.diamondRatio !== undefined ? adjustments.diamondRatio : 0.5;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.moveTo(width * diamondRatio, 0);
            context.lineTo(width, height / 2);
            context.lineTo(width * diamondRatio, height);
            context.lineTo(0, height / 2);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Pentagon - always render as regular polygon (no adjustments)
    case 'pentagon':
      return (
        <RegularPolygon
          {...commonProps}
          x={x + width / 2}
          y={y + height / 2}
          sides={5}
          radius={Math.min(width, height) / 2}
        />
      );

    // Hexagon
    case 'hexagon':
    case 'flowchartPreparation':
      const hexCornerCut = adjustments.hexCornerCut !== undefined ? adjustments.hexCornerCut : 0.15;  // Default to 15% cut
      
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            
            if (hexCornerCut > 0) {
              // Hexagon with corner cuts (like PowerPoint)
              const cutWidth = width * hexCornerCut;
              
              // Start from top-left corner (after cut)
              context.moveTo(cutWidth, 0);
              // Top edge
              context.lineTo(width - cutWidth, 0);
              // Top-right cut
              context.lineTo(width, height * 0.25);
              // Right edge
              context.lineTo(width, height * 0.75);
              // Bottom-right cut
              context.lineTo(width - cutWidth, height);
              // Bottom edge
              context.lineTo(cutWidth, height);
              // Bottom-left cut
              context.lineTo(0, height * 0.75);
              // Left edge
              context.lineTo(0, height * 0.25);
              // Close with top-left cut
              context.closePath();
            } else {
              // Regular hexagon
              const centerX = width / 2;
              const centerY = height / 2;
              const radius = Math.min(width, height) / 2;
              
              for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
                const px = centerX + Math.cos(angle) * radius;
                const py = centerY + Math.sin(angle) * radius;
                
                if (i === 0) {
                  context.moveTo(px, py);
                } else {
                  context.lineTo(px, py);
                }
              }
              context.closePath();
            }
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Octagon
    case 'octagon':
      const octCornerCut = adjustments.octCornerCut !== undefined ? adjustments.octCornerCut : 0.29;  // Default to 29% cut (PowerPoint default)
      
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            
            if (octCornerCut > 0) {
              // Octagon with corner cuts (like PowerPoint)
              const cutWidth = width * octCornerCut;
              const cutHeight = height * octCornerCut;
              
              // Start from top-left corner (after cut)
              context.moveTo(cutWidth, 0);
              // Top edge
              context.lineTo(width - cutWidth, 0);
              // Top-right cut
              context.lineTo(width, cutHeight);
              // Right edge (upper)
              context.lineTo(width, height - cutHeight);
              // Bottom-right cut
              context.lineTo(width - cutWidth, height);
              // Bottom edge
              context.lineTo(cutWidth, height);
              // Bottom-left cut
              context.lineTo(0, height - cutHeight);
              // Left edge
              context.lineTo(0, cutHeight);
              // Close with top-left cut
              context.closePath();
            } else {
              // Regular octagon
              const centerX = width / 2;
              const centerY = height / 2;
              const radius = Math.min(width, height) / 2;
              
              for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI * 2) / 8 - Math.PI / 8;
                const px = centerX + Math.cos(angle) * radius;
                const py = centerY + Math.sin(angle) * radius;
                
                if (i === 0) {
                  context.moveTo(px, py);
                } else {
                  context.lineTo(px, py);
                }
              }
              context.closePath();
            }
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Trapezoid
    case 'trapezoid':
    case 'flowchartManualOperation':
      const topWidthRatio = adjustments.topWidthRatio !== undefined ? adjustments.topWidthRatio : 0.6;
      const sideTrim = (1 - topWidthRatio) / 2;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.moveTo(width * sideTrim, 0);
            context.lineTo(width * (1 - sideTrim), 0);
            context.lineTo(width, height);
            context.lineTo(0, height);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Parallelogram
    case 'parallelogram':
    case 'flowchartData':
      const skewRatio = adjustments.skewRatio !== undefined ? adjustments.skewRatio : 0.2;
      const skew = width * skewRatio;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.moveTo(skew, 0);
            context.lineTo(width, 0);
            context.lineTo(width - skew, height);
            context.lineTo(0, height);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Star shapes
    case 'star4':
      return (
        <Star
          {...commonProps}
          x={x + width / 2}
          y={y + height / 2}
          numPoints={element.starPoints || 4}
          innerRadius={Math.min(width, height) * (element.innerRadiusRatio || 0.5) / 2}
          outerRadius={Math.min(width, height) / 2}
        />
      );

    case 'star5':
      const star5InnerRatio = adjustments.innerRadiusRatio !== undefined ? adjustments.innerRadiusRatio : (element.innerRadiusRatio || 0.4);
      return (
        <Star
          {...commonProps}
          x={x + width / 2}
          y={y + height / 2}
          numPoints={element.starPoints || 5}
          innerRadius={Math.min(width, height) * star5InnerRatio / 2}
          outerRadius={Math.min(width, height) / 2}
        />
      );

    case 'star6':
      return (
        <Star
          {...commonProps}
          x={x + width / 2}
          y={y + height / 2}
          numPoints={element.starPoints || 6}
          innerRadius={Math.min(width, height) * (element.innerRadiusRatio || 0.5) / 2}
          outerRadius={Math.min(width, height) / 2}
        />
      );
      
    case 'star8':
      return (
        <Star
          {...commonProps}
          x={x + width / 2}
          y={y + height / 2}
          numPoints={element.starPoints || 8}
          innerRadius={Math.min(width, height) * (element.innerRadiusRatio || 0.5) / 2}
          outerRadius={Math.min(width, height) / 2}
        />
      );

    // Heart shape
    case 'heart':
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const w = width;
            const h = height;
            context.beginPath();
            context.moveTo(w / 2, h / 4);
            context.bezierCurveTo(w / 2, h / 8, w / 8, h / 8, w / 8, h / 4);
            context.bezierCurveTo(w / 8, h / 2, w / 2, h * 0.75, w / 2, h);
            context.bezierCurveTo(w / 2, h * 0.75, w * 7 / 8, h / 2, w * 7 / 8, h / 4);
            context.bezierCurveTo(w * 7 / 8, h / 8, w / 2, h / 8, w / 2, h / 4);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Plus sign
    case 'plus':
      const plusThickness = adjustments.thickness !== undefined ? 
        adjustments.thickness * Math.min(width, height) : 
        Math.min(width, height) / 3;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            // Vertical bar
            context.rect((width - plusThickness) / 2, 0, plusThickness, height);
            // Horizontal bar
            context.rect(0, (height - plusThickness) / 2, width, plusThickness);
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Arrow shapes
    case 'arrow':
    case 'rightArrow':
      const rightArrowHeadSize = adjustments.arrowHeadSize || 0.4;
      const rightArrowTailWidth = adjustments.arrowTailWidth || 0.5;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const arrowHeadLength = width * rightArrowHeadSize;
            const tailHeight = height * rightArrowTailWidth;
            const tailY = (height - tailHeight) / 2;
            
            context.beginPath();
            // Tail
            context.moveTo(0, tailY);
            context.lineTo(width - arrowHeadLength, tailY);
            // Arrow head top
            context.lineTo(width - arrowHeadLength, 0);
            context.lineTo(width, height / 2);
            // Arrow head bottom
            context.lineTo(width - arrowHeadLength, height);
            context.lineTo(width - arrowHeadLength, tailY + tailHeight);
            // Tail bottom
            context.lineTo(0, tailY + tailHeight);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    case 'leftArrow':
      const leftArrowHeadSize = adjustments.arrowHeadSize || 0.4;
      const leftArrowTailWidth = adjustments.arrowTailWidth || 0.5;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const arrowHeadLength = width * leftArrowHeadSize;
            const tailHeight = height * leftArrowTailWidth;
            const tailY = (height - tailHeight) / 2;
            
            context.beginPath();
            // Tail
            context.moveTo(width, tailY);
            context.lineTo(arrowHeadLength, tailY);
            // Arrow head top
            context.lineTo(arrowHeadLength, 0);
            context.lineTo(0, height / 2);
            // Arrow head bottom
            context.lineTo(arrowHeadLength, height);
            context.lineTo(arrowHeadLength, tailY + tailHeight);
            // Tail bottom
            context.lineTo(width, tailY + tailHeight);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    case 'upArrow':
      const upArrowHeadSize = adjustments.arrowHeadSize || 0.4;
      const upArrowTailWidth = adjustments.arrowTailWidth || 0.5;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const arrowHeadLength = height * upArrowHeadSize;
            const tailWidth = width * upArrowTailWidth;
            const tailX = (width - tailWidth) / 2;
            
            context.beginPath();
            // Tail
            context.moveTo(tailX, height);
            context.lineTo(tailX, arrowHeadLength);
            // Arrow head left
            context.lineTo(0, arrowHeadLength);
            context.lineTo(width / 2, 0);
            // Arrow head right
            context.lineTo(width, arrowHeadLength);
            context.lineTo(tailX + tailWidth, arrowHeadLength);
            // Tail right
            context.lineTo(tailX + tailWidth, height);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    case 'downArrow':
      const downArrowHeadSize = adjustments.arrowHeadSize || 0.4;
      const downArrowTailWidth = adjustments.arrowTailWidth || 0.5;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const arrowHeadLength = height * downArrowHeadSize;
            const tailWidth = width * downArrowTailWidth;
            const tailX = (width - tailWidth) / 2;
            
            context.beginPath();
            // Tail
            context.moveTo(tailX, 0);
            context.lineTo(tailX, height - arrowHeadLength);
            // Arrow head left
            context.lineTo(0, height - arrowHeadLength);
            context.lineTo(width / 2, height);
            // Arrow head right
            context.lineTo(width, height - arrowHeadLength);
            context.lineTo(tailX + tailWidth, height - arrowHeadLength);
            // Tail right
            context.lineTo(tailX + tailWidth, 0);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    case 'quadArrow':
      const quadArrowHeadSize = adjustments.arrowHeadSize || 0.3;
      const quadArrowCenterSize = adjustments.centerSize || 0.33;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const centerX = width / 2;
            const centerY = height / 2;
            const arrowSize = Math.min(width, height) * quadArrowHeadSize;
            const centerBoxSize = Math.min(width, height) * quadArrowCenterSize;
            
            context.beginPath();
            // Center square
            context.rect(centerX - centerBoxSize/2, centerY - centerBoxSize/2, centerBoxSize, centerBoxSize);
            
            // Top arrow
            context.moveTo(centerX, 0);
            context.lineTo(centerX + arrowSize/2, arrowSize/2);
            context.lineTo(centerX + arrowSize/3, arrowSize/2);
            context.lineTo(centerX + arrowSize/3, centerY - arrowSize/3);
            context.lineTo(centerX - arrowSize/3, centerY - arrowSize/3);
            context.lineTo(centerX - arrowSize/3, arrowSize/2);
            context.lineTo(centerX - arrowSize/2, arrowSize/2);
            context.closePath();
            
            // Right arrow
            context.moveTo(width, centerY);
            context.lineTo(width - arrowSize/2, centerY + arrowSize/2);
            context.lineTo(width - arrowSize/2, centerY + arrowSize/3);
            context.lineTo(centerX + arrowSize/3, centerY + arrowSize/3);
            context.lineTo(centerX + arrowSize/3, centerY - arrowSize/3);
            context.lineTo(width - arrowSize/2, centerY - arrowSize/3);
            context.lineTo(width - arrowSize/2, centerY - arrowSize/2);
            context.closePath();
            
            // Bottom arrow
            context.moveTo(centerX, height);
            context.lineTo(centerX + arrowSize/2, height - arrowSize/2);
            context.lineTo(centerX + arrowSize/3, height - arrowSize/2);
            context.lineTo(centerX + arrowSize/3, centerY + arrowSize/3);
            context.lineTo(centerX - arrowSize/3, centerY + arrowSize/3);
            context.lineTo(centerX - arrowSize/3, height - arrowSize/2);
            context.lineTo(centerX - arrowSize/2, height - arrowSize/2);
            context.closePath();
            
            // Left arrow
            context.moveTo(0, centerY);
            context.lineTo(arrowSize/2, centerY + arrowSize/2);
            context.lineTo(arrowSize/2, centerY + arrowSize/3);
            context.lineTo(centerX - arrowSize/3, centerY + arrowSize/3);
            context.lineTo(centerX - arrowSize/3, centerY - arrowSize/3);
            context.lineTo(arrowSize/2, centerY - arrowSize/3);
            context.lineTo(arrowSize/2, centerY - arrowSize/2);
            context.closePath();
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    case 'bentArrow':
      const bentArrowHeadSize = adjustments.arrowHeadSize || 0.3;
      const bentArrowBendPosition = adjustments.bendPosition || 0.5;
      const bentArrowTailWidth = adjustments.arrowTailWidth || 0.2;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const thickness = height * bentArrowTailWidth;
            const arrowWidth = width * bentArrowHeadSize;
            const bendX = width * bentArrowBendPosition;
            
            context.beginPath();
            // Start from bottom left
            context.moveTo(0, height);
            context.lineTo(0, thickness);
            // Go right
            context.lineTo(bendX, thickness);
            // Arrow head top
            context.lineTo(width - arrowWidth, 0);
            context.lineTo(width, height * 0.5);
            context.lineTo(width - arrowWidth, height);
            // Continue horizontal to arrow base
            context.lineTo(width - arrowWidth, thickness);
            // Arrow shaft continues down
            context.lineTo(width - arrowWidth, height - thickness);
            // Go left along bottom
            context.lineTo(bendX, height - thickness);
            context.lineTo(bendX, height - thickness);
            context.lineTo(thickness, height - thickness);
            context.lineTo(thickness, height);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    case 'uTurnArrow':
      const uTurnArrowHeadSize = adjustments.arrowHeadSize || 0.2;
      const uTurnArrowWidth = adjustments.arrowWidth || 0.15;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const thickness = Math.min(width, height) * uTurnArrowWidth;
            const radius = (width - thickness * 2) / 2;
            const centerX = width / 2;
            const centerY = radius + thickness;
            
            context.beginPath();
            // Left vertical line (outer)
            context.moveTo(thickness, height);
            context.lineTo(thickness, centerY);
            // Top curve (outer)
            context.arc(centerX, centerY, radius, Math.PI, 0, false);
            // Right vertical line down to arrow
            const arrowStartY = height * (1 - uTurnArrowHeadSize);
            context.lineTo(width - thickness, arrowStartY);
            // Arrow head
            context.lineTo(width - thickness * 2, arrowStartY - thickness);
            context.lineTo(width, arrowStartY + thickness);
            context.lineTo(width - thickness * 2, height);
            // Back to inner path
            context.lineTo(width - thickness * 2, arrowStartY);
            context.lineTo(width - thickness * 2, centerY);
            // Inner curve
            context.arc(centerX, centerY, radius - thickness, 0, Math.PI, true);
            // Left inner line
            context.lineTo(thickness * 2, height);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    case 'doubleArrow':
    case 'upDownArrow':
      const doubleArrowHeadSize = adjustments.arrowHeadSize || 0.3;
      const doubleArrowTailWidth = adjustments.arrowTailWidth || 0.5;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const isHorizontal = element.shapeType === 'doubleArrow';
            
            if (isHorizontal) {
              // Horizontal double arrow
              const arrowHeadLength = width * doubleArrowHeadSize;
              const tailHeight = height * doubleArrowTailWidth;
              const tailY = (height - tailHeight) / 2;
              
              context.beginPath();
              // Left arrow head
              context.moveTo(0, height / 2);
              context.lineTo(arrowHeadLength, 0);
              context.lineTo(arrowHeadLength, tailY);
              // Top of shaft
              context.lineTo(width - arrowHeadLength, tailY);
              // Right arrow head top
              context.lineTo(width - arrowHeadLength, 0);
              context.lineTo(width, height / 2);
              // Right arrow head bottom
              context.lineTo(width - arrowHeadLength, height);
              context.lineTo(width - arrowHeadLength, tailY + tailHeight);
              // Bottom of shaft
              context.lineTo(arrowHeadLength, tailY + tailHeight);
              // Left arrow head bottom
              context.lineTo(arrowHeadLength, height);
              context.closePath();
            } else {
              // Vertical double arrow
              const arrowHeadLength = height * doubleArrowHeadSize;
              const tailWidth = width * doubleArrowTailWidth;
              const tailX = (width - tailWidth) / 2;
              
              context.beginPath();
              // Top arrow head
              context.moveTo(width / 2, 0);
              context.lineTo(width, arrowHeadLength);
              context.lineTo(tailX + tailWidth, arrowHeadLength);
              // Right side of shaft
              context.lineTo(tailX + tailWidth, height - arrowHeadLength);
              // Bottom arrow head right
              context.lineTo(width, height - arrowHeadLength);
              context.lineTo(width / 2, height);
              // Bottom arrow head left
              context.lineTo(0, height - arrowHeadLength);
              context.lineTo(tailX, height - arrowHeadLength);
              // Left side of shaft
              context.lineTo(tailX, arrowHeadLength);
              // Top arrow head left
              context.lineTo(0, arrowHeadLength);
              context.closePath();
            }
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Donut shape
    case 'donut':
      const donutInnerRadius = adjustments.innerRadius !== undefined ? 
        adjustments.innerRadius * Math.min(width, height) / 2 : 
        Math.min(width, height) / 4;
      return (
        <Ring
          {...commonProps}
          x={x + width / 2}
          y={y + height / 2}
          innerRadius={donutInnerRadius}
          outerRadius={Math.min(width, height) / 2}
        />
      );

    // Pie/Arc shapes
    case 'pie':
      const pieStartAngle = adjustments.startAngle !== undefined ? adjustments.startAngle : (element.startAngle || 0);
      const pieEndAngle = adjustments.endAngle !== undefined ? adjustments.endAngle : (element.endAngle || 90);
      const pieInnerRadius = adjustments.innerRadius !== undefined ? adjustments.innerRadius : 0;
      
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const centerX = width / 2;
            const centerY = height / 2;
            const outerRadius = Math.min(width, height) / 2;
            const innerRadiusPixels = outerRadius * pieInnerRadius;
            
            // Convert angles to radians
            const startRad = (pieStartAngle * Math.PI) / 180;
            const endRad = (pieEndAngle * Math.PI) / 180;
            
            context.beginPath();
            
            if (pieInnerRadius > 0) {
              // Draw arc with inner radius (donut segment)
              context.arc(centerX, centerY, outerRadius, startRad, endRad, false);
              context.arc(centerX, centerY, innerRadiusPixels, endRad, startRad, true);
              context.closePath();
            } else {
              // Draw regular pie slice
              context.moveTo(centerX, centerY);
              context.arc(centerX, centerY, outerRadius, startRad, endRad, false);
              context.closePath();
            }
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    case 'arc':
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2;
            const startAngle = (element.startAngle || 0) * Math.PI / 180;
            const endAngle = (element.endAngle || 90) * Math.PI / 180;
            
            context.beginPath();
            context.arc(centerX, centerY, radius, startAngle, endAngle);
            context.strokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Cloud shape
    case 'cloud':
      const cloudPuffiness = adjustments.cloudPuffiness !== undefined ? adjustments.cloudPuffiness : 0.25;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const w = width;
            const h = height;
            context.beginPath();
            // Draw cloud shape with adjustable puffiness
            context.arc(w * 0.3, h * 0.6, h * cloudPuffiness, 0, Math.PI * 2);
            context.arc(w * 0.5, h * 0.5, h * (cloudPuffiness + 0.05), 0, Math.PI * 2);
            context.arc(w * 0.7, h * 0.6, h * cloudPuffiness, 0, Math.PI * 2);
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Sun shape
    case 'sun':
      const sunRayLength = adjustments.sunRayLength !== undefined ? adjustments.sunRayLength : 0.5;
      const sunInnerRadius = Math.min(width, height) / 4;
      const sunOuterRadius = sunInnerRadius + (Math.min(width, height) / 4) * sunRayLength;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const centerX = width / 2;
            const centerY = height / 2;
            const numRays = 12;
            
            context.beginPath();
            for (let i = 0; i < numRays * 2; i++) {
              const angle = (i * Math.PI) / numRays;
              const radius = i % 2 === 0 ? sunOuterRadius : sunInnerRadius;
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              if (i === 0) {
                context.moveTo(x, y);
              } else {
                context.lineTo(x, y);
              }
            }
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Moon shape
    case 'moon':
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const centerX = width / 2;
            const centerY = height / 2;
            const minSize = Math.min(width, height);
            const radius = Math.max(8, (minSize - Math.max(2, strokeWidth)) / 2);
            
            // Simple crescent moon using path
            const moonRadius = radius * 0.8;
            const cutoutRadius = radius * 0.6;
            const cutoutOffsetX = radius * 0.3;
            
            context.beginPath();
            
            // Draw outer circle (full moon)
            context.arc(centerX, centerY, moonRadius, 0, Math.PI * 2, false);
            
            // Cut out inner circle to create crescent (use opposite winding)
            context.moveTo(centerX + cutoutOffsetX + cutoutRadius, centerY);
            context.arc(centerX + cutoutOffsetX, centerY, cutoutRadius, 0, Math.PI * 2, true);
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Smiley face
    case 'smileyFace':
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const centerX = width / 2;
            const centerY = height / 2;
            const minSize = Math.min(width, height);
            const radius = Math.max(5, minSize / 2 - Math.max(1, strokeWidth));
            
            if (radius <= 0) {
              // Fallback to simple circle if too small
              context.beginPath();
              context.arc(centerX, centerY, Math.max(2, minSize / 4), 0, Math.PI * 2);
              context.fillStrokeShape(shape);
              return;
            }
            
            context.beginPath();
            // Face circle
            context.arc(centerX, centerY, radius, 0, Math.PI * 2);
            context.fillStrokeShape(shape);
            
            // Only draw details if radius is large enough
            if (radius > 10) {
              // Eyes
              context.fillStyle = stroke;
              const eyeRadius = Math.max(1, radius * 0.1);
              context.beginPath();
              context.arc(centerX - radius * 0.3, centerY - radius * 0.2, eyeRadius, 0, Math.PI * 2);
              context.fill();
              context.beginPath();
              context.arc(centerX + radius * 0.3, centerY - radius * 0.2, eyeRadius, 0, Math.PI * 2);
              context.fill();
              
              // Smile
              const smileRadius = Math.max(2, radius * 0.5);
              context.beginPath();
              context.arc(centerX, centerY + radius * 0.1, smileRadius, 0, Math.PI);
              context.lineWidth = Math.max(1, strokeWidth);
              context.strokeStyle = stroke;
              context.stroke();
            }
          }}
          width={width}
          height={height}
        />
      );

    // Minus sign
    case 'minus':
      const minusThickness = adjustments.thickness !== undefined ? 
        adjustments.thickness * Math.min(width, height) : 
        Math.min(width, height) / 6;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.rect(0, (height - minusThickness) / 2, width, minusThickness);
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Multiply sign
    case 'multiply':
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const thickness = Math.min(width, height) / 10;
            const centerX = width / 2;
            const centerY = height / 2;
            const halfLength = Math.min(width, height) * 0.4;
            
            // Rotate 45 degrees for X shape
            context.save();
            context.translate(centerX, centerY);
            context.rotate(Math.PI / 4);
            
            context.beginPath();
            // Vertical bar
            context.rect(-thickness / 2, -halfLength, thickness, halfLength * 2);
            // Horizontal bar
            context.rect(-halfLength, -thickness / 2, halfLength * 2, thickness);
            context.restore();
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Divide sign
    case 'divide':
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const lineThickness = Math.min(width, height) / 12;
            const dotRadius = Math.min(width, height) / 16;
            const centerX = width / 2;
            const centerY = height / 2;
            
            context.beginPath();
            // Top dot
            context.moveTo(centerX + dotRadius, height * 0.25);
            context.arc(centerX, height * 0.25, dotRadius, 0, Math.PI * 2);
            // Horizontal line
            context.moveTo(width * 0.1, centerY - lineThickness / 2);
            context.rect(width * 0.1, centerY - lineThickness / 2, width * 0.8, lineThickness);
            // Bottom dot
            context.moveTo(centerX + dotRadius, height * 0.75);
            context.arc(centerX, height * 0.75, dotRadius, 0, Math.PI * 2);
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Equal sign
    case 'equal':
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const thickness = Math.min(width, height) / 8;
            const gap = thickness;
            
            context.beginPath();
            // Top line
            context.rect(width * 0.1, height / 2 - gap - thickness, width * 0.8, thickness);
            // Bottom line
            context.rect(width * 0.1, height / 2 + gap, width * 0.8, thickness);
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Lightning bolt
    case 'lightningBolt':
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.moveTo(width * 0.6, 0);
            context.lineTo(width * 0.2, height * 0.5);
            context.lineTo(width * 0.4, height * 0.5);
            context.lineTo(width * 0.3, height);
            context.lineTo(width * 0.7, height * 0.4);
            context.lineTo(width * 0.5, height * 0.4);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Speech bubble callout
    case 'speechBubble':
      const speechTailX = adjustments.tailPositionX || 0.3;
      const speechTailY = adjustments.tailPositionY || 0.8;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const bubbleHeight = height * 0.75;
            const cornerRadius = Math.min(width, height) * 0.1;
            
            context.beginPath();
            
            // Main bubble using manual rounded rectangle
            const x = 0;
            const y = 0;
            const w = width;
            const h = bubbleHeight;
            const r = cornerRadius;
            
            // Draw rounded rectangle manually
            context.moveTo(x + r, y);
            context.lineTo(x + w - r, y);
            context.quadraticCurveTo(x + w, y, x + w, y + r);
            context.lineTo(x + w, y + h - r);
            context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            
            // Adjust the bottom line to connect with tail
            const tailStartX = width * Math.max(0.1, Math.min(0.9, speechTailX - 0.1));
            const tailEndX = width * Math.max(0.1, Math.min(0.9, speechTailX + 0.1));
            
            context.lineTo(tailEndX, y + h);
            // Add tail pointing to the specified position
            context.lineTo(width * speechTailX, height * speechTailY);
            context.lineTo(tailStartX, y + h);
            
            context.lineTo(x + r, y + h);
            context.quadraticCurveTo(x, y + h, x, y + h - r);
            context.lineTo(x, y + r);
            context.quadraticCurveTo(x, y, x + r, y);
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Thought bubble callout
    case 'thoughtBubble':
      const thoughtTailX = adjustments.tailPositionX || 0.3;
      const thoughtTailY = adjustments.tailPositionY || 0.8;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const bubbleHeight = height * 0.65;
            const mainRadius = Math.min(width, bubbleHeight) / 2;
            const centerX = width / 2;
            const centerY = bubbleHeight / 2;
            
            context.beginPath();
            // Main thought bubble (large circle)
            context.arc(centerX, centerY, mainRadius, 0, Math.PI * 2);
            
            // Small trailing bubbles positioned based on adjustment
            const smallBubble1Radius = Math.max(2, width * 0.08);
            const smallBubble2Radius = Math.max(1, width * 0.05);
            
            // First bubble closer to main bubble
            const bubble1X = width * thoughtTailX;
            const bubble1Y = height * (thoughtTailY - 0.1);
            context.moveTo(bubble1X + smallBubble1Radius, bubble1Y);
            context.arc(bubble1X, bubble1Y, smallBubble1Radius, 0, Math.PI * 2);
            
            // Second bubble at tail position
            const bubble2X = width * thoughtTailX;
            const bubble2Y = height * thoughtTailY;
            context.moveTo(bubble2X + smallBubble2Radius, bubble2Y);
            context.arc(bubble2X, bubble2Y, smallBubble2Radius, 0, Math.PI * 2);
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Rounded rectangle callout
    case 'roundedRectCallout':
      const rectTailTipX = adjustments.tailTipX || 0.25;
      const rectTailTipY = adjustments.tailTipY || 1.0;
      const rectTailBaseX = adjustments.tailBaseX || 0.3;
      const rectTailBaseY = adjustments.tailBaseY || 0.75;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const bubbleHeight = height * rectTailBaseY;
            const cornerRadius = Math.min(width, height) * 0.08;
            
            context.beginPath();
            
            // Manual rounded rectangle
            const x = 0;
            const y = 0;
            const w = width;
            const h = bubbleHeight;
            const r = cornerRadius;
            
            context.moveTo(x + r, y);
            context.lineTo(x + w - r, y);
            context.quadraticCurveTo(x + w, y, x + w, y + r);
            context.lineTo(x + w, y + h - r);
            context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            
            // Calculate tail connection points
            const tailBasePos = width * rectTailBaseX;
            const tailWidth = width * 0.15; // Fixed tail width at base
            const tailStartX = Math.max(r, Math.min(width - r - tailWidth, tailBasePos - tailWidth/2));
            const tailEndX = Math.min(width - r, tailStartX + tailWidth);
            
            // Draw bottom edge with tail
            context.lineTo(tailEndX, y + h);
            // Tail pointing to tip position
            context.lineTo(width * rectTailTipX, height * rectTailTipY);
            context.lineTo(tailStartX, y + h);
            
            context.lineTo(x + r, y + h);
            context.quadraticCurveTo(x, y + h, x, y + h - r);
            context.lineTo(x, y + r);
            context.quadraticCurveTo(x, y, x + r, y);
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Oval callout
    case 'ovalCallout':
      const ovalTailTipX = adjustments.tailTipX || 0.25;
      const ovalTailTipY = adjustments.tailTipY || 1.0;
      const ovalTailBaseX = adjustments.tailBaseX || 0.3;
      const ovalTailBaseY = adjustments.tailBaseY || 0.75;
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            const bubbleHeight = height * ovalTailBaseY;
            const centerX = width / 2;
            const centerY = bubbleHeight / 2;
            const radiusX = width / 2;
            const radiusY = bubbleHeight / 2;
            
            context.beginPath();
            
            // Create oval using path with curves
            const kappa = 0.5522848;
            const ox = radiusX * kappa; // control point offset for x
            const oy = radiusY * kappa; // control point offset for y
            
            context.moveTo(centerX - radiusX, centerY);
            context.bezierCurveTo(centerX - radiusX, centerY - oy, centerX - ox, centerY - radiusY, centerX, centerY - radiusY);
            context.bezierCurveTo(centerX + ox, centerY - radiusY, centerX + radiusX, centerY - oy, centerX + radiusX, centerY);
            context.bezierCurveTo(centerX + radiusX, centerY + oy, centerX + ox, centerY + radiusY, centerX, centerY + radiusY);
            context.bezierCurveTo(centerX - ox, centerY + radiusY, centerX - radiusX, centerY + oy, centerX - radiusX, centerY);
            
            // Calculate tail connection points on the ellipse
            const tailBasePos = width * ovalTailBaseX;
            const tailWidth = width * 0.15;
            
            // Find points on ellipse for tail connection
            const angle1 = Math.atan2(bubbleHeight/2, tailBasePos - width/2 - tailWidth/2);
            const angle2 = Math.atan2(bubbleHeight/2, tailBasePos - width/2 + tailWidth/2);
            
            const tailStartX = centerX + radiusX * 0.9 * Math.cos(Math.PI - angle2);
            const tailStartY = centerY + radiusY * 0.9 * Math.sin(Math.PI - angle2);
            const tailEndX = centerX + radiusX * 0.9 * Math.cos(Math.PI - angle1);
            const tailEndY = centerY + radiusY * 0.9 * Math.sin(Math.PI - angle1);
            
            // Draw tail
            context.moveTo(tailStartX, tailStartY);
            context.lineTo(width * ovalTailTipX, height * ovalTailTipY);
            context.lineTo(tailEndX, tailEndY);
            
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Flowchart document
    case 'flowchartDocument':
      return (
        <Shape
          {...commonProps}
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(width, 0);
            context.lineTo(width, height * 0.8);
            context.quadraticCurveTo(width * 0.75, height * 0.9, width / 2, height * 0.8);
            context.quadraticCurveTo(width * 0.25, height * 0.7, 0, height * 0.8);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          width={width}
          height={height}
        />
      );

    // Freeform shape with custom path data
    case 'freeform':
      const pathData = (element as any).pathData;
      if (pathData) {
        return (
          <Path
            {...commonProps}
            data={pathData}
            scaleX={1}
            scaleY={1}
          />
        );
      }
      // Fallback to rectangle if no path data
      return (
        <Rect
          {...commonProps}
          width={width}
          height={height}
          cornerRadius={0}
        />
      );

    // Default fallback to rectangle
    default:
      return (
        <Rect
          {...commonProps}
          width={width}
          height={height}
          cornerRadius={0}
        />
      );
  }
};

export default ShapeRenderer;