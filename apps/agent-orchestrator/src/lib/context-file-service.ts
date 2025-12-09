import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('agent-orchestrator:context-file');

// Instruction section markers (must match API's context-file-service)
const INSTRUCTIONS_START = '<!-- INSTRUCTIONS:START -->';
const INSTRUCTIONS_END = '<!-- INSTRUCTIONS:END -->';

export interface ContextEntry {
  timestamp: Date;
  agentName: string;
  type: 'log' | 'tool_call' | 'tool_result' | 'completion' | 'error' | 'status' | 'human_message' | 'agent_message';
  content: string;
  metadata?: Record<string, any>;
}

export interface ConversationEntry {
  role: 'human' | 'agent';
  content: string;
  timestamp: string;
  agentName?: string;
}

/**
 * Service for managing context files per card.
 * Context files store agent execution history for human review and CoPilot "rewind".
 */
export class ContextFileService {
  /**
   * Get the path to a card's context file
   */
  getContextPath(projectPath: string, cardId: string): string {
    return path.join(projectPath, 'context', `card-${cardId}.context`);
  }

  /**
   * Initialize a context file for a card
   */
  async initializeContext(
    projectPath: string,
    cardId: string,
    cardTitle: string,
    agentName: string
  ): Promise<string> {
    const contextPath = this.getContextPath(projectPath, cardId);

    try {
      await fs.mkdir(path.dirname(contextPath), { recursive: true });

      const header = `# Context: ${cardTitle}

**Card ID**: ${cardId}
**Started**: ${new Date().toISOString()}
**Primary Agent**: ${agentName}

---

`;

      await fs.writeFile(contextPath, header, 'utf-8');
      logger.info('Initialized context file', { projectPath, cardId, contextPath });
      return contextPath;
    } catch (error) {
      logger.error('Failed to initialize context file', { projectPath, cardId, error });
      throw error;
    }
  }

  /**
   * Append an entry to a card's context file
   */
  async appendToContext(
    projectPath: string,
    cardId: string,
    entry: ContextEntry
  ): Promise<void> {
    const contextPath = this.getContextPath(projectPath, cardId);

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(contextPath), { recursive: true });

      const formatted = this.formatEntry(entry);
      await fs.appendFile(contextPath, formatted + '\n', 'utf-8');
    } catch (error) {
      logger.error('Failed to append to context file', { projectPath, cardId, error });
      // Don't throw - context logging failures shouldn't stop agent execution
    }
  }

  /**
   * Append a tool call to context
   */
  async logToolCall(
    projectPath: string,
    cardId: string,
    agentName: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<void> {
    await this.appendToContext(projectPath, cardId, {
      timestamp: new Date(),
      agentName,
      type: 'tool_call',
      content: `**Tool**: \`${toolName}\`\n\n\`\`\`json\n${JSON.stringify(args, null, 2)}\n\`\`\``,
      metadata: { toolName, args },
    });
  }

  /**
   * Append a tool result to context
   */
  async logToolResult(
    projectPath: string,
    cardId: string,
    agentName: string,
    toolName: string,
    result: any,
    success: boolean
  ): Promise<void> {
    const content = success
      ? `**Tool Result**: \`${toolName}\` ✓\n\n\`\`\`\n${typeof result === 'string' ? result.slice(0, 2000) : JSON.stringify(result, null, 2).slice(0, 2000)}\n\`\`\``
      : `**Tool Error**: \`${toolName}\` ✗\n\n\`\`\`\n${result}\n\`\`\``;

    await this.appendToContext(projectPath, cardId, {
      timestamp: new Date(),
      agentName,
      type: 'tool_result',
      content,
      metadata: { toolName, success },
    });
  }

  /**
   * Append a status update to context
   */
  async logStatus(
    projectPath: string,
    cardId: string,
    agentName: string,
    status: string,
    message?: string
  ): Promise<void> {
    await this.appendToContext(projectPath, cardId, {
      timestamp: new Date(),
      agentName,
      type: 'status',
      content: `**Status**: ${status}${message ? `\n\n${message}` : ''}`,
      metadata: { status },
    });
  }

  /**
   * Append an error to context
   */
  async logError(
    projectPath: string,
    cardId: string,
    agentName: string,
    error: string,
    stack?: string
  ): Promise<void> {
    await this.appendToContext(projectPath, cardId, {
      timestamp: new Date(),
      agentName,
      type: 'error',
      content: `**Error**: ${error}${stack ? `\n\n\`\`\`\n${stack}\n\`\`\`` : ''}`,
      metadata: { error },
    });
  }

  /**
   * Append a completion summary to context
   */
  async logCompletion(
    projectPath: string,
    cardId: string,
    agentName: string,
    summary: string,
    usage?: { inputTokens: number; outputTokens: number; cost: number }
  ): Promise<void> {
    let content = `**Completed**: ${summary}`;

    if (usage) {
      content += `\n\n**Usage**:
- Input tokens: ${usage.inputTokens}
- Output tokens: ${usage.outputTokens}
- Cost: $${usage.cost.toFixed(4)}`;
    }

    await this.appendToContext(projectPath, cardId, {
      timestamp: new Date(),
      agentName,
      type: 'completion',
      content,
      metadata: usage,
    });
  }

  /**
   * Get instructions from a card's context file
   */
  async getInstructions(projectPath: string, cardId: string): Promise<string | null> {
    const contextPath = this.getContextPath(projectPath, cardId);

    try {
      const content = await fs.readFile(contextPath, 'utf-8');
      return this.parseInstructions(content);
    } catch (error) {
      logger.debug('No context file found for instructions', { projectPath, cardId });
      return null;
    }
  }

  /**
   * Read the full content of a context file
   */
  async readContext(projectPath: string, cardId: string): Promise<string> {
    const contextPath = this.getContextPath(projectPath, cardId);

    try {
      return await fs.readFile(contextPath, 'utf-8');
    } catch (error) {
      logger.debug('No context file found', { projectPath, cardId });
      return '';
    }
  }

  /**
   * Log an agent's conversational response
   */
  async logAgentMessage(
    projectPath: string,
    cardId: string,
    agentName: string,
    message: string
  ): Promise<void> {
    await this.appendToContext(projectPath, cardId, {
      timestamp: new Date(),
      agentName,
      type: 'agent_message',
      content: message,
    });
  }

  /**
   * Parse conversation from context file content
   * Returns human and agent messages for building conversation history
   */
  parseConversation(content: string): ConversationEntry[] {
    const entries: ConversationEntry[] = [];

    // Match entries in format: ## EMOJI [timestamp] AgentName\n\ncontent\n\n---
    const entryRegex = /## ([^\[]+) \[([^\]]+)\] ([^\n]+)\n\n([\s\S]*?)(?=\n---)/g;
    let match;

    while ((match = entryRegex.exec(content)) !== null) {
      const [, emoji, timestamp, author, body] = match;
      const trimmedEmoji = emoji.trim();
      const trimmedBody = body.trim();

      // Human messages use 👤 emoji
      if (trimmedEmoji === '👤') {
        entries.push({
          role: 'human',
          content: trimmedBody,
          timestamp,
        });
      }
      // Agent messages use 🤖 emoji
      else if (trimmedEmoji === '🤖') {
        entries.push({
          role: 'agent',
          content: trimmedBody,
          timestamp,
          agentName: author,
        });
      }
    }

    return entries;
  }

  /**
   * Parse instructions from context file content
   */
  private parseInstructions(content: string): string | null {
    const startIdx = content.indexOf(INSTRUCTIONS_START);
    const endIdx = content.indexOf(INSTRUCTIONS_END);

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      return null;
    }

    // Extract content between markers
    let instructions = content.slice(startIdx + INSTRUCTIONS_START.length, endIdx).trim();

    // Remove the "## CoPilot Instructions" header if present
    if (instructions.startsWith('## CoPilot Instructions')) {
      instructions = instructions.slice('## CoPilot Instructions'.length).trim();
    }

    return instructions || null;
  }

  /**
   * Format a context entry for markdown output
   */
  private formatEntry(entry: ContextEntry): string {
    const ts = entry.timestamp.toISOString();
    const typeEmoji = this.getTypeEmoji(entry.type);

    return `## ${typeEmoji} [${ts}] ${entry.agentName}

${entry.content}

---
`;
  }

  /**
   * Get emoji for entry type
   */
  private getTypeEmoji(type: ContextEntry['type']): string {
    switch (type) {
      case 'tool_call':
        return '🔧';
      case 'tool_result':
        return '📤';
      case 'status':
        return '📋';
      case 'completion':
        return '✅';
      case 'error':
        return '❌';
      case 'human_message':
        return '👤';
      case 'agent_message':
        return '🤖';
      case 'log':
      default:
        return '📝';
    }
  }
}

// Singleton instance
let contextFileService: ContextFileService | null = null;

export function getContextFileService(): ContextFileService {
  if (!contextFileService) {
    contextFileService = new ContextFileService();
  }
  return contextFileService;
}
