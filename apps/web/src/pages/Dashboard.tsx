import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Folder, Users, LayoutGrid } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspaceStore } from '../stores/workspace';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { setCurrentWorkspace } = useWorkspaceStore();
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: api.workspaces.list,
  });

  const createWorkspace = useMutation({
    mutationFn: (data: { name: string }) => api.workspaces.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setShowCreateWorkspace(false);
      setNewWorkspaceName('');
    },
  });

  const createProject = useMutation({
    mutationFn: (data: { workspaceId: string; name: string }) => api.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      setShowCreateProject(false);
      setNewProjectName('');
      setSelectedWorkspace(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Workspaces</h1>
        <button
          onClick={() => setShowCreateWorkspace(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Workspace
        </button>
      </div>

      {workspaces?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Folder className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No workspaces yet</h3>
          <p className="text-slate-500 mb-4">Create your first workspace to get started</p>
          <button
            onClick={() => setShowCreateWorkspace(true)}
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Workspace
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces?.map((workspace: any) => (
            <div
              key={workspace.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setCurrentWorkspace(workspace.id);
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                  {workspace.role}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{workspace.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{workspace.description || 'No description'}</p>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Folder className="h-4 w-4" />
                  {workspace.projectCount} projects
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {workspace.memberCount} members
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedWorkspace(workspace.id);
                  setShowCreateProject(true);
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Workspace</h2>
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateWorkspace(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => createWorkspace.mutate({ name: newWorkspaceName })}
                disabled={!newWorkspaceName || createWorkspace.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createWorkspace.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Project</h2>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateProject(false);
                  setSelectedWorkspace(null);
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  selectedWorkspace &&
                  createProject.mutate({ workspaceId: selectedWorkspace, name: newProjectName })
                }
                disabled={!newProjectName || createProject.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createProject.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
