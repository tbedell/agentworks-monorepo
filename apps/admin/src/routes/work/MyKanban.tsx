import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  KanbanSquare,
  CheckCircle,
  AlertCircle,
  Edit,
  Plus,
  Trash2,
  Clock,
  User,
  Users,
} from 'lucide-react';
import { workspaceApi, type PersonalTask, type PersonalKanban } from '@/lib/api';
import { AdminKanbanBoard } from '@/components/kanban/AdminKanbanBoard';
import { ViewToggle, type ViewMode } from '@/components/shared/ViewToggle';
import { TaskCreateModal } from '@/components/kanban/TaskCreateModal';
import { TaskEditModal } from '@/components/kanban/TaskEditModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

interface Lane {
  id: string;
  name: string;
  tasks?: PersonalTask[];
}

const DEFAULT_LANES: Lane[] = [
  { id: 'todo', name: 'To Do', tasks: [] },
  { id: 'planning', name: 'Planning', tasks: [] },
  { id: 'doing', name: 'Doing', tasks: [] },
  { id: 'hold', name: 'Hold', tasks: [] },
  { id: 'done', name: 'Done', tasks: [] },
];

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const VIEW_STORAGE_KEY = 'mykanban-view-preference';

export default function MyKanban() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize view from URL param, then localStorage, then default to kanban
  const [view, setView] = useState<ViewMode>(() => {
    const urlView = searchParams.get('view') as ViewMode;
    if (urlView && ['list', 'card', 'kanban'].includes(urlView)) {
      return urlView;
    }
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return (stored as ViewMode) || 'kanban';
  });
  const [filters, setFilters] = useState<{
    laneId?: string;
    priority?: string;
    completed?: string;
  }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLaneId, setCreateLaneId] = useState('todo');
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Handle view change - update state, localStorage, and URL
  const handleViewChange = useCallback((newView: ViewMode) => {
    setView(newView);
    localStorage.setItem(VIEW_STORAGE_KEY, newView);
    // Update URL without adding to history
    const newParams = new URLSearchParams(searchParams);
    if (newView === 'kanban') {
      newParams.delete('view'); // Remove param for default view
    } else {
      newParams.set('view', newView);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const { data: kanbanData, isLoading } = useQuery({
    queryKey: ['workspace', 'kanban'],
    queryFn: workspaceApi.getKanban,
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['workspace', 'tasks', filters],
    queryFn: () => workspaceApi.listTasks(filters),
  });

  const { data: statsData } = useQuery({
    queryKey: ['workspace', 'stats'],
    queryFn: workspaceApi.getStats,
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: Partial<PersonalTask>) => workspaceApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      setShowCreateModal(false);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PersonalTask> }) =>
      workspaceApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      setEditingTask(null);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => workspaceApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      setDeleteConfirm(null);
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: (updates: { id: string; laneId: string; position: number }[]) =>
      workspaceApi.reorderTasks(updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace'] }),
  });

  const updateKanbanMutation = useMutation({
    mutationFn: (data: { name?: string; lanes?: { id: string; name: string }[] }) =>
      workspaceApi.updateKanban(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace'] }),
  });

  const handleCreateTask = useCallback(async (data: {
    title: string;
    description?: string;
    priority: string;
    dueDate?: string;
    laneId: string;
    assigneeId?: string;
    assigneeType?: 'user' | 'group';
  }) => {
    await createTaskMutation.mutateAsync(data);
  }, [createTaskMutation]);

  const handleUpdateTask = useCallback(async (taskId: string, data: Partial<PersonalTask>) => {
    await updateTaskMutation.mutateAsync({ id: taskId, data });
  }, [updateTaskMutation]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    await deleteTaskMutation.mutateAsync(taskId);
  }, [deleteTaskMutation]);

  const handleMoveTask = useCallback(async (taskId: string, toLaneId: string, position: number) => {
    const kanban = kanbanData?.kanban;
    if (!kanban) return;

    let task: PersonalTask | undefined;
    for (const lane of kanban.lanes) {
      task = lane.tasks?.find((t) => t.id === taskId);
      if (task) break;
    }
    if (!task) return;

    const updates = [{ id: taskId, laneId: toLaneId, position }];
    await reorderTasksMutation.mutateAsync(updates);
  }, [kanbanData, reorderTasksMutation]);

  const handleUpdateLanes = useCallback(async (lanes: Lane[]) => {
    await updateKanbanMutation.mutateAsync({
      lanes: lanes.map((l) => ({ id: l.id, name: l.name })),
    });
  }, [updateKanbanMutation]);

  const openCreateModal = (laneId: string = 'todo') => {
    setCreateLaneId(laneId);
    setShowCreateModal(true);
  };

  const kanban = kanbanData?.kanban;
  const stats = statsData;
  const tasks = tasksData?.tasks || [];
  const lanes = kanban?.lanes || DEFAULT_LANES;

  // Prepare kanban data for the board component
  const kanbanWithLanes: PersonalKanban & { lanes: Lane[] } = kanban || {
    id: '',
    adminId: '',
    name: 'My Tasks',
    lanes: DEFAULT_LANES,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const isMutating =
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    deleteTaskMutation.isPending ||
    reorderTasksMutation.isPending ||
    updateKanbanMutation.isPending;

  // Render List View
  const renderListView = () => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-12 px-6 py-3"></th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lane</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tasksLoading ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading...</td>
            </tr>
          ) : tasks.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                No tasks found. Create one to get started!
              </td>
            </tr>
          ) : (
            tasks.map((task) => {
              const lane = lanes.find((l) => l.id === task.laneId);
              return (
                <tr key={task.id} className={cn('hover:bg-gray-50', task.completed && 'bg-gray-50')}>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleUpdateTask(task.id, { completed: !task.completed })}
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center',
                        task.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      )}
                    >
                      {task.completed && <CheckCircle className="w-3 h-3" />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setEditingTask(task)}
                      className={cn('text-left', task.completed && 'line-through text-gray-400')}
                    >
                      <div className="font-medium text-gray-900 hover:text-blue-600">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-gray-500 truncate max-w-md">{task.description}</div>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                      {lane?.name || task.laneId}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn('px-2 py-1 rounded text-xs font-medium capitalize', priorityColors[task.priority] || priorityColors.medium)}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs',
                          task.assignee.type === 'user' ? 'bg-blue-500' : 'bg-purple-500'
                        )}>
                          {task.assignee.type === 'user' ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        </div>
                        <span className="text-sm text-gray-700">{task.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.dueDate ? (
                      <div className={cn(
                        'flex items-center gap-1 text-sm',
                        new Date(task.dueDate) < new Date() && !task.completed ? 'text-red-600' : 'text-gray-600'
                      )}>
                        <Clock className="w-4 h-4" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1 text-gray-400 hover:text-blue-600 mr-2"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(task.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  // Render Card View
  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tasksLoading ? (
        <div className="col-span-full text-center py-8 text-gray-500">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="col-span-full text-center py-8 text-gray-500">
          No tasks found. Create one to get started!
        </div>
      ) : (
        tasks.map((task) => {
          const lane = lanes.find((l) => l.id === task.laneId);
          return (
            <div
              key={task.id}
              className={cn(
                'bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer',
                task.completed && 'opacity-60'
              )}
              onClick={() => setEditingTask(task)}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateTask(task.id, { completed: !task.completed });
                    }}
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                      task.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    )}
                  >
                    {task.completed && <CheckCircle className="w-3 h-3" />}
                  </button>
                  <span className={cn('px-2 py-0.5 rounded text-xs font-medium capitalize', priorityColors[task.priority] || priorityColors.medium)}>
                    {task.priority}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(task.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className={cn('font-medium text-gray-900 mb-2', task.completed && 'line-through')}>
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{task.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                  {lane?.name || task.laneId}
                </span>
                {task.assignee && (
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded',
                    task.assignee.type === 'user' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                  )}>
                    {task.assignee.type === 'user' ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                    <span>{task.assignee.name}</span>
                  </div>
                )}
                {task.dueDate && (
                  <div className={cn(
                    'flex items-center gap-1',
                    new Date(task.dueDate) < new Date() && !task.completed ? 'text-red-600' : 'text-gray-500'
                  )}>
                    <Clock className="w-3 h-3" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Kanban</h1>
          <p className="text-gray-500">Personal task board with drag & drop</p>
        </div>
        <div className="flex items-center gap-4">
          <ViewToggle view={view} onChange={handleViewChange} />
          <button
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500">
              <KanbanSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.tasksByLane?.reduce((acc: number, l: any) => acc + l._count, 0) || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.completedToday || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.overdueTasks || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500">
              <Edit className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Notes</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.notesCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters for List/Card views */}
      {view !== 'kanban' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={filters.laneId || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, laneId: e.target.value || undefined }))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Lanes</option>
              {lanes.map((lane) => (
                <option key={lane.id} value={lane.id}>{lane.name}</option>
              ))}
            </select>
            <select
              value={filters.priority || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value || undefined }))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filters.completed || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, completed: e.target.value || undefined }))}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="false">Incomplete</option>
              <option value="true">Completed</option>
            </select>
          </div>
        </div>
      )}

      {/* View Content */}
      {view === 'kanban' && (
        <AdminKanbanBoard
          kanban={kanbanWithLanes}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onMoveTask={handleMoveTask}
          onUpdateLanes={handleUpdateLanes}
          isLoading={isMutating}
        />
      )}
      {view === 'list' && renderListView()}
      {view === 'card' && renderCardView()}

      {/* Create Task Modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
        laneId={createLaneId}
        laneName={lanes.find((l) => l.id === createLaneId)?.name || 'To Do'}
        isLoading={createTaskMutation.isPending}
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
        isLoading={updateTaskMutation.isPending}
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
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
}
