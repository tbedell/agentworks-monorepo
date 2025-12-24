import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type BosCalendarEvent } from '@/lib/api';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<BosCalendarEvent>) => Promise<void>;
  event?: BosCalendarEvent | null;
  isLoading?: boolean;
  initialDate?: Date | null;
}

const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'task', label: 'Task' },
];

const formatDateTimeLocal = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function EventFormModal({
  isOpen,
  onClose,
  onSubmit,
  event,
  isLoading = false,
  initialDate,
}: EventFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('meeting');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [visibility, setVisibility] = useState('default');

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setType(event.type);
      setStartAt(formatDateTimeLocal(new Date(event.startAt)));
      setEndAt(formatDateTimeLocal(new Date(event.endAt)));
      setIsAllDay(event.isAllDay);
      setLocation(event.location || '');
      setVideoUrl(event.videoUrl || '');
      setVisibility(event.visibility);
    } else {
      // Set default start time
      const defaultStart = initialDate || new Date();
      defaultStart.setMinutes(0, 0, 0);
      if (!initialDate) {
        defaultStart.setHours(defaultStart.getHours() + 1);
      } else {
        defaultStart.setHours(9);
      }
      const defaultEnd = new Date(defaultStart);
      defaultEnd.setHours(defaultEnd.getHours() + 1);

      setTitle('');
      setDescription('');
      setType('meeting');
      setStartAt(formatDateTimeLocal(defaultStart));
      setEndAt(formatDateTimeLocal(defaultEnd));
      setIsAllDay(false);
      setLocation('');
      setVideoUrl('');
      setVisibility('default');
    }
  }, [event, isOpen, initialDate]);

  // Auto-adjust end time when start time changes
  useEffect(() => {
    if (startAt && !event) {
      const start = new Date(startAt);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      setEndAt(formatDateTimeLocal(end));
    }
  }, [startAt, event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startAt || !endAt) return;

    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      isAllDay,
      location: location.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      visibility,
    });
  };

  if (!isOpen) return null;

  const isEditing = !!event;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Event' : 'Create Event'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="default">Default</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isAllDay" className="text-sm text-gray-700">
              All day event
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start <span className="text-red-500">*</span>
              </label>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? startAt.split('T')[0] : startAt}
                onChange={(e) => setStartAt(isAllDay ? `${e.target.value}T00:00` : e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End <span className="text-red-500">*</span>
              </label>
              <input
                type={isAllDay ? 'date' : 'datetime-local'}
                value={isAllDay ? endAt.split('T')[0] : endAt}
                onChange={(e) => setEndAt(isAllDay ? `${e.target.value}T23:59` : e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Event location..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !startAt || !endAt || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
