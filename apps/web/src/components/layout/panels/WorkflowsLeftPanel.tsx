import { useState } from 'react';
import {
  Zap,
  GitBranch,
  Clock,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Building2,
  Globe,
  Smartphone,
  FileCode,
  Bot,
  Loader2,
  ChevronRight,
  Webhook,
  Search,
  Timer,
  Bell,
  FileEdit,
  Blocks,
  GripVertical,
  FolderOpen,
  Trash2,
  Brain,
  Container,
  Cpu,
} from 'lucide-react';
import BaseLeftPanel from './BaseLeftPanel';
import { Accordion } from '../../common/Accordion';
import { useWorkspaceStore } from '../../../stores/workspace';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import WorkflowAgentPanel from '../../agents/WorkflowAgentPanel';
import { api } from '../../../lib/api';
import clsx from 'clsx';
import {
  TEMPLATES_BY_CATEGORY,
  CATEGORY_INFO,
  getTemplateById,
  type WorkflowTemplateDefinition,
  type TemplateCategory,
} from '@agentworks/shared/workflow-templates';

interface WorkflowsLeftPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Map category icons from CATEGORY_INFO to Lucide components
const CATEGORY_ICONS: Record<TemplateCategory, React.ElementType> = {
  saas: Building2,
  web: Globe,
  mobile: Smartphone,
  wordpress: FileCode,
  mcp: Cpu,
  devops: Container,
  ai: Brain,
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  saas: 'text-indigo-500',
  web: 'text-blue-500',
  mobile: 'text-green-500',
  wordpress: 'text-purple-500',
  mcp: 'text-cyan-500',
  devops: 'text-orange-500',
  ai: 'text-pink-500',
};

// Build blocks for manual workflow creation
interface WorkflowBlock {
  id: string;
  type: string;
  icon: React.ElementType;
  label: string;
  category: 'trigger' | 'condition' | 'action';
  color: string;
  description: string;
}

const WORKFLOW_BLOCKS: WorkflowBlock[] = [
  // Triggers
  { id: 'event', type: 'trigger', icon: Zap, label: 'Event', category: 'trigger', color: 'bg-blue-500', description: 'Trigger on card/project events' },
  { id: 'schedule', type: 'trigger', icon: Clock, label: 'Schedule', category: 'trigger', color: 'bg-blue-500', description: 'Run on a schedule (cron)' },
  { id: 'webhook', type: 'trigger', icon: Webhook, label: 'Webhook', category: 'trigger', color: 'bg-blue-500', description: 'Trigger via HTTP webhook' },
  // Conditions
  { id: 'filter', type: 'condition', icon: Search, label: 'Filter', category: 'condition', color: 'bg-yellow-500', description: 'Filter based on conditions' },
  { id: 'branch', type: 'condition', icon: GitBranch, label: 'Branch', category: 'condition', color: 'bg-yellow-500', description: 'Branch into multiple paths' },
  { id: 'delay', type: 'condition', icon: Timer, label: 'Delay', category: 'condition', color: 'bg-yellow-500', description: 'Wait before continuing' },
  // Actions
  { id: 'agent', type: 'agent', icon: Bot, label: 'Run Agent', category: 'action', color: 'bg-green-500', description: 'Execute an AI agent' },
  { id: 'api', type: 'api', icon: Globe, label: 'API Call', category: 'action', color: 'bg-green-500', description: 'Make an HTTP request' },
  { id: 'notify', type: 'notification', icon: Bell, label: 'Notify', category: 'action', color: 'bg-green-500', description: 'Send a notification' },
  { id: 'update-card', type: 'action', icon: FileEdit, label: 'Update Card', category: 'action', color: 'bg-green-500', description: 'Update a Kanban card' },
];

const BLOCK_CATEGORIES = [
  { id: 'trigger', label: 'Triggers', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'condition', label: 'Conditions', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  { id: 'action', label: 'Actions', color: 'text-green-600', bgColor: 'bg-green-50' },
];

// Template categories are now imported from @agentworks/shared/workflow-templates
// TEMPLATES_BY_CATEGORY contains full WorkflowTemplateDefinition objects with nodes/edges

const COMPLEXITY_COLORS = {
  simple: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  complex: 'bg-red-100 text-red-700',
};

// Categories in display order
const CATEGORY_ORDER: TemplateCategory[] = ['saas', 'web', 'mobile', 'wordpress', 'mcp', 'devops', 'ai'];

export default function WorkflowsLeftPanel({ collapsed, onToggle }: WorkflowsLeftPanelProps) {
  const { currentProjectId } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [startingWorkflow, setStartingWorkflow] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplateDefinition | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);

  // Fetch saved workflow templates from project
  const { data: savedTemplates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['workflow-templates', currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return { templates: [] };
      return api.projects.getWorkflowTemplates(currentProjectId);
    },
    enabled: !!currentProjectId,
  });

  // Fetch active workflows (placeholder - would need actual API)
  const { data: workflowData } = useQuery({
    queryKey: ['workflows', currentProjectId],
    queryFn: async () => {
      return {
        activeWorkflows: [
          { id: '1', name: 'Card Auto-Assign', status: 'active', runs: 24 },
          { id: '2', name: 'Daily Standup Report', status: 'active', runs: 15 },
        ],
        history: [
          { id: '1', workflow: 'Landing Page Generator', status: 'success', time: '2 min ago' },
          { id: '2', workflow: 'CRUD App Builder', status: 'success', time: '1 hour ago' },
          { id: '3', workflow: 'MCP Server Scaffold', status: 'failed', time: '3 hours ago' },
        ],
      };
    },
    enabled: !!currentProjectId,
  });

  const activeWorkflows = workflowData?.activeWorkflows || [];
  const history = workflowData?.history || [];
  const myWorkflows = savedTemplates?.templates || [];

  const handleStartWorkflow = async (template: WorkflowTemplateDefinition) => {
    setStartingWorkflow(template.id);

    // Load the full template definition and dispatch to canvas
    const fullTemplate = getTemplateById(template.id);
    if (fullTemplate) {
      // Dispatch event to load workflow template into canvas
      window.dispatchEvent(new CustomEvent('load-workflow-template', {
        detail: {
          nodes: fullTemplate.nodes,
          edges: fullTemplate.edges,
          name: fullTemplate.name,
          id: fullTemplate.id,
        }
      }));
      setSelectedTemplate(fullTemplate);
    }

    setStartingWorkflow(null);
  };

  const handleDeleteSavedTemplate = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentProjectId) return;

    setDeletingTemplate(name);
    try {
      await api.projects.deleteWorkflowTemplate(currentProjectId, name);
      queryClient.invalidateQueries({ queryKey: ['workflow-templates', currentProjectId] });
    } catch (error) {
      console.error('Failed to delete template:', error);
    } finally {
      setDeletingTemplate(null);
    }
  };

  const handleLoadSavedTemplate = async (name: string) => {
    if (!currentProjectId) return;
    try {
      const template = await api.projects.getWorkflowTemplate(currentProjectId, name);
      // Dispatch event to load workflow into canvas
      window.dispatchEvent(new CustomEvent('load-workflow-template', {
        detail: { nodes: template.nodes, edges: template.edges, name: template.name }
      }));
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, block: WorkflowBlock) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: 'workflow',
      nodeType: block.type,
      label: block.label,
      description: block.description,
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const agentBadge = (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded text-xs">
      <Zap className="h-3 w-3" />
      <span className="font-medium">Workflow</span>
    </div>
  );

  return (
    <BaseLeftPanel
      collapsed={collapsed}
      onToggle={onToggle}
      title="Workflows"
      agentButton={agentBadge}
      bottomContent={<WorkflowAgentPanel />}
    >
      {/* Build Blocks for Manual Creation */}
      <Accordion
        title="Build Blocks"
        icon={<Blocks className="h-4 w-4 text-slate-600" />}
        defaultOpen={true}
        headerRight={
          <span className="text-xs text-slate-400">Drag to canvas</span>
        }
      >
        <div className="space-y-3">
          {BLOCK_CATEGORIES.map((category) => {
            const categoryBlocks = WORKFLOW_BLOCKS.filter(b => b.category === category.id);
            return (
              <div key={category.id}>
                <div className={clsx('text-xs font-medium mb-1.5 px-1', category.color)}>
                  {category.label}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {categoryBlocks.map((block) => (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, block)}
                      className={clsx(
                        'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all',
                        'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm',
                        'group'
                      )}
                      title={block.description}
                    >
                      <GripVertical className="h-3 w-3 text-slate-300 group-hover:text-slate-400 shrink-0" />
                      <div className={clsx('w-5 h-5 rounded flex items-center justify-center shrink-0', block.color)}>
                        <block.icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {block.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Accordion>

      {/* My Workflows - Saved Templates */}
      <Accordion
        title="My Workflows"
        icon={<FolderOpen className="h-4 w-4 text-amber-500" />}
        defaultOpen={true}
        headerRight={
          myWorkflows.length > 0 ? (
            <span className="text-xs text-slate-400">{myWorkflows.length}</span>
          ) : null
        }
      >
        <div className="space-y-1.5">
          {isLoadingTemplates ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            </div>
          ) : myWorkflows.length > 0 ? (
            myWorkflows.map((workflow) => {
              const isDeleting = deletingTemplate === workflow.name;
              return (
                <div
                  key={workflow.name}
                  onClick={() => handleLoadSavedTemplate(workflow.name)}
                  className="flex items-center justify-between p-2 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-amber-900 truncate">
                        {workflow.name}
                      </div>
                      {workflow.description && (
                        <div className="text-xs text-amber-600 truncate">
                          {workflow.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-amber-500">
                      {workflow.nodeCount}n / {workflow.edgeCount}e
                    </span>
                    <button
                      onClick={(e) => handleDeleteSavedTemplate(workflow.name, e)}
                      disabled={isDeleting}
                      className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete workflow"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-400 text-center py-4">
              <FolderOpen className="h-5 w-5 mx-auto mb-1 text-slate-300" />
              No saved workflows yet
              <div className="mt-1 text-slate-400">
                Use "Save as Template" to save workflows
              </div>
            </div>
          )}
        </div>
      </Accordion>

      {/* Divider */}
      <div className="border-t border-slate-200 my-2" />

      {/* Template Categories */}
      {CATEGORY_ORDER.map((categoryId) => {
        const templates = TEMPLATES_BY_CATEGORY[categoryId];
        const info = CATEGORY_INFO[categoryId];
        const IconComponent = CATEGORY_ICONS[categoryId];
        const colorClass = CATEGORY_COLORS[categoryId];

        return (
          <Accordion
            key={categoryId}
            title={info.name}
            icon={<IconComponent className={clsx('h-4 w-4', colorClass)} />}
            defaultOpen={false}
            headerRight={
              <span className="text-xs text-slate-400">{templates.length}</span>
            }
          >
            <div className="space-y-1">
              {templates.map((template) => {
                const isStarting = startingWorkflow === template.id;
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <button
                    key={template.id}
                    onClick={() => handleStartWorkflow(template)}
                    disabled={isStarting}
                    className={clsx(
                      'w-full text-left p-2 rounded-lg border transition-all group',
                      isSelected
                        ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-orange-200'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={clsx(
                        'text-xs font-medium',
                        isSelected ? 'text-orange-900' : 'text-slate-700'
                      )}>
                        {template.name}
                      </span>
                      {isStarting ? (
                        <Loader2 className="h-3 w-3 text-orange-500 animate-spin" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 truncate pr-2">
                        {template.description}
                      </span>
                      <span className={clsx(
                        'text-xs px-1.5 py-0.5 rounded capitalize shrink-0',
                        COMPLEXITY_COLORS[template.complexity]
                      )}>
                        {template.complexity}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Accordion>
        );
      })}

      {/* Divider */}
      <div className="border-t border-slate-200 my-2" />

      {/* Active Workflows */}
      <Accordion
        title="Active Workflows"
        icon={<GitBranch className="h-4 w-4 text-slate-500" />}
        defaultOpen={false}
        headerRight={
          activeWorkflows.length > 0 ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              {activeWorkflows.length} running
            </span>
          ) : null
        }
      >
        <div className="space-y-1.5">
          {activeWorkflows.length > 0 ? (
            activeWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {workflow.status === 'active' ? (
                    <Play className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <Pause className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {workflow.name}
                  </span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{workflow.runs} runs</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 text-center py-2">
              No active workflows
            </div>
          )}
        </div>
      </Accordion>

      {/* Run History */}
      <Accordion
        title="Run History"
        icon={<Clock className="h-4 w-4 text-slate-500" />}
        defaultOpen={false}
      >
        <div className="space-y-1.5">
          {history.length > 0 ? (
            history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {entry.status === 'success' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {entry.workflow}
                  </span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{entry.time}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 text-center py-2">
              No recent runs
            </div>
          )}
        </div>
      </Accordion>
    </BaseLeftPanel>
  );
}
