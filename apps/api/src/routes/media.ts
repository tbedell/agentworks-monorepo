import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { lucia } from '../lib/auth.js';
import {
  createGateway,
  type ImageProviderName,
  type VideoProviderName,
  type VoiceProviderName,
  type UsageRecord,
} from '@agentworks/ai-gateway';

const gateway = createGateway({
  config: {
    billingMarkup: 5.0,
    billingIncrement: 0.25,
  },
  onUsage: async (record: UsageRecord) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Media Usage]', {
        provider: record.provider,
        model: record.model,
        operation: record.operation,
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

interface ImageRequest {
  prompt: string;
  provider?: ImageProviderName;
  model?: string;
  width?: number;
  height?: number;
  style?: string;
  negativePrompt?: string;
  seed?: number;
  workspaceId?: string;
  projectId?: string;
  agentId?: string;
}

interface VideoRequest {
  prompt: string;
  provider?: VideoProviderName;
  model?: string;
  imageUrl?: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  fps?: number;
  workspaceId?: string;
  projectId?: string;
  agentId?: string;
}

interface VoiceRequest {
  text: string;
  provider?: VoiceProviderName;
  voiceId?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
  workspaceId?: string;
  projectId?: string;
  agentId?: string;
}

export const mediaRoutes: FastifyPluginAsync = async (app) => {
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

  app.post('/image/generate', async (request, reply) => {
    const body = request.body as ImageRequest;

    if (!body.prompt) {
      return reply.status(400).send({ error: 'Prompt is required' });
    }

    try {
      const result = await gateway.generateImage(body.prompt, {
        provider: body.provider,
        model: body.model,
        width: body.width,
        height: body.height,
        style: body.style,
        negativePrompt: body.negativePrompt,
        seed: body.seed,
        workspaceId: body.workspaceId,
        projectId: body.projectId,
        agentId: body.agentId,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  app.post('/video/generate', async (request, reply) => {
    const body = request.body as VideoRequest;

    if (!body.prompt) {
      return reply.status(400).send({ error: 'Prompt is required' });
    }

    try {
      let result;

      if (body.imageUrl) {
        result = await gateway.imageToVideo(body.imageUrl, body.prompt, {
          provider: body.provider,
          model: body.model,
          duration: body.duration,
          aspectRatio: body.aspectRatio,
          fps: body.fps,
          workspaceId: body.workspaceId,
          projectId: body.projectId,
          agentId: body.agentId,
        });
      } else {
        result = await gateway.generateVideo(body.prompt, {
          provider: body.provider,
          model: body.model,
          duration: body.duration,
          aspectRatio: body.aspectRatio,
          fps: body.fps,
          workspaceId: body.workspaceId,
          projectId: body.projectId,
          agentId: body.agentId,
        });
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  app.get('/video/status/:provider/:jobId', async (request, reply) => {
    const { provider, jobId } = request.params as { provider: VideoProviderName; jobId: string };
    const { model } = request.query as { model?: string };

    try {
      const result = await gateway.getVideoStatus(jobId, provider, model);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  app.post('/voice/tts', async (request, reply) => {
    const body = request.body as VoiceRequest;

    if (!body.text) {
      return reply.status(400).send({ error: 'Text is required' });
    }

    try {
      const result = await gateway.textToSpeech(body.text, {
        provider: body.provider,
        voiceId: body.voiceId,
        model: body.model,
        stability: body.stability,
        similarityBoost: body.similarityBoost,
        workspaceId: body.workspaceId,
        projectId: body.projectId,
        agentId: body.agentId,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  app.get('/providers/image', async () => {
    return gateway.getAvailableProviders().image;
  });

  app.get('/providers/video', async () => {
    return gateway.getAvailableProviders().video;
  });

  app.get('/providers/voice', async () => {
    return gateway.getAvailableProviders().voice;
  });
};
