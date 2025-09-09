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
 * Enhanced to find the true nearest connection point among all shapes
 */
export function findTargetElementUnderMouse(
  mousePosition: Point,
  allElements: SlideElement[],
  excludeElementId: string
): SlideElement | null {
  let nearestElement: SlideElement | null = null;
  let nearestDistance = Infinity;
  
  // Check all elements, not just the one directly under the cursor
  for (const element of allElements) {
    if (element.id === excludeElementId || 
        element.type === 'line' || 
        !(element.type === 'shape' || element.type === 'text' || element.type === 'group')) {
      continue;
    }
    
    // Calculate distance to nearest connection point of this element
    const nearestPoint = getBestConnectionPoint(element, mousePosition);
    const distance = Math.sqrt(
      Math.pow(nearestPoint.position.x - mousePosition.x, 2) +
      Math.pow(nearestPoint.position.y - mousePosition.y, 2)
    );
    
    // Only consider elements where the mouse is reasonably close to a connection point
    const threshold = Math.min(150, Math.max(element.width || 100, element.height || 100) * 0.8);
    
    if (distance < threshold && distance < nearestDistance) {
      nearestDistance = distance;
      nearestElement = element;
    }
  }
  
  return nearestElement;
}

/**
 * Find the shape that contains the mouse position (simple bounds check)
 * Only returns a shape if the mouse is actually inside its bounds
 */
export function findShapeUnderMouse(
  mousePosition: Point,
  allElements: SlideElement[],
  excludeElementId: string
): SlideElement | null {
  // Check elements in reverse order (top to bottom in z-order)
  for (let i = allElements.length - 1; i >= 0; i--) {
    const element = allElements[i];
    
    if (element.id === excludeElementId || 
        element.type === 'line' || 
        !(element.type === 'shape' || element.type === 'text' || element.type === 'group')) {
      continue;
    }
    
    // Check if mouse is inside element bounds
    if (isPointInElement(mousePosition, element)) {
      return element;
    }
  }
  
  return null;
}

/**
 * Find shape near mouse position with connection suggestions (Google Slides style)
 * Enhanced with improved proximity detection and multiple connection point evaluation
 * Optimized for performance with early exit conditions and distance-based filtering
 */
export function findShapeWithConnectionSuggestion(
  mousePosition: Point,
  allElements: SlideElement[],
  excludeElementId: string,
  suggestionRadius: number = 120
): {
  element: SlideElement | null;
  connectionPoint: string;
  connectionPosition: Point;
  distance: number;
  isInsideShape: boolean;
  allNearbyPoints?: Array<{connectionPoint: string, position: Point, distance: number}>;
} {
  let nearestElement: SlideElement | null = null;
  let nearestConnectionPoint = 'center';
  let nearestConnectionPosition = mousePosition;
  let nearestDistance = Infinity;
  let isInsideNearestShape = false;
  let allNearbyConnectionPoints: Array<{connectionPoint: string, position: Point, distance: number}> = [];
  
  // Performance optimization: Pre-filter elements by rough bounding box distance
  const eligibleElements = allElements.filter(element => {
    if (element.id === excludeElementId || 
        element.type === 'line' || 
        !(element.type === 'shape' || element.type === 'text' || element.type === 'group')) {
      return false;
    }
    
    // Quick bounding box distance check to filter out distant elements
    const centerX = (element.x || 0) + (element.width || 100) / 2;
    const centerY = (element.y || 0) + (element.height || 100) / 2;
    const roughDistance = Math.sqrt(
      Math.pow(centerX - mousePosition.x, 2) + Math.pow(centerY - mousePosition.y, 2)
    );
    
    // Include if within expanded radius (rough check)
    return roughDistance <= suggestionRadius + Math.max(element.width || 100, element.height || 100) / 2;
  });
  
  // Check eligible elements in reverse order (top to bottom z-order)
  for (let i = eligibleElements.length - 1; i >= 0; i--) {
    const element = eligibleElements[i];
    
    if (element.id === excludeElementId || 
        element.type === 'line' || 
        !(element.type === 'shape' || element.type === 'text' || element.type === 'group')) {
      continue;
    }
    
    // Check if mouse is inside this element
    const isInside = isPointInElement(mousePosition, element);
    
    // For Google Slides-style behavior, evaluate ALL connection points for this element
    const allConnectionPoints = ['top', 'right', 'bottom', 'left', 'center'];
    let bestElementPoint = { connectionPoint: 'center', position: mousePosition, distance: Infinity };
    
    // Try PowerPoint connection sites first for shapes
    if (element.type === 'shape') {
      try {
        const shapeElement = element as any;
        const shapeType = shapeElement.shapeType || 'rectangle';
        const bounds = {
          x: element.x || 0,
          y: element.y || 0,
          width: element.width || 100,
          height: element.height || 100
        };

        const connectionSites = calculateConnectionSites(shapeType, bounds.x, bounds.y, bounds.width, bounds.height);
        
        if (connectionSites && connectionSites.length > 0) {
          // Find the nearest connection site
          connectionSites.forEach(site => {
            const distance = Math.sqrt(
              Math.pow(site.point.x - mousePosition.x, 2) + 
              Math.pow(site.point.y - mousePosition.y, 2)
            );
            
            if (distance < bestElementPoint.distance) {
              bestElementPoint = {
                connectionPoint: mapConnectionSiteToPointName(site.id, connectionSites.length, site),
                position: site.point,
                distance
              };
            }
            
            // Track all nearby points for this element
            if (distance <= suggestionRadius) {
              allNearbyConnectionPoints.push({
                connectionPoint: mapConnectionSiteToPointName(site.id, connectionSites.length, site),
                position: site.point,
                distance
              });
            }
          });
        }
      } catch (error) {
        // Fall back to basic connection points
        allConnectionPoints.forEach(pointName => {
          const position = getElementConnectionPoint(element, pointName);
          const distance = Math.sqrt(
            Math.pow(position.x - mousePosition.x, 2) + 
            Math.pow(position.y - mousePosition.y, 2)
          );
          
          if (distance < bestElementPoint.distance) {
            bestElementPoint = { connectionPoint: pointName, position, distance };
          }
          
          if (distance <= suggestionRadius) {
            allNearbyConnectionPoints.push({ connectionPoint: pointName, position, distance });
          }
        });
      }
    } else {
      // For non-shapes, use basic connection points
      allConnectionPoints.forEach(pointName => {
        const position = getElementConnectionPoint(element, pointName);
        const distance = Math.sqrt(
          Math.pow(position.x - mousePosition.x, 2) + 
          Math.pow(position.y - mousePosition.y, 2)
        );
        
        if (distance < bestElementPoint.distance) {
          bestElementPoint = { connectionPoint: pointName, position, distance };
        }
        
        if (distance <= suggestionRadius) {
          allNearbyConnectionPoints.push({ connectionPoint: pointName, position, distance });
        }
      });
    }
    
    // Enhanced priority system with improved Google Slides-like behavior and edge case handling
    let shouldSelect = false;
    const elementDistance = bestElementPoint.distance;
    
    // Early exit optimization: if this element is much further than current best, skip detailed analysis
    if (elementDistance > nearestDistance * 2 && elementDistance > 60) {
      continue;
    }
    
    if (isInside && !isInsideNearestShape) {
      // First shape we're inside - always select
      shouldSelect = true;
    } else if (isInside && isInsideNearestShape) {
      // Both inside shapes, choose the one with closer connection point
      // Edge case: If distances are very close (within 5px), prefer smaller shapes
      if (elementDistance < nearestDistance) {
        shouldSelect = true;
      } else if (Math.abs(elementDistance - nearestDistance) <= 5) {
        const currentShapeArea = (element.width || 100) * (element.height || 100);
        const nearestShapeArea = nearestElement ? 
          ((nearestElement.width || 100) * (nearestElement.height || 100)) : Infinity;
        
        // Prefer smaller shape when distances are very close
        if (currentShapeArea < nearestShapeArea) {
          shouldSelect = true;
        }
      }
    } else if (!isInsideNearestShape && !isInside) {
      // Neither inside, use distance-based selection with intelligent thresholds
      const adaptiveSuggestionRadius = Math.max(50, Math.min(suggestionRadius, 
        Math.min(element.width || 100, element.height || 100) * 0.6));
      
      if (elementDistance < adaptiveSuggestionRadius && elementDistance < nearestDistance) {
        // Edge case: For very close points (within 10px), add slight preference for edge connection points
        if (elementDistance <= 10 && bestElementPoint.connectionPoint !== 'center') {
          shouldSelect = true;
        } else if (elementDistance > 10) {
          shouldSelect = true;
        } else if (bestElementPoint.connectionPoint === 'center' && nearestConnectionPoint !== 'center') {
          // Don't replace edge connection with center when distances are very close
          shouldSelect = false;
        } else {
          shouldSelect = true;
        }
      }
    }
    
    if (shouldSelect) {
      nearestElement = element;
      nearestConnectionPoint = bestElementPoint.connectionPoint;
      nearestConnectionPosition = bestElementPoint.position;
      nearestDistance = elementDistance;
      isInsideNearestShape = isInside;
    }
  }
  
  // Sort nearby points by distance for potential visual feedback
  allNearbyConnectionPoints.sort((a, b) => a.distance - b.distance);
  
  return {
    element: nearestElement,
    connectionPoint: nearestConnectionPoint,
    connectionPosition: nearestConnectionPosition,
    distance: nearestDistance,
    isInsideShape: isInsideNearestShape,
    allNearbyPoints: allNearbyConnectionPoints.slice(0, 5) // Return top 5 nearest points
  };
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
  let bestPoint = 'center'; // Initialize to center as default
  let shortestDistance = Infinity;
  let bestPosition = getElementConnectionPoint(targetElement, 'center');

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
  // For shape elements, try PowerPoint connection sites first, but fallback to basic points
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

      if (connectionSites && connectionSites.length > 0) {
        // Find the nearest connection site to the target position
        const nearestSite = findNearestConnectionSite(connectionSites, targetPosition);
        
        // Map the connection site back to a connection point name using improved logic
        const connectionPointName = mapConnectionSiteToPointName(nearestSite.id, connectionSites.length, nearestSite);
        
        console.log(`getBestConnectionPoint PowerPoint sites for ${element.id} (${shapeType}):`, {
          targetPos: targetPosition,
          totalSites: connectionSites.length,
          nearestSite: nearestSite,
          connectionPointName
        });
        
        return {
          connectionPoint: connectionPointName,
          position: nearestSite.point
        };
      }
    } catch (error) {
      console.warn(`Failed to calculate PowerPoint connection sites for ${element.id} (${shapeType}), using fallback:`, error);
    }
  }

  // Use basic connection points with explicit calculation
  const elementBounds = {
    x: element.x || 0,
    y: element.y || 0,
    width: element.width || 100,
    height: element.height || 100
  };

  // Define connection points explicitly
  const connectionPoints = {
    top: { x: elementBounds.x + elementBounds.width / 2, y: elementBounds.y },
    right: { x: elementBounds.x + elementBounds.width, y: elementBounds.y + elementBounds.height / 2 },
    bottom: { x: elementBounds.x + elementBounds.width / 2, y: elementBounds.y + elementBounds.height },
    left: { x: elementBounds.x, y: elementBounds.y + elementBounds.height / 2 },
    center: { x: elementBounds.x + elementBounds.width / 2, y: elementBounds.y + elementBounds.height / 2 }
  };

  let bestPoint = 'center';
  let shortestDistance = Infinity;
  let bestPosition = connectionPoints.center;

  // Calculate distances to all connection points
  const distances: { [key: string]: number } = {};
  
  for (const [pointName, position] of Object.entries(connectionPoints)) {
    const distance = Math.sqrt(
      Math.pow(position.x - targetPosition.x, 2) + 
      Math.pow(position.y - targetPosition.y, 2)
    );
    distances[pointName] = distance;
    
    if (distance < shortestDistance) {
      shortestDistance = distance;
      bestPoint = pointName;
      bestPosition = position;
    }
  }
  
  console.log(`getBestConnectionPoint basic points for ${element.id}:`, {
    targetPos: targetPosition,
    elementBounds: elementBounds,
    allConnectionPoints: connectionPoints,
    allDistances: distances,
    bestPoint,
    bestPosition,
    shortestDistance
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
    const siteIndex = parseInt(siteId);
    if (!isNaN(siteIndex)) {
      const pointMap = ['top', 'right', 'bottom', 'left'];
      return pointMap[siteIndex % 4] || 'center';
    }
    // If siteId is not a number, return it directly (might be a custom site name)
    return siteId;
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

/**
 * Find the nearest connection point across all shapes, regardless of which shape contains the mouse
 * This ensures we always connect to the truly nearest connection point
 */
export function findNearestConnectionPointAcrossAllShapes(
  mousePosition: Point,
  allElements: SlideElement[],
  excludeElementId: string
): { element: SlideElement | null; connectionPoint: string; position: Point; distance: number } {
  let nearestElement: SlideElement | null = null;
  let nearestConnectionPoint = 'center';
  let nearestPosition = mousePosition;
  let nearestDistance = Infinity;
  
  // Check all eligible elements
  for (const element of allElements) {
    if (element.id === excludeElementId || 
        element.type === 'line' || 
        !(element.type === 'shape' || element.type === 'text' || element.type === 'group')) {
      continue;
    }
    
    // Get the best connection point for this element
    const bestPoint = getBestConnectionPoint(element, mousePosition);
    const distance = Math.sqrt(
      Math.pow(bestPoint.position.x - mousePosition.x, 2) +
      Math.pow(bestPoint.position.y - mousePosition.y, 2)
    );
    
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestElement = element;
      nearestConnectionPoint = bestPoint.connectionPoint;
      nearestPosition = bestPoint.position;
    }
  }
  
  return {
    element: nearestElement,
    connectionPoint: nearestConnectionPoint,
    position: nearestPosition,
    distance: nearestDistance
  };
}

/**
 * Get connection point from mouse position inside a shape
 * When user clicks inside a shape, determine which connection point is nearest to the click
 */
export function getConnectionPointFromMousePosition(
  element: SlideElement,
  mousePosition: Point
): { connectionPoint: string; position: Point } {
  return getBestConnectionPoint(element, mousePosition);
}

/**
 * Calculate visual connection suggestion for drawing connector preview
 * Returns the connection data needed for visual feedback during dragging
 */
export function calculateConnectionSuggestion(
  startElement: SlideElement,
  startConnectionPoint: string,
  mousePosition: Point,
  allElements: SlideElement[],
  suggestionRadius: number = 100
): {
  hasTarget: boolean;
  targetElement: SlideElement | null;
  targetConnectionPoint: string;
  targetConnectionPosition: Point;
  previewPath: string;
  isInsideTarget: boolean;
  distance: number;
} {
  // Find target shape with connection suggestion
  const suggestion = findShapeWithConnectionSuggestion(
    mousePosition,
    allElements,
    startElement.id,
    suggestionRadius
  );
  
  const startPosition = getElementConnectionPoint(startElement, startConnectionPoint);
  
  if (suggestion.element && suggestion.distance <= suggestionRadius) {
    // Generate preview path to suggested connection point
    const result = calculateNearestPointConnection(
      startElement,
      suggestion.element,
      suggestion.connectionPosition,
      allElements,
      startConnectionPoint
    );
    
    return {
      hasTarget: true,
      targetElement: suggestion.element,
      targetConnectionPoint: suggestion.connectionPoint,
      targetConnectionPosition: suggestion.connectionPosition,
      previewPath: result.path,
      isInsideTarget: suggestion.isInsideShape,
      distance: suggestion.distance
    };
  } else {
    // No target, show simple line to mouse
    return {
      hasTarget: false,
      targetElement: null,
      targetConnectionPoint: 'center',
      targetConnectionPosition: mousePosition,
      previewPath: `M ${startPosition.x} ${startPosition.y} L ${mousePosition.x} ${mousePosition.y}`,
      isInsideTarget: false,
      distance: Infinity
    };
  }
}