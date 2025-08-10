import JSZip from 'jszip';
import { Presentation, SlideElement } from '../types';

export class PptxExportService {
  static async exportToPPTX(presentation: Presentation): Promise<void> {
    try {
      const zip = new JSZip();
      
      // Create the basic PPTX structure
      this.createContentTypes(zip);
      this.createRels(zip);
      this.createApp(zip, presentation);
      this.createCore(zip, presentation);
      this.createPresentation(zip, presentation);
      this.createSlides(zip, presentation);
      this.createTheme(zip);
      
      // Generate the PPTX file
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Download the file
      const fileName = `${presentation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pptx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Presentation exported to PPTX successfully:', fileName);
    } catch (error) {
      console.error('Error exporting presentation:', error);
      throw new Error('Failed to export presentation to PPTX');
    }
  }
  
  private static createContentTypes(zip: JSZip): void {
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;
    zip.file('[Content_Types].xml', contentTypes);
  }
  
  private static createRels(zip: JSZip): void {
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
    zip.folder('_rels')!.file('.rels', rels);
  }
  
  private static createApp(zip: JSZip, presentation: Presentation): void {
    const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Presentation App</Application>
  <Slides>${presentation.slides.length}</Slides>
  <ScaleCrop>false</ScaleCrop>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
</Properties>`;
    zip.folder('docProps')!.file('app.xml', app);
  }
  
  private static createCore(zip: JSZip, presentation: Presentation): void {
    const now = new Date().toISOString();
    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${presentation.title}</dc:title>
  <dc:creator>${presentation.metadata?.author || 'Presentation App'}</dc:creator>
  <cp:lastModifiedBy>${presentation.metadata?.author || 'Presentation App'}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
    zip.folder('docProps')!.file('core.xml', core);
  }
  
  private static createPresentation(zip: JSZip, presentation: Presentation): void {
    const pptFolder = zip.folder('ppt')!;
    
    // Create slide references
    let slideRefs = '';
    presentation.slides.forEach((_, index) => {
      slideRefs += `<p:sldId id="${100 + index}" r:id="rId${index + 1}"/>`;
    });
    
    const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId${presentation.slides.length + 1}"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${slideRefs}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;
    
    pptFolder.file('presentation.xml', presentationXml);
    
    // Create presentation relationships
    let presentationRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
    
    presentation.slides.forEach((_, index) => {
      presentationRels += `
  <Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`;
    });
    
    presentationRels += `
  <Relationship Id="rId${presentation.slides.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId${presentation.slides.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;
    
    pptFolder.folder('_rels')!.file('presentation.xml.rels', presentationRels);
  }
  
  private static createSlides(zip: JSZip, presentation: Presentation): void {
    const pptFolder = zip.folder('ppt')!;
    const slidesFolder = pptFolder.folder('slides')!;
    const slidesRelsFolder = slidesFolder.folder('_rels')!;
    
    // Update content types for slides - fix async issue
    let contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`;
    
    presentation.slides.forEach((_, index) => {
      contentTypesXml += `\n  <Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    });
    
    contentTypesXml += '\n</Types>';
    zip.file('[Content_Types].xml', contentTypesXml);
    
    presentation.slides.forEach((slide, index) => {
      // Create slide XML
      let shapes = '';
      let shapeId = 1;
      
      slide.elements.forEach(element => {
        shapes += this.createShape(element, shapeId++);
      });
      
      const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidFill>
          <a:srgbClr val="${(slide.backgroundColor || '#FFFFFF').replace('#', '')}"/>
        </a:solidFill>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="9144000" cy="6858000"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="9144000" cy="6858000"/>
        </a:xfrm>
      </p:grpSpPr>
      ${shapes}
    </p:spTree>
  </p:cSld>
</p:sld>`;
      
      slidesFolder.file(`slide${index + 1}.xml`, slideXml);
      
      // Create slide relationship
      const slideRel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
      
      slidesRelsFolder.file(`slide${index + 1}.xml.rels`, slideRel);
    });
  }
  
  private static createShape(element: SlideElement, id: number): string {
    const x = (element.x || 0) * 9525; // Convert to EMUs
    const y = (element.y || 0) * 9525;
    const cx = (element.width || 100) * 9525;
    const cy = (element.height || 100) * 9525;
    
    if (element.type === 'text' || element.type === 'wordart') {
      const text = (element as any).text || (element as any).content || '';
      const fontSize = (element.fontSize || 16) * 100;
      const color = ((element as any).fill || (element as any).color || '#000000').replace('#', '');
      
      return `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${id}" name="TextBox ${id}"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm rot="${(element.rotation || 0) * 60000}">
            <a:off x="${x}" y="${y}"/>
            <a:ext cx="${cx}" cy="${cy}"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square" rtlCol="0">
            <a:spAutoFit/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="en-US" sz="${fontSize}">
                <a:solidFill>
                  <a:srgbClr val="${color}"/>
                </a:solidFill>
              </a:rPr>
              <a:t>${this.escapeXml(text)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;
    } else if (element.type === 'shape') {
      const fillColor = ((element as any).fill || (element as any).fillColor || '#4285f4').replace('#', '');
      const strokeColor = ((element as any).stroke || (element as any).strokeColor || '#333333').replace('#', '');
      const strokeWidth = (element.strokeWidth || 2) * 9525;
      
      // Map shape types to PowerPoint preset geometries
      let prst = this.getShapePreset(element.shapeType || 'rectangle');
      
      return `
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${id}" name="Shape ${id}"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm rot="${(element.rotation || 0) * 60000}">
            <a:off x="${x}" y="${y}"/>
            <a:ext cx="${cx}" cy="${cy}"/>
          </a:xfrm>
          <a:prstGeom prst="${prst}">
            <a:avLst/>
          </a:prstGeom>
          <a:solidFill>
            <a:srgbClr val="${fillColor}"/>
          </a:solidFill>
          <a:ln w="${strokeWidth}">
            <a:solidFill>
              <a:srgbClr val="${strokeColor}"/>
            </a:solidFill>
          </a:ln>
        </p:spPr>
      </p:sp>`;
    } else if (element.type === 'line') {
      const x1 = (element.startPoint?.x || 0) * 9525;
      const y1 = (element.startPoint?.y || 0) * 9525;
      const x2 = (element.endPoint?.x || 100) * 9525;
      const y2 = (element.endPoint?.y || 100) * 9525;
      const strokeColor = (element.stroke || '#333333').replace('#', '');
      const strokeWidth = (element.strokeWidth || 2) * 9525;
      
      return `
      <p:cxnSp>
        <p:nvCxnSpPr>
          <p:cNvPr id="${id}" name="Line ${id}"/>
          <p:cNvCxnSpPr/>
          <p:nvPr/>
        </p:nvCxnSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="${Math.min(x1, x2)}" y="${Math.min(y1, y2)}"/>
            <a:ext cx="${Math.abs(x2 - x1)}" cy="${Math.abs(y2 - y1)}"/>
          </a:xfrm>
          <a:prstGeom prst="line">
            <a:avLst/>
          </a:prstGeom>
          <a:ln w="${strokeWidth}">
            <a:solidFill>
              <a:srgbClr val="${strokeColor}"/>
            </a:solidFill>
          </a:ln>
        </p:spPr>
      </p:cxnSp>`;
    } else if (element.type === 'group' && element.children) {
      // Handle groups by creating individual shapes for children
      let groupShapes = '';
      element.children.forEach((child, index) => {
        // Adjust child positions relative to group
        const childWithAbsolutePos = {
          ...child,
          x: (element.x || 0) + (child.x || 0),
          y: (element.y || 0) + (child.y || 0)
        };
        groupShapes += this.createShape(childWithAbsolutePos, id + index + 100);
      });
      return groupShapes;
    }
    
    return '';
  }
  
  private static createTheme(zip: JSZip): void {
    const theme = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        <a:latin typeface="Calibri Light"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1"/>
        <a:gradFill rotWithShape="1"/>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1"/>
        <a:gradFill rotWithShape="1"/>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;
    
    zip.folder('ppt')!.folder('theme')!.file('theme1.xml', theme);
    
    // Create slide master and layout
    this.createSlideMaster(zip);
    this.createSlideLayout(zip);
  }
  
  private static createSlideMaster(zip: JSZip): void {
    const slideMaster = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`;
    
    const folder = zip.folder('ppt')!.folder('slideMasters')!;
    folder.file('slideMaster1.xml', slideMaster);
    
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;
    
    folder.folder('_rels')!.file('slideMaster1.xml.rels', rels);
  }
  
  private static createSlideLayout(zip: JSZip): void {
    const slideLayout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sldLayout>`;
    
    const folder = zip.folder('ppt')!.folder('slideLayouts')!;
    folder.file('slideLayout1.xml', slideLayout);
    
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;
    
    folder.folder('_rels')!.file('slideLayout1.xml.rels', rels);
  }
  
  private static getShapePreset(shapeType: string): string {
    // Map custom shape types to PowerPoint preset geometries
    const shapeMap: { [key: string]: string } = {
      // Basic shapes
      'rectangle': 'rect',
      'roundedRectangle': 'roundRect',
      'circle': 'ellipse',
      'ellipse': 'ellipse',
      'triangle': 'triangle',
      'rightTriangle': 'rtTriangle',
      'diamond': 'diamond',
      'pentagon': 'pentagon',
      'hexagon': 'hexagon',
      'octagon': 'octagon',
      'trapezoid': 'trapezoid',
      'parallelogram': 'parallelogram',
      
      // Arrows
      'arrow': 'rightArrow',
      'rightArrow': 'rightArrow',
      'leftArrow': 'leftArrow',
      'upArrow': 'upArrow',
      'downArrow': 'downArrow',
      'doubleArrow': 'leftRightArrow',
      'upDownArrow': 'upDownArrow',
      'quadArrow': 'quadArrow',
      'bentArrow': 'bentArrow',
      'uTurnArrow': 'uturnArrow',
      
      // Callouts
      'speechBubble': 'wedgeRectCallout',
      'thoughtBubble': 'cloudCallout',
      'roundedRectCallout': 'wedgeRoundRectCallout',
      'ovalCallout': 'wedgeEllipseCallout',
      
      // Stars
      'star4': 'star4',
      'star5': 'star5',
      'star6': 'star6',
      'star8': 'star8',
      
      // Symbols
      'plus': 'plus',
      'minus': 'minus',
      'multiply': 'mult',
      'divide': 'div',
      'equal': 'equal',
      'heart': 'heart',
      'lightningBolt': 'lightningBolt',
      'sun': 'sun',
      'moon': 'moon',
      'cloud': 'cloud',
      'smileyFace': 'smiley',
      'donut': 'donut',
      
      // Flowchart
      'flowchartProcess': 'rect',
      'flowchartDecision': 'diamond',
      'flowchartData': 'parallelogram',
      'flowchartDocument': 'curvedDownArrow',
      'flowchartTerminator': 'roundRect',
      'flowchartConnector': 'ellipse',
      
      // Special
      'pie': 'pie',
      'arc': 'arc'
    };
    
    return shapeMap[shapeType] || 'rect';
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}