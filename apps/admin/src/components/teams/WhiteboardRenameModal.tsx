import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type BosWhiteboard } from '@/lib/api';

interface WhiteboardRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string }) => Promise<void>;
  whiteboard: BosWhiteboard | null;
  isLoading?: boolean;
}

export function WhiteboardRenameModal({
  isOpen,
  onClose,
  onSubmit,
  whiteboard,
  isLoading = false,
}: WhiteboardRenameModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (whiteboard) {
      setName(whiteboard.name);
    } else {
      setName('');
    }
  }, [whiteboard, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({ name: name.trim() });
  };

  if (!isOpen || !whiteboard) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Rename Whiteboard</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Whiteboard Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter whiteboard name..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
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
            disabled={!name.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  );
}
