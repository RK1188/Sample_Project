/**
 * Dynamic Connector Creation System
 * Provides drag-and-drop connector creation with live preview and shortest path calculation
 */

import { SlideElement, Point, ConnectorCreationState } from '../types';
import { routePowerPointElbowConnector } from './powerPointConnectorRouting';
import { getElementConnectionPoint } from './groupUtils';
import { calculateConnectionSites, findNearestConnectionSite } from './presetShapeDefinitions';

export interface DynamicConnectorResult {
  path: string;
  startPoint: Point;
  endPoint: Point;
  startElementId: string;
  endElementId: string;
  startConnectionPoint: string;
  endConnectionPoint: string;
  connectorType: 'straight' | 'elbow' | 'curved';
}

/**
 * Calculate connection using shortest overall path among all target adjustment points
 * Keeps the start connection point unchanged, finds shortest path to any target point
 */
export function calculateNearestPointConnection(
  startElement: SlideElement,
  targetElement: SlideElement,
  dragPosition: Point,
  allElements: SlideElement[] = [],
  fixedStartConnectionPoint?: string
): DynamicConnectorResult {
  // Use the fixed start connection point if provided
  let startConnectionPoint: string;
  if (fixedStartConnectionPoint) {
    startConnectionPoint = fixedStartConnectionPoint;
  } else {
    // Fallback to finding best start point (for backward compatibility)
    const startBestPoint = getBestConnectionPoint(startElement, dragPosition);
    startConnectionPoint = startBestPoint.connectionPoint;
  }

  // Find the shortest distance from current drag position to ALL target adjustment points
  const targetBestPoint = findShortestPathToTargetPoints(targetElement, dragPosition);
  
  // Use PowerPoint routing to get the actual path
  const routing = routePowerPointElbowConnector(
    startElement,
    targetElement,
    startConnectionPoint,
    targetBestPoint.connectionPoint,
    allElements
  );
  
  return {
    path: routing.path,
    startPoint: routing.startConnectionSite.point,
    endPoint: routing.endConnectionSite.point,
    startElementId: startElement.id,
    endElementId: targetElement.id,
    startConnectionPoint: startConnectionPoint,
    endConnectionPoint: targetBestPoint.connectionPoint,
    connectorType: 'elbow'
  };
}

/**
 * Calculate the shortest path between two shapes with automatic connection point selection
 * This function can be used for non-drag scenarios where optimal routing is preferred
 */
export function calculateShortestPath(
  startElement: SlideElement,
  targetElement: SlideElement,
  allElements: SlideElement[] = []
): DynamicConnectorResult {
  // Get all possible connection points for both elements
  const startConnectionPoints = ['top', 'right', 'bottom', 'left', 'center'];
  const endConnectionPoints = ['top', 'right', 'bottom', 'left', 'center'];
  
  let shortestDistance = Infinity;
  let bestConnection: DynamicConnectorResult | null = null;

  // Test all combinations of connection points to find the shortest path
  for (const startPoint of startConnectionPoints) {
    for (const endPoint of endConnectionPoints) {
      const startPos = getElementConnectionPoint(startElement, startPoint);
      const endPos = getElementConnectionPoint(targetElement, endPoint);
      
      // Calculate Manhattan distance (orthogonal routing preference)
      const distance = Math.abs(startPos.x - endPos.x) + Math.abs(startPos.y - endPos.y);
      
      // Add penalty for connections that would create awkward routing
      const penalty = calculateRoutingPenalty(startPos, endPos, startPoint, endPoint);
      const totalScore = distance + penalty;
      
      if (totalScore < shortestDistance) {
        shortestDistance = totalScore;
        
        // Use PowerPoint routing to get the actual path
        const routing = routePowerPointElbowConnector(
          startElement,
          targetElement,
          startPoint,
          endPoint,
          allElements
        );
        
        bestConnection = {
          path: routing.path,
          startPoint: routing.startConnectionSite.point,
          endPoint: routing.endConnectionSite.point,
          startElementId: startElement.id,
          endElementId: targetElement.id,
          startConnectionPoint: startPoint,
          endConnectionPoint: endPoint,
          connectorType: 'elbow'
        };
      }
    }
  }

  if (!bestConnection) {
    // Fallback to center-to-center connection
    const startPos = getElementConnectionPoint(startElement, 'center');
    const endPos = getElementConnectionPoint(targetElement, 'center');
    
    bestConnection = {
      path: `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`,
      startPoint: startPos,
      endPoint: endPos,
      startElementId: startElement.id,
      endElementId: targetElement.id,
      startConnectionPoint: 'center',
      endConnectionPoint: 'center',
      connectorType: 'straight'
    };
  }

  return bestConnection;
}

/**
 * Calculate routing penalty for connection point pairs
 * Lower values indicate better routing choices
 */
function calculateRoutingPenalty(
  startPos: Point,
  endPos: Point,
  startConnectionPoint: string,
  endConnectionPoint: string
): number {
  let penalty = 0;

  // Prefer connections that align with the direction between shapes
  const deltaX = endPos.x - startPos.x;
  const deltaY = endPos.y - startPos.y;
  
  // Determine primary direction
  const primaryDirectionHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
  
  if (primaryDirectionHorizontal) {
    // Prefer left/right connections for horizontal layouts
    if (deltaX > 0) {
      // Target is to the right, prefer right->left connections
      if (startConnectionPoint === 'right' && endConnectionPoint === 'left') penalty -= 100;
      if (startConnectionPoint === 'left' || endConnectionPoint === 'right') penalty += 50;
    } else {
      // Target is to the left, prefer left->right connections  
      if (startConnectionPoint === 'left' && endConnectionPoint === 'right') penalty -= 100;
      if (startConnectionPoint === 'right' || endConnectionPoint === 'left') penalty += 50;
    }
  } else {
    // Prefer top/bottom connections for vertical layouts
    if (deltaY > 0) {
      // Target is below, prefer bottom->top connections
      if (startConnectionPoint === 'bottom' && endConnectionPoint === 'top') penalty -= 100;
      if (startConnectionPoint === 'top' || endConnectionPoint === 'bottom') penalty += 50;
    } else {
      // Target is above, prefer top->bottom connections
      if (startConnectionPoint === 'top' && endConnectionPoint === 'bottom') penalty -= 100;
      if (startConnectionPoint === 'bottom' || endConnectionPoint === 'top') penalty += 50;
    }
  }

  // Small penalty for center connections (prefer edge connections)
  if (startConnectionPoint === 'center') penalty += 25;
  if (endConnectionPoint === 'center') penalty += 25;

  return penalty;
}

/**
 * Generate a preview path while dragging from start element to mouse position
 */
export function generatePreviewPath(
  startElement: SlideElement,
  startConnectionPoint: string,
  mousePosition: Point,
  targetElement?: SlideElement,
  allElements: SlideElement[] = []
): string {
  const startPos = getElementConnectionPoint(startElement, startConnectionPoint);
  
  if (targetElement) {
    // If over a target element, show connection using nearest point to drag position
    const result = calculateNearestPointConnection(startElement, targetElement, mousePosition, allElements);
    return result.path;
  } else {
    // Show simple line to mouse cursor
    return `M ${startPos.x} ${startPos.y} L ${mousePosition.x} ${mousePosition.y}`;
  }
}

/**
 * Find the element under the mouse cursor (excluding the start element)
 */
export function findTargetElementUnderMouse(
  mousePosition: Point,
  allElements: SlideElement[],
  excludeElementId: string
): SlideElement | null {
  // Iterate through elements in reverse order (top to bottom in z-order)
  for (let i = allElements.length - 1; i >= 0; i--) {
    const element = allElements[i];
    
    if (element.id === excludeElementId || 
        element.type === 'line' || 
        !isPointInElement(mousePosition, element)) {
      continue;
    }
    
    return element;
  }
  
  return null;
}

/**
 * Check if a point is within an element's bounds
 */
function isPointInElement(point: Point, element: SlideElement): boolean {
  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 100;
  const height = element.height || 100;
  
  return point.x >= x && point.x <= x + width &&
         point.y >= y && point.y <= y + height;
}

/**
 * Find the shortest path to any target adjustment point based on current drag position
 * Considers ALL available adjustment points on the target shape and finds nearest to drag position
 */
export function findShortestPathToTargetPoints(
  targetElement: SlideElement,
  dragPosition: Point
): { connectionPoint: string; position: Point } {
  // For shape elements, use PowerPoint connection sites if available
  if (targetElement.type === 'shape') {
    const shapeElement = targetElement as any;
    const shapeType = shapeElement.shapeType || 'rectangle';
    
    try {
      const bounds = {
        x: targetElement.x || 0,
        y: targetElement.y || 0,
        width: targetElement.width || 100,
        height: targetElement.height || 100
      };

      // Calculate ALL available connection sites for this shape
      const connectionSites = calculateConnectionSites(
        shapeType,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );

      // Find the connection site with shortest distance from current drag position
      let shortestDistance = Infinity;
      let bestSite = connectionSites[0];
      
      connectionSites.forEach(site => {
        const distance = Math.sqrt(
          Math.pow(site.point.x - dragPosition.x, 2) + 
          Math.pow(site.point.y - dragPosition.y, 2)
        );
        
        if (distance < shortestDistance) {
          shortestDistance = distance;
          bestSite = site;
        }
      });
      
      // Map the connection site back to a connection point name using improved logic
      const connectionPointName = mapConnectionSiteToPointName(bestSite.id, connectionSites.length, bestSite);
      
      return {
        connectionPoint: connectionPointName,
        position: bestSite.point
      };
    } catch (error) {
      console.warn('Failed to calculate PowerPoint connection sites, using fallback:', error);
      // Fall through to basic connection points
    }
  }

  // Fallback to basic connection points for non-shapes or when PowerPoint sites fail
  const connectionPoints = ['top', 'right', 'bottom', 'left', 'center'];
  let bestPoint = 'top'; // Initialize to first point instead of center
  let shortestDistance = Infinity;
  let bestPosition = getElementConnectionPoint(targetElement, 'top');

  for (const pointName of connectionPoints) {
    const position = getElementConnectionPoint(targetElement, pointName);
    const distance = Math.sqrt(
      Math.pow(position.x - dragPosition.x, 2) + 
      Math.pow(position.y - dragPosition.y, 2)
    );
    
    if (distance < shortestDistance) {
      shortestDistance = distance;
      bestPoint = pointName;
      bestPosition = position;
    }
  }
  return { connectionPoint: bestPoint, position: bestPosition };
}

/**
 * Get the best connection point on an element closest to a given position
 * Uses PowerPoint connection sites for shapes with multiple adjustment points
 */
export function getBestConnectionPoint(
  element: SlideElement,
  targetPosition: Point
): { connectionPoint: string; position: Point } {
  // For shape elements, use PowerPoint connection sites if available
  if (element.type === 'shape') {
    const shapeElement = element as any;
    const shapeType = shapeElement.shapeType || 'rectangle';
    
    try {
      const bounds = {
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 100,
        height: element.height || 100
      };

      // Calculate all available connection sites for this shape
      const connectionSites = calculateConnectionSites(
        shapeType,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );

      // Find the nearest connection site to the drag/target position
      const nearestSite = findNearestConnectionSite(connectionSites, targetPosition);
      
      // Map the connection site back to a connection point name using improved logic
      const connectionPointName = mapConnectionSiteToPointName(nearestSite.id, connectionSites.length, nearestSite);
      
      // Debug log to verify dynamic selection
      console.log(`getBestConnectionPoint for ${element.id} (${shapeType}):`, {
        targetPos: targetPosition,
        totalSites: connectionSites.length,
        nearestSite: nearestSite,
        connectionPointName
      });
      
      return {
        connectionPoint: connectionPointName,
        position: nearestSite.point
      };
    } catch (error) {
      console.warn('Failed to calculate PowerPoint connection sites, using fallback:', error);
      // Fall through to basic connection points
    }
  }

  // Fallback to basic connection points for non-shapes or when PowerPoint sites fail
  const connectionPoints = ['top', 'right', 'bottom', 'left', 'center'];
  let bestPoint = 'top'; // Initialize to first point instead of center
  let shortestDistance = Infinity;
  let bestPosition = getElementConnectionPoint(element, 'top');

  for (const pointName of connectionPoints) {
    const position = getElementConnectionPoint(element, pointName);
    const distance = Math.sqrt(
      Math.pow(position.x - targetPosition.x, 2) + 
      Math.pow(position.y - targetPosition.y, 2)
    );
    
    if (distance < shortestDistance) {
      shortestDistance = distance;
      bestPoint = pointName;
      bestPosition = position;
    }
  }
  
  console.log(`getBestConnectionPoint fallback for ${element.id}:`, {
    targetPos: targetPosition,
    bestPoint,
    bestPosition,
    distances: connectionPoints.map(cp => ({
      point: cp,
      pos: getElementConnectionPoint(element, cp),
      distance: Math.sqrt(Math.pow(getElementConnectionPoint(element, cp).x - targetPosition.x, 2) + Math.pow(getElementConnectionPoint(element, cp).y - targetPosition.y, 2))
    }))
  });
  
  return { connectionPoint: bestPoint, position: bestPosition };
}

/**
 * Map PowerPoint connection site ID to a connection point name
 * This handles shapes with more than 4 connection points and uses actual position to determine direction
 */
function mapConnectionSiteToPointName(siteId: string, totalSites: number, site?: { id: string; point: Point }): string {
  // For shapes with standard 4 connection points, map to cardinal directions
  if (totalSites <= 4) {
    const siteIndex = parseInt(siteId) || 0;
    const pointMap = ['top', 'right', 'bottom', 'left'];
    return pointMap[siteIndex] || 'top';
  }
  
  // For shapes with more connection points, use the site ID directly
  // This allows the routing system to handle complex shapes properly
  // The PowerPoint routing system can work with these site IDs
  return siteId;
}


/**
 * Initialize connector creation state
 */
export function initializeConnectorCreation(): ConnectorCreationState {
  return {
    isActive: false,
    isDragging: false
  };
}

/**
 * Start connector creation from an element
 */
export function startConnectorCreation(
  elementId: string,
  connectionPoint: string,
  position: Point
): ConnectorCreationState {
  return {
    isActive: true,
    startElementId: elementId,
    startConnectionPoint: connectionPoint,
    startPosition: position,
    currentPosition: position,
    isDragging: false
  };
}

/**
 * Update connector creation state during dragging
 */
export function updateConnectorCreation(
  state: ConnectorCreationState,
  mousePosition: Point,
  targetElement?: SlideElement,
  targetConnectionPoint?: string
): ConnectorCreationState {
  return {
    ...state,
    currentPosition: mousePosition,
    targetElementId: targetElement?.id,
    targetConnectionPoint,
    isDragging: true
  };
}

/**
 * Complete connector creation using nearest point logic based on drag position
 * Keeps the original start connection point from when connector creation began
 */
export function completeConnectorCreation(
  state: ConnectorCreationState,
  targetElement: SlideElement,
  allElements: SlideElement[]
): DynamicConnectorResult | null {
  if (!state.startElementId || !state.startPosition || !state.currentPosition || !state.startConnectionPoint) {
    return null;
  }

  const startElement = allElements.find(el => el.id === state.startElementId);
  if (!startElement) {
    return null;
  }

  // Use nearest point connection for target, but keep original start connection point
  const result = calculateNearestPointConnection(
    startElement, 
    targetElement, 
    state.currentPosition, 
    allElements,
    state.startConnectionPoint // Pass the original start connection point
  );
  
  return result;
}

/**
 * Cancel connector creation
 */
export function cancelConnectorCreation(): ConnectorCreationState {
  return {
    isActive: false,
    isDragging: false
  };
}