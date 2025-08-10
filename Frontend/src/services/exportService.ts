import PptxGenJS from 'pptxgenjs';
import { Presentation, Slide, SlideElement } from '../types';
import { SimplePptxExporter } from './simplePptxExporter';

export class ExportService {
  static async exportToPPTX(presentation: Presentation): Promise<void> {
    try {
      // Use the new simplified PPTX exporter for better compatibility
      return await SimplePptxExporter.exportToPPTX(presentation);
    } catch (error) {
      console.error('Error exporting presentation:', error);
      throw new Error('Failed to export presentation');
    }
  }
  
  private static addElementToSlide(slide: any, element: SlideElement): void {
    // Convert pixels to inches (96 DPI)
    const pxToInches = (px: number) => px / 96;
    
    // Common position and size
    const x = pxToInches(element.x || 0);
    const y = pxToInches(element.y || 0);
    const w = pxToInches(element.width || 100);
    const h = pxToInches(element.height || 100);
    
    switch (element.type) {
      case 'text':
      case 'wordart':
        this.addTextElement(slide, element, x, y, w, h);
        break;
        
      case 'shape':
        this.addShapeElement(slide, element, x, y, w, h);
        break;
        
      case 'image':
        if (element.src) {
          this.addImageElement(slide, element, x, y, w, h);
        }
        break;
        
      case 'line':
        this.addLineElement(slide, element);
        break;
    }
  }
  
  private static addTextElement(slide: any, element: SlideElement, x: number, y: number, w: number, h: number): void {
    const textOptions: any = {
      x,
      y,
      w,
      h,
      text: (element as any).text || (element as any).content || '',
      fontSize: element.fontSize || 16,
      fontFace: element.fontFamily || 'Arial',
      color: ((element as any).fill || (element as any).color || '#000000').replace('#', ''),
      align: element.textAlign || 'left',
      valign: 'top',
      isTextBox: true
    };
    
    // Add font styles
    if (element.fontWeight === 'bold') {
      textOptions.bold = true;
    }
    if (element.fontStyle === 'italic') {
      textOptions.italic = true;
    }
    if (element.textDecoration === 'underline') {
      textOptions.underline = true;
    }
    
    // Add rotation if present
    if (element.rotation) {
      textOptions.rotate = element.rotation;
    }
    
    // Add WordArt effects if present
    if (element.type === 'wordart' && element.effects) {
      if (element.effects.shadow) {
        textOptions.shadow = {
          type: 'outer',
          color: element.effects.shadow.color.replace('#', ''),
          blur: element.effects.shadow.blur,
          offset: element.effects.shadow.offsetX,
          angle: 45
        };
      }
      
      if (element.effects.glow) {
        textOptions.glow = {
          size: element.effects.glow.radius,
          color: element.effects.glow.color.replace('#', ''),
          opacity: element.effects.glow.opacity
        };
      }
    }
    
    slide.addText(textOptions.text, textOptions);
  }
  
  private static addShapeElement(slide: any, element: SlideElement, x: number, y: number, w: number, h: number): void {
    let shapeType = 'rect';
    
    // Map shape types
    switch (element.shapeType) {
      case 'circle':
        shapeType = 'ellipse';
        // Make it a perfect circle
        h = w;
        break;
      case 'ellipse':
        shapeType = 'ellipse';
        break;
      case 'triangle':
        shapeType = 'triangle';
        break;
      case 'rectangle':
      default:
        shapeType = 'rect';
        break;
    }
    
    const shapeOptions: any = {
      x,
      y,
      w,
      h,
      fill: {
        color: ((element as any).fill || (element as any).fillColor || '#4285f4').replace('#', '')
      }
    };
    
    // Add border if present
    if ((element as any).stroke || (element as any).strokeColor) {
      shapeOptions.line = {
        color: ((element as any).stroke || (element as any).strokeColor || '#333333').replace('#', ''),
        width: element.strokeWidth || 2
      };
    }
    
    // Add corner radius for rectangles
    if (element.shapeType === 'rectangle' && element.cornerRadius) {
      shapeOptions.rectRadius = element.cornerRadius / 100;
    }
    
    // Add rotation if present
    if (element.rotation) {
      shapeOptions.rotate = element.rotation;
    }
    
    // Add opacity if present
    if (element.opacity && element.opacity < 1) {
      shapeOptions.fill.transparency = (1 - element.opacity) * 100;
    }
    
    // Add gradient if present
    if (element.gradient) {
      const colors = element.gradient.colors.map(c => ({
        color: c.color.replace('#', ''),
        position: c.position * 100
      }));
      
      shapeOptions.fill = {
        type: 'grad',
        colors,
        gradType: element.gradient.type === 'radial' ? 'radial' : 'linear',
        deg: element.gradient.angle || 0
      };
    }
    
    // Add effects if present
    if (element.effects) {
      if (element.effects.shadow) {
        shapeOptions.shadow = {
          type: 'outer',
          color: element.effects.shadow.color.replace('#', ''),
          blur: element.effects.shadow.blur,
          offset: element.effects.shadow.offsetX,
          angle: 45,
          opacity: element.effects.shadow.opacity
        };
      }
    }
    
    slide.addShape(shapeType, shapeOptions);
  }
  
  private static addImageElement(slide: any, element: SlideElement, x: number, y: number, w: number, h: number): void {
    if (!element.src) return;
    
    const imageOptions: any = {
      x,
      y,
      w,
      h,
      data: element.src,
      sizing: { type: 'contain' }
    };
    
    // Add rotation if present
    if (element.rotation) {
      imageOptions.rotate = element.rotation;
    }
    
    // Add opacity if present
    if (element.opacity && element.opacity < 1) {
      imageOptions.transparency = (1 - element.opacity) * 100;
    }
    
    slide.addImage(imageOptions);
  }
  
  private static addLineElement(slide: any, element: SlideElement): void {
    if (!element.startPoint || !element.endPoint) return;
    
    // Convert pixels to inches
    const x1 = element.startPoint.x / 96;
    const y1 = element.startPoint.y / 96;
    const x2 = element.endPoint.x / 96;
    const y2 = element.endPoint.y / 96;
    
    const lineOptions: any = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1),
      line: {
        color: (element.stroke || '#333333').replace('#', ''),
        width: element.strokeWidth || 2
      }
    };
    
    // Add dash style if present
    if (element.strokeStyle === 'dashed') {
      lineOptions.line.dashType = 'dash';
    } else if (element.strokeStyle === 'dotted') {
      lineOptions.line.dashType = 'dot';
    }
    
    // Determine line direction
    const flipH = x2 < x1;
    const flipV = y2 < y1;
    
    if (flipH) lineOptions.flipH = true;
    if (flipV) lineOptions.flipV = true;
    
    slide.addShape('line', lineOptions);
  }
  
  static async exportToImage(presentation: Presentation, format: 'png' | 'jpg' = 'png'): Promise<void> {
    // This would require canvas rendering
    // For now, we'll focus on PPTX export
    console.log('Image export not yet implemented');
  }
  
  static async exportToPDF(presentation: Presentation): Promise<void> {
    // This would require PDF generation library
    // For now, we'll focus on PPTX export
    console.log('PDF export not yet implemented');
  }
}