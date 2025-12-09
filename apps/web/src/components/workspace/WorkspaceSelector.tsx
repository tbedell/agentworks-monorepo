import { useState } from 'react';
import { ChevronDown, Plus, FolderOpen } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace';
import clsx from 'clsx';

interface WorkspaceSelectorProps {
  className?: string;
}

export default function WorkspaceSelector({ className }: WorkspaceSelectorProps) {
  const {
    workspaces,
    projects,
    currentWorkspaceId,
    currentProjectId,
    setCurrentWorkspace,
    setCurrentProject,
    isLoadingWorkspaces,
    isLoadingProjects
  } = useWorkspaceStore();

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
  const currentWorkspaceProjects = currentWorkspaceId ? projects[currentWorkspaceId] || [] : [];
  const currentProject = currentWorkspaceProjects.find(p => p.id === currentProjectId);

  return (
    <div className={clsx("flex items-center gap-3", className)}>
      {/* Workspace Selector */}
      <div className="relative">
        <button
          onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <div className="h-6 w-6 bg-primary-100 text-primary-600 rounded text-xs font-bold flex items-center justify-center">
            {currentWorkspace?.name?.[0]?.toUpperCase() || 'W'}
          </div>
          <span className="hidden sm:inline">
            {isLoadingWorkspaces ? 'Loading...' : (currentWorkspace?.name || 'Select Workspace')}
          </span>
          <ChevronDown className={clsx("h-4 w-4 transition-transform", isWorkspaceOpen && "rotate-180")} />
        </button>

        {isWorkspaceOpen && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Workspaces
                <button className="text-primary-600 hover:text-primary-700">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => {
                      setCurrentWorkspace(workspace.id);
                      setIsWorkspaceOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                      workspace.id === currentWorkspaceId
                        ? "bg-primary-50 text-primary-700"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="h-8 w-8 bg-primary-100 text-primary-600 rounded text-sm font-bold flex items-center justify-center">
                      {workspace.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{workspace.name}</div>
                      <div className="text-xs text-slate-500">{workspace.memberCount} members</div>
                    </div>
                    {workspace.role === 'owner' && (
                      <div className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                        Owner
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-200 mt-2 pt-2">
                <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">
                  <Plus className="h-4 w-4" />
                  Create workspace
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Project Selector */}
      {currentWorkspace && (
        <>
          <div className="text-slate-300">/</div>
          <div className="relative">
            <button
              onClick={() => setIsProjectOpen(!isProjectOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <FolderOpen className="h-4 w-4 text-slate-400" />
              <span className="hidden sm:inline">
                {isLoadingProjects ? 'Loading...' : (currentProject?.name || 'Select Project')}
              </span>
              <ChevronDown className={clsx("h-4 w-4 transition-transform", isProjectOpen && "rotate-180")} />
            </button>

            {isProjectOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <div className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Projects
                    <button className="text-primary-600 hover:text-primary-700">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {currentWorkspaceProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setCurrentProject(project.id);
                          setIsProjectOpen(false);
                        }}
                        className={clsx(
                          "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors",
                          project.id === currentProjectId
                            ? "bg-primary-50 text-primary-700"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <FolderOpen className="h-4 w-4 text-slate-400" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{project.name}</div>
                          {project.description && (
                            <div className="text-xs text-slate-500 truncate">{project.description}</div>
                          )}
                        </div>
                        <div className={clsx(
                          "text-xs px-2 py-0.5 rounded capitalize",
                          project.status === 'active' ? "bg-green-100 text-green-700" :
                          project.status === 'completed' ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-600"
                        )}>
                          {project.status}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 mt-2 pt-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">
                      <Plus className="h-4 w-4" />
                      Create project
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}