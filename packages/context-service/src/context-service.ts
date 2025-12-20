/**
 * Context Service
 *
 * Redis-backed service for managing agent context, conversation history,
 * and terminal session linking.
 */

import { Redis } from 'ioredis';
import type {
  CardContext,
  TerminalSessionContext,
  ConversationMessage,
  GetContextOptions,
  AppendMessageOptions,
} from './types.js';

// Redis key prefixes
const CARD_CONTEXT_PREFIX = 'context:card:';
const TERMINAL_SESSION_PREFIX = 'context:terminal:';
const CARD_TERMINAL_LINKS_PREFIX = 'context:card-terminals:';

// Default TTL: 7 days
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

// Maximum history length to prevent unbounded growth
const DEFAULT_MAX_HISTORY_LENGTH = 100;

export interface ContextServiceOptions {
  redisUrl?: string;
  ttlSeconds?: number;
  maxHistoryLength?: number;
}

export class ContextService {
  private redis: Redis;
  private ttlSeconds: number;
  private maxHistoryLength: number;

  constructor(options: ContextServiceOptions = {}) {
    const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    this.ttlSeconds = options.ttlSeconds || DEFAULT_TTL_SECONDS;
    this.maxHistoryLength = options.maxHistoryLength || DEFAULT_MAX_HISTORY_LENGTH;
  }

  /**
   * Get the Redis client for direct access if needed
   */
  getRedisClient(): Redis {
    return this.redis;
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  // ==================== Card Context Methods ====================

  /**
   * Get card context including conversation history
   */
  async getCardContext(
    cardId: string,
    options: GetContextOptions = {}
  ): Promise<CardContext | null> {
    const key = CARD_CONTEXT_PREFIX + cardId;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    const context = JSON.parse(data) as CardContext;

    // Optionally limit history
    if (options.historyLimit && context.conversationHistory) {
      context.conversationHistory = context.conversationHistory.slice(-options.historyLimit);
    }

    return context;
  }

  /**
   * Set card context, replacing existing
   */
  async setCardContext(cardId: string, context: CardContext): Promise<void> {
    const key = CARD_CONTEXT_PREFIX + cardId;

    // Update metadata
    context.metadata.lastUpdated = new Date().toISOString();
    context.metadata.totalMessages = context.conversationHistory.length;

    await this.redis.setex(key, this.ttlSeconds, JSON.stringify(context));
  }

  /**
   * Initialize a new card context if it doesn't exist
   */
  async initCardContext(cardId: string, projectId: string, agentName?: string): Promise<CardContext> {
    const existing = await this.getCardContext(cardId);
    if (existing) {
      return existing;
    }

    const context: CardContext = {
      cardId,
      projectId,
      agentName,
      conversationHistory: [],
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalMessages: 0,
        linkedTerminalSessions: [],
      },
    };

    await this.setCardContext(cardId, context);
    return context;
  }

  /**
   * Append a message to card conversation history
   */
  async appendCardMessage(
    cardId: string,
    message: ConversationMessage,
    options: AppendMessageOptions = {}
  ): Promise<void> {
    const context = await this.getCardContext(cardId);
    if (!context) {
      throw new Error(`Card context not found: ${cardId}`);
    }

    context.conversationHistory.push(message);

    // Trim history if exceeds max length
    const maxLength = options.maxHistoryLength || this.maxHistoryLength;
    if (context.conversationHistory.length > maxLength) {
      context.conversationHistory = context.conversationHistory.slice(-maxLength);
    }

    await this.setCardContext(cardId, context);
  }

  /**
   * Get conversation history for a card
   */
  async getCardConversationHistory(
    cardId: string,
    limit?: number
  ): Promise<ConversationMessage[]> {
    const context = await this.getCardContext(cardId, { historyLimit: limit });
    return context?.conversationHistory || [];
  }

  /**
   * Clear card context
   */
  async clearCardContext(cardId: string): Promise<void> {
    const key = CARD_CONTEXT_PREFIX + cardId;
    await this.redis.del(key);
  }

  // ==================== Terminal Session Methods ====================

  /**
   * Get terminal session context
   */
  async getTerminalSessionContext(
    sessionId: string,
    options: GetContextOptions = {}
  ): Promise<TerminalSessionContext | null> {
    const key = TERMINAL_SESSION_PREFIX + sessionId;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    const context = JSON.parse(data) as TerminalSessionContext;

    // Optionally limit history
    if (options.historyLimit && context.conversationHistory) {
      context.conversationHistory = context.conversationHistory.slice(-options.historyLimit);
    }

    return context;
  }

  /**
   * Set terminal session context
   */
  async setTerminalSessionContext(
    sessionId: string,
    context: TerminalSessionContext
  ): Promise<void> {
    const key = TERMINAL_SESSION_PREFIX + sessionId;

    // Update metadata
    context.metadata.lastActiveAt = new Date().toISOString();
    context.metadata.totalMessages = context.conversationHistory.length;

    await this.redis.setex(key, this.ttlSeconds, JSON.stringify(context));
  }

  /**
   * Initialize a new terminal session context
   */
  async initTerminalSessionContext(
    sessionId: string,
    projectId: string,
    userId: string,
    options: { agentName?: string; provider?: string; model?: string } = {}
  ): Promise<TerminalSessionContext> {
    const existing = await this.getTerminalSessionContext(sessionId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const context: TerminalSessionContext = {
      sessionId,
      projectId,
      userId,
      agentName: options.agentName,
      provider: options.provider,
      model: options.model,
      conversationHistory: [],
      metadata: {
        createdAt: now,
        lastActiveAt: now,
        totalMessages: 0,
      },
    };

    await this.setTerminalSessionContext(sessionId, context);
    return context;
  }

  /**
   * Append a message to terminal session conversation history
   */
  async appendTerminalMessage(
    sessionId: string,
    message: ConversationMessage,
    options: AppendMessageOptions = {}
  ): Promise<void> {
    const context = await this.getTerminalSessionContext(sessionId);
    if (!context) {
      throw new Error(`Terminal session context not found: ${sessionId}`);
    }

    context.conversationHistory.push(message);

    // Trim history if exceeds max length
    const maxLength = options.maxHistoryLength || this.maxHistoryLength;
    if (context.conversationHistory.length > maxLength) {
      context.conversationHistory = context.conversationHistory.slice(-maxLength);
    }

    await this.setTerminalSessionContext(sessionId, context);
  }

  /**
   * Update terminal session agent config
   */
  async updateTerminalAgentConfig(
    sessionId: string,
    config: { agentName?: string; provider?: string; model?: string }
  ): Promise<void> {
    const context = await this.getTerminalSessionContext(sessionId);
    if (!context) {
      throw new Error(`Terminal session context not found: ${sessionId}`);
    }

    if (config.agentName !== undefined) context.agentName = config.agentName;
    if (config.provider !== undefined) context.provider = config.provider;
    if (config.model !== undefined) context.model = config.model;

    await this.setTerminalSessionContext(sessionId, context);
  }

  /**
   * Clear terminal session context
   */
  async clearTerminalSessionContext(sessionId: string): Promise<void> {
    const key = TERMINAL_SESSION_PREFIX + sessionId;
    await this.redis.del(key);
  }

  // ==================== Linking Methods ====================

  /**
   * Link a terminal session to a card
   */
  async linkTerminalToCard(sessionId: string, cardId: string): Promise<void> {
    // Update terminal session with linked card
    const terminalContext = await this.getTerminalSessionContext(sessionId);
    if (terminalContext) {
      terminalContext.linkedCardId = cardId;
      await this.setTerminalSessionContext(sessionId, terminalContext);
    }

    // Update card context with linked terminal
    const cardContext = await this.getCardContext(cardId);
    if (cardContext) {
      if (!cardContext.metadata.linkedTerminalSessions.includes(sessionId)) {
        cardContext.metadata.linkedTerminalSessions.push(sessionId);
        await this.setCardContext(cardId, cardContext);
      }
    }

    // Store the link in a separate key for quick lookup
    const linkKey = CARD_TERMINAL_LINKS_PREFIX + cardId;
    await this.redis.sadd(linkKey, sessionId);
    await this.redis.expire(linkKey, this.ttlSeconds);
  }

  /**
   * Unlink a terminal session from a card
   */
  async unlinkTerminalFromCard(sessionId: string, cardId: string): Promise<void> {
    // Update terminal session
    const terminalContext = await this.getTerminalSessionContext(sessionId);
    if (terminalContext && terminalContext.linkedCardId === cardId) {
      terminalContext.linkedCardId = undefined;
      await this.setTerminalSessionContext(sessionId, terminalContext);
    }

    // Update card context
    const cardContext = await this.getCardContext(cardId);
    if (cardContext) {
      cardContext.metadata.linkedTerminalSessions = cardContext.metadata.linkedTerminalSessions.filter(
        (id) => id !== sessionId
      );
      await this.setCardContext(cardId, cardContext);
    }

    // Remove from link set
    const linkKey = CARD_TERMINAL_LINKS_PREFIX + cardId;
    await this.redis.srem(linkKey, sessionId);
  }

  /**
   * Get all terminal sessions linked to a card
   */
  async getLinkedTerminalSessions(cardId: string): Promise<string[]> {
    const linkKey = CARD_TERMINAL_LINKS_PREFIX + cardId;
    return await this.redis.smembers(linkKey);
  }

  /**
   * Get the card linked to a terminal session
   */
  async getLinkedCard(sessionId: string): Promise<string | null> {
    const context = await this.getTerminalSessionContext(sessionId);
    return context?.linkedCardId || null;
  }

  // ==================== Context Sharing Methods ====================

  /**
   * Copy conversation history from one context to another
   * Useful for sharing context between terminal and card
   */
  async shareContext(
    sourceType: 'card' | 'terminal',
    sourceId: string,
    targetType: 'card' | 'terminal',
    targetId: string,
    options: { limit?: number } = {}
  ): Promise<void> {
    // Get source history
    let sourceHistory: ConversationMessage[];
    if (sourceType === 'card') {
      sourceHistory = await this.getCardConversationHistory(sourceId, options.limit);
    } else {
      const context = await this.getTerminalSessionContext(sourceId, {
        historyLimit: options.limit,
      });
      sourceHistory = context?.conversationHistory || [];
    }

    if (sourceHistory.length === 0) {
      return;
    }

    // Append to target
    for (const message of sourceHistory) {
      if (targetType === 'card') {
        await this.appendCardMessage(targetId, message);
      } else {
        await this.appendTerminalMessage(targetId, message);
      }
    }
  }
}

// Singleton instance for convenience
let defaultInstance: ContextService | null = null;

export function getContextService(options?: ContextServiceOptions): ContextService {
  if (!defaultInstance) {
    defaultInstance = new ContextService(options);
  }
  return defaultInstance;
}

export function resetContextService(): void {
  if (defaultInstance) {
    defaultInstance.close();
    defaultInstance = null;
  }
}
