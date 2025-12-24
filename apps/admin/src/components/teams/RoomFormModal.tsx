import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type BosTeamRoom } from '@/lib/api';

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<BosTeamRoom>) => Promise<void>;
  room?: BosTeamRoom | null;
  isLoading?: boolean;
}

const ROOM_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'standup', label: 'Standup' },
  { value: 'workshop', label: 'Workshop' },
];

const formatDateTimeLocal = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function RoomFormModal({
  isOpen,
  onClose,
  onSubmit,
  room,
  isLoading = false,
}: RoomFormModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('meeting');
  const [scheduledAt, setScheduledAt] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(50);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [whiteboardEnabled, setWhiteboardEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(true);
  const [recordingEnabled, setRecordingEnabled] = useState(false);

  useEffect(() => {
    if (room) {
      setName(room.name);
      setType(room.type);
      setScheduledAt(room.scheduledAt ? formatDateTimeLocal(new Date(room.scheduledAt)) : '');
      setMaxParticipants(room.maxParticipants);
      setChatEnabled(room.chatEnabled);
      setWhiteboardEnabled(room.whiteboardEnabled);
      setScreenShareEnabled(room.screenShareEnabled);
      setRecordingEnabled(room.recordingEnabled);
    } else {
      // Set default scheduled time to 1 hour from now
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1);
      defaultTime.setMinutes(0, 0, 0);

      setName('');
      setType('meeting');
      setScheduledAt(formatDateTimeLocal(defaultTime));
      setMaxParticipants(50);
      setChatEnabled(true);
      setWhiteboardEnabled(false);
      setScreenShareEnabled(true);
      setRecordingEnabled(false);
    }
  }, [room, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSubmit({
      name: name.trim(),
      type,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      maxParticipants,
      chatEnabled,
      whiteboardEnabled,
      screenShareEnabled,
      recordingEnabled,
    });
  };

  if (!isOpen) return null;

  const isEditing = !!room;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Room' : 'Schedule Room'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Team Standup, Sprint Planning..."
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
                {ROOM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
              <input
                type="number"
                min={2}
                max={100}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 50)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty to create without scheduling</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Room Features</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={chatEnabled}
                  onChange={(e) => setChatEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Chat</span>
                  <p className="text-xs text-gray-500">Allow text chat during the session</p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={screenShareEnabled}
                  onChange={(e) => setScreenShareEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Screen Sharing</span>
                  <p className="text-xs text-gray-500">Allow participants to share their screens</p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={whiteboardEnabled}
                  onChange={(e) => setWhiteboardEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Whiteboard</span>
                  <p className="text-xs text-gray-500">Enable collaborative whiteboard</p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={recordingEnabled}
                  onChange={(e) => setRecordingEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Recording</span>
                  <p className="text-xs text-gray-500">Record the session for later viewing</p>
                </div>
              </label>
            </div>
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
            disabled={!name.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Schedule Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
