export interface ComponentProperties {
  text: string;
  color: string;
  backgroundColor: string;
  padding: string;
  margin: string;
}

// Responsive sizing types
export type SizeUnit = 'px' | '%' | 'auto';

export interface ResponsiveSize {
  value: number;
  unit: SizeUnit;
}

export interface ResponsiveConstraints {
  minWidth?: ResponsiveSize;
  maxWidth?: ResponsiveSize;
  minHeight?: ResponsiveSize;
  maxHeight?: ResponsiveSize;
  aspectRatio?: number | null;
}

// Container layout types
export type ContainerLayoutType = 'absolute' | 'flex' | 'grid';

export interface ContainerLayout {
  type: ContainerLayoutType;
  flexDirection?: 'row' | 'column';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  gap?: number;
  gridColumns?: number;
  gridRows?: number;
}

export interface CanvasComponent {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  locked?: boolean;
  properties: ComponentProperties;

  // Responsive sizing (Phase 3)
  responsiveWidth?: ResponsiveSize;
  responsiveHeight?: ResponsiveSize;
  constraints?: ResponsiveConstraints;

  // Nested containers (Phase 4)
  parentId?: string | null;
  isContainer?: boolean;
  acceptsChildren?: boolean;
  childIds?: string[];
  layout?: ContainerLayout;
}

export type AnnotationTool =
  | 'select'
  | 'pen'
  | 'text'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'highlighter'
  | 'eraser'
  | 'stickyNote'
  | 'marker';

export interface AnnotationSettings {
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  fontSize?: number;
  opacity?: number;
  fillEnabled?: boolean;
  fillColor?: string;
  markerNumber?: number;
}

export interface UIBuilderDesign {
  components: CanvasComponent[];
  annotations: string; // Fabric.js serialized JSON
  breakpoint: string;
  cardId?: string;
  lastSaved: string;
}

export const DEFAULT_ANNOTATION_SETTINGS: AnnotationSettings = {
  tool: 'select',
  color: '#EF4444',
  strokeWidth: 4,
  fontSize: 16,
  opacity: 1,
  fillEnabled: false,
  fillColor: '#EF4444',
  markerNumber: 1,
};

export const ANNOTATION_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#000000', // Black
  '#FFFFFF', // White
];

export const STROKE_WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
];

export const OPACITY_LEVELS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
];

export const FONT_SIZES = [
  { label: 'S', value: 12 },
  { label: 'M', value: 16 },
  { label: 'L', value: 24 },
  { label: 'XL', value: 32 },
];

// UI Agent types
export type UIAgentMode = 'html' | 'components';

export type UIAgentActionType =
  | 'GENERATE_HTML'
  | 'ADD_COMPONENT'
  | 'UPDATE_COMPONENT'
  | 'CLEAR_CANVAS';

export interface UIAgentAction {
  type: UIAgentActionType;
  payload: Record<string, any>;
}

export interface GenerateHTMLPayload {
  html: string;
  css: string;
  description?: string;
}

export interface AddComponentPayload {
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Partial<ComponentProperties>;
  parentId?: string;
}

export interface UpdateComponentPayload {
  id: string;
  updates: Partial<Omit<CanvasComponent, 'id'>>;
}

export interface ClearCanvasPayload {
  confirm: boolean;
}

export interface UIAgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: UIAgentAction[];
}

export interface GeneratedHTML {
  html: string;
  css: string;
}

export interface UIAgentChatRequest {
  message: string;
  projectId: string;
  cardId?: string;
  mode: UIAgentMode;
  context: {
    currentComponents?: CanvasComponent[];
    currentBreakpoint?: string;
    currentHTML?: GeneratedHTML;
  };
}

export interface UIAgentChatResponse {
  message: {
    id: string;
    role: 'assistant';
    content: string;
    timestamp: string;
  };
  actions: UIAgentAction[];
  generatedHTML?: GeneratedHTML;
}
