import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FolderPlus, Loader2, Sparkles, Folder, HardDrive, FolderOpen } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspace';
import { useCoPilot } from '../../contexts/CoPilotContext';
import { api } from '../../lib/api';
import FolderPicker from '../common/FolderPicker';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to generate a slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// We'll fetch the actual home directory from the API
// This is just a fallback that will be replaced
function getDefaultBasePath(): string {
  return ''; // Empty - we'll load from API
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const navigate = useNavigate();
  const { currentWorkspaceId, createProject, setCurrentProject } = useWorkspaceStore();
  const { startNewProjectFlow } = useCoPilot();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project folder settings
  const [projectsBasePath, setProjectsBasePath] = useState<string | null>(null);
  const [showFolderSetup, setShowFolderSetup] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [tempBasePath, setTempBasePath] = useState(getDefaultBasePath());
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);

  // Load user preferences to check for projectsBasePath
  useEffect(() => {
    if (isOpen) {
      loadUserPreferences();
    }
  }, [isOpen]);

  const loadUserPreferences = async () => {
    setIsLoadingPrefs(true);
    try {
      const response = await api.user.getPreferences();
      if (response?.preferences?.projectsBasePath) {
        setProjectsBasePath(response.preferences.projectsBasePath);
        setTempBasePath(response.preferences.projectsBasePath);
        setShowFolderSetup(false);
      } else {
        // Fetch home directory from filesystem API to set a good default
        try {
          const fsResponse = await api.filesystem.browse();
          if (fsResponse?.currentPath) {
            // Default to ~/AgentWorks/Projects
            const defaultPath = `${fsResponse.currentPath}/AgentWorks/Projects`;
            setTempBasePath(defaultPath);
          }
        } catch {
          // Fallback if filesystem browse fails
          setTempBasePath('/home/user/AgentWorks/Projects');
        }
        setShowFolderSetup(true);
      }
    } catch (err) {
      // No preferences yet, show folder setup
      try {
        const fsResponse = await api.filesystem.browse();
        if (fsResponse?.currentPath) {
          const defaultPath = `${fsResponse.currentPath}/AgentWorks/Projects`;
          setTempBasePath(defaultPath);
        }
      } catch {
        setTempBasePath('/home/user/AgentWorks/Projects');
      }
      setShowFolderSetup(true);
    } finally {
      setIsLoadingPrefs(false);
    }
  };

  const handleSetBasePath = async () => {
    if (!tempBasePath.trim()) return;

    setError(null);
    const pathToSet = tempBasePath.trim();

    try {
      // First, try to create the directory if it doesn't exist
      const validation = await api.filesystem.validate(pathToSet);

      if (!validation.exists) {
        // Try to create the directory
        try {
          await api.filesystem.createDirectory(pathToSet);
        } catch (createErr: any) {
          setError(`Cannot create folder at "${pathToSet}". Please check the path and permissions.`);
          return;
        }
      } else if (!validation.isDirectory) {
        setError('The specified path is a file, not a folder. Please choose a folder path.');
        return;
      }

      // Now save the preference
      await api.user.updatePreferences({ projectsBasePath: pathToSet });
      setProjectsBasePath(pathToSet);
      setShowFolderSetup(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save folder path');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentWorkspaceId || !projectsBasePath) return;

    setIsLoading(true);
    setError(null);

    try {
      // Generate the local path for this project
      const slug = generateSlug(name.trim());
      const localPath = `${projectsBasePath}/${slug}`;

      const project = await createProject({
        workspaceId: currentWorkspaceId,
        name: name.trim(),
        description: description.trim() || undefined,
        localPath,
      });
      setCurrentProject(project.id);
      setName('');
      setDescription('');
      onClose();

      navigate('/planning');
      startNewProjectFlow();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Create Project</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {isLoadingPrefs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-slate-600">Loading preferences...</span>
            </div>
          ) : showFolderSetup ? (
            /* First-time folder setup */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <HardDrive className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-slate-900">Set Up Projects Folder</h3>
                  <p className="text-sm text-slate-600">
                    Choose where AgentWorks will store your project files. This folder will contain source code, docs, and blueprints.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Projects Base Path <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={tempBasePath}
                      onChange={(e) => setTempBasePath(e.target.value)}
                      placeholder="/home/user/AgentWorks/Projects"
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFolderPicker(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-sm text-slate-700 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Browse
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  All projects will be created as subfolders here (e.g., {tempBasePath}/my-project)
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetBasePath}
                  disabled={!tempBasePath.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  <Folder className="w-4 h-4" />
                  Set Folder & Continue
                </button>
              </div>

              {/* Folder Picker Modal */}
              <FolderPicker
                isOpen={showFolderPicker}
                onClose={() => setShowFolderPicker(false)}
                onSelect={(path) => {
                  setTempBasePath(path);
                  setShowFolderPicker(false);
                }}
                initialPath={tempBasePath}
                title="Select Projects Folder"
              />
            </div>
          ) : (
            /* Project creation form */
            <form onSubmit={handleSubmit}>
              {/* Show current projects path */}
              {projectsBasePath && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Folder className="w-4 h-4" />
                      <span className="font-mono text-xs truncate max-w-[280px]" title={projectsBasePath}>{projectsBasePath}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTempBasePath(projectsBasePath);
                        setShowFolderSetup(true);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap ml-2"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Awesome Project"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  {name && projectsBasePath && (
                    <p className="mt-1 text-xs text-slate-500">
                      Project folder: <span className="font-mono">{projectsBasePath}/{generateSlug(name)}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this project about?"
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || isLoading || !projectsBasePath}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Start Building
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
