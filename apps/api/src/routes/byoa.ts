import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '@agentworks/db';
import { createLogger } from '@agentworks/shared';
import { lucia } from '../lib/auth.js';
import {
  SUPPORTED_BYOA_PROVIDERS,
  testProviderConnection,
} from '../services/claude-oauth.js';
import {
  listCredentials,
  updateCredentialAgents,
  setDefaultCredential,
  revokeCredential,
  storeCredential,
  getCredential,
  getCredentialForAgent,
} from '../services/credential-vault.js';

const logger = createLogger('api:byoa-routes');

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'internal-key';

const updateAgentsSchema = z.object({
  provider: z.string(),
  assignedAgents: z.array(z.string()),
});

const setDefaultSchema = z.object({
  provider: z.string(),
});

const connectApiKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google']),
  apiKey: z.string().min(10),
  assignedAgents: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

const revokeSchema = z.object({
  provider: z.string(),
});

export const byoaRoutes: FastifyPluginAsync = async (app) => {
  // Auth hook for public endpoints (skip for /internal/* and /providers)
  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for internal endpoints and public provider list
    if (request.url.startsWith('/internal/') || request.url === '/providers') {
      return;
    }

    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      // Allow unauthenticated access to some read-only endpoints
      if (request.method === 'GET' && (request.url === '/credentials' || request.url === '/status')) {
        return;
      }
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    // Get user's tenantId
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tenantId: true },
    });

    (request as any).user = user;
    (request as any).tenantId = dbUser?.tenantId;
  });

  // Internal endpoints for service-to-service communication
  app.get('/internal/credential/:tenantId', async (request, reply) => {
    const internalKey = request.headers['x-internal-key'];
    if (internalKey !== INTERNAL_API_KEY) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { tenantId } = request.params as { tenantId: string };

    const credentials = await listCredentials(tenantId);
    const defaultCred = credentials.find(c => c.isDefault && c.status === 'active');

    if (!defaultCred) {
      return { credential: null };
    }

    const credData = await getCredential(tenantId, defaultCred.provider);
    if (!credData) {
      return { credential: null };
    }

    return {
      credential: {
        provider: defaultCred.provider,
        accessToken: credData.accessToken,
        subscriptionTier: credData.subscriptionTier,
      },
    };
  });

  app.get('/internal/credential/:tenantId/:agentName', async (request, reply) => {
    const internalKey = request.headers['x-internal-key'];
    if (internalKey !== INTERNAL_API_KEY) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { tenantId, agentName } = request.params as { tenantId: string; agentName: string };

    const result = await getCredentialForAgent(tenantId, agentName);
    if (!result) {
      return { credential: null };
    }

    return {
      credential: {
        provider: result.provider,
        accessToken: result.credential.accessToken,
        subscriptionTier: result.credential.subscriptionTier,
      },
    };
  });

  // Public endpoints
  app.get('/providers', async () => {
    return {
      providers: SUPPORTED_BYOA_PROVIDERS,
    };
  });

  app.get('/credentials', async (request) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) {
      return { credentials: [] };
    }

    const credentials = await listCredentials(tenantId);
    return { credentials };
  });

  // Connect API key provider (OpenAI, Anthropic, Google)
  app.post('/connect/api-key', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = connectApiKeySchema.parse(request.body);

    const credential = await storeCredential(
      tenantId,
      body.provider,
      'api_key',
      {
        accessToken: body.apiKey,
        metadata: {
          connectedAt: new Date().toISOString(),
        },
      },
      {
        isDefault: body.isDefault,
        assignedAgents: body.assignedAgents || ['ceo_copilot'],
      }
    );

    logger.info('API key credential stored', { tenantId, provider: body.provider });

    return {
      success: true,
      credential: {
        id: credential.id,
        provider: credential.provider,
        credentialType: credential.credentialType,
        isDefault: credential.isDefault,
        assignedAgents: credential.assignedAgents,
        status: credential.status,
      },
    };
  });

  // Update agent assignments for a credential
  app.post('/update-agents', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = updateAgentsSchema.parse(request.body);
    const credential = await updateCredentialAgents(tenantId, body.provider, body.assignedAgents);

    if (!credential) {
      return reply.status(404).send({ error: 'Credential not found' });
    }

    logger.info('Credential agents updated', { tenantId, provider: body.provider, agents: body.assignedAgents });

    return { success: true, credential };
  });

  // Set default credential
  app.post('/set-default', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = setDefaultSchema.parse(request.body);
    await setDefaultCredential(tenantId, body.provider);

    logger.info('Default credential set', { tenantId, provider: body.provider });

    return { success: true };
  });

  // Revoke credential
  app.post('/revoke', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = revokeSchema.parse(request.body);
    await revokeCredential(tenantId, body.provider);

    logger.info('Credential revoked', { tenantId, provider: body.provider });

    return { success: true };
  });

  // Test provider connection
  app.post('/test/:provider', async (request, reply) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { provider } = request.params as { provider: string };

    const result = await testProviderConnection(tenantId, provider);
    return result;
  });

  // Get BYOA status
  app.get('/status', async (request) => {
    const tenantId = (request as any).tenantId;
    if (!tenantId) {
      return {
        byoaEnabled: false,
        credentials: [],
        defaultProvider: null,
      };
    }

    const credentials = await listCredentials(tenantId);
    const defaultCredential = credentials.find((c) => c.isDefault);

    return {
      byoaEnabled: credentials.length > 0,
      credentials: credentials.map((c) => ({
        provider: c.provider,
        credentialType: c.credentialType,
        subscriptionTier: c.subscriptionTier,
        isDefault: c.isDefault,
        assignedAgents: c.assignedAgents,
        status: c.status,
        lastUsedAt: c.lastUsedAt,
      })),
      defaultProvider: defaultCredential?.provider || null,
    };
  });
};
