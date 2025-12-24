import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send, MessageSquare, Clock, User, Tag, AlertCircle } from 'lucide-react';
import { ticketsApi, type SupportTicket, type TicketComment } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string | null;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  open: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export function TicketDetailModal({
  isOpen,
  onClose,
  ticketId,
}: TicketDetailModalProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ['tickets', ticketId],
    queryFn: () => ticketsApi.getTicket(ticketId!),
    enabled: isOpen && !!ticketId,
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: { content: string; isInternal: boolean }) =>
      ticketsApi.addComment(ticketId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId] });
      setNewComment('');
    },
  });

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    await addCommentMutation.mutateAsync({
      content: newComment.trim(),
      isInternal,
    });
  };

  if (!isOpen || !ticketId) return null;

  const ticket = ticketData?.ticket;
  const comments = ticketData?.comments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {ticket?.ticketNumber || 'Loading...'}
              </h3>
              {ticket && (
                <>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[ticket.status])}>
                    {ticket.status}
                  </span>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', priorityColors[ticket.priority])}>
                    {ticket.priority}
                  </span>
                </>
              )}
            </div>
            {ticket && (
              <p className="text-sm text-gray-500 mt-1">{ticket.subject}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-gray-500">Loading ticket details...</p>
          </div>
        ) : ticket ? (
          <>
            {/* Ticket Details */}
            <div className="p-6 border-b border-gray-200 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                <p className="text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <User className="w-4 h-4" />
                    Reporter
                  </div>
                  <p className="text-gray-900">
                    {ticket.reporterName || ticket.reporterEmail || '-'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <User className="w-4 h-4" />
                    Assignee
                  </div>
                  <p className="text-gray-900">
                    {ticket.assignee?.name || 'Unassigned'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <Tag className="w-4 h-4" />
                    Category
                  </div>
                  <p className="text-gray-900">
                    {ticket.category?.displayName || '-'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    Created
                  </div>
                  <p className="text-gray-900">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {ticket.slaStatus && ticket.slaStatus !== 'on_track' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">SLA at risk</span>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="flex-1 overflow-y-auto p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments ({comments.length})
              </h4>

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={cn(
                        'p-4 rounded-lg',
                        comment.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {comment.authorName || 'System'}
                          </span>
                          {comment.isInternal && (
                            <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded">
                              Internal
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Comment */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-start gap-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Internal
                  </label>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-gray-500">Ticket not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
