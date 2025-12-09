import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockWorkspace = {
  id: 'workspace-123',
  name: 'Test Workspace',
  description: 'A test workspace',
  ownerId: 'user-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  owner: mockUser,
  members: [],
};

const mockProject = {
  id: 'project-123',
  workspaceId: 'workspace-123',
  name: 'Test Project',
  description: 'A test project',
  status: 'Active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  workspace: mockWorkspace,
};

const mockBoard = {
  id: 'board-123',
  projectId: 'project-123',
  name: 'Development Board',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  project: mockProject,
};

const mockLanes = [
  {
    id: 'lane-0',
    boardId: 'board-123',
    laneNumber: 0,
    name: 'Blueprint',
    wipLimit: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'lane-1',
    boardId: 'board-123',
    laneNumber: 1,
    name: 'PRD',
    wipLimit: null,
    createdAt: new Date().toISOString(),
  },
];

const mockCard = {
  id: 'card-123',
  boardId: 'board-123',
  laneId: 'lane-0',
  title: 'Test Card',
  description: 'A test card',
  type: 'Task',
  priority: 'Medium',
  status: 'Draft',
  assigneeId: null,
  position: 0,
  parentId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  assignee: null,
  parent: null,
  children: [],
  agentRuns: [],
};

const mockAgent = {
  id: 'agent-123',
  name: 'ceo-copilot',
  displayName: 'CEO CoPilot',
  description: 'An AI assistant for CEOs',
  allowedLanes: [0],
  defaultProvider: 'openai',
  defaultModel: 'gpt-4',
  systemPrompt: 'You are a CEO assistant.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockAgentRun = {
  id: 'run-123',
  cardId: 'card-123',
  agentId: 'agent-123',
  status: 'completed',
  provider: 'openai',
  model: 'gpt-4',
  inputTokens: 100,
  outputTokens: 200,
  cost: 0.001,
  price: 0.001,
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  agent: mockAgent,
  logs: [],
};

// MSW server setup
export const server = setupServer(
  // Auth endpoints
  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      user: mockUser,
      token: 'mock-jwt-token',
    });
  }),

  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      user: mockUser,
      token: 'mock-jwt-token',
    });
  }),

  http.get('/api/auth/me', () => {
    return HttpResponse.json(mockUser);
  }),

  // Workspace endpoints
  http.get('/api/workspaces', () => {
    return HttpResponse.json([mockWorkspace]);
  }),

  http.get('/api/workspaces/:id', () => {
    return HttpResponse.json(mockWorkspace);
  }),

  http.post('/api/workspaces', () => {
    return HttpResponse.json(mockWorkspace);
  }),

  // Project endpoints
  http.get('/api/projects', () => {
    return HttpResponse.json([mockProject]);
  }),

  http.get('/api/projects/:id', () => {
    return HttpResponse.json(mockProject);
  }),

  http.post('/api/projects', () => {
    return HttpResponse.json(mockProject);
  }),

  // Board endpoints
  http.get('/api/boards', () => {
    return HttpResponse.json([mockBoard]);
  }),

  http.get('/api/boards/:id', () => {
    return HttpResponse.json({
      ...mockBoard,
      lanes: mockLanes,
      cards: [mockCard],
    });
  }),

  http.post('/api/boards', () => {
    return HttpResponse.json(mockBoard);
  }),

  // Card endpoints
  http.get('/api/cards', () => {
    return HttpResponse.json([mockCard]);
  }),

  http.get('/api/cards/:id', () => {
    return HttpResponse.json(mockCard);
  }),

  http.post('/api/cards', () => {
    return HttpResponse.json(mockCard);
  }),

  http.put('/api/cards/:id', () => {
    return HttpResponse.json(mockCard);
  }),

  http.delete('/api/cards/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  // Agent endpoints
  http.get('/api/agents', () => {
    return HttpResponse.json([mockAgent]);
  }),

  http.get('/api/agents/:id', () => {
    return HttpResponse.json(mockAgent);
  }),

  // Agent run endpoints
  http.post('/api/cards/:cardId/execute', () => {
    return HttpResponse.json(mockAgentRun);
  }),

  http.get('/api/runs/:id', () => {
    return HttpResponse.json(mockAgentRun);
  }),

  http.get('/api/runs', () => {
    return HttpResponse.json([mockAgentRun]);
  }),

  // Usage/billing endpoints
  http.get('/api/usage/workspace/:id', () => {
    return HttpResponse.json({
      totalCost: 10.50,
      totalTokens: 50000,
      breakdown: [
        {
          provider: 'openai',
          model: 'gpt-4',
          cost: 8.20,
          tokens: 40000,
        },
        {
          provider: 'anthropic',
          model: 'claude-3',
          cost: 2.30,
          tokens: 10000,
        },
      ],
    });
  }),

  // Health check
  http.get('/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  // Provider router endpoints
  http.post('/api/chat/completions', () => {
    return HttpResponse.json({
      choices: [
        {
          message: {
            content: 'This is a mock response from the AI.',
            role: 'assistant',
          },
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    });
  }),
);