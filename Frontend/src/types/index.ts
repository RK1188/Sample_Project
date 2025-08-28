export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface Effects {
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
    opacity: number;
  };
  reflection?: {
    distance: number;
    opacity: number;
    blur: number;
  };
  glow?: {
    color: string;
    radius: number;
    opacity: number;
  };
  softEdges?: number;
  bevel?: {
    width: number;
    height: number;
  };
}

export interface Gradient {
  type: 'linear' | 'radial';
  colors: Array<{ color: string; position: number }>;
  angle?: number;
}

export interface WordArtStyle {
  warp?: {
    type: string;
    avLst?: any;
  };
  scene3d?: {
    camera?: any;
    lightRig?: any;
  };
  effects?: any;
}

export interface SlideElement {
  id: string;
  type: 'text' | 'shape' | 'image' | 'video' | 'line' | 'wordart' | 'group' | 'table' | 'chart';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  transform?: Transform;
  size?: Size;
  zIndex?: number;
  visible?: boolean;
  locked?: boolean;
  selected?: boolean;
  
  // Group properties
  groupId?: string;
  children?: SlideElement[];
  
  // Common styling
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  
  // Effects
  effects?: Effects;
  gradient?: Gradient;
  
  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  lineHeight?: number;
  letterSpacing?: number;
  
  // Shape properties
  shapeType?: string;
  cornerRadius?: number;
  points?: Point[];
  adjustments?: any; // Shape-specific adjustments (corner radius, arrow head size, etc.)
  
  // Image properties
  src?: string;
  alt?: string;
  
  // Line properties
  startPoint?: Point;
  endPoint?: Point;
  strokeStyle?: string;
  
  // WordArt properties
  wordArtStyle?: WordArtStyle;
}

export interface TextElement extends SlideElement {
  type: 'text';
  content?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface ShapeElement extends SlideElement {
  type: 'shape';
  shapeType: 
    // Basic shapes
    | 'rectangle' | 'roundedRectangle' | 'circle' | 'ellipse' | 'triangle' 
    | 'rightTriangle' | 'diamond' | 'pentagon' | 'hexagon' | 'octagon'
    | 'trapezoid' | 'parallelogram'
    // Arrows
    | 'arrow' | 'doubleArrow' | 'upArrow' | 'downArrow' | 'leftArrow' | 'rightArrow'
    | 'upDownArrow' | 'quadArrow' | 'leftRightUpArrow' | 'bentArrow' | 'uTurnArrow'
    | 'curvedRightArrow' | 'curvedLeftArrow' | 'curvedUpArrow' | 'curvedDownArrow'
    | 'stripedRightArrow' | 'notchedRightArrow' | 'pentagonArrow'
    // Callouts
    | 'speechBubble' | 'thoughtBubble' | 'roundedRectCallout' | 'ovalCallout'
    | 'cloudCallout' | 'lineCallout1' | 'lineCallout2' | 'lineCallout3'
    // Stars and Banners
    | 'star4' | 'star5' | 'star6' | 'star7' | 'star8' | 'star10' | 'star12' | 'star24'
    | 'ribbon' | 'ribbon2' | 'verticalScroll' | 'horizontalScroll' | 'wave'
    // Symbols
    | 'plus' | 'minus' | 'multiply' | 'divide' | 'equal' | 'notEqual'
    | 'heart' | 'lightningBolt' | 'sun' | 'moon' | 'cloud' | 'smileyFace'
    | 'donut' | 'noSymbol' | 'bracePair' | 'leftBrace' | 'rightBrace'
    | 'leftBracket' | 'rightBracket'
    // Flowchart
    | 'flowchartProcess' | 'flowchartAlternateProcess' | 'flowchartDecision'
    | 'flowchartData' | 'flowchartPredefinedProcess' | 'flowchartInternalStorage'
    | 'flowchartDocument' | 'flowchartMultidocument' | 'flowchartTerminator'
    | 'flowchartPreparation' | 'flowchartManualInput' | 'flowchartManualOperation'
    | 'flowchartConnector' | 'flowchartOffpageConnector' | 'flowchartCard'
    | 'flowchartPunchedTape' | 'flowchartSummingJunction' | 'flowchartOr'
    | 'flowchartCollate' | 'flowchartSort' | 'flowchartExtract' | 'flowchartMerge'
    | 'flowchartStoredData' | 'flowchartDelay' | 'flowchartSequentialAccessStorage'
    | 'flowchartMagneticDisk' | 'flowchartDirectAccessStorage' | 'flowchartDisplay'
    // Special
    | 'pie' | 'arc' | 'blockArc' | 'chord' | 'teardrop' | 'frame' | 'halfFrame'
    | 'corner' | 'diagStripe' | 'plaque' | 'can' | 'cube' | 'bevel' | 'foldedCorner'
    | 'polygon'
    | 'freeform';  // Freeform shape with custom path
  fillColor?: string;
  strokeColor?: string;
  // Pie/Arc specific properties
  startAngle?: number;
  endAngle?: number;
  innerRadius?: number;
  // Polygon specific
  sides?: number;
  // Star specific
  starPoints?: number;  // Renamed to avoid conflict with points array
  innerRadiusRatio?: number;
  // Arrow specific
  arrowHeadType?: 'none' | 'arrow' | 'stealth' | 'diamond' | 'oval' | 'open';
  arrowTailType?: 'none' | 'arrow' | 'stealth' | 'diamond' | 'oval' | 'open';
  // Freeform shape specific
  pathData?: string;  // SVG path data for custom/freeform shapes
}

export interface ImageElement extends SlideElement {
  type: 'image';
  src: string;
  alt?: string;
}

export interface VideoElement extends SlideElement {
  type: 'video';
  src: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  duration?: number;
}

export interface LineElement extends SlideElement {
  type: 'line';
  startPoint: Point;
  endPoint: Point;
  strokeColor: string;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  // Connector properties
  isConnector?: boolean;
  connectorType?: 'straight' | 'elbow' | 'curved';
  startElementId?: string;
  endElementId?: string;
  startConnectionPoint?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  endConnectionPoint?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  arrowStart?: boolean;
  arrowEnd?: boolean;
  // Elbow connector adjustment points
  elbowPoints?: Point[];  // Intermediate bend points for elbow connectors
  adjustmentHandles?: {
    point: Point;
    type: 'horizontal' | 'vertical';
    segmentIndex: number;  // Which segment this handle controls
  }[];
}

export interface WordArtElement extends SlideElement {
  type: 'wordart';
  text: string;
  wordArtStyle: WordArtStyle;
}

export interface TableCell {
  content: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  padding?: number;
  colspan?: number;
  rowspan?: number;
}

export interface TableElement extends SlideElement {
  type: 'table';
  rows: number;
  columns: number;
  cells: TableCell[][];
  cellWidth?: number[];  // Width for each column
  cellHeight?: number[];  // Height for each row
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  headerRow?: boolean;
  headerColumn?: boolean;
  alternatingRows?: boolean;
  tableStyle?: 'light' | 'medium' | 'dark' | 'accent1' | 'accent2' | 'none';
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }[];
}

export interface ChartElement extends SlideElement {
  type: 'chart';
  chartType: 'bar' | 'column' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar' | 'combo';
  data: ChartData;
  options?: {
    title?: string;
    titleFontSize?: number;
    showLegend?: boolean;
    legendPosition?: 'top' | 'bottom' | 'left' | 'right';
    showGrid?: boolean;
    showAxes?: boolean;
    xAxisLabel?: string;
    yAxisLabel?: string;
    colors?: string[];
    animation?: boolean;
    stacked?: boolean;
    horizontal?: boolean;
    showDataLabels?: boolean;
    chartStyle?: 'style1' | 'style2' | 'style3' | 'style4' | 'style5';
  };
}

export type SlideElementType = TextElement | ShapeElement | ImageElement | VideoElement | LineElement | WordArtElement | TableElement | ChartElement | SlideElement;

export interface Slide {
  id: string;
  title?: string;
  elements: SlideElement[];
  background?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  thumbnail?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  currentSlideIndex: number;
  theme?: {
    name: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  metadata?: {
    author: string;
    createdAt: Date;
    updatedAt: Date;
    version: string;
  };
}

export interface Tool {
  id: string;
  name: string;
  icon: string;
  type: 'select' | 'text' | 'shape' | 'line' | 'image' | 'pan' | 'zoom' | 'table' | 'chart';
  active: boolean;
  shapeType?: string; // Optional shape type for shape tools
}

export interface ConnectorCreationState {
  isActive: boolean;
  startElementId?: string;
  startConnectionPoint?: string;
  startPosition?: Point;
  currentPosition?: Point;
  targetElementId?: string;
  targetConnectionPoint?: string;
  previewPath?: string;
  isDragging: boolean;
}

export interface DrawingState {
  isDrawing: boolean;
  currentTool: Tool;
  startPoint?: Point;
  currentPoint?: Point;
  selectedElements: string[];
  clipboard: SlideElementType[];
  history: HistoryState[];
  historyIndex: number;
  connectorCreation: ConnectorCreationState;
}

export interface HistoryState {
  id: string;
  action: 'add' | 'update' | 'delete' | 'move' | 'resize' | 'rotate';
  timestamp: Date;
  slideId: string;
  elements: SlideElementType[];
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  canvasSize: Size;
  slideSize: Size;
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  toolbarVisible: boolean;
  propertiesPanelVisible: boolean;
  loading: boolean;
  error: string | null;
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

export interface FileImportResult {
  success: boolean;
  presentation?: Presentation;
  error?: string;
  warnings?: string[];
}

export interface ExportOptions {
  format: 'pptx' | 'pdf' | 'png' | 'jpg';
  quality?: number;
  includeNotes?: boolean;
  slideRange?: {
    start: number;
    end: number;
  };
}