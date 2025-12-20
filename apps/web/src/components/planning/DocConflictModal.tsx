import { useState } from 'react';
import { X, FileText, Database, Check, AlertTriangle } from 'lucide-react';

interface DocConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  docType: string;
  dbContent: string;
  fileContent: string;
  dbUpdatedAt: string;
  fileMtime: string;
  onResolve: (resolution: 'keep_db' | 'keep_file') => void;
  isResolving?: boolean;
}

export default function DocConflictModal({
  isOpen,
  onClose,
  docType,
  dbContent,
  fileContent,
  dbUpdatedAt,
  fileMtime,
  onResolve,
  isResolving = false,
}: DocConflictModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<'db' | 'file' | null>(null);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const docLabel = {
    blueprint: 'Blueprint',
    prd: 'PRD',
    mvp: 'MVP',
    playbook: 'Agent Playbook',
  }[docType] || docType.charAt(0).toUpperCase() + docType.slice(1);

  const handleResolve = () => {
    if (selectedVersion === 'db') {
      onResolve('keep_db');
    } else if (selectedVersion === 'file') {
      onResolve('keep_file');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Sync Conflict: {docLabel}
              </h2>
              <p className="text-sm text-slate-600">
                Both the database and file have been modified since last sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isResolving}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content - Side by side diff */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* DB Version */}
          <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
            <div className="p-3 bg-blue-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Database Version</span>
              </div>
              <span className="text-xs text-blue-700">
                Modified: {formatDate(dbUpdatedAt)}
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-50">
              <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap break-words">
                {dbContent || '(empty)'}
              </pre>
            </div>
            <div className="p-3 border-t border-slate-200 flex-shrink-0">
              <button
                onClick={() => setSelectedVersion('db')}
                disabled={isResolving}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedVersion === 'db'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:opacity-50`}
              >
                {selectedVersion === 'db' && <Check className="h-4 w-4" />}
                Keep Database Version
              </button>
            </div>
          </div>

          {/* File Version */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-3 bg-green-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-900">File Version</span>
              </div>
              <span className="text-xs text-green-700">
                Modified: {formatDate(fileMtime)}
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-50">
              <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap break-words">
                {fileContent || '(empty)'}
              </pre>
            </div>
            <div className="p-3 border-t border-slate-200 flex-shrink-0">
              <button
                onClick={() => setSelectedVersion('file')}
                disabled={isResolving}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedVersion === 'file'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:opacity-50`}
              >
                {selectedVersion === 'file' && <Check className="h-4 w-4" />}
                Keep File Version
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
          <p className="text-sm text-slate-600">
            Select which version to keep. The other version will be overwritten.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isResolving}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={!selectedVersion || isResolving}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedVersion && !isResolving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isResolving ? 'Resolving...' : 'Resolve Conflict'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
