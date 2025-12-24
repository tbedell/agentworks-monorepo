import { Clock, MessageSquare, User, AlertTriangle } from 'lucide-react';
import { type SupportTicket } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TicketCardProps {
  ticket: SupportTicket;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  open: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const slaStatusColors: Record<string, string> = {
  on_track: 'text-green-600',
  at_risk: 'text-yellow-600',
  breached: 'text-red-600',
};

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const isOverdue = ticket.resolutionDue && new Date(ticket.resolutionDue) < new Date() &&
    !['resolved', 'closed'].includes(ticket.status);

  return (
    <div
      className={cn(
        'bg-white rounded-xl border p-4 hover:shadow-md transition-shadow cursor-pointer',
        priorityColors[ticket.priority]?.split(' ')[2] || 'border-gray-200'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">#{ticket.ticketNumber}</span>
          <span className={cn(
            'px-2 py-0.5 rounded text-xs font-medium capitalize',
            priorityColors[ticket.priority] || priorityColors.medium
          )}>
            {ticket.priority}
          </span>
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded text-xs font-medium capitalize',
          statusColors[ticket.status] || statusColors.open
        )}>
          {ticket.status}
        </span>
      </div>

      {/* Subject */}
      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
        {ticket.subject}
      </h3>

      {/* Description preview */}
      {ticket.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
          {ticket.description}
        </p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {ticket.category && (
          <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
            {ticket.category.name}
          </span>
        )}
        {ticket.assignee && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
            <User className="w-3 h-3" />
            <span>{ticket.assignee.name}</span>
          </div>
        )}
        {ticket.commentCount !== undefined && ticket.commentCount > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <MessageSquare className="w-3 h-3" />
            <span>{ticket.commentCount}</span>
          </div>
        )}
      </div>

      {/* SLA / Due Date */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {ticket.slaStatus && (
            <div className={cn('flex items-center gap-1 text-xs', slaStatusColors[ticket.slaStatus])}>
              {ticket.slaStatus === 'breached' && <AlertTriangle className="w-3 h-3" />}
              <span className="capitalize">{ticket.slaStatus.replace('_', ' ')}</span>
            </div>
          )}
        </div>
        {ticket.resolutionDue && (
          <div className={cn(
            'flex items-center gap-1 text-xs',
            isOverdue ? 'text-red-600' : 'text-gray-500'
          )}>
            <Clock className="w-3 h-3" />
            <span>Due {new Date(ticket.resolutionDue).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
