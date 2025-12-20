import { useSearchParams } from 'react-router-dom';
import {
  Bot,
  FileText,
  Target,
  Users,
  Lightbulb,
  Settings,
  CheckCircle,
  Circle,
  Play,
  FolderOpen,
  ClipboardList,
  Check,
  AlertCircle,
  Download,
  RefreshCw,
  Link2,
} from 'lucide-react';
import BaseLeftPanel from './BaseLeftPanel';
import { Accordion } from '../../common/Accordion';
import { useWorkspaceStore } from '../../../stores/workspace';
import { useAuthStore } from '../../../stores/auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import CoPilotPanel from '../../copilot/CoPilotPanel';

interface PlanningLeftPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

const PLANNING_STEPS = [
  { id: 'vision', title: 'Project Vision', description: 'Define the problem and solution', icon: Lightbulb },
  { id: 'requirements', title: 'Requirements', description: 'Functional requirements', icon: FileText },
  { id: 'goals', title: 'Goals & Metrics', description: 'Objectives and KPIs', icon: Target },
  { id: 'stakeholders', title: 'Stakeholders', description: 'Users and responsibilities', icon: Users },
  { id: 'architecture', title: 'Architecture', description: 'System design', icon: Settings },
];

const DOCUMENT_LINKS = [
  { id: 'blueprint', label: 'Blueprint', href: '/planning?doc=blueprint', icon: FileText },
  { id: 'prd', label: 'PRD', href: '/planning?doc=prd', icon: FileText },
  { id: 'mvp', label: 'MVP', href: '/planning?doc=mvp', icon: Target },
  { id: 'playbook', label: 'Playbook', href: '/planning?doc=playbook', icon: Users },
];

const phaseOrder = ['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture', 'blueprint-review', 'prd-review', 'mvp-review', 'playbook-review', 'planning-complete'];

export default function PlanningLeftPanel({ collapsed, onToggle }: PlanningLeftPanelProps) {
  const { currentProjectId } = useWorkspaceStore();
  const { tenant } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeDoc = searchParams.get('doc') || 'blueprint';

  const { data: projectData } = useQuery({
    queryKey: ['project', currentProjectId],
    queryFn: () => currentProjectId ? api.projects.get(currentProjectId) : null,
    enabled: !!currentProjectId,
  });

  // Fetch document sync info (file paths, sync status)
  const { data: docsInfoData } = useQuery({
    queryKey: ['docs-info', currentProjectId],
    queryFn: () => currentProjectId ? api.projects.getDocsInfo(currentProjectId) : null,
    enabled: !!currentProjectId,
  });

  const phase = projectData?.phase || 'vision';
  const phaseIndex = phaseOrder.indexOf(phase);
  const progress = phaseIndex >= 0 ? ((phaseIndex + 1) / phaseOrder.length) * 100 : 0;

  const agentBadge = (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded text-xs">
      <Bot className="h-3 w-3" />
      <span className="font-medium">CoPilot</span>
    </div>
  );

  return (
    <BaseLeftPanel
      collapsed={collapsed}
      onToggle={onToggle}
      title="Planning"
      agentButton={agentBadge}
      bottomContent={<CoPilotPanel />}
    >
      {/* Project */}
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
            <span className="ml-2 font-medium text-slate-900">{projectData?.name || 'No Project Selected'}</span>
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
      </Accordion>

      {/* Planning Steps */}
      <Accordion
        title="Planning Steps"
        icon={<ClipboardList className="h-4 w-4" />}
        defaultOpen={true}
      >
        <div className="space-y-1.5">
          {PLANNING_STEPS.map((step, index) => {
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Accordion>

      {/* Documents */}
      <Accordion
        title="Documents"
        icon={<FileText className="h-4 w-4" />}
        defaultOpen={true}
      >
        <div className="space-y-2">
          {DOCUMENT_LINKS.map((link) => {
            const Icon = link.icon;
            const docInfo = docsInfoData?.documents?.find((d: any) => d.type === link.id);
            // Use actual file path from API, or construct with proper uppercase filename
            const DOC_FILENAMES: Record<string, string> = {
              blueprint: 'BLUEPRINT.md',
              prd: 'PRD.md',
              mvp: 'MVP.md',
              playbook: 'PLAYBOOK.md',
            };
            const filePath = docInfo?.filePath || (docsInfoData?.docsDir ? `${docsInfoData.docsDir}/${DOC_FILENAMES[link.id]}` : null);
            const syncState = docInfo?.syncState;

            const isActive = activeDoc === link.id;

            return (
              <button
                key={link.label}
                onClick={() => setSearchParams({ doc: link.id })}
                className={`block w-full text-left p-2 rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200'
                    : 'bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-slate-600'}`} />
                    <span className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{link.label}</span>
                  </div>
                  {/* Sync State Indicator */}
                  {syncState === 'in_sync' && docInfo?.hasFileContent && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                      <Check className="h-3 w-3" />
                      Synced
                    </span>
                  )}
                  {syncState === 'file_newer' && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      <Download className="h-3 w-3" />
                      File newer
                    </span>
                  )}
                  {syncState === 'db_newer' && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                      <RefreshCw className="h-3 w-3" />
                      DB newer
                    </span>
                  )}
                  {syncState === 'conflict' && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs animate-pulse">
                      <AlertCircle className="h-3 w-3" />
                      Conflict
                    </span>
                  )}
                  {(syncState === 'file_missing' || (!syncState && !docInfo)) && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                      <Link2 className="h-3 w-3" />
                      File not created
                    </span>
                  )}
                </div>
                {/* File Path */}
                {filePath && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono truncate">
                    <FolderOpen className="h-3 w-3 shrink-0" />
                    <span className="truncate">{filePath}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Accordion>
    </BaseLeftPanel>
  );
}
