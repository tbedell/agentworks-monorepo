const API_BASE = '/api';
const isDevMode = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || (import.meta as any)?.env?.DEV);

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method || 'GET';

  // Only set Content-Type for requests with a body
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      // Always try to get the actual error from the response first
      const error = await response.json().catch(() => ({ error: 'Request failed' }));

      // For DELETE and mutating operations, always throw the real error
      if (method === 'DELETE' || method === 'POST' || method === 'PUT' || method === 'PATCH') {
        throw new Error(error.error || 'Request failed');
      }

      // In dev mode, return sensible defaults for GET requests instead of throwing
      if (isDevMode) {
        console.warn(`API call failed in dev mode: ${method} ${endpoint}`, error);
        return getDevModeFallback<T>(endpoint, method, options);
      }

      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  } catch (error) {
    // For mutating operations, always re-throw the error
    if (method === 'DELETE' || method === 'POST' || method === 'PUT' || method === 'PATCH') {
      throw error;
    }

    // In dev mode, gracefully handle network errors for GET requests
    if (isDevMode) {
      console.warn(`API call error in dev mode: ${method} ${endpoint}`, error);
      return getDevModeFallback<T>(endpoint, method, options);
    }
    throw error;
  }
}

function getDevModeFallback<T>(endpoint: string, method: string, options: RequestInit): T {
  // GET request fallbacks - return empty arrays/objects, no mock data
  if (method === 'GET') {
    if (endpoint.includes('/agents/runs')) {
      return [] as T;
    }
    if (endpoint.includes('/agents')) {
      return [] as T;
    }
    if (endpoint.endsWith('/workspaces')) {
      return [] as T;
    }
    if (endpoint.match(/\/projects\?workspaceId=/)) {
      return [] as T;
    }
    if (endpoint.match(/\/projects\/[^/]+$/)) {
      return { phase: 'welcome' } as T;
    }
    if (endpoint.includes('/todos') || endpoint.includes('/sessions') || endpoint.includes('/components')) {
      return [] as T;
    }
    if (endpoint.includes('/boards/')) {
      return { id: 'empty-board', lanes: [], cards: [] } as T;
    }
    return {} as T;
  }
  
  // POST request fallbacks for workspace creation
  if (method === 'POST' && endpoint === '/workspaces') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    return {
      id: `workspace-${Date.now()}`,
      name: body.name || 'New Workspace',
      description: body.description || '',
      role: 'owner',
      memberCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as T;
  }
  
  // POST request fallbacks for project creation
  if (method === 'POST' && endpoint === '/projects') {
    const body = options.body ? JSON.parse(options.body as string) : {};
    return {
      id: `project-${Date.now()}`,
      workspaceId: body.workspaceId,
      name: body.name || 'New Project',
      description: body.description || '',
      status: 'active',
      phase: 'welcome',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as T;
  }
  
  // POST fallbacks for copilot endpoints - throw to let real API handle
  if (method === 'POST' && endpoint.includes('/copilot')) {
    throw new Error('CoPilot API unavailable');
  }

  // DELETE requests should throw - don't fake delete success
  if (method === 'DELETE') {
    throw new Error('Delete operation failed - API unavailable');
  }

  // Default fallback for other POST/PATCH
  return { success: true } as T;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: any; tourRequired?: boolean; tourStep?: number }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, name: string, companyName?: string) =>
      request<{ user: any; tenant?: any; workspace?: any; tourRequired?: boolean }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, companyName }),
      }),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<{
      user: {
        id: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        createdAt: string | null;
        lastLoginAt: string | null;
      };
      tenant?: { id: string; name: string; slug: string } | null;
      preferences?: {
        emailNotifications: boolean;
        desktopNotifications: boolean;
        agentStatusUpdates: boolean;
      };
      activeSessions?: number;
      tourRequired?: boolean;
      tourStep?: number;
    }>('/auth/me'),
    completeOnboarding: () => request<{ success: boolean }>('/auth/complete-onboarding', { method: 'POST' }),
    tourProgress: (step: number) => request<{ success: boolean; step: number }>('/auth/tour-progress', {
      method: 'POST',
      body: JSON.stringify({ step }),
    }),
    completeTour: () => request<{ success: boolean }>('/auth/complete-tour', { method: 'POST' }),
    restartTour: () => request<{ success: boolean }>('/auth/restart-tour', { method: 'POST' }),
    dismissTour: () => request<{ success: boolean }>('/auth/tour-dismiss', { method: 'POST' }),
    getTourStatus: () => request<{
      tourCompleted: boolean;
      tourStep: number;
      tourDismissed: boolean;
      tourDismissedAt: string | null;
      shouldShowTour: boolean;
    }>('/auth/tour-status'),
  },
  user: {
    getProfile: () =>
      request<{
        user: {
          id: string;
          email: string;
          name: string;
          avatarUrl: string | null;
          createdAt: string;
          lastLoginAt: string | null;
        };
        preferences: {
          emailNotifications: boolean;
          desktopNotifications: boolean;
          agentStatusUpdates: boolean;
        };
        activeSessions: number;
      }>('/user/profile'),
    updateProfile: (data: { name?: string; email?: string; avatarUrl?: string | null }) =>
      request<{ user: any }>('/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ success: boolean; message?: string }>('/user/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    getPreferences: () =>
      request<{
        preferences: {
          emailNotifications: boolean;
          desktopNotifications: boolean;
          agentStatusUpdates: boolean;
          projectsBasePath?: string | null;
        };
      }>('/user/preferences'),
    updatePreferences: (data: {
      emailNotifications?: boolean;
      desktopNotifications?: boolean;
      agentStatusUpdates?: boolean;
      projectsBasePath?: string;
    }) =>
      request<{
        preferences: {
          emailNotifications: boolean;
          desktopNotifications: boolean;
          agentStatusUpdates: boolean;
          projectsBasePath?: string | null;
        };
      }>('/user/preferences', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getSessions: () =>
      request<{
        activeSessions: number;
        sessions: { id: string; createdAt: string; expiresAt: string }[];
      }>('/user/sessions'),
    uploadPhoto: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE}/user/photo`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Upload failed');
      }
      return response.json() as Promise<{ success: boolean; avatarUrl: string }>;
    },
    deletePhoto: () =>
      request<{ success: boolean }>('/user/photo', { method: 'DELETE' }),
  },
  workspaces: {
    list: () => request<any[]>('/workspaces'),
    get: (id: string) => request<any>(`/workspaces/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<any>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/workspaces/${id}`, { method: 'DELETE' }),
    invite: (id: string, email: string, role?: string) =>
      request<any>(`/workspaces/${id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }),
  },
  projects: {
    list: (workspaceId: string) => request<any[]>(`/projects?workspaceId=${workspaceId}`),
    create: (data: { workspaceId: string; name: string; description?: string; localPath?: string }) =>
      request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<any>(`/projects/${id}`),
    update: (id: string, data: any) =>
      request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
    getDoc: (id: string, type: string) =>
      request<any>(`/projects/${id}/docs/${type}`),
    updateDoc: (id: string, type: string, content: string) =>
      request<any>(`/projects/${id}/docs/${type}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),
    listComponents: (id: string) =>
      request<any[]>(`/projects/${id}/components`),
    getComponent: (id: string, type: string, name?: string) =>
      request<any>(`/projects/${id}/components/${type}${name ? `?name=${encodeURIComponent(name)}` : ''}`),
    saveComponent: (id: string, data: { type: string; name: string; data: any }) =>
      request<any>(`/projects/${id}/components`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteComponent: (id: string, componentId: string) =>
      request<{ success: boolean }>(`/projects/${id}/components/${componentId}`, {
        method: 'DELETE',
      }),
  },
  boards: {
    get: (id: string) => request<any>(`/boards/${id}`),
    updateLane: (boardId: string, laneId: string, data: { wipLimit?: number; requiresHumanReview?: boolean; autoAdvance?: boolean }) =>
      request<any>(`/boards/${boardId}/lanes/${laneId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  cards: {
    create: (data: any) =>
      request<any>('/cards', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<any>(`/cards/${id}`),
    update: (id: string, data: any) =>
      request<any>(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    move: (id: string, laneId: string, position: number) =>
      request<any>(`/cards/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({ laneId, position }),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/cards/${id}`, { method: 'DELETE' }),
    approve: (id: string, data: { notes?: string; advance?: boolean }) =>
      request<{ card: any; advanced: boolean; nextLane: any | null }>(`/cards/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reject: (id: string, data: { notes?: string; returnToPrevious?: boolean }) =>
      request<{ card: any; returnedToPrevious: boolean; previousLane: any | null }>(`/cards/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  agents: {
    list: () => request<any[]>('/agents'),
    get: (name: string) => request<any>(`/agents/${name}`),
    run: (data: { cardId: string; agentName: string; provider?: string; model?: string }) =>
      request<any>('/agents/run', { method: 'POST', body: JSON.stringify(data) }),
    getRun: (id: string) => request<any>(`/agents/runs/${id}`),
    getCardRuns: (cardId: string) => request<any[]>(`/agents/runs/card/${cardId}`),
    getConfig: (projectId: string) => request<any[]>(`/agents/config/${projectId}`),
    setConfig: (projectId: string, data: any) =>
      request<any>(`/agents/config/${projectId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    copilotChat: (data: { message: string; projectId?: string; cardId?: string; context?: any }) =>
      request<{ message: string; type?: string; metadata?: any }>('/agents/copilot/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  usage: {
    workspace: (workspaceId: string, params?: { startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams(params as any).toString();
      return request<any>(`/usage/workspace/${workspaceId}${query ? `?${query}` : ''}`);
    },
    project: (projectId: string, params?: { startDate?: string; endDate?: string }) => {
      const query = new URLSearchParams(params as any).toString();
      return request<any>(`/usage/project/${projectId}${query ? `?${query}` : ''}`);
    },
    daily: (workspaceId: string, days?: number) =>
      request<any[]>(`/usage/daily/${workspaceId}${days ? `?days=${days}` : ''}`),
  },
  copilot: {
    chat: (data: { message: string; conversationId?: string; context: string; projectId?: string; cardId?: string; phase?: string }) =>
      request<{ conversationId: string; message: { id: string; role: string; content: string; timestamp: string }; currentPhase?: string; advancePhase?: string | null }>('/copilot/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getConversations: () => request<{ conversations: any[] }>('/copilot/conversations'),
    getConversation: (id: string) => request<{ conversation: any }>(`/copilot/conversations/${id}`),
    createConversation: (data: { context: string; projectId?: string; cardId?: string; title?: string }) =>
      request<{ conversation: any }>('/copilot/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteConversation: (id: string) =>
      request<{ success: boolean }>(`/copilot/conversations/${id}`, { method: 'DELETE' }),
    savePhase: (data: { projectId: string; phase: string; response: string }) =>
      request<{ success: boolean }>('/copilot/phase', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getPhase: (projectId: string) =>
      request<{ phase: string; responses: Record<string, string> }>(`/copilot/phase/${projectId}`),
    generateDocument: (data: { projectId: string; documentType: 'blueprint' | 'prd' | 'mvp' }) =>
      request<{ success: boolean; doc: any }>('/copilot/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    generateCards: (projectId: string) =>
      request<{ success: boolean; cards: any[] }>('/copilot/generate-cards', {
        method: 'POST',
        body: JSON.stringify({ projectId }),
      }),
    reviewContext: (data: { cardId: string; prompt?: string }) =>
      request<{ success: boolean; card: any; contextSize: number; review: string }>('/copilot/review-context', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getContext: (cardId: string) =>
      request<{ exists: boolean; content: string; size: number; cardId: string; cardTitle: string }>(`/copilot/context/${cardId}`),
    contextChat: (data: { cardId: string; message: string; userName?: string }) =>
      request<{ success: boolean; content: string; size: number; cardId: string; cardTitle: string }>('/copilot/context-chat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getInstructions: (cardId: string) =>
      request<{ instructions: string | null; lastUpdated: string | null; cardId: string; cardTitle: string }>(`/copilot/instructions/${cardId}`),
    updateInstructions: (cardId: string, instructions: string) =>
      request<{ success: boolean; instructions: string; cardId: string }>(`/copilot/instructions/${cardId}`, {
        method: 'PUT',
        body: JSON.stringify({ instructions }),
      }),
    generateInstructions: (cardId: string, regenerate?: boolean) =>
      request<{ success: boolean; instructions: string; cardId: string; generated: boolean }>('/copilot/generate-instructions', {
        method: 'POST',
        body: JSON.stringify({ cardId, regenerate }),
      }),
    agentRespond: (data: { cardId: string; agentName?: string }) =>
      request<{ success: boolean; runId: string; status: string; agentName: string; cardId: string }>('/copilot/agent-respond', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  todos: {
    list: (projectId: string) => request<any[]>(`/projects/${projectId}/todos`),
    create: (projectId: string, data: { content: string; cardId?: string; category?: string; priority?: number }) =>
      request<any>(`/projects/${projectId}/todos`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (projectId: string, todoId: string, data: { completed?: boolean; content?: string; priority?: number }) =>
      request<any>(`/projects/${projectId}/todos/${todoId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, todoId: string) =>
      request<{ success: boolean }>(`/projects/${projectId}/todos/${todoId}`, { method: 'DELETE' }),
  },
  sessions: {
    list: (projectId: string) => request<any[]>(`/projects/${projectId}/sessions`),
    get: (projectId: string, sessionId: string) => request<any>(`/projects/${projectId}/sessions/${sessionId}`),
    create: (projectId: string, data: { cardId?: string; context: string; phase?: string }) =>
      request<any>(`/projects/${projectId}/sessions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    appendLog: (projectId: string, sessionId: string, data: { entry: any }) =>
      request<any>(`/projects/${projectId}/sessions/${sessionId}/log`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    end: (projectId: string, sessionId: string, data: { summary?: string }) =>
      request<any>(`/projects/${projectId}/sessions/${sessionId}/end`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  filesystem: {
    browse: (path?: string) =>
      request<{
        currentPath: string;
        parentPath: string | null;
        entries: { name: string; path: string; isDirectory: boolean }[];
        roots: { name: string; path: string }[];
      }>(`/filesystem/browse${path ? `?path=${encodeURIComponent(path)}` : ''}`),
    createDirectory: (path: string) =>
      request<{ success: boolean; path: string }>('/filesystem/create-directory', {
        method: 'POST',
        body: JSON.stringify({ path }),
      }),
    validate: (path: string) =>
      request<{ exists: boolean; isDirectory: boolean; path: string }>(
        `/filesystem/validate?path=${encodeURIComponent(path)}`
      ),
  },
};
