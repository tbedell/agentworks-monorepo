import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Eye,
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
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Camera,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { captureSnapshot } from '../lib/snapshot';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspace';

interface ComponentItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
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
}

const SCREEN_BREAKPOINTS = [
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: 375 },
  { id: 'tablet', label: 'Tablet', icon: Tablet, width: 768 },
  { id: 'desktop', label: 'Desktop', icon: Desktop, width: 1024 },
];

const COMPONENT_LIBRARY = {
  LAYOUT: [
    { id: 'container', name: 'Container', icon: Square, description: 'Basic container component' },
    { id: 'grid', name: 'Grid', icon: Grid3X3, description: 'Grid layout system' },
    { id: 'flexbox', name: 'Flexbox', icon: Box, description: 'Flexible box layout' },
  ],
  COMPONENTS: [
    { id: 'button', name: 'Button', icon: MousePointer, description: 'Interactive button element' },
    { id: 'input', name: 'Input', icon: Type, description: 'Text input field' },
    { id: 'card', name: 'Card', icon: CreditCard, description: 'Content card component' },
    { id: 'table', name: 'Table', icon: Table, description: 'Data table component' },
    { id: 'modal', name: 'Modal', icon: Circle, description: 'Modal dialog overlay' },
    { id: 'navigation', name: 'Navigation', icon: Navigation, description: 'Navigation menu' },
  ],
  DATA: [
    { id: 'list', name: 'List', icon: List, description: 'Dynamic list component' },
    { id: 'chart', name: 'Chart', icon: BarChart3, description: 'Data visualization chart' },
    { id: 'form', name: 'Form', icon: FileText, description: 'Form input collection' },
  ]
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function UIBuilderPage() {
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
  const canvasRef = useRef<HTMLDivElement>(null);
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
          lastSaved: new Date().toISOString(),
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save design:', error);
      setSaveStatus('error');
    }
  }, [currentProjectId, canvasComponents, selectedBreakpoint, designName, cardId]);

  // Debounced auto-save when canvas components change
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
  }, [canvasComponents, saveDesign, currentProjectId]);

  const handleTakeSnapshot = async () => {
    if (!canvasRef.current) return;
    setIsCapturing(true);
    try {
      await captureSnapshot(canvasRef.current, {
        download: true,
        filename: 'ui-builder-snapshot',
      });
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleComponentDrop = (component: ComponentItem) => {
    const newComponent = {
      id: `${component.id}_${Date.now()}`,
      type: component.id,
      name: component.name,
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      properties: {
        text: component.name,
        color: '#3B82F6',
        backgroundColor: '#FFFFFF',
        padding: '12px',
        margin: '8px',
      }
    };
    setCanvasComponents([...canvasComponents, newComponent]);
    setSelectedComponent(newComponent);
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
      {/* Left Sidebar - Component Library */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-4">Component Library</h2>
        </div>

        <div className="flex-1 overflow-auto">
          {Object.entries(COMPONENT_LIBRARY).map(([category, components]) => (
            <div key={category} className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {components.map((component) => {
                  const Icon = component.icon;
                  return (
                    <button
                      key={component.id}
                      onClick={() => handleComponentDrop(component)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                      draggable
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                        <div>
                          <div className="font-medium text-sm text-gray-900">{component.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{component.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
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
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded">
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
                const json = JSON.stringify({ components: canvasComponents, breakpoint: selectedBreakpoint.id }, null, 2);
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
              Export JSON
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
              <FileCode className="h-4 w-4" />
              Generate Code
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
              <Eye className="h-4 w-4" />
              Preview
            </button>
            
            {/* Breakpoint Selector */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {SCREEN_BREAKPOINTS.map((breakpoint) => {
                const Icon = breakpoint.icon;
                return (
                  <button
                    key={breakpoint.id}
                    onClick={() => setSelectedBreakpoint(breakpoint)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                      selectedBreakpoint.id === breakpoint.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{breakpoint.label}</span>
                  </button>
                );
              })}
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
                  <div className="flex-1 bg-gray-100 rounded text-xs px-3 py-1 text-gray-600 text-center">
                    localhost:3010/ui-builder
                  </div>
                </div>
                
                <div 
                  className="bg-white border-l border-r border-b border-gray-300 rounded-b overflow-hidden relative"
                  style={{ 
                    width: selectedBreakpoint.width + 'px',
                    minHeight: '600px'
                  }}
                >
                  {/* Canvas Content */}
                  <div className="relative h-full">
                    {canvasComponents.length === 0 ? (
                      <div className="flex items-center justify-center h-full p-8">
                        <div className="text-center">
                          <div className="h-16 w-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                            <Component className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">AgentWorks - Dashboard</h3>
                          <p className="text-gray-600">
                            Drag components from the library to start building your interface
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <h2 className="text-2xl font-bold mb-6">AgentWorks Dashboard</h2>
                        {canvasComponents.map((comp) => (
                          <div
                            key={comp.id}
                            onClick={() => setSelectedComponent(comp)}
                            className={`absolute border-2 rounded cursor-pointer transition-all ${
                              selectedComponent?.id === comp.id
                                ? 'border-blue-500 shadow-lg'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{
                              left: comp.x,
                              top: comp.y,
                              width: comp.width,
                              height: comp.height,
                              backgroundColor: comp.properties.backgroundColor,
                              padding: comp.properties.padding,
                            }}
                          >
                            <div className="flex items-center justify-center h-full">
                              {comp.type === 'button' && (
                                <button className="px-4 py-2 bg-blue-600 text-white rounded">
                                  {comp.properties.text}
                                </button>
                              )}
                              {comp.type === 'input' && (
                                <input
                                  className="w-full px-3 py-2 border border-gray-300 rounded"
                                  placeholder={comp.properties.text}
                                />
                              )}
                              {comp.type === 'card' && (
                                <div className="w-full h-full bg-white border border-gray-200 rounded p-4">
                                  <h4 className="font-medium">{comp.properties.text}</h4>
                                </div>
                              )}
                              {!['button', 'input', 'card'].includes(comp.type) && (
                                <span className="text-gray-700">{comp.properties.text}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Properties</h3>
              <div className="flex mt-3 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('styles')}
                  className={`flex-1 px-3 py-1.5 text-sm rounded ${
                    activeTab === 'styles'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Styles
                </button>
                <button
                  onClick={() => setActiveTab('data')}
                  className={`flex-1 px-3 py-1.5 text-sm rounded ${
                    activeTab === 'data'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Data
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {selectedComponent ? (
                <div className="space-y-4">
                  {activeTab === 'styles' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Text</label>
                        <input
                          type="text"
                          value={selectedComponent.properties.text}
                          onChange={(e) => {
                            const updated = {
                              ...selectedComponent,
                              properties: { ...selectedComponent.properties, text: e.target.value }
                            };
                            setSelectedComponent(updated);
                            setCanvasComponents(canvasComponents.map(c => 
                              c.id === updated.id ? updated : c
                            ));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                        <input
                          type="color"
                          value={selectedComponent.properties.backgroundColor}
                          onChange={(e) => {
                            const updated = {
                              ...selectedComponent,
                              properties: { ...selectedComponent.properties, backgroundColor: e.target.value }
                            };
                            setSelectedComponent(updated);
                            setCanvasComponents(canvasComponents.map(c => 
                              c.id === updated.id ? updated : c
                            ));
                          }}
                          className="w-full h-10 border border-gray-300 rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                        <input
                          type="number"
                          value={selectedComponent.width}
                          onChange={(e) => {
                            const updated = { ...selectedComponent, width: parseInt(e.target.value) };
                            setSelectedComponent(updated);
                            setCanvasComponents(canvasComponents.map(c => 
                              c.id === updated.id ? updated : c
                            ));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
                        <input
                          type="number"
                          value={selectedComponent.height}
                          onChange={(e) => {
                            const updated = { ...selectedComponent, height: parseInt(e.target.value) };
                            setSelectedComponent(updated);
                            setCanvasComponents(canvasComponents.map(c => 
                              c.id === updated.id ? updated : c
                            ));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </>
                  )}
                  
                  {activeTab === 'data' && (
                    <div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Component Type</label>
                        <input
                          type="text"
                          value={selectedComponent.type}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                          readOnly
                        />
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Component ID</label>
                        <input
                          type="text"
                          value={selectedComponent.id}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                          readOnly
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 mt-8">
                  <Component className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a component to edit its properties</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}