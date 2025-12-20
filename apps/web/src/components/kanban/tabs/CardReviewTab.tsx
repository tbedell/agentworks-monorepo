import { useState } from 'react';
import { Clock, CheckCircle, AlertCircle, RotateCcw, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';

interface CardData {
  id: string;
  laneId: string;
  projectId?: string;
  reviewStatus?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  reviewNotes?: string | null;
  metadata?: {
    documentType?: 'blueprint' | 'prd' | 'mvp' | 'playbook';
  };
}

interface CardReviewTabProps {
  card: CardData;
  onApprove?: (cardId: string, data: { notes?: string; advance?: boolean }) => void;
  onReject?: (cardId: string, data: { notes?: string; returnToPrevious?: boolean }) => void;
  onApproveReviewCard?: () => Promise<void>;
  isApproving?: boolean;
}

export default function CardReviewTab({
  card,
  onApprove,
  onReject,
  onApproveReviewCard,
  isApproving = false,
}: CardReviewTabProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [advanceOnApprove, setAdvanceOnApprove] = useState(true);
  const [returnOnReject, setReturnOnReject] = useState(true);
  const [isReviewPending, setIsReviewPending] = useState(false);

  const currentLaneNumber = parseInt(card.laneId.replace('lane-', ''));
  const documentType = card.metadata?.documentType;
  const isReviewCard = currentLaneNumber === 6 && documentType;

  return (
    <div className="space-y-4">
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

          <div className="flex flex-col gap-3">
            {/* Approve Section */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm text-green-700">Approve</span>
                </div>
                {!isReviewCard && (
                  <label className="flex items-center gap-2 text-xs text-green-700">
                    <input
                      type="checkbox"
                      checked={advanceOnApprove}
                      onChange={(e) => setAdvanceOnApprove(e.target.checked)}
                      className="rounded text-green-600"
                    />
                    Advance to next lane
                  </label>
                )}
                {isReviewCard && (
                  <span className="text-xs text-green-600">Moves to Complete lane</span>
                )}
              </div>
              <button
                onClick={isReviewCard ? onApproveReviewCard : () => {
                  setIsReviewPending(true);
                  onApprove?.(card.id, { notes: reviewNotes, advance: advanceOnApprove });
                  setTimeout(() => setIsReviewPending(false), 1000);
                }}
                disabled={isReviewPending || isApproving}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
              >
                {(isReviewPending || isApproving) ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                {isApproving ? 'Approving...' : 'Approve Card'}
              </button>
            </div>

            {/* Reject Section */}
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-sm text-red-700">Reject</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-red-700">
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
                onClick={() => {
                  setIsReviewPending(true);
                  onReject?.(card.id, { notes: reviewNotes, returnToPrevious: returnOnReject });
                  setTimeout(() => setIsReviewPending(false), 1000);
                }}
                disabled={isReviewPending}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
              >
                {isReviewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                Reject Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
