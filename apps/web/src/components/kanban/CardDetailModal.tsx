import { useState } from 'react';
import {
  X,
  Play,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  Bot,
  Edit3,
  Trash2,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { Card } from './types';

interface CardDetailModalProps {
  card: Card & {
    reviewStatus?: string | null;
    approvedAt?: string | null;
    approvedBy?: string | null;
    rejectedAt?: string | null;
    rejectedBy?: string | null;
    reviewNotes?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onRunAgent?: (agentName: string) => void;
  onMoveCard?: (laneId: string) => void;
  onApprove?: (data: { notes?: string; advance?: boolean }) => void;
  onReject?: (data: { notes?: string; returnToPrevious?: boolean }) => void;
  onRequestReview?: () => void;
  isAgentRunning?: boolean;
  isReviewPending?: boolean;
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

const LANE_NAMES: Record<string, string> = {
  'lane-0': 'Vision & CoPilot',
  'lane-1': 'PRD / MVP',
  'lane-2': 'Research',
  'lane-3': 'Architecture',
  'lane-4': 'Planning',
  'lane-5': 'Scaffolding',
  'lane-6': 'Build',
  'lane-7': 'Test & QA',
  'lane-8': 'Deploy',
  'lane-9': 'Docs & Training',
  'lane-10': 'Learn & Optimize',
};

const priorityStyles = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const typeStyles = {
  feature: 'bg-green-100 text-green-700',
  bug: 'bg-red-100 text-red-700',
  task: 'bg-blue-100 text-blue-700',
  epic: 'bg-purple-100 text-purple-700',
  story: 'bg-indigo-100 text-indigo-700',
};

export default function CardDetailModal({
  card,
  isOpen,
  onClose,
  onRunAgent,
  onMoveCard,
  onApprove,
  onReject,
  onRequestReview,
  isReviewPending = false
}: CardDetailModalProps) {
  const [activeSection, setActiveSection] = useState<'details' | 'agents' | 'history' | 'review'>('details');
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [advanceOnApprove, setAdvanceOnApprove] = useState(true);
  const [returnOnReject, setReturnOnReject] = useState(true);

  if (!isOpen) return null;

  const currentLaneNumber = parseInt(card.laneId.replace('lane-', ''));
  const availableAgents = (card.assignedAgents?.length > 0)
    ? card.assignedAgents
    : Object.keys(AGENT_INFO).slice(0, 3);

  const mockHistory = [
    { date: card.dates.created, action: 'Created', lane: 'lane-0' },
    ...(card.dates.updated !== card.dates.created ? [{ date: card.dates.updated, action: 'Updated', lane: card.laneId }] : []),
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between p-4 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 text-xs font-medium rounded ${typeStyles[card.type]}`}>
                {card.type}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${priorityStyles[card.priority]}`}>
                {card.priority}
              </span>
              <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-600">
                Lane {currentLaneNumber}: {LANE_NAMES[card.laneId]}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">{card.title}</h2>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Edit3 className="h-4 w-4" />
            </button>
            <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200">
          {(['details', 'agents', 'review', 'history'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeSection === section
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
              {section === 'review' && card.reviewStatus === 'pending' && (
                <span className="ml-1 w-2 h-2 rounded-full bg-orange-500 inline-block" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {activeSection === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                  {card.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Created:</span>
                      <span className="text-slate-700">
                        {new Date(card.dates.created).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Updated:</span>
                      <span className="text-slate-700">
                        {new Date(card.dates.updated).toLocaleDateString()}
                      </span>
                    </div>
                    {card.dates.dueDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Due:</span>
                        <span className="text-orange-600 font-medium">
                          {new Date(card.dates.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Metadata
                  </h3>
                  <div className="space-y-2 text-sm">
                    {card.metadata?.estimatedPoints && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Estimate:</span>
                        <span className="text-slate-700">{card.metadata.estimatedPoints} pts</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Comments:</span>
                      <span className="text-slate-700">{card.metadata?.comments || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Attachments:</span>
                      <span className="text-slate-700">{card.metadata?.attachments || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {card.metadata?.labels && card.metadata.labels.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Labels</h3>
                  <div className="flex flex-wrap gap-2">
                    {card.metadata.labels.map((label) => (
                      <span 
                        key={label}
                        className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {card.metadata?.blockers && card.metadata.blockers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Blockers
                  </h3>
                  <div className="space-y-2">
                    {card.metadata.blockers.map((blocker, i) => (
                      <div 
                        key={i}
                        className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700"
                      >
                        {blocker}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'agents' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Available Agents for Lane {currentLaneNumber}</h3>
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
                        <div className="flex items-center gap-2">
                          {status?.status === 'running' && (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 transition-all"
                                  style={{ width: `${status.progress || 0}%` }}
                                />
                              </div>
                              <span className="text-xs text-blue-600">{status.progress || 0}%</span>
                            </div>
                          )}
                          {status?.status === 'success' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {status?.status === 'error' && (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          <button
                            onClick={() => onRunAgent?.(agentName)}
                            disabled={status?.status === 'running'}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              status?.status === 'running'
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <Play className="h-3.5 w-3.5" />
                            Run
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
          )}

          {activeSection === 'review' && (
            <div className="space-y-6">
              {/* Review Status Banner */}
              {card.reviewStatus && (
                <div className={`p-4 rounded-lg border ${
                  card.reviewStatus === 'pending' ? 'bg-orange-50 border-orange-200' :
                  card.reviewStatus === 'approved' ? 'bg-green-50 border-green-200' :
                  card.reviewStatus === 'rejected' ? 'bg-red-50 border-red-200' :
                  card.reviewStatus === 'needs_revision' ? 'bg-amber-50 border-amber-200' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {card.reviewStatus === 'pending' && <Clock className="h-5 w-5 text-orange-600" />}
                    {card.reviewStatus === 'approved' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {card.reviewStatus === 'rejected' && <AlertCircle className="h-5 w-5 text-red-600" />}
                    {card.reviewStatus === 'needs_revision' && <RotateCcw className="h-5 w-5 text-amber-600" />}
                    <div>
                      <div className={`font-medium ${
                        card.reviewStatus === 'pending' ? 'text-orange-700' :
                        card.reviewStatus === 'approved' ? 'text-green-700' :
                        card.reviewStatus === 'rejected' ? 'text-red-700' :
                        card.reviewStatus === 'needs_revision' ? 'text-amber-700' :
                        'text-slate-700'
                      }`}>
                        {card.reviewStatus === 'pending' && 'Pending Review'}
                        {card.reviewStatus === 'approved' && 'Approved'}
                        {card.reviewStatus === 'rejected' && 'Rejected'}
                        {card.reviewStatus === 'needs_revision' && 'Needs Revision'}
                      </div>
                      {card.reviewNotes && (
                        <div className="text-sm text-slate-600 mt-1">{card.reviewNotes}</div>
                      )}
                      {card.approvedAt && (
                        <div className="text-xs text-slate-500 mt-1">
                          Approved on {new Date(card.approvedAt).toLocaleString()}
                        </div>
                      )}
                      {card.rejectedAt && (
                        <div className="text-xs text-slate-500 mt-1">
                          Rejected on {new Date(card.rejectedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Review Actions */}
              {(!card.reviewStatus || card.reviewStatus === 'pending') && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700">Review Actions</h3>

                  <div>
                    <label className="block text-sm text-slate-600 mb-2">Review Notes (optional)</label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add notes about your review decision..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Approve Section */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-700">Approve</span>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-green-700">
                          <input
                            type="checkbox"
                            checked={advanceOnApprove}
                            onChange={(e) => setAdvanceOnApprove(e.target.checked)}
                            className="rounded text-green-600"
                          />
                          Advance to next lane
                        </label>
                      </div>
                      <button
                        onClick={() => onApprove?.({ notes: reviewNotes, advance: advanceOnApprove })}
                        disabled={isReviewPending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isReviewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                        Approve Card
                      </button>
                    </div>

                    {/* Reject Section */}
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ThumbsDown className="h-5 w-5 text-red-600" />
                          <span className="font-medium text-red-700">Reject</span>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-red-700">
                          <input
                            type="checkbox"
                            checked={returnOnReject}
                            onChange={(e) => setReturnOnReject(e.target.checked)}
                            className="rounded text-red-600"
                          />
                          Return to previous lane
                        </label>
                      </div>
                      <button
                        onClick={() => onReject?.({ notes: reviewNotes, returnToPrevious: returnOnReject })}
                        disabled={isReviewPending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isReviewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                        Reject Card
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Review Button */}
              {!card.reviewStatus && (
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={onRequestReview}
                    disabled={isReviewPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isReviewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                    Request Human Review
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Submit this card for human review before advancing to the next lane.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'history' && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Card History</h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                <div className="space-y-4">
                  {mockHistory.map((event, i) => (
                    <div key={i} className="relative flex items-start gap-4 pl-10">
                      <div className="absolute left-2.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-900">{event.action}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {LANE_NAMES[event.lane]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
          <div className="relative">
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              Move to Lane
            </button>
            {showMoveMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-10 max-h-64 overflow-auto">
                {Object.entries(LANE_NAMES).map(([laneId, laneName]) => (
                  <button
                    key={laneId}
                    onClick={() => {
                      onMoveCard?.(laneId);
                      setShowMoveMenu(false);
                    }}
                    disabled={laneId === card.laneId}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      laneId === card.laneId
                        ? 'bg-blue-50 text-blue-600 cursor-default'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center font-medium">
                      {laneId.replace('lane-', '')}
                    </span>
                    {laneName}
                    {laneId === card.laneId && (
                      <span className="ml-auto text-xs text-blue-500">Current</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
