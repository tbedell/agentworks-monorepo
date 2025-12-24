import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { type SupportTicket } from '@/lib/api';
import { TicketCard } from './TicketCard';
import { cn } from '@/lib/utils';

interface Lane {
  id: string;
  name: string;
  status: string;
}

interface TicketKanbanBoardProps {
  tickets: SupportTicket[];
  onTicketClick?: (ticket: SupportTicket) => void;
  onStatusChange?: (ticketId: string, newStatus: string) => void;
  onCreateTicket?: (status: string) => void;
  isLoading?: boolean;
}

const DEFAULT_LANES: Lane[] = [
  { id: 'new', name: 'New', status: 'new' },
  { id: 'open', name: 'Open', status: 'open' },
  { id: 'pending', name: 'Pending', status: 'pending' },
  { id: 'resolved', name: 'Resolved', status: 'resolved' },
  { id: 'closed', name: 'Closed', status: 'closed' },
];

const laneColors: Record<string, string> = {
  new: 'border-t-blue-500',
  open: 'border-t-yellow-500',
  pending: 'border-t-purple-500',
  resolved: 'border-t-green-500',
  closed: 'border-t-gray-500',
};

// Sortable Ticket Item
function SortableTicketItem({
  ticket,
  onClick,
}: {
  ticket: SupportTicket;
  onClick?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TicketCard ticket={ticket} onClick={onClick} />
    </div>
  );
}

// Droppable Lane
function DroppableLane({
  lane,
  tickets,
  onTicketClick,
  onCreateTicket,
}: {
  lane: Lane;
  tickets: SupportTicket[];
  onTicketClick?: (ticket: SupportTicket) => void;
  onCreateTicket?: (status: string) => void;
}) {
  return (
    <div
      className={cn(
        'bg-gray-50 rounded-lg border border-gray-200 flex flex-col min-w-[300px] max-w-[350px] flex-shrink-0 border-t-4',
        laneColors[lane.status] || 'border-t-gray-400'
      )}
    >
      {/* Lane Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{lane.name}</h3>
          <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs font-medium text-gray-700">
            {tickets.length}
          </span>
        </div>
        {onCreateTicket && (
          <button
            onClick={() => onCreateTicket(lane.status)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
            title={`Create ticket in ${lane.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tickets */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-350px)]">
        <SortableContext
          items={tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <SortableTicketItem
              key={ticket.id}
              ticket={ticket}
              onClick={() => onTicketClick?.(ticket)}
            />
          ))}
        </SortableContext>

        {tickets.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-sm">
            No tickets
          </div>
        )}
      </div>
    </div>
  );
}

export function TicketKanbanBoard({
  tickets,
  onTicketClick,
  onStatusChange,
  onCreateTicket,
  isLoading,
}: TicketKanbanBoardProps) {
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<string, SupportTicket[]> = {};
    DEFAULT_LANES.forEach((lane) => {
      grouped[lane.status] = [];
    });
    tickets.forEach((ticket) => {
      if (grouped[ticket.status]) {
        grouped[ticket.status].push(ticket);
      } else {
        // Put unknown statuses in 'open'
        grouped['open'] = grouped['open'] || [];
        grouped['open'].push(ticket);
      }
    });
    return grouped;
  }, [tickets]);

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.id === event.active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTicket(null);

    const { active, over } = event;
    if (!over) return;

    const activeTicketId = active.id as string;
    const overId = over.id as string;

    // Find which lane the ticket was dropped in
    const activeTicket = tickets.find((t) => t.id === activeTicketId);
    if (!activeTicket) return;

    // Determine new status
    let newStatus: string | null = null;

    // Check if dropped on a lane
    const lane = DEFAULT_LANES.find((l) => l.id === overId || l.status === overId);
    if (lane) {
      newStatus = lane.status;
    } else {
      // Dropped on another ticket - find that ticket's status
      const overTicket = tickets.find((t) => t.id === overId);
      if (overTicket) {
        newStatus = overTicket.status;
      }
    }

    if (newStatus && newStatus !== activeTicket.status && onStatusChange) {
      onStatusChange(activeTicketId, newStatus);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {DEFAULT_LANES.map((lane) => (
          <DroppableLane
            key={lane.id}
            lane={lane}
            tickets={ticketsByStatus[lane.status] || []}
            onTicketClick={onTicketClick}
            onCreateTicket={onCreateTicket}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket && (
          <div className="rotate-3 scale-105">
            <TicketCard ticket={activeTicket} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
