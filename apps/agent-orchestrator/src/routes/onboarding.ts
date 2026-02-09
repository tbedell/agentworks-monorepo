/**
 * @module agent-orchestrator/routes/onboarding
 * @description Fastify routes for the agent onboarding API.
 *
 * Endpoints:
 *   POST /               — Onboard a new agent
 *   POST /validate       — Validate a config without creating
 *   GET  /templates      — List all agent templates
 *   GET  /templates/:category — Get a specific template
 *   POST /:agentName/sops — Add an SOP to an existing agent
 *   GET  /:agentName/status — Get onboarding status
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger } from '@agentworks/shared';
import {
  agentOnboardingService,
  getTemplateCategories,
  getTemplate,
  getAllTemplates,
  type AgentOnboardingConfig,
  type AgentRoleCategory,
  type SOPTemplate,
} from '@agentworks/agent-onboarding';

const logger = createLogger('agent-orchestrator:onboarding');

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const sopStepSchema = z.object({
  order: z.number().int().min(1),
  action: z.string().min(1),
  description: z.string().min(1),
  toolRequired: z.string().optional(),
  acceptanceCriteria: z.string().min(1),
});

const sopTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  steps: z.array(sopStepSchema).min(1),
  expectedDuration: z.string().min(1),
  requiredTools: z.array(z.string()),
});

const skillDefinitionSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().min(1),
  location: z.string().optional(),
  requiredTools: z.array(z.string()),
});

const toolParameterSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  description: z.string().min(1),
  required: z.boolean(),
  enum: z.array(z.string()).optional(),
  items: z.object({ type: z.string() }).optional(),
  default: z.unknown().optional(),
});

const customToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  parameters: z.array(toolParameterSchema),
  endpoint: z.string().optional(),
});

const mcpServerSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  transport: z.enum(['stdio', 'sse', 'streamable-http']),
  authType: z.enum(['none', 'bearer', 'api-key']).optional(),
  tools: z.array(z.string()),
});

const guardrailSchema = z.object({
  canExecuteCode: z.boolean(),
  canModifyFiles: z.boolean(),
  canAccessNetwork: z.boolean(),
  canManageGit: z.boolean(),
  requiresApproval: z.boolean(),
  maxBudgetPerRun: z.number().min(0).max(100),
  soulMd: z.string(),
});

const chainOfCommandSchema = z.object({
  agentName: z.string().min(1),
  relationship: z.enum(['reports_to', 'supervises', 'peers_with']),
});

const channelConfigSchema = z.object({
  type: z.enum(['slack', 'discord', 'telegram', 'teams', 'webhook']),
  channelId: z.string().optional(),
  permissions: z.array(z.enum(['read', 'write', 'react'])).min(1),
});

const executionModeSchema = z.object({
  autoRun: z.boolean(),
  riskLevel: z.enum(['low', 'medium', 'high']),
});

const agentRoleSchema = z.object({
  title: z.string().min(1).max(100),
  category: z.enum([
    'coordinator', 'engineering', 'operations', 'research',
    'marketing', 'design', 'analysis', 'multimedia',
  ]),
  seniority: z.enum(['junior', 'mid', 'senior', 'lead']),
});

const agentOnboardingConfigSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/, 'Must be snake_case'),
  displayName: z.string().min(2).max(128),
  emoji: z.string().min(1).max(10),
  description: z.string().min(1).max(500),
  role: agentRoleSchema,
  responsibilities: z.array(z.string().min(1)).min(1),
  specializations: z.array(z.string()),
  skills: z.array(skillDefinitionSchema),
  toolCategories: z.array(z.enum([
    'file', 'git', 'code', 'search', 'kanban', 'docs', 'builder', 'summary', 'wordpress',
  ])),
  customTools: z.array(customToolSchema).optional(),
  mcpServers: z.array(mcpServerSchema).optional(),
  provider: z.enum(['openai', 'anthropic', 'google', 'nanobanana']),
  model: z.string().min(1).max(100),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(0),
  systemPrompt: z.string().min(1).max(50000),
  guardrails: guardrailSchema,
  chainOfCommand: z.array(chainOfCommandSchema),
  allowedLanes: z.array(z.number().int().min(0).max(10)),
  executionMode: executionModeSchema,
  communicationChannels: z.array(channelConfigSchema),
  sopTemplates: z.array(sopTemplateSchema).optional(),
});

// ─── Route Plugin ───────────────────────────────────────────────────────────

export async function onboardingRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  logger.info('Registering onboarding routes');

  // ── POST / — Onboard new agent ──────────────────────────────────────────

  app.post('/', async (request, reply) => {
    try {
      const parsed = agentOnboardingConfigSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid onboarding configuration',
          details: parsed.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const config = parsed.data as AgentOnboardingConfig;
      const result = await agentOnboardingService.onboardAgent(config);

      if (!result.success) {
        return reply.status(422).send({
          error: 'ONBOARDING_FAILED',
          message: 'Agent onboarding failed validation',
          result,
        });
      }

      logger.info('Agent onboarded via API', { agentName: config.name });

      return reply.status(201).send({
        message: `Agent "${config.name}" onboarded successfully`,
        result,
      });
    } catch (error) {
      logger.error('Onboarding endpoint error', { error });
      return reply.status(500).send({
        error: 'ONBOARDING_ERROR',
        message: 'Internal error during onboarding',
      });
    }
  });

  // ── POST /validate — Validate config without creating ───────────────────

  app.post('/validate', async (request, reply) => {
    try {
      const parsed = agentOnboardingConfigSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid onboarding configuration (schema)',
          details: parsed.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const config = parsed.data as AgentOnboardingConfig;
      const validation = await agentOnboardingService.validateConfig(config);

      return reply.send({
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      });
    } catch (error) {
      logger.error('Validation endpoint error', { error });
      return reply.status(500).send({
        error: 'VALIDATION_ERROR',
        message: 'Internal error during validation',
      });
    }
  });

  // ── GET /templates — List all templates ─────────────────────────────────

  app.get('/templates', async (_request, reply) => {
    try {
      const templates = getAllTemplates();
      return reply.send({
        templates: templates.map(({ category, template }) => ({
          category,
          name: template.displayName,
          emoji: template.emoji,
          description: template.description,
          role: template.role,
          toolCategories: template.toolCategories,
          specializations: template.specializations,
        })),
        total: templates.length,
      });
    } catch (error) {
      logger.error('Templates listing error', { error });
      return reply.status(500).send({
        error: 'TEMPLATES_ERROR',
        message: 'Failed to list templates',
      });
    }
  });

  // ── GET /templates/:category — Get specific template ────────────────────

  app.get('/templates/:category', async (request, reply) => {
    try {
      const { category } = request.params as { category: string };
      const validCategories = getTemplateCategories();

      if (!validCategories.includes(category as AgentRoleCategory)) {
        return reply.status(400).send({
          error: 'INVALID_CATEGORY',
          message: `Invalid template category: "${category}"`,
          validCategories,
        });
      }

      const template = getTemplate(category as AgentRoleCategory);
      if (!template) {
        return reply.status(404).send({
          error: 'TEMPLATE_NOT_FOUND',
          message: `Template not found for category: "${category}"`,
        });
      }

      return reply.send({
        category,
        template,
      });
    } catch (error) {
      logger.error('Template fetch error', { error });
      return reply.status(500).send({
        error: 'TEMPLATE_ERROR',
        message: 'Failed to fetch template',
      });
    }
  });

  // ── POST /:agentName/sops — Add SOP to existing agent ──────────────────

  app.post('/:agentName/sops', async (request, reply) => {
    try {
      const { agentName } = request.params as { agentName: string };
      const parsed = sopTemplateSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid SOP definition',
          details: parsed.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const sop = parsed.data as SOPTemplate;
      const config = agentOnboardingService.getAgentConfig(agentName);

      if (!config) {
        return reply.status(404).send({
          error: 'AGENT_NOT_FOUND',
          message: `Agent "${agentName}" not found`,
        });
      }

      // Check for duplicate SOP name
      const existingNames = (config.sopTemplates ?? []).map(s => s.name);
      if (existingNames.includes(sop.name)) {
        return reply.status(409).send({
          error: 'DUPLICATE_SOP',
          message: `SOP "${sop.name}" already exists for agent "${agentName}"`,
        });
      }

      // Add the SOP
      if (!config.sopTemplates) {
        config.sopTemplates = [];
      }
      config.sopTemplates.push(sop);

      // Regenerate files to include new SOP
      await agentOnboardingService.updateAgentMemory(agentName, 'identity', '');

      logger.info('SOP added to agent', { agentName, sopName: sop.name });

      return reply.status(201).send({
        message: `SOP "${sop.name}" added to agent "${agentName}"`,
        sop,
      });
    } catch (error) {
      logger.error('SOP add error', { error });
      return reply.status(500).send({
        error: 'SOP_ERROR',
        message: 'Failed to add SOP',
      });
    }
  });

  // ── GET /:agentName/status — Get onboarding status ─────────────────────

  app.get('/:agentName/status', async (request, reply) => {
    try {
      const { agentName } = request.params as { agentName: string };
      const status = await agentOnboardingService.getOnboardingStatus(agentName);

      return reply.send(status);
    } catch (error) {
      logger.error('Status fetch error', { error });
      return reply.status(500).send({
        error: 'STATUS_ERROR',
        message: 'Failed to fetch onboarding status',
      });
    }
  });

  logger.info('Onboarding routes registered');
}
