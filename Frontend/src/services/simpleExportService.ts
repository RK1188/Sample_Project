import { Presentation } from '../types';

export class SimpleExportService {
  static async exportToJSON(presentation: Presentation): Promise<void> {
    try {
      // Convert presentation to JSON
      const jsonString = JSON.stringify(presentation, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Generate filename
      const fileName = `${presentation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Presentation exported successfully:', fileName);
    } catch (error) {
      console.error('Error exporting presentation:', error);
      throw new Error('Failed to export presentation');
    }
  }
  
  static async exportToHTML(presentation: Presentation): Promise<void> {
    try {
      // Generate HTML content
      let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${presentation.title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
    }
    .slide {
      width: 960px;
      height: 540px;
      margin: 20px auto;
      background: white;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .slide-element {
      position: absolute;
    }
    .text-element {
      padding: 10px;
    }
    .shape-element {
      border: 2px solid;
    }
    .circle {
      border-radius: 50%;
    }
    h1 {
      text-align: center;
      color: #333;
      padding: 20px;
    }
    @media print {
      .slide {
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <h1>${presentation.title}</h1>
`;

      // Add each slide
      presentation.slides.forEach((slide, index) => {
        htmlContent += `
  <div class="slide" style="background: ${slide.backgroundColor || '#ffffff'};">
    <h2 style="position: absolute; top: 10px; left: 10px; font-size: 14px; color: #666;">Slide ${index + 1}</h2>
`;
        
        // Add elements
        slide.elements.forEach(element => {
          const style = `
            left: ${element.x || 0}px;
            top: ${element.y || 0}px;
            width: ${element.width || 100}px;
            height: ${element.height || 100}px;
            transform: rotate(${element.rotation || 0}deg);
            opacity: ${element.opacity || 1};
          `;
          
          if (element.type === 'text' || element.type === 'wordart') {
            const textStyle = `
              font-size: ${element.fontSize || 16}px;
              font-family: ${element.fontFamily || 'Arial'};
              color: ${(element as any).fill || (element as any).color || '#000'};
              text-align: ${element.textAlign || 'left'};
              font-weight: ${element.fontWeight || 'normal'};
              font-style: ${element.fontStyle || 'normal'};
            `;
            htmlContent += `
    <div class="slide-element text-element" style="${style} ${textStyle}">
      ${(element as any).text || (element as any).content || ''}
    </div>
`;
          } else if (element.type === 'shape') {
            const shapeClass = element.shapeType === 'circle' ? 'circle' : '';
            const shapeStyle = `
              background: ${(element as any).fill || (element as any).fillColor || '#4285f4'};
              border-color: ${(element as any).stroke || (element as any).strokeColor || '#333'};
              border-width: ${element.strokeWidth || 2}px;
              border-radius: ${element.cornerRadius || 0}px;
            `;
            htmlContent += `
    <div class="slide-element shape-element ${shapeClass}" style="${style} ${shapeStyle}"></div>
`;
          } else if (element.type === 'image' && element.src) {
            htmlContent += `
    <img class="slide-element" src="${element.src}" alt="${element.alt || ''}" style="${style}" />
`;
          }
        });
        
        htmlContent += `
  </div>
`;
      });

      htmlContent += `
</body>
</html>
`;

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const fileName = `${presentation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.html`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Presentation exported to HTML successfully:', fileName);
    } catch (error) {
      console.error('Error exporting presentation:', error);
      throw new Error('Failed to export presentation to HTML');
    }
  }
}