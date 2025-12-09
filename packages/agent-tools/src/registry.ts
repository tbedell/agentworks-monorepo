import { createLogger } from '@agentworks/shared';
import type { AgentName } from '@agentworks/shared';
import type { AgentTool, ToolDefinition, ToolContext, ToolResult, ToolRegistration } from './types.js';

const logger = createLogger('agent-tools:registry');

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  register(registration: ToolRegistration): void {
    const tool: AgentTool = {
      name: registration.name,
      description: registration.description,
      parameters: registration.parameters,
      execute: registration.handler,
      requiresApproval: registration.requiresApproval,
      allowedAgents: registration.allowedAgents,
      category: registration.category,
    };

    this.tools.set(tool.name, tool);
    logger.info('Tool registered', { name: tool.name, category: tool.category });
  }

  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    logger.info('Tool registered', { name: tool.name, category: tool.category });
  }

  unregister(name: string): boolean {
    const removed = this.tools.delete(name);
    if (removed) {
      logger.info('Tool unregistered', { name });
    }
    return removed;
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getForAgent(agentName: AgentName): AgentTool[] {
    const allowedTools: AgentTool[] = [];

    for (const tool of this.tools.values()) {
      if (!tool.allowedAgents || tool.allowedAgents.includes(agentName)) {
        allowedTools.push(tool);
      }
    }

    return allowedTools;
  }

  getToolDefinitions(agentName: AgentName): ToolDefinition[] {
    const tools = this.getForAgent(agentName);

    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.reduce(
          (acc, param) => {
            acc[param.name] = {
              type: param.type,
              description: param.description,
              ...(param.enum && { enum: param.enum }),
              ...(param.items && { items: param.items }),
              ...(param.default !== undefined && { default: param.default }),
            };
            return acc;
          },
          {} as Record<string, { type: string; description: string; enum?: string[]; items?: { type: string }; default?: unknown }>
        ),
        required: tool.parameters.filter((p) => p.required).map((p) => p.name),
      },
    }));
  }

  getByCategory(category: AgentTool['category']): AgentTool[] {
    return Array.from(this.tools.values()).filter((tool) => tool.category === category);
  }

  getAllTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.get(name);

    if (!tool) {
      logger.error('Tool not found', { name });
      return {
        success: false,
        error: `Tool not found: ${name}`,
      };
    }

    if (tool.allowedAgents && !tool.allowedAgents.includes(context.agentName)) {
      logger.warn('Agent not authorized for tool', {
        tool: name,
        agent: context.agentName,
      });
      return {
        success: false,
        error: `Agent ${context.agentName} is not authorized to use tool ${name}`,
      };
    }

    try {
      logger.info('Executing tool', { name, agent: context.agentName, args });
      const result = await tool.execute(args, context);
      logger.info('Tool execution completed', { name, success: result.success });
      return result;
    } catch (error) {
      logger.error('Tool execution failed', {
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during tool execution',
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
