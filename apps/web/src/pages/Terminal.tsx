import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Terminal as TerminalIcon, Plus, X, Maximize2, Minimize2 } from 'lucide-react';
import XTerminal from '../components/terminal/XTerminal';
import type { TerminalStatus } from '../components/terminal/types';
import { useWorkspaceStore } from '../stores/workspace';

interface TerminalTab {
  id: string;
  name: string;
  sessionId: string | undefined;
  status: TerminalStatus;
}

// Wrapper component to force remount on navigation
export default function TerminalPage() {
  const location = useLocation();
  // Key forces remount when navigating to this page, ensuring fresh data load
  return <TerminalContent key={location.key} />;
}

function TerminalContent() {
  const { currentProjectId, currentWorkspaceId, projects } = useWorkspaceStore();
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get current project data including localPath
  const currentProject = currentWorkspaceId && currentProjectId
    ? projects[currentWorkspaceId]?.find(p => p.id === currentProjectId)
    : null;

  const createNewTab = useCallback(async () => {
    if (!currentProjectId) {
      alert('Please select a project first');
      return;
    }

    try {
      // Get terminal gateway URL
      const hostname = window.location.hostname;
      const gatewayUrl = `http://${hostname}:8005`;

      // Create a new terminal session with project's localPath as cwd
      const response = await fetch(`${gatewayUrl}/api/terminal/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          userId: 'current-user', // TODO: get from auth store
          // Pass the project's local path so terminal opens in the right directory
          cwd: currentProject?.localPath || undefined,
          projectName: currentProject?.name || undefined,
          workspaceId: currentWorkspaceId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create terminal session');
      }

      const session = await response.json();
      const tabId = `tab-${Date.now()}`;
      const newTab: TerminalTab = {
        id: tabId,
        name: `Terminal ${tabs.length + 1}`,
        sessionId: session.id,
        status: 'disconnected',
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);
    } catch (error) {
      console.error('Failed to create terminal session:', error);
      alert('Failed to create terminal session. Make sure the terminal gateway is running.');
    }
  }, [currentProjectId, currentProject, currentWorkspaceId, tabs.length]);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      const newTabs = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
      }
      return newTabs;
    });
  }, [activeTabId]);

  const updateTabStatus = useCallback((tabId: string, status: TerminalStatus) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, status } : t))
    );
  }, []);

  return (
    <div className={`h-full flex flex-col bg-slate-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <TerminalIcon className="h-5 w-5 text-green-400" />
          <h1 className="text-lg font-semibold text-white">Terminal</h1>
          {!currentProjectId && (
            <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded">
              Select a project to use terminal
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center bg-slate-800 border-b border-slate-700 px-2">
        <div className="flex items-center gap-1 overflow-x-auto py-2">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-sm cursor-pointer transition-colors ${
                activeTabId === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  tab.status === 'connected'
                    ? 'bg-green-500'
                    : tab.status === 'connecting' || tab.status === 'reconnecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : tab.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-slate-500'
                }`}
              />
              <span>{tab.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="p-0.5 hover:bg-slate-600 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={createNewTab}
          disabled={!currentProjectId}
          className="ml-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="New terminal"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 relative">
        {tabs.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
            <TerminalIcon className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg mb-2">No terminals open</p>
            <p className="text-sm mb-4">Click the + button to open a new terminal</p>
            <button
              onClick={createNewTab}
              disabled={!currentProjectId}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              New Terminal
            </button>
          </div>
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              className={`absolute inset-0 ${activeTabId === tab.id ? 'block' : 'hidden'}`}
            >
              <XTerminal
                sessionId={tab.sessionId}
                projectId={currentProjectId || ''}
                className="h-full"
                onStatusChange={(status) => updateTabStatus(tab.id, status)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
