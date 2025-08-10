import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { Slide, SlideElement } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface TextEffect {
  type: 'wordArt' | 'shadow' | 'reflection' | 'glow' | '3d';
  properties: Record<string, any>;
}

interface ShapeStyle {
  fill?: {
    type: 'solid' | 'gradient' | 'pattern' | 'image';
    color?: string;
    gradient?: {
      type: 'linear' | 'radial';
      colors: Array<{ color: string; position: number }>;
      angle?: number;
    };
    image?: string;
  };
  stroke?: {
    color: string;
    width: number;
    dashStyle?: string;
  };
  effects?: {
    shadow?: {
      color: string;
      blur: number;
      offsetX: number;
      offsetY: number;
      opacity: number;
    };
    reflection?: {
      distance: number;
      opacity: number;
      blur: number;
    };
    glow?: {
      color: string;
      radius: number;
      opacity: number;
    };
    softEdges?: number;
    bevel?: {
      width: number;
      height: number;
    };
  };
}

export class AdvancedPptxParser {
  private zip: JSZip | null = null;
  private relationships: Map<string, string> = new Map();
  private media: Map<string, string> = new Map();
  private themes: Map<string, any> = new Map();
  private masters: Map<string, any> = new Map();

  async parsePptx(file: File): Promise<Slide[]> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.zip = await JSZip.loadAsync(arrayBuffer);
      
      // Load relationships, themes, and media
      await this.loadRelationships();
      await this.loadThemes();
      await this.loadMedia();
      await this.loadMasters();
      
      // Get presentation data
      const presentationXml = await this.getXmlContent('ppt/presentation.xml');
      if (!presentationXml) throw new Error('Invalid PPTX file');
      
      const presentation = await this.parseXml(presentationXml);
      const slideList = this.extractSlideList(presentation);
      
      const slides: Slide[] = [];
      
      for (let i = 0; i < slideList.length; i++) {
        const slideData = await this.parseSlide(i + 1);
        if (slideData) {
          slides.push(slideData);
        }
      }
      
      return slides;
    } catch (error) {
      console.error('Error parsing PPTX:', error);
      throw new Error('Failed to parse PPTX file');
    }
  }

  private async loadRelationships() {
    const relsXml = await this.getXmlContent('ppt/_rels/presentation.xml.rels');
    if (relsXml) {
      const rels = await this.parseXml(relsXml);
      if (rels.Relationships?.Relationship) {
        const relationships = Array.isArray(rels.Relationships.Relationship) 
          ? rels.Relationships.Relationship 
          : [rels.Relationships.Relationship];
        
        relationships.forEach((rel: any) => {
          this.relationships.set(rel.$.Id, rel.$.Target);
        });
      }
    }
  }

  private async loadThemes() {
    const themeFiles = Object.keys(this.zip!.files).filter(f => f.startsWith('ppt/theme/'));
    for (const themeFile of themeFiles) {
      const themeXml = await this.getXmlContent(themeFile);
      if (themeXml) {
        const theme = await this.parseXml(themeXml);
        this.themes.set(themeFile, theme);
      }
    }
  }

  private async loadMasters() {
    const masterFiles = Object.keys(this.zip!.files).filter(f => f.startsWith('ppt/slideMasters/'));
    for (const masterFile of masterFiles) {
      const masterXml = await this.getXmlContent(masterFile);
      if (masterXml) {
        const master = await this.parseXml(masterXml);
        this.masters.set(masterFile, master);
      }
    }
  }

  private async loadMedia() {
    const mediaFiles = Object.keys(this.zip!.files).filter(f => f.startsWith('ppt/media/'));
    
    for (const mediaFile of mediaFiles) {
      const file = this.zip!.file(mediaFile);
      if (file) {
        const blob = await file.async('blob');
        const url = URL.createObjectURL(blob);
        const fileName = mediaFile.split('/').pop() || '';
        this.media.set(fileName, url);
      }
    }
  }

  private async parseSlide(slideNumber: number): Promise<Slide | null> {
    const slideXml = await this.getXmlContent(`ppt/slides/slide${slideNumber}.xml`);
    if (!slideXml) return null;
    
    const slideData = await this.parseXml(slideXml);
    const elements: SlideElement[] = [];
    
    // Load slide relationships for images
    const slideRelsXml = await this.getXmlContent(`ppt/slides/_rels/slide${slideNumber}.xml.rels`);
    const slideRels = new Map<string, string>();
    
    if (slideRelsXml) {
      const rels = await this.parseXml(slideRelsXml);
      if (rels.Relationships?.Relationship) {
        const relationships = Array.isArray(rels.Relationships.Relationship) 
          ? rels.Relationships.Relationship 
          : [rels.Relationships.Relationship];
        
        relationships.forEach((rel: any) => {
          slideRels.set(rel.$.Id, rel.$.Target);
        });
      }
    }
    
    // Parse shapes and text
    if (slideData['p:sld']?.['p:cSld']?.[0]?.['p:spTree']?.[0]) {
      const spTree = slideData['p:sld']['p:cSld'][0]['p:spTree'][0];
      
      // Process shapes
      if (spTree['p:sp']) {
        for (const shape of spTree['p:sp']) {
          const element = await this.parseShape(shape, slideRels);
          if (element) elements.push(element);
        }
      }
      
      // Process pictures
      if (spTree['p:pic']) {
        for (const pic of spTree['p:pic']) {
          const element = await this.parsePicture(pic, slideRels);
          if (element) elements.push(element);
        }
      }
      
      // Process group shapes
      if (spTree['p:grpSp']) {
        for (const group of spTree['p:grpSp']) {
          const groupElements = await this.parseGroupShape(group, slideRels);
          elements.push(...groupElements);
        }
      }
      
      // Process connector lines
      if (spTree['p:cxnSp']) {
        for (const connector of spTree['p:cxnSp']) {
          const element = await this.parseConnector(connector);
          if (element) elements.push(element);
        }
      }
    }
    
    return {
      id: uuidv4(),
      title: `Slide ${slideNumber}`,
      elements,
      backgroundColor: this.extractBackground(slideData),
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async parseShape(shape: any, slideRels: Map<string, string>, inheritedStyle?: ShapeStyle): Promise<SlideElement | null> {
    try {
      const nvSpPr = shape['p:nvSpPr']?.[0];
      const spPr = shape['p:spPr']?.[0];
      const txBody = shape['p:txBody']?.[0];
      
      // Extract position and size
      const transform = this.extractTransform(spPr);
      
      // Check if this is WordArt
      const isWordArt = this.checkIfWordArt(shape);
      
      if (txBody) {
        // Parse text with effects
        const textContent = this.extractTextWithEffects(txBody);
        const textEffects = this.extractTextEffects(spPr, txBody);
        
        const element: any = {
          id: uuidv4(),
          type: isWordArt ? 'wordart' : 'text',
          x: transform.x,
          y: transform.y,
          width: transform.width,
          height: transform.height,
          rotation: transform.rotation,
          text: textContent.text,
          fontSize: textContent.fontSize || 16,
          fontFamily: textContent.fontFamily || 'Arial',
          fontWeight: textContent.bold ? 'bold' : 'normal',
          fontStyle: textContent.italic ? 'italic' : 'normal',
          textDecoration: textContent.underline ? 'underline' : 'none',
          fill: textContent.color || '#000000', // Add fill for text color
          textAlign: textContent.align || 'left',
          effects: textEffects,
        };
        
        // Add type-specific fields
        if (!isWordArt) {
          element.content = textContent.text; // TextElement specific
          element.color = textContent.color || '#000000';
        } else {
          element.wordArtStyle = this.extractWordArtStyle(shape);
        }
        
        return element;
      } else {
        // It's a shape
        const shapeType = this.extractShapeType(spPr);
        const shapeStyle = { ...inheritedStyle, ...this.extractShapeStyle(spPr) };
        
        // Handle noFill case - shape should be transparent
        const hasNoFill = spPr?.['a:noFill'];
        const fillColor = hasNoFill ? 'transparent' : (shapeStyle.fill?.color || '#4285f4');
        
        console.log('Parsing shape:', {
          shapeType,
          transform,
          shapeStyle,
          hasNoFill,
          fillColor
        });
        
        // Handle freeform shapes with custom geometry
        if (shapeType === 'freeform') {
          const custGeom = spPr?.['a:custGeom']?.[0];
          const pathData = this.parseCustomGeometry(custGeom, transform);
          
          if (pathData) {
            return {
              id: uuidv4(),
              type: 'shape' as const,
              shapeType: 'freeform' as any,
              x: transform.x,
              y: transform.y,
              width: Math.max(1, transform.width),
              height: Math.max(1, transform.height),
              rotation: transform.rotation,
              fill: fillColor,
              fillColor: fillColor,
              stroke: shapeStyle.stroke?.color || '#333333',
              strokeColor: shapeStyle.stroke?.color || '#333333',
              strokeWidth: shapeStyle.stroke?.width || 2,
              opacity: 1,
              effects: shapeStyle.effects,
              gradient: shapeStyle.fill?.gradient,
              pathData: pathData, // Store SVG path data
            } as any;
          }
        }
        
        return {
          id: uuidv4(),
          type: 'shape' as const,
          shapeType: shapeType as any,
          x: transform.x,
          y: transform.y,
          width: Math.max(1, transform.width), // Ensure minimum size
          height: Math.max(1, transform.height), // Ensure minimum size
          rotation: transform.rotation,
          fill: fillColor,
          fillColor: fillColor,
          stroke: shapeStyle.stroke?.color || '#333333',
          strokeColor: shapeStyle.stroke?.color || '#333333',
          strokeWidth: shapeStyle.stroke?.width || 2,
          opacity: 1,
          effects: shapeStyle.effects,
          gradient: shapeStyle.fill?.gradient,
          cornerRadius: shapeType === 'rectangle' ? 0 : undefined,
          // Pie-specific properties
          ...(shapeType === 'pie' ? {
            startAngle: this.extractPieStartAngle(spPr) || 0,
            endAngle: this.extractPieEndAngle(spPr) || 90,
            innerRadius: this.extractPieInnerRadius(spPr) || 0
          } : {}),
        } as any;
      }
    } catch (error) {
      console.error('Error parsing shape:', error);
      return null;
    }
  }

  private async parsePicture(pic: any, slideRels: Map<string, string>): Promise<SlideElement | null> {
    try {
      const spPr = pic['p:spPr']?.[0];
      const blipFill = pic['p:blipFill']?.[0];
      const transform = this.extractTransform(spPr);
      
      // Get image reference
      const blip = blipFill?.['a:blip']?.[0];
      const embed = blip?.['$']?.['r:embed'];
      
      if (embed && slideRels.has(embed)) {
        const imagePath = slideRels.get(embed)!;
        const imageName = imagePath.replace('../media/', '');
        const imageUrl = this.media.get(imageName);
        
        if (imageUrl) {
          return {
            id: uuidv4(),
            type: 'image',
            x: transform.x,
            y: transform.y,
            width: transform.width,
            height: transform.height,
            rotation: transform.rotation,
            src: imageUrl,
            effects: this.extractImageEffects(spPr),
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing picture:', error);
      return null;
    }
  }

  private async parseConnector(connector: any): Promise<SlideElement | null> {
    try {
      const spPr = connector['p:spPr']?.[0];
      const transform = this.extractTransform(spPr);
      
      // Get line properties
      const ln = spPr?.['a:ln']?.[0];
      const lnSolidFill = ln?.['a:solidFill']?.[0];
      
      // Calculate start and end points based on transform
      const startPoint = { x: transform.x, y: transform.y + transform.height / 2 };
      const endPoint = { x: transform.x + transform.width, y: transform.y + transform.height / 2 };
      
      return {
        id: uuidv4(),
        type: 'line',
        startPoint,
        endPoint,
        stroke: lnSolidFill ? this.extractColor(lnSolidFill['a:srgbClr']?.[0] || lnSolidFill['a:schemeClr']?.[0]) : '#333333',
        strokeWidth: ln?.$?.w ? this.convertEmu(parseInt(ln.$.w)) : 2,
        strokeStyle: 'solid',
        x: 0,
        y: 0,
        rotation: transform.rotation || 0,
        isConnector: true,
      } as any;
    } catch (error) {
      console.error('Error parsing connector:', error);
      return null;
    }
  }

  private async parseGroupShape(group: any, slideRels: Map<string, string>, parentTransform?: any): Promise<SlideElement[]> {
    const elements: SlideElement[] = [];
    
    // Get group transform and properties
    const grpSpPr = group['p:grpSpPr']?.[0];
    const groupTransform = this.extractTransform(grpSpPr);
    
    // Combine with parent transform if exists
    const combinedTransform = parentTransform ? {
      x: (parentTransform.x || 0) + (groupTransform.x || 0),
      y: (parentTransform.y || 0) + (groupTransform.y || 0),
      width: groupTransform.width || parentTransform.width,
      height: groupTransform.height || parentTransform.height,
      rotation: (parentTransform.rotation || 0) + (groupTransform.rotation || 0)
    } : groupTransform;
    
    // Extract group styles that might be inherited by children
    const groupStyle = this.extractShapeStyle(grpSpPr);
    
    // Create a group element to maintain hierarchy
    const groupId = uuidv4();
    const childElements: SlideElement[] = [];
    
    // Parse shapes in group
    if (group['p:sp']) {
      for (const shape of group['p:sp']) {
        const element = await this.parseShape(shape, slideRels, groupStyle);
        if (element) {
          // Apply group transform offset
          if (element.type !== 'line') {
            element.x = (element.x || 0) + combinedTransform.x;
            element.y = (element.y || 0) + combinedTransform.y;
          } else {
            const lineEl = element as any;
            if (lineEl.startPoint) {
              lineEl.startPoint.x += combinedTransform.x;
              lineEl.startPoint.y += combinedTransform.y;
            }
            if (lineEl.endPoint) {
              lineEl.endPoint.x += combinedTransform.x;
              lineEl.endPoint.y += combinedTransform.y;
            }
          }
          childElements.push(element);
        }
      }
    }
    
    // Parse pictures in group
    if (group['p:pic']) {
      for (const pic of group['p:pic']) {
        const element = await this.parsePicture(pic, slideRels);
        if (element) {
          element.x = (element.x || 0) + combinedTransform.x;
          element.y = (element.y || 0) + combinedTransform.y;
          childElements.push(element);
        }
      }
    }
    
    // Parse connector lines in group
    if (group['p:cxnSp']) {
      for (const connector of group['p:cxnSp']) {
        const element = await this.parseConnector(connector);
        if (element) {
          const lineEl = element as any;
          if (lineEl.startPoint) {
            lineEl.startPoint.x += combinedTransform.x;
            lineEl.startPoint.y += combinedTransform.y;
          }
          if (lineEl.endPoint) {
            lineEl.endPoint.x += combinedTransform.x;
            lineEl.endPoint.y += combinedTransform.y;
          }
          childElements.push(element);
        }
      }
    }
    
    // Parse nested groups
    if (group['p:grpSp']) {
      for (const nestedGroup of group['p:grpSp']) {
        const nestedElements = await this.parseGroupShape(nestedGroup, slideRels, combinedTransform);
        childElements.push(...nestedElements);
      }
    }
    
    // If we have child elements, create a group element
    if (childElements.length > 0) {
      // Calculate bounds of all children
      const bounds = this.calculateElementsBounds(childElements);
      
      const groupElement: any = {
        id: groupId,
        type: 'group',
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
        rotation: combinedTransform.rotation || 0,
        children: childElements.map(el => {
          // Make positions relative to group
          if (el.type === 'line') {
            const lineEl = el as any;
            return {
              ...lineEl,
              startPoint: {
                x: (lineEl.startPoint?.x || 0) - bounds.minX,
                y: (lineEl.startPoint?.y || 0) - bounds.minY
              },
              endPoint: {
                x: (lineEl.endPoint?.x || 0) - bounds.minX,
                y: (lineEl.endPoint?.y || 0) - bounds.minY
              }
            };
          }
          return {
            ...el,
            x: (el.x || 0) - bounds.minX,
            y: (el.y || 0) - bounds.minY
          };
        })
      };
      
      elements.push(groupElement);
    } else {
      // If no children, just return the flat list
      elements.push(...childElements);
    }
    
    return elements;
  }

  private checkIfWordArt(shape: any): boolean {
    // Check for WordArt style
    const spPr = shape['p:spPr']?.[0];
    const txBody = shape['p:txBody']?.[0];
    
    // Check for text effects that indicate WordArt
    if (spPr?.['a:effectLst']) return true;
    if (spPr?.['a:scene3d']) return true;
    if (txBody?.['a:bodyPr']?.[0]?.['a:prstTxWarp']) return true;
    
    // Check style reference
    const style = shape['p:style']?.[0];
    if (style?.['a:effectRef']) return true;
    
    return false;
  }

  private extractWordArtStyle(shape: any): any {
    const spPr = shape['p:spPr']?.[0];
    const txBody = shape['p:txBody']?.[0];
    const style: any = {};
    
    // Extract text warp/transform
    const prstTxWarp = txBody?.['a:bodyPr']?.[0]?.['a:prstTxWarp']?.[0];
    if (prstTxWarp) {
      style.warp = {
        type: prstTxWarp.$?.prst || 'none',
        avLst: prstTxWarp['a:avLst']?.[0],
      };
    }
    
    // Extract 3D effects
    const scene3d = spPr?.['a:scene3d']?.[0];
    if (scene3d) {
      style.scene3d = {
        camera: scene3d['a:camera']?.[0],
        lightRig: scene3d['a:lightRig']?.[0],
      };
    }
    
    // Extract effect list
    const effectLst = spPr?.['a:effectLst']?.[0];
    if (effectLst) {
      style.effects = this.parseEffectList(effectLst);
    }
    
    return style;
  }

  private extractTextEffects(spPr: any, txBody: any): any {
    const effects: any = {};
    
    // Shadow effect
    const shadow = spPr?.['a:effectLst']?.[0]?.['a:outerShdw']?.[0];
    if (shadow) {
      effects.shadow = {
        color: this.extractColor(shadow['a:srgbClr']?.[0] || shadow['a:schemeClr']?.[0]),
        blur: this.convertEmu(shadow.$?.blurRad || 0),
        offsetX: this.convertEmu(shadow.$?.distX || 0),
        offsetY: this.convertEmu(shadow.$?.distY || 0),
        opacity: (shadow.$?.algn || 100) / 100,
      };
    }
    
    // Reflection effect
    const reflection = spPr?.['a:effectLst']?.[0]?.['a:reflection']?.[0];
    if (reflection) {
      effects.reflection = {
        distance: this.convertEmu(reflection.$?.dist || 0),
        opacity: (reflection.$?.stA || 50) / 100,
        blur: this.convertEmu(reflection.$?.blurRad || 0),
      };
    }
    
    // Glow effect
    const glow = spPr?.['a:effectLst']?.[0]?.['a:glow']?.[0];
    if (glow) {
      effects.glow = {
        color: this.extractColor(glow['a:srgbClr']?.[0] || glow['a:schemeClr']?.[0]),
        radius: this.convertEmu(glow.$?.rad || 0),
        opacity: (glow['a:srgbClr']?.[0]?.['a:alpha']?.[0]?.$?.val || 100) / 100,
      };
    }
    
    return Object.keys(effects).length > 0 ? effects : undefined;
  }

  private extractImageEffects(spPr: any): any {
    const effects: any = {};
    
    // Extract all effects similar to text effects
    const effectLst = spPr?.['a:effectLst']?.[0];
    if (effectLst) {
      const parsedEffects = this.parseEffectList(effectLst);
      if (parsedEffects) {
        Object.assign(effects, parsedEffects);
      }
    }
    
    return Object.keys(effects).length > 0 ? effects : undefined;
  }

  private parseEffectList(effectLst: any): any {
    const effects: any = {};
    
    // Shadow
    if (effectLst['a:outerShdw']) {
      const shadow = effectLst['a:outerShdw'][0];
      effects.shadow = {
        color: this.extractColor(shadow['a:srgbClr']?.[0] || shadow['a:schemeClr']?.[0]),
        blur: this.convertEmu(shadow.$?.blurRad || 0),
        offsetX: this.convertEmu(shadow.$?.distX || 0),
        offsetY: this.convertEmu(shadow.$?.distY || 0),
      };
    }
    
    // Reflection
    if (effectLst['a:reflection']) {
      const reflection = effectLst['a:reflection'][0];
      effects.reflection = {
        distance: this.convertEmu(reflection.$?.dist || 0),
        opacity: (reflection.$?.stA || 50) / 100,
      };
    }
    
    // Glow
    if (effectLst['a:glow']) {
      const glow = effectLst['a:glow'][0];
      effects.glow = {
        color: this.extractColor(glow['a:srgbClr']?.[0] || glow['a:schemeClr']?.[0]),
        radius: this.convertEmu(glow.$?.rad || 0),
      };
    }
    
    // Soft edges
    if (effectLst['a:softEdge']) {
      effects.softEdges = this.convertEmu(effectLst['a:softEdge'][0].$?.rad || 0);
    }
    
    return effects;
  }

  private extractTextWithEffects(txBody: any): any {
    const result: any = {
      text: '',
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
    };
    
    const paragraphs = txBody['a:p'] || [];
    const textParts: string[] = [];
    
    for (const p of paragraphs) {
      if (p['a:r']) {
        for (const r of p['a:r']) {
          const text = r['a:t']?.[0];
          if (text) {
            textParts.push(text);
            
            // Extract text properties
            const rPr = r['a:rPr']?.[0];
            if (rPr) {
              if (rPr.$?.sz) {
                result.fontSize = parseInt(rPr.$.sz) / 100;
              }
              if (rPr.$?.b === '1') {
                result.bold = true;
              }
              if (rPr.$?.i === '1') {
                result.italic = true;
              }
              if (rPr.$?.u) {
                result.underline = true;
              }
              
              // Extract color
              const solidFill = rPr['a:solidFill']?.[0];
              if (solidFill) {
                result.color = this.extractColor(solidFill['a:srgbClr']?.[0] || solidFill['a:schemeClr']?.[0]);
              }
              
              // Extract font
              const latin = rPr['a:latin']?.[0];
              if (latin?.$?.typeface) {
                result.fontFamily = latin.$.typeface;
              }
            }
          }
        }
      }
      
      // Get paragraph properties
      const pPr = p['a:pPr']?.[0];
      if (pPr?.$?.algn) {
        result.align = pPr.$.algn === 'ctr' ? 'center' : pPr.$.algn === 'r' ? 'right' : 'left';
      }
    }
    
    result.text = textParts.join(' ');
    return result;
  }

  private extractTransform(spPr: any): any {
    const xfrm = spPr?.['a:xfrm']?.[0];
    const transform = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
    };
    
    if (xfrm) {
      const off = xfrm['a:off']?.[0]?.$;
      const ext = xfrm['a:ext']?.[0]?.$;
      
      if (off) {
        transform.x = this.convertEmu(parseInt(off.x || '0'));
        transform.y = this.convertEmu(parseInt(off.y || '0'));
      }
      
      if (ext) {
        transform.width = this.convertEmu(parseInt(ext.cx || '0'));
        transform.height = this.convertEmu(parseInt(ext.cy || '0'));
      }
      
      if (xfrm.$?.rot) {
        transform.rotation = parseInt(xfrm.$.rot) / 60000;
      }
    }
    
    return transform;
  }

  private extractShapeType(spPr: any): string {
    const prstGeom = spPr?.['a:prstGeom']?.[0];
    const prst = prstGeom?.$?.prst;
    
    console.log('Shape preset geometry:', prst);
    
    if (prst) {
      // Rectangle shapes
      if (prst === 'rect' || prst === 'roundRect' || prst === 'snip1Rect' || 
          prst === 'snip2SameRect' || prst === 'snip2DiagRect' || prst === 'snipRoundRect' ||
          prst === 'round1Rect' || prst === 'round2SameRect' || prst === 'round2DiagRect' ||
          prst === 'cube' || prst === 'bevel' || prst === 'frame') {
        return 'rectangle';
      }
      // Circle/Ellipse shapes
      if (prst === 'ellipse' || prst === 'circle' || prst === 'donut') {
        return 'circle';
      }
      // Triangle shapes
      if (prst === 'triangle' || prst === 'rtTriangle' || prst === 'isoscelesTriangle') {
        return 'triangle';
      }
      // Pie/Arc shapes
      if (prst === 'pie' || prst === 'arc' || prst === 'chord' || prst === 'blockArc') {
        return 'pie';
      }
      // Line shapes
      if (prst === 'line' || prst === 'straightConnector1' || prst === 'bentConnector2' || 
          prst === 'bentConnector3' || prst === 'bentConnector4' || prst === 'bentConnector5' ||
          prst === 'curvedConnector2' || prst === 'curvedConnector3' || prst === 'curvedConnector4' ||
          prst === 'curvedConnector5') {
        return 'line';
      }
      // Star shapes - treat as polygons/rectangles for now
      if (prst.includes('star') || prst === 'pentagon' || prst === 'hexagon' || 
          prst === 'octagon' || prst === 'decagon' || prst === 'dodecagon') {
        return 'rectangle'; // Simplify complex shapes to rectangle
      }
      // Arrow shapes - treat as rectangles for now
      if (prst.includes('arrow') || prst.includes('Arrow')) {
        return 'rectangle';
      }
      // Default to rectangle for other shapes
      console.log('Unknown shape type, defaulting to rectangle:', prst);
      return 'rectangle';
    }
    
    // Check if it's a custom path (freeform shape)
    const custGeom = spPr?.['a:custGeom']?.[0];
    if (custGeom) {
      // Try to parse as freeform/path shape
      console.log('Custom geometry (freeform) shape found');
      return 'freeform';
    }
    
    return 'rectangle';
  }

  private extractShapeStyle(spPr: any): ShapeStyle {
    const style: ShapeStyle = {};
    
    // Extract fill
    const solidFill = spPr?.['a:solidFill']?.[0];
    const gradFill = spPr?.['a:gradFill']?.[0];
    const pattFill = spPr?.['a:pattFill']?.[0];
    const blipFill = spPr?.['a:blipFill']?.[0];
    const noFill = spPr?.['a:noFill']?.[0];
    
    if (solidFill) {
      style.fill = {
        type: 'solid',
        color: this.extractColor(solidFill['a:srgbClr']?.[0] || solidFill['a:schemeClr']?.[0] || solidFill['a:prstClr']?.[0]),
      };
    } else if (gradFill) {
      style.fill = {
        type: 'gradient',
        gradient: this.extractGradient(gradFill),
      };
    } else if (pattFill) {
      style.fill = {
        type: 'pattern',
        color: this.extractColor(pattFill['a:fgClr']?.[0]),
      };
    } else if (!noFill) {
      // Default fill if no fill is specified
      style.fill = {
        type: 'solid',
        color: '#4285f4',
      };
    }
    
    // Extract stroke
    const ln = spPr?.['a:ln']?.[0];
    if (ln) {
      const lnSolidFill = ln['a:solidFill']?.[0];
      style.stroke = {
        color: lnSolidFill ? this.extractColor(lnSolidFill['a:srgbClr']?.[0] || lnSolidFill['a:schemeClr']?.[0]) : '#000000',
        width: ln.$?.w ? this.convertEmu(parseInt(ln.$.w)) : 1,
      };
      
      // Dash style
      const prstDash = ln['a:prstDash']?.[0];
      if (prstDash?.$?.val) {
        style.stroke.dashStyle = prstDash.$.val;
      }
    }
    
    // Extract effects
    const effectLst = spPr?.['a:effectLst']?.[0];
    if (effectLst) {
      style.effects = this.parseEffectList(effectLst);
    }
    
    return style;
  }

  private extractGradient(gradFill: any): any {
    const gradient: any = {
      type: 'linear',
      colors: [],
    };
    
    // Gradient type
    if (gradFill['a:lin']) {
      gradient.type = 'linear';
      const lin = gradFill['a:lin'][0];
      if (lin.$?.ang) {
        gradient.angle = parseInt(lin.$.ang) / 60000;
      }
    } else if (gradFill['a:path']) {
      gradient.type = 'radial';
    }
    
    // Gradient stops
    const gsLst = gradFill['a:gsLst']?.[0];
    if (gsLst?.['a:gs']) {
      for (const gs of gsLst['a:gs']) {
        const pos = parseInt(gs.$?.pos || '0') / 1000;
        const color = this.extractColor(gs['a:srgbClr']?.[0] || gs['a:schemeClr']?.[0]);
        gradient.colors.push({ color, position: pos / 100 });
      }
    }
    
    return gradient;
  }

  private extractColor(colorNode: any): string {
    if (!colorNode) return '#000000';
    
    // Handle direct RGB value
    if (colorNode.$?.val) {
      // RGB color - ensure it has the # prefix
      const val = colorNode.$.val;
      return val.startsWith('#') ? val : `#${val}`;
    }
    
    // Handle scheme/theme colors
    if (colorNode.$?.val === undefined) {
      // Check for preset color
      if (colorNode['a:prstClr']) {
        const prstClr = colorNode['a:prstClr'][0];
        if (prstClr.$?.val) {
          // Map preset colors to hex values
          const presetColors: Record<string, string> = {
            black: '#000000',
            white: '#FFFFFF',
            red: '#FF0000',
            green: '#00FF00',
            blue: '#0000FF',
            yellow: '#FFFF00',
            cyan: '#00FFFF',
            magenta: '#FF00FF',
            gray: '#808080',
            darkGray: '#404040',
            lightGray: '#C0C0C0',
          };
          return presetColors[prstClr.$.val] || '#000000';
        }
      }
      
      // Check theme reference
      if (colorNode.$?.theme) {
        const themeColors: Record<string, string> = {
          accent1: '#4472C4',
          accent2: '#ED7D31',
          accent3: '#A5A5A5',
          accent4: '#FFC000',
          accent5: '#5B9BD5',
          accent6: '#70AD47',
          tx1: '#000000',
          tx2: '#444444',
          bg1: '#FFFFFF',
          bg2: '#E7E6E6',
          dk1: '#000000',
          dk2: '#444444',
          lt1: '#FFFFFF',
          lt2: '#E7E6E6',
        };
        return themeColors[colorNode.$.theme] || '#000000';
      }
    }
    
    return '#000000';
  }
  
  private extractPieStartAngle(spPr: any): number {
    const prstGeom = spPr?.['a:prstGeom']?.[0];
    const avLst = prstGeom?.['a:avLst']?.[0];
    if (avLst?.['a:gd']) {
      for (const gd of avLst['a:gd']) {
        if (gd.$?.name === 'adj1' || gd.$?.name === 'startAngle') {
          return parseInt(gd.$.fmla?.replace('val ', '') || '0') / 60000;
        }
      }
    }
    return 0;
  }
  
  private extractPieEndAngle(spPr: any): number {
    const prstGeom = spPr?.['a:prstGeom']?.[0];
    const avLst = prstGeom?.['a:avLst']?.[0];
    if (avLst?.['a:gd']) {
      for (const gd of avLst['a:gd']) {
        if (gd.$?.name === 'adj2' || gd.$?.name === 'endAngle') {
          return parseInt(gd.$.fmla?.replace('val ', '') || '90') / 60000;
        }
      }
    }
    return 90;
  }
  
  private extractPieInnerRadius(spPr: any): number {
    const prstGeom = spPr?.['a:prstGeom']?.[0];
    const avLst = prstGeom?.['a:avLst']?.[0];
    if (avLst?.['a:gd']) {
      for (const gd of avLst['a:gd']) {
        if (gd.$?.name === 'adj3' || gd.$?.name === 'innerRadius') {
          return parseInt(gd.$.fmla?.replace('val ', '') || '0') / 1000;
        }
      }
    }
    return 0;
  }

  private extractBackground(slideData: any): string {
    const bg = slideData['p:sld']?.['p:cSld']?.[0]?.['p:bg']?.[0];
    if (!bg) return '#FFFFFF';
    
    const bgPr = bg['p:bgPr']?.[0];
    if (bgPr) {
      const solidFill = bgPr['a:solidFill']?.[0];
      if (solidFill) {
        return this.extractColor(solidFill['a:srgbClr']?.[0] || solidFill['a:schemeClr']?.[0]);
      }
    }
    
    return '#FFFFFF';
  }

  private extractSlideList(presentation: any): any[] {
    const sldIdLst = presentation['p:presentation']?.['p:sldIdLst']?.[0];
    if (!sldIdLst || !sldIdLst['p:sldId']) return [];
    
    return Array.isArray(sldIdLst['p:sldId']) 
      ? sldIdLst['p:sldId'] 
      : [sldIdLst['p:sldId']];
  }

  private convertEmu(emu: number): number {
    // Convert EMU to pixels (1 inch = 914400 EMU = 96 pixels)
    return Math.round(emu * 96 / 914400);
  }

  private calculateElementsBounds(elements: SlideElement[]): any {
    const bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };

    elements.forEach(el => {
      if (el.type === 'line') {
        const lineEl = el as any;
        bounds.minX = Math.min(bounds.minX, lineEl.startPoint?.x || 0, lineEl.endPoint?.x || 0);
        bounds.minY = Math.min(bounds.minY, lineEl.startPoint?.y || 0, lineEl.endPoint?.y || 0);
        bounds.maxX = Math.max(bounds.maxX, lineEl.startPoint?.x || 0, lineEl.endPoint?.x || 0);
        bounds.maxY = Math.max(bounds.maxY, lineEl.startPoint?.y || 0, lineEl.endPoint?.y || 0);
      } else {
        bounds.minX = Math.min(bounds.minX, el.x || 0);
        bounds.minY = Math.min(bounds.minY, el.y || 0);
        bounds.maxX = Math.max(bounds.maxX, (el.x || 0) + (el.width || 0));
        bounds.maxY = Math.max(bounds.maxY, (el.y || 0) + (el.height || 0));
      }
    });

    // Ensure valid bounds
    if (!isFinite(bounds.minX)) bounds.minX = 0;
    if (!isFinite(bounds.minY)) bounds.minY = 0;
    if (!isFinite(bounds.maxX)) bounds.maxX = 100;
    if (!isFinite(bounds.maxY)) bounds.maxY = 100;

    return bounds;
  }

  private parseCustomGeometry(custGeom: any, transform: any): string | null {
    try {
      // Parse path list from custom geometry
      const pathLst = custGeom['a:pathLst']?.[0];
      if (!pathLst || !pathLst['a:path']) return null;

      const paths = Array.isArray(pathLst['a:path']) ? pathLst['a:path'] : [pathLst['a:path']];
      const svgPaths: string[] = [];

      for (const path of paths) {
        const width = parseInt(path.$?.w || '0');
        const height = parseInt(path.$?.h || '0');
        
        // Scale factors from path coordinates to actual size
        const scaleX = transform.width / (width || 43200);
        const scaleY = transform.height / (height || 43200);

        let svgPath = '';
        let currentX = 0;
        let currentY = 0;

        // Parse move to
        if (path['a:moveTo']) {
          const moveTo = Array.isArray(path['a:moveTo']) ? path['a:moveTo'][0] : path['a:moveTo'];
          const pt = moveTo['a:pt']?.[0];
          if (pt?.$) {
            currentX = parseInt(pt.$.x || '0') * scaleX;
            currentY = parseInt(pt.$.y || '0') * scaleY;
            svgPath += `M ${currentX} ${currentY}`;
          }
        }

        // Parse line to
        if (path['a:lnTo']) {
          const lines = Array.isArray(path['a:lnTo']) ? path['a:lnTo'] : [path['a:lnTo']];
          for (const line of lines) {
            const pt = line['a:pt']?.[0];
            if (pt?.$) {
              currentX = parseInt(pt.$.x || '0') * scaleX;
              currentY = parseInt(pt.$.y || '0') * scaleY;
              svgPath += ` L ${currentX} ${currentY}`;
            }
          }
        }

        // Parse cubic bezier
        if (path['a:cubicBezTo']) {
          const curves = Array.isArray(path['a:cubicBezTo']) ? path['a:cubicBezTo'] : [path['a:cubicBezTo']];
          for (const curve of curves) {
            const pts = curve['a:pt'];
            if (pts && pts.length >= 3) {
              const cp1x = parseInt(pts[0].$.x || '0') * scaleX;
              const cp1y = parseInt(pts[0].$.y || '0') * scaleY;
              const cp2x = parseInt(pts[1].$.x || '0') * scaleX;
              const cp2y = parseInt(pts[1].$.y || '0') * scaleY;
              currentX = parseInt(pts[2].$.x || '0') * scaleX;
              currentY = parseInt(pts[2].$.y || '0') * scaleY;
              svgPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${currentX} ${currentY}`;
            }
          }
        }

        // Parse quadratic bezier
        if (path['a:quadBezTo']) {
          const curves = Array.isArray(path['a:quadBezTo']) ? path['a:quadBezTo'] : [path['a:quadBezTo']];
          for (const curve of curves) {
            const pts = curve['a:pt'];
            if (pts && pts.length >= 2) {
              const cpx = parseInt(pts[0].$.x || '0') * scaleX;
              const cpy = parseInt(pts[0].$.y || '0') * scaleY;
              currentX = parseInt(pts[1].$.x || '0') * scaleX;
              currentY = parseInt(pts[1].$.y || '0') * scaleY;
              svgPath += ` Q ${cpx} ${cpy}, ${currentX} ${currentY}`;
            }
          }
        }

        // Parse arc to
        if (path['a:arcTo']) {
          const arcs = Array.isArray(path['a:arcTo']) ? path['a:arcTo'] : [path['a:arcTo']];
          for (const arc of arcs) {
            const wR = parseInt(arc.$?.wR || '0') * scaleX;
            const hR = parseInt(arc.$?.hR || '0') * scaleY;
            const stAng = parseInt(arc.$?.stAng || '0') / 60000;
            const swAng = parseInt(arc.$?.swAng || '0') / 60000;
            
            // Convert arc to SVG arc command
            const endAngle = stAng + swAng;
            const startRad = stAng * Math.PI / 180;
            const endRad = endAngle * Math.PI / 180;
            
            const x1 = currentX + wR * Math.cos(startRad);
            const y1 = currentY + hR * Math.sin(startRad);
            const x2 = currentX + wR * Math.cos(endRad);
            const y2 = currentY + hR * Math.sin(endRad);
            
            const largeArc = Math.abs(swAng) > 180 ? 1 : 0;
            const sweep = swAng > 0 ? 1 : 0;
            
            svgPath += ` A ${wR} ${hR} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
            currentX = x2;
            currentY = y2;
          }
        }

        // Close path if specified
        if (path['a:close']) {
          svgPath += ' Z';
        }

        if (svgPath) {
          svgPaths.push(svgPath);
        }
      }

      return svgPaths.join(' ');
    } catch (error) {
      console.error('Error parsing custom geometry:', error);
      return null;
    }
  }

  private async getXmlContent(path: string): Promise<string | null> {
    if (!this.zip) return null;
    
    const file = this.zip.file(path);
    if (!file) return null;
    
    return await file.async('string');
  }

  private parseXml(xml: string): Promise<any> {
    return new Promise((resolve, reject) => {
      parseString(xml, { explicitArray: true }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
}