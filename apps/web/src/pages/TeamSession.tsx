import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Hand,
  Crown,
  Plus,
  LogOut,
  X,
  Send,
  Loader2,
} from 'lucide-react';
import { NekoClient } from '../components/collaboration/NekoClient';
import { useAuthStore } from '../stores/auth';
import { useWorkspaceStore } from '../stores/workspace';

interface Session {
  id: string;
  name: string;
  nekoUrl: string;
  nekoPassword: string;
  status: string;
  hostUser: { id: string; name: string | null; email: string; avatarUrl: string | null };
  workspace: { id: string; name: string };
  participants: Participant[];
}

interface Participant {
  id: string;
  userId: string;
  user: { id: string; name: string | null; avatarUrl: string | null };
  role: string;
  hasControl: boolean;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

export default function TeamSession() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentWorkspaceId } = useWorkspaceStore();

  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [nekoConnected, setNekoConnected] = useState(false);

  // Fetch active sessions for the workspace
  const fetchSessions = useCallback(async () => {
    if (!currentWorkspaceId) return;

    try {
      const res = await fetch(
        `/api/collaboration/sessions?workspaceId=${currentWorkspaceId}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId]);

  // Fetch specific session
  const fetchSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/collaboration/sessions/${id}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      } else if (res.status === 404) {
        navigate('/team-session');
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId);
    } else {
      fetchSessions();
    }
  }, [sessionId, fetchSession, fetchSessions]);

  // Create new session
  const createSession = async () => {
    if (!newSessionName.trim() || !currentWorkspaceId) return;

    setCreating(true);
    try {
      const res = await fetch('/api/collaboration/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newSessionName.trim(),
          workspaceId: currentWorkspaceId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowCreateModal(false);
        setNewSessionName('');
        navigate(`/team-session/${data.id}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setCreating(false);
    }
  };

  // Join session
  const joinSession = async (id: string) => {
    try {
      await fetch(`/api/collaboration/sessions/${id}/join`, {
        method: 'POST',
        credentials: 'include',
      });
      navigate(`/team-session/${id}`);
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  // Leave session
  const leaveSession = async () => {
    if (!session) return;

    try {
      await fetch(`/api/collaboration/sessions/${session.id}/leave`, {
        method: 'POST',
        credentials: 'include',
      });
      navigate('/team-session');
    } catch (error) {
      console.error('Failed to leave session:', error);
    }
  };

  // End session (host only)
  const endSession = async () => {
    if (!session) return;

    try {
      await fetch(`/api/collaboration/sessions/${session.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      navigate('/team-session');
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  // Grant/revoke control
  const toggleControl = async (targetUserId: string, grant: boolean) => {
    if (!session) return;

    try {
      await fetch(`/api/collaboration/sessions/${session.id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetUserId, grant }),
      });
      // Refresh session to get updated participants
      fetchSession(session.id);
    } catch (error) {
      console.error('Failed to toggle control:', error);
    }
  };

  // Send chat message
  const sendChatMessage = () => {
    if (!chatInput.trim() || !user) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: user.name || user.email,
      message: chatInput.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput('');
  };

  const isHost = session?.hostUser.id === user?.id;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Session List View
  if (!sessionId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Sessions</h1>
            <p className="text-gray-600 mt-1">
              Collaborate with your team in real-time browser sessions
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No active sessions
            </h3>
            <p className="text-gray-600 mb-6">
              Start a new session to collaborate with your team in real-time
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => joinSession(s.id)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {s.name}
                  </h3>
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Active
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span>{s.hostUser.name || s.hostUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{s.participants.length} participant(s)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Session Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Create Team Session
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createSession();
                }}
                placeholder="Session name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createSession}
                  disabled={!newSessionName.trim() || creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Session not found
  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Session not found</p>
          <button
            onClick={() => navigate('/team-session')}
            className="text-blue-600 hover:underline"
          >
            Back to sessions
          </button>
        </div>
      </div>
    );
  }

  // Active Session View
  return (
    <div className="flex h-full bg-gray-100">
      {/* Main Browser Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Session Header */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/team-session')}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-semibold text-gray-900">{session.name}</h2>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Crown className="w-3 h-3 text-yellow-500" />
                {session.hostUser.name || session.hostUser.email}
                <span className="mx-1">|</span>
                <Users className="w-3 h-3" />
                {session.participants.length}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-lg transition-colors ${
                showChat
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Toggle chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            {isHost ? (
              <button
                onClick={endSession}
                className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
              >
                End Session
              </button>
            ) : (
              <button
                onClick={leaveSession}
                className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </button>
            )}
          </div>
        </div>

        {/* Neko Browser */}
        <div className="flex-1 bg-gray-900 relative">
          <NekoClient
            nekoUrl={session.nekoUrl}
            password={session.nekoPassword}
            username={user?.name || 'user'}
            className="w-full h-full"
            onConnected={() => setNekoConnected(true)}
            onDisconnected={() => setNekoConnected(false)}
            onError={(err) => console.error('Neko error:', err)}
          />
          {!nekoConnected && (
            <div className="absolute bottom-4 right-4 bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-sm">
              Connecting to browser...
            </div>
          )}
        </div>
      </div>

      {/* Chat & Participants Sidebar */}
      {showChat && (
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0">
          {/* Participants */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants ({session.participants.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {session.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 shrink-0">
                      {(p.user.name || 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 truncate">
                      {p.user.name || 'Unknown'}
                    </span>
                    {p.role === 'host' && (
                      <Crown className="w-3 h-3 text-yellow-500 shrink-0" />
                    )}
                    {p.hasControl && p.role !== 'host' && (
                      <Hand className="w-3 h-3 text-green-500 shrink-0" />
                    )}
                  </div>
                  {isHost && p.userId !== user?.id && (
                    <button
                      onClick={() => toggleControl(p.userId, !p.hasControl)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        p.hasControl
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {p.hasControl ? 'Revoke' : 'Grant'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-gray-900">{msg.user}</span>
                    <span className="text-xs text-gray-400">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-0.5">{msg.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
