import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { Settings } from 'lucide-react';
import { AdminKanbanLane } from './AdminKanbanLane';
import { AdminKanbanCard } from './AdminKanbanCard';
import { TaskCreateModal } from './TaskCreateModal';
import { TaskEditModal } from './TaskEditModal';
import { LaneSettingsModal } from './LaneSettingsModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { PersonalTask, PersonalKanban } from '@/lib/api';

interface Lane {
  id: string;
  name: string;
  tasks?: PersonalTask[];
}

interface AdminKanbanBoardProps {
  kanban: PersonalKanban & { lanes: Lane[] };
  onCreateTask: (data: {
    title: string;
    description?: string;
    priority: string;
    dueDate?: string;
    laneId: string;
  }) => Promise<void>;
  onUpdateTask: (taskId: string, data: Partial<PersonalTask>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onMoveTask: (taskId: string, toLaneId: string, position: number) => Promise<void>;
  onUpdateLanes: (lanes: Lane[]) => Promise<void>;
  isLoading?: boolean;
}

export function AdminKanbanBoard({
  kanban,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
  onUpdateLanes,
  isLoading = false,
}: AdminKanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<PersonalTask | null>(null);
  const [createModalLane, setCreateModalLane] = useState<Lane | null>(null);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [showLaneSettings, setShowLaneSettings] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get all tasks organized by lane
  const getTasksByLane = useCallback((laneId: string): PersonalTask[] => {
    const lane = kanban.lanes.find((l) => l.id === laneId);
    return lane?.tasks || [];
  }, [kanban.lanes]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as PersonalTask;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Handle visual feedback during drag if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = active.data.current?.task as PersonalTask;
    if (!activeTask) return;

    // Determine target lane
    let targetLaneId: string;
    let targetPosition: number;

    if (over.data.current?.type === 'lane') {
      // Dropped on empty lane
      targetLaneId = over.id as string;
      targetPosition = 0;
    } else if (over.data.current?.type === 'task') {
      // Dropped on another task
      const overTask = over.data.current.task as PersonalTask;
      targetLaneId = overTask.laneId;
      const laneTasks = getTasksByLane(targetLaneId);
      targetPosition = laneTasks.findIndex((t) => t.id === overTask.id);
    } else {
      return;
    }

    // If moved to same position in same lane, do nothing
    if (targetLaneId === activeTask.laneId) {
      const laneTasks = getTasksByLane(targetLaneId);
      const currentIndex = laneTasks.findIndex((t) => t.id === activeTask.id);
      if (currentIndex === targetPosition) return;
    }

    // Move the task
    await onMoveTask(activeTask.id, targetLaneId, targetPosition);
  };

  const handleCreateTask = async (data: {
    title: string;
    description?: string;
    priority: string;
    dueDate?: string;
    laneId: string;
  }) => {
    setIsCreating(true);
    try {
      await onCreateTask(data);
      setCreateModalLane(null);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateTask = async (taskId: string, data: Partial<PersonalTask>) => {
    setIsUpdating(true);
    try {
      await onUpdateTask(taskId, data);
      setEditingTask(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await onDeleteTask(taskId);
    setDeleteConfirm(null);
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    await onUpdateTask(taskId, { completed });
  };

  const handleSaveLanes = async (lanes: Lane[]) => {
    await onUpdateLanes(lanes);
    setShowLaneSettings(false);
  };

  const lanes = kanban.lanes || [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Board Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{kanban.name || 'My Tasks'}</h2>
        <button
          onClick={() => setShowLaneSettings(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Manage Lanes
        </button>
      </div>

      {/* Lanes */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {lanes.map((lane) => (
          <AdminKanbanLane
            key={lane.id}
            lane={lane}
            tasks={getTasksByLane(lane.id)}
            onAddTask={() => setCreateModalLane(lane)}
            onEditTask={setEditingTask}
            onDeleteTask={(taskId) => setDeleteConfirm(taskId)}
            onToggleComplete={handleToggleComplete}
            onEditLane={() => setShowLaneSettings(true)}
          />
        ))}

        {lanes.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-12 text-gray-500">
            No lanes configured. Click "Manage Lanes" to add lanes.
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="opacity-90 rotate-3 shadow-xl">
            <AdminKanbanCard
              task={activeTask}
              onEdit={() => {}}
              onDelete={() => {}}
              onToggleComplete={() => {}}
            />
          </div>
        )}
      </DragOverlay>

      {/* Create Task Modal */}
      <TaskCreateModal
        isOpen={!!createModalLane}
        onClose={() => setCreateModalLane(null)}
        onSubmit={handleCreateTask}
        laneId={createModalLane?.id || ''}
        laneName={createModalLane?.name || ''}
        isLoading={isCreating}
      />

      {/* Edit Task Modal */}
      <TaskEditModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={(taskId, data) => handleUpdateTask(taskId, {
          ...data,
          dueDate: data.dueDate || undefined,
          assigneeId: data.assigneeId || undefined,
          assigneeType: data.assigneeType || undefined,
        })}
        task={editingTask}
        lanes={lanes}
        isLoading={isUpdating}
      />

      {/* Lane Settings Modal */}
      <LaneSettingsModal
        isOpen={showLaneSettings}
        onClose={() => setShowLaneSettings(false)}
        onSave={handleSaveLanes}
        lanes={lanes}
        isLoading={isLoading}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteTask(deleteConfirm)}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </DndContext>
  );
}
