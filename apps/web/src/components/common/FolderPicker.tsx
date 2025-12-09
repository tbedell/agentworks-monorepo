import { useState, useEffect } from 'react';
import { Folder, FolderOpen, ChevronUp, HardDrive, Loader2, FolderPlus, Check, X } from 'lucide-react';
import { api } from '../../lib/api';

interface FolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
  title?: string;
}

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export default function FolderPicker({
  isOpen,
  onClose,
  onSelect,
  initialPath,
  title = 'Select Folder',
}: FolderPickerProps) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [roots, setRoots] = useState<{ name: string; path: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath);
    }
  }, [isOpen, initialPath]);

  const loadDirectory = async (path?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.filesystem.browse(path);
      setCurrentPath(response.currentPath);
      setParentPath(response.parentPath);
      setEntries(response.entries);
      setRoots(response.roots);
    } catch (err: any) {
      setError(err.message || 'Failed to load directory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectory(parentPath);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const newPath = currentPath.endsWith('/') || currentPath.endsWith('\\')
        ? `${currentPath}${newFolderName}`
        : `${currentPath}/${newFolderName}`;

      await api.filesystem.createDirectory(newPath);
      setNewFolderName('');
      setShowNewFolder(false);
      loadDirectory(currentPath);
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSelect = () => {
    onSelect(currentPath);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Access (Roots) */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 overflow-x-auto">
            {roots.map((root) => (
              <button
                key={root.path}
                onClick={() => handleNavigate(root.path)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors whitespace-nowrap"
              >
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                {root.name}
              </button>
            ))}
          </div>
        </div>

        {/* Current Path */}
        <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoUp}
              disabled={!parentPath || isLoading}
              className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Go up"
            >
              <ChevronUp className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex-1 font-mono text-sm text-slate-700 truncate" title={currentPath}>
              {currentPath}
            </div>
          </div>
        </div>

        {/* Directory Listing */}
        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px]">
          {error && (
            <div className="m-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-slate-600">Loading...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Folder className="w-12 h-12 text-slate-300 mb-2" />
              <p>No subfolders</p>
            </div>
          ) : (
            <div className="p-2">
              {entries.map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => handleNavigate(entry.path)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-left"
                >
                  <Folder className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 truncate">{entry.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* New Folder Section */}
        {showNewFolder && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setShowNewFolder(false);
                }}
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreatingFolder}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingFolder ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => {
                  setShowNewFolder(false);
                  setNewFolderName('');
                }}
                className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSelect}
                disabled={!currentPath}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                <Check className="w-4 h-4" />
                Select This Folder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
