import { SlideElement, Point } from '../types';

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
 * Get the connection point for an element, handling groups correctly
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

    // Update start point if connected to moved element
    if (connectorElement.startElementId === movedElement.id && connectorElement.startConnectionPoint) {
      startPoint = getElementConnectionPoint(movedElement, connectorElement.startConnectionPoint);
    }

    // Update end point if connected to moved element
    if (connectorElement.endElementId === movedElement.id && connectorElement.endConnectionPoint) {
      endPoint = getElementConnectionPoint(movedElement, connectorElement.endConnectionPoint);
    }

    // Only add update if positions actually changed
    if (startPoint !== connectorElement.startPoint || endPoint !== connectorElement.endPoint) {
      updates.push({
        elementId: connector.id,
        updates: {
          startPoint,
          endPoint
        }
      });
    }
  });

  return updates;
}