import { useState } from 'react';
import { Terminal, Loader2 } from 'lucide-react';
import { XTerminal } from '../../terminal';
import { useWorkspaceStore } from '../../../stores/workspace';

interface CardData {
  id: string;
  projectId?: string;
  projectLocalPath?: string;
  boardId?: string;
  projectName?: string;
}

interface CardTerminalTabProps {
  card: CardData;
  isActive: boolean;
}

export default function CardTerminalTab({ card, isActive }: CardTerminalTabProps) {
  const [terminalSessionId, setTerminalSessionId] = useState<string | undefined>();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const { currentWorkspaceId, currentProjectId, projects } = useWorkspaceStore();

  const projectId = card.projectId || currentProjectId || card.id;

  // Get current project details for context
  const currentProject = currentWorkspaceId && currentProjectId
    ? projects[currentWorkspaceId]?.find(p => p.id === currentProjectId)
    : null;

  const handleStartSession = async () => {
    console.log('[Terminal] Button clicked - starting session creation');
    setIsCreatingSession(true);
    try {
      console.log('[Terminal] Project ID:', projectId);
      // Use same hostname as current page to avoid CORS issues
      const terminalGatewayUrl = `http://${window.location.hostname}:8005/api/terminal/sessions`;
      console.log('[Terminal] Fetching', terminalGatewayUrl);
      const response = await fetch(terminalGatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          userId: 'current-user',
          cwd: card.projectLocalPath || currentProject?.localPath,
          // Pass full context for Claude CLI integration
          workspaceId: currentWorkspaceId,
          boardId: card.boardId || currentProject?.boardId,
          projectName: card.projectName || currentProject?.name,
          metadata: {
            context: 'Kanban Card Terminal',
            cardId: card.id,
          },
        }),
      });
      console.log('[Terminal] Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[Terminal] Session created successfully:', data);
        setTerminalSessionId(data.id);
        console.log('[Terminal] Set session ID to:', data.id);
      } else {
        const errorText = await response.text();
        console.error('[Terminal] Failed to create session:', response.status, errorText);
        alert(`Failed to create terminal session: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('[Terminal] Error creating session:', error);
      alert(`Terminal gateway error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <div className={`h-full -m-4 flex flex-col ${isActive ? '' : 'hidden'}`}>
      <XTerminal
        sessionId={terminalSessionId}
        projectId={projectId}
      />
      {!terminalSessionId && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1b26]/90 z-10">
          <div className="text-center p-6">
            <Terminal className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400 text-sm mb-3">Dev Environment Terminal</p>
            <button
              onClick={handleStartSession}
              disabled={isCreatingSession}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {isCreatingSession ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                'Start Terminal Session'
              )}
            </button>
            <p className="text-xs text-gray-500 mt-3">
              Requires Terminal Gateway service (port 8005)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
