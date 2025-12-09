import { CheckCircle, Circle, AlertCircle, FileText, Target, Layers, Loader2, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface PlanStatus {
  blueprint: 'complete' | 'in_progress' | 'not_started';
  prd: 'complete' | 'in_progress' | 'not_started';
  mvp: 'complete' | 'in_progress' | 'not_started';
  playbook: 'complete' | 'in_progress' | 'not_started';
  currentLane: number;
  currentGate: string;
  blockers: string[];
}

const StatusIcon = ({ status }: { status: 'complete' | 'in_progress' | 'not_started' }) => {
  switch (status) {
    case 'complete':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'in_progress':
      return <Circle className="h-4 w-4 text-blue-500 animate-pulse" />;
    default:
      return <Circle className="h-4 w-4 text-slate-300" />;
  }
};

const StatusLabel = ({ status, placeholder }: { status: 'complete' | 'in_progress' | 'not_started'; placeholder?: boolean }) => {
  if (placeholder && status === 'not_started') {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium text-amber-600 bg-amber-50">
        Pending CoPilot
      </span>
    );
  }
  const labels = {
    complete: { text: 'Complete', color: 'text-green-600 bg-green-50' },
    in_progress: { text: 'In Progress', color: 'text-blue-600 bg-blue-50' },
    not_started: { text: 'Not Started', color: 'text-slate-500 bg-slate-100' },
  };
  const label = labels[status];
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${label.color}`}>
      {label.text}
    </span>
  );
};

const GATE_NAMES: Record<number, string> = {
  0: 'Vision & CoPilot',
  1: 'PRD / MVP',
  2: 'Research',
  3: 'Architecture',
  4: 'Planning',
  5: 'Scaffolding',
  6: 'Build',
  7: 'Test & QA',
  8: 'Deploy',
  9: 'Docs & Training',
  10: 'Learn & Optimize',
};

const phaseToLane: Record<string, number> = {
  'welcome': 0,
  'vision': 0,
  'requirements': 0,
  'goals': 0,
  'roles': 0,
  'architecture': 0,
  'blueprint-review': 1,
  'prd-review': 1,
  'mvp-review': 1,
  'planning-complete': 2,
  'general': 2,
};

function getDocumentStatus(components: any[], docType: string): 'complete' | 'in_progress' | 'not_started' {
  const doc = components?.find((c: any) => c.type === docType || c.name === docType);
  if (!doc) return 'not_started';
  if (doc.data?.content || doc.data?.sections) return 'complete';
  return 'in_progress';
}

export default function PlanTab() {
  const { currentProjectId } = useWorkspaceStore();
  
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: ['project', currentProjectId],
    queryFn: () => currentProjectId ? api.projects.get(currentProjectId) : null,
    enabled: !!currentProjectId,
  });

  const { data: components = [], isLoading: componentsLoading } = useQuery({
    queryKey: ['project-components', currentProjectId],
    queryFn: () => currentProjectId ? api.projects.listComponents(currentProjectId) : [],
    enabled: !!currentProjectId,
  });

  const currentPhase = projectData?.phase || 'welcome';
  const currentLane = phaseToLane[currentPhase] ?? 0;

  const planStatus: PlanStatus = {
    blueprint: getDocumentStatus(components, 'blueprint'),
    prd: getDocumentStatus(components, 'prd'),
    mvp: getDocumentStatus(components, 'mvp'),
    playbook: getDocumentStatus(components, 'playbook'),
    currentLane,
    currentGate: GATE_NAMES[currentLane],
    blockers: projectData?.blockers || [],
  };

  const isInDiscovery = ['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture'].includes(currentPhase);

  if (!currentProjectId) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        Select a project to view plan
      </div>
    );
  }

  if (projectLoading || componentsLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {isInDiscovery && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">Discovery in Progress</span>
          </div>
          <p className="text-xs text-amber-700">
            Complete the CoPilot discovery flow to generate your project documents.
          </p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          Project Documents
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon status={planStatus.blueprint} />
              <div>
                <span className="text-sm text-slate-700">Blueprint</span>
                {planStatus.blueprint === 'not_started' && (
                  <p className="text-xs text-slate-400">Generated after architecture phase</p>
                )}
              </div>
            </div>
            <StatusLabel status={planStatus.blueprint} placeholder />
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon status={planStatus.prd} />
              <div>
                <span className="text-sm text-slate-700">PRD</span>
                {planStatus.prd === 'not_started' && (
                  <p className="text-xs text-slate-400">Generated after blueprint review</p>
                )}
              </div>
            </div>
            <StatusLabel status={planStatus.prd} placeholder />
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon status={planStatus.mvp} />
              <div>
                <span className="text-sm text-slate-700">MVP Definition</span>
                {planStatus.mvp === 'not_started' && (
                  <p className="text-xs text-slate-400">Generated after PRD review</p>
                )}
              </div>
            </div>
            <StatusLabel status={planStatus.mvp} placeholder />
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <StatusIcon status={planStatus.playbook} />
              <div>
                <span className="text-sm text-slate-700">Agent Playbook</span>
                {planStatus.playbook === 'not_started' && (
                  <p className="text-xs text-slate-400">Generated with MVP definition</p>
                )}
              </div>
            </div>
            <StatusLabel status={planStatus.playbook} placeholder />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-orange-600" />
          Current Phase
        </h3>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
              {planStatus.currentLane}
            </span>
            <span className="text-sm font-medium text-slate-900">{planStatus.currentGate}</span>
          </div>
          <p className="text-xs text-slate-600 ml-8">
            Active development phase
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-600" />
          Lane Progress
        </h3>
        <div className="space-y-1">
          {Object.entries(GATE_NAMES).map(([lane, name]) => {
            const laneNum = parseInt(lane);
            const isActive = laneNum === planStatus.currentLane;
            const isComplete = laneNum < planStatus.currentLane;
            return (
              <div 
                key={lane}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                  isActive ? 'bg-blue-100 text-blue-800 font-medium' :
                  isComplete ? 'text-green-700' : 'text-slate-500'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-blue-600 text-white' :
                  isComplete ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {isComplete ? '✓' : laneNum}
                </span>
                <span>{name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {planStatus.blockers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            Blockers
          </h3>
          <div className="space-y-2">
            {planStatus.blockers.map((blocker, index) => (
              <div 
                key={index}
                className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700"
              >
                {blocker}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
