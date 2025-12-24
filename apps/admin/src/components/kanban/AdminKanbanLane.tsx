import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminKanbanCard } from './AdminKanbanCard';
import type { PersonalTask } from '@/lib/api';

interface Lane {
  id: string;
  name: string;
}

interface AdminKanbanLaneProps {
  lane: Lane;
  tasks: PersonalTask[];
  onAddTask: (laneId: string) => void;
  onEditTask: (task: PersonalTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
  onEditLane: (lane: Lane) => void;
}

export function AdminKanbanLane({
  lane,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onEditLane,
}: AdminKanbanLaneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: lane.id,
    data: {
      type: 'lane',
      lane,
    },
  });

  const taskIds = tasks.map((t) => t.id);
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div
      className={cn(
        'flex-shrink-0 w-80 bg-gray-50 rounded-xl flex flex-col max-h-[calc(100vh-280px)]',
        isOver && 'ring-2 ring-blue-400 ring-inset bg-blue-50/50'
      )}
    >
      {/* Lane Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{lane.name}</h3>
            <span className="px-2 py-0.5 bg-gray-200 rounded-full text-xs text-gray-600">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditLane(lane)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
              title="Lane settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        {completedCount > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {completedCount} of {tasks.length} completed
          </div>
        )}
      </div>

      {/* Tasks Container */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-4 pb-2 space-y-2"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <AdminKanbanCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-sm">
            No tasks in this lane
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <div className="p-4 pt-2">
        <button
          onClick={() => onAddTask(lane.id)}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg flex items-center justify-center gap-1 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
}
