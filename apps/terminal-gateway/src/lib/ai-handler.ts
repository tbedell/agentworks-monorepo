/**
 * AI Chat Handler for Terminal Gateway
 * Handles AI chat messages from terminal sessions
 */
import { createLogger } from '@agentworks/shared';

const logger = createLogger('ai-handler');

export interface AgentConfig {
  agentName: string;
  provider: string;
  model: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// In-memory conversation history per session
const sessionConversations = new Map<string, AIMessage[]>();
const sessionConfigs = new Map<string, AgentConfig>();

/**
 * Get default agent config based on agent name
 * Matches the agent registry in agent-orchestrator
 */
function getDefaultConfig(agentName: string): AgentConfig {
  // Default configurations based on agent type - matches agent-registry.ts
  const agentDefaults: Record<string, { provider: string; model: string }> = {
    // Executive & Strategy (Lane 0)
    'ceo_copilot': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    'strategy': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

    // Product & Design (Lane 0-1)
    'storyboard_ux': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    'prd': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    'mvp_scope': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

    // Research & Planning (Lane 2-4)
    'research': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    'architect': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    'planner': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

    // Development (Lane 1-4)
    'code_standards': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    'dev_backend': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    'dev_frontend': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    'devops': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

    // Quality & Testing (Lane 4)
    'qa': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    'troubleshooter': { provider: 'google', model: 'gemini-2.0-flash' },

    // Documentation & Optimization (Lane 4-6)
    'docs': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
    'refactor': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

    // Full-featured Code Agent
    'claude_code_agent': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

    // Default fallback
    'default': { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  };

  const defaults = agentDefaults[agentName] || agentDefaults['default'];
  return { agentName, ...defaults };
}

/**
 * Set agent configuration for a session
 */
export function setAgentConfig(sessionId: string, config: AgentConfig): void {
  sessionConfigs.set(sessionId, config);
  logger.info('Agent config set for session', { sessionId, config });
}

/**
 * Get agent configuration for a session
 */
export function getAgentConfig(sessionId: string): AgentConfig | undefined {
  return sessionConfigs.get(sessionId);
}

/**
 * Clear conversation history for a session
 */
export function clearConversation(sessionId: string): void {
  sessionConversations.delete(sessionId);
  logger.debug('Conversation cleared for session', { sessionId });
}

/**
 * Get conversation history for a session
 */
export function getConversationHistory(sessionId: string): AIMessage[] {
  return sessionConversations.get(sessionId) || [];
}

/**
 * Handle AI chat message and stream response
 */
export async function* handleChat(
  sessionId: string,
  message: string,
  config?: Partial<AgentConfig>
): AsyncGenerator<string, void, unknown> {
  // Get or create config
  let agentConfig = sessionConfigs.get(sessionId);
  if (!agentConfig) {
    agentConfig = getDefaultConfig(config?.agentName || 'default');
    sessionConfigs.set(sessionId, agentConfig);
  }

  // Apply any overrides
  if (config?.provider) agentConfig.provider = config.provider;
  if (config?.model) agentConfig.model = config.model;
  if (config?.agentName) agentConfig.agentName = config.agentName;

  // Get or create conversation history
  let history = sessionConversations.get(sessionId);
  if (!history) {
    history = [];
    sessionConversations.set(sessionId, history);
  }

  // Add user message to history
  history.push({ role: 'user', content: message });

  logger.info('Processing AI chat message', {
    sessionId,
    provider: agentConfig.provider,
    model: agentConfig.model,
    messageLength: message.length,
  });

  try {
    // Call the orchestrator API to handle the AI request
    const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:8001';

    const response = await fetch(`${orchestratorUrl}/terminal-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-token-dev'}`,
      },
      body: JSON.stringify({
        sessionId,
        message,
        provider: agentConfig.provider,
        model: agentConfig.model,
        agentName: agentConfig.agentName,
        conversationHistory: history.slice(-10), // Last 10 messages for context
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Orchestrator request failed', { status: response.status, error: errorText });
      yield `Error: Failed to get AI response (${response.status})`;
      return;
    }

    // Stream the response
    const reader = response.body?.getReader();
    if (!reader) {
      yield 'Error: No response body';
      return;
    }

    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;
      yield chunk;
    }

    // Add assistant response to history
    history.push({ role: 'assistant', content: fullResponse });

    logger.info('AI chat response completed', {
      sessionId,
      responseLength: fullResponse.length,
    });
  } catch (error) {
    logger.error('AI chat error', { sessionId, error });
    yield `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Cleanup session data
 */
export function cleanupSession(sessionId: string): void {
  sessionConversations.delete(sessionId);
  sessionConfigs.delete(sessionId);
  logger.debug('Session data cleaned up', { sessionId });
}
