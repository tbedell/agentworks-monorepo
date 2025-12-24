import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PenTool,
  Plus,
  Trash2,
  Eye,
  Share2,
  Lock,
  Clock,
  Edit,
  X,
} from 'lucide-react';
import { teamsApi, type BosWhiteboard } from '@/lib/api';
import { cn } from '@/lib/utils';
import { WhiteboardRenameModal } from '@/components/teams/WhiteboardRenameModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function WhiteboardsDashboard() {
  const queryClient = useQueryClient();
  const [showShared, setShowShared] = useState(false);
  const [renamingWhiteboard, setRenamingWhiteboard] = useState<BosWhiteboard | null>(null);
  const [viewingWhiteboard, setViewingWhiteboard] = useState<BosWhiteboard | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: whiteboardsData, isLoading } = useQuery({
    queryKey: ['teams', 'whiteboards', showShared],
    queryFn: () => teamsApi.listWhiteboards({ shared: showShared ? 'true' : undefined }),
  });

  const createMutation = useMutation({
    mutationFn: () => teamsApi.createWhiteboard({ name: `Whiteboard ${new Date().toLocaleString()}` }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams', 'whiteboards'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BosWhiteboard> }) =>
      teamsApi.updateWhiteboard(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', 'whiteboards'] });
      setRenamingWhiteboard(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => teamsApi.deleteWhiteboard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', 'whiteboards'] });
      setDeleteConfirm(null);
    },
  });

  const handleRename = async (data: { name: string }) => {
    if (!renamingWhiteboard) return;
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync({ id: renamingWhiteboard.id, data });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm);
  };

  const whiteboards = whiteboardsData?.whiteboards || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Whiteboards</h1>
          <p className="text-gray-500">Collaborative drawing and diagramming</p>
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          New Whiteboard
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowShared(false)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              !showShared ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            My Whiteboards
          </button>
          <button
            onClick={() => setShowShared(true)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              showShared ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Shared with Me
          </button>
        </div>
      </div>

      {/* Whiteboards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-gray-500">Loading...</div>
        ) : whiteboards.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No whiteboards found. Create one to get started!
          </div>
        ) : (
          whiteboards.map((whiteboard) => (
            <div
              key={whiteboard.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
            >
              {/* Preview Area */}
              <div className="aspect-video bg-gray-50 flex items-center justify-center relative">
                {whiteboard.thumbnailUrl ? (
                  <img
                    src={whiteboard.thumbnailUrl}
                    alt={whiteboard.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PenTool className="w-12 h-12 text-gray-300" />
                )}
                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setViewingWhiteboard(whiteboard)}
                    className="p-2 bg-white rounded-lg text-gray-600 hover:text-blue-600"
                    title="View"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setRenamingWhiteboard(whiteboard)}
                    className="p-2 bg-white rounded-lg text-gray-600 hover:text-blue-600"
                    title="Rename"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(whiteboard.id)}
                    className="p-2 bg-white rounded-lg text-gray-600 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{whiteboard.name}</h3>
                    {whiteboard.room && (
                      <div className="text-xs text-gray-500 mt-1">
                        Room: {whiteboard.room.name}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {whiteboard.isShared ? (
                      <Share2 className="w-4 h-4 text-green-500" title="Shared" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-400" title="Private" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>Updated {new Date(whiteboard.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Whiteboard Detail Modal */}
      {viewingWhiteboard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{viewingWhiteboard.name}</h3>
              <button
                onClick={() => setViewingWhiteboard(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Preview */}
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {viewingWhiteboard.thumbnailUrl ? (
                  <img
                    src={viewingWhiteboard.thumbnailUrl}
                    alt={viewingWhiteboard.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <PenTool className="w-16 h-16 text-gray-300" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingWhiteboard.isShared ? (
                      <>
                        <Share2 className="w-4 h-4 text-green-500" />
                        <span className="text-gray-900">Shared</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">Private</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-gray-900 mt-1">
                    {new Date(viewingWhiteboard.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-gray-900 mt-1">
                    {new Date(viewingWhiteboard.createdAt).toLocaleString()}
                  </p>
                </div>
                {viewingWhiteboard.room && (
                  <div>
                    <p className="text-sm text-gray-500">Associated Room</p>
                    <p className="text-gray-900 mt-1">{viewingWhiteboard.room.name}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setRenamingWhiteboard(viewingWhiteboard);
                  setViewingWhiteboard(null);
                }}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
              >
                Rename
              </button>
              <button
                onClick={() => setViewingWhiteboard(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Open Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      <WhiteboardRenameModal
        isOpen={!!renamingWhiteboard}
        onClose={() => setRenamingWhiteboard(null)}
        onSubmit={handleRename}
        whiteboard={renamingWhiteboard}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Whiteboard"
        message="Are you sure you want to delete this whiteboard? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
