import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lane {
  id: string;
  name: string;
}

interface LaneSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lanes: Lane[]) => void;
  lanes: Lane[];
  isLoading?: boolean;
}

export function LaneSettingsModal({
  isOpen,
  onClose,
  onSave,
  lanes: initialLanes,
  isLoading = false,
}: LaneSettingsModalProps) {
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [newLaneName, setNewLaneName] = useState('');

  useEffect(() => {
    setLanes([...initialLanes]);
  }, [initialLanes, isOpen]);

  const handleAddLane = () => {
    if (!newLaneName.trim()) return;

    const newLane: Lane = {
      id: `lane-${Date.now()}`,
      name: newLaneName.trim(),
    };

    setLanes((prev) => [...prev, newLane]);
    setNewLaneName('');
  };

  const handleRemoveLane = (laneId: string) => {
    setLanes((prev) => prev.filter((l) => l.id !== laneId));
  };

  const handleRenameLane = (laneId: string, newName: string) => {
    setLanes((prev) =>
      prev.map((l) => (l.id === laneId ? { ...l, name: newName } : l))
    );
  };

  const handleSave = () => {
    onSave(lanes);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Lane Settings</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
          <p className="text-sm text-gray-500">
            Manage your kanban lanes. Drag to reorder, rename, or delete lanes.
          </p>

          {/* Existing Lanes */}
          <div className="space-y-2">
            {lanes.map((lane) => (
              <div
                key={lane.id}
                className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg group"
              >
                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                <input
                  type="text"
                  value={lane.name}
                  onChange={(e) => handleRenameLane(lane.id, e.target.value)}
                  className="flex-1 px-2 py-1 border border-transparent hover:border-gray-200 focus:border-blue-500 rounded focus:ring-1 focus:ring-blue-500 bg-transparent"
                />
                <button
                  onClick={() => handleRemoveLane(lane.id)}
                  disabled={lanes.length <= 1}
                  className={cn(
                    'p-1 rounded transition-colors',
                    lanes.length <= 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  )}
                  title={lanes.length <= 1 ? 'At least one lane required' : 'Delete lane'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Lane */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <input
              type="text"
              value={newLaneName}
              onChange={(e) => setNewLaneName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddLane();
                }
              }}
              placeholder="New lane name..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddLane}
              disabled={!newLaneName.trim()}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

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
            onClick={handleSave}
            disabled={lanes.length === 0 || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
