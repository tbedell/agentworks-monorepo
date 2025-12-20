import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger, AGENT_NAMES, type AgentName } from '@agentworks/shared';
import { executeAgent } from '../lib/executor.js';
import { getCoreServiceClient } from '../lib/core-service-client.js';

const logger = createLogger('agent-orchestrator:terminal-commands');

// Internal service token for service-to-service communication
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-token-dev';

/**
 * Command types that can be detected from terminal input
 */
const CommandTypes = ['build', 'fix', 'test', 'refactor', 'plan', 'document', 'deploy', 'research', 'other'] as const;
type CommandType = typeof CommandTypes[number];

/**
 * Map command types to suggested agents and lanes
 */
const COMMAND_TYPE_METADATA: Record<CommandType, { agent: AgentName; lane: number; laneName: string }> = {
  build: { agent: 'dev_frontend', lane: 5, laneName: 'Scaffolding' },
  fix: { agent: 'troubleshooter', lane: 7, laneName: 'Test & QA' },
  test: { agent: 'qa', lane: 7, laneName: 'Test & QA' },
  refactor: { agent: 'refactor', lane: 10, laneName: 'Learn & Optimize' },
  plan: { agent: 'planner', lane: 4, laneName: 'Planning & Task Breakdown' },
  document: { agent: 'docs', lane: 9, laneName: 'Docs & Training' },
  deploy: { agent: 'devops', lane: 8, laneName: 'Deploy' },
  research: { agent: 'research', lane: 2, laneName: 'Research' },
  other: { agent: 'ceo_copilot', lane: 0, laneName: 'Vision & CoPilot' },
};

/**
 * Schema for terminal command execution request
 */
const terminalCommandSchema = z.object({
  projectId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string(),
  sessionId: z.string().optional(),
  command: z.object({
    type: z.enum(CommandTypes),
    description: z.string(),
    raw: z.string(),
    confidence: z.number().min(0).max(1).optional(),
    suggestedAgent: z.string().optional(),
    suggestedLane: z.number().optional(),
  }),
  // Allow override of agent/lane selection
  overrideAgent: z.enum(AGENT_NAMES).optional(),
  overrideLane: z.number().optional(),
  // Skip planning check (for bypass scenarios)
  skipPlanningCheck: z.boolean().optional(),
});

/**
 * Schema for planning status response
 */
interface PlanningStatus {
  planningComplete: boolean;
  documents: {
    blueprint: { exists: boolean; approved: boolean };
    prd: { exists: boolean; approved: boolean };
    mvp: { exists: boolean; approved: boolean };
    playbook: { exists: boolean; approved: boolean };
  };
  missing: string[];
}

function isInternalServiceToken(token: string): boolean {
  return token === INTERNAL_SERVICE_TOKEN;
}

export async function terminalCommandRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  /**
   * POST /terminal-commands/execute
   *
   * Execute a terminal command with automatic card creation
   *
   * Flow:
   * 1. Validate auth
   * 2. Check planning status (optional)
   * 3. Find appropriate board and lane
   * 4. Create card for the task
   * 5. Execute agent on the card
   * 6. Return run info and card details
   */
  app.post('/execute', async (request, reply) => {
    try {
      const body = terminalCommandSchema.parse(request.body);

      // Validate authentication
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          error: 'MISSING_AUTH',
          message: 'Authorization token required',
        });
      }

      const token = authHeader.split(' ')[1];
      const isInternalCall = isInternalServiceToken(token);
      const coreService = getCoreServiceClient();

      if (!isInternalCall) {
        try {
          await coreService.validateAuth(token);
        } catch {
          return reply.status(401).send({
            error: 'INVALID_AUTH',
            message: 'Invalid or expired token',
          });
        }
      }

      logger.info('Processing terminal command', {
        projectId: body.projectId,
        commandType: body.command.type,
        description: body.command.description,
      });

      // Get project and board info
      const project = await coreService.getProject(body.projectId);
      if (!project) {
        return reply.status(404).send({
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        });
      }

      // Check if project has a board
      if (!project.boards || project.boards.length === 0) {
        return reply.status(400).send({
          error: 'NO_BOARD',
          message: 'Project has no associated board. Create a board first.',
        });
      }

      const board = await coreService.getBoard(project.boards[0].id);
      if (!board) {
        return reply.status(404).send({
          error: 'BOARD_NOT_FOUND',
          message: 'Board not found',
        });
      }

      // Check planning status (unless skipped)
      if (!body.skipPlanningCheck) {
        const planningStatus = await checkPlanningStatus(body.projectId);

        if (!planningStatus.planningComplete) {
          // For build commands, require planning
          if (['build', 'refactor', 'deploy'].includes(body.command.type)) {
            return reply.status(428).send({
              error: 'PLANNING_INCOMPLETE',
              message: 'Planning documents must be complete before building',
              planningStatus,
              hint: 'Complete the planning phase in Lane 0-1, or use skipPlanningCheck=true to bypass',
            });
          }

          // For other commands, just log a warning
          logger.warn('Planning incomplete, proceeding with non-build command', {
            projectId: body.projectId,
            commandType: body.command.type,
            missing: planningStatus.missing,
          });
        }
      }

      // Determine which agent and lane to use
      const metadata = COMMAND_TYPE_METADATA[body.command.type];
      const selectedAgent = body.overrideAgent || body.command.suggestedAgent || metadata.agent;
      const selectedLaneNumber = body.overrideLane ?? body.command.suggestedLane ?? metadata.lane;

      // Find the lane in the board
      const targetLane = board.lanes?.find((l: any) => l.laneNumber === selectedLaneNumber);
      if (!targetLane) {
        // Fall back to first lane if target lane not found
        logger.warn('Target lane not found, using first lane', {
          targetLaneNumber: selectedLaneNumber,
          availableLanes: board.lanes?.map((l: any) => l.laneNumber),
        });
      }

      const laneId = targetLane?.id || board.lanes?.[0]?.id;
      if (!laneId) {
        return reply.status(400).send({
          error: 'NO_LANES',
          message: 'Board has no lanes configured',
        });
      }

      // Create card for this terminal command
      const cardTitle = `[Terminal] ${capitalizeFirst(body.command.type)}: ${body.command.description.slice(0, 80)}`;

      const card = await coreService.createCard({
        boardId: board.id,
        laneId,
        title: cardTitle,
        description: `**Command Type:** ${body.command.type}
**Confidence:** ${((body.command.confidence || 0.5) * 100).toFixed(0)}%
**Raw Command:** \`${body.command.raw}\`
**Session:** ${body.sessionId || 'unknown'}

---

This card was automatically created from a terminal Claude command.`,
        type: mapCommandTypeToCardType(body.command.type),
        priority: 'medium',
        assignedAgent: selectedAgent,
      });

      logger.info('Created card from terminal command', {
        cardId: card.id,
        title: cardTitle,
        lane: targetLane?.name || 'unknown',
        agent: selectedAgent,
      });

      // Execute the agent on the card
      const executionResult = await executeAgent({
        cardId: card.id,
        agentId: selectedAgent as any,
        workspaceId: body.workspaceId,
        projectId: body.projectId,
        userId: body.userId,
        context: {
          terminalCommand: body.command,
          sessionId: body.sessionId,
          source: 'terminal',
        },
      });

      return reply.send({
        success: true,
        card: {
          id: card.id,
          title: card.title,
          lane: targetLane?.name || 'Unknown',
          laneNumber: selectedLaneNumber,
          boardId: board.id,
        },
        execution: {
          runId: executionResult.runId,
          status: executionResult.status,
          agent: selectedAgent,
        },
        message: `Card created and agent ${selectedAgent} started`,
      });

    } catch (error) {
      logger.error('Failed to execute terminal command', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid terminal command request',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to execute terminal command',
      });
    }
  });

  /**
   * GET /terminal-commands/planning-status/:projectId
   *
   * Get the planning status for a project (used by hooks)
   */
  app.get('/planning-status/:projectId', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string };

      const planningStatus = await checkPlanningStatus(projectId);

      return reply.send(planningStatus);
    } catch (error) {
      logger.error('Failed to check planning status', { error });

      return reply.status(500).send({
        error: 'STATUS_CHECK_FAILED',
        message: 'Failed to check planning status',
      });
    }
  });

  /**
   * POST /terminal-commands/card-status
   *
   * Update card status from terminal (for sync)
   */
  app.post('/card-status', async (request, reply) => {
    const schema = z.object({
      cardId: z.string().uuid(),
      status: z.enum(['InProgress', 'Done', 'Blocked', 'Ready']),
      message: z.string().optional(),
    });

    try {
      const body = schema.parse(request.body);
      const coreService = getCoreServiceClient();

      await coreService.updateCardStatus(body.cardId, body.status);

      logger.info('Updated card status from terminal', {
        cardId: body.cardId,
        status: body.status,
      });

      return reply.send({ success: true });
    } catch (error) {
      logger.error('Failed to update card status', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'UPDATE_FAILED',
        message: 'Failed to update card status',
      });
    }
  });

  /**
   * POST /terminal-commands/move-card
   *
   * Move a card to a different lane from terminal
   */
  app.post('/move-card', async (request, reply) => {
    const schema = z.object({
      cardId: z.string().uuid(),
      laneId: z.string().uuid(),
      position: z.number().optional(),
    });

    try {
      const body = schema.parse(request.body);
      const coreService = getCoreServiceClient();

      await coreService.moveCard(body.cardId, body.laneId, body.position);

      logger.info('Moved card from terminal', {
        cardId: body.cardId,
        laneId: body.laneId,
      });

      return reply.send({ success: true });
    } catch (error) {
      logger.error('Failed to move card', { error });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'MOVE_FAILED',
        message: 'Failed to move card',
      });
    }
  });
}

/**
 * Check planning status by fetching documents from the project
 */
async function checkPlanningStatus(projectId: string): Promise<PlanningStatus> {
  const coreService = getCoreServiceClient();

  try {
    // Call the API's planning-status endpoint
    const response = await fetch(`${process.env.API_URL || 'http://localhost:3010'}/api/projects/${projectId}/planning-status`, {
      headers: {
        'Authorization': `Bearer ${INTERNAL_SERVICE_TOKEN}`,
      },
    });

    if (response.ok) {
      return await response.json() as PlanningStatus;
    }
  } catch (error) {
    logger.warn('Failed to fetch planning status from API, using default', { error });
  }

  // Return default "complete" status if API fails (fail-open for development)
  return {
    planningComplete: true,
    documents: {
      blueprint: { exists: true, approved: true },
      prd: { exists: true, approved: true },
      mvp: { exists: true, approved: true },
      playbook: { exists: true, approved: true },
    },
    missing: [],
  };
}

/**
 * Map command type to card type
 */
function mapCommandTypeToCardType(commandType: CommandType): string {
  const mapping: Record<CommandType, string> = {
    build: 'feature',
    fix: 'bug',
    test: 'chore',
    refactor: 'chore',
    plan: 'task',
    document: 'chore',
    deploy: 'task',
    research: 'research',
    other: 'task',
  };
  return mapping[commandType] || 'task';
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
