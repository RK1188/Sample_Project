/**
 * Dynamic Connector Creation System
 * Provides drag-and-drop connector creation with live preview and shortest path calculation
 */

import { SlideElement, Point, ConnectorCreationState } from '../types';
import { routePowerPointElbowConnector } from './powerPointConnectorRouting';
import { getElementConnectionPoint } from './groupUtils';

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
 * Calculate the shortest path between two shapes with automatic connection point selection
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
  targetElement?: SlideElement
): string {
  const startPos = getElementConnectionPoint(startElement, startConnectionPoint);
  
  if (targetElement) {
    // If over a target element, show optimal connection
    const result = calculateShortestPath(startElement, targetElement);
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
 * Get the best connection point on an element closest to a given position
 */
export function getBestConnectionPoint(
  element: SlideElement,
  targetPosition: Point
): { connectionPoint: string; position: Point } {
  const connectionPoints = ['top', 'right', 'bottom', 'left', 'center'];
  let bestPoint = 'center';
  let shortestDistance = Infinity;
  let bestPosition = getElementConnectionPoint(element, 'center');

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

  return { connectionPoint: bestPoint, position: bestPosition };
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
 * Complete connector creation
 */
export function completeConnectorCreation(
  state: ConnectorCreationState,
  targetElement: SlideElement,
  allElements: SlideElement[]
): DynamicConnectorResult | null {
  if (!state.startElementId || !state.startPosition) {
    return null;
  }

  const startElement = allElements.find(el => el.id === state.startElementId);
  if (!startElement) {
    return null;
  }

  // Calculate optimal connection
  const result = calculateShortestPath(startElement, targetElement, allElements);
  
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