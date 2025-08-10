import React, { useRef } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Arc, Group, Shape, Star, Ring, Wedge } from 'react-konva';
import { Slide, SlideElement } from '../types';

interface SlideThumbnailProps {
  slide: Slide;
  index: number;
  isActive: boolean;
  isSelected?: boolean;
  onClick: (index: number) => void;
  onContextMenu?: (e: React.MouseEvent, slideId: string) => void;
  className?: string;
}

const SlideThumbnail: React.FC<SlideThumbnailProps> = ({
  slide,
  index,
  isActive,
  isSelected = false,
  onClick,
  onContextMenu,
  className = ''
}) => {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const thumbnailWidth = 160;
  const thumbnailHeight = 90;

  const handleClick = () => {
    onClick(index);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(e, slide.id);
  };

  const getThumbnailClass = () => {
    let classes = `slide-thumbnail ${className}`;
    if (isActive) classes += ' active';
    if (isSelected) classes += ' selected';
    return classes;
  };

  return (
    <div
      ref={thumbnailRef}
      className={getThumbnailClass()}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="thumbnail-content">
        <div className="thumbnail-canvas" style={{ pointerEvents: 'none' }}>
          <Stage width={thumbnailWidth} height={thumbnailHeight}>
            <Layer>
              <Rect
                width={thumbnailWidth}
                height={thumbnailHeight}
                fill={slide.backgroundColor || slide.background || '#FFFFFF'}
              />
              {(slide.elements || []).map((element: SlideElement) => {
                // Scale elements for thumbnail
                const scaleX = thumbnailWidth / 960;
                const scaleY = thumbnailHeight / 540;
                
                const renderThumbnailElement = (el: SlideElement): React.ReactNode => {
                  switch (el.type) {
                  case 'text':
                  case 'wordart':
                    return (
                      <Text
                        key={el.id}
                        x={(el.x || 0) * scaleX}
                        y={(el.y || 0) * scaleY}
                        text={(el as any).text || (el as any).content || ''}
                        fontSize={(el.fontSize || 16) * scaleX}
                        fontFamily={el.fontFamily || 'Arial'}
                        fontStyle={`${el.fontWeight === 'bold' ? 'bold' : 'normal'} ${el.fontStyle === 'italic' ? 'italic' : 'normal'}`}
                        fill={(el as any).fill || (el as any).color || '#000000'}
                        width={(el.width || 200) * scaleX}
                        height={(el.height || 50) * scaleY}
                        align={el.textAlign || 'left'}
                        rotation={el.rotation || 0}
                        opacity={el.opacity || 1}
                      />
                    );
                  case 'shape':
                    const shapeX = (el.x || 0) * scaleX;
                    const shapeY = (el.y || 0) * scaleY;
                    const shapeWidth = (el.width || 100) * scaleX;
                    const shapeHeight = (el.height || 100) * scaleY;
                    const shapeFill = (el as any).fill || (el as any).fillColor || '#4285f4';
                    const shapeStroke = (el as any).stroke || (el as any).strokeColor || '#333333';
                    const shapeStrokeWidth = (el.strokeWidth || 2) * scaleX;
                    const adjustments = (el as any).adjustments || {};
                    
                    // Handle different shape types
                    switch (el.shapeType) {
                      case 'circle':
                        const radius = Math.min(shapeWidth, shapeHeight) / 2;
                        return (
                          <Circle
                            key={el.id}
                            x={shapeX + radius}
                            y={shapeY + radius}
                            radius={radius}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'triangle':
                        const topVertexRatio = adjustments.topVertexRatio || 0.5;
                        const baseWidthRatio = adjustments.baseWidthRatio || 1;
                        const baseOffset = (1 - baseWidthRatio) * shapeWidth / 2;
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              context.moveTo(shapeWidth * topVertexRatio, 0);
                              context.lineTo(shapeWidth - baseOffset, shapeHeight);
                              context.lineTo(baseOffset, shapeHeight);
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'rightTriangle':
                        const rightTriangleHypotenuseRatio = adjustments.hypotenuseRatio || 1;
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              context.moveTo(0, 0);  // Top left corner
                              context.lineTo(shapeWidth * rightTriangleHypotenuseRatio, shapeHeight);  // Bottom right (adjustable)
                              context.lineTo(0, shapeHeight);  // Bottom left (right angle)
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'diamond':
                        const diamondRatio = adjustments.diamondRatio || 0.5;
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              context.moveTo(shapeWidth * diamondRatio, 0);
                              context.lineTo(shapeWidth, shapeHeight / 2);
                              context.lineTo(shapeWidth * diamondRatio, shapeHeight);
                              context.lineTo(0, shapeHeight / 2);
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'star5':
                      case 'star6':
                      case 'star8':
                        const numPoints = parseInt(el.shapeType.replace('star', '')) || 5;
                        const innerRadiusRatio = adjustments.innerRadiusRatio || 0.4;
                        return (
                          <Star
                            key={el.id}
                            x={shapeX + shapeWidth / 2}
                            y={shapeY + shapeHeight / 2}
                            numPoints={numPoints}
                            innerRadius={Math.min(shapeWidth, shapeHeight) * innerRadiusRatio / 2}
                            outerRadius={Math.min(shapeWidth, shapeHeight) / 2}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'pentagon':
                        // Pentagon - always render as regular polygon (no adjustments)
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX + shapeWidth / 2}
                            y={shapeY + shapeHeight / 2}
                            sceneFunc={(context, shape) => {
                              const r = Math.min(shapeWidth, shapeHeight) / 2;
                              context.beginPath();
                              for (let i = 0; i < 5; i++) {
                                const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                                const x = Math.cos(angle) * r;
                                const y = Math.sin(angle) * r;
                                if (i === 0) {
                                  context.moveTo(x, y);
                                } else {
                                  context.lineTo(x, y);
                                }
                              }
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'hexagon':
                        const hexCornerCut = adjustments.hexCornerCut !== undefined ? adjustments.hexCornerCut : 0.15;  // Default to 15% cut
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              
                              if (hexCornerCut > 0) {
                                // Hexagon with corner cuts (like PowerPoint)
                                const cutWidth = shapeWidth * hexCornerCut;
                                
                                // Start from top-left corner (after cut)
                                context.moveTo(cutWidth, 0);
                                // Top edge
                                context.lineTo(shapeWidth - cutWidth, 0);
                                // Top-right cut
                                context.lineTo(shapeWidth, shapeHeight * 0.25);
                                // Right edge
                                context.lineTo(shapeWidth, shapeHeight * 0.75);
                                // Bottom-right cut
                                context.lineTo(shapeWidth - cutWidth, shapeHeight);
                                // Bottom edge
                                context.lineTo(cutWidth, shapeHeight);
                                // Bottom-left cut
                                context.lineTo(0, shapeHeight * 0.75);
                                // Left edge
                                context.lineTo(0, shapeHeight * 0.25);
                                // Close with top-left cut
                                context.closePath();
                              } else {
                                // Regular hexagon
                                const centerX = shapeWidth / 2;
                                const centerY = shapeHeight / 2;
                                const radius = Math.min(shapeWidth, shapeHeight) / 2;
                                
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
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'octagon':
                        const octCornerCut = adjustments.octCornerCut !== undefined ? adjustments.octCornerCut : 0.29;  // Default to 29% cut
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              
                              if (octCornerCut > 0) {
                                // Octagon with corner cuts (like PowerPoint)
                                const cutWidth = shapeWidth * octCornerCut;
                                const cutHeight = shapeHeight * octCornerCut;
                                
                                // Start from top-left corner (after cut)
                                context.moveTo(cutWidth, 0);
                                // Top edge
                                context.lineTo(shapeWidth - cutWidth, 0);
                                // Top-right cut
                                context.lineTo(shapeWidth, cutHeight);
                                // Right edge (upper)
                                context.lineTo(shapeWidth, shapeHeight - cutHeight);
                                // Bottom-right cut
                                context.lineTo(shapeWidth - cutWidth, shapeHeight);
                                // Bottom edge
                                context.lineTo(cutWidth, shapeHeight);
                                // Bottom-left cut
                                context.lineTo(0, shapeHeight - cutHeight);
                                // Left edge
                                context.lineTo(0, cutHeight);
                                // Close with top-left cut
                                context.closePath();
                              } else {
                                // Regular octagon
                                const centerX = shapeWidth / 2;
                                const centerY = shapeHeight / 2;
                                const radius = Math.min(shapeWidth, shapeHeight) / 2;
                                
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
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'rightArrow':
                      case 'leftArrow':
                        const arrowDir = el.shapeType === 'rightArrow' ? 1 : -1;
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              if (arrowDir === 1) {
                                // Right arrow
                                context.moveTo(0, shapeHeight * 0.3);
                                context.lineTo(shapeWidth * 0.6, shapeHeight * 0.3);
                                context.lineTo(shapeWidth * 0.6, 0);
                                context.lineTo(shapeWidth, shapeHeight / 2);
                                context.lineTo(shapeWidth * 0.6, shapeHeight);
                                context.lineTo(shapeWidth * 0.6, shapeHeight * 0.7);
                                context.lineTo(0, shapeHeight * 0.7);
                              } else {
                                // Left arrow
                                context.moveTo(shapeWidth, shapeHeight * 0.3);
                                context.lineTo(shapeWidth * 0.4, shapeHeight * 0.3);
                                context.lineTo(shapeWidth * 0.4, 0);
                                context.lineTo(0, shapeHeight / 2);
                                context.lineTo(shapeWidth * 0.4, shapeHeight);
                                context.lineTo(shapeWidth * 0.4, shapeHeight * 0.7);
                                context.lineTo(shapeWidth, shapeHeight * 0.7);
                              }
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'heart':
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              const w = shapeWidth;
                              const h = shapeHeight;
                              context.beginPath();
                              context.moveTo(w / 2, h / 4);
                              context.bezierCurveTo(w / 2, h / 8, w / 8, h / 8, w / 8, h / 4);
                              context.bezierCurveTo(w / 8, h / 2, w / 2, h * 0.75, w / 2, h);
                              context.bezierCurveTo(w / 2, h * 0.75, w * 7 / 8, h / 2, w * 7 / 8, h / 4);
                              context.bezierCurveTo(w * 7 / 8, h / 8, w / 2, h / 8, w / 2, h / 4);
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'pie':
                        const pieStartAngle = adjustments.startAngle || (el as any).startAngle || 0;
                        const pieEndAngle = adjustments.endAngle || (el as any).endAngle || 90;
                        const pieInnerRadius = adjustments.innerRadius || 0;
                        
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              const centerX = shapeWidth / 2;
                              const centerY = shapeHeight / 2;
                              const outerRadius = Math.min(shapeWidth, shapeHeight) / 2;
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
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'donut':
                        const innerRadius = adjustments.innerRadius || 0.5;
                        return (
                          <Ring
                            key={el.id}
                            x={shapeX + shapeWidth / 2}
                            y={shapeY + shapeHeight / 2}
                            innerRadius={Math.min(shapeWidth, shapeHeight) * innerRadius / 2}
                            outerRadius={Math.min(shapeWidth, shapeHeight) / 2}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'roundedRectangle':
                        const cornerRadius = adjustments.cornerRadius || Math.min(shapeWidth, shapeHeight) * 0.1;
                        return (
                          <Rect
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            width={shapeWidth}
                            height={shapeHeight}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            cornerRadius={cornerRadius}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'ellipse':
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX + shapeWidth / 2}
                            y={shapeY + shapeHeight / 2}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              context.ellipse(0, 0, shapeWidth / 2, shapeHeight / 2, 0, 0, Math.PI * 2);
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'trapezoid':
                        const topWidthRatio = adjustments.topWidthRatio || 0.6;
                        const sideTrim = (1 - topWidthRatio) / 2;
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              context.moveTo(shapeWidth * sideTrim, 0);
                              context.lineTo(shapeWidth * (1 - sideTrim), 0);
                              context.lineTo(shapeWidth, shapeHeight);
                              context.lineTo(0, shapeHeight);
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'parallelogram':
                        const skewRatio = adjustments.skewRatio || 0.2;
                        const skew = shapeWidth * skewRatio;
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              context.moveTo(skew, 0);
                              context.lineTo(shapeWidth, 0);
                              context.lineTo(shapeWidth - skew, shapeHeight);
                              context.lineTo(0, shapeHeight);
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'plus':
                        const plusThickness = adjustments.thickness || 0.33;
                        const plusThick = Math.min(shapeWidth, shapeHeight) * plusThickness;
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              // Vertical bar
                              context.rect((shapeWidth - plusThick) / 2, 0, plusThick, shapeHeight);
                              // Horizontal bar
                              context.rect(0, (shapeHeight - plusThick) / 2, shapeWidth, plusThick);
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'minus':
                        const minusThickness = adjustments.thickness || 0.2;
                        const minusThick = shapeHeight * minusThickness;
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              context.rect(0, (shapeHeight - minusThick) / 2, shapeWidth, minusThick);
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'cloud':
                        const cloudPuffiness = adjustments.cloudPuffiness || 0.25;
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              const w = shapeWidth;
                              const h = shapeHeight;
                              context.beginPath();
                              context.arc(w * 0.3, h * 0.6, h * cloudPuffiness, 0, Math.PI * 2);
                              context.arc(w * 0.5, h * 0.5, h * (cloudPuffiness + 0.05), 0, Math.PI * 2);
                              context.arc(w * 0.7, h * 0.6, h * cloudPuffiness, 0, Math.PI * 2);
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'sun':
                        const sunRayLength = adjustments.sunRayLength || 0.5;
                        const sunInnerRadius = Math.min(shapeWidth, shapeHeight) / 4;
                        const sunOuterRadius = sunInnerRadius + (Math.min(shapeWidth, shapeHeight) / 4) * sunRayLength;
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              const centerX = shapeWidth / 2;
                              const centerY = shapeHeight / 2;
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
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'moon':
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              const centerX = shapeWidth / 2;
                              const centerY = shapeHeight / 2;
                              const moonRadius = Math.min(shapeWidth, shapeHeight) / 2 * 0.8;
                              const cutoutRadius = moonRadius * 0.6;
                              const cutoutOffsetX = moonRadius * 0.3;
                              
                              context.beginPath();
                              context.arc(centerX, centerY, moonRadius, 0, Math.PI * 2, false);
                              context.moveTo(centerX + cutoutOffsetX + cutoutRadius, centerY);
                              context.arc(centerX + cutoutOffsetX, centerY, cutoutRadius, 0, Math.PI * 2, true);
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'smileyFace':
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              const centerX = shapeWidth / 2;
                              const centerY = shapeHeight / 2;
                              const radius = Math.min(shapeWidth, shapeHeight) / 2 * 0.9;
                              
                              // Face
                              context.beginPath();
                              context.arc(centerX, centerY, radius, 0, Math.PI * 2);
                              context.fillStrokeShape(shape);
                              
                              // Eyes
                              context.fillStyle = shapeStroke;
                              const eyeRadius = radius * 0.1;
                              context.beginPath();
                              context.arc(centerX - radius * 0.3, centerY - radius * 0.2, eyeRadius, 0, Math.PI * 2);
                              context.fill();
                              context.beginPath();
                              context.arc(centerX + radius * 0.3, centerY - radius * 0.2, eyeRadius, 0, Math.PI * 2);
                              context.fill();
                              
                              // Smile
                              context.beginPath();
                              context.arc(centerX, centerY + radius * 0.1, radius * 0.5, 0, Math.PI);
                              context.lineWidth = shapeStrokeWidth;
                              context.strokeStyle = shapeStroke;
                              context.stroke();
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'lightningBolt':
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              context.moveTo(shapeWidth * 0.6, 0);
                              context.lineTo(shapeWidth * 0.2, shapeHeight * 0.5);
                              context.lineTo(shapeWidth * 0.4, shapeHeight * 0.5);
                              context.lineTo(shapeWidth * 0.3, shapeHeight);
                              context.lineTo(shapeWidth * 0.7, shapeHeight * 0.4);
                              context.lineTo(shapeWidth * 0.5, shapeHeight * 0.4);
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'star4':
                        const star4InnerRatio = adjustments.innerRadiusRatio || 0.5;
                        return (
                          <Star
                            key={el.id}
                            x={shapeX + shapeWidth / 2}
                            y={shapeY + shapeHeight / 2}
                            numPoints={4}
                            innerRadius={Math.min(shapeWidth, shapeHeight) * star4InnerRatio / 2}
                            outerRadius={Math.min(shapeWidth, shapeHeight) / 2}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'upArrow':
                      case 'downArrow':
                        const isUpArrow = el.shapeType === 'upArrow';
                        return (
                          <Shape
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            sceneFunc={(context, shape) => {
                              context.beginPath();
                              if (isUpArrow) {
                                // Up arrow
                                context.moveTo(shapeWidth * 0.3, shapeHeight);
                                context.lineTo(shapeWidth * 0.3, shapeHeight * 0.4);
                                context.lineTo(0, shapeHeight * 0.4);
                                context.lineTo(shapeWidth / 2, 0);
                                context.lineTo(shapeWidth, shapeHeight * 0.4);
                                context.lineTo(shapeWidth * 0.7, shapeHeight * 0.4);
                                context.lineTo(shapeWidth * 0.7, shapeHeight);
                              } else {
                                // Down arrow
                                context.moveTo(shapeWidth * 0.3, 0);
                                context.lineTo(shapeWidth * 0.3, shapeHeight * 0.6);
                                context.lineTo(0, shapeHeight * 0.6);
                                context.lineTo(shapeWidth / 2, shapeHeight);
                                context.lineTo(shapeWidth, shapeHeight * 0.6);
                                context.lineTo(shapeWidth * 0.7, shapeHeight * 0.6);
                                context.lineTo(shapeWidth * 0.7, 0);
                              }
                              context.closePath();
                              context.fillStrokeShape(shape);
                            }}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                      
                      case 'rectangle':
                      default:
                        return (
                          <Rect
                            key={el.id}
                            x={shapeX}
                            y={shapeY}
                            width={shapeWidth}
                            height={shapeHeight}
                            fill={shapeFill}
                            stroke={shapeStroke}
                            strokeWidth={shapeStrokeWidth}
                            cornerRadius={0}
                            rotation={el.rotation || 0}
                            opacity={el.opacity || 1}
                          />
                        );
                    }
                  case 'line':
                    return (
                      <Line
                        key={el.id}
                        points={[
                          (el.startPoint?.x || 0) * scaleX,
                          (el.startPoint?.y || 0) * scaleY,
                          (el.endPoint?.x || 100) * scaleX,
                          (el.endPoint?.y || 100) * scaleY,
                        ]}
                        stroke={el.stroke || '#333333'}
                        strokeWidth={(el.strokeWidth || 2) * scaleX}
                      />
                    );
                  case 'group':
                    return (
                      <Group
                        key={el.id}
                        x={(el.x || 0) * scaleX}
                        y={(el.y || 0) * scaleY}
                        rotation={el.rotation || 0}
                      >
                        {el.children && el.children.map(child => renderThumbnailElement(child))}
                      </Group>
                    );
                  default:
                    return null;
                  }
                };
                
                return renderThumbnailElement(element);
              })}
            </Layer>
          </Stage>
        </div>
        <div className="thumbnail-overlay">
          <span className="slide-number">{index + 1}</span>
        </div>
      </div>
      <div className="slide-title">
        {slide.title || `Slide ${index + 1}`}
      </div>
    </div>
  );
};

export default SlideThumbnail;