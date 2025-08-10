import JSZip from 'jszip';
import { Presentation, SlideElement } from '../types';

export class SimplePptxExporter {
  static async exportToPPTX(presentation: Presentation): Promise<void> {
    try {
      const zip = new JSZip();
      
      // Create all required files in correct order
      this.createContentTypes(zip, presentation);
      this.createMainRels(zip);
      this.createDocProps(zip, presentation);
      this.createPresentation(zip, presentation);
      this.createSlides(zip, presentation);
      this.createSlideMaster(zip);
      this.createSlideLayout(zip);
      this.createTheme(zip);
      
      // Generate and download
      const blob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE'
      });
      
      const fileName = `${presentation.title.replace(/[^a-z0-9]/gi, '_')}_export.pptx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('PPTX exported successfully:', fileName);
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }

  private static createContentTypes(zip: JSZip, presentation: Presentation): void {
    let content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`;

    // Add slide content types
    presentation.slides.forEach((_, index) => {
      content += `\n  <Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    });

    content += '\n</Types>';
    zip.file('[Content_Types].xml', content);
  }

  private static createMainRels(zip: JSZip): void {
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
    
    zip.folder('_rels')!.file('.rels', rels);
  }

  private static createDocProps(zip: JSZip, presentation: Presentation): void {
    const docProps = zip.folder('docProps')!;
    
    // App properties
    const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Slide App</Application>
  <Slides>${presentation.slides.length}</Slides>
  <ScaleCrop>false</ScaleCrop>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
</Properties>`;
    docProps.file('app.xml', app);

    // Core properties
    const now = new Date().toISOString();
    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${this.escapeXml(presentation.title)}</dc:title>
  <dc:creator>Slide App</dc:creator>
  <cp:lastModifiedBy>Slide App</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
    docProps.file('core.xml', core);
  }

  private static createPresentation(zip: JSZip, presentation: Presentation): void {
    const ppt = zip.folder('ppt')!;

    // Slide references
    let slideIdList = '';
    presentation.slides.forEach((_, index) => {
      slideIdList += `\n    <p:sldId id="${100 + index}" r:id="rId${index + 1}"/>`;
    });

    const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId${presentation.slides.length + 1}"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>${slideIdList}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
  <p:notesSz cx="6858000" cy="9144000"/>
  <p:defaultTextStyle>
    <a:defPPr>
      <a:defRPr lang="en-US"/>
    </a:defPPr>
  </p:defaultTextStyle>
</p:presentation>`;
    
    ppt.file('presentation.xml', presentationXml);

    // Presentation relationships
    let rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;
    
    presentation.slides.forEach((_, index) => {
      rels += `\n  <Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${index + 1}.xml"/>`;
    });
    
    rels += `\n  <Relationship Id="rId${presentation.slides.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId${presentation.slides.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;
    
    ppt.folder('_rels')!.file('presentation.xml.rels', rels);
  }

  private static createSlides(zip: JSZip, presentation: Presentation): void {
    const slidesFolder = zip.folder('ppt')!.folder('slides')!;
    const relsFolder = slidesFolder.folder('_rels')!;

    presentation.slides.forEach((slide, index) => {
      // Create shapes XML
      let shapes = '';
      let shapeId = 2; // Start from 2 (1 is reserved for group)

      slide.elements.forEach(element => {
        const shapeXml = this.createShape(element, shapeId++);
        if (shapeXml) {
          shapes += '\n      ' + shapeXml;
        }
      });

      const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidFill>
          <a:srgbClr val="${(slide.backgroundColor || slide.background || '#FFFFFF').replace('#', '')}"/>
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
      </p:grpSpPr>${shapes}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sld>`;

      slidesFolder.file(`slide${index + 1}.xml`, slideXml);

      // Slide relationships
      const slideRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
      
      relsFolder.file(`slide${index + 1}.xml.rels`, slideRels);
    });
  }

  private static createShape(element: SlideElement, id: number): string {
    const x = Math.max(0, Math.round((element.x || 0) * 9525)); // Convert to EMUs, ensure non-negative
    const y = Math.max(0, Math.round((element.y || 0) * 9525));
    const cx = Math.max(9525, Math.round((element.width || 100) * 9525)); // Minimum 1 pixel
    const cy = Math.max(9525, Math.round((element.height || 100) * 9525));

    if (element.type === 'text') {
      const text = (element as any).text || (element as any).content || '';
      if (!text.trim()) return ''; // Skip empty text boxes
      
      const fontSize = Math.max(100, Math.round((element.fontSize || 16) * 100)); // Minimum 1pt
      let color = ((element as any).fill || (element as any).color || '#000000');
      color = color.replace('#', '').toUpperCase().padStart(6, '0'); // Ensure 6-char hex
      
      const fontFamily = (element.fontFamily || 'Arial').replace(/[^a-zA-Z0-9\s]/g, ''); // Clean font name
      const isBold = element.fontWeight === 'bold' || element.fontWeight === '700' || element.fontWeight === 'bolder';
      const isItalic = element.fontStyle === 'italic' || element.fontStyle === 'oblique';
      
      return `<p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${id}" name="TextBox ${id}"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm rot="${Math.round((element.rotation || 0) * 60000)}">
            <a:off x="${x}" y="${y}"/>
            <a:ext cx="${cx}" cy="${cy}"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:noFill/>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="none" rtlCol="0" anchor="t">
            <a:spAutoFit/>
          </a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="${this.getTextAlign(element.textAlign || 'left')}"/>
            <a:r>
              <a:rPr lang="en-US" sz="${fontSize}" ${isBold ? 'b="1"' : ''} ${isItalic ? 'i="1"' : ''} ${element.textDecoration === 'underline' ? 'u="sng"' : ''}>
                <a:solidFill>
                  <a:srgbClr val="${color}"/>
                </a:solidFill>
                <a:latin typeface="${fontFamily}"/>
              </a:rPr>
              <a:t>${this.escapeXml(text)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>`;
    } 
    else if (element.type === 'shape') {
      let fillColor = ((element as any).fill || (element as any).fillColor || '#4285f4');
      fillColor = fillColor.replace('#', '').toUpperCase().padStart(6, '0');
      
      let strokeColor = ((element as any).stroke || (element as any).strokeColor || '#333333');
      strokeColor = strokeColor.replace('#', '').toUpperCase().padStart(6, '0');
      
      const strokeWidth = Math.max(0, Math.round((element.strokeWidth || 2) * 9525));
      const prst = this.getShapePreset(element.shapeType || 'rectangle');
      
      return `<p:sp>
        <p:nvSpPr>
          <p:cNvPr id="${id}" name="${element.shapeType || 'Shape'} ${id}"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm rot="${Math.round((element.rotation || 0) * 60000)}">
            <a:off x="${x}" y="${y}"/>
            <a:ext cx="${cx}" cy="${cy}"/>
          </a:xfrm>
          <a:prstGeom prst="${prst}">
            <a:avLst/>
          </a:prstGeom>
          <a:solidFill>
            <a:srgbClr val="${fillColor}"/>
          </a:solidFill>
          ${strokeWidth > 0 ? `<a:ln w="${strokeWidth}">
            <a:solidFill>
              <a:srgbClr val="${strokeColor}"/>
            </a:solidFill>
          </a:ln>` : ''}
        </p:spPr>
      </p:sp>`;
    }
    else if (element.type === 'line') {
      let strokeColor = (element.stroke || '#333333');
      strokeColor = strokeColor.replace('#', '').toUpperCase().padStart(6, '0');
      const strokeWidth = Math.max(9525, Math.round((element.strokeWidth || 2) * 9525)); // Minimum 1pt
      
      // Calculate line bounds from start/end points if available
      let lineX = x, lineY = y, lineCx = cx, lineCy = cy;
      if (element.startPoint && element.endPoint) {
        const x1 = Math.round(element.startPoint.x * 9525);
        const y1 = Math.round(element.startPoint.y * 9525);
        const x2 = Math.round(element.endPoint.x * 9525);
        const y2 = Math.round(element.endPoint.y * 9525);
        
        lineX = Math.min(x1, x2);
        lineY = Math.min(y1, y2);
        lineCx = Math.max(9525, Math.abs(x2 - x1));
        lineCy = Math.max(9525, Math.abs(y2 - y1));
      }
      
      return `<p:cxnSp>
        <p:nvCxnSpPr>
          <p:cNvPr id="${id}" name="Line ${id}"/>
          <p:cNvCxnSpPr/>
          <p:nvPr/>
        </p:nvCxnSpPr>
        <p:spPr>
          <a:xfrm rot="${Math.round((element.rotation || 0) * 60000)}">
            <a:off x="${lineX}" y="${lineY}"/>
            <a:ext cx="${lineCx}" cy="${lineCy}"/>
          </a:xfrm>
          <a:prstGeom prst="line">
            <a:avLst/>
          </a:prstGeom>
          <a:ln w="${strokeWidth}" cap="rnd">
            <a:solidFill>
              <a:srgbClr val="${strokeColor}"/>
            </a:solidFill>
            <a:prstDash val="solid"/>
          </a:ln>
        </p:spPr>
      </p:cxnSp>`;
    }

    return '';
  }

  private static getShapePreset(shapeType: string): string {
    const shapeMap: { [key: string]: string } = {
      'rectangle': 'rect',
      'roundedRectangle': 'roundRect',
      'circle': 'ellipse',
      'ellipse': 'ellipse',
      'triangle': 'triangle',
      'diamond': 'diamond',
      'pentagon': 'pentagon',
      'hexagon': 'hexagon',
      'octagon': 'octagon',
      'trapezoid': 'trapezoid',
      'parallelogram': 'parallelogram',
      'arrow': 'rightArrow',
      'rightArrow': 'rightArrow',
      'leftArrow': 'leftArrow',
      'upArrow': 'upArrow',
      'downArrow': 'downArrow',
      'quadArrow': 'quadArrow',
      'bentArrow': 'bentArrow',
      'uTurnArrow': 'uturnArrow',
      'star4': 'star4',
      'star5': 'star5',
      'star6': 'star6',
      'star8': 'star8',
      'plus': 'plus',
      'heart': 'heart',
      'moon': 'moon',
      'sun': 'sun',
      'cloud': 'cloud',
      'pie': 'pie'
    };
    
    return shapeMap[shapeType] || 'rect';
  }

  private static createSlideMaster(zip: JSZip): void {
    const masterFolder = zip.folder('ppt')!.folder('slideMasters')!;
    
    const slideMaster = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
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
          <a:ext cx="9144000" cy="6858000"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="9144000" cy="6858000"/>
        </a:xfrm>
      </p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle>
      <a:lvl1pPr>
        <a:defRPr sz="4400" kern="1200">
          <a:solidFill>
            <a:schemeClr val="tx1"/>
          </a:solidFill>
          <a:latin typeface="+mj-lt"/>
        </a:defRPr>
      </a:lvl1pPr>
    </p:titleStyle>
    <p:bodyStyle>
      <a:lvl1pPr>
        <a:defRPr sz="2800">
          <a:solidFill>
            <a:schemeClr val="tx1"/>
          </a:solidFill>
          <a:latin typeface="+mn-lt"/>
        </a:defRPr>
      </a:lvl1pPr>
    </p:bodyStyle>
  </p:txStyles>
</p:sldMaster>`;
    
    masterFolder.file('slideMaster1.xml', slideMaster);

    const masterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;
    
    masterFolder.folder('_rels')!.file('slideMaster1.xml.rels', masterRels);
  }

  private static createSlideLayout(zip: JSZip): void {
    const layoutFolder = zip.folder('ppt')!.folder('slideLayouts')!;
    
    const slideLayout = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
  <p:cSld name="Blank">
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
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sldLayout>`;
    
    layoutFolder.file('slideLayout1.xml', slideLayout);

    const layoutRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;
    
    layoutFolder.folder('_rels')!.file('slideLayout1.xml.rels', layoutRels);
  }

  private static createTheme(zip: JSZip): void {
    const themeFolder = zip.folder('ppt')!.folder('theme')!;
    
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
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri"/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs>
            <a:gs pos="35000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="300000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="15000"/><a:satMod val="350000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="16200000" scaled="1"/>
        </a:gradFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:shade val="51000"/><a:satMod val="130000"/></a:schemeClr></a:gs>
            <a:gs pos="80000"><a:schemeClr val="phClr"><a:shade val="93000"/><a:satMod val="130000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="94000"/><a:satMod val="135000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="16200000" scaled="0"/>
        </a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr">
          <a:solidFill><a:schemeClr val="phClr"><a:shade val="95000"/><a:satMod val="105000"/></a:schemeClr></a:solidFill>
          <a:prstDash val="solid"/>
        </a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr">
          <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
          <a:prstDash val="solid"/>
        </a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr">
          <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
          <a:prstDash val="solid"/>
        </a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle>
          <a:effectLst>
            <a:outerShdw blurRad="40000" dist="20000" dir="5400000" rotWithShape="0">
              <a:srgbClr val="000000"><a:alpha val="38000"/></a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </a:effectStyle>
        <a:effectStyle>
          <a:effectLst>
            <a:outerShdw blurRad="40000" dist="23000" dir="5400000" rotWithShape="0">
              <a:srgbClr val="000000"><a:alpha val="35000"/></a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </a:effectStyle>
        <a:effectStyle>
          <a:effectLst>
            <a:outerShdw blurRad="40000" dist="23000" dir="5400000" rotWithShape="0">
              <a:srgbClr val="000000"><a:alpha val="35000"/></a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
          <a:scene3d>
            <a:camera prst="orthographicFront">
              <a:rot lat="0" lon="0" rev="0"/>
            </a:camera>
            <a:lightRig rig="threePt" dir="t">
              <a:rot lat="0" lon="0" rev="1200000"/>
            </a:lightRig>
          </a:scene3d>
          <a:sp3d>
            <a:bevelT w="63500" h="25400"/>
          </a:sp3d>
        </a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="40000"/><a:satMod val="350000"/></a:schemeClr></a:gs>
            <a:gs pos="40000"><a:schemeClr val="phClr"><a:tint val="45000"/><a:shade val="99000"/><a:satMod val="350000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="20000"/><a:satMod val="255000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:path path="circle"><a:fillToRect l="50000" t="-80000" r="50000" b="180000"/></a:path>
        </a:gradFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="80000"/><a:satMod val="300000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="30000"/><a:satMod val="200000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>
        </a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;
    
    themeFolder.file('theme1.xml', theme);
  }

  private static getTextAlign(align: string): string {
    switch (align?.toLowerCase()) {
      case 'center': return 'ctr';
      case 'right': return 'r';
      case 'justify': return 'just';
      default: return 'l'; // left
    }
  }

  private static escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}