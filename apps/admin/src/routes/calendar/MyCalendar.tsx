import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Video,
  Users,
  X,
  Edit,
  Trash2,
} from 'lucide-react';
import { calendarApi, type BosCalendarEvent } from '@/lib/api';
import { cn } from '@/lib/utils';
import { EventFormModal } from '@/components/calendar/EventFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const typeColors: Record<string, string> = {
  meeting: 'bg-blue-500',
  campaign: 'bg-green-500',
  deadline: 'bg-red-500',
  reminder: 'bg-yellow-500',
  task: 'bg-purple-500',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MyCalendar() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<BosCalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BosCalendarEvent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startOfMonth = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return date;
  }, [currentDate]);

  const endOfMonth = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return date;
  }, [currentDate]);

  const { data: eventsData } = useQuery({
    queryKey: ['calendar', 'events', currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: () =>
      calendarApi.listEvents({
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['calendar', 'stats'],
    queryFn: calendarApi.getStats,
  });

  const { data: todayEvents } = useQuery({
    queryKey: ['calendar', 'today'],
    queryFn: calendarApi.getTodayEvents,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<BosCalendarEvent>) => calendarApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setShowCreateModal(false);
      setSelectedDate(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BosCalendarEvent> }) =>
      calendarApi.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setEditingEvent(null);
      setSelectedEvent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setDeleteConfirm(null);
      setSelectedEvent(null);
    },
  });

  const handleCreate = async (data: Partial<BosCalendarEvent>) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: Partial<BosCalendarEvent>) => {
    if (!editingEvent) return;
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({ id: editingEvent.id, data });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowCreateModal(true);
  };

  const events = eventsData?.events || [];

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days: { date: Date; isCurrentMonth: boolean; events: BosCalendarEvent[] }[] = [];
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(startOfMonth);
      date.setDate(date.getDate() - i - 1);
      days.push({ date, isCurrentMonth: false, events: [] });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const dayEvents = events.filter((e) => {
        const eventDate = new Date(e.startAt);
        return eventDate.toDateString() === date.toDateString();
      });
      days.push({ date, isCurrentMonth: true, events: dayEvents });
    }

    // Next month days to complete the grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(endOfMonth);
      date.setDate(date.getDate() + i);
      days.push({ date, isCurrentMonth: false, events: [] });
    }

    return days;
  }, [startOfMonth, endOfMonth, currentDate, events]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-gray-500">Manage your schedule</p>
        </div>
        <button
          onClick={() => {
            setSelectedDate(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Today's Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.todayCount || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Week</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.weekCount || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-1">
          <p className="text-sm text-gray-500 mb-2">Today's Schedule</p>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {todayEvents?.events?.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-center gap-2 text-sm">
                <div className={cn('w-2 h-2 rounded-full', typeColors[event.type])} />
                <span className="text-gray-600 truncate">{event.title}</span>
              </div>
            )) || <p className="text-gray-400 text-sm">No events today</p>}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Day Headers */}
          {DAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-xs font-medium text-gray-500 border-b border-gray-200 bg-gray-50"
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((day, index) => (
            <div
              key={index}
              onClick={() => day.isCurrentMonth && handleDayClick(day.date)}
              className={cn(
                'min-h-[100px] p-2 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors',
                !day.isCurrentMonth && 'bg-gray-50 cursor-default hover:bg-gray-50'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1',
                  isToday(day.date) && 'bg-blue-600 text-white font-bold',
                  !isToday(day.date) && !day.isCurrentMonth && 'text-gray-400',
                  !isToday(day.date) && day.isCurrentMonth && 'text-gray-900'
                )}
              >
                {day.date.getDate()}
              </div>
              <div className="space-y-1">
                {day.events.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                    }}
                    className={cn(
                      'w-full text-left px-1.5 py-0.5 rounded text-xs text-white truncate',
                      typeColors[event.type]
                    )}
                  >
                    {event.title}
                  </button>
                ))}
                {day.events.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1">
                    +{day.events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-3 h-3 rounded-full', typeColors[selectedEvent.type])} />
                <span className="text-sm text-gray-600 capitalize">{selectedEvent.type}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                {selectedEvent.isAllDay ? (
                  <span>
                    {new Date(selectedEvent.startAt).toLocaleDateString()} (All day)
                  </span>
                ) : (
                  <span>
                    {new Date(selectedEvent.startAt).toLocaleString()} -{' '}
                    {new Date(selectedEvent.endAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {selectedEvent.location}
                </div>
              )}
              {selectedEvent.videoUrl && (
                <div className="flex items-center gap-3 text-sm">
                  <Video className="w-4 h-4 text-gray-400" />
                  <a
                    href={selectedEvent.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Join Video Call
                  </a>
                </div>
              )}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <Users className="w-4 h-4 mt-0.5" />
                  <div>
                    {selectedEvent.attendees.map((a) => (
                      <div key={a.id}>{a.name || a.email}</div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvent.description && (
                <p className="text-sm text-gray-600">{selectedEvent.description}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setDeleteConfirm(selectedEvent.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditingEvent(selectedEvent);
                  setSelectedEvent(null);
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      <EventFormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedDate(null);
        }}
        onSubmit={handleCreate}
        isLoading={isSubmitting}
        initialDate={selectedDate}
      />

      {/* Edit Event Modal */}
      <EventFormModal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        onSubmit={handleUpdate}
        event={editingEvent}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
