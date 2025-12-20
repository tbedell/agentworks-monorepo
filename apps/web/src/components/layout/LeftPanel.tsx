import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Link2,
  BarChart3,
  Target,
  ListTodo,
  FileText,
  Terminal,
  Circle,
  Rocket,
  Lightbulb,
  Users,
  Layers,
  CheckCircle2,
  Bot,
  Settings,
  Play,
  CheckCircle,
  ClipboardList,
} from 'lucide-react';
import { Accordion } from '../common/Accordion';
import { useAuthStore } from '../../stores/auth';
import { useWorkspaceStore } from '../../stores/workspace';
import { useWebSocket } from '../../lib/websocket';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useCoPilot } from '../../contexts/CoPilotContext';
import PlanTab from '../rightpanel/PlanTab';
import TodoTab from '../rightpanel/TodoTab';

interface PlanningStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
}

const PLANNING_STEPS: PlanningStep[] = [
  { id: 'vision', title: 'Project Vision', description: 'Define the problem and solution', icon: Lightbulb },
  { id: 'requirements', title: 'Requirements', description: 'Functional requirements', icon: FileText },
  { id: 'goals', title: 'Goals & Metrics', description: 'Objectives and KPIs', icon: Target },
  { id: 'stakeholders', title: 'Stakeholders', description: 'Users and responsibilities', icon: Users },
  { id: 'architecture', title: 'Architecture', description: 'System design', icon: Settings },
];

const phaseDisplayConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  welcome: { label: 'Getting Started', icon: Rocket, color: 'text-blue-600 bg-blue-50' },
  vision: { label: 'Vision Definition', icon: Lightbulb, color: 'text-amber-600 bg-amber-50' },
  requirements: { label: 'Requirements', icon: FileText, color: 'text-green-600 bg-green-50' },
  goals: { label: 'Goals & Metrics', icon: Target, color: 'text-purple-600 bg-purple-50' },
  roles: { label: 'Team & Roles', icon: Users, color: 'text-indigo-600 bg-indigo-50' },
  architecture: { label: 'Architecture', icon: Layers, color: 'text-cyan-600 bg-cyan-50' },
  'blueprint-review': { label: 'Blueprint Review', icon: FileText, color: 'text-blue-600 bg-blue-50' },
  'prd-review': { label: 'PRD Review', icon: FileText, color: 'text-green-600 bg-green-50' },
  'mvp-review': { label: 'MVP Review', icon: Target, color: 'text-purple-600 bg-purple-50' },
  'playbook-review': { label: 'Agent Playbook Review', icon: Users, color: 'text-indigo-600 bg-indigo-50' },
  'planning-complete': { label: 'Ready to Build', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
  general: { label: 'In Development', icon: Rocket, color: 'text-slate-600 bg-slate-50' },
};

const phaseOrder = ['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture', 'blueprint-review', 'prd-review', 'mvp-review', 'playbook-review', 'planning-complete'];

interface LeftPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function LeftPanel({ collapsed, onToggle }: LeftPanelProps) {
  const { tenant } = useAuthStore();
  const { currentProjectId, currentWorkspaceId, projects } = useWorkspaceStore();
  const { connect, subscribe, subscribeTo, unsubscribeFrom, isConnected } = useWebSocket();
  const { startNewProjectFlow } = useCoPilot();
  const location = useLocation();
  const isOnPlanningPage = location.pathname === '/planning';

  const [agentStatus, setAgentStatus] = useState<Record<string, { status: string; lastSeen?: string }>>({});
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  const [projectStats, setProjectStats] = useState({ activeAgents: 0, cardsInFlow: 0, projectStatus: 'Planning' });

  const currentProject = currentWorkspaceId && currentProjectId
    ? projects[currentWorkspaceId]?.find(p => p.id === currentProjectId)
    : null;

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: api.agents.list,
  });

  const { data: projectData } = useQuery({
    queryKey: ['project', currentProjectId],
    queryFn: () => currentProjectId ? api.projects.get(currentProjectId) : null,
    enabled: !!currentProjectId,
  });

  const { data: recentRuns } = useQuery({
    queryKey: ['recent-runs', currentProjectId],
    queryFn: () => currentProjectId ? api.agents.getCardRuns(currentProjectId) : [],
    enabled: !!currentProjectId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    connect();

    const unsubscribeAgentStatus = subscribe('agent-status', (data) => {
      setAgentStatus(prev => ({
        ...prev,
        [data.agentName]: {
          status: data.status,
          lastSeen: new Date().toISOString()
        }
      }));
    });

    const unsubscribeRunUpdate = subscribe('run-update', (data) => {
      setActiveRuns(prev => {
        const existing = prev.find(r => r.id === data.id);
        if (existing) {
          return prev.map(r => r.id === data.id ? { ...r, ...data } : r);
        } else {
          return [data, ...prev].slice(0, 20);
        }
      });
    });

    const unsubscribeProjectStats = subscribe('project-stats', (data) => {
      setProjectStats(data);
    });

    if (currentProjectId) {
      subscribeTo({ projectId: currentProjectId });
    } else if (currentWorkspaceId) {
      subscribeTo({ workspaceId: currentWorkspaceId });
    }

    return () => {
      unsubscribeAgentStatus();
      unsubscribeRunUpdate();
      unsubscribeProjectStats();

      if (currentProjectId) {
        unsubscribeFrom({ projectId: currentProjectId });
      } else if (currentWorkspaceId) {
        unsubscribeFrom({ workspaceId: currentWorkspaceId });
      }
    };
  }, [currentProjectId, currentWorkspaceId, connect, subscribe, subscribeTo, unsubscribeFrom]);

  useEffect(() => {
    if (recentRuns) {
      setActiveRuns(recentRuns.slice(0, 20));
    }
  }, [recentRuns]);

  const getAgentStatusColor = (status?: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'idle': return 'bg-slate-300';
      default: return 'bg-slate-300';
    }
  };

  const quickLinks = [
    { label: 'Blueprint', href: '/planning?doc=blueprint', icon: FileText },
    { label: 'PRD', href: '/planning?doc=prd', icon: FileText },
    { label: 'MVP', href: '/planning?doc=mvp', icon: Target },
    { label: 'Playbook', href: '/planning?doc=playbook', icon: Users },
    { label: 'Terminal', href: '/terminal', icon: Terminal },
  ];

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-r-lg shadow-lg hover:bg-blue-700 transition-all z-40 group"
      >
        <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
        <span className="text-sm font-semibold text-slate-700">Project Panel</span>
        <button
          onClick={onToggle}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="Hide panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* CoPilot Button */}
      <div className="p-3 border-b border-slate-200">
        <button
          onClick={startNewProjectFlow}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
        >
          <Bot className="h-4 w-4" />
          <span className="font-medium text-sm">Open CoPilot</span>
        </button>
      </div>

      {/* Accordion Content */}
      <div className="flex-1 overflow-auto">
        {/* Planning Steps Section - Only on Planning page */}
        {isOnPlanningPage && (
          <Accordion
            title="Planning Steps"
            icon={<ClipboardList className="h-4 w-4" />}
            defaultOpen={true}
          >
            <div className="space-y-1.5">
              {PLANNING_STEPS.map((step, index) => {
                const phase = projectData?.phase || 'vision';
                const stepOrder = ['vision', 'requirements', 'goals', 'stakeholders', 'architecture'];
                const currentIndex = stepOrder.indexOf(phase);
                const stepIndex = stepOrder.indexOf(step.id);
                const isCompleted = stepIndex < currentIndex;
                const isCurrent = stepIndex === currentIndex;

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 border border-blue-200'
                        : isCompleted
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      ) : isCurrent ? (
                        <Play className="h-4 w-4 text-blue-600 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            isCurrent ? 'bg-blue-100 text-blue-700' : isCompleted ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </span>
                          <span className={`text-xs font-medium ${
                            isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-slate-700'
                          }`}>
                            {step.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Accordion>
        )}

        {/* Project Section */}
        <Accordion
          title="Project"
          icon={<FolderOpen className="h-4 w-4" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-slate-500">Organization:</span>
              <span className="ml-2 font-medium text-slate-900">{tenant?.name || 'My Organization'}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-500">Project:</span>
              <span className="ml-2 font-medium text-slate-900">{currentProject?.name || 'No Project Selected'}</span>
            </div>

            {projectData && (() => {
              const phase = projectData?.phase || 'vision';
              const phaseConfig = phaseDisplayConfig[phase] || phaseDisplayConfig.general;
              const PhaseIcon = phaseConfig.icon;
              const phaseIndex = phaseOrder.indexOf(phase);
              const progress = phaseIndex >= 0 ? ((phaseIndex + 1) / phaseOrder.length) * 100 : 0;

              return (
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${phaseConfig.color}`}>
                    <PhaseIcon className="h-4 w-4" />
                    <div className="text-xs">
                      <div className="font-medium">{phaseConfig.label}</div>
                      <div className="opacity-75">Phase {phaseIndex + 1}/{phaseOrder.length}</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </Accordion>

        {/* Quick Links Section */}
        <Accordion
          title="Quick Links"
          icon={<Link2 className="h-4 w-4" />}
          defaultOpen={true}
        >
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.label}
                  to={link.href}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </NavLink>
              );
            })}
          </div>
        </Accordion>

        {/* Summary Section */}
        <Accordion
          title="Summary"
          icon={<BarChart3 className="h-4 w-4" />}
          defaultOpen={false}
        >
          {!currentProjectId ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500">Select a project to see status</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Active Agents:</span>
                  <span className="text-slate-900 font-medium">{projectStats.activeAgents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Cards in Flow:</span>
                  <span className="text-slate-900 font-medium">{projectStats.cardsInFlow}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className="text-orange-600 font-medium">{projectStats.projectStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Connection:</span>
                  <div className="flex items-center gap-1">
                    <Circle className={`h-2 w-2 ${isConnected() ? 'text-green-500 fill-current' : 'text-red-500 fill-current'}`} />
                    <span className={`text-xs font-medium ${isConnected() ? 'text-green-600' : 'text-red-600'}`}>
                      {isConnected() ? 'Live' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Recent Activity</h4>
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {activeRuns.length > 0 ? (
                    activeRuns.slice(0, 5).map((run) => (
                      <div key={run.id} className="text-xs flex justify-between">
                        <span className="text-slate-600 truncate">{run.agentName}</span>
                        <span className={`font-medium ${
                          run.status === 'success' ? 'text-green-600' :
                          run.status === 'error' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">No recent activity</p>
                  )}
                </div>
              </div>

              {/* Agent Status */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Agent Status</h4>
                <div className="space-y-1">
                  {agents && Array.isArray(agents) ? (
                    agents.slice(0, 6).map((agent: any) => {
                      const status = agentStatus[agent.name];
                      return (
                        <div key={agent.name} className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${getAgentStatusColor(status?.status)}`}></div>
                            <span className="text-xs text-slate-600 truncate">{agent.displayName}</span>
                          </div>
                          <span className={`text-xs ${
                            status?.status === 'running' ? 'text-blue-600' :
                            status?.status === 'success' ? 'text-green-600' :
                            status?.status === 'error' ? 'text-red-600' :
                            'text-slate-400'
                          }`}>
                            {status?.status || 'Idle'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-400">Loading...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Accordion>

        {/* Plan Section */}
        <Accordion
          title="Plan"
          icon={<Target className="h-4 w-4" />}
          defaultOpen={false}
        >
          <div className="-mx-3 -mb-3">
            <PlanTab />
          </div>
        </Accordion>

        {/* Todo Section */}
        <Accordion
          title="Todo"
          icon={<ListTodo className="h-4 w-4" />}
          defaultOpen={false}
        >
          <div className="-mx-3 -mb-3">
            <TodoTab />
          </div>
        </Accordion>
      </div>
    </div>
  );
}
