import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { 
  Presentation, 
  DrawingState, 
  ViewportState, 
  UIState, 
  Tool, 
  SlideElementType, 
  Slide,
  HistoryState 
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import { calculateGroupBounds } from '../utils/groupUtils';

// Action Types
export type AppAction = 
  | { type: 'SET_PRESENTATION'; payload: Presentation }
  | { type: 'UPDATE_PRESENTATION'; payload: Partial<Presentation> }
  | { type: 'SET_CURRENT_SLIDE'; payload: number }
  | { type: 'ADD_SLIDE'; payload?: Slide }
  | { type: 'DELETE_SLIDE'; payload: string }
  | { type: 'UPDATE_SLIDE'; payload: { slideId: string; updates: Partial<Slide> } }
  | { type: 'REORDER_SLIDES'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'ADD_ELEMENT'; payload: { slideId: string; element: SlideElementType } }
  | { type: 'UPDATE_ELEMENT'; payload: { slideId: string; elementId: string; updates: Partial<SlideElementType> } }
  | { type: 'DELETE_ELEMENT'; payload: { slideId: string; elementId: string } }
  | { type: 'DELETE_ELEMENTS'; payload: { slideId: string; elementIds: string[] } }
  | { type: 'SELECT_ELEMENTS'; payload: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'GROUP_ELEMENTS'; payload: { slideId: string; elementIds: string[] } }
  | { type: 'UNGROUP_ELEMENTS'; payload: { slideId: string; groupId: string } }
  | { type: 'SET_TOOL'; payload: Tool }
  | { type: 'SET_DRAWING_STATE'; payload: Partial<DrawingState> }
  | { type: 'SET_VIEWPORT'; payload: Partial<ViewportState> }
  | { type: 'SET_UI_STATE'; payload: Partial<UIState> }
  | { type: 'ADD_TO_HISTORY'; payload: HistoryState }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTOR_TYPE'; payload: 'straight' | 'elbow' | 'curved' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'RESET_APP' };

// Initial States
const initialPresentation: Presentation = {
  id: uuidv4(),
  title: 'Untitled Presentation',
  slides: [],
  currentSlideIndex: 0,
  theme: {
    name: 'Default',
    primaryColor: '#4285f4',
    secondaryColor: '#34a853',
    backgroundColor: '#ffffff',
    textColor: '#333333'
  },
  metadata: {
    author: 'Anonymous',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  }
};

const initialTools: Tool[] = [
  { id: 'select', name: 'Select', icon: '🔍', type: 'select', active: true },
  { id: 'text', name: 'Text', icon: '📝', type: 'text', active: false },
  { id: 'rectangle', name: 'Rectangle', icon: '⬜', type: 'shape', active: false },
  { id: 'circle', name: 'Circle', icon: '⭕', type: 'shape', active: false },
  { id: 'pie', name: 'Pie', icon: '🍕', type: 'shape', active: false },
  { id: 'line', name: 'Line', icon: '📏', type: 'line', active: false },
  { id: 'connector', name: 'Connector', icon: '⇔', type: 'line', active: false },
  { id: 'image', name: 'Image', icon: '🖼️', type: 'image', active: false },
  { id: 'table', name: 'Table', icon: '⊞', type: 'table', active: false },
  { id: 'chart', name: 'Chart', icon: '📊', type: 'chart', active: false }
];

const initialDrawingState: DrawingState = {
  isDrawing: false,
  currentTool: initialTools[0],
  selectedElements: [],
  clipboard: [],
  history: [],
  historyIndex: -1
};

const initialViewportState: ViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  canvasSize: { width: 1920, height: 1080 },
  slideSize: { width: 1920, height: 1080 }
};

const initialUIState: UIState = {
  theme: 'light',
  sidebarCollapsed: false,
  toolbarVisible: true,
  propertiesPanelVisible: true,
  loading: false,
  error: null,
  notifications: []
};

// App State Interface
export interface AppState {
  presentation: Presentation;
  drawingState: DrawingState;
  viewportState: ViewportState;
  uiState: UIState;
  tools: Tool[];
  connectorType: 'straight' | 'elbow' | 'curved';
  history: {
    past: Presentation[];
    future: Presentation[];
  };
}

const initialState: AppState = {
  presentation: initialPresentation,
  drawingState: initialDrawingState,
  viewportState: initialViewportState,
  uiState: initialUIState,
  tools: initialTools,
  connectorType: 'straight',
  history: {
    past: [],
    future: []
  }
};

// Utility functions
const createEmptySlide = (index: number): Slide => ({
  id: uuidv4(),
  title: `Slide ${index + 1}`,
  elements: [],
  backgroundColor: '#ffffff',
  notes: '',
  createdAt: new Date(),
  updatedAt: new Date()
});

// Save current state to history before making changes
const saveToHistory = (state: AppState): AppState => {
  return {
    ...state,
    history: {
      past: [...state.history.past, state.presentation].slice(-50), // Keep last 50 states
      future: [] // Clear future when new action is performed
    }
  };
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_PRESENTATION':
      return {
        ...state,
        presentation: action.payload
      };

    case 'UPDATE_PRESENTATION':
      return {
        ...state,
        presentation: {
          ...state.presentation,
          ...action.payload,
          metadata: state.presentation.metadata ? {
            ...state.presentation.metadata,
            updatedAt: new Date()
          } : {
            author: 'Unknown',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
          }
        }
      };

    case 'SET_CURRENT_SLIDE':
      return {
        ...state,
        presentation: {
          ...state.presentation,
          currentSlideIndex: Math.max(0, Math.min(action.payload, state.presentation.slides.length - 1))
        }
      };

    case 'ADD_SLIDE': {
      const newSlide = action.payload || createEmptySlide(state.presentation.slides.length);
      return {
        ...state,
        presentation: {
          ...state.presentation,
          slides: [...state.presentation.slides, newSlide],
          metadata: state.presentation.metadata ? {
            ...state.presentation.metadata,
            updatedAt: new Date()
          } : {
            author: 'Unknown',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
          }
        }
      };
    }

    case 'DELETE_SLIDE': {
      const slideIndex = state.presentation.slides.findIndex(s => s.id === action.payload);
      if (slideIndex === -1) return state;
      
      const newSlides = state.presentation.slides.filter(s => s.id !== action.payload);
      const newCurrentIndex = slideIndex < state.presentation.currentSlideIndex 
        ? state.presentation.currentSlideIndex - 1 
        : Math.min(state.presentation.currentSlideIndex, newSlides.length - 1);

      return {
        ...state,
        presentation: {
          ...state.presentation,
          slides: newSlides,
          currentSlideIndex: Math.max(0, newCurrentIndex),
          metadata: state.presentation.metadata ? {
            ...state.presentation.metadata,
            updatedAt: new Date()
          } : {
            author: 'Unknown',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
          }
        }
      };
    }

    case 'UPDATE_SLIDE': {
      return {
        ...state,
        presentation: {
          ...state.presentation,
          slides: state.presentation.slides.map(slide => 
            slide.id === action.payload.slideId 
              ? { ...slide, ...action.payload.updates, updatedAt: new Date() }
              : slide
          ),
          metadata: state.presentation.metadata ? {
            ...state.presentation.metadata,
            updatedAt: new Date()
          } : {
            author: 'Unknown',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
          }
        }
      };
    }

    case 'REORDER_SLIDES': {
      const { fromIndex, toIndex } = action.payload;
      const slides = [...state.presentation.slides];
      const [removed] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, removed);

      return {
        ...state,
        presentation: {
          ...state.presentation,
          slides,
          currentSlideIndex: toIndex,
          metadata: state.presentation.metadata ? {
            ...state.presentation.metadata,
            updatedAt: new Date()
          } : {
            author: 'Unknown',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
          }
        }
      };
    }

    case 'ADD_ELEMENT': {
      const stateWithHistory = saveToHistory(state);
      return {
        ...stateWithHistory,
        presentation: {
          ...stateWithHistory.presentation,
          slides: stateWithHistory.presentation.slides.map(slide => 
            slide.id === action.payload.slideId 
              ? {
                  ...slide, 
                  elements: [...slide.elements, action.payload.element],
                  updatedAt: new Date()
                }
              : slide
          ),
          metadata: stateWithHistory.presentation.metadata ? {
            ...stateWithHistory.presentation.metadata,
            updatedAt: new Date()
          } : {
            author: 'Unknown',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
          }
        }
      };
    }

    case 'UPDATE_ELEMENT': {
      const { slideId, elementId, updates } = action.payload;
      const stateWithHistory = saveToHistory(state);
      return {
        ...stateWithHistory,
        presentation: {
          ...stateWithHistory.presentation,
          slides: stateWithHistory.presentation.slides.map(slide => 
            slide.id === slideId 
              ? {
                  ...slide,
                  elements: slide.elements.map(element => 
                    element.id === elementId ? { ...element, ...updates } as SlideElementType : element
                  ),
                  updatedAt: new Date()
                }
              : slide
          ),
          metadata: stateWithHistory.presentation.metadata ? {
            ...stateWithHistory.presentation.metadata,
            updatedAt: new Date()
          } : {
            author: 'Unknown',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
          }
        }
      };
    }

    case 'DELETE_ELEMENTS': {
      const { slideId, elementIds } = action.payload;
      const stateWithHistory = saveToHistory(state);
      
      // Find the slide
      const targetSlide = stateWithHistory.presentation.slides.find(s => s.id === slideId);
      if (!targetSlide) return stateWithHistory;
      
      // Find all connector IDs that are connected to any of the elements being deleted
      const connectedConnectorIds = targetSlide.elements
        .filter(el => {
          if (el.type === 'line' && (el as any).isConnector) {
            const connector = el as any;
            return elementIds.includes(connector.startElementId) || elementIds.includes(connector.endElementId);
          }
          return false;
        })
        .map(el => el.id);
      
      // Create a set of all element IDs to delete (original elements + connected connectors)
      const elementsToDelete = new Set([...elementIds, ...connectedConnectorIds]);
      
      return {
        ...stateWithHistory,
        presentation: {
          ...stateWithHistory.presentation,
          slides: stateWithHistory.presentation.slides.map(slide => 
            slide.id === slideId 
              ? {
                  ...slide,
                  elements: slide.elements.filter(element => !elementsToDelete.has(element.id)),
                  updatedAt: new Date()
                }
              : slide
          ),
          metadata: state.presentation.metadata ? {
            ...state.presentation.metadata,
            updatedAt: new Date()
          } : {
            author: 'Unknown',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
          }
        },
        drawingState: {
          ...state.drawingState,
          selectedElements: state.drawingState.selectedElements.filter(id => !elementsToDelete.has(id))
        }
      };
    }

    case 'DELETE_ELEMENT': {
      const { slideId, elementId } = action.payload;
      const stateWithHistory = saveToHistory(state);
      
      // Find the slide
      const targetSlide = stateWithHistory.presentation.slides.find(s => s.id === slideId);
      if (!targetSlide) return stateWithHistory;
      
      // Find all connector IDs that are connected to the element being deleted
      const connectedConnectorIds = targetSlide.elements
        .filter(el => {
          if (el.type === 'line' && (el as any).isConnector) {
            const connector = el as any;
            return connector.startElementId === elementId || connector.endElementId === elementId;
          }
          return false;
        })
        .map(el => el.id);
      
      // Create a set of all element IDs to delete (original element + connected connectors)
      const elementsToDelete = new Set([elementId, ...connectedConnectorIds]);
      
      return {
        ...stateWithHistory,
        presentation: {
          ...stateWithHistory.presentation,
          slides: stateWithHistory.presentation.slides.map(slide => 
            slide.id === slideId 
              ? {
                  ...slide,
                  elements: slide.elements.filter(element => !elementsToDelete.has(element.id)),
                  updatedAt: new Date()
                }
              : slide
          ),
          metadata: state.presentation.metadata ? {
            ...state.presentation.metadata,
            updatedAt: new Date()
          } : {
            author: 'Unknown',
            createdAt: new Date(),
            updatedAt: new Date(),
            version: '1.0.0'
          }
        },
        drawingState: {
          ...state.drawingState,
          selectedElements: state.drawingState.selectedElements.filter(id => !elementsToDelete.has(id))
        }
      };
    }

    case 'SELECT_ELEMENTS':
      return {
        ...state,
        drawingState: {
          ...state.drawingState,
          selectedElements: action.payload
        }
      };

    case 'DESELECT_ALL':
      return {
        ...state,
        drawingState: {
          ...state.drawingState,
          selectedElements: []
        }
      };

    case 'GROUP_ELEMENTS': {
      const { slideId, elementIds } = action.payload;
      if (elementIds.length < 2) return state;
      
      let newGroupId = '';
      const stateWithHistory = saveToHistory(state);
      
      return {
        ...stateWithHistory,
        presentation: {
          ...stateWithHistory.presentation,
          slides: stateWithHistory.presentation.slides.map(slide => {
            if (slide.id !== slideId) return slide;
            
            // Find elements to group
            const elementsToGroup = slide.elements.filter(el => elementIds.includes(el.id));
            if (elementsToGroup.length < 2) return slide;
            
            // Find connectors that connect any of the elements being grouped
            const connectedLines = slide.elements.filter(el => {
              if (el.type === 'line' && (el as any).isConnector) {
                const startId = (el as any).startElementId;
                const endId = (el as any).endElementId;
                // Include connector if both ends are in the group or one end is in the group
                return (startId && elementIds.includes(startId)) || 
                       (endId && elementIds.includes(endId));
              }
              return false;
            });
            
            // Add connected lines to the group
            const allElementsToGroup = [...elementsToGroup, ...connectedLines.filter(
              line => !elementIds.includes(line.id)
            )];
            
            // Calculate group bounds including connectors
            const bounds = {
              minX: Infinity,
              minY: Infinity,
              maxX: -Infinity,
              maxY: -Infinity
            };

            allElementsToGroup.forEach(el => {
              if (el.type === 'line') {
                bounds.minX = Math.min(bounds.minX, el.startPoint?.x || 0, el.endPoint?.x || 0);
                bounds.minY = Math.min(bounds.minY, el.startPoint?.y || 0, el.endPoint?.y || 0);
                bounds.maxX = Math.max(bounds.maxX, el.startPoint?.x || 0, el.endPoint?.x || 0);
                bounds.maxY = Math.max(bounds.maxY, el.startPoint?.y || 0, el.endPoint?.y || 0);
              } else if (el.type === 'shape' && el.shapeType === 'circle') {
                // For circles, account for the full diameter
                const radius = Math.min(el.width || 50, el.height || 50) / 2;
                bounds.minX = Math.min(bounds.minX, el.x || 0);
                bounds.minY = Math.min(bounds.minY, el.y || 0);
                bounds.maxX = Math.max(bounds.maxX, (el.x || 0) + radius * 2);
                bounds.maxY = Math.max(bounds.maxY, (el.y || 0) + radius * 2);
              } else {
                bounds.minX = Math.min(bounds.minX, el.x || 0);
                bounds.minY = Math.min(bounds.minY, el.y || 0);
                bounds.maxX = Math.max(bounds.maxX, (el.x || 0) + (el.width || 0));
                bounds.maxY = Math.max(bounds.maxY, (el.y || 0) + (el.height || 0));
              }
            });

            const minX = bounds.minX;
            const minY = bounds.minY;
            const maxX = bounds.maxX;
            const maxY = bounds.maxY;
            
            // Create group element
            const groupId = uuidv4();
            newGroupId = groupId;
            const groupElement: SlideElementType = {
              id: groupId,
              type: 'group' as const,
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
              rotation: 0,
              children: allElementsToGroup.map(el => {
                if (el.type === 'line') {
                  return {
                    ...el,
                    id: el.id, // Preserve original IDs
                    groupId: groupId,
                    startPoint: {
                      x: (el.startPoint?.x || 0) - minX,
                      y: (el.startPoint?.y || 0) - minY
                    },
                    endPoint: {
                      x: (el.endPoint?.x || 0) - minX,
                      y: (el.endPoint?.y || 0) - minY
                    }
                  };
                }
                return {
                  ...el,
                  id: el.id, // Preserve original IDs
                  groupId: groupId,
                  x: (el.x || 0) - minX,
                  y: (el.y || 0) - minY
                };
              })
            };
            
            // Remove grouped elements and connected lines, then add group
            const groupedElementIds = allElementsToGroup.map(el => el.id);
            const newElements = slide.elements.filter(el => !groupedElementIds.includes(el.id));
            newElements.push(groupElement);
            
            return {
              ...slide,
              elements: newElements,
              updatedAt: new Date()
            };
          })
        },
        drawingState: {
          ...state.drawingState,
          selectedElements: [newGroupId]
        }
      };
    }

    case 'UNGROUP_ELEMENTS': {
      const { slideId, groupId } = action.payload;
      let ungroupedIds: string[] = [];
      const stateWithHistory = saveToHistory(state);
      
      return {
        ...stateWithHistory,
        presentation: {
          ...stateWithHistory.presentation,
          slides: stateWithHistory.presentation.slides.map(slide => {
            if (slide.id !== slideId) return slide;
            
            const groupElement = slide.elements.find(el => el.id === groupId && el.type === 'group');
            if (!groupElement || !groupElement.children) return slide;
            
            // Restore children elements with absolute positions
            const ungroupedElements = groupElement.children.map(child => {
              if (child.type === 'line') {
                return {
                  ...child,
                  startPoint: {
                    x: (child.startPoint?.x || 0) + (groupElement.x || 0),
                    y: (child.startPoint?.y || 0) + (groupElement.y || 0)
                  },
                  endPoint: {
                    x: (child.endPoint?.x || 0) + (groupElement.x || 0),
                    y: (child.endPoint?.y || 0) + (groupElement.y || 0)
                  },
                  groupId: undefined
                };
              }
              return {
                ...child,
                x: (child.x || 0) + (groupElement.x || 0),
                y: (child.y || 0) + (groupElement.y || 0),
                rotation: (child.rotation || 0) + (groupElement.rotation || 0),
                groupId: undefined
              };
            });
            
            ungroupedIds = ungroupedElements.map(el => el.id);
            
            // Remove group and add ungrouped elements
            const newElements = slide.elements.filter(el => el.id !== groupId);
            newElements.push(...ungroupedElements);
            
            return {
              ...slide,
              elements: newElements,
              updatedAt: new Date()
            };
          })
        },
        drawingState: {
          ...state.drawingState,
          selectedElements: ungroupedIds
        }
      };
    }

    case 'UNDO': {
      if (state.history.past.length === 0) return state;
      
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);
      
      return {
        ...state,
        presentation: previous,
        history: {
          past: newPast,
          future: [state.presentation, ...state.history.future]
        }
      };
    }

    case 'REDO': {
      if (state.history.future.length === 0) return state;
      
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);
      
      return {
        ...state,
        presentation: next,
        history: {
          past: [...state.history.past, state.presentation],
          future: newFuture
        }
      };
    }

    case 'SET_TOOL': {
      const updatedTools = state.tools.map(tool => ({
        ...tool,
        active: tool.id === action.payload.id
      }));
      
      return {
        ...state,
        tools: updatedTools,
        drawingState: {
          ...state.drawingState,
          currentTool: action.payload
        }
      };
    }

    case 'SET_DRAWING_STATE':
      return {
        ...state,
        drawingState: {
          ...state.drawingState,
          ...action.payload
        }
      };

    case 'SET_VIEWPORT':
      return {
        ...state,
        viewportState: {
          ...state.viewportState,
          ...action.payload
        }
      };

    case 'SET_UI_STATE':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          ...action.payload
        }
      };

    case 'SET_LOADING':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          loading: action.payload
        }
      };

    case 'SET_ERROR':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          error: action.payload
        }
      };

    case 'SET_CONNECTOR_TYPE':
      return {
        ...state,
        connectorType: action.payload
      };

    case 'TOGGLE_THEME':
      return {
        ...state,
        uiState: {
          ...state.uiState,
          theme: state.uiState.theme === 'light' ? 'dark' : 'light'
        }
      };

    case 'RESET_APP':
      return initialState;

    default:
      return state;
  }
};

// Context
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook
export const useApp = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};