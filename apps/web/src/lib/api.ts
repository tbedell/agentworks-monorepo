// In production, use the VITE_API_URL environment variable; in development, use relative URLs
const API_BASE = (import.meta as any)?.env?.VITE_API_URL
  ? `${(import.meta as any).env.VITE_API_URL}/api`
  : '/api';
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

      // NEVER swallow authentication errors - always throw them so UI can redirect to login
      if (response.status === 401 || response.status === 403) {
        throw new Error(error.error || 'Not authenticated');
      }

      // For DELETE and mutating operations, always throw the real error
      if (method === 'DELETE' || method === 'POST' || method === 'PUT' || method === 'PATCH') {
        throw new Error(error.error || 'Request failed');
      }

      // In dev mode, return sensible defaults for GET requests instead of throwing
      // BUT only for server errors (5xx) or network issues, NOT authentication/authorization (4xx)
      if (isDevMode && response.status >= 500) {
        console.warn(`API call failed in dev mode: ${method} ${endpoint}`, error);
        return getDevModeFallback<T>(endpoint, method, options);
      }

      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  } catch (error) {
    // Re-throw authentication/authorization errors
    if (error instanceof Error && (error.message.includes('Not authenticated') || error.message.includes('Unauthorized') || error.message.includes('Forbidden'))) {
      throw error;
    }

    // For mutating operations, always re-throw the error
    if (method === 'DELETE' || method === 'POST' || method === 'PUT' || method === 'PATCH') {
      throw error;
    }

    // In dev mode, gracefully handle TRUE network errors for GET requests (e.g., server down)
    // These are errors where fetch itself failed, not HTTP errors
    if (isDevMode && error instanceof TypeError) {
      console.warn(`Network error in dev mode: ${method} ${endpoint}`, error);
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
    importFromGitHub: (data: {
      workspaceId: string;
      name: string;
      description?: string;
      localPath: string;
      repoOwner: string;
      repoName: string;
      repoFullName: string;
      defaultBranch: string;
    }) =>
      request<any>('/projects/import-github', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => request<any>(`/projects/${id}`),
    update: (id: string, data: any) =>
      request<any>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
    getDoc: (id: string, type: string) =>
      request<any>(`/projects/${id}/docs/${type}`),
    getDocs: (id: string) =>
      request<{ docs: Array<{ id: string; projectId: string; type: string; content: string; createdAt: string; updatedAt: string }> }>(`/projects/${id}/docs`),
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
    // Document sync endpoints - for keeping /docs folder in sync with database
    getDocsInfo: (id: string) =>
      request<{
        projectId: string;
        projectName: string;
        localPath: string | null;
        docsDir: string | null;
        documents: Array<{
          type: string;
          fileName: string;
          filePath: string | null;
          hasDbContent: boolean;
          hasFileContent: boolean;
          inSync: boolean;
          syncState: 'in_sync' | 'db_newer' | 'file_newer' | 'conflict' | 'file_missing' | 'no_local_path';
          dbVersion: number;
          dbUpdatedAt: string | null;
          fileMtime: string | null;
          lastSyncedAt: string | null;
        }>;
      }>(`/projects/${id}/docs-info`),
    getDocFile: (id: string, type: string) =>
      request<{
        projectId: string;
        type: string;
        content: string | null;
        filePath: string | null;
        error: string | null;
        exists: boolean;
        stats: {
          size: number;
          modified: string;
          created: string;
        } | null;
      }>(`/projects/${id}/docs/${type}/file`),
    syncDoc: (id: string, type: string) =>
      request<{
        success: boolean;
        type: string;
        filePath: string | null;
        error: string | null;
        version: number;
      }>(`/projects/${id}/docs/${type}/sync`, { method: 'POST' }),
    importDoc: (id: string, type: string) =>
      request<{
        success: boolean;
        type: string;
        filePath: string | null;
        version: number;
        contentLength: number;
      }>(`/projects/${id}/docs/${type}/import`, { method: 'POST' }),
    // Auto-sync based on timestamps - silently imports if file is newer, shows conflict if both modified
    autoSyncDoc: (id: string, type: string) =>
      request<{
        action: 'none' | 'imported' | 'synced' | 'created' | 'conflict';
        message: string;
        state: string;
        version?: number;
        filePath?: string;
        dbContent?: string;
        fileContent?: string;
        dbUpdatedAt?: string;
        fileMtime?: string;
        lastSyncedAt?: string;
      }>(`/projects/${id}/docs/${type}/auto-sync`, { method: 'POST' }),
    // Resolve a conflict by choosing which version to keep
    resolveDocConflict: (id: string, type: string, resolution: 'keep_db' | 'keep_file' | 'keep_custom', customContent?: string) =>
      request<{
        success: boolean;
        resolution: string;
        message: string;
      }>(`/projects/${id}/docs/${type}/resolve-conflict`, {
        method: 'POST',
        body: JSON.stringify({ resolution, customContent }),
      }),
    // Builder state and revision endpoints
    getBuilderState: (id: string, builderType: 'ui' | 'db' | 'workflow') =>
      request<{
        id: string;
        projectId: string;
        builderType: string;
        state: any;
        version: number;
        updatedAt: string;
      }>(`/projects/${id}/builders/${builderType}`),
    updateBuilderState: (id: string, builderType: 'ui' | 'db' | 'workflow', data: {
      state: any;
      screenshot?: string;
      description?: string;
      createdBy?: string;
    }) =>
      request<{
        builderState: { id: string; version: number; state: any };
        revision: { id: string; version: number; createdAt: string };
      }>(`/projects/${id}/builders/${builderType}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getBuilderRevisions: (id: string, builderType: 'ui' | 'db' | 'workflow', params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.offset) query.set('offset', params.offset.toString());
      const queryStr = query.toString();
      return request<{
        revisions: Array<{
          id: string;
          version: number;
          screenshot: string | null;
          createdBy: string | null;
          description: string | null;
          createdAt: string;
        }>;
        total: number;
        limit: number;
        offset: number;
      }>(`/projects/${id}/builders/${builderType}/revisions${queryStr ? `?${queryStr}` : ''}`);
    },
    getBuilderRevision: (id: string, builderType: 'ui' | 'db' | 'workflow', revisionId: string) =>
      request<{
        revision: {
          id: string;
          version: number;
          state: any;
          screenshot: string | null;
          createdBy: string | null;
          description: string | null;
          createdAt: string;
        };
      }>(`/projects/${id}/builders/${builderType}/revisions/${revisionId}`),
    restoreBuilderRevision: (id: string, builderType: 'ui' | 'db' | 'workflow', revisionId: string) =>
      request<{
        builderState: { id: string; version: number; state: any };
        revision: { id: string; version: number };
        restoredFrom: number;
      }>(`/projects/${id}/builders/${builderType}/revisions/${revisionId}/restore`, {
        method: 'POST',
      }),
    // Screenshot management endpoints
    saveScreenshot: async (projectId: string, blob: Blob): Promise<{
      success: boolean;
      path: string;
      filename: string;
      url: string;
      createdAt: string;
    }> => {
      const formData = new FormData();
      formData.append('screenshot', blob, 'screenshot.png');
      const response = await fetch(`${API_BASE}/projects/${projectId}/screenshots`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save screenshot' }));
        throw new Error(error.error || 'Failed to save screenshot');
      }
      return response.json();
    },
    listScreenshots: (projectId: string) =>
      request<{
        screenshots: Array<{
          filename: string;
          url: string;
          createdAt: string;
        }>;
      }>(`/projects/${projectId}/screenshots`),
    deleteScreenshot: (projectId: string, filename: string) =>
      request<{ success: boolean }>(`/projects/${projectId}/screenshots/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      }),
    // Workflow template management
    saveWorkflowTemplate: (projectId: string, data: {
      name: string;
      description?: string;
      nodes: any[];
      edges: any[];
    }) =>
      request<{
        success: boolean;
        path: string;
        name: string;
        createdAt: string;
      }>(`/projects/${projectId}/workflows/template`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getWorkflowTemplates: (projectId: string) =>
      request<{
        templates: Array<{
          name: string;
          description: string;
          path: string;
          createdAt: string;
          updatedAt: string;
          nodeCount: number;
          edgeCount: number;
        }>;
      }>(`/projects/${projectId}/workflows/templates`),
    getWorkflowTemplate: (projectId: string, name: string) =>
      request<{
        name: string;
        description: string;
        nodes: any[];
        edges: any[];
        createdAt: string;
        updatedAt: string;
      }>(`/projects/${projectId}/workflows/templates/${encodeURIComponent(name)}`),
    deleteWorkflowTemplate: (projectId: string, name: string) =>
      request<{ success: boolean }>(`/projects/${projectId}/workflows/templates/${encodeURIComponent(name)}`, {
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
    complete: (id: string) =>
      request<{ card: any; completedAt: string }>(`/cards/${id}/complete`, {
        method: 'POST',
      }),
    getHistory: (id: string) =>
      request<{ history: Array<{
        id: string;
        cardId: string;
        action: string;
        previousValue: string | null;
        newValue: string | null;
        performedBy: string;
        details: string | null;
        metadata: Record<string, any> | null;
        timestamp: string;
      }> }>(`/cards/${id}/history`),
    addHistory: (id: string, data: { action: string; previousValue?: string; newValue?: string; details?: string; metadata?: Record<string, any> }) =>
      request<{ history: any }>(`/cards/${id}/history`, {
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
    billing: (workspaceId: string) =>
      request<any>(`/usage/billing/${workspaceId}`),
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
    generateDocument: (data: { projectId: string; documentType: 'blueprint' | 'prd' | 'mvp' | 'playbook' }) =>
      request<{ success: boolean; doc: any }>('/copilot/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    generateCards: (projectId: string) =>
      request<{ success: boolean; cards: any[] }>('/copilot/generate-cards', {
        method: 'POST',
        body: JSON.stringify({ projectId }),
      }),
    generateAll: (projectId: string) =>
      request<{ success: boolean; results: any[]; message: string }>('/copilot/generate-all', {
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
    approveReviewCard: (data: { projectId: string; documentType: 'blueprint' | 'prd' | 'mvp' | 'playbook' }) =>
      request<{ success: boolean; card?: any; movedToLane?: string }>('/copilot/approve-review', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    generateWorkflow: (data: { prompt: string; projectId?: string }) =>
      request<{
        success: boolean;
        workflow: {
          name: string;
          nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: any }>;
          edges: Array<{ id: string; source: string; target: string; animated?: boolean; label?: string }>;
        };
      }>('/copilot/generate-workflow', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Agent CoPilot endpoints
    agentsChat: (data: {
      message: string;
      projectId?: string;
      agentContext: {
        agents: Array<{
          name: string;
          displayName: string;
          description?: string;
          status: 'active' | 'byoa' | 'inactive';
          provider?: string;
          model?: string;
          temperature?: number;
          maxTokens?: number;
          lanes?: string[];
        }>;
        projectType?: string;
        credentials: Array<{
          provider: string;
          status: string;
          assignedAgents: string[];
        }>;
      };
    }) =>
      request<{
        message: { id: string; role: string; content: string; timestamp: string };
        recommendations?: Array<{
          agentName: string;
          displayName: string;
          reason: string;
          priority: 'essential' | 'recommended' | 'optional';
          suggestedSettings?: { temperature?: number; maxTokens?: number; provider?: string; model?: string };
        }>;
        actions?: Array<{
          type: string;
          agentName?: string;
          settings?: Record<string, unknown>;
          presetId?: string;
        }>;
        analysis?: {
          totalAgents: number;
          activeAgents: number;
          inactiveAgents: number;
          byoaAgents: number;
          misconfigurations: Array<{ agentName: string; displayName: string; issue: string; severity: string; suggestion: string }>;
          recommendations: Array<{ agentName: string; displayName: string; reason: string; priority: string }>;
          summary: string;
        };
      }>('/copilot/agents/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    analyzeAgents: (data: {
      projectId?: string;
      agents: Array<{
        name: string;
        displayName: string;
        description?: string;
        status: 'active' | 'byoa' | 'inactive';
        provider?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        lanes?: string[];
      }>;
      projectType?: string;
    }) =>
      request<{
        analysis: {
          totalAgents: number;
          activeAgents: number;
          inactiveAgents: number;
          byoaAgents: number;
          misconfigurations: Array<{ agentName: string; displayName: string; issue: string; severity: string; suggestion: string }>;
          recommendations: Array<{ agentName: string; displayName: string; reason: string; priority: string }>;
          summary: string;
        };
      }>('/copilot/agents/analyze', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getAgentRecommendations: (data: {
      projectId?: string;
      projectType?: string;
      agents: Array<{
        name: string;
        displayName: string;
        status: 'active' | 'byoa' | 'inactive';
      }>;
    }) =>
      request<{
        recommendations: Array<{
          agentName: string;
          displayName: string;
          reason: string;
          priority: 'essential' | 'recommended' | 'optional';
          suggestedSettings: { provider: string; model: string; temperature: number };
        }>;
      }>('/copilot/agents/recommend', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    bulkConfigureAgents: (data: {
      projectId: string;
      configurations: Array<{
        agentName: string;
        provider?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
      }>;
    }) =>
      request<{
        success: boolean;
        results: Array<{ agentName: string; success: boolean; error?: string }>;
      }>('/copilot/agents/bulk-configure', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  uiAgent: {
    chat: (data: {
      message: string;
      projectId: string;
      cardId?: string;
      mode: 'html' | 'components';
      context: {
        currentComponents?: any[];
        currentBreakpoint?: string;
        currentHTML?: { html: string; css: string };
      };
    }) =>
      request<{
        message: { id: string; role: string; content: string; timestamp: string };
        actions: any[];
        generatedHTML?: { html: string; css: string };
      }>('/ui-agent/chat', {
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
  git: {
    // Get git status for a project
    getStatus: (projectId: string) =>
      request<{
        branch: string;
        isClean: boolean;
        ahead: number;
        behind: number;
        staged: string[];
        modified: string[];
        untracked: string[];
        deleted: string[];
      }>(`/${projectId}/git/status`),
    // Get git log for a project
    getLog: (projectId: string, params?: { limit?: number; branch?: string }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', params.limit.toString());
      if (params?.branch) query.set('branch', params.branch);
      const queryStr = query.toString();
      return request<{
        commits: Array<{
          hash: string;
          message: string;
          author: string;
          date: string;
          refs?: string;
        }>;
      }>(`/${projectId}/git/log${queryStr ? `?${queryStr}` : ''}`);
    },
    // Get branches for a project
    getBranches: (projectId: string) =>
      request<{
        current: string;
        branches: Array<{
          name: string;
          current: boolean;
          remote?: string;
        }>;
      }>(`/${projectId}/git/branches`),
    // Checkout a branch
    checkout: (projectId: string, data: { branch: string; create?: boolean }) =>
      request<{ success: boolean; branch: string }>(`/${projectId}/git/checkout`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    // Stage files
    stage: (projectId: string, data: { files?: string[] }) =>
      request<{ success: boolean; message: string }>(`/${projectId}/git/stage`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    // Unstage files
    unstage: (projectId: string, data: { files?: string[] }) =>
      request<{ success: boolean; message: string }>(`/${projectId}/git/unstage`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    // Commit changes
    commit: (projectId: string, data: { message: string; files?: string[] }) =>
      request<{
        success: boolean;
        message: string;
        requiresApproval?: boolean;
        requestId?: string;
      }>(`/${projectId}/git/commit`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    // Push to remote
    push: (projectId: string, data?: { remote?: string; branch?: string; force?: boolean }) =>
      request<{
        success: boolean;
        message: string;
        requiresApproval?: boolean;
        requestId?: string;
      }>(`/${projectId}/git/push`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    // Pull from remote
    pull: (projectId: string, data?: { remote?: string; branch?: string; rebase?: boolean }) =>
      request<{ success: boolean; message: string }>(`/${projectId}/git/pull`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    // Get diff
    getDiff: (projectId: string, params?: { staged?: boolean; file?: string }) => {
      const query = new URLSearchParams();
      if (params?.staged) query.set('staged', 'true');
      if (params?.file) query.set('file', params.file);
      const queryStr = query.toString();
      return request<{ diff: string }>(`/${projectId}/git/diff${queryStr ? `?${queryStr}` : ''}`);
    },
    // Request git operation (for approval workflow)
    requestOperation: (projectId: string, data: { operation: string; metadata?: Record<string, any> }) =>
      request<{ id: string; status: string }>(`/${projectId}/git/request`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    // Get pending operation requests
    getRequests: (projectId: string, params?: { status?: string }) => {
      const query = params?.status ? `?status=${params.status}` : '';
      return request<{
        requests: Array<{
          id: string;
          operation: string;
          status: string;
          requesterType: string;
          metadata: Record<string, any>;
          createdAt: string;
        }>;
      }>(`/${projectId}/git/requests${query}`);
    },
    // Approve operation request
    approveRequest: (projectId: string, requestId: string) =>
      request<{ success: boolean }>(`/${projectId}/git/requests/${requestId}/approve`, {
        method: 'POST',
      }),
    // Reject operation request
    rejectRequest: (projectId: string, requestId: string, data?: { reason?: string }) =>
      request<{ success: boolean }>(`/${projectId}/git/requests/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
  },
  github: {
    // Get GitHub connection status
    getConnection: () =>
      request<{
        connected: boolean;
        username?: string;
        avatarUrl?: string;
        connectedAt?: string;
      }>('/github/connection'),
    // Get user's GitHub repos
    getRepos: () =>
      request<Array<{
        id: number;
        name: string;
        fullName: string;
        description: string | null;
        owner: string;
        private: boolean;
        defaultBranch: string;
        language: string | null;
        stargazersCount: number;
        forksCount: number;
        updatedAt: string;
        htmlUrl: string;
      }>>('/github/repos'),
    // Disconnect GitHub
    disconnect: () =>
      request<{ success: boolean }>('/github/disconnect', { method: 'POST' }),
  },
  database: {
    // Get full database schema introspection
    getSchema: () =>
      request<{
        tables: Array<{
          name: string;
          schema: string;
          columns: Array<{
            name: string;
            type: string;
            nullable: boolean;
            defaultValue: string | null;
            isPrimaryKey: boolean;
            isForeignKey: boolean;
            foreignKeyRef: string | null;
            isUnique: boolean;
          }>;
          rowCount: number | null;
        }>;
        foreignKeys: Array<{
          constraintName: string;
          tableName: string;
          columnName: string;
          foreignTableName: string;
          foreignColumnName: string;
        }>;
        stats: {
          tableCount: number;
          totalColumns: number;
          foreignKeyCount: number;
        };
      }>('/database/schema'),
    // Get database stats (row counts)
    getStats: () =>
      request<{
        stats: Array<{
          table_name: string;
          row_count: number;
        }>;
      }>('/database/stats'),
    // Get indexes for a specific table
    getIndexes: (tableName: string) =>
      request<{
        indexes: Array<{
          index_name: string;
          column_name: string;
          is_unique: boolean;
          is_primary: boolean;
        }>;
      }>(`/database/indexes/${tableName}`),
    // Get schema in DB Builder format (compatible with existing UI)
    getBuilderFormat: () =>
      request<{
        tables: Array<{
          id: string;
          name: string;
          fields: Array<{
            name: string;
            type: string;
            pk?: boolean;
            fk?: string;
            unique?: boolean;
            nullable: boolean;
          }>;
        }>;
      }>('/database/schema/builder-format'),
  },
  pullRequests: {
    // List pull requests for a project
    list: (projectId: string, params?: { state?: 'open' | 'closed' | 'all' }) => {
      const query = params?.state ? `?state=${params.state}` : '';
      return request<{
        pullRequests: Array<{
          number: number;
          html_url: string;
          title: string;
          state: string;
          draft: boolean;
          user: { login: string; avatar_url: string };
          head: { ref: string };
          base: { ref: string };
          created_at: string;
          updated_at: string;
        }>;
      }>(`/github/pull-requests/${projectId}${query}`);
    },
    // Get a specific pull request
    get: (projectId: string, prNumber: number) =>
      request<{
        pullRequest: {
          number: number;
          url: string;
          title: string;
          body: string | null;
          state: string;
          draft: boolean;
          mergeable: boolean | null;
          merged: boolean;
          head: string;
          base: string;
          author: { login: string; avatarUrl: string };
          createdAt: string;
          updatedAt: string;
          mergedAt: string | null;
          additions: number;
          deletions: number;
          changedFiles: number;
        };
      }>(`/github/pull-requests/${projectId}/${prNumber}`),
    // Create a pull request
    create: (projectId: string, data: {
      title: string;
      body?: string;
      head: string;
      base?: string;
      draft?: boolean;
    }) =>
      request<{
        success: boolean;
        pullRequest: {
          number: number;
          url: string;
          title: string;
          state: string;
        };
      }>('/github/pull-request', {
        method: 'POST',
        body: JSON.stringify({ projectId, ...data }),
      }),
    // Merge a pull request
    merge: (projectId: string, prNumber: number, data?: {
      mergeMethod?: 'merge' | 'squash' | 'rebase';
      commitTitle?: string;
      commitMessage?: string;
    }) =>
      request<{
        success: boolean;
        merged: boolean;
        sha: string;
        message: string;
      }>(`/github/pull-requests/${projectId}/${prNumber}/merge`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    // Close or reopen a pull request
    update: (projectId: string, prNumber: number, data: { state: 'open' | 'closed' }) =>
      request<{
        success: boolean;
        pullRequest: {
          number: number;
          url: string;
          title: string;
          state: string;
        };
      }>(`/github/pull-requests/${projectId}/${prNumber}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
};
