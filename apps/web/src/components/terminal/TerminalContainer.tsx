import { useState, useCallback } from 'react';
import { Terminal, Plus, X } from 'lucide-react';
import XTerminal from './XTerminal';
import type { TerminalStatus, TerminalSession } from './types';

interface TerminalTab {
  id: string;
  name: string;
  sessionId?: string;
  status: TerminalStatus;
}

interface TerminalContainerProps {
  projectId: string;
  className?: string;
  onCreateSession?: () => Promise<TerminalSession | undefined>;
  onCloseSession?: (sessionId: string) => void;
}

export default function TerminalContainer({
  projectId,
  className = '',
  onCreateSession,
  onCloseSession,
}: TerminalContainerProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const handleCreateTab = useCallback(async () => {
    const session = await onCreateSession?.();
    const newTab: TerminalTab = {
      id: session?.id || `tab-${Date.now()}`,
      name: `Terminal ${tabs.length + 1}`,
      sessionId: session?.id,
      status: session ? 'connecting' : 'disconnected',
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length, onCreateSession]);

  const handleCloseTab = useCallback(
    (tabId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const tab = tabs.find((t) => t.id === tabId);
      if (tab?.sessionId) {
        onCloseSession?.(tab.sessionId);
      }
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      if (activeTabId === tabId) {
        const remaining = tabs.filter((t) => t.id !== tabId);
        setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null);
      }
    },
    [tabs, activeTabId, onCloseSession]
  );

  const handleStatusChange = useCallback((tabId: string, status: TerminalStatus) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, status } : t))
    );
  }, []);

  return (
    <div className={`flex flex-col h-full bg-[#1a1b26] ${className}`}>
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-700 bg-[#15161e]">
        <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                flex items-center gap-2 px-3 py-2 text-sm border-r border-gray-700
                transition-colors group min-w-0
                ${activeTabId === tab.id
                  ? 'bg-[#1a1b26] text-white'
                  : 'bg-[#15161e] text-gray-400 hover:text-white hover:bg-gray-800'
                }
              `}
            >
              <Terminal className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[120px]">{tab.name}</span>
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  tab.status === 'connected'
                    ? 'bg-green-500'
                    : tab.status === 'connecting' || tab.status === 'reconnecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : tab.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                }`}
              />
              <button
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="p-0.5 rounded hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
        <button
          onClick={handleCreateTab}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title="New terminal"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 relative">
        {tabs.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Terminal className="w-12 h-12 mx-auto mb-3 text-gray-500" />
              <p className="text-gray-400 text-sm">No terminal sessions</p>
              <button
                onClick={handleCreateTab}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Open Terminal
              </button>
            </div>
          </div>
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              className={`absolute inset-0 ${activeTabId === tab.id ? 'block' : 'hidden'}`}
            >
              <XTerminal
                sessionId={tab.sessionId}
                projectId={projectId}
                onStatusChange={(status) => handleStatusChange(tab.id, status)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
