import { useState } from 'react';
import { Clock, Tag, AlertCircle, Trash2, Loader2 } from 'lucide-react';

interface CardData {
  id: string;
  title: string;
  description?: string | null;
  type: 'feature' | 'bug' | 'task' | 'epic' | 'story';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  laneId: string;
  dates: {
    created: string;
    updated: string;
    dueDate?: string;
  };
  metadata?: {
    estimatedPoints?: number;
    comments?: number;
    attachments?: number;
    labels?: string[];
    blockers?: string[];
  };
}

interface CardDetailsTabProps {
  card: CardData;
  onDelete?: (cardId: string) => void;
}

export default function CardDetailsTab({ card, onDelete }: CardDetailsTabProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="space-y-4">
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
          <div className="space-y-1.5 text-sm">
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
          <div className="space-y-1.5 text-sm">
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

      {/* Delete Card Section */}
      <div className="pt-4 mt-4 border-t border-slate-200">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete Card
          </button>
        ) : (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 mb-3">
              Are you sure you want to delete this card? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (onDelete) {
                    setIsDeleting(true);
                    onDelete(card.id);
                  }
                }}
                disabled={isDeleting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
