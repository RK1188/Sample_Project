import React, { useRef, useEffect, useState, useCallback } from 'react';

interface SimpleRulerProps {
  orientation: 'horizontal' | 'vertical';
  length: number;
  offset?: number;
  zoom?: number;
  unit?: 'px' | 'cm' | 'in';
  onGuideAdd?: (position: number) => void;
}

const SimpleRuler: React.FC<SimpleRulerProps> = ({
  orientation,
  length,
  offset = 0,
  zoom = 1,
  unit = 'px',
  onGuideAdd
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [guides, setGuides] = useState<number[]>([]);
  const [mousePos, setMousePos] = useState<number | null>(null);

  const RULER_SIZE = 30;
  const PIXELS_PER_INCH = 96;
  const PIXELS_PER_CM = 37.795276;

  // Convert pixels to display unit
  const pixelsToUnit = useCallback((pixels: number) => {
    switch (unit) {
      case 'in': return pixels / PIXELS_PER_INCH;
      case 'cm': return pixels / PIXELS_PER_CM;
      default: return pixels;
    }
  }, [unit]);

  // Get unit-based intervals
  const getInterval = useCallback(() => {
    switch (unit) {
      case 'in':
        return {
          major: PIXELS_PER_INCH,      // 1 inch
          minor: PIXELS_PER_INCH / 2,  // 0.5 inch
          micro: PIXELS_PER_INCH / 8   // 0.125 inch
        };
      case 'cm':
        return {
          major: PIXELS_PER_CM,         // 1 cm
          minor: PIXELS_PER_CM / 2,     // 0.5 cm
          micro: PIXELS_PER_CM / 10     // 0.1 cm
        };
      default:
        return {
          major: 100,  // 100 pixels
          minor: 50,   // 50 pixels
          micro: 10    // 10 pixels
        };
    }
  }, [unit]);

  const drawRuler = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { major, minor, micro } = getInterval();

    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;
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

    // Canvas starts at position 50 in the viewport
    const canvasStartPos = 50;
    
    // Draw special marker for 0 position (at 50px from viewport edge)
    const zeroScreenPos = canvasStartPos + offset;
    if (zeroScreenPos >= 0 && zeroScreenPos <= length) {
      ctx.strokeStyle = '#28a745';
      ctx.lineWidth = 2;
      
      if (orientation === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(zeroScreenPos + 0.5, RULER_SIZE);
        ctx.lineTo(zeroScreenPos + 0.5, RULER_SIZE - 12);
        ctx.stroke();
        
        ctx.fillStyle = '#28a745';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('0', zeroScreenPos - 3, 18);
      } else {
        ctx.beginPath();
        ctx.moveTo(RULER_SIZE, zeroScreenPos + 0.5);
        ctx.lineTo(RULER_SIZE - 12, zeroScreenPos + 0.5);
        ctx.stroke();
        
        ctx.save();
        ctx.translate(18, zeroScreenPos);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#28a745';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('0', -3, 0);
        ctx.restore();
      }
    }

    // Calculate visible range
    const visibleStart = Math.max(0, -offset - canvasStartPos) / zoom;
    const visibleEnd = (length - offset - canvasStartPos) / zoom;

    // Draw tick marks starting from 0
    const startTick = Math.floor(visibleStart / micro) * micro;
    const endTick = Math.ceil(visibleEnd / micro) * micro;

    for (let i = startTick; i <= endTick; i += micro) {
      if (Math.abs(i) < 0.001) continue; // Skip 0 as we've drawn it specially
      
      const pos = (i * zoom) + canvasStartPos + offset;
      
      if (pos < 0 || pos > length) continue;

      let tickLength = 3;
      let drawLabel = false;
      
      // Determine tick type
      if (Math.abs(i % major) < 0.001) {
        tickLength = 10;
        drawLabel = true;
        ctx.strokeStyle = '#495057';
      } else if (Math.abs(i % minor) < 0.001) {
        tickLength = 6;
        ctx.strokeStyle = '#868e96';
      } else {
        ctx.strokeStyle = '#adb5bd';
      }

      ctx.lineWidth = 1;
      if (orientation === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(pos + 0.5, RULER_SIZE);
        ctx.lineTo(pos + 0.5, RULER_SIZE - tickLength);
        ctx.stroke();

        // Draw label for positive values only
        if (drawLabel && i > 0) {
          const value = pixelsToUnit(i);
          const label = unit === 'px' ? Math.round(value).toString() : value.toFixed(1);
          
          ctx.fillStyle = '#495057';
          ctx.font = '10px Arial';
          const textWidth = ctx.measureText(label).width;
          ctx.fillText(label, pos - textWidth / 2, 18);
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(RULER_SIZE, pos + 0.5);
        ctx.lineTo(RULER_SIZE - tickLength, pos + 0.5);
        ctx.stroke();

        // Draw label for positive values only
        if (drawLabel && i > 0) {
          const value = pixelsToUnit(i);
          const label = unit === 'px' ? Math.round(value).toString() : value.toFixed(1);
          
          ctx.save();
          ctx.fillStyle = '#495057';
          ctx.font = '10px Arial';
          ctx.translate(18, pos);
          ctx.rotate(-Math.PI / 2);
          const textWidth = ctx.measureText(label).width;
          ctx.fillText(label, -textWidth / 2, 0);
          ctx.restore();
        }
      }
    }

    // Draw guides
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    guides.forEach(guide => {
      const pos = guide * zoom + canvasStartPos + offset;
      if (pos < 0 || pos > length) return;
      
      if (orientation === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(pos + 0.5, 0);
        ctx.lineTo(pos + 0.5, RULER_SIZE);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, pos + 0.5);
        ctx.lineTo(RULER_SIZE, pos + 0.5);
        ctx.stroke();
      }
    });
    
    ctx.setLineDash([]);

    // Draw mouse position
    if (mousePos !== null) {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1;
      
      if (orientation === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(mousePos + 0.5, 0);
        ctx.lineTo(mousePos + 0.5, RULER_SIZE);
        ctx.stroke();
        
        // Position label - calculate actual canvas position
        const canvasPos = Math.max(0, (mousePos - canvasStartPos - offset) / zoom);
        const value = pixelsToUnit(canvasPos);
        const label = unit === 'px' ? Math.round(value).toString() : value.toFixed(2);
        
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(mousePos - 20, 2, 40, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        const textWidth = ctx.measureText(label).width;
        ctx.fillText(label, mousePos - textWidth / 2, 11);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, mousePos + 0.5);
        ctx.lineTo(RULER_SIZE, mousePos + 0.5);
        ctx.stroke();
        
        // Position label - calculate actual canvas position
        const canvasPos = Math.max(0, (mousePos - canvasStartPos - offset) / zoom);
        const value = pixelsToUnit(canvasPos);
        const label = unit === 'px' ? Math.round(value).toString() : value.toFixed(2);
        
        ctx.save();
        ctx.translate(18, mousePos);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(-20, -12, 40, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        const textWidth = ctx.measureText(label).width;
        ctx.fillText(label, -textWidth / 2, -3);
        ctx.restore();
      }
    }
  }, [orientation, length, offset, zoom, unit, guides, mousePos, pixelsToUnit, getInterval]);

  useEffect(() => {
    drawRuler();
  }, [drawRuler]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const pos = orientation === 'horizontal' 
      ? e.clientX - rect.left
      : e.clientY - rect.top;
    
    setMousePos(pos);
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const pos = orientation === 'horizontal' 
      ? e.clientX - rect.left
      : e.clientY - rect.top;
    
    // Calculate actual canvas position accounting for 50px offset
    const canvasStartPos = 50;
    const value = Math.max(0, (pos - canvasStartPos - offset) / zoom);
    
    // Check if clicking on existing guide
    const clickedGuide = guides.findIndex(g => Math.abs(g * zoom + canvasStartPos + offset - pos) < 5);
    
    if (clickedGuide >= 0) {
      // Remove guide
      setGuides(guides.filter((_, i) => i !== clickedGuide));
    } else {
      // Add guide
      setGuides([...guides, value]);
      if (onGuideAdd) onGuideAdd(value);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={orientation === 'horizontal' ? length : RULER_SIZE}
      height={orientation === 'vertical' ? length : RULER_SIZE}
      style={{
        display: 'block',
        backgroundColor: '#f8f9fa',
        cursor: 'crosshair',
        userSelect: 'none'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  );
};

export default SimpleRuler;