import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger, AGENT_NAMES } from '@agentworks/shared';
import { 
  getAllAgents, 
  getAgent, 
  getAgentsForLane, 
  updateAgent, 
  isAgentAllowedInLane, 
  validateAgentName 
} from '../lib/agent-registry.js';

const logger = createLogger('agent-orchestrator:agents');

const updateAgentSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  allowedLanes: z.array(z.number().int().min(0).max(10)).optional(),
  defaultProvider: z.enum(['openai', 'anthropic', 'google', 'nanobanana']).optional(),
  defaultModel: z.string().min(1).max(100).optional(),
  systemPrompt: z.string().min(10).max(5000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32000).optional(),
});

export async function agentRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  logger.info('agentRoutes function called - starting route setup');

  // Get all agents
  app.get('/', async (request, reply) => {
    try {
      const agents = await getAllAgents();
      
      return reply.send({
        agents,
        total: agents.length,
      });
    } catch (error) {
      logger.error('Failed to get all agents', { error });
      
      return reply.status(500).send({
        error: 'AGENTS_FETCH_FAILED',
        message: 'Failed to fetch agents',
      });
    }
  });

  // Get agents for specific lane
  app.get('/lane/:laneNumber', async (request, reply) => {
    try {
      const { laneNumber } = request.params as { laneNumber: string };
      const lane = parseInt(laneNumber, 10);
      
      if (isNaN(lane) || lane < 0 || lane > 10) {
        return reply.status(400).send({
          error: 'INVALID_LANE',
          message: 'Lane number must be between 0 and 10',
        });
      }
      
      const agents = await getAgentsForLane(lane);
      
      return reply.send({
        lane: lane,
        agents,
        total: agents.length,
      });
    } catch (error) {
      logger.error('Failed to get agents for lane', { error });
      
      return reply.status(500).send({
        error: 'LANE_AGENTS_FETCH_FAILED',
        message: 'Failed to fetch agents for lane',
      });
    }
  });

  // Get specific agent
  app.get('/:agentName', async (request, reply) => {
    try {
      const { agentName } = request.params as { agentName: string };
      
      if (!validateAgentName(agentName)) {
        return reply.status(400).send({
          error: 'INVALID_AGENT_NAME',
          message: 'Invalid agent name',
          validNames: AGENT_NAMES,
        });
      }
      
      const agent = await getAgent(agentName);
      
      if (!agent) {
        return reply.status(404).send({
          error: 'AGENT_NOT_FOUND',
          message: 'Agent not found',
        });
      }
      
      return reply.send(agent);
    } catch (error) {
      logger.error('Failed to get agent', { error });
      
      return reply.status(500).send({
        error: 'AGENT_FETCH_FAILED',
        message: 'Failed to fetch agent',
      });
    }
  });

  // Update agent configuration
  app.patch('/:agentName', async (request, reply) => {
    try {
      const { agentName } = request.params as { agentName: string };
      
      if (!validateAgentName(agentName)) {
        return reply.status(400).send({
          error: 'INVALID_AGENT_NAME',
          message: 'Invalid agent name',
          validNames: AGENT_NAMES,
        });
      }
      
      const updates = updateAgentSchema.parse(request.body);
      
      const updatedAgent = await updateAgent(agentName, updates);
      
      if (!updatedAgent) {
        return reply.status(404).send({
          error: 'AGENT_NOT_FOUND',
          message: 'Agent not found',
        });
      }
      
      logger.info('Agent updated', {
        agentName,
        updates,
      });
      
      return reply.send(updatedAgent);
    } catch (error) {
      logger.error('Failed to update agent', { error });
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid update data',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        error: 'AGENT_UPDATE_FAILED',
        message: 'Failed to update agent',
      });
    }
  });

  // Check if agent is allowed in lane
  app.get('/:agentName/lanes/:laneNumber/allowed', async (request, reply) => {
    try {
      const { agentName, laneNumber } = request.params as { 
        agentName: string; 
        laneNumber: string; 
      };
      
      if (!validateAgentName(agentName)) {
        return reply.status(400).send({
          error: 'INVALID_AGENT_NAME',
          message: 'Invalid agent name',
          validNames: AGENT_NAMES,
        });
      }
      
      const lane = parseInt(laneNumber, 10);
      
      if (isNaN(lane) || lane < 0 || lane > 10) {
        return reply.status(400).send({
          error: 'INVALID_LANE',
          message: 'Lane number must be between 0 and 10',
        });
      }
      
      const allowed = await isAgentAllowedInLane(agentName, lane);
      
      return reply.send({
        agentName,
        laneNumber: lane,
        allowed,
      });
    } catch (error) {
      logger.error('Failed to check agent lane permission', { error });
      
      return reply.status(500).send({
        error: 'PERMISSION_CHECK_FAILED',
        message: 'Failed to check agent lane permission',
      });
    }
  });

  // Get agent capabilities and metadata
  app.get('/:agentName/capabilities', async (request, reply) => {
    try {
      const { agentName } = request.params as { agentName: string };
      
      if (!validateAgentName(agentName)) {
        return reply.status(400).send({
          error: 'INVALID_AGENT_NAME',
          message: 'Invalid agent name',
          validNames: AGENT_NAMES,
        });
      }
      
      const agent = await getAgent(agentName);
      
      if (!agent) {
        return reply.status(404).send({
          error: 'AGENT_NOT_FOUND',
          message: 'Agent not found',
        });
      }
      
      // Build capabilities response
      const capabilities = {
        name: agent.name,
        displayName: agent.displayName,
        description: agent.description,
        allowedLanes: agent.allowedLanes,
        defaultProvider: agent.defaultProvider,
        defaultModel: agent.defaultModel,
        specializations: getAgentSpecializations(agent.name),
        estimatedExecutionTime: getEstimatedExecutionTime(agent.name),
        costCategory: getCostCategory(agent.defaultProvider, agent.defaultModel),
      };
      
      return reply.send(capabilities);
    } catch (error) {
      logger.error('Failed to get agent capabilities', { error });
      
      return reply.status(500).send({
        error: 'CAPABILITIES_FETCH_FAILED',
        message: 'Failed to fetch agent capabilities',
      });
    }
  });

  logger.info('agentRoutes function completed - all routes defined');
}

function getAgentSpecializations(agentName: string): string[] {
  const specializations: Record<string, string[]> = {
    ceo_copilot: ['Strategy', 'Vision', 'Leadership', 'Decision Making'],
    strategy: ['Business Planning', 'Market Analysis', 'Competitive Intelligence'],
    storyboard_ux: ['User Experience', 'Wireframing', 'User Journey Mapping'],
    prd: ['Product Requirements', 'Feature Specification', 'Documentation'],
    mvp_scope: ['MVP Planning', 'Feature Prioritization', 'Scope Definition'],
    research: ['Market Research', 'Competitive Analysis', 'Data Analysis'],
    architect: ['System Design', 'Technical Architecture', 'Scalability'],
    planner: ['Project Planning', 'Task Breakdown', 'Timeline Management'],
    dev_backend: ['Backend Development', 'API Design', 'Database Design'],
    dev_frontend: ['Frontend Development', 'UI Implementation', 'Responsive Design'],
    devops: ['Infrastructure', 'Deployment', 'CI/CD', 'Monitoring'],
    qa: ['Testing', 'Quality Assurance', 'Test Automation'],
    docs: ['Documentation', 'Technical Writing', 'Knowledge Management'],
    refactor: ['Code Refactoring', 'Performance Optimization', 'Code Quality'],
    troubleshooter: ['Debugging', 'Problem Solving', 'Root Cause Analysis'],
  };
  
  return specializations[agentName] || [];
}

function getEstimatedExecutionTime(agentName: string): string {
  // Estimated execution times based on agent complexity
  const times: Record<string, string> = {
    ceo_copilot: '2-5 minutes',
    strategy: '3-8 minutes',
    storyboard_ux: '5-12 minutes',
    prd: '8-15 minutes',
    mvp_scope: '3-8 minutes',
    research: '5-15 minutes',
    architect: '10-20 minutes',
    planner: '5-12 minutes',
    dev_backend: '15-45 minutes',
    dev_frontend: '15-45 minutes',
    devops: '10-30 minutes',
    qa: '8-20 minutes',
    docs: '10-25 minutes',
    refactor: '20-60 minutes',
    troubleshooter: '5-30 minutes',
  };
  
  return times[agentName] || '5-15 minutes';
}

function getCostCategory(provider: string, model: string): string {
  // Simplified cost categorization
  if (model.includes('claude-3-5-sonnet') || model.includes('gpt-4')) {
    return 'premium';
  } else if (model.includes('claude-3-haiku') || model.includes('gpt-3.5')) {
    return 'standard';
  } else {
    return 'economy';
  }
}