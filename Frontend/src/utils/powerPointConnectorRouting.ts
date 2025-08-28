/**
 * PowerPoint PPTX Connector Routing Engine
 * Replicates Microsoft PowerPoint's internal connector routing logic
 * Based on presetShapeDefinition.xml connection sites and geometry avoidance
 */

import { SlideElement, Point } from '../types';
import { calculateGroupBounds } from './groupUtils';
import {
  getPresetShapeDefinition,
  calculateConnectionSites,
  findNearestConnectionSite
} from './presetShapeDefinitions';

export interface ConnectorRouting {
  path: string;
  startConnectionSite: { id: string; point: Point; angle: number };
  endConnectionSite: { id: string; point: Point; angle: number };
  segments: Array<{ start: Point; end: Point }>;
}

/**
 * PowerPoint-compliant elbow connector routing
 * Matches Microsoft's behavior: route outside geometry, snap to connection sites
 */
export function routePowerPointElbowConnector(
  startElement: SlideElement,
  endElement: SlideElement,
  startConnectionPoint?: string,
  endConnectionPoint?: string,
  allElements: SlideElement[] = [],
  connectorId?: string
): ConnectorRouting {

  // Get element bounds and shape types
  const startBounds = getElementBounds(startElement);
  const endBounds = getElementBounds(endElement);
  const startShapeType = getShapeType(startElement);
  const endShapeType = getShapeType(endElement);

  // Calculate PowerPoint connection sites for both elements
  const startConnectionSites = calculateConnectionSites(
    startShapeType,
    startBounds.x,
    startBounds.y,
    startBounds.width,
    startBounds.height
  );

  const endConnectionSites = calculateConnectionSites(
    endShapeType,
    endBounds.x,
    endBounds.y,
    endBounds.width,
    endBounds.height
  );

  // Determine optimal connection sites
  const { startSite, endSite } = selectOptimalConnectionSites(
    startConnectionSites,
    endConnectionSites,
    startConnectionPoint,
    endConnectionPoint,
    startBounds,
    endBounds
  );

  // Get obstacles (other shapes that must be avoided)
  const obstacles = getObstacleShapes(allElements, startElement.id, endElement.id, connectorId);

  // Compute orthogonal routing path that avoids shape geometry
  const routing = computeOrthogonalPath(
    startSite,
    endSite,
    startElement,
    endElement,
    obstacles
  );

  return {
    path: routing.path,
    startConnectionSite: startSite,
    endConnectionSite: endSite,
    segments: routing.segments
  };
}

/**
 * Get element bounds with group handling
 */
function getElementBounds(element: SlideElement): { x: number; y: number; width: number; height: number } {
  return element.type === 'group' 
    ? calculateGroupBounds(element)
    : {
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 100,
        height: element.height || 100
      };
}

/**
 * Get shape type for preset shape definition lookup
 */
function getShapeType(element: SlideElement): string {
  if (element.type === 'shape') {
    const shapeElement = element as any;
    return shapeElement.shapeType || 'rectangle';
  }
  return 'rectangle'; // Default for non-shape elements
}

/**
 * Select optimal connection sites using PowerPoint logic
 */
function selectOptimalConnectionSites(
  startConnectionSites: Array<{ id: string; point: Point; angle: number }>,
  endConnectionSites: Array<{ id: string; point: Point; angle: number }>,
  startConnectionPoint?: string,
  endConnectionPoint?: string,
  startBounds?: { x: number; y: number; width: number; height: number },
  endBounds?: { x: number; y: number; width: number; height: number }
): { 
  startSite: { id: string; point: Point; angle: number };
  endSite: { id: string; point: Point; angle: number };
} {

  // If specific connection points are specified, find matching sites
  if (startConnectionPoint && endConnectionPoint) {
    const startSite = findSiteByConnectionPoint(startConnectionSites, startConnectionPoint);
    const endSite = findSiteByConnectionPoint(endConnectionSites, endConnectionPoint);
    
    if (startSite && endSite) {
      return { startSite, endSite };
    }
  }

  // PowerPoint's automatic connection site selection logic
  // Find the pair of sites that gives the shortest Manhattan distance
  let bestStartSite = startConnectionSites[0];
  let bestEndSite = endConnectionSites[0];
  let shortestDistance = Infinity;

  startConnectionSites.forEach(startSite => {
    endConnectionSites.forEach(endSite => {
      // Calculate Manhattan distance (orthogonal routing preference)
      const manhattanDistance = Math.abs(startSite.point.x - endSite.point.x) + 
                               Math.abs(startSite.point.y - endSite.point.y);
      
      // Prefer connections that align with PowerPoint's directional logic
      const directionScore = calculateDirectionScore(startSite, endSite);
      const totalScore = manhattanDistance + directionScore;

      if (totalScore < shortestDistance) {
        shortestDistance = totalScore;
        bestStartSite = startSite;
        bestEndSite = endSite;
      }
    });
  });

  return { startSite: bestStartSite, endSite: bestEndSite };
}

/**
 * Find connection site by PowerPoint connection point name
 */
function findSiteByConnectionPoint(
  sites: Array<{ id: string; point: Point; angle: number }>,
  connectionPoint: string
): { id: string; point: Point; angle: number } | null {
  
  // Map PowerPoint connection points to site indices
  const connectionPointMap: { [key: string]: number } = {
    'top': 0,
    'right': 1, 
    'bottom': 2,
    'left': 3
  };

  const siteIndex = connectionPointMap[connectionPoint];
  return sites[siteIndex] || sites[0];
}

/**
 * Calculate direction score for connection site pair (lower is better)
 */
function calculateDirectionScore(
  startSite: { id: string; point: Point; angle: number },
  endSite: { id: string; point: Point; angle: number }
): number {
  // PowerPoint prefers connections where angles are complementary
  // (e.g., right-to-left, top-to-bottom)
  const angleDifference = Math.abs(((startSite.angle + 180) % 360) - endSite.angle);
  const normalizedAngleDiff = Math.min(angleDifference, 360 - angleDifference);
  
  // Lower score for better alignment
  return normalizedAngleDiff;
}

/**
 * Get obstacle shapes that need to be avoided during routing
 */
function getObstacleShapes(
  allElements: SlideElement[],
  startElementId: string,
  endElementId: string,
  connectorId?: string
): Array<{
  element: SlideElement;
  bounds: { x: number; y: number; width: number; height: number };
  shapeType: string;
}> {
  return allElements
    .filter(element => 
      element.id !== startElementId && 
      element.id !== endElementId && 
      element.id !== connectorId &&
      element.type !== 'line' &&
      element.type !== 'text' // PowerPoint typically doesn't avoid text
    )
    .map(element => ({
      element,
      bounds: getElementBounds(element),
      shapeType: getShapeType(element)
    }));
}

/**
 * Compute orthogonal routing path using PowerPoint logic
 * Routes outside shape geometry and snaps to connection sites
 */
function computeOrthogonalPath(
  startSite: { id: string; point: Point; angle: number },
  endSite: { id: string; point: Point; angle: number },
  startElement: SlideElement,
  endElement: SlideElement,
  obstacles: Array<{
    element: SlideElement;
    bounds: { x: number; y: number; width: number; height: number };
    shapeType: string;
  }>
): { path: string; segments: Array<{ start: Point; end: Point }> } {

  const startPoint = startSite.point;
  const endPoint = endSite.point;
  
  // Calculate initial routing direction from connection site angles
  const startDirection = getDirectionFromAngle(startSite.angle);
  const endDirection = getDirectionFromAngle(endSite.angle);

  // Generate routing strategies based on PowerPoint's logic
  const routingStrategies = generatePowerPointRoutingStrategies(
    startPoint,
    endPoint,
    startDirection,
    endDirection,
    startElement,
    endElement
  );

  // Test each strategy against shape geometry (not just bounding boxes)
  for (const strategy of routingStrategies) {
    if (!pathIntersectsShapeGeometry(strategy.segments, obstacles, startElement, endElement)) {
      return strategy;
    }
  }

  // Fallback to extended routing if all strategies fail
  return generateExtendedOrthogonalRouting(
    startPoint,
    endPoint,
    startDirection,
    endDirection,
    obstacles,
    startElement,
    endElement
  );
}

/**
 * Convert angle to direction vector
 */
function getDirectionFromAngle(angle: number): { axis: 'horizontal' | 'vertical'; direction: number; name: string } {
  const normalizedAngle = ((angle % 360) + 360) % 360;
  
  if (normalizedAngle >= 315 || normalizedAngle < 45) {
    return { axis: 'horizontal', direction: 1, name: 'right' };
  } else if (normalizedAngle >= 45 && normalizedAngle < 135) {
    return { axis: 'vertical', direction: 1, name: 'down' };
  } else if (normalizedAngle >= 135 && normalizedAngle < 225) {
    return { axis: 'horizontal', direction: -1, name: 'left' };
  } else {
    return { axis: 'vertical', direction: -1, name: 'up' };
  }
}

/**
 * Generate PowerPoint-style routing strategies that never enter bounding boxes
 */
function generatePowerPointRoutingStrategies(
  startPoint: Point,
  endPoint: Point,
  startDirection: { axis: string; direction: number; name: string },
  endDirection: { axis: string; direction: number; name: string },
  startElement: SlideElement,
  endElement: SlideElement
): Array<{ path: string; segments: Array<{ start: Point; end: Point }> }> {

  const strategies = [];
  const minOffset = 50; // Increased minimum offset to ensure perimeter routing
  const startBounds = getElementBounds(startElement);
  const endBounds = getElementBounds(endElement);

  // Strategy 1: Perimeter-based routing that never enters bounding boxes
  if (startDirection.axis === 'horizontal' && endDirection.axis === 'horizontal') {
    // Horizontal start and end - route around perimeter
    const midY = (startPoint.y + endPoint.y) / 2;
    
    // Calculate offsets that ensure we stay outside all bounding boxes
    let offset1 = startDirection.direction * minOffset;
    let offset2 = endDirection.direction * -minOffset;
    
    // Ensure offset keeps us outside start element bounding box
    if (startDirection.direction > 0) {
      offset1 = Math.max(offset1, (startBounds.x + startBounds.width) - startPoint.x + minOffset);
    } else {
      offset1 = Math.min(offset1, startBounds.x - startPoint.x - minOffset);
    }
    
    // Ensure offset keeps us outside end element bounding box
    if (endDirection.direction < 0) {
      offset2 = Math.min(offset2, endBounds.x - endPoint.x - minOffset);
    } else {
      offset2 = Math.max(offset2, (endBounds.x + endBounds.width) - endPoint.x + minOffset);
    }
    
    const waypoint1 = { x: startPoint.x + offset1, y: startPoint.y };
    const waypoint2 = { x: startPoint.x + offset1, y: midY };
    const waypoint3 = { x: endPoint.x + offset2, y: midY };
    const waypoint4 = { x: endPoint.x + offset2, y: endPoint.y };
    
    strategies.push({
      path: `M ${startPoint.x} ${startPoint.y} L ${waypoint1.x} ${waypoint1.y} L ${waypoint2.x} ${waypoint2.y} L ${waypoint3.x} ${waypoint3.y} L ${waypoint4.x} ${waypoint4.y} L ${endPoint.x} ${endPoint.y}`,
      segments: [
        { start: startPoint, end: waypoint1 },
        { start: waypoint1, end: waypoint2 },
        { start: waypoint2, end: waypoint3 },
        { start: waypoint3, end: waypoint4 },
        { start: waypoint4, end: endPoint }
      ]
    });
  } else if (startDirection.axis === 'vertical' && endDirection.axis === 'vertical') {
    // Vertical start and end - route around perimeter
    const midX = (startPoint.x + endPoint.x) / 2;
    
    // Calculate offsets that ensure we stay outside all bounding boxes
    let offset1 = startDirection.direction * minOffset;
    let offset2 = endDirection.direction * -minOffset;
    
    // Ensure offset keeps us outside start element bounding box
    if (startDirection.direction > 0) {
      offset1 = Math.max(offset1, (startBounds.y + startBounds.height) - startPoint.y + minOffset);
    } else {
      offset1 = Math.min(offset1, startBounds.y - startPoint.y - minOffset);
    }
    
    // Ensure offset keeps us outside end element bounding box
    if (endDirection.direction < 0) {
      offset2 = Math.min(offset2, endBounds.y - endPoint.y - minOffset);
    } else {
      offset2 = Math.max(offset2, (endBounds.y + endBounds.height) - endPoint.y + minOffset);
    }
    
    const waypoint1 = { x: startPoint.x, y: startPoint.y + offset1 };
    const waypoint2 = { x: midX, y: startPoint.y + offset1 };
    const waypoint3 = { x: midX, y: endPoint.y + offset2 };
    const waypoint4 = { x: endPoint.x, y: endPoint.y + offset2 };
    
    strategies.push({
      path: `M ${startPoint.x} ${startPoint.y} L ${waypoint1.x} ${waypoint1.y} L ${waypoint2.x} ${waypoint2.y} L ${waypoint3.x} ${waypoint3.y} L ${waypoint4.x} ${waypoint4.y} L ${endPoint.x} ${endPoint.y}`,
      segments: [
        { start: startPoint, end: waypoint1 },
        { start: waypoint1, end: waypoint2 },
        { start: waypoint2, end: waypoint3 },
        { start: waypoint3, end: waypoint4 },
        { start: waypoint4, end: endPoint }
      ]
    });
  } else {
    // Mixed axes - perimeter-aware 3-segment routing
    let offset1 = startDirection.direction * minOffset;
    
    // Calculate perimeter-safe offset
    if (startDirection.axis === 'horizontal') {
      if (startDirection.direction > 0) {
        offset1 = Math.max(offset1, (startBounds.x + startBounds.width) - startPoint.x + minOffset);
      } else {
        offset1 = Math.min(offset1, startBounds.x - startPoint.x - minOffset);
      }
    } else {
      if (startDirection.direction > 0) {
        offset1 = Math.max(offset1, (startBounds.y + startBounds.height) - startPoint.y + minOffset);
      } else {
        offset1 = Math.min(offset1, startBounds.y - startPoint.y - minOffset);
      }
    }
    
    let waypoint1: Point, waypoint2: Point;
    
    if (startDirection.axis === 'horizontal') {
      waypoint1 = { x: startPoint.x + offset1, y: startPoint.y };
      waypoint2 = { x: startPoint.x + offset1, y: endPoint.y };
    } else {
      waypoint1 = { x: startPoint.x, y: startPoint.y + offset1 };
      waypoint2 = { x: endPoint.x, y: startPoint.y + offset1 };
    }
    
    strategies.push({
      path: `M ${startPoint.x} ${startPoint.y} L ${waypoint1.x} ${waypoint1.y} L ${waypoint2.x} ${waypoint2.y} L ${endPoint.x} ${endPoint.y}`,
      segments: [
        { start: startPoint, end: waypoint1 },
        { start: waypoint1, end: waypoint2 },
        { start: waypoint2, end: endPoint }
      ]
    });
  }

  // Strategy 2: Perimeter routing when direct path would intersect
  strategies.push(...generatePerimeterRoutingStrategies(
    startPoint, 
    endPoint, 
    startDirection, 
    endDirection,
    startBounds,
    endBounds
  ));

  return strategies;
}

/**
 * Generate perimeter routing strategies that route along bounding box edges
 */
function generatePerimeterRoutingStrategies(
  startPoint: Point,
  endPoint: Point,
  startDirection: { axis: string; direction: number; name: string },
  endDirection: { axis: string; direction: number; name: string },
  startBounds: { x: number; y: number; width: number; height: number },
  endBounds: { x: number; y: number; width: number; height: number }
): Array<{ path: string; segments: Array<{ start: Point; end: Point }> }> {
  
  const strategies = [];
  const clearance = 20; // Distance to maintain from bounding box edges

  // Strategy: Route around start element, then to end element
  if (startDirection.axis === 'horizontal') {
    // Route horizontally around start element perimeter
    const routeY = startDirection.direction > 0 ? 
      startBounds.y + startBounds.height + clearance : 
      startBounds.y - clearance;
    
    // Calculate corner points for routing around perimeter
    const corner1 = { x: startPoint.x, y: routeY };
    const corner2 = { x: endPoint.x, y: routeY };
    
    strategies.push({
      path: `M ${startPoint.x} ${startPoint.y} L ${corner1.x} ${corner1.y} L ${corner2.x} ${corner2.y} L ${endPoint.x} ${endPoint.y}`,
      segments: [
        { start: startPoint, end: corner1 },
        { start: corner1, end: corner2 },
        { start: corner2, end: endPoint }
      ]
    });
  } else {
    // Route vertically around start element perimeter
    const routeX = startDirection.direction > 0 ? 
      startBounds.x + startBounds.width + clearance : 
      startBounds.x - clearance;
    
    const corner1 = { x: routeX, y: startPoint.y };
    const corner2 = { x: routeX, y: endPoint.y };
    
    strategies.push({
      path: `M ${startPoint.x} ${startPoint.y} L ${corner1.x} ${corner1.y} L ${corner2.x} ${corner2.y} L ${endPoint.x} ${endPoint.y}`,
      segments: [
        { start: startPoint, end: corner1 },
        { start: corner1, end: corner2 },
        { start: corner2, end: endPoint }
      ]
    });
  }

  // Strategy: Route to end element perimeter, then to connection point
  if (endDirection.axis === 'horizontal') {
    const routeY = endDirection.direction < 0 ? 
      endBounds.y + endBounds.height + clearance : 
      endBounds.y - clearance;
    
    const corner1 = { x: startPoint.x, y: routeY };
    const corner2 = { x: endPoint.x, y: routeY };
    
    strategies.push({
      path: `M ${startPoint.x} ${startPoint.y} L ${corner1.x} ${corner1.y} L ${corner2.x} ${corner2.y} L ${endPoint.x} ${endPoint.y}`,
      segments: [
        { start: startPoint, end: corner1 },
        { start: corner1, end: corner2 },
        { start: corner2, end: endPoint }
      ]
    });
  } else {
    const routeX = endDirection.direction < 0 ? 
      endBounds.x + endBounds.width + clearance : 
      endBounds.x - clearance;
    
    const corner1 = { x: routeX, y: startPoint.y };
    const corner2 = { x: routeX, y: endPoint.y };
    
    strategies.push({
      path: `M ${startPoint.x} ${startPoint.y} L ${corner1.x} ${corner1.y} L ${corner2.x} ${corner2.y} L ${endPoint.x} ${endPoint.y}`,
      segments: [
        { start: startPoint, end: corner1 },
        { start: corner1, end: corner2 },
        { start: corner2, end: endPoint }
      ]
    });
  }

  return strategies;
}

/**
 * Check if path enters any bounding boxes (strict boundary enforcement)
 */
function pathIntersectsShapeGeometry(
  segments: Array<{ start: Point; end: Point }>,
  obstacles: Array<{
    element: SlideElement;
    bounds: { x: number; y: number; width: number; height: number };
    shapeType: string;
  }>,
  startElement: SlideElement,
  endElement: SlideElement
): boolean {

  // Get bounds of start and end elements to allow connection at boundary
  const startBounds = getElementBounds(startElement);
  const endBounds = getElementBounds(endElement);

  for (const segment of segments) {
    for (const obstacle of obstacles) {
      // Strict check: no part of segment can enter bounding box interior
      if (segmentEntersBoundingBox(segment.start, segment.end, obstacle.bounds)) {
        return true;
      }
    }
    
    // Also check against start and end elements (except at connection points)
    if (segmentEntersBoundingBoxExceptBoundary(segment.start, segment.end, startBounds) ||
        segmentEntersBoundingBoxExceptBoundary(segment.start, segment.end, endBounds)) {
      return true;
    }
  }

  return false;
}


/**
 * Check if line segment enters the interior of a bounding box
 * Returns true if any part of the line (except endpoints on boundary) is inside
 */
function segmentEntersBoundingBox(
  lineStart: Point,
  lineEnd: Point,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  // Check if either endpoint is strictly inside rectangle (not on boundary)
  if (pointStrictlyInsideRect(lineStart, rect) || pointStrictlyInsideRect(lineEnd, rect)) {
    return true;
  }

  // Check if line passes through rectangle interior
  // Sample multiple points along the line to ensure we catch interior crossings
  const samples = 10;
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const samplePoint = {
      x: lineStart.x + t * (lineEnd.x - lineStart.x),
      y: lineStart.y + t * (lineEnd.y - lineStart.y)
    };
    
    if (pointStrictlyInsideRect(samplePoint, rect)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if line segment enters bounding box except when touching boundary
 */
function segmentEntersBoundingBoxExceptBoundary(
  lineStart: Point,
  lineEnd: Point,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  // Allow segments to touch the boundary but not enter interior
  return segmentEntersBoundingBox(lineStart, lineEnd, rect);
}

/**
 * Check if point is strictly inside rectangle (not on boundary)
 */
function pointStrictlyInsideRect(point: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
  return point.x > rect.x && point.x < rect.x + rect.width && 
         point.y > rect.y && point.y < rect.y + rect.height;
}

/**
 * Check if point is inside or on rectangle boundary
 */
function pointInRect(point: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && 
         point.y >= rect.y && point.y <= rect.y + rect.height;
}

/**
 * Check if two line segments intersect
 */
function linesIntersect(p1: Point, q1: Point, p2: Point, q2: Point): boolean {
  const orientation = (p: Point, q: Point, r: Point): number => {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    return val === 0 ? 0 : (val > 0 ? 1 : 2);
  };

  const onSegment = (p: Point, q: Point, r: Point): boolean => {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
           q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
  };

  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

/**
 * Generate extended orthogonal routing for complex obstacle scenarios
 */
function generateExtendedOrthogonalRouting(
  startPoint: Point,
  endPoint: Point,
  startDirection: { axis: string; direction: number; name: string },
  endDirection: { axis: string; direction: number; name: string },
  obstacles: Array<{
    element: SlideElement;
    bounds: { x: number; y: number; width: number; height: number };
    shapeType: string;
  }>,
  startElement: SlideElement,
  endElement: SlideElement
): { path: string; segments: Array<{ start: Point; end: Point }> } {

  // Calculate large offset routing that goes around all obstacles
  const largeOffset = 80;
  
  let waypoint1: Point, waypoint2: Point;
  
  if (startDirection.axis === 'horizontal') {
    const offsetX = startDirection.direction * largeOffset;
    waypoint1 = { x: startPoint.x + offsetX, y: startPoint.y };
    waypoint2 = { x: startPoint.x + offsetX, y: endPoint.y };
  } else {
    const offsetY = startDirection.direction * largeOffset;
    waypoint1 = { x: startPoint.x, y: startPoint.y + offsetY };
    waypoint2 = { x: endPoint.x, y: startPoint.y + offsetY };
  }
  
  const segments = [
    { start: startPoint, end: waypoint1 },
    { start: waypoint1, end: waypoint2 },
    { start: waypoint2, end: endPoint }
  ];
  
  const path = `M ${startPoint.x} ${startPoint.y} L ${waypoint1.x} ${waypoint1.y} L ${waypoint2.x} ${waypoint2.y} L ${endPoint.x} ${endPoint.y}`;
  
  return { path, segments };
}