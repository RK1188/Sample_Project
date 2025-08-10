import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  length: number;
  canvasSize?: number;
  offset?: number;
  zoom?: number;
  scrollPosition?: number;
  unit?: 'px' | 'cm' | 'in';
  onGuideAdd?: (position: number) => void;
}

const Ruler: React.FC<RulerProps> = ({
  orientation,
  length,
  canvasSize = 960,
  offset = 0,
  zoom = 1,
  scrollPosition = 0,
  unit = 'px',
  onGuideAdd
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [guides, setGuides] = useState<number[]>([]);
  const [activeGuide, setActiveGuide] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<number | null>(null);

  const RULER_SIZE = 30;
  const MAJOR_TICK_SIZE = 10;
  const MINOR_TICK_SIZE = 5;
  const MICRO_TICK_SIZE = 3;
  const TEXT_OFFSET = 18;
  
  // Unit conversion constants
  const PIXELS_PER_INCH = 96; // Standard screen DPI
  const PIXELS_PER_CM = PIXELS_PER_INCH / 2.54; // 2.54 cm per inch
  
  // Convert pixels to the selected unit
  const convertPixelsToUnit = useCallback((pixels: number): number => {
    switch (unit) {
      case 'in':
        return pixels / PIXELS_PER_INCH;
      case 'cm':
        return pixels / PIXELS_PER_CM;
      default:
        return pixels;
    }
  }, [unit]);
  
  // Format label based on unit
  const formatLabel = useCallback((value: number): string => {
    switch (unit) {
      case 'in':
        // For inches, show fractions if needed
        if (value % 1 === 0) return value.toString();
        return value.toFixed(1);
      case 'cm':
        // For cm, show one decimal place
        if (value % 1 === 0) return value.toString();
        return value.toFixed(1);
      default:
        // For pixels, show whole numbers
        return Math.round(value).toString();
    }
  }, [unit]);

  // Calculate ruler intervals based on zoom and unit
  const getIntervals = useCallback(() => {
    let majorInterval: number;
    let minorInterval: number;
    let microInterval: number;
    
    switch (unit) {
      case 'in':
        // Inches: major = 1", minor = 0.5", micro = 0.1"
        if (zoom < 0.5) {
          majorInterval = 2 * PIXELS_PER_INCH;
          minorInterval = PIXELS_PER_INCH;
          microInterval = PIXELS_PER_INCH / 4;
        } else if (zoom < 0.75) {
          majorInterval = PIXELS_PER_INCH;
          minorInterval = PIXELS_PER_INCH / 2;
          microInterval = PIXELS_PER_INCH / 8;
        } else if (zoom > 1.5) {
          majorInterval = PIXELS_PER_INCH / 2;
          minorInterval = PIXELS_PER_INCH / 4;
          microInterval = PIXELS_PER_INCH / 16;
        } else {
          majorInterval = PIXELS_PER_INCH;
          minorInterval = PIXELS_PER_INCH / 2;
          microInterval = PIXELS_PER_INCH / 10;
        }
        break;
      
      case 'cm':
        // Centimeters: major = 1cm, minor = 0.5cm, micro = 0.1cm
        if (zoom < 0.5) {
          majorInterval = 2 * PIXELS_PER_CM;
          minorInterval = PIXELS_PER_CM;
          microInterval = PIXELS_PER_CM / 2;
        } else if (zoom < 0.75) {
          majorInterval = PIXELS_PER_CM;
          minorInterval = PIXELS_PER_CM / 2;
          microInterval = PIXELS_PER_CM / 5;
        } else if (zoom > 1.5) {
          majorInterval = PIXELS_PER_CM / 2;
          minorInterval = PIXELS_PER_CM / 5;
          microInterval = PIXELS_PER_CM / 10;
        } else {
          majorInterval = PIXELS_PER_CM;
          minorInterval = PIXELS_PER_CM / 2;
          microInterval = PIXELS_PER_CM / 10;
        }
        break;
      
      default: // pixels
        if (zoom < 0.5) {
          majorInterval = 200;
          minorInterval = 100;
          microInterval = 50;
        } else if (zoom < 0.75) {
          majorInterval = 150;
          minorInterval = 75;
          microInterval = 25;
        } else if (zoom > 1.5) {
          majorInterval = 50;
          minorInterval = 25;
          microInterval = 5;
        } else if (zoom > 2) {
          majorInterval = 25;
          minorInterval = 10;
          microInterval = 5;
        } else {
          majorInterval = 100;
          minorInterval = 50;
          microInterval = 10;
        }
        break;
    }
    
    return { majorInterval, minorInterval, microInterval };
  }, [zoom, unit, PIXELS_PER_INCH, PIXELS_PER_CM]);

  const drawRuler = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { majorInterval, minorInterval, microInterval } = getIntervals();
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set styles
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
    
    // Draw border
    if (orientation === 'horizontal') {
      ctx.beginPath();
      ctx.moveTo(0, RULER_SIZE - 0.5);
      ctx.lineTo(canvas.width, RULER_SIZE - 0.5);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(RULER_SIZE - 0.5, 0);
      ctx.lineTo(RULER_SIZE - 0.5, canvas.height);
      ctx.stroke();
    }
    
    // Draw canvas boundary indicator - 0 starts at 50px offset
    const canvasStart = scrollPosition + 50;
    const canvasEnd = (canvasSize * zoom) + scrollPosition + 50;
    
    // Highlight canvas area
    if (canvasStart >= -50 && canvasEnd <= length + 50) {
      ctx.fillStyle = 'rgba(66, 133, 244, 0.08)';
      if (orientation === 'horizontal') {
        ctx.fillRect(Math.max(0, canvasStart), 0, Math.min(length, canvasEnd) - Math.max(0, canvasStart), RULER_SIZE - 1);
      } else {
        ctx.fillRect(0, Math.max(0, canvasStart), RULER_SIZE - 1, Math.min(length, canvasEnd) - Math.max(0, canvasStart));
      }
    }
    
    // Draw start line (green)
    if (canvasStart >= 0 && canvasStart <= length) {
      ctx.strokeStyle = '#28a745';
      ctx.lineWidth = 2;
      if (orientation === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(canvasStart + 0.5, 0);
        ctx.lineTo(canvasStart + 0.5, RULER_SIZE);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, canvasStart + 0.5);
        ctx.lineTo(RULER_SIZE, canvasStart + 0.5);
        ctx.stroke();
      }
    }
    
    // Draw end line (red)
    if (canvasEnd >= 0 && canvasEnd <= length) {
      ctx.strokeStyle = '#dc3545';
      ctx.lineWidth = 2;
      if (orientation === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(canvasEnd + 0.5, 0);
        ctx.lineTo(canvasEnd + 0.5, RULER_SIZE);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, canvasEnd + 0.5);
        ctx.lineTo(RULER_SIZE, canvasEnd + 0.5);
        ctx.stroke();
      }
    }
    
    // Calculate visible range
    const visibleStart = Math.max(0, Math.floor((-scrollPosition - 50) / zoom));
    const visibleEnd = Math.ceil((length - scrollPosition - 50) / zoom);
    
    // Draw tick marks and labels
    ctx.strokeStyle = '#868e96';
    ctx.fillStyle = '#495057';
    ctx.font = '10px Arial';
    
    // Draw special marker for position 0
    const zeroPos = scrollPosition + 50;
    if (zeroPos >= 0 && zeroPos <= length) {
      ctx.strokeStyle = '#28a745';
      ctx.lineWidth = 2;
      
      if (orientation === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(zeroPos + 0.5, RULER_SIZE);
        ctx.lineTo(zeroPos + 0.5, RULER_SIZE - MAJOR_TICK_SIZE - 2);
        ctx.stroke();
        
        // Draw "0" label
        ctx.fillStyle = '#28a745';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('0', zeroPos - 3, TEXT_OFFSET - 2);
      } else {
        ctx.beginPath();
        ctx.moveTo(RULER_SIZE, zeroPos + 0.5);
        ctx.lineTo(RULER_SIZE - MAJOR_TICK_SIZE - 2, zeroPos + 0.5);
        ctx.stroke();
        
        // Draw "0" label
        ctx.save();
        ctx.translate(TEXT_OFFSET, zeroPos);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#28a745';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('0', -3, 0);
        ctx.restore();
      }
      
      // Reset styles
      ctx.strokeStyle = '#868e96';
      ctx.fillStyle = '#495057';
      ctx.font = '10px Arial';
      ctx.lineWidth = 1;
    }
    
    // Draw ruler markings starting from 0
    const startPos = Math.floor(visibleStart / microInterval) * microInterval;
    const endPos = Math.min(visibleEnd, canvasSize + 200);
    
    for (let pos = startPos; pos <= endPos; pos += microInterval) {
      if (pos === 0) continue; // Skip 0 as we've already drawn it specially
      
      const screenPos = (pos * zoom) + scrollPosition + 50; // Canvas starts at 50px offset
      
      if (screenPos < 0 || screenPos > length) continue;
      
      let tickSize = MICRO_TICK_SIZE;
      let drawLabel = false;
      
      if (pos % majorInterval === 0) {
        tickSize = MAJOR_TICK_SIZE;
        drawLabel = true;
        ctx.strokeStyle = '#495057';
      } else if (pos % minorInterval === 0) {
        tickSize = MINOR_TICK_SIZE;
        ctx.strokeStyle = '#868e96';
      } else {
        ctx.strokeStyle = '#adb5bd';
      }
      
      if (orientation === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(screenPos + 0.5, RULER_SIZE);
        ctx.lineTo(screenPos + 0.5, RULER_SIZE - tickSize);
        ctx.stroke();
        
        if (drawLabel && pos >= 0) { // Only show labels for positive positions
          const labelValue = convertPixelsToUnit(pos);
          const label = formatLabel(labelValue);
          const textWidth = ctx.measureText(label).width;
          ctx.fillText(label, screenPos - textWidth / 2, TEXT_OFFSET);
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(RULER_SIZE, screenPos + 0.5);
        ctx.lineTo(RULER_SIZE - tickSize, screenPos + 0.5);
        ctx.stroke();
        
        if (drawLabel && pos >= 0) { // Only show labels for positive positions
          ctx.save();
          ctx.translate(TEXT_OFFSET, screenPos);
          ctx.rotate(-Math.PI / 2);
          const labelValue = convertPixelsToUnit(pos);
          const label = formatLabel(labelValue);
          const textWidth = ctx.measureText(label).width;
          ctx.fillText(label, -textWidth / 2, 0);
          ctx.restore();
        }
      }
    }
    
    // Draw guides
    guides.forEach(guidePos => {
      const screenPos = (guidePos * zoom) + scrollPosition + 50; // Canvas starts at 50px
      
      if (screenPos < 0 || screenPos > length) return;
      
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      if (orientation === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(screenPos + 0.5, 0);
        ctx.lineTo(screenPos + 0.5, RULER_SIZE);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, screenPos + 0.5);
        ctx.lineTo(RULER_SIZE, screenPos + 0.5);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
    });
    
    // Reset line width
    ctx.lineWidth = 1;
    
    // Draw mouse position indicator
    if (mousePosition !== null) {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1;
      
      if (orientation === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(mousePosition + 0.5, 0);
        ctx.lineTo(mousePosition + 0.5, RULER_SIZE);
        ctx.stroke();
        
        // Draw position label - showing actual canvas position
        const positionPx = Math.round((mousePosition - scrollPosition - 50) / zoom);
        const positionInUnit = convertPixelsToUnit(Math.max(0, positionPx));
        const label = formatLabel(positionInUnit);
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(mousePosition - textWidth / 2 - 3, 2, textWidth + 6, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, mousePosition - textWidth / 2, 11);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, mousePosition + 0.5);
        ctx.lineTo(RULER_SIZE, mousePosition + 0.5);
        ctx.stroke();
        
        // Draw position label - showing actual canvas position
        const positionPx = Math.round((mousePosition - scrollPosition - 50) / zoom);
        const positionInUnit = convertPixelsToUnit(Math.max(0, positionPx));
        const label = formatLabel(positionInUnit);
        
        ctx.save();
        ctx.translate(TEXT_OFFSET, mousePosition);
        ctx.rotate(-Math.PI / 2);
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(-textWidth / 2 - 3, -12, textWidth + 6, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, -textWidth / 2, -3);
        ctx.restore();
      }
    }
  }, [orientation, length, offset, zoom, scrollPosition, guides, mousePosition, getIntervals, unit, convertPixelsToUnit, formatLabel]);

  useEffect(() => {
    drawRuler();
  }, [drawRuler]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const pos = orientation === 'horizontal' 
      ? e.clientX - rect.left
      : e.clientY - rect.top;
    
    setMousePosition(pos);
    
    if (isDragging && activeGuide !== null) {
      const newPos = Math.max(0, Math.round((pos - scrollPosition - 50) / zoom));
      const newGuides = [...guides];
      newGuides[activeGuide] = newPos;
      setGuides(newGuides);
    }
  }, [orientation, isDragging, activeGuide, guides, offset, scrollPosition, zoom]);

  const handleMouseLeave = useCallback(() => {
    setMousePosition(null);
    if (!isDragging) {
      setActiveGuide(null);
    }
  }, [isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const pos = orientation === 'horizontal' 
      ? e.clientX - rect.left
      : e.clientY - rect.top;
    
    // Check if clicking on an existing guide
    const clickedGuideIndex = guides.findIndex(guidePos => {
      const screenPos = (guidePos * zoom) + scrollPosition + 50;
      return Math.abs(screenPos - pos) < 5;
    });
    
    if (clickedGuideIndex !== -1) {
      setActiveGuide(clickedGuideIndex);
      setIsDragging(true);
    } else {
      // Add new guide - only allow positive positions
      const newGuidePos = Math.max(0, Math.round((pos - scrollPosition - 50) / zoom));
      setGuides([...guides, newGuidePos]);
      if (onGuideAdd) {
        onGuideAdd(newGuidePos);
      }
    }
  }, [orientation, guides, offset, scrollPosition, zoom, onGuideAdd]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setActiveGuide(null);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const pos = orientation === 'horizontal' 
      ? e.clientX - rect.left
      : e.clientY - rect.top;
    
    // Remove guide if double-clicking on it
    const clickedGuideIndex = guides.findIndex(guidePos => {
      const screenPos = (guidePos * zoom) + scrollPosition + 50;
      return Math.abs(screenPos - pos) < 5;
    });
    
    if (clickedGuideIndex !== -1) {
      const newGuides = guides.filter((_, index) => index !== clickedGuideIndex);
      setGuides(newGuides);
    }
  }, [orientation, guides, offset, scrollPosition, zoom]);

  return (
    <canvas
      ref={canvasRef}
      width={orientation === 'horizontal' ? length : RULER_SIZE}
      height={orientation === 'vertical' ? length : RULER_SIZE}
      style={{
        display: 'block',
        cursor: isDragging ? 'grabbing' : 'pointer',
        userSelect: 'none',
        backgroundColor: '#f8f9fa',
        borderRight: orientation === 'vertical' ? '1px solid #dee2e6' : 'none',
        borderBottom: orientation === 'horizontal' ? '1px solid #dee2e6' : 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    />
  );
};

interface RulerContainerProps {
  width: number;
  height: number;
  zoom?: number;
  scrollX?: number;
  scrollY?: number;
  showGuides?: boolean;
  unit?: 'px' | 'cm' | 'in';
  onHorizontalGuideAdd?: (position: number) => void;
  onVerticalGuideAdd?: (position: number) => void;
  children?: React.ReactNode;
}

export const RulerContainer: React.FC<RulerContainerProps> = ({
  width,
  height,
  zoom = 1,
  scrollX = 0,
  scrollY = 0,
  showGuides = true,
  unit = 'px',
  onHorizontalGuideAdd,
  onVerticalGuideAdd,
  children
}) => {
  const RULER_SIZE = 30;
  const CORNER_SIZE = 30;

  // Calculate the viewport dimensions
  const viewportWidth = window.innerWidth - 400; // Approximate viewport width minus panels
  const viewportHeight = window.innerHeight - 200; // Approximate viewport height minus toolbar

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Corner square */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: CORNER_SIZE,
          height: CORNER_SIZE,
          backgroundColor: '#e9ecef',
          borderRight: '1px solid #dee2e6',
          borderBottom: '1px solid #dee2e6',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#6c757d',
          fontWeight: 'bold',
        }}
      >
        {unit.toUpperCase()}
      </div>
      
      {/* Horizontal ruler */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: RULER_SIZE,
          right: 0,
          height: RULER_SIZE,
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        <Ruler
          orientation="horizontal"
          length={Math.max(viewportWidth, width * zoom + 100)}
          canvasSize={width}
          offset={0}
          zoom={zoom}
          scrollPosition={scrollX}
          unit={unit}
          onGuideAdd={onHorizontalGuideAdd}
        />
      </div>
      
      {/* Vertical ruler */}
      <div
        style={{
          position: 'absolute',
          top: RULER_SIZE,
          left: 0,
          width: RULER_SIZE,
          bottom: 0,
          overflow: 'hidden',
          zIndex: 2,
        }}
      >
        <Ruler
          orientation="vertical"
          length={Math.max(viewportHeight, height * zoom + 100)}
          canvasSize={height}
          offset={0}
          zoom={zoom}
          scrollPosition={scrollY}
          unit={unit}
          onGuideAdd={onVerticalGuideAdd}
        />
      </div>
      
      {/* Main content area */}
      <div
        style={{
          position: 'absolute',
          top: RULER_SIZE,
          left: RULER_SIZE,
          right: 0,
          bottom: 0,
          overflow: 'auto',
          backgroundColor: '#f0f0f0',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Ruler;