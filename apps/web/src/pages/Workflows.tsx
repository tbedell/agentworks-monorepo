import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Zap,
  Play,
  Bot,
  Download,
  CheckCircle,
  Monitor,
  Camera,
  Save,
  AlertCircle,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { captureSnapshot } from '../lib/snapshot';
import { useWorkspaceStore } from '../stores/workspace';
import { useCoPilot } from '../contexts/CoPilotContext';
import WorkflowNodeComponent from '../components/workflow/WorkflowNode';
import SaveWorkflowModal from '../components/workflow/SaveWorkflowModal';
import { type WorkflowNodeData, type WorkflowNodeType } from '../components/workflow/types';
import { api } from '../lib/api';

const nodeTypes = {
  workflow: WorkflowNodeComponent,
} as const;

// Data format from left panel drop
interface LeftPanelBlockData {
  type: 'workflow';
  nodeType: WorkflowNodeType;
  label: string;
  description?: string;
}

const INITIAL_NODES: Node[] = [];

const INITIAL_EDGES: Edge[] = [];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Wrapper component to force remount on navigation
export default function WorkflowsPage() {
  const location = useLocation();
  // Key forces remount when navigating to this page, ensuring fresh data load
  return <WorkflowsContent key={location.key} />;
}

function WorkflowsContent() {
  const [searchParams] = useSearchParams();
  const cardId = searchParams.get('cardId');
  const { currentProjectId } = useWorkspaceStore();
  const { openDrawer } = useCoPilot();
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [propertiesTab, setPropertiesTab] = useState<'properties' | 'settings' | 'history'>('properties');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [workflowName, setWorkflowName] = useState('main-workflow');
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Listen for load-workflow-template events from left panel
  useEffect(() => {
    const handleLoadTemplate = (event: CustomEvent<{ nodes: Node[]; edges: Edge[]; name: string }>) => {
      const { nodes: templateNodes, edges: templateEdges, name } = event.detail;
      setNodes(templateNodes || []);
      setEdges(templateEdges || []);
      setWorkflowName(name);
    };

    window.addEventListener('load-workflow-template', handleLoadTemplate as EventListener);
    return () => {
      window.removeEventListener('load-workflow-template', handleLoadTemplate as EventListener);
    };
  }, [setNodes, setEdges]);

  // Load saved workflow on mount
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!currentProjectId) {
        setIsLoading(false);
        return;
      }

      try {
        const name = cardId ? `card-${cardId}` : 'main-workflow';
        setWorkflowName(name);
        const component = await api.projects.getComponent(currentProjectId, 'workflow', name);
        if (component && component.data) {
          if (component.data.nodes) setNodes(component.data.nodes);
          if (component.data.edges) setEdges(component.data.edges);
        }
      } catch (error) {
        console.error('Failed to load workflow:', error);
      } finally {
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
    };

    loadWorkflow();
  }, [currentProjectId, cardId, setNodes, setEdges]);

  // Auto-save on node/edge changes with debounce
  const saveWorkflow = useCallback(async () => {
    if (!currentProjectId || isInitialLoadRef.current) return;

    setSaveStatus('saving');
    try {
      await api.projects.saveComponent(currentProjectId, {
        type: 'workflow',
        name: workflowName,
        data: {
          nodes,
          edges,
          cardId: cardId || undefined,
          lastSaved: new Date().toISOString(),
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      setSaveStatus('error');
    }
  }, [currentProjectId, nodes, edges, workflowName, cardId]);

  // Debounced auto-save when nodes or edges change
  useEffect(() => {
    if (isInitialLoadRef.current || !currentProjectId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveWorkflow();
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, saveWorkflow, currentProjectId]);

  const handleTakeSnapshot = async () => {
    if (!flowContainerRef.current) return;
    setIsCapturing(true);
    try {
      await captureSnapshot(flowContainerRef.current, {
        download: true,
        filename: 'workflow-snapshot',
      });
    } catch (error) {
      console.error('Failed to capture snapshot:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const selectedNodeData = selectedNode?.data as WorkflowNodeData | undefined;

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#64748b' } }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const blockData = event.dataTransfer.getData('application/reactflow');
      if (!blockData) return;

      const block = JSON.parse(blockData) as LeftPanelBlockData;
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 90,
        y: event.clientY - reactFlowBounds.top - 30,
      };

      const newNode: Node = {
        id: `${block.nodeType}-${Date.now()}`,
        type: 'workflow',
        position,
        data: {
          label: block.label,
          nodeType: block.nodeType,
          description: block.description || '',
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeData = useCallback((nodeId: string, data: Partial<WorkflowNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      })
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...data } } : null);
    }
  }, [setNodes, selectedNode]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [setNodes, setEdges, selectedNode]);

  const handleSaveAsTemplate = useCallback(async (name: string, description: string) => {
    if (!currentProjectId) {
      throw new Error('No project selected');
    }

    await api.projects.saveWorkflowTemplate(currentProjectId, {
      name,
      description,
      nodes,
      edges,
    });

    // Invalidate the templates query to refresh the left panel
    queryClient.invalidateQueries({ queryKey: ['workflow-templates', currentProjectId] });
  }, [currentProjectId, nodes, edges, queryClient]);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const hasWorkflows = nodes.length > 0;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-amber-50/50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!hasWorkflows) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-slate-700" />
              <h1 className="text-lg font-semibold text-slate-900">Workflow Canvas</h1>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Automation Builder
            </span>
          </div>
        </div>

        <div
          ref={flowContainerRef}
          className="flex-1 flex items-center justify-center bg-amber-50/50 relative"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
              <Zap className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Workflows Yet</h3>
            <p className="text-sm text-slate-600 mb-6">
              Drag blocks from the left panel to build workflows, or use CoPilot to generate workflows based on your project requirements.
            </p>
            <button
              onClick={openDrawer}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Bot className="h-4 w-4" />
              Open CoPilot
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-slate-700" />
            <h1 className="text-lg font-semibold text-slate-900">
              Workflow Canvas {cardId && <span className="text-sm text-slate-500">(Card: {cardId.slice(0, 8)}...)</span>}
            </h1>
          </div>
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Automation Builder
          </span>
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
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={saveWorkflow}
            disabled={saveStatus === 'saving' || !currentProjectId}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={nodes.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 border border-amber-300 bg-amber-50 rounded-lg text-sm hover:bg-amber-100 disabled:opacity-50 text-amber-700"
          >
            <FolderPlus className="h-4 w-4" />
            Save as Template
          </button>
          <button
            onClick={handleTakeSnapshot}
            disabled={isCapturing}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            {isCapturing ? 'Capturing...' : 'Snapshot'}
          </button>
          <button
            onClick={() => {
              const json = JSON.stringify({ nodes, edges }, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `workflow-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
            <Play className="h-4 w-4" />
            Test Run
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            <CheckCircle className="h-4 w-4" />
            Activate
          </button>
          <div className="flex items-center gap-1 ml-4 border-l border-slate-200 pl-4">
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-500">-</button>
            <span className="text-sm text-slate-600 w-12 text-center">100%</span>
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-500">+</button>
            <button className="p-1.5 hover:bg-slate-100 rounded text-slate-500 ml-1">
              <Monitor className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded">DB</button>
            <button className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded">UI</button>
            <button className="px-2 py-1 text-sm bg-blue-600 text-white rounded">WF</button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div ref={flowContainerRef} className="flex-1 relative bg-amber-50/50" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            proOptions={proOptions}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d4d4d4" />
            <Controls showInteractive={false} />
            <MiniMap 
              nodeColor={(node) => {
                const data = node.data as WorkflowNodeData;
                const colorMap: Record<WorkflowNodeType, string> = {
                  trigger: '#3b82f6',
                  action: '#22c55e',
                  condition: '#eab308',
                  database: '#a855f7',
                  api: '#f97316',
                  ui: '#ec4899',
                  agent: '#6366f1',
                  notification: '#06b6d4',
                };
                return colorMap[data?.nodeType] || '#64748b';
              }}
              style={{ background: '#fef3c7' }}
            />
          </ReactFlow>
        </div>

        {selectedNode && selectedNodeData && (
          <div className="w-72 bg-white border-l border-slate-200 flex flex-col">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setPropertiesTab('properties')}
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  propertiesTab === 'properties' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Properties
              </button>
              <button
                onClick={() => setPropertiesTab('settings')}
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  propertiesTab === 'settings' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => setPropertiesTab('history')}
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  propertiesTab === 'history' 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                History
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {propertiesTab === 'properties' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Node Type</label>
                    <select 
                      value={selectedNodeData.nodeType}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => updateNodeData(selectedNode.id, { nodeType: e.target.value as WorkflowNodeType })}
                    >
                      <option value="trigger">Trigger</option>
                      <option value="condition">Condition</option>
                      <option value="action">Action</option>
                      <option value="agent">Agent</option>
                      <option value="api">API</option>
                      <option value="notification">Notification</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Node Name</label>
                    <input
                      type="text"
                      value={selectedNodeData.label}
                      onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={selectedNodeData.description || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                      rows={2}
                      placeholder={`${selectedNodeData.nodeType === 'condition' ? 'Check if card type is Feature' : 'Enter description...'}`}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Configuration</label>
                    
                    {selectedNodeData.nodeType === 'condition' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="card.type"
                            className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                            defaultValue="card.type"
                          />
                          <select className="px-2 py-1.5 border border-slate-200 rounded text-sm">
                            <option>equals</option>
                            <option>not equals</option>
                            <option>contains</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Feature"
                            className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm"
                            defaultValue="Feature"
                          />
                        </div>
                        <button className="text-sm text-blue-600 hover:text-blue-700">
                          + Add Condition
                        </button>
                      </div>
                    )}

                    {selectedNodeData.nodeType === 'agent' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Agent</label>
                          <select className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                            <option>ArchitectAgent</option>
                            <option>DevBackendAgent</option>
                            <option>DevFrontendAgent</option>
                            <option>QAAgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Task</label>
                          <input
                            type="text"
                            placeholder="Generate architecture design"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                            defaultValue="Generate architecture design"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNodeData.nodeType === 'notification' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Channel</label>
                          <input
                            type="text"
                            placeholder="Slack #dev-team"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                            defaultValue="Slack #dev-team"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Message</label>
                          <input
                            type="text"
                            placeholder="New feature card moved"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                            defaultValue="New feature card moved"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNodeData.nodeType === 'trigger' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Event</label>
                          <select className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                            <option>lane_changed</option>
                            <option>card_created</option>
                            <option>card_updated</option>
                            <option>agent_completed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">To Lane</label>
                          <input
                            type="text"
                            placeholder="Architecture (3)"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                            defaultValue="Architecture (3)"
                          />
                        </div>
                      </div>
                    )}

                    {selectedNodeData.nodeType === 'action' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Action</label>
                          <select className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
                            <option>Add attachment</option>
                            <option>Move card</option>
                            <option>Update field</option>
                            <option>Add comment</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">From</label>
                          <input
                            type="text"
                            placeholder="agent.output"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                            defaultValue="agent.output"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => deleteNode(selectedNode.id)}
                    className="w-full mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                  >
                    Delete Node
                  </button>
                </div>
              )}

              {propertiesTab === 'settings' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Retry on failure</label>
                    <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                      <option>3 times</option>
                      <option>5 times</option>
                      <option>No retry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Timeout</label>
                    <input
                      type="text"
                      defaultValue="30s"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Log execution</label>
                    <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                  </div>
                </div>
              )}

              {propertiesTab === 'history' && (
                <div className="text-sm text-slate-500 text-center py-8">
                  No execution history
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save as Template Modal */}
      <SaveWorkflowModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveAsTemplate}
        nodes={nodes}
        edges={edges}
      />
    </div>
  );
}
