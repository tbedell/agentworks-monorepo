import {
  Bot,
  LayoutGrid,
  Activity,
  CheckSquare,
  Play,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import BaseLeftPanel from './BaseLeftPanel';
import { Accordion } from '../../common/Accordion';
import { useWorkspaceStore } from '../../../stores/workspace';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import CoPilotPanel from '../../copilot/CoPilotPanel';
import TodoTab from '../../rightpanel/TodoTab';

interface KanbanLeftPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

const LANE_NAMES = [
  'Lane 0 - Vision',
  'Lane 1 - PRD/MVP',
  'Lane 2 - Research',
  'Lane 3 - Architecture',
  'Lane 4 - Planning',
  'Lane 5 - Scaffold',
  'Lane 6 - Build',
  'Lane 7 - Test',
  'Lane 8 - Deploy',
  'Lane 9 - Docs',
  'Lane 10 - Optimize',
];

export default function KanbanLeftPanel({ collapsed, onToggle }: KanbanLeftPanelProps) {
  const { currentProjectId } = useWorkspaceStore();

  // Fetch board data which includes cards
  const { data: boardData } = useQuery({
    queryKey: ['board', currentProjectId],
    queryFn: () => currentProjectId ? api.boards.get(currentProjectId) : null,
    enabled: !!currentProjectId,
  });

  const cards = boardData?.cards || [];

  // Note: Recent activity would come from an activity log API
  // For now, we show card-based activity derived from the board
  const runs: any[] = [];

  // Calculate lane stats
  const laneStats = LANE_NAMES.map((name, index) => {
    const laneCards = cards.filter((c: any) => c.lane === index);
    return {
      name: name.split(' - ')[1],
      lane: index,
      count: laneCards.length,
      inProgress: laneCards.filter((c: any) => c.status === 'in_progress').length,
    };
  });

  const totalCards = cards.length;
  const inProgressCards = cards.filter((c: any) => c.status === 'in_progress').length;
  const completedCards = cards.filter((c: any) => c.status === 'completed').length;

  const recentRuns = runs.slice(0, 5);

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
      title="Kanban"
      agentButton={agentBadge}
      bottomContent={<CoPilotPanel />}
    >
      {/* Board Summary */}
      <Accordion
        title="Board Summary"
        icon={<LayoutGrid className="h-4 w-4" />}
        defaultOpen={true}
      >
        <div className="space-y-3">
          {/* Overall Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-slate-900">{totalCards}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-600">{inProgressCards}</div>
              <div className="text-xs text-slate-500">Active</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-600">{completedCards}</div>
              <div className="text-xs text-slate-500">Done</div>
            </div>
          </div>

          {/* Lane breakdown */}
          <div className="space-y-1">
            {laneStats.filter(l => l.count > 0).map((lane) => (
              <div
                key={lane.lane}
                className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded text-xs"
              >
                <span className="text-slate-700">{lane.name}</span>
                <div className="flex items-center gap-2">
                  {lane.inProgress > 0 && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Play className="h-3 w-3" />
                      {lane.inProgress}
                    </span>
                  )}
                  <span className="text-slate-500">{lane.count}</span>
                </div>
              </div>
            ))}
            {laneStats.filter(l => l.count > 0).length === 0 && (
              <div className="text-xs text-slate-400 text-center py-2">
                No cards yet
              </div>
            )}
          </div>
        </div>
      </Accordion>

      {/* Recent Activity */}
      <Accordion
        title="Recent Activity"
        icon={<Activity className="h-4 w-4" />}
        defaultOpen={false}
      >
        <div className="space-y-2">
          {recentRuns.length > 0 ? (
            recentRuns.map((run: any) => (
              <div
                key={run.id}
                className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg"
              >
                {run.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : run.status === 'failed' ? (
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-700 truncate">
                    {run.agentType || 'Agent'}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {run.cardTitle || 'Card action'}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-slate-400 text-center py-2">
              No recent activity
            </div>
          )}
        </div>
      </Accordion>

      {/* Todo */}
      <Accordion
        title="Todo"
        icon={<CheckSquare className="h-4 w-4" />}
        defaultOpen={false}
      >
        <div className="-mx-3 -mb-3">
          <TodoTab />
        </div>
      </Accordion>
    </BaseLeftPanel>
  );
}
