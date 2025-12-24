import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Clock,
  CheckCircle,
  Trash2,
  Edit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PersonalTask } from '@/lib/api';

const priorityColors: Record<string, string> = {
  high: 'border-l-red-500 bg-red-50/50',
  medium: 'border-l-yellow-500 bg-yellow-50/50',
  low: 'border-l-green-500 bg-green-50/50',
};

const priorityBadges: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

interface AdminKanbanCardProps {
  task: PersonalTask;
  onEdit: (task: PersonalTask) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

export function AdminKanbanCard({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
}: AdminKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all border-l-4',
        priorityColors[task.priority],
        task.completed && 'opacity-60',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-blue-500'
      )}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing mt-0.5"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className={cn('font-medium text-gray-900 text-sm', task.completed && 'line-through')}>
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>

          {/* Complete Toggle */}
          <button
            onClick={() => onToggleComplete(task.id, !task.completed)}
            className={cn(
              'p-1 rounded hover:bg-gray-100 transition-colors',
              task.completed ? 'text-green-500' : 'text-gray-400 hover:text-green-500'
            )}
            title={task.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', priorityBadges[task.priority])}>
              {task.priority}
            </span>
            {task.dueDate && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue ? 'text-red-600' : 'text-gray-500'
              )}>
                <Clock className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(task)}
              className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
              title="Edit task"
            >
              <Edit className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
