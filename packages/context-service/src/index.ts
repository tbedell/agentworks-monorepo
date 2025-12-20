/**
 * @agentworks/context-service
 *
 * Redis-backed context service for managing agent conversation history,
 * card context, and terminal session linking.
 */

// Export types
export type {
  MessageRole,
  ConversationMessage,
  ToolCallInfo,
  CardContext,
  TerminalSessionContext,
  GetContextOptions,
  AppendMessageOptions,
  SSEEventType,
  SSEEvent,
} from './types.js';

// Export zod schemas for validation
export {
  conversationMessageSchema,
  cardContextSchema,
  terminalSessionContextSchema,
} from './types.js';

// Export the context service
export {
  ContextService,
  getContextService,
  resetContextService,
} from './context-service.js';
export type { ContextServiceOptions } from './context-service.js';
