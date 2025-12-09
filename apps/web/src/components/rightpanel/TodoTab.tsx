import { useState } from 'react';
import { Plus, Check, Trash2, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface TodoItem {
  id: string;
  content: string;
  completed: boolean;
  category: string;
  agentSource?: string;
  createdAt: string;
}

export default function TodoTab() {
  const { currentProjectId } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: ['todos', currentProjectId],
    queryFn: () => currentProjectId ? api.todos.list(currentProjectId) : [],
    enabled: !!currentProjectId,
  });

  const createMutation = useMutation({
    mutationFn: (content: string) => 
      api.todos.create(currentProjectId!, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', currentProjectId] });
      setNewTodo('');
      setIsAdding(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ todoId, completed }: { todoId: string; completed: boolean }) =>
      api.todos.update(currentProjectId!, todoId, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', currentProjectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (todoId: string) =>
      api.todos.delete(currentProjectId!, todoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos', currentProjectId] });
    },
  });

  const toggleTodo = (id: string, completed: boolean) => {
    updateMutation.mutate({ todoId: id, completed: !completed });
  };

  const deleteTodo = (id: string) => {
    deleteMutation.mutate(id);
  };

  const addTodo = () => {
    if (newTodo.trim() && currentProjectId) {
      createMutation.mutate(newTodo.trim());
    }
  };

  const completedCount = todos.filter((t: TodoItem) => t.completed).length;
  const progress = todos.length > 0 ? (completedCount / todos.length) * 100 : 0;

  if (!currentProjectId) {
    return (
      <div className="p-4 text-center text-sm text-slate-500">
        Select a project to view todos
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-900">Task Progress</h3>
          <span className="text-xs text-slate-500">{completedCount}/{todos.length}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No tasks yet</p>
        ) : (
          todos.map((todo: TodoItem) => (
            <div 
              key={todo.id}
              className={`group flex items-start gap-2 p-2 rounded-lg transition-colors ${
                todo.completed ? 'bg-slate-50' : 'bg-white border border-slate-200 hover:border-slate-300'
              }`}
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.completed)}
                disabled={updateMutation.isPending}
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  todo.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'border-slate-300 hover:border-blue-500'
                }`}
              >
                {todo.completed && <Check className="h-3 w-3" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {todo.content}
                </p>
                {todo.agentSource && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                    {todo.agentSource}
                  </span>
                )}
              </div>

              <button
                onClick={() => deleteTodo(todo.id)}
                disabled={deleteMutation.isPending}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {isAdding ? (
        <div className="space-y-2">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Enter task..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={addTodo}
              disabled={createMutation.isPending || !newTodo.trim()}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => { setIsAdding(false); setNewTodo(''); }}
              className="px-3 py-1.5 text-slate-600 text-sm rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-600 border border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      )}

      <div className="pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          Tasks auto-generated by agents appear here
        </p>
      </div>
    </div>
  );
}
