import { useCallback, useState, useMemo } from 'react';
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
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Zap, 
  Play, 
  GitBranch, 
  Database, 
  Globe, 
  Monitor, 
  Bot, 
  Bell,
  Save,
  X,
  ChevronRight,
} from 'lucide-react';
import WorkflowNodeComponent from './WorkflowNode';
import { type WorkflowNodeData, type WorkflowNodeType, NODE_TYPE_CONFIG } from './types';

const nodeTypes = {
  workflow: WorkflowNodeComponent,
} as any;

const SIDEBAR_ITEMS: { type: WorkflowNodeType; icon: typeof Zap; label: string }[] = [
  { type: 'trigger', icon: Zap, label: 'Trigger' },
  { type: 'action', icon: Play, label: 'Action' },
  { type: 'condition', icon: GitBranch, label: 'Condition' },
  { type: 'database', icon: Database, label: 'Database' },
  { type: 'api', icon: Globe, label: 'API' },
  { type: 'ui', icon: Monitor, label: 'UI Component' },
  { type: 'agent', icon: Bot, label: 'Agent' },
  { type: 'notification', icon: Bell, label: 'Notification' },
];

interface WorkflowCanvasProps {
  workflowId?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

export default function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onClose,
  readOnly = false,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const selectedNodeData = selectedNode?.data as WorkflowNodeData | undefined;

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#64748b' } }, eds));
    },
    [setEdges]
  );

  const onDragStart = useCallback((event: React.DragEvent, nodeType: WorkflowNodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow') as WorkflowNodeType;
      if (!type) return;

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 90,
        y: event.clientY - reactFlowBounds.top - 30,
      };

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'workflow',
        position,
        data: {
          label: `New ${NODE_TYPE_CONFIG[type].label}`,
          nodeType: type,
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

  const handleSave = useCallback(() => {
    onSave?.(nodes, edges);
  }, [nodes, edges, onSave]);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  return (
    <div className="h-full flex bg-slate-100">
      {!sidebarCollapsed && !readOnly && (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Node Types</h3>
            <p className="text-xs text-slate-500 mt-1">Drag nodes to the canvas</p>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-2">
              {SIDEBAR_ITEMS.map((item) => {
                const config = NODE_TYPE_CONFIG[item.type];
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border-2 cursor-grab
                      ${config.bgColor} ${config.borderColor} ${config.color}
                      hover:shadow-md transition-shadow active:cursor-grabbing
                    `}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!readOnly && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-slate-200 rounded-r-lg p-1 shadow-sm hover:bg-slate-50"
          style={{ left: sidebarCollapsed ? 0 : '256px' }}
        >
          <ChevronRight className={`h-4 w-4 text-slate-600 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>
      )}

      <div className="flex-1 relative" onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          proOptions={proOptions}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
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
            style={{ background: '#f8fafc' }}
          />

          <Panel position="top-right" className="flex gap-2">
            {onSave && !readOnly && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            )}
          </Panel>
        </ReactFlow>
      </div>

      {selectedNode && selectedNodeData && (
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Properties</h3>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
                <input
                  type="text"
                  value={selectedNodeData.label}
                  onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                  disabled={readOnly}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={selectedNodeData.description || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                  disabled={readOnly}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <div className={`px-3 py-2 rounded-lg text-sm ${NODE_TYPE_CONFIG[selectedNodeData.nodeType].bgColor} ${NODE_TYPE_CONFIG[selectedNodeData.nodeType].color}`}>
                  {NODE_TYPE_CONFIG[selectedNodeData.nodeType].label}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Node ID</label>
                <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-500 font-mono">
                  {selectedNode.id}
                </div>
              </div>
              {!readOnly && (
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="w-full mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                >
                  Delete Node
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
