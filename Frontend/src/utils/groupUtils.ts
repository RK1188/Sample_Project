import { SlideElement, Point } from '../types';
import { calculateConnectionSites, findNearestConnectionSite } from './presetShapeDefinitions';

/**
 * Calculate the actual bounds of a group element based on its children
 * This ensures consistent bounds calculation across all components
 */
export function calculateGroupBounds(element: SlideElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  // Default bounds if not a group or no children
  const defaultBounds = {
    x: element.x || 0,
    y: element.y || 0,
    width: element.width || 100,
    height: element.height || 100
  };

  if (element.type !== 'group' || !element.children || element.children.length === 0) {
    return defaultBounds;
  }

  const groupX = element.x || 0;
  const groupY = element.y || 0;
  
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  };

  element.children.forEach(child => {
    // Child positions are relative to the group, so we add group position
    const childAbsX = (child.x || 0) + groupX;
    const childAbsY = (child.y || 0) + groupY;
    const childWidth = child.width || 0;
    const childHeight = child.height || 0;

    if (child.type === 'line') {
      // For lines, use start and end points
      const startX = (child.startPoint?.x || 0) + groupX;
      const startY = (child.startPoint?.y || 0) + groupY;
      const endX = (child.endPoint?.x || 0) + groupX;
      const endY = (child.endPoint?.y || 0) + groupY;

      bounds.minX = Math.min(bounds.minX, startX, endX);
      bounds.minY = Math.min(bounds.minY, startY, endY);
      bounds.maxX = Math.max(bounds.maxX, startX, endX);
      bounds.maxY = Math.max(bounds.maxY, startY, endY);
    } else if (child.type === 'shape' && child.shapeType === 'circle') {
      // For circles, the position represents the top-left corner of the bounding box
      // but we need to account for the full diameter
      const radius = Math.min(childWidth, childHeight) / 2;
      bounds.minX = Math.min(bounds.minX, childAbsX);
      bounds.minY = Math.min(bounds.minY, childAbsY);
      bounds.maxX = Math.max(bounds.maxX, childAbsX + radius * 2);
      bounds.maxY = Math.max(bounds.maxY, childAbsY + radius * 2);
    } else {
      // For other shapes and text
      bounds.minX = Math.min(bounds.minX, childAbsX);
      bounds.minY = Math.min(bounds.minY, childAbsY);
      bounds.maxX = Math.max(bounds.maxX, childAbsX + childWidth);
      bounds.maxY = Math.max(bounds.maxY, childAbsY + childHeight);
    }
  });

  // If we couldn't calculate bounds (shouldn't happen), return defaults
  if (bounds.minX === Infinity) {
    return defaultBounds;
  }

  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY
  };
}

/**
 * Get the connection point for an element using PowerPoint connection sites when available
 * Falls back to basic edge points for non-shape elements
 */
export function getElementConnectionPoint(element: SlideElement, connectionPoint: string): Point {
  const bounds = element.type === 'group' 
    ? calculateGroupBounds(element)
    : {
        x: element.x || 0,
        y: element.y || 0,
        width: element.width || 100,
        height: element.height || 100
      };

  // For shape elements, use PowerPoint connection sites
  if (element.type === 'shape') {
    const shapeElement = element as any;
    const shapeType = shapeElement.shapeType || 'rectangle';
    
    try {
      const connectionSites = calculateConnectionSites(
        shapeType,
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );

      // Find the specific connection site by connection point
      const siteIndex = getConnectionSiteIndex(connectionPoint);
      
      // If siteIndex is -1, it means we have a position-based connection point
      // In this case, we need to parse the position from the connection point name
      if (siteIndex === -1) {
        if (connectionPoint.startsWith('pos_')) {
          // Parse position from connection point name like "pos_123.4_567.8"
          const parts = connectionPoint.replace('pos_', '').split('_');
          if (parts.length === 2) {
            const x = parseFloat(parts[0]);
            const y = parseFloat(parts[1]);
            if (!isNaN(x) && !isNaN(y)) {
              return { x, y };
            }
          }
        }
        // Fall through to basic edge points for invalid position strings
      } else if (connectionSites[siteIndex]) {
        return connectionSites[siteIndex].point;
      }
    } catch (error) {
      console.warn('Failed to calculate PowerPoint connection sites, using fallback:', error);
    }
  }

  // Fallback to basic edge points
  switch (connectionPoint) {
    case 'top':
      return { x: bounds.x + bounds.width / 2, y: bounds.y };
    case 'bottom':
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
    case 'left':
      return { x: bounds.x, y: bounds.y + bounds.height / 2 };
    case 'right':
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
    case 'center':
    default:
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  }
}

/**
 * Map connection point names to PowerPoint connection site indices
 */
function getConnectionSiteIndex(connectionPoint: string): number {
  const indexMap: { [key: string]: number } = {
    'top': 0,
    'right': 1,
    'bottom': 2,
    'left': 3,
    'center': 0 // Default to top if center is requested
  };
  
  // Handle position-based connection points by returning -1 to indicate fallback needed
  if (connectionPoint.startsWith('pos_') || connectionPoint.startsWith('site_')) {
    return -1;
  }
  
  return indexMap[connectionPoint] || 0;
}

/**
 * Find all connectors that are connected to the given element
 */
export function findConnectedConnectors(elementId: string, allElements: SlideElement[]): SlideElement[] {
  return allElements.filter(el => 
    el.type === 'line' && 
    (el as any).isConnector && 
    ((el as any).startElementId === elementId || (el as any).endElementId === elementId)
  );
}

/**
 * Update connector positions when an element (including groups) is moved
 * Enhanced with dynamic reconnection to always snap to nearest connection points
 */
export function updateConnectorPositions(
  movedElement: SlideElement,
  allElements: SlideElement[]
): { elementId: string; updates: Partial<SlideElement> }[] {
  const connectedConnectors = findConnectedConnectors(movedElement.id, allElements);
  const updates: { elementId: string; updates: Partial<SlideElement> }[] = [];

  connectedConnectors.forEach(connector => {
    const connectorElement = connector as any;
    let startPoint = connectorElement.startPoint;
    let endPoint = connectorElement.endPoint;
    let startConnectionPoint = connectorElement.startConnectionPoint;
    let endConnectionPoint = connectorElement.endConnectionPoint;
    let connectionChanged = false;

    // Get the other connected element (not the one being moved)
    let otherElement: SlideElement | undefined;
    if (connectorElement.startElementId === movedElement.id) {
      otherElement = allElements.find(el => el.id === connectorElement.endElementId);
    } else if (connectorElement.endElementId === movedElement.id) {
      otherElement = allElements.find(el => el.id === connectorElement.startElementId);
    }

    // Dynamic reconnection: recalculate best connection points based on current positions
    if (otherElement) {
      // Update start point if connected to moved element
      if (connectorElement.startElementId === movedElement.id) {
        const bestStartPoint = getBestConnectionPointForElement(movedElement, otherElement);
        const newStartPoint = bestStartPoint.position;
        
        if (startPoint.x !== newStartPoint.x || startPoint.y !== newStartPoint.y || 
            startConnectionPoint !== bestStartPoint.connectionPoint) {
          startPoint = newStartPoint;
          startConnectionPoint = bestStartPoint.connectionPoint;
          connectionChanged = true;
        }
      }

      // Update end point if connected to moved element
      if (connectorElement.endElementId === movedElement.id) {
        const bestEndPoint = getBestConnectionPointForElement(movedElement, otherElement);
        const newEndPoint = bestEndPoint.position;
        
        if (endPoint.x !== newEndPoint.x || endPoint.y !== newEndPoint.y ||
            endConnectionPoint !== bestEndPoint.connectionPoint) {
          endPoint = newEndPoint;
          endConnectionPoint = bestEndPoint.connectionPoint;
          connectionChanged = true;
        }
      }

      // Also recalculate the static end to ensure optimal connection
      if (connectorElement.startElementId === movedElement.id && otherElement) {
        const bestEndPoint = getBestConnectionPointForElement(otherElement, movedElement);
        if (endConnectionPoint !== bestEndPoint.connectionPoint) {
          endPoint = bestEndPoint.position;
          endConnectionPoint = bestEndPoint.connectionPoint;
          connectionChanged = true;
        }
      } else if (connectorElement.endElementId === movedElement.id && otherElement) {
        const bestStartPoint = getBestConnectionPointForElement(otherElement, movedElement);
        if (startConnectionPoint !== bestStartPoint.connectionPoint) {
          startPoint = bestStartPoint.position;
          startConnectionPoint = bestStartPoint.connectionPoint;
          connectionChanged = true;
        }
      }
    } else {
      // Fallback to original logic if other element not found
      if (connectorElement.startElementId === movedElement.id && connectorElement.startConnectionPoint) {
        const newStartPoint = getElementConnectionPoint(movedElement, connectorElement.startConnectionPoint);
        if (startPoint.x !== newStartPoint.x || startPoint.y !== newStartPoint.y) {
          startPoint = newStartPoint;
          connectionChanged = true;
        }
      }

      if (connectorElement.endElementId === movedElement.id && connectorElement.endConnectionPoint) {
        const newEndPoint = getElementConnectionPoint(movedElement, connectorElement.endConnectionPoint);
        if (endPoint.x !== newEndPoint.x || endPoint.y !== newEndPoint.y) {
          endPoint = newEndPoint;
          connectionChanged = true;
        }
      }
    }

    // Only add update if positions actually changed
    if (connectionChanged) {
      const updateData: any = {
        startPoint,
        endPoint,
        startConnectionPoint,
        endConnectionPoint
      };

      // CRITICAL FIX: Clear custom path data and adjustment points when connection points change
      // This prevents connectors from "splitting" or becoming invalid during shape movement
      if (connectorElement.connectorType === 'elbow') {
        updateData.pathData = undefined;
        updateData.elbowPoints = undefined;
      }
      
      // For curved connectors, also clear any custom path data
      if (connectorElement.connectorType === 'curved') {
        updateData.pathData = undefined;
      }

      updates.push({
        elementId: connector.id,
        updates: updateData
      });
    }
  });

  return updates;
}

/**
 * Local function to find best connection point between two elements
 * This avoids circular dependency with dynamicConnectorCreation.ts
 */
function getBestConnectionPointForElement(
  element: SlideElement,
  targetElement: SlideElement
): { connectionPoint: string; position: Point } {
  // Calculate center of target element for reference
  const targetCenter = {
    x: (targetElement.x || 0) + (targetElement.width || 100) / 2,
    y: (targetElement.y || 0) + (targetElement.height || 100) / 2
  };

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

      // Find the nearest connection site to the target center
      const nearestSite = findNearestConnectionSite(connectionSites, targetCenter);
      
      // Map the connection site back to a connection point name
      const connectionPointName = mapConnectionSiteToPointName(nearestSite.id, connectionSites.length);
      
      return {
        connectionPoint: connectionPointName,
        position: nearestSite.point
      };
    } catch (error) {
      // Fall through to basic connection points
    }
  }

  // Fallback to basic connection points for non-shapes or when PowerPoint sites fail
  const connectionPoints = ['top', 'right', 'bottom', 'left', 'center'];
  let bestPoint = 'center';
  let shortestDistance = Infinity;
  let bestPosition = getElementConnectionPoint(element, 'center');

  for (const pointName of connectionPoints) {
    const position = getElementConnectionPoint(element, pointName);
    const distance = Math.sqrt(
      Math.pow(position.x - targetCenter.x, 2) + 
      Math.pow(position.y - targetCenter.y, 2)
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
 * Map PowerPoint connection site ID to a connection point name (local version)
 */
function mapConnectionSiteToPointName(siteId: string, totalSites: number): string {
  // For shapes with standard 4 connection points, map to cardinal directions
  if (totalSites <= 4) {
    const siteIndex = parseInt(siteId) || 0;
    const pointMap = ['top', 'right', 'bottom', 'left'];
    return pointMap[siteIndex] || 'top';
  }
  
  // For shapes with more connection points, use the site ID directly
  return siteId;
}