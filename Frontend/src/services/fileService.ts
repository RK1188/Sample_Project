import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { Presentation, Slide, FileImportResult, TextElement, ShapeElement } from '../types';
import { AdvancedPptxParser } from './advancedPptxParser';

export class FileService {
  static async importFile(file: File): Promise<FileImportResult> {
    try {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      
      switch (fileExtension) {
        case 'pptx':
          return await this.importPPTX(file);
        case 'odp':
          return await this.importODP(file);
        default:
          return {
            success: false,
            error: 'Unsupported file format. Please upload a .pptx or .odp file.'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to import file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async importPPTX(file: File): Promise<FileImportResult> {
    try {
      // Use advanced parser for better WordArt and effects support
      const parser = new AdvancedPptxParser();
      const slides = await parser.parsePptx(file);
      
      const presentation: Presentation = {
        id: uuidv4(),
        title: file.name.replace(/\.pptx$/i, ''),
        slides: slides,
        currentSlideIndex: 0,
        theme: {
          name: 'Default',
          primaryColor: '#4472C4',
          secondaryColor: '#ED7D31',
          backgroundColor: '#FFFFFF',
          textColor: '#000000'
        },
        metadata: {
          author: 'Unknown',
          createdAt: new Date(),
          updatedAt: new Date(),
          version: '1.0.0'
        }
      };
      
      return {
        success: true,
        presentation
      };
    } catch (error) {
      // Fallback to basic parser if advanced parser fails
      try {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        const presentation = await this.parsePPTXStructure(zipContent);
        
        return {
          success: true,
          presentation,
          warnings: ['Some advanced features like WordArt may not be fully supported']
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `Failed to parse PPTX file: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  }

  private static async importODP(file: File): Promise<FileImportResult> {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      // Parse presentation structure
      const presentation = await this.parseODPStructure(zipContent);
      
      return {
        success: true,
        presentation
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse ODP file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async parsePPTXStructure(zip: JSZip): Promise<Presentation> {
    const slides: Slide[] = [];
    let presentationTitle = 'Imported Presentation';
    
    // Get app.xml for presentation metadata
    const appXml = zip.file('docProps/app.xml');
    if (appXml) {
      const appContent = await appXml.async('text');
      const titleMatch = appContent.match(/<dc:title>(.*?)<\/dc:title>/);
      if (titleMatch) {
        presentationTitle = titleMatch[1];
      }
    }

    // Parse slides from ppt/slides/ directory
    const slideFiles = Object.keys(zip.files).filter(path => 
      path.startsWith('ppt/slides/slide') && path.endsWith('.xml')
    );

    for (const slideFile of slideFiles.sort()) {
      const slideXml = zip.file(slideFile);
      if (slideXml) {
        const slideContent = await slideXml.async('text');
        const slide = await this.parsePPTXSlide(slideContent, slideFiles.indexOf(slideFile));
        slides.push(slide);
      }
    }

    // If no slides were found, create a default empty slide
    if (slides.length === 0) {
      slides.push(this.createEmptySlide(0));
    }

    return {
      id: uuidv4(),
      title: presentationTitle,
      slides,
      currentSlideIndex: 0,
      theme: {
        name: 'Imported Theme',
        primaryColor: '#4285f4',
        secondaryColor: '#34a853',
        backgroundColor: '#ffffff',
        textColor: '#333333'
      },
      metadata: {
        author: 'Imported',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0'
      }
    };
  }

  private static async parseODPStructure(zip: JSZip): Promise<Presentation> {
    const slides: Slide[] = [];
    let presentationTitle = 'Imported ODP Presentation';
    
    // Parse content.xml for slides
    const contentXml = zip.file('content.xml');
    if (contentXml) {
      const contentText = await contentXml.async('text');
      const slideElements = this.parseODPContent(contentText);
      slides.push(...slideElements);
    }

    // If no slides were found, create a default empty slide
    if (slides.length === 0) {
      slides.push(this.createEmptySlide(0));
    }

    return {
      id: uuidv4(),
      title: presentationTitle,
      slides,
      currentSlideIndex: 0,
      theme: {
        name: 'Imported ODP Theme',
        primaryColor: '#4285f4',
        secondaryColor: '#34a853',
        backgroundColor: '#ffffff',
        textColor: '#333333'
      },
      metadata: {
        author: 'Imported',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0.0'
      }
    };
  }

  private static async parsePPTXSlide(slideContent: string, index: number): Promise<Slide> {
    const slide: Slide = {
      id: uuidv4(),
      title: `Slide ${index + 1}`,
      elements: [],
      backgroundColor: '#ffffff',
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Parse text elements
    const textRegex = /<a:t>(.*?)<\/a:t>/g;
    let match;
    let elementIndex = 0;
    
    while ((match = textRegex.exec(slideContent)) !== null) {
      if (match[1].trim()) {
        const textElement: TextElement = {
          id: uuidv4(),
          type: 'text',
          content: match[1],
          transform: {
            x: 100 + (elementIndex * 50),
            y: 100 + (elementIndex * 50),
            rotation: 0,
            scaleX: 1,
            scaleY: 1
          },
          size: {
            width: 400,
            height: 50
          },
          fontSize: 16,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          color: '#333333',
          zIndex: elementIndex,
          visible: true,
          locked: false,
          selected: false
        };
        
        slide.elements.push(textElement);
        elementIndex++;
      }
    }

    return slide;
  }

  private static parseODPContent(content: string): Slide[] {
    const slides: Slide[] = [];
    
    // Basic parsing for ODP - this is a simplified version
    // In a real implementation, you'd need to parse the OpenDocument XML structure more thoroughly
    const drawPageRegex = /<draw:page[^>]*>(.*?)<\/draw:page>/g;
    let pageMatch;
    let slideIndex = 0;
    
    while ((pageMatch = drawPageRegex.exec(content)) !== null) {
      const slide: Slide = {
        id: uuidv4(),
        title: `Slide ${slideIndex + 1}`,
        elements: [],
        backgroundColor: '#ffffff',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Parse text content
      const textRegex = /<text:p[^>]*>(.*?)<\/text:p>/g;
      let textMatch;
      let elementIndex = 0;
      
      while ((textMatch = textRegex.exec(pageMatch[1])) !== null) {
        if (textMatch[1].trim()) {
          const textElement: TextElement = {
            id: uuidv4(),
            type: 'text',
            content: textMatch[1].replace(/<[^>]*>/g, ''), // Remove XML tags
            transform: {
              x: 100 + (elementIndex * 50),
              y: 100 + (elementIndex * 50),
              rotation: 0,
              scaleX: 1,
              scaleY: 1
            },
            size: {
              width: 400,
              height: 50
            },
            fontSize: 16,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textAlign: 'left',
            color: '#333333',
            zIndex: elementIndex,
            visible: true,
            locked: false,
            selected: false
          };
          
          slide.elements.push(textElement);
          elementIndex++;
        }
      }
      
      slides.push(slide);
      slideIndex++;
    }
    
    return slides;
  }

  private static createEmptySlide(index: number): Slide {
    return {
      id: uuidv4(),
      title: `Slide ${index + 1}`,
      elements: [],
      backgroundColor: '#ffffff',
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Export functionality
  static async exportToPPTX(presentation: Presentation): Promise<Blob> {
    // This is a simplified export - in a real implementation you'd use a library like PptxGenJS
    const zip = new JSZip();
    
    // Create basic PPTX structure
    zip.file('[Content_Types].xml', this.generateContentTypesXML());
    zip.file('_rels/.rels', this.generateRelsXML());
    zip.file('ppt/_rels/presentation.xml.rels', this.generatePresentationRelsXML());
    zip.file('ppt/presentation.xml', this.generatePresentationXML(presentation));
    
    // Add slides
    presentation.slides.forEach((slide, index) => {
      zip.file(`ppt/slides/slide${index + 1}.xml`, this.generateSlideXML(slide));
      zip.file(`ppt/slides/_rels/slide${index + 1}.xml.rels`, this.generateSlideRelsXML());
    });

    return await zip.generateAsync({ type: 'blob' });
  }

  private static generateContentTypesXML(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
</Types>`;
  }

  private static generateRelsXML(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
  }

  private static generatePresentationRelsXML(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`;
  }

  private static generatePresentationXML(presentation: Presentation): string {
    const slideIds = presentation.slides.map((_, index) => 
      `<p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`
    ).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${slideIds}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
</p:presentation>`;
  }

  private static generateSlideXML(slide: Slide): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sld>`;
  }

  private static generateSlideRelsXML(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;
  }
}