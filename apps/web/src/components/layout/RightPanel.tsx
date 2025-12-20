import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  ListTodo, 
  Target, 
  ChevronRight,
  Circle,
  Rocket,
  Lightbulb,
  Users,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useWebSocket } from '../../lib/websocket';
import { useWorkspaceStore } from '../../stores/workspace';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import PlanTab from '../rightpanel/PlanTab';
import TodoTab from '../rightpanel/TodoTab';

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

interface RightPanelProps {
  collapsed: boolean;
  onToggle: () => void;
  selectedCard?: any | null;
}

type TabId = 'summary' | 'plan' | 'todo';

export default function RightPanel({ collapsed, onToggle, selectedCard }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [agentStatus, setAgentStatus] = useState<Record<string, { status: string; lastSeen?: string }>>({});
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  const [projectStats, setProjectStats] = useState({ activeAgents: 0, cardsInFlow: 0, projectStatus: 'Planning' });
  
  const { currentProjectId, currentWorkspaceId } = useWorkspaceStore();
  const { connect, subscribe, subscribeTo, unsubscribeFrom, isConnected } = useWebSocket();

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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'plan', label: 'Plan', icon: Target },
    { id: 'todo', label: 'Todo', icon: ListTodo },
  ];

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-l-lg shadow-lg hover:bg-blue-700 transition-all z-40 group"
      >
        <ChevronRight className="h-4 w-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 transition-all duration-300">
      <div className="flex items-center justify-between px-2 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
          title="Hide panel (Cmd+\\)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'summary' && (
          <div className="p-4 space-y-4">
            {!currentProjectId ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">No Project Selected</h3>
                <p className="text-xs text-slate-500">
                  Select or create a project to see project status and activity.
                </p>
              </div>
            ) : (
              <>
                {projectData && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Project Phase</h3>
                    {(() => {
                      const phase = projectData?.phase || 'vision';
                      const phaseConfig = phaseDisplayConfig[phase] || phaseDisplayConfig.general;
                      const PhaseIcon = phaseConfig.icon;
                      const phaseIndex = phaseOrder.indexOf(phase);
                      const progress = phaseIndex >= 0 ? ((phaseIndex + 1) / phaseOrder.length) * 100 : 0;
                      
                      return (
                        <div className="space-y-3">
                          <div className={`flex items-center gap-3 p-3 rounded-lg ${phaseConfig.color}`}>
                            <PhaseIcon className="h-5 w-5" />
                            <div>
                              <div className="font-medium text-sm">{phaseConfig.label}</div>
                              <div className="text-xs opacity-80">Phase {phaseIndex + 1} of {phaseOrder.length}</div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                              <span>Discovery Progress</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Quick Stats</h3>
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
                      <span className="text-slate-600">Project Status:</span>
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
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Recent Activity</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {activeRuns.length > 0 ? (
                      activeRuns.slice(0, 5).map((run) => (
                        <div key={run.id} className="text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">{run.agentName}</span>
                            <span className="text-slate-500">{formatTimestamp(run.createdAt)}</span>
                          </div>
                          <div className={`font-medium ${
                            run.status === 'success' ? 'text-green-600' : 
                            run.status === 'error' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {run.status}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No recent activity</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Agent Status</h3>
                  <div className="space-y-1.5">
                    {agents && Array.isArray(agents) ? (
                      agents.slice(0, 8).map((agent: any) => {
                        const status = agentStatus[agent.name];
                        return (
                          <div key={agent.name} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getAgentStatusColor(status?.status)}`}></div>
                              <span className="text-xs text-slate-600">{agent.displayName}</span>
                            </div>
                            <span className={`text-xs font-medium ${
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
                      <div className="text-xs text-slate-500">Loading agents...</div>
                    )}
                  </div>
                </div>

                {selectedCard && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">Selected Card</h3>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <h4 className="font-medium text-sm text-slate-900 mb-1">{selectedCard.title}</h4>
                      <p className="text-xs text-slate-600 line-clamp-2">{selectedCard.description}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'plan' && <PlanTab />}
        {activeTab === 'todo' && <TodoTab />}
      </div>
    </div>
  );
}
