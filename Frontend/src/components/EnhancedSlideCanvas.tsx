import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Circle, Line, Image as KonvaImage, RegularPolygon, Group } from 'react-konva';
import Konva from 'konva';
import { SlideElement, Effects, Gradient, WordArtStyle } from '../types';

interface Props {
  elements: SlideElement[];
  selectedElements: string[];
  onSelectElement: (id: string) => void;
  onUpdateElement: (id: string, updates: Partial<SlideElement>) => void;
  backgroundColor?: string;
  width?: number;
  height?: number;
}

const EnhancedSlideCanvas: React.FC<Props> = ({
  elements,
  selectedElements,
  onSelectElement,
  onUpdateElement,
  backgroundColor = '#FFFFFF',
  width = 800,
  height = 600,
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [images, setImages] = useState<Map<string, HTMLImageElement>>(new Map());

  // Load images
  useEffect(() => {
    const loadImages = async () => {
      const imageMap = new Map<string, HTMLImageElement>();
      
      for (const element of elements) {
        if (element.type === 'image' && element.src) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            img.src = element.src || '';
          });
          if (element.src) {
            imageMap.set(element.id, img);
          }
        }
      }
      
      setImages(imageMap);
    };
    
    loadImages();
  }, [elements]);

  const renderEffects = (element: SlideElement): any => {
    const effects: any = {};
    
    if (element.effects?.shadow) {
      effects.shadowColor = element.effects.shadow.color;
      effects.shadowBlur = element.effects.shadow.blur;
      effects.shadowOffsetX = element.effects.shadow.offsetX;
      effects.shadowOffsetY = element.effects.shadow.offsetY;
      effects.shadowOpacity = element.effects.shadow.opacity;
    }
    
    if (element.effects?.glow) {
      // Konva doesn't have native glow, so we simulate with shadow
      effects.shadowColor = element.effects.glow.color;
      effects.shadowBlur = element.effects.glow.radius * 2;
      effects.shadowOpacity = element.effects.glow.opacity;
    }
    
    return effects;
  };

  const renderGradient = (element: SlideElement, shape: any): void => {
    if (!element.gradient) return;
    
    const gradient = element.gradient;
    let fillGradient;
    
    if (gradient.type === 'linear') {
      const angle = (gradient.angle || 0) * Math.PI / 180;
      const x1 = -Math.cos(angle) * 100;
      const y1 = -Math.sin(angle) * 100;
      const x2 = Math.cos(angle) * 100;
      const y2 = Math.sin(angle) * 100;
      
      fillGradient = shape.getContext()._context.createLinearGradient(x1, y1, x2, y2);
    } else {
      fillGradient = shape.getContext()._context.createRadialGradient(0, 0, 0, 0, 0, 100);
    }
    
    gradient.colors.forEach(({ color, position }) => {
      fillGradient.addColorStop(position, color);
    });
    
    shape.fillLinearGradientColorStops(gradient.colors.map(c => [c.position, c.color]).flat());
  };

  const renderWordArt = (element: SlideElement) => {
    if (element.type !== 'wordart' || !element.wordArtStyle) {
      return renderText(element);
    }
    
    const style = element.wordArtStyle;
    const textProps: any = {
      x: element.x || 0,
      y: element.y || 0,
      text: element.text || '',
      fontSize: element.fontSize || 24,
      fontFamily: element.fontFamily || 'Arial',
      fontStyle: `${element.fontWeight || 'normal'} ${element.fontStyle || 'normal'}`,
      fill: element.fill || '#000000',
      width: element.width,
      height: element.height,
      align: element.textAlign || 'left',
      rotation: element.rotation || 0,
      draggable: true,
      ...renderEffects(element),
    };
    
    // Apply text warp transformation
    if (style.warp?.type) {
      const warpType = style.warp.type;
      // Add custom transformations based on warp type
      switch (warpType) {
        case 'textArchUp':
          textProps.sceneFunc = (context: any, shape: any) => {
            const text = shape.text();
            const fontSize = shape.fontSize();
            context.font = `${fontSize}px ${shape.fontFamily()}`;
            context.fillStyle = shape.fill();
            
            const chars = text.split('');
            const totalWidth = context.measureText(text).width;
            let currentX = 0;
            
            chars.forEach((char: string, i: number) => {
              const charWidth = context.measureText(char).width;
              const angle = (currentX / totalWidth - 0.5) * Math.PI / 3;
              const radius = 100;
              
              context.save();
              context.translate(
                shape.x() + currentX + charWidth / 2,
                shape.y() + radius
              );
              context.rotate(angle);
              context.fillText(char, -charWidth / 2, -radius);
              context.restore();
              
              currentX += charWidth;
            });
          };
          break;
        case 'textWave':
          textProps.sceneFunc = (context: any, shape: any) => {
            const text = shape.text();
            const fontSize = shape.fontSize();
            context.font = `${fontSize}px ${shape.fontFamily()}`;
            context.fillStyle = shape.fill();
            
            const chars = text.split('');
            let currentX = 0;
            
            chars.forEach((char: string, i: number) => {
              const charWidth = context.measureText(char).width;
              const waveHeight = 20;
              const waveFreq = 0.5;
              const yOffset = Math.sin(i * waveFreq) * waveHeight;
              
              context.fillText(char, shape.x() + currentX, shape.y() + yOffset);
              currentX += charWidth;
            });
          };
          break;
      }
    }
    
    // Apply 3D effects
    if (style.scene3d) {
      textProps.strokeWidth = 2;
      textProps.stroke = element.stroke || '#666666';
    }
    
    return <Text key={element.id} {...textProps} />;
  };

  const renderText = (element: SlideElement) => {
    const isSelected = selectedElements.includes(element.id);
    
    return (
      <Text
        key={element.id}
        x={element.x || 0}
        y={element.y || 0}
        text={element.text || ''}
        fontSize={element.fontSize || 16}
        fontFamily={element.fontFamily || 'Arial'}
        fontStyle={`${element.fontWeight || 'normal'} ${element.fontStyle || 'normal'}`}
        textDecoration={element.textDecoration || 'none'}
        fill={element.fill || '#000000'}
        width={element.width}
        height={element.height}
        align={element.textAlign || 'left'}
        rotation={element.rotation || 0}
        draggable={true}
        onClick={() => onSelectElement(element.id)}
        onDragEnd={(e) => {
          onUpdateElement(element.id, {
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        stroke={isSelected ? '#0066FF' : undefined}
        strokeWidth={isSelected ? 2 : 0}
        {...renderEffects(element)}
      />
    );
  };

  const renderShape = (element: SlideElement) => {
    const isSelected = selectedElements.includes(element.id);
    const commonProps = {
      key: element.id,
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 100,
      height: element.height || 100,
      fill: element.fill || '#CCCCCC',
      stroke: isSelected ? '#0066FF' : element.stroke || '#000000',
      strokeWidth: isSelected ? 3 : element.strokeWidth || 1,
      rotation: element.rotation || 0,
      draggable: true,
      onClick: () => onSelectElement(element.id),
      onDragEnd: (e: any) => {
        onUpdateElement(element.id, {
          x: e.target.x(),
          y: e.target.y(),
        });
      },
      ...renderEffects(element),
    };
    
    // Apply gradient if exists
    if (element.gradient) {
      const gradientStops: any[] = [];
      element.gradient.colors.forEach(({ color, position }) => {
        gradientStops.push(position, color);
      });
      
      if (element.gradient.type === 'linear') {
        const angle = (element.gradient.angle || 0) * Math.PI / 180;
        commonProps.fillLinearGradientStartPoint = {
          x: -Math.cos(angle) * (element.width || 100) / 2,
          y: -Math.sin(angle) * (element.height || 100) / 2,
        };
        commonProps.fillLinearGradientEndPoint = {
          x: Math.cos(angle) * (element.width || 100) / 2,
          y: Math.sin(angle) * (element.height || 100) / 2,
        };
        commonProps.fillLinearGradientColorStops = gradientStops;
      } else {
        commonProps.fillRadialGradientStartPoint = { x: 0, y: 0 };
        commonProps.fillRadialGradientEndPoint = { x: 0, y: 0 };
        commonProps.fillRadialGradientStartRadius = 0;
        commonProps.fillRadialGradientEndRadius = Math.min(element.width || 100, element.height || 100) / 2;
        commonProps.fillRadialGradientColorStops = gradientStops;
      }
    }
    
    switch (element.shapeType) {
      case 'circle':
        return (
          <Circle
            {...commonProps}
            x={(element.x || 0) + (element.width || 100) / 2}
            y={(element.y || 0) + (element.height || 100) / 2}
            radius={Math.min(element.width || 100, element.height || 100) / 2}
          />
        );
      case 'triangle':
        return (
          <RegularPolygon
            {...commonProps}
            x={(element.x || 0) + (element.width || 100) / 2}
            y={(element.y || 0) + (element.height || 100) / 2}
            sides={3}
            radius={Math.min(element.width || 100, element.height || 100) / 2}
          />
        );
      default:
        return (
          <Rect
            {...commonProps}
            cornerRadius={element.cornerRadius || 0}
          />
        );
    }
  };

  const renderImage = (element: SlideElement) => {
    const img = images.get(element.id);
    if (!img || !element.src) return null;
    
    const isSelected = selectedElements.includes(element.id);
    
    return (
      <KonvaImage
        key={element.id}
        image={img}
        x={element.x || 0}
        y={element.y || 0}
        width={element.width || 200}
        height={element.height || 150}
        rotation={element.rotation || 0}
        draggable={true}
        onClick={() => onSelectElement(element.id)}
        onDragEnd={(e) => {
          onUpdateElement(element.id, {
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        stroke={isSelected ? '#0066FF' : undefined}
        strokeWidth={isSelected ? 3 : 0}
        {...renderEffects(element)}
      />
    );
  };

  const renderLine = (element: SlideElement) => {
    const isSelected = selectedElements.includes(element.id);
    
    return (
      <Line
        key={element.id}
        points={[
          element.startPoint?.x || 0,
          element.startPoint?.y || 0,
          element.endPoint?.x || 100,
          element.endPoint?.y || 100,
        ]}
        stroke={isSelected ? '#0066FF' : element.stroke || '#000000'}
        strokeWidth={isSelected ? 3 : element.strokeWidth || 2}
        dash={element.strokeStyle === 'dashed' ? [10, 5] : element.strokeStyle === 'dotted' ? [2, 3] : undefined}
        draggable={true}
        onClick={() => onSelectElement(element.id)}
        onDragEnd={(e) => {
          const newX = e.target.x();
          const newY = e.target.y();
          onUpdateElement(element.id, {
            x: newX,
            y: newY,
          });
        }}
        {...renderEffects(element)}
      />
    );
  };

  const renderElement = (element: SlideElement) => {
    // Add reflection effect if needed
    if (element.effects?.reflection) {
      return (
        <Group key={element.id}>
          {renderElementCore(element)}
          <Group
            opacity={element.effects.reflection.opacity}
            scaleY={-1}
            y={(element.y || 0) * 2 + (element.height || 100) * 2 + element.effects.reflection.distance}
          >
            {renderElementCore({ ...element, id: `${element.id}-reflection` })}
          </Group>
        </Group>
      );
    }
    
    return renderElementCore(element);
  };

  const renderElementCore = (element: SlideElement) => {
    switch (element.type) {
      case 'text':
        return renderText(element);
      case 'wordart':
        return renderWordArt(element);
      case 'shape':
        return renderShape(element);
      case 'image':
        return renderImage(element);
      case 'line':
        return renderLine(element);
      default:
        // Try to render unknown types as shapes or text
        if (element.text) {
          return renderText(element);
        } else if (element.shapeType) {
          return renderShape(element);
        }
        return null;
    }
  };

  return (
    <div className="slide-canvas-container">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        style={{ 
          backgroundColor,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
        }}
      >
        <Layer>
          <Rect
            width={width}
            height={height}
            fill={backgroundColor}
          />
          {elements.map(renderElement)}
        </Layer>
      </Stage>
    </div>
  );
};

export default EnhancedSlideCanvas;