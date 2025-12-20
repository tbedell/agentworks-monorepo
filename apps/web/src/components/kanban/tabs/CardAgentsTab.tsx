import { Bot, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface AgentStatus {
  agentName: string;
  status: string;
  progress?: number;
  lastUpdate: string;
}

interface CardData {
  id: string;
  laneId: string;
  assignedAgents?: string[];
  agentStatus?: AgentStatus[];
}

interface CardAgentsTabProps {
  card: CardData;
  onRunAgent?: (cardId: string, agentName: string) => void;
  onReviewContext?: (cardId: string) => void;
}

const AGENT_INFO: Record<string, { displayName: string; provider: string; model: string }> = {
  ceo_copilot: { displayName: 'CEO CoPilot', provider: 'OpenAI', model: 'gpt-4o' },
  strategy: { displayName: 'Strategy Agent', provider: 'OpenAI', model: 'gpt-4o' },
  storyboard_ux: { displayName: 'Storyboard/UX', provider: 'OpenAI', model: 'gpt-4o' },
  prd: { displayName: 'PRD Agent', provider: 'OpenAI', model: 'gpt-4o' },
  mvp_scope: { displayName: 'MVP Scope', provider: 'OpenAI', model: 'gpt-4o' },
  research: { displayName: 'Research Agent', provider: 'OpenAI', model: 'gpt-4o' },
  architect: { displayName: 'Architect', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  planner: { displayName: 'Planner', provider: 'OpenAI', model: 'gpt-4o' },
  devops: { displayName: 'DevOps', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  dev_backend: { displayName: 'Dev Backend', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  dev_frontend: { displayName: 'Dev Frontend', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  qa: { displayName: 'QA Agent', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  troubleshooter: { displayName: 'Troubleshooter', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
  docs: { displayName: 'Docs Agent', provider: 'OpenAI', model: 'gpt-4o' },
  refactor: { displayName: 'Refactor', provider: 'Anthropic', model: 'claude-3-5-sonnet' },
};

export default function CardAgentsTab({ card, onRunAgent, onReviewContext }: CardAgentsTabProps) {
  const currentLaneNumber = parseInt(card.laneId.replace('lane-', ''));

  const availableAgents = (card.assignedAgents?.length ?? 0) > 0
    ? card.assignedAgents!
    : Object.keys(AGENT_INFO).slice(0, 3);

  const isAnyRunning = availableAgents.some(
    (agentName) => card.agentStatus?.find(s => s.agentName === agentName)?.status === 'running'
  );

  const firstIdleAgent = availableAgents.find(
    (agentName) => {
      const status = card.agentStatus?.find(s => s.agentName === agentName);
      return !status || (status.status !== 'running' && status.status !== 'success');
    }
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Available Agents for Lane {currentLaneNumber}
        </h3>
        <div className="space-y-2">
          {availableAgents.map((agentName) => {
            const info = AGENT_INFO[agentName] || { displayName: agentName, provider: 'Unknown', model: 'Unknown' };
            const status = card.agentStatus?.find(s => s.agentName === agentName);

            return (
              <div
                key={agentName}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    status?.status === 'running' ? 'bg-blue-100' :
                    status?.status === 'success' ? 'bg-green-100' :
                    status?.status === 'error' ? 'bg-red-100' : 'bg-slate-100'
                  }`}>
                    <Bot className={`h-5 w-5 ${
                      status?.status === 'running' ? 'text-blue-600 animate-pulse' :
                      status?.status === 'success' ? 'text-green-600' :
                      status?.status === 'error' ? 'text-red-600' : 'text-slate-500'
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-900">{info.displayName}</div>
                    <div className="text-xs text-slate-500">{info.provider} • {info.model}</div>
                  </div>
                </div>
                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  {status?.status === 'running' ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${status.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-blue-600">{status.progress || 0}%</span>
                    </div>
                  ) : status?.status === 'success' ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">Complete</span>
                    </div>
                  ) : status?.status === 'error' ? (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span className="text-xs text-red-600 font-medium">Error</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-slate-300" />
                      <span className="text-xs text-slate-500">Idle</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Agent Button */}
      <div className="pt-2 border-t border-slate-200">
        <button
          onClick={() => firstIdleAgent && onRunAgent?.(card.id, firstIdleAgent)}
          disabled={isAnyRunning || !firstIdleAgent}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isAnyRunning
              ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
              : !firstIdleAgent
              ? 'bg-green-100 text-green-600 cursor-default'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isAnyRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Agent Running...
            </>
          ) : !firstIdleAgent ? (
            <>
              <CheckCircle className="h-4 w-4" />
              All Agents Complete
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start Agent
            </>
          )}
        </button>
        {firstIdleAgent && !isAnyRunning && (
          <p className="text-xs text-slate-500 text-center mt-1.5">
            Will run: {AGENT_INFO[firstIdleAgent]?.displayName || firstIdleAgent}
          </p>
        )}
      </div>

      {/* Review with CoPilot Button */}
      <div className="pt-2 border-t border-slate-200">
        <button
          onClick={() => onReviewContext?.(card.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Bot className="h-4 w-4" />
          Review with CoPilot
        </button>
      </div>

      {/* Recent Agent Activity */}
      {card.agentStatus && card.agentStatus.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Agent Activity</h3>
          <div className="space-y-2">
            {card.agentStatus.map((status, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm text-slate-700">{status.agentName}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${
                    status.status === 'running' ? 'text-blue-600' :
                    status.status === 'success' ? 'text-green-600' :
                    status.status === 'error' ? 'text-red-600' : 'text-slate-500'
                  }`}>
                    {status.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(status.lastUpdate).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
