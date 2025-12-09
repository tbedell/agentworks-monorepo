import { useState } from 'react';
import { Search, Filter, Plus, Settings, Users, Eye, PlayCircle, Loader2 } from 'lucide-react';
import { KanbanFilters, KanbanView } from './types';

interface BoardHeaderProps {
  filters?: KanbanFilters;
  onFiltersChange?: (filters: KanbanFilters) => void;
  views?: KanbanView[];
  currentView?: KanbanView;
  onViewChange?: (view: KanbanView) => void;
  onCreateCard?: () => void;
  onBoardSettings?: () => void;
  onRunAll?: () => void;
  runAllProgress?: { running: number; total: number } | null;
}

const defaultFilters: KanbanFilters = {
  search: '',
  priority: [],
  type: [],
  assignedAgents: [],
  labels: [],
};

export default function BoardHeader({
  filters = defaultFilters,
  onFiltersChange,
  views = [],
  currentView,
  onViewChange,
  onCreateCard,
  onBoardSettings,
  onRunAll,
  runAllProgress,
}: BoardHeaderProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showViews, setShowViews] = useState(false);

  const updateFilters = (updates: Partial<KanbanFilters>) => {
    const newFilters = { ...filters, ...updates };
    onFiltersChange?.(newFilters);
  };

  const hasActiveFilters = 
    filters.search ||
    filters.priority.length > 0 ||
    filters.type.length > 0 ||
    filters.assignedAgents.length > 0 ||
    filters.labels.length > 0 ||
    filters.dateRange;

  return (
    <div className="bg-white border-b border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">
            Development Board
          </h1>
          <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
            11-Lane Process
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateCard}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
          
          <button
            onClick={() => setShowViews(!showViews)}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors relative"
          >
            <Eye className="w-4 h-4" />
            Views
            {showViews && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-10">
                <div className="p-2">
                  {views.length === 0 ? (
                    <div className="text-sm text-slate-500 p-2">No saved views</div>
                  ) : (
                    views.map((view) => (
                      <button
                        key={view.id}
                        onClick={() => {
                          onViewChange?.(view);
                          setShowViews(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-50 ${
                          currentView?.id === view.id ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        {view.name}
                        {view.isDefault && (
                          <span className="ml-2 text-xs text-slate-400">(default)</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </button>
          
          <button
            onClick={onBoardSettings}
            className="p-2 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search cards..."
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 border rounded-md transition-colors relative ${
            hasActiveFilters 
              ? 'border-blue-500 bg-blue-50 text-blue-700' 
              : 'border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
          )}
        </button>

        {/* Team */}
        <button className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
          <Users className="w-4 h-4" />
          Team
        </button>

        {/* Run All */}
        {onRunAll && (
          <button
            onClick={onRunAll}
            disabled={!!runAllProgress}
            className={`flex items-center gap-2 px-3 py-2 border rounded-md transition-colors ${
              runAllProgress
                ? 'border-pink-300 bg-pink-50 text-pink-700 cursor-not-allowed'
                : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
            }`}
            title="Run all cards in creation order"
          >
            {runAllProgress ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running {runAllProgress.running}/{runAllProgress.total}</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>Run All</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="mt-4 p-4 bg-slate-50 rounded-md border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Priority
              </label>
              <div className="space-y-1">
                {['urgent', 'high', 'medium', 'low'].map((priority) => (
                  <label key={priority} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.priority.includes(priority as any)}
                      onChange={(e) => {
                        const newPriority = e.target.checked
                          ? [...filters.priority, priority as any]
                          : filters.priority.filter(p => p !== priority);
                        updateFilters({ priority: newPriority });
                      }}
                      className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm capitalize">{priority}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type
              </label>
              <div className="space-y-1">
                {['feature', 'bug', 'task', 'epic', 'story'].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.type.includes(type as any)}
                      onChange={(e) => {
                        const newType = e.target.checked
                          ? [...filters.type, type as any]
                          : filters.type.filter(t => t !== type);
                        updateFilters({ type: newType });
                      }}
                      className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Assigned Agents Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assigned Agents
              </label>
              <select
                multiple
                value={filters.assignedAgents}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  updateFilters({ assignedAgents: values });
                }}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="copilot">Copilot</option>
                <option value="developer">Developer</option>
                <option value="reviewer">Reviewer</option>
                <option value="tester">Tester</option>
                <option value="deployer">Deployer</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date Range
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => updateFilters({ 
                    dateRange: { 
                      ...filters.dateRange,
                      start: e.target.value,
                      end: filters.dateRange?.end || ''
                    }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => updateFilters({ 
                    dateRange: { 
                      ...filters.dateRange,
                      start: filters.dateRange?.start || '',
                      end: e.target.value
                    }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => onFiltersChange?.(defaultFilters)}
                className="text-sm text-slate-600 hover:text-slate-800"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}