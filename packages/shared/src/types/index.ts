import type { CARD_TYPES, CARD_PRIORITIES, CARD_STATUSES, AGENT_NAMES, PROVIDERS } from '../constants.js';

export type CardType = (typeof CARD_TYPES)[number];
export type CardPriority = (typeof CARD_PRIORITIES)[number];
export type CardStatus = (typeof CARD_STATUSES)[number];
export type AgentName = (typeof AGENT_NAMES)[number];
export type Provider = (typeof PROVIDERS)[number];

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'member' | 'viewer';
  createdAt: Date;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: 'Active' | 'Archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Board {
  id: string;
  projectId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lane {
  id: string;
  boardId: string;
  laneNumber: number;
  name: string;
  wipLimit?: number;
  createdAt: Date;
}

export interface Card {
  id: string;
  boardId: string;
  laneId: string;
  title: string;
  description?: string;
  type: CardType;
  priority: CardPriority;
  status: CardStatus;
  assigneeId?: string;
  position: number;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  name: AgentName;
  displayName: string;
  description: string;
  allowedLanes: number[];
  defaultProvider: Provider;
  defaultModel: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentRun {
  id: string;
  cardId: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  provider: Provider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  price: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface RunLog {
  id: string;
  runId: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface UsageEvent {
  id: string;
  workspaceId: string;
  projectId: string;
  cardId?: string;
  agentId: string;
  runId: string;
  provider: Provider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  price: number;
  createdAt: Date;
}

export interface ProjectDoc {
  id: string;
  projectId: string;
  type: 'blueprint' | 'prd' | 'mvp' | 'plan' | 'playbook' | 'infra';
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Inter-service communication types
export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  dependencies?: Record<string, 'healthy' | 'unhealthy'>;
}

export interface AuthToken {
  userId: string;
  workspaceId: string;
  role: string;
  exp: number;
}

export interface AgentExecutionRequest {
  cardId: string;
  agentId: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  context?: Record<string, unknown>;
}

export interface AgentExecutionResponse {
  runId: string;
  status: 'started' | 'failed';
  message?: string;
}

export interface ProviderRequest {
  provider: Provider;
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  workspaceId: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    price: number;
  };
  model: string;
  provider: Provider;
  byoa?: boolean;
}

export interface LogStreamEvent {
  runId: string;
  type: 'log' | 'status' | 'error' | 'completion';
  data: {
    level?: 'info' | 'warn' | 'error' | 'debug';
    message?: string;
    metadata?: Record<string, unknown>;
    status?: string;
    error?: string;
    result?: unknown;
  };
  timestamp: Date;
}

export interface BillingUsageEvent {
  workspaceId: string;
  projectId: string;
  cardId?: string;
  agentId: string;
  runId: string;
  provider: Provider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  price: number;
  timestamp: Date;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}
