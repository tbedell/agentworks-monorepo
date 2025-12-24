import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Video,
  Plus,
  Play,
  Square,
  Users,
  Clock,
  Trash2,
  Eye,
  Zap,
  Edit,
  X,
} from 'lucide-react';
import { teamsApi, type BosTeamRoom } from '@/lib/api';
import { cn } from '@/lib/utils';
import { RoomFormModal } from '@/components/teams/RoomFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  ended: 'bg-gray-100 text-gray-800',
};

const typeIcons: Record<string, typeof Video> = {
  meeting: Video,
  standup: Users,
  workshop: Zap,
};

export default function SessionsDashboard() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{ status?: string; type?: string; page: number; limit: number }>({
    page: 1,
    limit: 20,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<BosTeamRoom | null>(null);
  const [viewingRoom, setViewingRoom] = useState<BosTeamRoom | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['teams', 'stats'],
    queryFn: teamsApi.getStats,
  });

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['teams', 'rooms', filters],
    queryFn: () => teamsApi.listRooms(filters),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<BosTeamRoom>) => teamsApi.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BosTeamRoom> }) => teamsApi.updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setEditingRoom(null);
    },
  });

  const createInstantMutation = useMutation({
    mutationFn: teamsApi.createInstantRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teamsApi.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', 'rooms'] });
      setDeleteConfirm(null);
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => teamsApi.startRoom(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams', 'rooms'] }),
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => teamsApi.endRoom(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams', 'rooms'] }),
  });

  const handleCreate = async (data: Partial<BosTeamRoom>) => {
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: Partial<BosTeamRoom>) => {
    if (!editingRoom) return;
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({ id: editingRoom.id, data });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm);
  };

  const rooms = roomsData?.rooms || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Sessions</h1>
          <p className="text-gray-500">Video conferencing and collaboration</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => createInstantMutation.mutate()}
            disabled={createInstantMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            Instant Meeting
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Schedule Room
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Rooms</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeRooms || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Rooms</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalRooms || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Whiteboards</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalWhiteboards || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value || undefined, page: 1 }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
          </select>
          <select
            value={filters.type || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value || undefined, page: 1 }))}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="meeting">Meeting</option>
            <option value="standup">Standup</option>
            <option value="workshop">Workshop</option>
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-gray-500">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">No rooms found</div>
        ) : (
          rooms.map((room) => {
            const TypeIcon = typeIcons[room.type] || Video;
            return (
              <div
                key={room.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', room.status === 'active' ? 'bg-green-100' : 'bg-gray-100')}>
                      <TypeIcon className={cn('w-5 h-5', room.status === 'active' ? 'text-green-600' : 'text-gray-600')} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{room.name}</h3>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[room.status])}>
                        {room.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{room.participantCount || 0} / {room.maxParticipants} participants</span>
                  </div>
                  {room.scheduledAt && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(room.scheduledAt).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {room.chatEnabled && <span className="px-1.5 py-0.5 bg-gray-100 rounded">Chat</span>}
                    {room.whiteboardEnabled && <span className="px-1.5 py-0.5 bg-gray-100 rounded">Whiteboard</span>}
                    {room.screenShareEnabled && <span className="px-1.5 py-0.5 bg-gray-100 rounded">Screen Share</span>}
                    {room.recordingEnabled && <span className="px-1.5 py-0.5 bg-gray-100 rounded">Recording</span>}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {room.status === 'scheduled' && (
                      <button
                        onClick={() => startMutation.mutate(room.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Start Room"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {room.status === 'active' && (
                      <button
                        onClick={() => endMutation.mutate(room.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="End Room"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setViewingRoom(room)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {room.status === 'scheduled' && (
                      <button
                        onClick={() => setEditingRoom(room)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(room.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {room.status === 'active' && (
                    <button
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Room Detail Modal */}
      {viewingRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{viewingRoom.name}</h3>
              <button
                onClick={() => setViewingRoom(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[viewingRoom.status])}>
                  {viewingRoom.status}
                </span>
                <span className="text-sm text-gray-500 capitalize">{viewingRoom.type}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <Users className="w-4 h-4" />
                    Participants
                  </div>
                  <p className="text-gray-900">{viewingRoom.participantCount || 0} / {viewingRoom.maxParticipants}</p>
                </div>
                {viewingRoom.scheduledAt && (
                  <div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                      <Clock className="w-4 h-4" />
                      Scheduled
                    </div>
                    <p className="text-gray-900">{new Date(viewingRoom.scheduledAt).toLocaleString()}</p>
                  </div>
                )}
                {viewingRoom.startedAt && (
                  <div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                      <Play className="w-4 h-4" />
                      Started
                    </div>
                    <p className="text-gray-900">{new Date(viewingRoom.startedAt).toLocaleString()}</p>
                  </div>
                )}
                {viewingRoom.endedAt && (
                  <div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                      <Square className="w-4 h-4" />
                      Ended
                    </div>
                    <p className="text-gray-900">{new Date(viewingRoom.endedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Features</p>
                <div className="flex flex-wrap gap-2">
                  {viewingRoom.chatEnabled && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">Chat</span>}
                  {viewingRoom.screenShareEnabled && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">Screen Share</span>}
                  {viewingRoom.whiteboardEnabled && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">Whiteboard</span>}
                  {viewingRoom.recordingEnabled && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">Recording</span>}
                </div>
              </div>
              {viewingRoom.recordingUrl && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Recording</p>
                  <a
                    href={viewingRoom.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Recording
                  </a>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
              {viewingRoom.status === 'scheduled' && (
                <button
                  onClick={() => {
                    setEditingRoom(viewingRoom);
                    setViewingRoom(null);
                  }}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => setViewingRoom(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      <RoomFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isLoading={isSubmitting}
      />

      {/* Edit Room Modal */}
      <RoomFormModal
        isOpen={!!editingRoom}
        onClose={() => setEditingRoom(null)}
        onSubmit={handleUpdate}
        room={editingRoom}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Room"
        message="Are you sure you want to delete this room? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
