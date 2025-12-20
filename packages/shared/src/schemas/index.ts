import { z } from 'zod';
import { CARD_TYPES, CARD_PRIORITIES, CARD_STATUSES, AGENT_NAMES, PROVIDERS } from '../constants.js';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const createProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  localPath: z.string().optional(), // Local filesystem path for project files
});

export const createCardSchema = z.object({
  boardId: z.string().uuid(),
  laneId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(CARD_TYPES),
  priority: z.enum(CARD_PRIORITIES).default('Medium'),
  assigneeId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(CARD_TYPES).optional(),
  priority: z.enum(CARD_PRIORITIES).optional(),
  status: z.enum(CARD_STATUSES).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  laneId: z.string().uuid().optional(),
  position: z.number().int().min(0).optional(),
});

export const moveCardSchema = z.object({
  laneId: z.string().uuid(),
  position: z.number().int().min(0),
});

export const runAgentSchema = z.object({
  cardId: z.string().uuid(),
  agentName: z.enum(AGENT_NAMES),
  provider: z.enum(PROVIDERS).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  maxIterations: z.number().min(1).max(50).optional(),
  tools: z.array(z.string()).optional(),
  context: z.record(z.unknown()).optional(),
});

export const agentConfigSchema = z.object({
  agentName: z.enum(AGENT_NAMES),
  provider: z.enum(PROVIDERS),
  model: z.string(),
});

export const updateProjectDocSchema = z.object({
  content: z.string(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type RunAgentInput = z.infer<typeof runAgentSchema>;
export type AgentConfigInput = z.infer<typeof agentConfigSchema>;
export type UpdateProjectDocInput = z.infer<typeof updateProjectDocSchema>;
