import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { lucia } from '../lib/auth.js';
import {
  createGateway,
  type Message,
  type LLMProviderName,
  type UsageRecord,
  SSEWriter,
  createSSEResponse,
  getSSEHeaders,
} from '@agentworks/ai-gateway';

const gateway = createGateway({
  config: {
    billingMarkup: 5.0,
    billingIncrement: 0.25,
  },
  onUsage: async (record: UsageRecord) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Usage]', {
        provider: record.provider,
        model: record.model,
        cost: record.providerCost.toFixed(4),
        billed: record.billedAmount.toFixed(2),
      });
      return;
    }

    await prisma.usageRecord.create({
      data: {
        provider: record.provider,
        model: record.model,
        operation: record.operation,
        inputTokens: record.inputTokens ?? 0,
        outputTokens: record.outputTokens ?? 0,
        providerCost: record.providerCost,
        billedAmount: record.billedAmount,
        workspaceId: record.workspaceId ?? '',
        projectId: record.projectId,
        agentId: record.agentId,
        metadata: record.metadata ? JSON.stringify(record.metadata) : null,
      },
    });
  },
});

interface ChatRequest {
  messages: Message[];
  provider?: LLMProviderName;
  model?: string;
  workspaceId?: string;
  projectId?: string;
  agentId?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export const chatRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    (request as any).user = user;
  });

  app.post('/', async (request, reply) => {
    const body = request.body as ChatRequest;

    if (!body.messages || body.messages.length === 0) {
      return reply.status(400).send({ error: 'Messages are required' });
    }

    if (body.stream) {
      const sseWriter = new SSEWriter();
      const stream = sseWriter.createStream();

      reply.raw.writeHead(200, getSSEHeaders());

      (async () => {
        try {
          const tokenStream = gateway.streamChat(body.messages, {
            provider: body.provider,
            model: body.model,
            workspaceId: body.workspaceId,
            projectId: body.projectId,
            agentId: body.agentId,
            temperature: body.temperature,
            maxTokens: body.maxTokens,
          });

          for await (const token of tokenStream) {
            if ('usage' in token) {
              sseWriter.write({
                event: 'usage',
                data: JSON.stringify(token.usage),
              });
            } else {
              sseWriter.writeToken(token);
            }
          }
        } catch (error) {
          sseWriter.writeError(error instanceof Error ? error : 'Unknown error');
        } finally {
          sseWriter.close();
        }
      })();

      const reader = stream.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            reply.raw.end();
            break;
          }
          reply.raw.write(value);
        }
      };
      pump();

      return;
    }

    try {
      const response = await gateway.chat(body.messages, {
        provider: body.provider,
        model: body.model,
        workspaceId: body.workspaceId,
        projectId: body.projectId,
        agentId: body.agentId,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
      });

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  app.get('/providers', async () => {
    return gateway.getAvailableProviders();
  });

  app.get('/providers/:type/:provider/models', async (request, reply) => {
    const { type, provider } = request.params as { type: string; provider: string };

    if (!['llm', 'voice', 'image', 'video'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid provider type' });
    }

    try {
      const models = gateway.getProviderModels(
        type as 'llm' | 'voice' | 'image' | 'video',
        provider
      );
      return { models };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });
};
