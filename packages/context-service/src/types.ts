/**
 * Context Service Types
 *
 * Types for managing agent context, conversation history, and terminal sessions.
 */

import { z } from 'zod';

// Message role in conversation
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

// A single message in the conversation history
export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  toolCalls?: ToolCallInfo[];
  metadata?: Record<string, unknown>;
}

// Tool call information within a message
export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

// Card context stored in Redis
export interface CardContext {
  cardId: string;
  projectId: string;
  agentName?: string;
  conversationHistory: ConversationMessage[];
  metadata: {
    lastUpdated: string;
    totalMessages: number;
    linkedTerminalSessions: string[];
  };
}

// Terminal session context
export interface TerminalSessionContext {
  sessionId: string;
  projectId: string;
  userId: string;
  agentName?: string;
  provider?: string;
  model?: string;
  linkedCardId?: string;
  conversationHistory: ConversationMessage[];
  metadata: {
    createdAt: string;
    lastActiveAt: string;
    totalMessages: number;
  };
}

// Options for getting context
export interface GetContextOptions {
  includeHistory?: boolean;
  historyLimit?: number;
}

// Options for appending messages
export interface AppendMessageOptions {
  maxHistoryLength?: number;
}

// SSE event types
export type SSEEventType =
  | 'connected'
  | 'message'
  | 'tool_start'
  | 'tool_end'
  | 'iteration_start'
  | 'iteration_end'
  | 'agent_complete'
  | 'agent_error'
  | 'heartbeat';

// SSE event payload
export interface SSEEvent {
  type: SSEEventType;
  timestamp: string;
  data: unknown;
}

// Zod schemas for validation
export const conversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  timestamp: z.string(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        arguments: z.record(z.unknown()),
        result: z.unknown().optional(),
        error: z.string().optional(),
      })
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const cardContextSchema = z.object({
  cardId: z.string().uuid(),
  projectId: z.string().uuid(),
  agentName: z.string().optional(),
  conversationHistory: z.array(conversationMessageSchema),
  metadata: z.object({
    lastUpdated: z.string(),
    totalMessages: z.number(),
    linkedTerminalSessions: z.array(z.string()),
  }),
});

export const terminalSessionContextSchema = z.object({
  sessionId: z.string(),
  projectId: z.string().uuid(),
  userId: z.string(),
  agentName: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  linkedCardId: z.string().uuid().optional(),
  conversationHistory: z.array(conversationMessageSchema),
  metadata: z.object({
    createdAt: z.string(),
    lastActiveAt: z.string(),
    totalMessages: z.number(),
  }),
});
