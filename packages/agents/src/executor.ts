import type { AgentName, Provider } from '@agentworks/shared';
import { createGateway, type AIGateway, type LLMProviderName, type Message, type UsageRecord } from '@agentworks/ai-gateway';
import { agentRegistry } from './registry.js';

export interface ExecutionContext {
  cardId: string;
  projectId: string;
  workspaceId: string;
  blueprintContent?: string;
  prdContent?: string;
  mvpContent?: string;
  planContent?: string;
  cardTitle?: string;
  cardDescription?: string;
  laneNumber: number;
  userMessage?: string;
}

export interface ExecutionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  price: number;
  model: string;
  provider: Provider;
}

let gateway: AIGateway | null = null;

function getGateway(): AIGateway {
  if (!gateway) {
    gateway = createGateway();
  }
  return gateway;
}

export class AgentExecutor {
  async execute(
    agentName: AgentName,
    context: ExecutionContext,
    options?: { provider?: Provider; model?: string }
  ): Promise<ExecutionResult> {
    const agent = agentRegistry.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    if (!agent.allowedLanes.includes(context.laneNumber)) {
      throw new Error(`Agent ${agent.displayName} cannot run in lane ${context.laneNumber}`);
    }

    const provider = options?.provider || agent.defaultProvider;
    const model = options?.model || agent.defaultModel;

    const messages = this.buildMessages(agent.systemPrompt, context);
    const aiGateway = getGateway();

    const result = await aiGateway.chat(messages, {
      provider: provider as LLMProviderName,
      model,
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      maxTokens: 4096,
      temperature: 0.7,
    });

    return {
      content: result.content,
      inputTokens: result.usage.inputTokens || 0,
      outputTokens: result.usage.outputTokens || 0,
      cost: result.usage.providerCost,
      price: result.usage.billedAmount,
      model: result.model,
      provider,
    };
  }

  async *stream(
    agentName: AgentName,
    context: ExecutionContext,
    options?: { provider?: Provider; model?: string }
  ): AsyncGenerator<{ content?: string; done?: boolean; usage?: UsageRecord }> {
    const agent = agentRegistry.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`);
    }

    if (!agent.allowedLanes.includes(context.laneNumber)) {
      throw new Error(`Agent ${agent.displayName} cannot run in lane ${context.laneNumber}`);
    }

    const provider = options?.provider || agent.defaultProvider;
    const model = options?.model || agent.defaultModel;

    const messages = this.buildMessages(agent.systemPrompt, context);
    const aiGateway = getGateway();

    const stream = aiGateway.streamChat(messages, {
      provider: provider as LLMProviderName,
      model,
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      maxTokens: 4096,
      temperature: 0.7,
    });

    for await (const token of stream) {
      if ('usage' in token && token.usage && 'billedAmount' in token.usage) {
        yield { done: true, usage: token.usage as UsageRecord };
      } else if ('content' in token && token.content) {
        yield { content: token.content };
      } else if ('type' in token && token.type === 'done') {
        yield { done: true };
      }
    }
  }

  private buildMessages(systemPrompt: string, context: ExecutionContext): Message[] {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
    ];

    let contextMessage = 'Project Context:\n\n';

    if (context.blueprintContent) {
      contextMessage += `## Blueprint\n${context.blueprintContent}\n\n`;
    }
    if (context.prdContent) {
      contextMessage += `## PRD\n${context.prdContent}\n\n`;
    }
    if (context.mvpContent) {
      contextMessage += `## MVP\n${context.mvpContent}\n\n`;
    }
    if (context.planContent) {
      contextMessage += `## Plan\n${context.planContent}\n\n`;
    }

    if (context.cardTitle) {
      contextMessage += `## Current Card\nTitle: ${context.cardTitle}\n`;
      if (context.cardDescription) {
        contextMessage += `Description: ${context.cardDescription}\n`;
      }
      contextMessage += `Lane: ${context.laneNumber}\n\n`;
    }

    if (contextMessage.length > 20) {
      messages.push({ role: 'user', content: contextMessage });
    }

    if (context.userMessage) {
      messages.push({ role: 'user', content: context.userMessage });
    }

    return messages;
  }
}

export const executor = new AgentExecutor();
