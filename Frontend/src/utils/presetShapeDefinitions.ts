/**
 * PowerPoint PPTX Preset Shape Definitions
 * Replicates the presetShapeDefinition.xml connection sites and guide formulas
 * Based on Microsoft PowerPoint's internal connector routing logic
 */

import { Point } from '../types';

// Connection site definition based on PPTX <cxnLst> nodes
export interface ConnectionSite {
  id: string;
  x: string; // Formula expression (e.g., "l", "r", "hc", "wd2")
  y: string; // Formula expression (e.g., "t", "b", "vc", "hd2") 
  angle?: number; // Connection angle in degrees
}

// Guide formula definition based on PPTX <gdLst> nodes
export interface GuideFormula {
  name: string;
  formula: string; // e.g., "*/wd2 1 2", "+-l 0 adj"
}

// Shape geometry path definition
export interface ShapeGeometry {
  path: string; // SVG-like path definition
  fillRule: 'evenodd' | 'nonzero';
}

// Preset shape definition matching PPTX structure
export interface PresetShapeDefinition {
  name: string;
  guides: GuideFormula[];
  connectionSites: ConnectionSite[];
  geometry: ShapeGeometry;
  defaultSize: { width: number; height: number };
}

/**
 * PowerPoint preset shape definitions
 * Based on actual presetShapeDefinition.xml from PPTX files
 */
export const PRESET_SHAPES: { [key: string]: PresetShapeDefinition } = {
  
  rectangle: {
    name: 'rectangle',
    guides: [
      { name: 'l', formula: '0' },
      { name: 'r', formula: 'w' },
      { name: 't', formula: '0' },
      { name: 'b', formula: 'h' },
      { name: 'hc', formula: 'w/2' },
      { name: 'vc', formula: 'h/2' }
    ],
    connectionSites: [
      { id: 'cxn0', x: 'hc', y: 't', angle: 270 },   // top center
      { id: 'cxn1', x: 'r', y: 'vc', angle: 0 },     // right center
      { id: 'cxn2', x: 'hc', y: 'b', angle: 90 },    // bottom center
      { id: 'cxn3', x: 'l', y: 'vc', angle: 180 }    // left center
    ],
    geometry: {
      path: 'M 0 0 L w 0 L w h L 0 h Z',
      fillRule: 'nonzero'
    },
    defaultSize: { width: 100, height: 100 }
  },

  triangle: {
    name: 'triangle',
    guides: [
      { name: 'l', formula: '0' },
      { name: 'r', formula: 'w' },
      { name: 't', formula: '0' },
      { name: 'b', formula: 'h' },
      { name: 'hc', formula: 'w/2' },
      { name: 'vc', formula: 'h/2' }
    ],
    connectionSites: [
      { id: 'cxn0', x: 'hc', y: 't', angle: 270 },   // top vertex
      { id: 'cxn1', x: 'r', y: 'b', angle: 315 },    // bottom right
      { id: 'cxn2', x: 'hc', y: 'b', angle: 90 },    // bottom center
      { id: 'cxn3', x: 'l', y: 'b', angle: 225 }     // bottom left
    ],
    geometry: {
      path: 'M hc t L r b L l b Z',
      fillRule: 'nonzero'
    },
    defaultSize: { width: 100, height: 100 }
  },

  circle: {
    name: 'circle',
    guides: [
      { name: 'l', formula: '0' },
      { name: 'r', formula: 'w' },
      { name: 't', formula: '0' },
      { name: 'b', formula: 'h' },
      { name: 'hc', formula: 'w/2' },
      { name: 'vc', formula: 'h/2' }
    ],
    connectionSites: [
      { id: 'cxn0', x: 'hc', y: 't', angle: 270 },   // top
      { id: 'cxn1', x: 'r', y: 'vc', angle: 0 },     // right
      { id: 'cxn2', x: 'hc', y: 'b', angle: 90 },    // bottom
      { id: 'cxn3', x: 'l', y: 'vc', angle: 180 }    // left
    ],
    geometry: {
      path: 'M hc t A rx ry 0 1 1 hc t Z',
      fillRule: 'nonzero'
    },
    defaultSize: { width: 100, height: 100 }
  },

  diamond: {
    name: 'diamond',
    guides: [
      { name: 'l', formula: '0' },
      { name: 'r', formula: 'w' },
      { name: 't', formula: '0' },
      { name: 'b', formula: 'h' },
      { name: 'hc', formula: 'w/2' },
      { name: 'vc', formula: 'h/2' }
    ],
    connectionSites: [
      { id: 'cxn0', x: 'hc', y: 't', angle: 270 },   // top vertex
      { id: 'cxn1', x: 'r', y: 'vc', angle: 0 },     // right vertex
      { id: 'cxn2', x: 'hc', y: 'b', angle: 90 },    // bottom vertex
      { id: 'cxn3', x: 'l', y: 'vc', angle: 180 }    // left vertex
    ],
    geometry: {
      path: 'M hc t L r vc L hc b L l vc Z',
      fillRule: 'nonzero'
    },
    defaultSize: { width: 100, height: 100 }
  }
};

/**
 * Formula evaluator for PowerPoint guide expressions
 */
export class FormulaEvaluator {
  private variables: { [key: string]: number } = {};

  constructor(width: number, height: number, adjustments: { [key: string]: number } = {}) {
    // Standard PowerPoint variables
    this.variables = {
      w: width,
      h: height,
      l: 0,
      r: width,
      t: 0,
      b: height,
      hc: width / 2,
      vc: height / 2
    };
  }

  /**
   * Evaluate a PowerPoint guide formula
   */
  evaluate(formula: string): number {
    if (this.variables.hasOwnProperty(formula)) {
      return this.variables[formula];
    }

    // Handle basic arithmetic expressions
    try {
      let expression = formula;
      Object.keys(this.variables).forEach(variable => {
        const regex = new RegExp(`\\b${variable}\\b`, 'g');
        expression = expression.replace(regex, this.variables[variable].toString());
      });

      return Function(`"use strict"; return (${expression})`)();
    } catch (error) {
      console.warn(`Failed to evaluate formula: ${formula}`, error);
      return 0;
    }
  }

  /**
   * Add a computed guide value
   */
  addGuide(name: string, formula: string): void {
    this.variables[name] = this.evaluate(formula);
  }
}

/**
 * Get preset shape definition by shape type
 */
export function getPresetShapeDefinition(shapeType: string): PresetShapeDefinition | null {
  return PRESET_SHAPES[shapeType] || null;
}

/**
 * Calculate connection sites for a shape instance
 */
export function calculateConnectionSites(
  shapeType: string,
  x: number,
  y: number,
  width: number,
  height: number
): Array<{ id: string; point: Point; angle: number }> {
  const definition = getPresetShapeDefinition(shapeType);
  if (!definition) {
    // Fallback to basic rectangle connection sites
    return [
      { id: 'cxn0', point: { x: x + width / 2, y }, angle: 270 },
      { id: 'cxn1', point: { x: x + width, y: y + height / 2 }, angle: 0 },
      { id: 'cxn2', point: { x: x + width / 2, y: y + height }, angle: 90 },
      { id: 'cxn3', point: { x, y: y + height / 2 }, angle: 180 }
    ];
  }

  const evaluator = new FormulaEvaluator(width, height);

  // Evaluate guide formulas first
  definition.guides.forEach(guide => {
    evaluator.addGuide(guide.name, guide.formula);
  });

  // Calculate connection site positions
  return definition.connectionSites.map(site => ({
    id: site.id,
    point: {
      x: x + evaluator.evaluate(site.x),
      y: y + evaluator.evaluate(site.y)
    },
    angle: site.angle || 0
  }));
}

/**
 * Find the nearest connection site to a target point
 */
export function findNearestConnectionSite(
  connectionSites: Array<{ id: string; point: Point; angle: number }>,
  targetPoint: Point
): { id: string; point: Point; angle: number } {
  let nearest = connectionSites[0];
  let minDistance = Infinity;

  connectionSites.forEach(site => {
    const distance = Math.sqrt(
      Math.pow(site.point.x - targetPoint.x, 2) + 
      Math.pow(site.point.y - targetPoint.y, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearest = site;
    }
  });

  return nearest;
}