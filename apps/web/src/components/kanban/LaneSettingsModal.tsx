import { useState } from 'react';
import { X, Settings, AlertTriangle } from 'lucide-react';
import { Lane } from './types';

interface LaneSettingsModalProps {
  isOpen: boolean;
  lane: Lane;
  onClose: () => void;
  onSave: (updates: Partial<Lane>) => void;
}

export default function LaneSettingsModal({
  isOpen,
  lane,
  onClose,
  onSave,
}: LaneSettingsModalProps) {
  const [wipLimit, setWipLimit] = useState(lane.wipLimit || 10);
  const [requiresHumanReview, setRequiresHumanReview] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      wipLimit,
      // These would be stored if the backend supports them
      // requiresHumanReview,
      // autoAdvance,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b-4 rounded-t-xl"
          style={{ borderColor: lane.color }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: lane.color }}
            >
              {lane.position}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{lane.name}</h2>
              <p className="text-sm text-slate-500">Lane Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {/* WIP Limit */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              WIP Limit
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={30}
                value={wipLimit}
                onChange={(e) => setWipLimit(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-center font-semibold text-slate-900">{wipLimit}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Maximum number of cards allowed in this lane
            </p>
          </div>

          {/* Agent Types */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Assigned Agents
            </label>
            <div className="flex flex-wrap gap-2">
              {lane.agentTypes.map((agent) => (
                <span
                  key={agent}
                  className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full"
                >
                  {agent.replace('_', ' ')}
                </span>
              ))}
              {lane.agentTypes.length === 0 && (
                <span className="text-sm text-slate-500">No agents assigned</span>
              )}
            </div>
          </div>

          {/* Human Review Gate */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Human Review Gate</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresHumanReview}
                  onChange={(e) => setRequiresHumanReview(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              When enabled, cards require human approval before advancing to the next lane
            </p>
          </div>

          {/* Auto Advance */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-slate-700">Auto-Advance</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="sr-only peer"
                  disabled={requiresHumanReview}
                />
                <div className={`w-10 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 ${requiresHumanReview ? 'opacity-50' : ''}`}></div>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Automatically move cards to the next lane after agent completes
              {requiresHumanReview && ' (disabled when human review is required)'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
