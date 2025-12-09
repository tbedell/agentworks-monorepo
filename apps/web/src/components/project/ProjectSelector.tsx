import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, FolderOpen, Check, Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useWorkspaceStore, Project } from '../../stores/workspace';
import CreateProjectModal from './CreateProjectModal';

export default function ProjectSelector() {
  const {
    currentWorkspaceId,
    currentProjectId,
    projects,
    setCurrentProject,
    deleteProject,
    isLoadingProjects
  } = useWorkspaceStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const workspaceProjects = currentWorkspaceId ? projects[currentWorkspaceId] || [] : [];
  const currentProject = workspaceProjects.find(p => p.id === currentProjectId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project.id);
    setIsOpen(false);
  };

  const handleCreateProject = () => {
    setIsOpen(false);
    setShowCreateModal(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteError(null);
    setIsOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setProjectToDelete(null);
    setDeleteError(null);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-200 transition-colors"
        >
          <FolderOpen className="h-4 w-4 text-slate-600" />
          <span className="text-sm text-slate-900 font-medium max-w-[180px] truncate">
            {isLoadingProjects ? 'Loading...' : currentProject?.name || 'Select Project'}
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50">
            {workspaceProjects.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                No projects yet
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {workspaceProjects.map((project) => (
                  <div
                    key={project.id}
                    className="group flex items-center gap-1 px-2 py-1 hover:bg-slate-50 transition-colors"
                  >
                    <button
                      onClick={() => handleSelectProject(project)}
                      className="flex-1 flex items-center gap-3 px-2 py-1 text-sm text-slate-700"
                    >
                      <FolderOpen className="h-4 w-4 text-slate-400" />
                      <span className="flex-1 text-left truncate">{project.name}</span>
                      {project.id === currentProjectId && (
                        <Check className="h-4 w-4 text-blue-600" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, project)}
                      className="p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50"
                      title="Delete project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={handleCreateProject}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Project</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Delete Project</h2>
              </div>
              <button
                onClick={handleCancelDelete}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {deleteError && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {deleteError}
                </div>
              )}

              <p className="text-slate-600 mb-2">
                Are you sure you want to delete <span className="font-semibold text-slate-900">"{projectToDelete.name}"</span>?
              </p>
              <p className="text-sm text-slate-500 mb-6">
                This action cannot be undone. All project data, including boards, cards, and documents will be permanently deleted.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
