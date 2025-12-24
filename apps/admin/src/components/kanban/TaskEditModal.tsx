import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PersonalTask } from '@/lib/api';
import { AssigneeSelector, type Assignee } from '@/components/shared/AssigneeSelector';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskId: string, data: {
    title: string;
    description?: string;
    priority: string;
    dueDate?: string | null;
    laneId: string;
    assigneeId?: string | null;
    assigneeType?: 'user' | 'group' | null;
  }) => void;
  task: PersonalTask | null;
  lanes: { id: string; name: string }[];
  isLoading?: boolean;
}

export function TaskEditModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  lanes,
  isLoading = false,
}: TaskEditModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [laneId, setLaneId] = useState('');
  const [assignee, setAssignee] = useState<Assignee | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setLaneId(task.laneId);
      setAssignee(
        task.assigneeId && task.assigneeType
          ? {
              id: task.assigneeId,
              type: task.assigneeType,
              name: task.assignee?.name,
              avatarUrl: task.assignee?.avatarUrl,
            }
          : null
      );
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !task) return;

    onSubmit(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || null,
      laneId,
      assigneeId: assignee?.id || null,
      assigneeType: assignee?.type || null,
    });
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Edit Task</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lane</label>
            <select
              value={laneId}
              onChange={(e) => setLaneId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {lanes.map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
            <AssigneeSelector
              value={assignee}
              onChange={setAssignee}
              placeholder="Select user or group..."
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Status:</span>
            <span className={cn(
              'px-2 py-0.5 rounded',
              task.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
            )}>
              {task.completed ? 'Completed' : 'Active'}
            </span>
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
            disabled={!title.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
