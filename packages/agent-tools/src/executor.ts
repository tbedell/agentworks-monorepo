import { createLogger } from '@agentworks/shared';
import type { ToolCall, ToolCallResult, ToolExecutionContext, ToolResult } from './types.js';
import { toolRegistry } from './registry.js';

const logger = createLogger('agent-tools:executor');

export interface ToolExecutorOptions {
  maxConcurrent?: number;
  timeoutMs?: number;
  onToolStart?: (toolCall: ToolCall, context: ToolExecutionContext) => void;
  onToolComplete?: (toolCall: ToolCall, result: ToolResult) => void;
  onApprovalRequired?: (toolCall: ToolCall) => Promise<boolean>;
}

export class ToolExecutor {
  private options: ToolExecutorOptions;

  constructor(options: ToolExecutorOptions = {}) {
    this.options = {
      maxConcurrent: 5,
      timeoutMs: 30000,
      ...options,
    };
  }

  async executeToolCall(
    toolCall: ToolCall,
    context: ToolExecutionContext
  ): Promise<ToolCallResult> {
    const tool = toolRegistry.get(toolCall.name);

    if (!tool) {
      logger.error('Tool not found', { name: toolCall.name });
      return {
        toolCallId: toolCall.id,
        result: {
          success: false,
          error: `Tool not found: ${toolCall.name}`,
        },
      };
    }

    if (tool.requiresApproval) {
      const approved = context.onApprovalRequired
        ? await context.onApprovalRequired(tool, toolCall.arguments)
        : this.options.onApprovalRequired
          ? await this.options.onApprovalRequired(toolCall)
          : false;

      if (!approved) {
        logger.info('Tool execution rejected - approval required', {
          name: toolCall.name,
        });
        return {
          toolCallId: toolCall.id,
          result: {
            success: false,
            error: `Tool ${toolCall.name} requires approval and was not approved`,
          },
        };
      }
    }

    this.options.onToolStart?.(toolCall, context);

    try {
      const result = await this.executeWithTimeout(
        toolRegistry.executeTool(toolCall.name, toolCall.arguments, context),
        this.options.timeoutMs || 30000
      );

      this.options.onToolComplete?.(toolCall, result);

      return {
        toolCallId: toolCall.id,
        result,
      };
    } catch (error) {
      const result: ToolResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.options.onToolComplete?.(toolCall, result);

      return {
        toolCallId: toolCall.id,
        result,
      };
    }
  }

  async executeToolCalls(
    toolCalls: ToolCall[],
    context: ToolExecutionContext
  ): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];
    const maxConcurrent = this.options.maxConcurrent || 5;

    for (let i = 0; i < toolCalls.length; i += maxConcurrent) {
      const batch = toolCalls.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map((tc) => this.executeToolCall(tc, context))
      );
      results.push(...batchResults);
    }

    return results;
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}

export function formatToolResultForLLM(result: ToolCallResult): string {
  if (result.result.success) {
    return JSON.stringify(result.result.data, null, 2);
  } else {
    return `Error: ${result.result.error}`;
  }
}

export function formatToolResultsForLLM(results: ToolCallResult[]): Array<{
  role: 'tool';
  toolCallId: string;
  content: string;
}> {
  return results.map((result) => ({
    role: 'tool' as const,
    toolCallId: result.toolCallId,
    content: formatToolResultForLLM(result),
  }));
}

export const toolExecutor = new ToolExecutor();
