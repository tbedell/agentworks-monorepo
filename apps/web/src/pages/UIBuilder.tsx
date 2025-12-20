import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  Smartphone,
  Tablet,
  Monitor as Desktop,
  Square,
  Component,
  Grid3X3,
  Box,
  MousePointer,
  Type,
  CreditCard,
  Table,
  Circle,
  Navigation,
  List,
  BarChart3,
  FileText,
  Download,
  FileCode,
  Camera,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Image as ImageIcon,
  FolderOpen,
  X,
  RefreshCw,
  Edit,
  Settings
} from 'lucide-react';
import { captureSnapshot, captureHTMLContent, downloadSnapshot, type SnapshotResult } from '../lib/snapshot';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspace';
import { ResizableComponent, AnnotationLayer, AnnotationToolbar, HTMLPreview, Accordion } from '../components/ui-builder';
import type { AnnotationLayerRef } from '../components/ui-builder';
import type { AnnotationSettings, CanvasComponent as UIBuilderCanvasComponent, GeneratedHTML } from '../types/ui-builder';
import { DEFAULT_ANNOTATION_SETTINGS } from '../types/ui-builder';
import { UIAgentProvider } from '../contexts/UIAgentContext';
import { Link2 } from 'lucide-react';
import { getRootComponents, getComponentChildren, removeComponent } from '../lib/ui-builder-utils';

interface ComponentItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  isContainer?: boolean;
}

interface CanvasComponent {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: {
    text: string;
    color: string;
    backgroundColor: string;
    padding: string;
    margin: string;
  };
  // Container properties
  isContainer?: boolean;
  acceptsChildren?: boolean;
  parentId?: string | null;
  childIds?: string[];
  // Z-index for layering
  zIndex?: number;
}

const SCREEN_BREAKPOINTS = [
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: 375 },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: 768 },
  { id: 'desktop', label: 'Desktop', icon: Desktop, width: 1024 },
];

const COMPONENT_LIBRARY = {
  LAYOUT: [
    { id: 'container', name: 'Container', icon: Square, description: 'Basic container component', isContainer: true },
    { id: 'grid', name: 'Grid', icon: Grid3X3, description: 'Grid layout system', isContainer: true },
    { id: 'flexbox', name: 'Flexbox', icon: Box, description: 'Flexible box layout', isContainer: true },
  ],
  COMPONENTS: [
    { id: 'button', name: 'Button', icon: MousePointer, description: 'Interactive button element' },
    { id: 'input', name: 'Input', icon: Type, description: 'Text input field' },
    { id: 'card', name: 'Card', icon: CreditCard, description: 'Content card component', isContainer: true },
    { id: 'table', name: 'Table', icon: Table, description: 'Data table component' },
    { id: 'modal', name: 'Modal', icon: Circle, description: 'Modal dialog overlay', isContainer: true },
    { id: 'navigation', name: 'Navigation', icon: Navigation, description: 'Navigation menu' },
  ],
  DATA: [
    { id: 'list', name: 'List', icon: List, description: 'Dynamic list component' },
    { id: 'chart', name: 'Chart', icon: BarChart3, description: 'Data visualization chart' },
    { id: 'form', name: 'Form', icon: FileText, description: 'Form input collection', isContainer: true },
  ]
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Recursive component renderer for nested containers
interface ComponentTreeRendererProps {
  component: CanvasComponent;
  allComponents: CanvasComponent[];
  selectedComponent: CanvasComponent | null;
  disabled: boolean;
  onSelect: (comp: CanvasComponent) => void;
  onUpdate: (id: string, updates: Partial<CanvasComponent>) => void;
}

function ComponentTreeRenderer({
  component,
  allComponents,
  selectedComponent,
  disabled,
  onSelect,
  onUpdate,
}: ComponentTreeRendererProps) {
  const children = getComponentChildren(component.id, allComponents);
  const isContainer = component.isContainer || component.acceptsChildren;

  return (
    <ResizableComponent
      key={component.id}
      component={component as UIBuilderCanvasComponent}
      isSelected={selectedComponent?.id === component.id}
      disabled={disabled}
      onSelect={() => onSelect(component)}
      onUpdate={(updates) => onUpdate(component.id, updates)}
    >
      {/* Render children inside container */}
      {isContainer && children.length > 0 && (
        <div className="relative w-full h-full">
          {children.map((child) => (
            <ComponentTreeRenderer
              key={child.id}
              component={child}
              allComponents={allComponents}
              selectedComponent={selectedComponent}
              disabled={disabled}
              onSelect={onSelect}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
      {/* Show drop zone indicator for empty containers */}
      {isContainer && children.length === 0 && (
        <div className="absolute inset-2 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm pointer-events-none">
          Drop components here
        </div>
      )}
    </ResizableComponent>
  );
}

// Wrapper component to force remount on navigation
export default function UIBuilderPage() {
  const location = useLocation();
  // Key forces remount when navigating to this page, ensuring fresh data load
  return (
    <UIAgentProvider>
      <UIBuilderContent key={location.key} />
    </UIAgentProvider>
  );
}

function UIBuilderContent() {
  const [searchParams] = useSearchParams();
  const cardId = searchParams.get('cardId');
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId);

  const [selectedBreakpoint, setSelectedBreakpoint] = useState(SCREEN_BREAKPOINTS[2]);
  const [selectedComponent, setSelectedComponent] = useState<CanvasComponent | null>(null);
  const [activeTab, setActiveTab] = useState('styles');
  const [canvasComponents, setCanvasComponents] = useState<CanvasComponent[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [designName, setDesignName] = useState('main-design');
  const [annotationSettings, setAnnotationSettings] = useState<AnnotationSettings>(DEFAULT_ANNOTATION_SETTINGS);
  const [annotationsData, setAnnotationsData] = useState<string>('');
  // Right panel is now design-only (Agent moved to left panel)
  // Accordion states - default open values
  const [componentsOpen] = useState(true);
  const [annotationsOpen] = useState(false);
  const [propertiesOpen] = useState(true);
  const [propertiesPanelCollapsed, setPropertiesPanelCollapsed] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(() => {
    const saved = localStorage.getItem('agentworks-ui-canvas-height');
    return saved ? parseInt(saved) : 600;
  });
  const [canvasWidth, setCanvasWidth] = useState<number | null>(() => {
    const saved = localStorage.getItem('agentworks-ui-canvas-width');
    return saved ? parseInt(saved) : null;
  });

  // Persist canvas dimensions
  useEffect(() => {
    localStorage.setItem('agentworks-ui-canvas-height', String(canvasHeight));
  }, [canvasHeight]);

  useEffect(() => {
    if (canvasWidth) {
      localStorage.setItem('agentworks-ui-canvas-width', String(canvasWidth));
    } else {
      localStorage.removeItem('agentworks-ui-canvas-width');
    }
  }, [canvasWidth]);

  // View mode state for toggling between mockup, live preview, html preview, and screenshot
  type ViewMode = 'mockup' | 'preview' | 'html-preview' | 'screenshot';
  const [viewMode, setViewMode] = useState<ViewMode>('mockup');
  const [previewUrl, setPreviewUrl] = useState<string>('https://google.com');

  // Screenshot state for import/overlay mode
  const [screenshotImage, setScreenshotImage] = useState<string | null>(null);
  const [showScreenshotGallery, setShowScreenshotGallery] = useState(false);
  const [savedScreenshots, setSavedScreenshots] = useState<Array<{ filename: string; url: string; createdAt: string }>>([]);

  // Agent-generated HTML state (setter available for future UI Agent integration)
  const [agentGeneratedHTML, _setAgentGeneratedHTML] = useState<GeneratedHTML | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const annotationLayerRef = useRef<AnnotationLayerRef>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Load saved design on mount
  useEffect(() => {
    const loadDesign = async () => {
      if (!currentProjectId) {
        setIsLoading(false);
        return;
      }

      try {
        const name = cardId ? `card-${cardId}` : 'main-design';
        setDesignName(name);
        const component = await api.projects.getComponent(currentProjectId, 'ui-design', name);
        if (component && component.data && component.data.components) {
          setCanvasComponents(component.data.components);
          if (component.data.breakpoint) {
            const bp = SCREEN_BREAKPOINTS.find(b => b.id === component.data.breakpoint);
            if (bp) setSelectedBreakpoint(bp);
          }
          if (component.data.annotations) {
            setAnnotationsData(component.data.annotations);
            // Load annotations into the layer after a short delay to ensure canvas is ready
            setTimeout(() => {
              annotationLayerRef.current?.loadJSON(component.data.annotations);
            }, 100);
          }
          // Load preview URL if saved
          if (component.data.previewUrl) {
            setPreviewUrl(component.data.previewUrl);
          }
        }
      } catch (error) {
        console.error('Failed to load design:', error);
      } finally {
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    loadDesign();
  }, [currentProjectId, cardId]);

  // Auto-save on component changes with debounce
  const saveDesign = useCallback(async () => {
    if (!currentProjectId || isInitialLoadRef.current) return;

    setSaveStatus('saving');
    try {
      await api.projects.saveComponent(currentProjectId, {
        type: 'ui-design',
        name: designName,
        data: {
          components: canvasComponents,
          breakpoint: selectedBreakpoint.id,
          cardId: cardId || undefined,
          annotations: annotationsData,
          previewUrl: previewUrl,
          lastSaved: new Date().toISOString(),
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save design:', error);
      setSaveStatus('error');
    }
  }, [currentProjectId, canvasComponents, selectedBreakpoint, designName, cardId, annotationsData, previewUrl]);

  // Debounced auto-save when canvas components or annotations change
  useEffect(() => {
    if (isInitialLoadRef.current || !currentProjectId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveDesign();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [canvasComponents, annotationsData, saveDesign, currentProjectId]);

  // Handle annotation settings changes
  const handleAnnotationSettingsChange = useCallback((updates: Partial<AnnotationSettings>) => {
    setAnnotationSettings(prev => ({ ...prev, ...updates }));
    // Deselect component when switching to annotation mode
    if (updates.tool && updates.tool !== 'select') {
      setSelectedComponent(null);
    }
  }, []);

  // Handle annotation data changes
  const handleAnnotationChange = useCallback((json: string) => {
    setAnnotationsData(json);
  }, []);

  // Clear annotations handler
  const handleClearAnnotations = useCallback(() => {
    annotationLayerRef.current?.clear();
    setAnnotationsData('');
  }, []);

  // Delete component handler
  const handleDeleteComponent = useCallback(() => {
    if (!selectedComponent) return;
    const updated = removeComponent(selectedComponent.id, canvasComponents, true);
    setCanvasComponents(updated);
    setSelectedComponent(null);
  }, [selectedComponent, canvasComponents]);

  // Z-index handlers
  const handleBringForward = useCallback(() => {
    if (!selectedComponent) return;
    const updated = canvasComponents.map(c =>
      c.id === selectedComponent.id ? { ...c, zIndex: (c.zIndex || 0) + 1 } : c
    );
    setCanvasComponents(updated);
    setSelectedComponent({ ...selectedComponent, zIndex: (selectedComponent.zIndex || 0) + 1 });
  }, [selectedComponent, canvasComponents]);

  const handleSendBackward = useCallback(() => {
    if (!selectedComponent) return;
    const updated = canvasComponents.map(c =>
      c.id === selectedComponent.id ? { ...c, zIndex: Math.max(0, (c.zIndex || 0) - 1) } : c
    );
    setCanvasComponents(updated);
    setSelectedComponent({ ...selectedComponent, zIndex: Math.max(0, (selectedComponent.zIndex || 0) - 1) });
  }, [selectedComponent, canvasComponents]);

  const handleBringToFront = useCallback(() => {
    if (!selectedComponent) return;
    const maxZ = Math.max(...canvasComponents.map(c => c.zIndex || 0));
    const updated = canvasComponents.map(c =>
      c.id === selectedComponent.id ? { ...c, zIndex: maxZ + 1 } : c
    );
    setCanvasComponents(updated);
    setSelectedComponent({ ...selectedComponent, zIndex: maxZ + 1 });
  }, [selectedComponent, canvasComponents]);

  const handleSendToBack = useCallback(() => {
    if (!selectedComponent) return;
    const updated = canvasComponents.map(c =>
      c.id === selectedComponent.id ? { ...c, zIndex: 0 } : c
    );
    setCanvasComponents(updated);
    setSelectedComponent({ ...selectedComponent, zIndex: 0 });
  }, [selectedComponent, canvasComponents]);


  // Load saved screenshots from project
  const loadScreenshots = useCallback(async () => {
    if (!currentProjectId) return;
    try {
      const result = await api.projects.listScreenshots(currentProjectId);
      setSavedScreenshots(result.screenshots || []);
    } catch (error) {
      console.error('[UIBuilder] Failed to load screenshots:', error);
    }
  }, [currentProjectId]);

  // Import a screenshot as the canvas background
  const handleImportScreenshot = useCallback(async (url: string) => {
    // Convert relative URL to full URL for the API
    const fullUrl = url.startsWith('/api') ? url : `/api${url}`;
    setScreenshotImage(fullUrl);
    setViewMode('screenshot');
    setShowScreenshotGallery(false);
  }, []);

  // Open screenshot gallery
  const handleOpenScreenshotGallery = useCallback(async () => {
    await loadScreenshots();
    setShowScreenshotGallery(true);
  }, [loadScreenshots]);

  // Keyboard listener for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedComponent) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        handleDeleteComponent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponent, handleDeleteComponent]);

  const handleTakeSnapshot = async () => {
    setIsCapturing(true);
    try {
      let result: SnapshotResult;

      if (viewMode === 'html-preview' && agentGeneratedHTML) {
        // Use the new HTML content capture for HTML Preview mode
        // This renders HTML to a temporary off-screen div to bypass iframe limitations
        result = await captureHTMLContent(
          agentGeneratedHTML.html,
          agentGeneratedHTML.css,
          canvasWidth || selectedBreakpoint.width,
          canvasHeight,
          { download: false }
        );
      } else if (canvasRef.current) {
        // Use existing canvas capture for Mockup mode
        result = await captureSnapshot(canvasRef.current, { download: false });
      } else {
        throw new Error('Nothing to capture');
      }

      // Save to project folder via API if we have a project
      if (currentProjectId) {
        try {
          const savedPath = await api.projects.saveScreenshot(currentProjectId, result.blob);
          console.log('[UIBuilder] Screenshot saved:', savedPath);
        } catch (saveError) {
          console.error('[UIBuilder] Failed to save screenshot to project:', saveError);
          // Continue with download even if save fails
        }
      }

      // Trigger download for user
      downloadSnapshot(result.dataUrl, 'ui-builder-snapshot');

    } catch (error) {
      console.error('Failed to capture snapshot:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle click-to-add (fallback for non-drag)
  const handleComponentClick = (component: ComponentItem) => {
    const newComponent: CanvasComponent = {
      id: `${component.id}_${Date.now()}`,
      type: component.id,
      name: component.name,
      x: 100,
      y: 100,
      width: component.isContainer ? 300 : 200,
      height: component.isContainer ? 200 : 100,
      properties: {
        text: component.name,
        color: '#3B82F6',
        backgroundColor: component.isContainer ? '#F3F4F6' : '#FFFFFF',
        padding: '12px',
        margin: '8px',
      },
      isContainer: component.isContainer || false,
      acceptsChildren: component.isContainer || false,
      parentId: null,
      childIds: [],
    };
    setCanvasComponents([...canvasComponents, newComponent]);
    setSelectedComponent(newComponent);
  };

  // Drag start handler for component palette
  const handleDragStart = (e: React.DragEvent, component: ComponentItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(component));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Drop handler for canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const component = JSON.parse(data) as ComponentItem;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left - 100; // Offset to center component
      const y = e.clientY - rect.top - 50;

      const newComponent: CanvasComponent = {
        id: `${component.id}_${Date.now()}`,
        type: component.id,
        name: component.name,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: component.isContainer ? 300 : 200,
        height: component.isContainer ? 200 : 100,
        properties: {
          text: component.name,
          color: '#3B82F6',
          backgroundColor: component.isContainer ? '#F3F4F6' : '#FFFFFF',
          padding: '12px',
          margin: '8px',
        },
        isContainer: component.isContainer || false,
        acceptsChildren: component.isContainer || false,
        parentId: null,
        childIds: [],
      };
      setCanvasComponents([...canvasComponents, newComponent]);
      setSelectedComponent(newComponent);
    } catch (err) {
      console.error('Failed to parse dropped component:', err);
    }
  };

  // Drag over handler (required for drop to work)
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading design...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-100">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="flex flex-col border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-gray-900">
              UI Builder {cardId && <span className="text-sm text-gray-500">(Card: {cardId.slice(0, 8)}...)</span>}
            </h1>
            {/* Save Status Indicator */}
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  Save failed
                </span>
              )}
            </div>
            {/* Canvas Size Controls */}
            <div className="flex items-center gap-3 ml-4">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">W:</label>
                <input
                  type="number"
                  value={canvasWidth || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setCanvasWidth(val ? Math.max(320, Math.min(2560, val)) : null);
                  }}
                  placeholder="Auto"
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                  min="320"
                  max="2560"
                  step="10"
                />
              </div>
              <span className="text-xs text-gray-300">×</span>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500">H:</label>
                <input
                  type="number"
                  value={canvasHeight}
                  onChange={(e) => setCanvasHeight(Math.max(300, parseInt(e.target.value) || 600))}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                  min="300"
                  max="2000"
                  step="50"
                />
              </div>
              <span className="text-xs text-gray-400">px</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={saveDesign}
              disabled={saveStatus === 'saving' || !currentProjectId}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
            <button
              onClick={handleTakeSnapshot}
              disabled={isCapturing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {isCapturing ? 'Capturing...' : 'Snapshot'}
            </button>
            <button
              onClick={() => {
                const json = JSON.stringify({
                  components: canvasComponents,
                  breakpoint: selectedBreakpoint.id,
                  annotations: annotationsData,
                }, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ui-design-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              onClick={handleOpenScreenshotGallery}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              title="Import a saved screenshot"
            >
              <FolderOpen className="h-4 w-4" />
              Import
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('mockup')}
                className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'mockup'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Mockup
              </button>
              <button
                onClick={() => setViewMode('html-preview')}
                className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'html-preview'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Agent-generated HTML preview"
              >
                <FileCode className="h-3.5 w-3.5" />
                HTML
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex">
          {/* Design Canvas */}
          <div className="flex-1 bg-gray-50 p-8 overflow-auto">
            <div className="flex justify-center">
              {/* Browser Frame */}
              <div ref={canvasRef} className="bg-gray-200 rounded-lg p-2 shadow-lg">
                <div className="bg-white rounded-t border border-gray-300 p-2 flex items-center gap-2 mb-0">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded text-xs px-3 py-1 text-gray-600 text-center truncate">
                    {viewMode === 'mockup' ? `localhost:3010/ui-builder/${selectedBreakpoint.id}` : previewUrl}
                  </div>
                </div>
                
                <div
                  ref={canvasContainerRef}
                  className="bg-white border-l border-r border-b border-gray-300 rounded-b overflow-hidden relative"
                  style={{
                    width: (canvasWidth || selectedBreakpoint.width) + 'px',
                    minHeight: canvasHeight + 'px'
                  }}
                  onDrop={handleCanvasDrop}
                  onDragOver={handleCanvasDragOver}
                  onClick={(e) => {
                    // Deselect component when clicking on empty canvas space (not in annotation mode)
                    if (e.target === e.currentTarget && annotationSettings.tool === 'select') {
                      setSelectedComponent(null);
                    }
                  }}
                >
                  {/* Canvas Content */}
                  <div className="relative h-full" style={{ minHeight: canvasHeight + 'px' }}>
                    {viewMode === 'mockup' ? (
                      // Mockup Mode - drag-and-drop components
                      <>
                        {canvasComponents.length === 0 ? (
                          <div className="flex items-center justify-center h-full p-8">
                            <div className="text-center">
                              <div className="h-16 w-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                                <Component className="h-8 w-8 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Building</h3>
                              <p className="text-gray-600">
                                Drag components from the library to start building your interface
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 relative" style={{ minHeight: (canvasHeight - 40) + 'px' }}>
                            {/* Only render root-level components (no parent) */}
                            {getRootComponents(canvasComponents).map((comp) => (
                              <ComponentTreeRenderer
                                key={comp.id}
                                component={comp}
                                allComponents={canvasComponents}
                                selectedComponent={selectedComponent}
                                disabled={annotationSettings.tool !== 'select'}
                                onSelect={(c) => setSelectedComponent(c)}
                                onUpdate={(id, updates) => {
                                  const updated = canvasComponents.map(c =>
                                    c.id === id ? { ...c, ...updates } : c
                                  );
                                  setCanvasComponents(updated);
                                  // Update selected component if it's the one being updated
                                  if (selectedComponent?.id === id) {
                                    const updatedComp = updated.find(c => c.id === id);
                                    if (updatedComp) setSelectedComponent(updatedComp);
                                  }
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    ) : viewMode === 'html-preview' ? (
                      // HTML Preview Mode - Agent-generated HTML/CSS
                      <div style={{ width: '100%', height: canvasHeight, position: 'relative' }}>
                        {agentGeneratedHTML ? (
                          <HTMLPreview
                            html={agentGeneratedHTML.html}
                            css={agentGeneratedHTML.css}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full p-8">
                            <div className="text-center">
                              <div className="h-16 w-16 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                                <FileCode className="h-8 w-8 text-purple-500" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">No HTML Generated</h3>
                              <p className="text-gray-600">
                                Use the UI Agent (Cmd+Shift+U) to generate HTML mockups
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : viewMode === 'screenshot' ? (
                      // Screenshot Mode - Display imported screenshot with annotation overlay
                      <div style={{ width: '100%', height: canvasHeight, position: 'relative' }}>
                        {screenshotImage ? (
                          <img
                            src={screenshotImage}
                            alt="Imported screenshot"
                            className="w-full h-full object-contain"
                            style={{ maxHeight: canvasHeight }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full p-8">
                            <div className="text-center">
                              <div className="h-16 w-16 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-blue-500" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Screenshot Loaded</h3>
                              <p className="text-gray-600 mb-4">
                                Import a saved screenshot or take a new one
                              </p>
                              <button
                                onClick={handleOpenScreenshotGallery}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Import Screenshot
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Live Preview Mode - Neko browser with full UI
                      <div className="w-full h-full relative" style={{ minHeight: canvasHeight }}>
                        <iframe
                          src="http://192.168.12.46:8090/?usr=user&pwd=neko-session-password"
                          className="w-full h-full border-0"
                          style={{ minHeight: canvasHeight }}
                          allow="autoplay; fullscreen; clipboard-read; clipboard-write"
                          title="Live Browser Preview"
                        />
                      </div>
                    )}
                    {/* Annotation Layer - ALWAYS on top of both modes */}
                    <AnnotationLayer
                      ref={annotationLayerRef}
                      width={canvasWidth || selectedBreakpoint.width}
                      height={canvasHeight}
                      settings={annotationSettings}
                      disabled={annotationSettings.tool === 'select'}
                      onChange={handleAnnotationChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Right Panel */}
          <div className={`${propertiesPanelCollapsed ? 'w-12' : 'w-96'} bg-white border-l border-gray-200 flex flex-col transition-all duration-200`}>
            {/* Panel Header with Breakpoints and Tabs */}
            <div className="border-b border-gray-200">
              {/* Breakpoint Selector - Above Tabs */}
              {!propertiesPanelCollapsed && (
                <div className="p-2 border-b border-gray-100">
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    {SCREEN_BREAKPOINTS.map((breakpoint) => {
                      const Icon = breakpoint.icon;
                      return (
                        <button
                          key={breakpoint.id}
                          onClick={() => setSelectedBreakpoint(breakpoint)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
                            selectedBreakpoint.id === breakpoint.id
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{breakpoint.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Collapse and Tabs */}
              <div className="flex items-center p-2">
                <button
                  onClick={() => setPropertiesPanelCollapsed(!propertiesPanelCollapsed)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={propertiesPanelCollapsed ? 'Expand Panel' : 'Collapse Panel'}
                >
                  {propertiesPanelCollapsed ? <ChevronLeft className="h-4 w-4 text-gray-600" /> : <ChevronRight className="h-4 w-4 text-gray-600" />}
                </button>
                {!propertiesPanelCollapsed && (
                  <div className="flex-1 flex items-center gap-2 mx-2">
                    <Layers className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Design</span>
                  </div>
                )}
              </div>
            </div>

            {/* Panel Content */}
            {!propertiesPanelCollapsed && (
              <div className="flex-1 overflow-auto">
                {/* Design Panel Content */}
                <div className="flex flex-col h-full">
                    {/* Components Accordion */}
                    <Accordion
                      title="Components"
                      icon={<Component className="h-4 w-4" />}
                      defaultOpen={componentsOpen}
                      badge={<span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{Object.values(COMPONENT_LIBRARY).flat().length}</span>}
                    >
                      <div className="space-y-3">
                        {Object.entries(COMPONENT_LIBRARY).map(([category, components]) => (
                          <div key={category}>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                              {category}
                            </h4>
                            <div className="grid grid-cols-3 gap-1.5">
                              {components.map((component) => {
                                const Icon = component.icon;
                                return (
                                  <button
                                    key={component.id}
                                    onClick={() => handleComponentClick(component)}
                                    onDragStart={(e) => handleDragStart(e, component)}
                                    className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-grab active:cursor-grabbing"
                                    draggable
                                    title={component.description}
                                  >
                                    <Icon className="h-4 w-4 text-gray-500" />
                                    <span className="text-xs text-gray-600 truncate w-full text-center">{component.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Accordion>

                    {/* Annotations Accordion */}
                    <Accordion
                      title="Annotations"
                      icon={<Edit className="h-4 w-4" />}
                      defaultOpen={annotationsOpen}
                    >
                      <AnnotationToolbar
                        settings={annotationSettings}
                        onSettingsChange={handleAnnotationSettingsChange}
                        onClear={handleClearAnnotations}
                      />
                    </Accordion>

                    {/* Properties Accordion */}
                    <Accordion
                      title={selectedComponent ? `Properties: ${selectedComponent.name}` : 'Properties'}
                      icon={<Settings className="h-4 w-4" />}
                      defaultOpen={propertiesOpen}
                      badge={selectedComponent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteComponent();
                          }}
                          className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors"
                          title="Delete Component"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    >
                      {selectedComponent ? (
                        <div className="space-y-3">
                          {/* Layer Controls */}
                          <div className="flex items-center justify-center gap-1 p-2 bg-gray-50 rounded-lg">
                            <Layers className="h-4 w-4 text-gray-500 mr-1" />
                            <button onClick={handleSendToBack} className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Send to Back">
                              <ChevronsDown className="h-4 w-4 text-gray-600" />
                            </button>
                            <button onClick={handleSendBackward} className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Send Backward">
                              <ArrowDown className="h-4 w-4 text-gray-600" />
                            </button>
                            <button onClick={handleBringForward} className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Bring Forward">
                              <ArrowUp className="h-4 w-4 text-gray-600" />
                            </button>
                            <button onClick={handleBringToFront} className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Bring to Front">
                              <ChevronsUp className="h-4 w-4 text-gray-600" />
                            </button>
                            <span className="text-xs text-gray-500 ml-2">z: {selectedComponent.zIndex || 0}</span>
                          </div>

                          {/* Property Tabs */}
                          <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => setActiveTab('styles')}
                              className={`flex-1 px-2 py-1 text-xs rounded ${activeTab === 'styles' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                              Styles
                            </button>
                            <button
                              onClick={() => setActiveTab('size')}
                              className={`flex-1 px-2 py-1 text-xs rounded ${activeTab === 'size' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                              Size
                            </button>
                            <button
                              onClick={() => setActiveTab('data')}
                              className={`flex-1 px-2 py-1 text-xs rounded ${activeTab === 'data' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                              Data
                            </button>
                          </div>

                          {/* Styles Tab */}
                          {activeTab === 'styles' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Text</label>
                                <input
                                  type="text"
                                  value={selectedComponent.properties.text}
                                  onChange={(e) => {
                                    const updated = { ...selectedComponent, properties: { ...selectedComponent.properties, text: e.target.value } };
                                    setSelectedComponent(updated);
                                    setCanvasComponents(canvasComponents.map(c => c.id === updated.id ? updated : c));
                                  }}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Background</label>
                                <div className="flex gap-2">
                                  <input
                                    type="color"
                                    value={selectedComponent.properties.backgroundColor}
                                    onChange={(e) => {
                                      const updated = { ...selectedComponent, properties: { ...selectedComponent.properties, backgroundColor: e.target.value } };
                                      setSelectedComponent(updated);
                                      setCanvasComponents(canvasComponents.map(c => c.id === updated.id ? updated : c));
                                    }}
                                    className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    value={selectedComponent.properties.backgroundColor}
                                    onChange={(e) => {
                                      const updated = { ...selectedComponent, properties: { ...selectedComponent.properties, backgroundColor: e.target.value } };
                                      setSelectedComponent(updated);
                                      setCanvasComponents(canvasComponents.map(c => c.id === updated.id ? updated : c));
                                    }}
                                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Width</label>
                                  <input
                                    type="number"
                                    value={selectedComponent.width}
                                    onChange={(e) => {
                                      const updated = { ...selectedComponent, width: parseInt(e.target.value) };
                                      setSelectedComponent(updated);
                                      setCanvasComponents(canvasComponents.map(c => c.id === updated.id ? updated : c));
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Height</label>
                                  <input
                                    type="number"
                                    value={selectedComponent.height}
                                    onChange={(e) => {
                                      const updated = { ...selectedComponent, height: parseInt(e.target.value) };
                                      setSelectedComponent(updated);
                                      setCanvasComponents(canvasComponents.map(c => c.id === updated.id ? updated : c));
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Size Tab */}
                          {activeTab === 'size' && (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">X</label>
                                  <input
                                    type="number"
                                    value={selectedComponent.x}
                                    onChange={(e) => {
                                      const updated = { ...selectedComponent, x: parseInt(e.target.value) || 0 };
                                      setSelectedComponent(updated);
                                      setCanvasComponents(canvasComponents.map(c => c.id === updated.id ? updated : c));
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Y</label>
                                  <input
                                    type="number"
                                    value={selectedComponent.y}
                                    onChange={(e) => {
                                      const updated = { ...selectedComponent, y: parseInt(e.target.value) || 0 };
                                      setSelectedComponent(updated);
                                      setCanvasComponents(canvasComponents.map(c => c.id === updated.id ? updated : c));
                                    }}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>
                              <div className="border-t border-gray-200 pt-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                  <span className="text-xs text-gray-700">Lock aspect ratio</span>
                                  <Link2 className="h-3 w-3 text-gray-400" />
                                </label>
                                <p className="text-xs text-gray-400 mt-1 ml-6">
                                  {(selectedComponent.width / selectedComponent.height).toFixed(2)}:1
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Data Tab */}
                          {activeTab === 'data' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Type</label>
                                <input type="text" value={selectedComponent.type} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-50" readOnly />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">ID</label>
                                <input type="text" value={selectedComponent.id} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-50 text-xs" readOnly />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-4">
                          <Component className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-xs">Select a component to edit</p>
                        </div>
                      )}
                    </Accordion>
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screenshot Gallery Modal */}
      {showScreenshotGallery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Screenshot Gallery</h2>
                  <p className="text-sm text-gray-500">Select a screenshot to import as canvas background</p>
                </div>
              </div>
              <button
                onClick={() => setShowScreenshotGallery(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {savedScreenshots.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Screenshots Yet</h3>
                  <p className="text-gray-500 mb-4">Take a snapshot in the UI Builder to save screenshots to your project</p>
                  <p className="text-sm text-gray-400">
                    Screenshots are saved to: <code className="bg-gray-100 px-1 rounded">UI-screenshots/</code>
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {savedScreenshots.map((screenshot) => (
                    <button
                      key={screenshot.filename}
                      onClick={() => handleImportScreenshot(screenshot.url)}
                      className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors"
                    >
                      <img
                        src={screenshot.url}
                        alt={screenshot.filename}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-white rounded-lg text-sm font-medium shadow-lg transition-opacity">
                          Import
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="text-xs text-white truncate">{screenshot.filename}</p>
                        <p className="text-xs text-white/70">
                          {new Date(screenshot.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowScreenshotGallery(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={loadScreenshots}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}