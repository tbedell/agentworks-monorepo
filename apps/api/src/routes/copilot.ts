import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { createGateway, type LLMProviderName } from '@agentworks/ai-gateway';
import { AGENT_EXECUTION_MODE } from '@agentworks/shared';
import { lucia } from '../lib/auth.js';
import { getOrchestratorClient } from '../lib/orchestrator-client.js';
import { promises as fs } from 'fs';
import path from 'path';
import {
  findOrCreateDocumentCard,
  transitionCard,
  logCardEvent,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_NAMES,
  type DocumentType,
} from '../lib/card-state-machine.js';
import {
  detectTechStackFromMessage,
  detectProjectTechStack,
  messageContainsWordPress,
} from '../lib/tech-stack-detector.js';

// Default agent configurations for fallback when project config is not set
const DEFAULT_AGENT_CONFIGS: Record<string, { provider: LLMProviderName; model: string }> = {
  ceo_copilot: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  strategy: { provider: 'openai', model: 'gpt-4o' },
  storyboard_ux: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  prd: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  mvp_scope: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  research: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  architect: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  planner: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  devops: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  dev_backend: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  dev_frontend: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  qa: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  troubleshooter: { provider: 'google', model: 'gemini-2.0-flash' },
  docs: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  refactor: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  // CMS Agents
  cms_wordpress: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
};

/**
 * Get agent configuration for a specific project.
 * Priority: Project-specific AgentConfig > Default agent configs
 */
async function getAgentProviderConfig(
  projectId: string | undefined,
  agentName: string
): Promise<{ provider: LLMProviderName; model: string }> {
  // Default fallback
  const defaultConfig = DEFAULT_AGENT_CONFIGS[agentName] || {
    provider: 'anthropic' as LLMProviderName,
    model: 'claude-sonnet-4-20250514',
  };

  if (!projectId) {
    return defaultConfig;
  }

  try {
    // First look up the agent by name to get its ID
    const agent = await prisma.agent.findUnique({
      where: { name: agentName },
    });

    if (!agent) {
      return defaultConfig;
    }

    // Check for project-specific override using agentId
    const agentConfig = await prisma.agentConfig.findUnique({
      where: {
        projectId_agentId: {
          projectId,
          agentId: agent.id,
        },
      },
    });

    if (agentConfig?.provider && agentConfig?.model) {
      return {
        provider: agentConfig.provider as LLMProviderName,
        model: agentConfig.model,
      };
    }

    return defaultConfig;
  } catch (error) {
    console.warn(`Failed to fetch agent config for ${agentName}:`, error);
    return defaultConfig;
  }
}

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  context: z.string(),
  projectId: z.string().optional(),
  cardId: z.string().optional(),
  phase: z.enum(['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture', 'blueprint-review', 'prd-review', 'mvp-review', 'playbook-review', 'planning-complete', 'general']).optional(),
  metadata: z.record(z.any()).optional(),
});

// Agent routing configuration - maps agents to their default lanes
const AGENT_ROUTING: Record<string, { lanes: number[]; priority: string; defaultLane: number }> = {
  'ceo-copilot': { lanes: [0, 1], priority: 'Critical', defaultLane: 0 },
  'frontend-agent': { lanes: [5, 6], priority: 'High', defaultLane: 5 },
  'backend-agent': { lanes: [5, 6], priority: 'High', defaultLane: 5 },
  'database-agent': { lanes: [3, 5], priority: 'High', defaultLane: 3 },
  'qa-agent': { lanes: [7], priority: 'Medium', defaultLane: 7 },
  'devops-agent': { lanes: [8], priority: 'Medium', defaultLane: 8 },
  'architect-agent': { lanes: [3, 4], priority: 'High', defaultLane: 3 },
  'research-agent': { lanes: [2], priority: 'Medium', defaultLane: 2 },
  'docs-agent': { lanes: [9], priority: 'Low', defaultLane: 9 },
  // CMS Agents - WordPress has access to all lanes for full project lifecycle
  'wordpress-agent': { lanes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], priority: 'High', defaultLane: 5 },
};

// Agent aliases for natural language matching
const AGENT_ALIASES: Record<string, string> = {
  'frontend': 'frontend-agent',
  'ui': 'frontend-agent',
  'ui agent': 'frontend-agent',
  'frontend agent': 'frontend-agent',
  'backend': 'backend-agent',
  'api': 'backend-agent',
  'backend agent': 'backend-agent',
  'database': 'database-agent',
  'db': 'database-agent',
  'db agent': 'database-agent',
  'database agent': 'database-agent',
  'qa': 'qa-agent',
  'test': 'qa-agent',
  'testing': 'qa-agent',
  'qa agent': 'qa-agent',
  'devops': 'devops-agent',
  'deploy': 'devops-agent',
  'devops agent': 'devops-agent',
  'architect': 'architect-agent',
  'architecture': 'architect-agent',
  'architect agent': 'architect-agent',
  'research': 'research-agent',
  'research agent': 'research-agent',
  'docs': 'docs-agent',
  'documentation': 'docs-agent',
  'docs agent': 'docs-agent',
  'copilot': 'ceo-copilot',
  'ceo': 'ceo-copilot',
  // WordPress CMS Agent aliases
  'wordpress': 'wordpress-agent',
  'wordpress agent': 'wordpress-agent',
  'wp': 'wordpress-agent',
  'wp agent': 'wordpress-agent',
  'cms': 'wordpress-agent',
  'cms agent': 'wordpress-agent',
  'woocommerce': 'wordpress-agent',
  'gutenberg': 'wordpress-agent',
  'theme': 'wordpress-agent',
  'plugin': 'wordpress-agent',
};

// Parse actions from AI response
interface CopilotAction {
  type: 'CREATE_CARD' | 'MOVE_CARD' | 'UPDATE_CARD';
  data: Record<string, string>;
}

function parseActions(response: string): { cleanResponse: string; actions: CopilotAction[] } {
  const actions: CopilotAction[] = [];
  let cleanResponse = response;

  // Parse CREATE_CARD actions
  const createCardRegex = /\[ACTION:CREATE_CARD\]([\s\S]*?)\[\/ACTION\]/g;
  let match;
  while ((match = createCardRegex.exec(response)) !== null) {
    const actionContent = match[1];
    const data: Record<string, string> = {};

    const lines = actionContent.trim().split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        data[key] = value;
      }
    }

    if (data.title) {
      actions.push({ type: 'CREATE_CARD', data });
    }
    cleanResponse = cleanResponse.replace(match[0], '').trim();
  }

  // Parse MOVE_CARD actions
  const moveCardRegex = /\[ACTION:MOVE_CARD\]([\s\S]*?)\[\/ACTION\]/g;
  while ((match = moveCardRegex.exec(response)) !== null) {
    const actionContent = match[1];
    const data: Record<string, string> = {};

    const lines = actionContent.trim().split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        data[key] = value;
      }
    }

    if (data.cardId && data.toLane) {
      actions.push({ type: 'MOVE_CARD', data });
    }
    cleanResponse = cleanResponse.replace(match[0], '').trim();
  }

  // Parse UPDATE_CARD actions
  const updateCardRegex = /\[ACTION:UPDATE_CARD\]([\s\S]*?)\[\/ACTION\]/g;
  while ((match = updateCardRegex.exec(response)) !== null) {
    const actionContent = match[1];
    const data: Record<string, string> = {};

    const lines = actionContent.trim().split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        data[key] = value;
      }
    }

    if (data.cardId) {
      actions.push({ type: 'UPDATE_CARD', data });
    }
    cleanResponse = cleanResponse.replace(match[0], '').trim();
  }

  return { cleanResponse, actions };
}

// Execute parsed actions
async function executeActions(
  actions: CopilotAction[],
  projectId: string | undefined,
  boardId: string | undefined
): Promise<{ cardsCreated: any[]; cardsMoved: any[]; cardsUpdated: any[]; errors: string[] }> {
  const result = { cardsCreated: [] as any[], cardsMoved: [] as any[], cardsUpdated: [] as any[], errors: [] as string[] };

  console.log('[CoPilot] executeActions called with', actions.length, 'actions');
  console.log('[CoPilot] projectId:', projectId, 'boardId:', boardId);

  if (!projectId || !boardId) {
    const error = `Missing projectId (${projectId}) or boardId (${boardId}) - cannot execute actions`;
    console.error('[CoPilot] FAILED:', error);
    result.errors.push(error);
    return result;
  }

  for (const action of actions) {
    try {
      if (action.type === 'CREATE_CARD') {
        const agentSlug = action.data.agent || 'ceo-copilot';
        const routing = AGENT_ROUTING[agentSlug] || AGENT_ROUTING['ceo-copilot'];
        console.log('[CoPilot] CREATE_CARD - agent:', agentSlug, 'defaultLane:', routing.defaultLane);

        // Get the lane for this agent
        const lane = await prisma.lane.findFirst({
          where: { board: { projectId }, laneNumber: routing.defaultLane },
        });

        if (!lane) {
          const error = `Lane ${routing.defaultLane} not found for agent ${agentSlug}`;
          console.error('[CoPilot] FAILED:', error);
          result.errors.push(error);
          continue;
        }

        if (lane) {
          // Check for existing card with same title - update if exists, create if not
          const existingCard = await prisma.card.findFirst({
            where: {
              boardId,
              title: action.data.title,
            },
          });

          let card;
          if (existingCard) {
            // Update existing card instead of creating duplicate
            card = await prisma.card.update({
              where: { id: existingCard.id },
              data: {
                laneId: lane.id,
                description: action.data.description || existingCard.description,
                priority: action.data.priority || routing.priority,
                assignedAgent: agentSlug,
                status: 'pending',
              },
            });
            console.log('[CoPilot] SUCCESS - Updated existing card:', card.id, '-', card.title);

            // Add history note for the update
            await prisma.cardHistory.create({
              data: {
                cardId: card.id,
                action: 'updated',
                previousValue: existingCard.description || null,
                newValue: action.data.description || null,
                performedBy: agentSlug,
                metadata: { reason: 'CoPilot CREATE_CARD action - updated existing card instead of creating duplicate' },
              },
            });
          } else {
            // Get max position in lane for new card
            const maxPos = await prisma.card.aggregate({
              where: { laneId: lane.id },
              _max: { position: true },
            });

            card = await prisma.card.create({
              data: {
                boardId,
                laneId: lane.id,
                title: action.data.title,
                description: action.data.description || '',
                type: 'task',
                priority: action.data.priority || routing.priority,
                assignedAgent: agentSlug,
                status: 'pending',
                position: (maxPos._max.position ?? -1) + 1,
              },
            });
            console.log('[CoPilot] SUCCESS - Created new card:', card.id, '-', card.title);
          }
          result.cardsCreated.push(card);
        }
      } else if (action.type === 'MOVE_CARD') {
        const toLaneNumber = parseInt(action.data.toLane, 10);
        const lane = await prisma.lane.findFirst({
          where: { board: { projectId }, laneNumber: toLaneNumber },
        });

        if (lane) {
          const maxPos = await prisma.card.aggregate({
            where: { laneId: lane.id },
            _max: { position: true },
          });

          const card = await prisma.card.update({
            where: { id: action.data.cardId },
            data: {
              laneId: lane.id,
              position: (maxPos._max.position ?? -1) + 1,
            },
          });
          result.cardsMoved.push(card);
        }
      } else if (action.type === 'UPDATE_CARD') {
        const updateData: any = {};
        if (action.data.status) updateData.status = action.data.status;
        if (action.data.priority) updateData.priority = action.data.priority;
        if (action.data.assignedAgent) updateData.assignedAgent = action.data.assignedAgent;

        const card = await prisma.card.update({
          where: { id: action.data.cardId },
          data: updateData,
        });
        result.cardsUpdated.push(card);
      }
    } catch (error) {
      console.error('Error executing action:', action, error);
    }
  }

  return result;
}

// Phase-specific guidance for the planning Q&A session
const PHASE_QUESTIONS: Record<string, string> = {
  welcome: `PHASE: Welcome - Understanding the Project Idea

IMPORTANT: Accept what the user tells you and move forward. Do NOT keep asking "what problem are you solving" repeatedly.

Your job in this phase:
- Listen to the user's project idea
- Acknowledge their idea enthusiastically
- After they describe it, summarize what you heard
- Then say "Let's move to the Vision phase" to progress

Example flow:
User: "I want to build a landing page for ice tea"
You: "Great! A landing page for ice tea sounds exciting! [brief summary]. Let's move to the Vision phase to clarify the details."`,

  vision: `PHASE: Vision - Clarifying the Value Proposition

The user has already explained their basic idea. Now help them articulate:
- Target audience (who will use this?)
- Key value proposition (what's the main benefit?)
- What makes it unique?

IMPORTANT: After 1-2 exchanges, summarize and say "Let's move to Requirements" to progress.`,

  requirements: `PHASE: Requirements - Defining Features

Help the user list:
- Must-have features for launch
- Nice-to-have features for later
- Any technical constraints

IMPORTANT: Be helpful and suggest features based on what you know about the project. After discussing, say "Let's move to Goals" to progress.`,

  goals: `PHASE: Goals - Success Metrics

Help define:
- What success looks like
- Key metrics to track
- Timeline expectations

IMPORTANT: Suggest reasonable goals based on the project type. After discussing, say "Let's move to Roles" to progress.`,

  roles: `PHASE: Roles - Team & Agents

Based on the project, recommend:
- Which AgentWorks agents would help (Architect, UI Agent, Backend Agent, etc.)
- The development pipeline

IMPORTANT: Make recommendations proactively. After discussing, say "Let's move to Architecture" to progress.`,

  architecture: `PHASE: Architecture - Technical Design

Recommend and discuss:
- Suggested tech stack for this project type
- Frontend structure
- Backend needs (if any)
- Data storage needs

WORDPRESS DETECTION: If the user mentions WordPress, WooCommerce, themes, plugins, Gutenberg, or any WordPress-related technology:
1. IMMEDIATELY recommend the WordPress CMS Agent for this project
2. Mention that the WordPress CMS Agent is a full-stack WordPress expert
3. Explain that it can handle themes (classic & block), plugins, Gutenberg blocks, WooCommerce, and deployment
4. Create a card to assign the WordPress CMS Agent using [ACTION:CREATE_CARD] with agent: wordpress-agent

IMPORTANT: Make concrete recommendations. After discussing, say "Planning is complete! Ready to generate your Blueprint, PRD, and MVP documents."`,

  general: `You are a helpful AI assistant. Answer the user's questions directly and helpfully. Don't force them into a planning flow unless they ask for it.`,
};

// Helper to detect if the current phase is complete based on AI response
function detectPhaseCompletion(response: string, phase: string): boolean {
  const lowerResponse = response.toLowerCase();

  // Phase-specific triggers - look for mentions of moving to the NEXT phase
  const phaseTransitions: Record<string, string[]> = {
    welcome: ['vision phase', 'move to vision', 'vision stage', 'clarify the vision', 'let\'s clarify'],
    vision: ['requirements phase', 'move to requirements', 'requirements stage', 'define requirements', 'list the requirements'],
    requirements: ['goals phase', 'move to goals', 'goals stage', 'define goals', 'set goals', 'success metrics'],
    goals: ['roles phase', 'move to roles', 'roles stage', 'identify roles', 'team and agents'],
    roles: ['architecture phase', 'move to architecture', 'architecture stage', 'technical architecture', 'tech stack'],
    architecture: [
      'planning complete', 'blueprint', 'ready to generate', 'prd', 'complete', 'finished planning',
      // Document creation triggers
      'create the documents', 'creating the documents', 'generate the documents', 'generating documents',
      'i\'ll create the necessary documents', 'create the necessary documents',
      'let me create', 'let me generate', 'creating your documents', 'generating your documents',
      'i\'ll generate', 'i will generate', 'i will create', 'begin generating',
      'start generating', 'start creating', 'proceed with document', 'create your blueprint',
      'finalize the planning', 'finalize planning', 'ready to finalize', 'let\'s finalize',
    ],
  };

  // Check phase-specific triggers
  const triggers = phaseTransitions[phase] || [];
  if (triggers.some(trigger => lowerResponse.includes(trigger))) {
    return true;
  }

  // Generic completion indicators
  const genericIndicators = [
    'move to the next phase',
    'move on to',
    'proceed to',
    'let\'s move to',
    'ready to move',
    'moving forward to',
    'next phase',
    'let\'s proceed',
    'shall we move',
    'ready to proceed',
    'on to the next',
  ];

  return genericIndicators.some(indicator => lowerResponse.includes(indicator));
}

// Get the next phase in sequence
function getNextPhase(currentPhase: string): string | null {
  // Extended phase order including review phases
  const phaseOrder = [
    'welcome',
    'vision',
    'requirements',
    'goals',
    'roles',
    'architecture',
    'blueprint-review',  // After architecture, generate documents and review
    'planning-complete'
  ];
  const currentIndex = phaseOrder.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
    return null;
  }
  return phaseOrder[currentIndex + 1];
}

const createConversationSchema = z.object({
  context: z.string(),
  projectId: z.string().optional(),
  cardId: z.string().optional(),
  title: z.string().optional(),
});

const phaseResponseSchema = z.object({
  projectId: z.string(),
  phase: z.enum(['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture', 'blueprint-review', 'prd-review', 'mvp-review', 'playbook-review', 'planning-complete']),
  response: z.string(),
});

const generateDocumentSchema = z.object({
  projectId: z.string(),
  documentType: z.enum(['blueprint', 'prd', 'mvp', 'playbook']),
  createReviewCard: z.boolean().optional().default(true),
  createTodo: z.boolean().optional().default(true),
});

const generateAllDocumentsSchema = z.object({
  projectId: z.string(),
});

const generateCardsSchema = z.object({
  projectId: z.string(),
});

type PhaseData = Record<string, string>;

// Helper function to save document to project filesystem
async function saveDocumentToFilesystem(
  localPath: string | null,
  docType: 'blueprint' | 'prd' | 'mvp' | 'playbook',
  content: string
): Promise<{ saved: boolean; filePath?: string; error?: string }> {
  if (!localPath) {
    return { saved: false, error: 'No local path configured for project' };
  }

  try {
    // Create docs directory if it doesn't exist
    const docsDir = path.join(localPath, 'docs');
    await fs.mkdir(docsDir, { recursive: true });

    // Map doc type to filename
    const fileNames: Record<string, string> = {
      blueprint: 'BLUEPRINT.md',
      prd: 'PRD.md',
      mvp: 'MVP.md',
    };

    const fileName = fileNames[docType] || `${docType.toUpperCase()}.md`;
    const filePath = path.join(docsDir, fileName);

    // Write the document
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[CoPilot] Saved ${docType} to ${filePath}`);

    return { saved: true, filePath };
  } catch (error: any) {
    console.error(`[CoPilot] Failed to save ${docType} to filesystem:`, error);
    return { saved: false, error: error?.message || 'Unknown error' };
  }
}

export const copilotRoutes: FastifyPluginAsync = async (app) => {
  // Authentication hook - validates session and sets request.user
  app.addHook('preHandler', async (request, reply) => {
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

  app.post('/chat', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = chatSchema.parse(request.body);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { tenant: true },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    let conversation;
    if (body.conversationId) {
      conversation = await prisma.coPilotConversation.findUnique({
        where: { id: body.conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!conversation || conversation.tenantId !== dbUser.tenantId) {
        return reply.status(404).send({ error: 'Conversation not found' });
      }
    } else {
      conversation = await prisma.coPilotConversation.create({
        data: {
          tenantId: dbUser.tenantId,
          projectId: body.projectId,
          cardId: body.cardId,
          context: body.context,
          title: `${body.context} conversation`,
          status: 'active',
        },
        include: { messages: true },
      });
    }

    await prisma.coPilotMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: body.message,
        metadata: body.metadata,
      },
    });

    let projectContext = '';
    if (body.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: body.projectId },
        include: {
          docs: true,
          boards: {
            include: {
              cards: {
                take: 10,
                orderBy: { updatedAt: 'desc' },
              },
            },
          },
        },
      });

      if (project) {
        projectContext = `
Project: ${project.name}
Description: ${project.description || 'N/A'}
Status: ${project.status}

Documents:
${project.docs.map(doc => `- ${doc.type}: ${doc.content.slice(0, 500)}...`).join('\n')}

Recent Cards:
${project.boards[0]?.cards.map(card => `- [${card.status}] ${card.title}`).join('\n') || 'No cards yet'}
`;
      }
    }

    let cardContext = '';
    if (body.cardId) {
      const card = await prisma.card.findUnique({
        where: { id: body.cardId },
        include: {
          lane: true,
          agentRuns: { take: 5, orderBy: { createdAt: 'desc' } },
        },
      });

      if (card) {
        cardContext = `
Selected Card: ${card.title}
Description: ${card.description || 'N/A'}
Lane: ${card.lane.name} (Lane ${card.lane.laneNumber})
Status: ${card.status}
Priority: ${card.priority}
Type: ${card.type}
`;
      }
    }

    // Get phase-specific guidance if in planning context
    const currentPhase = body.phase || 'welcome';
    const phaseGuidance = PHASE_QUESTIONS[currentPhase] || '';

    // Get previous phase responses for context
    let previousResponses = '';
    if (body.projectId) {
      const phaseComponent = await prisma.projectComponent.findFirst({
        where: { projectId: body.projectId, type: 'discovery', name: 'phase-responses' },
      });
      if (phaseComponent?.data) {
        const responses = phaseComponent.data as PhaseData;
        previousResponses = Object.entries(responses)
          .map(([phase, response]) => `${phase}: ${response.slice(0, 200)}...`)
          .join('\n');
      }
    }

    const systemPrompt = `You are the CEO CoPilot for AgentWorks, an AI-powered development platform.

Your role is to help users plan and build software projects. You guide them through planning phases but you are FLEXIBLE and HELPFUL, not rigid.

CRITICAL RULES:
1. NEVER ask the same question twice. If the user already answered something, acknowledge it and move on.
2. NEVER keep asking "what problem are you solving" - once they've described their project, accept it and progress.
3. Be PROACTIVE - suggest things, make recommendations, help them move forward.
4. When the user seems ready, suggest moving to the next phase. Don't gatekeep.
5. Keep responses SHORT and ACTIONABLE.
6. When the user asks to create a task or assign work to an agent, CREATE A CARD using the action format below.

=== KANBAN CARD ACTIONS - CRITICAL ===
You MUST create cards when the user:
1. Approves a plan or asks you to proceed
2. Asks to create a task for any agent
3. Agrees to suggestions you've made

ALWAYS include [ACTION:CREATE_CARD] blocks at the END of your response. Do NOT just describe what you'll do - ACTUALLY create the cards.

FORMAT (include this EXACTLY as shown, at END of your message):
[ACTION:CREATE_CARD]
title: Card title here
description: Detailed description of what needs to be done
agent: frontend-agent
priority: High
[/ACTION]

Valid agents: frontend-agent, backend-agent, database-agent, qa-agent, devops-agent, architect-agent, research-agent, docs-agent, ceo-copilot, wordpress-agent
Valid priorities: Critical, High, Medium, Low

=== AGENT PLAYBOOK ===
- **Frontend Agent** (frontend-agent): UI components, forms, styling, React, landing pages
- **Backend Agent** (backend-agent): APIs, business logic, server-side code, Node.js
- **Database Agent** (database-agent): Schema design, queries, Prisma, PostgreSQL
- **QA Agent** (qa-agent): Testing, quality assurance, test plans
- **DevOps Agent** (devops-agent): Deployment, CI/CD, infrastructure
- **Architect Agent** (architect-agent): System design, architecture decisions
- **Research Agent** (research-agent): Research tasks, competitive analysis
- **Docs Agent** (docs-agent): Documentation, user guides
- **CEO CoPilot** (ceo-copilot): Planning, oversight (that's you!)
- **WordPress CMS Agent** (wordpress-agent): WordPress themes, plugins, Gutenberg blocks, WooCommerce, full-stack WordPress development

=== WORDPRESS AUTO-DETECTION ===
If the user mentions WordPress, WooCommerce, themes, plugins, Gutenberg, or any WordPress-related technology, ALWAYS:
1. Recommend the WordPress CMS Agent as the primary development agent
2. Explain that it can handle full-stack WordPress development
3. Create a card for the WordPress CMS Agent

=== EXAMPLE ===
User: "Yes, let's create the frontend and backend tasks"
Your response:
"Great! I'm creating the cards now.

**Frontend Landing Page** - Will create a responsive landing page with hero section, features, and call-to-action.
**Backend API Setup** - Will set up the API endpoints for handling form submissions.

[ACTION:CREATE_CARD]
title: Frontend Landing Page
description: Create a responsive landing page with hero section, features grid, and call-to-action button. Use modern styling with Tailwind CSS.
agent: frontend-agent
priority: High
[/ACTION]

[ACTION:CREATE_CARD]
title: Backend API Setup
description: Set up API endpoints for contact form submission and email notifications.
agent: backend-agent
priority: High
[/ACTION]"

Current Context: ${body.context}
Current Planning Phase: ${currentPhase}

${phaseGuidance ? `=== PHASE GUIDANCE ===
${phaseGuidance}
===

` : ''}${previousResponses ? `What we've discussed so far:
${previousResponses}

` : ''}${projectContext}
${cardContext}

Remember: Be helpful, not interrogative. Accept what the user tells you and help them make progress.`;

    // Build message history for AI
    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversation.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: body.message },
    ];

    // Call AI Gateway with configured provider (respects project-specific overrides)
    let assistantResponse: string;
    try {
      const gateway = createGateway();
      const agentConfig = await getAgentProviderConfig(body.projectId, 'ceo_copilot');
      const response = await gateway.chat(aiMessages, {
        provider: agentConfig.provider,
        model: agentConfig.model,
        temperature: 0.7,
        maxTokens: 2048,
      });
      assistantResponse = response.content;
    } catch (error: any) {
      console.error('AI Gateway error:', error);
      // Fallback response if AI call fails
      assistantResponse = `I apologize, but I encountered an issue connecting to the AI service. Please ensure API keys are configured in the Admin Panel.

Error details: ${error?.message || 'Unknown error'}

In the meantime, I can still help you with:
- Generating documents (Blueprint, PRD, MVP)
- Creating Kanban cards
- Planning your project structure

Please try again or check the Admin Panel for provider configuration.`;
    }

    // Parse actions from AI response
    const { cleanResponse, actions } = parseActions(assistantResponse);
    console.log('[CoPilot] Parsed', actions.length, 'actions from AI response');
    if (actions.length > 0) {
      console.log('[CoPilot] Actions:', JSON.stringify(actions, null, 2));
    }

    // Get boardId for action execution
    let boardId: string | undefined;
    if (body.projectId) {
      const board = await prisma.board.findFirst({
        where: { projectId: body.projectId },
      });
      boardId = board?.id;
    }

    // Execute any actions the AI requested
    const actionResults = await executeActions(actions, body.projectId, boardId);

    // Save the clean response (without action markup) to the database
    const savedMessage = await prisma.coPilotMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: cleanResponse,
      },
    });

    // Detect if the AI is suggesting to advance to the next phase
    const phaseComplete = detectPhaseCompletion(cleanResponse, currentPhase);
    const nextPhase = phaseComplete ? getNextPhase(currentPhase) : null;

    return {
      conversationId: conversation.id,
      message: {
        id: savedMessage.id,
        role: 'assistant',
        content: cleanResponse,
        timestamp: savedMessage.createdAt,
      },
      // Include phase advancement signal for auto-advance
      currentPhase,
      advancePhase: nextPhase,
      // Include action results so frontend can update UI
      actions: actionResults,
    };
  });

  app.get('/conversations', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const conversations = await prisma.coPilotConversation.findMany({
      where: { tenantId: dbUser.tenantId, status: 'active' },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return { conversations };
  });

  app.get('/conversations/:id', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { id } = request.params as { id: string };

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const conversation = await prisma.coPilotConversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!conversation || conversation.tenantId !== dbUser.tenantId) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    return { conversation };
  });

  app.post('/conversations', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = createConversationSchema.parse(request.body);

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const conversation = await prisma.coPilotConversation.create({
      data: {
        tenantId: dbUser.tenantId,
        projectId: body.projectId,
        cardId: body.cardId,
        context: body.context,
        title: body.title || `${body.context} conversation`,
        status: 'active',
      },
    });

    return { conversation };
  });

  app.delete('/conversations/:id', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { id } = request.params as { id: string };

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser?.tenantId) {
      return reply.status(400).send({ error: 'User has no tenant' });
    }

    const conversation = await prisma.coPilotConversation.findUnique({
      where: { id },
    });

    if (!conversation || conversation.tenantId !== dbUser.tenantId) {
      return reply.status(404).send({ error: 'Conversation not found' });
    }

    await prisma.coPilotConversation.update({
      where: { id },
      data: { status: 'archived' },
    });

    return { success: true };
  });

  app.post('/phase', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = phaseResponseSchema.parse(request.body);

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      include: { workspace: true },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const component = await prisma.projectComponent.upsert({
      where: {
        projectId_type_name: {
          projectId: body.projectId,
          type: 'discovery',
          name: 'phase-responses',
        },
      },
      update: {
        data: {
          ...(JSON.parse(JSON.stringify(await prisma.projectComponent.findFirst({
            where: { projectId: body.projectId, type: 'discovery', name: 'phase-responses' },
          }).then(c => c?.data || {}))) as PhaseData),
          [body.phase]: body.response,
        },
        version: { increment: 1 },
      },
      create: {
        projectId: body.projectId,
        type: 'discovery',
        name: 'phase-responses',
        data: { [body.phase]: body.response },
      },
    });

    await prisma.project.update({
      where: { id: body.projectId },
      data: { phase: body.phase },
    });

    return { success: true, component };
  });

  app.get('/phase/:projectId', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { projectId } = request.params as { projectId: string };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const component = await prisma.projectComponent.findFirst({
      where: { projectId, type: 'discovery', name: 'phase-responses' },
    });

    return {
      phase: project.phase,
      responses: component?.data || {},
    };
  });

  app.post('/generate', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = generateDocumentSchema.parse(request.body);

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      include: {
        boards: {
          include: {
            lanes: { orderBy: { laneNumber: 'asc' } },
          },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const phaseComponent = await prisma.projectComponent.findFirst({
      where: { projectId: body.projectId, type: 'discovery', name: 'phase-responses' },
    });

    const responses = (phaseComponent?.data || {}) as PhaseData;

    let content = '';
    switch (body.documentType) {
      case 'blueprint':
        content = generateBlueprint(project.name, responses);
        break;
      case 'prd':
        content = generatePRD(project.name, responses);
        break;
      case 'mvp':
        content = generateMVP(project.name, responses);
        break;
      case 'playbook':
        content = generatePlaybook(project.name, responses);
        break;
    }

    const doc = await prisma.projectDoc.upsert({
      where: {
        projectId_type: {
          projectId: body.projectId,
          type: body.documentType.toUpperCase(),
        },
      },
      update: {
        content,
        version: { increment: 1 },
      },
      create: {
        projectId: body.projectId,
        type: body.documentType.toUpperCase(),
        content,
      },
    });

    // Also save to filesystem if project has a local path
    const filesystemResult = await saveDocumentToFilesystem(
      project.localPath,
      body.documentType,
      content
    );

    // Create a review card in Lane 6 (Review) if requested
    let reviewCard = null;
    let linkedTodo = null;
    const board = project.boards[0];

    if (board && body.createReviewCard !== false) {
      // Find the Review lane (lane number 6)
      const reviewLane = board.lanes.find(l => l.laneNumber === 6);
      if (reviewLane) {
        const documentTypeNames: Record<string, string> = {
          blueprint: 'Blueprint',
          prd: 'PRD',
          mvp: 'MVP',
          playbook: 'Agent Playbook',
        };
        const docTypeName = documentTypeNames[body.documentType] || body.documentType.toUpperCase();

        // Document order for positioning: blueprint=0, prd=1, mvp=2, playbook=3
        const documentOrder: Record<string, number> = {
          blueprint: 0,
          prd: 1,
          mvp: 2,
          playbook: 3,
        };
        const order = documentOrder[body.documentType] ?? 0;

        // Check for existing review card - update if exists, create if not
        const existingCard = await prisma.card.findFirst({
          where: {
            boardId: board.id,
            title: `Review ${docTypeName}`,
          },
        });

        if (existingCard) {
          // Update existing card instead of creating duplicate
          reviewCard = await prisma.card.update({
            where: { id: existingCard.id },
            data: {
              laneId: reviewLane.id,
              description: `Please review the updated ${docTypeName} document.\n\nClick "Approve" to move to Complete, or chat to request revisions.`,
              status: 'Ready',
              position: order,
            },
          });

          // Add history note for the update
          await prisma.cardHistory.create({
            data: {
              cardId: reviewCard.id,
              action: 'updated',
              previousValue: existingCard.description || null,
              newValue: `Document regenerated - ${docTypeName}`,
              performedBy: 'ceo_copilot',
              metadata: { documentType: body.documentType, documentId: doc.id, reason: 'Document regenerated - updated existing card' },
            },
          });
        } else {
          // Create new review card
          reviewCard = await prisma.card.create({
            data: {
              boardId: board.id,
              laneId: reviewLane.id,
              title: `Review ${docTypeName}`,
              description: `Please review the generated ${docTypeName} document and approve or request changes.\n\nClick "Approve" to move to Complete, or chat to request revisions.`,
              type: 'Doc',
              priority: 'high',
              position: order,
              assignedAgent: 'ceo_copilot',
              status: 'Ready',
            },
          });

          // Create CardHistory entry for card creation
          await prisma.cardHistory.create({
            data: {
              cardId: reviewCard.id,
              action: 'created',
              previousValue: null,
              newValue: 'Review',
              performedBy: 'ceo_copilot',
              metadata: { documentType: body.documentType, documentId: doc.id },
            },
          });
        }

        // Create or update linked todo if requested
        if (body.createTodo !== false) {
          // Check for existing todo
          const existingTodo = await prisma.projectTodo.findFirst({
            where: {
              projectId: body.projectId,
              content: `Review ${docTypeName}`,
            },
          });

          if (existingTodo) {
            // Update existing todo to link to current card
            linkedTodo = await prisma.projectTodo.update({
              where: { id: existingTodo.id },
              data: {
                cardId: reviewCard.id,
                completed: false,
              },
            });
          } else {
            // Create new todo
            linkedTodo = await prisma.projectTodo.create({
              data: {
                projectId: body.projectId,
                content: `Review ${docTypeName}`,
                completed: false,
                category: 'review',
                agentSource: 'ceo_copilot',
                cardId: reviewCard.id,
              },
            });
          }
        }

        // Initialize context file for the review card
        if (project.localPath) {
          try {
            const { getContextFileService } = await import('../lib/context-file-service.js');
            const contextService = getContextFileService();
            await contextService.initializeContext(
              project.localPath,
              reviewCard.id,
              reviewCard.title,
              'ceo_copilot'
            );
            await contextService.appendToContext(project.localPath, reviewCard.id, {
              timestamp: new Date(),
              agentName: 'ceo_copilot',
              type: 'completion',
              content: `Generated ${docTypeName} document from planning conversation.\n\nPlease review the document and approve or request changes.\n\nDocument ID: ${doc.id}`,
            });
          } catch (err) {
            console.error('Failed to initialize context for review card:', err);
          }
        }
      }
    }

    return {
      success: true,
      doc,
      filesystem: filesystemResult,
      reviewCard,
      linkedTodo,
    };
  });

  // Approve a review card and move it to the Complete lane
  const approveReviewSchema = z.object({
    projectId: z.string(),
    documentType: z.enum(['blueprint', 'prd', 'mvp', 'playbook']),
  });

  app.post('/approve-review', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = approveReviewSchema.parse(request.body);

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      include: {
        boards: {
          include: {
            lanes: { orderBy: { laneNumber: 'asc' } },
            cards: true,
          },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const board = project.boards[0];
    if (!board) {
      return reply.status(404).send({ error: 'No board found for project' });
    }

    // Find the review card for this document type
    const documentTypeNames: Record<string, string> = {
      blueprint: 'Blueprint',
      prd: 'PRD',
      mvp: 'MVP',
      playbook: 'Agent Playbook',
    };
    const docTypeName = documentTypeNames[body.documentType] || body.documentType.toUpperCase();
    const reviewCardTitle = `Review ${docTypeName}`;

    const reviewCard = board.cards.find(c => c.title === reviewCardTitle);
    if (!reviewCard) {
      return reply.status(404).send({ error: `Review card not found: ${reviewCardTitle}` });
    }

    // Find the Complete lane (lane number 7 - shifted after adding Review lane)
    const completeLane = board.lanes.find(l => l.laneNumber === 7);
    if (!completeLane) {
      return reply.status(404).send({ error: 'Complete lane not found' });
    }

    // Get current lane for history
    const currentLane = board.lanes.find(l => l.id === reviewCard.laneId);
    const currentLaneName = currentLane?.name || 'Unknown';

    // Get max position in complete lane
    const maxPosition = await prisma.card.aggregate({
      where: { laneId: completeLane.id },
      _max: { position: true },
    });

    // Move the card to Complete lane
    const updatedCard = await prisma.card.update({
      where: { id: reviewCard.id },
      data: {
        laneId: completeLane.id,
        status: 'Done',
        position: (maxPosition._max.position ?? -1) + 1,
      },
    });

    // Create CardHistory entry for approval
    await prisma.cardHistory.create({
      data: {
        cardId: reviewCard.id,
        action: 'approved',
        previousValue: currentLaneName,
        newValue: completeLane.name,
        performedBy: user.id || 'user',
        metadata: { documentType: body.documentType },
      },
    });

    // Mark any linked todos as complete
    const linkedTodos = await prisma.projectTodo.updateMany({
      where: { cardId: reviewCard.id },
      data: { completed: true },
    });

    // Log the approval to the context file
    if (project.localPath) {
      try {
        const { getContextFileService } = await import('../lib/context-file-service.js');
        const contextService = getContextFileService();
        await contextService.appendToContext(project.localPath, reviewCard.id, {
          timestamp: new Date(),
          agentName: 'user',
          type: 'approval',
          content: `${docTypeName} document approved by user. Card moved to Complete lane.`,
        });
      } catch (err) {
        console.error('Failed to log approval to context:', err);
      }
    }

    return {
      success: true,
      card: updatedCard,
      movedToLane: completeLane.name,
      todosCompleted: linkedTodos.count,
    };
  });

  // Generate all 4 planning documents SEQUENTIALLY
  // This endpoint uses the card state machine to prevent duplicates and ensure proper card lifecycle
  app.post('/generate-all', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = generateAllDocumentsSchema.parse(request.body);

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      include: {
        boards: {
          include: {
            lanes: { orderBy: { laneNumber: 'asc' } },
          },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    // Get phase responses for document generation
    const phaseComponent = await prisma.projectComponent.findFirst({
      where: { projectId: body.projectId, type: 'discovery', name: 'phase-responses' },
    });

    const responses = (phaseComponent?.data || {}) as PhaseData;
    const board = project.boards[0];

    if (!board) {
      return reply.status(404).send({ error: 'No board found for project' });
    }

    // Find the Review lane (lane number 6)
    const reviewLane = board.lanes.find(l => l.laneNumber === 6);
    if (!reviewLane) {
      return reply.status(404).send({ error: 'Review lane not found. Ensure lane 6 (Review) exists.' });
    }

    // Process documents SEQUENTIALLY to prevent race conditions
    const results: Array<{
      documentType: string;
      success: boolean;
      doc?: any;
      reviewCard?: any;
      linkedTodo?: any;
      cardCreated?: boolean;
      error?: string;
    }> = [];

    for (const documentType of DOCUMENT_TYPES) {
      try {
        // Generate document content
        let content = '';
        switch (documentType) {
          case 'blueprint':
            content = generateBlueprint(project.name, responses);
            break;
          case 'prd':
            content = generatePRD(project.name, responses);
            break;
          case 'mvp':
            content = generateMVP(project.name, responses);
            break;
          case 'playbook':
            content = generatePlaybook(project.name, responses);
            break;
        }

        // Save document to database
        const doc = await prisma.projectDoc.upsert({
          where: {
            projectId_type: {
              projectId: body.projectId,
              type: documentType.toUpperCase(),
            },
          },
          update: {
            content,
            version: { increment: 1 },
          },
          create: {
            projectId: body.projectId,
            type: documentType.toUpperCase(),
            content,
          },
        });

        // Save to filesystem
        await saveDocumentToFilesystem(project.localPath, documentType, content);

        const docTypeName = DOCUMENT_TYPE_NAMES[documentType];

        // Use card state machine to find or create the document card
        const { card: reviewCard, created: cardCreated } = await findOrCreateDocumentCard({
          boardId: board.id,
          documentType,
          projectName: project.name,
          performedBy: 'ceo_copilot',
        });

        // Transition the card to the review lane with 'document_generated' trigger
        await transitionCard({
          cardId: reviewCard.id,
          trigger: 'document_generated',
          performedBy: 'ceo_copilot',
          targetLaneNumber: 6, // Review lane
          details: `${docTypeName} document generated and ready for review`,
          metadata: { documentId: doc.id, documentType },
        });

        // Log the document generation event
        await logCardEvent(
          reviewCard.id,
          'document_generated',
          'ceo_copilot',
          `Generated ${docTypeName} document from planning conversation`,
          { documentId: doc.id, documentType, version: doc.version }
        );

        // Check for existing linked todo - update if exists, create if not
        const existingTodo = await prisma.projectTodo.findFirst({
          where: {
            projectId: body.projectId,
            content: `Review ${docTypeName}`,
          },
        });

        let linkedTodo;
        if (existingTodo) {
          // Update existing todo to link to current card
          linkedTodo = await prisma.projectTodo.update({
            where: { id: existingTodo.id },
            data: {
              cardId: reviewCard.id,
              completed: false,
            },
          });
        } else {
          // Create new todo
          linkedTodo = await prisma.projectTodo.create({
            data: {
              projectId: body.projectId,
              content: `Review ${docTypeName}`,
              completed: false,
              category: 'review',
              agentSource: 'ceo_copilot',
              cardId: reviewCard.id,
            },
          });
        }

        // Initialize context file
        if (project.localPath) {
          try {
            const { getContextFileService } = await import('../lib/context-file-service.js');
            const contextService = getContextFileService();
            await contextService.initializeContext(
              project.localPath,
              reviewCard.id,
              reviewCard.title,
              'ceo_copilot'
            );
            await contextService.appendToContext(project.localPath, reviewCard.id, {
              timestamp: new Date(),
              agentName: 'ceo_copilot',
              type: 'completion',
              content: `Generated ${docTypeName} document from planning conversation.\n\nPlease review the document and approve or request changes.\n\nDocument ID: ${doc.id}`,
            });
          } catch (err) {
            console.error(`Failed to initialize context for ${documentType} review card:`, err);
          }
        }

        results.push({
          documentType,
          success: true,
          doc,
          reviewCard,
          linkedTodo,
          cardCreated,
        });
      } catch (err) {
        console.error(`Failed to generate ${documentType}:`, err);
        results.push({
          documentType,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Update project phase to 'review-documents'
    await prisma.project.update({
      where: { id: body.projectId },
      data: { phase: 'blueprint-review' },
    });

    return {
      success: true,
      results,
      message: 'All 4 planning documents generated sequentially with card state machine.',
    };
  });

  app.post('/generate-cards', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = generateCardsSchema.parse(request.body);

    const project = await prisma.project.findUnique({
      where: { id: body.projectId },
      include: {
        boards: { include: { lanes: { orderBy: { laneNumber: 'asc' } } } },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const board = project.boards[0];
    if (!board) {
      return reply.status(404).send({ error: 'No board found for project' });
    }

    const phaseComponent = await prisma.projectComponent.findFirst({
      where: { projectId: body.projectId, type: 'discovery', name: 'phase-responses' },
    });

    const responses = (phaseComponent?.data || {}) as PhaseData;

    const cards = generateCardsFromMVP(project.name, responses, board.lanes);

    const createdCards = [];
    for (const card of cards) {
      const lane = board.lanes.find(l => l.laneNumber === card.laneNumber);
      if (!lane) continue;

      // Check for existing card with same title - update if exists, create if not
      const existingCard = await prisma.card.findFirst({
        where: {
          boardId: board.id,
          title: card.title,
        },
      });

      let createdCard;
      if (existingCard) {
        // Update existing card instead of creating duplicate
        createdCard = await prisma.card.update({
          where: { id: existingCard.id },
          data: {
            laneId: lane.id,
            description: card.description,
            type: card.type,
            priority: card.priority,
            assignedAgent: card.assignedAgent,
            status: card.assignedAgent && AGENT_EXECUTION_MODE[card.assignedAgent]?.autoRun
              ? 'Queued'
              : 'Ready',
          },
        });

        // Add history note for the update
        await prisma.cardHistory.create({
          data: {
            cardId: createdCard.id,
            action: 'updated',
            previousValue: existingCard.description || null,
            newValue: card.description,
            performedBy: 'ceo_copilot',
            metadata: { reason: 'Generate cards from MVP - updated existing card instead of creating duplicate' },
          },
        });
      } else {
        const maxPosition = await prisma.card.aggregate({
          where: { laneId: lane.id },
          _max: { position: true },
        });

        createdCard = await prisma.card.create({
          data: {
            boardId: board.id,
            laneId: lane.id,
            title: card.title,
            description: card.description,
            type: card.type,
            priority: card.priority,
            position: (maxPosition._max.position ?? -1) + 1,
            assignedAgent: card.assignedAgent,
            status: card.assignedAgent && AGENT_EXECUTION_MODE[card.assignedAgent]?.autoRun
              ? 'Queued'
              : 'Ready', // Ready = waiting for human approval
          },
        });
      }
      createdCards.push(createdCard);
    }

    await prisma.project.update({
      where: { id: body.projectId },
      data: { phase: 'planning-complete' },
    });

    // Orchestrate agent execution for auto-run cards
    // This is done asynchronously - we don't wait for agents to complete
    orchestrateAutoRunAgents(project, createdCards, user.id).catch((err) => {
      console.error('Failed to orchestrate auto-run agents:', err);
    });

    return { success: true, cards: createdCards };
  });

  // Review card context with CoPilot
  const reviewContextSchema = z.object({
    cardId: z.string().uuid(),
    prompt: z.string().optional().default('Review what this card has done and summarize the key actions, results, and any issues.'),
  });

  app.post('/review-context', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = reviewContextSchema.parse(request.body);

    // Get card and project info
    const card = await prisma.card.findUnique({
      where: { id: body.cardId },
      include: {
        board: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const project = card.board.project;
    if (!project.localPath) {
      return reply.status(400).send({ error: 'Project has no local path configured' });
    }

    // Read context file
    const { getContextFileService } = await import('../lib/context-file-service.js');
    const contextService = getContextFileService();
    const context = await contextService.readContext(project.localPath, body.cardId);

    if (!context || context.trim() === '') {
      return reply.status(404).send({
        error: 'No context found',
        message: 'No agent work has been recorded for this card yet.',
      });
    }

    // Build the review prompt
    const systemPrompt = `You are the CEO CoPilot for AgentWorks, reviewing agent execution context.
Your role is to help the human understand what work was done on a card, identify any issues,
and suggest next steps.

Card Title: ${card.title}
Card Description: ${card.description || 'No description'}
Card Status: ${card.status}
Card Type: ${card.type}
Card Priority: ${card.priority}

Below is the context log showing all agent activity for this card:

${context}

---
Please analyze the above context and respond to the user's request.`;

    const userPrompt = body.prompt;

    // Call AI to review (using configured provider)
    const gateway = createGateway();
    const agentConfig = await getAgentProviderConfig(project.id, 'ceo_copilot');

    const completion = await gateway.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        provider: agentConfig.provider,
        model: agentConfig.model,
        temperature: 0.3,
      }
    );

    const reviewResponse = completion.content;

    return {
      success: true,
      card: {
        id: card.id,
        title: card.title,
        status: card.status,
      },
      contextSize: context.length,
      review: reviewResponse,
    };
  });

  // Get card context file contents (raw)
  app.get('/context/:cardId', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { cardId } = request.params as { cardId: string };

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const project = card.board.project;
    if (!project.localPath) {
      return reply.status(400).send({ error: 'Project has no local path configured' });
    }

    const { getContextFileService } = await import('../lib/context-file-service.js');
    const contextService = getContextFileService();

    const exists = await contextService.contextExists(project.localPath, cardId);
    if (!exists) {
      return { exists: false, content: '', size: 0 };
    }

    const content = await contextService.readContext(project.localPath, cardId);
    const size = await contextService.getContextSize(project.localPath, cardId);

    return {
      exists: true,
      content,
      size,
      cardId: card.id,
      cardTitle: card.title,
    };
  });

  // Post a human message to card context
  const contextChatSchema = z.object({
    cardId: z.string().uuid(),
    message: z.string().min(1),
    userName: z.string().optional(),
  });

  app.post('/context-chat', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = contextChatSchema.parse(request.body);

    const card = await prisma.card.findUnique({
      where: { id: body.cardId },
      include: {
        board: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const project = card.board.project;
    if (!project.localPath) {
      return reply.status(400).send({ error: 'Project has no local path configured' });
    }

    // Log human message to context file
    const { getContextFileService } = await import('../lib/context-file-service.js');
    const contextService = getContextFileService();

    await contextService.logHumanMessage(
      project.localPath,
      body.cardId,
      body.message,
      body.userName || user.name || user.email || 'Human'
    );

    // Log to CardHistory
    await prisma.cardHistory.create({
      data: {
        cardId: body.cardId,
        action: 'context_chat',
        previousValue: null,
        newValue: null,
        performedBy: user.id,
        details: `Chat message: ${body.message.slice(0, 100)}${body.message.length > 100 ? '...' : ''}`,
        metadata: { source: 'human', messageLength: body.message.length },
      },
    });

    // Return updated context
    const content = await contextService.readContext(project.localPath, body.cardId);
    const size = await contextService.getContextSize(project.localPath, body.cardId);

    return {
      success: true,
      content,
      size,
      cardId: card.id,
      cardTitle: card.title,
    };
  });

  // Trigger agent to respond in conversation mode
  const agentRespondSchema = z.object({
    cardId: z.string().uuid(),
    agentName: z.string().optional(),
  });

  app.post('/agent-respond', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = agentRespondSchema.parse(request.body);

    // Get card with project info
    const card = await prisma.card.findUnique({
      where: { id: body.cardId },
      include: {
        board: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const project = card.board.project;
    if (!project.localPath) {
      return reply.status(400).send({ error: 'Project has no local path configured' });
    }

    // Determine which agent should respond
    const agentName = body.agentName || card.assignedAgent || 'ceo_copilot';

    // Trigger agent execution via orchestrator in conversation mode
    try {
      const orchestrator = getOrchestratorClient();
      const runId = await orchestrator.executeAgent({
        cardId: card.id,
        agentId: agentName,
        projectId: project.id,
        workspaceId: project.workspaceId,
        userId: user.id,
        mode: 'conversation', // NEW: tells executor to read conversation history
      });

      // Update card status to reflect agent is responding
      await prisma.card.update({
        where: { id: card.id },
        data: { status: 'Running' },
      });

      // Log agent invocation to CardHistory
      await prisma.cardHistory.create({
        data: {
          cardId: card.id,
          action: 'agent_invoked',
          previousValue: null,
          newValue: agentName,
          performedBy: user.id,
          details: `Agent ${agentName} started in conversation mode`,
          metadata: { runId: String(runId), mode: 'conversation', source: 'context-tab' },
        },
      });

      return {
        success: true,
        runId,
        status: 'started',
        agentName,
        cardId: card.id,
      };
    } catch (error: any) {
      console.error('Failed to trigger agent response:', error);
      return reply.status(500).send({
        error: 'Failed to start agent',
        message: error?.message || 'Unknown error',
      });
    }
  });

  // Get instructions for a card
  app.get('/instructions/:cardId', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { cardId } = request.params as { cardId: string };

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const project = card.board.project;
    if (!project.localPath) {
      return { instructions: null, lastUpdated: null };
    }

    const { getContextFileService } = await import('../lib/context-file-service.js');
    const contextService = getContextFileService();

    const instructions = await contextService.getInstructions(project.localPath, cardId);

    return {
      instructions,
      lastUpdated: card.updatedAt?.toISOString() || null,
      cardId: card.id,
      cardTitle: card.title,
    };
  });

  // Update instructions for a card (human edit)
  const updateInstructionsSchema = z.object({
    instructions: z.string(),
  });

  app.put('/instructions/:cardId', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { cardId } = request.params as { cardId: string };
    const body = updateInstructionsSchema.parse(request.body);

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const project = card.board.project;
    if (!project.localPath) {
      return reply.status(400).send({ error: 'Project has no local path configured' });
    }

    const { getContextFileService } = await import('../lib/context-file-service.js');
    const contextService = getContextFileService();

    await contextService.updateInstructions(project.localPath, cardId, body.instructions);

    // Log instruction update to CardHistory
    await prisma.cardHistory.create({
      data: {
        cardId,
        action: 'instructions_updated',
        previousValue: null,
        newValue: null,
        performedBy: user.id,
        details: `Instructions updated (${body.instructions.length} characters)`,
        metadata: { source: 'human', instructionLength: body.instructions.length },
      },
    });

    return {
      success: true,
      instructions: body.instructions,
      cardId: card.id,
    };
  });

  // Generate instructions for a card using CoPilot
  const generateInstructionsSchema = z.object({
    cardId: z.string().uuid(),
    regenerate: z.boolean().optional(),
  });

  app.post('/generate-instructions', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = generateInstructionsSchema.parse(request.body);

    const card = await prisma.card.findUnique({
      where: { id: body.cardId },
      include: {
        board: {
          include: {
            project: true,
          },
        },
        lane: true,
      },
    });

    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const project = card.board.project;
    if (!project.localPath) {
      return reply.status(400).send({ error: 'Project has no local path configured' });
    }

    const { getContextFileService } = await import('../lib/context-file-service.js');
    const contextService = getContextFileService();

    // Check if instructions already exist (unless regenerating)
    if (!body.regenerate) {
      const existingInstructions = await contextService.getInstructions(project.localPath, body.cardId);
      if (existingInstructions) {
        return {
          success: true,
          instructions: existingInstructions,
          cardId: card.id,
          generated: false,
        };
      }
    }

    // Generate instructions using LLM (with project-specific provider config)
    const instructions = await generateCardInstructions(project.id, project, card, card.assignedAgent || 'unknown');

    // Write instructions to context file
    const exists = await contextService.contextExists(project.localPath, body.cardId);
    if (exists) {
      await contextService.updateInstructions(project.localPath, body.cardId, instructions);
    } else {
      await contextService.initializeContextWithInstructions(
        project.localPath,
        body.cardId,
        card.title,
        card.assignedAgent || 'unknown',
        instructions
      );
    }

    return {
      success: true,
      instructions,
      cardId: card.id,
      generated: true,
    };
  });

  // Generate visual workflow from natural language prompt
  const generateWorkflowSchema = z.object({
    prompt: z.string().min(1),
    projectId: z.string().optional(),
  });

  app.post('/generate-workflow', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = generateWorkflowSchema.parse(request.body);

    // Use Design UX or Architect agent to generate workflow
    const systemPrompt = `You are a workflow design expert. Your task is to create visual workflow diagrams for automation processes.

CRITICAL: You MUST respond with a valid JSON object containing "nodes" and "edges" arrays. Do NOT include any text before or after the JSON.

## Node Types
- trigger: Entry points (events, schedules, webhooks)
- action: Operations (create, update, delete, API calls)
- condition: Decision points (if/else branching)
- database: Data operations (read, write, query)
- api: HTTP endpoints or external API calls
- ui: User interface components
- agent: AI agent execution
- notification: Alerts, emails, messages

## Node Structure
Each node MUST have:
{
  "id": "unique-id",
  "type": "workflow",
  "position": { "x": number, "y": number },
  "data": {
    "label": "Display Name",
    "nodeType": "trigger|action|condition|database|api|ui|agent|notification",
    "description": "Brief description of what this node does",
    "config": { optional configuration }
  }
}

## Edge Structure
Each edge connects nodes:
{
  "id": "edge-id",
  "source": "source-node-id",
  "target": "target-node-id",
  "animated": true,
  "label": "optional label for conditions"
}

## Layout Guidelines
- Start triggers at y=0
- Increment y by 100 for sequential nodes
- Center nodes at x=300
- For parallel branches: left=100, center=300, right=500
- For conditions: add "label" to edges ("Yes", "No", etc.)

## Example Response
{
  "name": "Social Media Content Workflow",
  "nodes": [
    { "id": "trigger-1", "type": "workflow", "position": { "x": 300, "y": 0 }, "data": { "label": "Content Request", "nodeType": "trigger", "description": "User requests content creation" }},
    { "id": "action-1", "type": "workflow", "position": { "x": 300, "y": 100 }, "data": { "label": "Generate Content", "nodeType": "agent", "description": "AI generates post copy" }}
  ],
  "edges": [
    { "id": "e1", "source": "trigger-1", "target": "action-1", "animated": true }
  ]
}

Respond ONLY with valid JSON. No markdown, no explanations.`;

    const userPrompt = `Create a visual workflow for: ${body.prompt}

Generate a complete workflow with appropriate nodes and edges. Include all necessary steps from start to finish.`;

    try {
      const gateway = createGateway();
      const agentConfig = await getAgentProviderConfig(body.projectId, 'architect');

      const response = await gateway.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          provider: agentConfig.provider,
          model: agentConfig.model,
          temperature: 0.7,
          maxTokens: 4000,
        }
      );

      // Parse the workflow JSON from response
      let workflowData;
      try {
        // Try to extract JSON from the response
        let jsonStr = response.content.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        workflowData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Failed to parse workflow JSON:', parseError);
        console.error('Raw response:', response.content);
        return reply.status(400).send({
          error: 'Failed to parse workflow',
          message: 'The AI generated an invalid workflow format. Please try again.',
          rawResponse: response.content,
        });
      }

      // Validate the workflow structure
      if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
        return reply.status(400).send({
          error: 'Invalid workflow',
          message: 'Workflow must contain a "nodes" array',
        });
      }
      if (!workflowData.edges || !Array.isArray(workflowData.edges)) {
        workflowData.edges = [];
      }

      return {
        success: true,
        workflow: {
          name: workflowData.name || 'Generated Workflow',
          nodes: workflowData.nodes,
          edges: workflowData.edges,
        },
      };
    } catch (error: any) {
      console.error('Workflow generation error:', error);
      return reply.status(500).send({
        error: 'Workflow generation failed',
        message: error?.message || 'Unknown error',
      });
    }
  });

  // ============================================
  // AGENT COPILOT ENDPOINTS
  // ============================================

  const agentsChatSchema = z.object({
    message: z.string().min(1),
    projectId: z.string().optional(),
    agentContext: z.object({
      agents: z.array(z.object({
        name: z.string(),
        displayName: z.string(),
        description: z.string().optional(),
        status: z.enum(['active', 'byoa', 'inactive']),
        provider: z.string().optional(),
        model: z.string().optional(),
        temperature: z.number().optional(),
        maxTokens: z.number().optional(),
        lanes: z.array(z.string()).optional(),
      })),
      projectType: z.string().optional(),
      credentials: z.array(z.object({
        provider: z.string(),
        status: z.string(),
        assignedAgents: z.array(z.string()),
      })),
    }),
  });

  /**
   * Agent CoPilot Chat - AI-powered agent configuration assistant
   */
  app.post('/agents/chat', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const parseResult = agentsChatSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Invalid request body', details: parseResult.error.issues });
    }

    const body = parseResult.data;

    try {
      const { analyzeAgents } = await import('../lib/agent-analyzer.js');
      const { AGENT_COPILOT_SYSTEM_PROMPT, buildAgentContextPrompt } = await import('../lib/agent-copilot-prompts.js');

      // Build context from agent configuration
      const contextPrompt = buildAgentContextPrompt({
        agents: body.agentContext.agents.map(a => ({
          name: a.name,
          displayName: a.displayName,
          status: a.status,
          provider: a.provider,
          model: a.model,
          temperature: a.temperature,
        })),
        projectType: body.agentContext.projectType,
        credentials: body.agentContext.credentials,
      });

      // Get analysis for context
      const analysis = analyzeAgents(
        body.agentContext.agents.map(a => ({
          name: a.name,
          displayName: a.displayName,
          description: a.description || '',
          status: a.status,
          provider: a.provider,
          model: a.model,
          temperature: a.temperature,
          maxTokens: a.maxTokens,
          lanes: a.lanes,
        })),
        body.agentContext.projectType
      );

      const gateway = createGateway();
      const agentConfig = await getAgentProviderConfig(body.projectId, 'ceo_copilot');

      const messages = [
        { role: 'system' as const, content: AGENT_COPILOT_SYSTEM_PROMPT + '\n\n' + contextPrompt },
        { role: 'user' as const, content: body.message },
      ];

      const response = await gateway.chat(messages, {
        provider: agentConfig.provider,
        model: agentConfig.model,
        temperature: 0.7,
        maxTokens: 2048,
      });

      // Try to parse recommendations from response
      let recommendations = [];
      let actions = [];

      try {
        const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          recommendations = parsed.recommendations || [];
          actions = parsed.actions || [];
        }
      } catch {
        // If no JSON found, use analysis recommendations
        recommendations = analysis.recommendations;
      }

      return {
        message: {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.content.replace(/```json[\s\S]*?```/g, '').trim(),
          timestamp: new Date(),
        },
        recommendations,
        actions,
        analysis: body.message.toLowerCase().includes('analyze') ? analysis : undefined,
      };
    } catch (error: any) {
      console.error('Agent CoPilot chat error:', error);
      return reply.status(500).send({
        error: 'Agent CoPilot failed',
        message: error?.message || 'Unknown error',
      });
    }
  });

  /**
   * Analyze agent configuration
   */
  app.post('/agents/analyze', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = request.body as {
      projectId?: string;
      agents: Array<{
        name: string;
        displayName: string;
        description?: string;
        status: 'active' | 'byoa' | 'inactive';
        provider?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
        lanes?: string[];
      }>;
      projectType?: string;
    };

    try {
      const { analyzeAgents } = await import('../lib/agent-analyzer.js');

      const analysis = analyzeAgents(
        body.agents.map(a => ({
          name: a.name,
          displayName: a.displayName,
          description: a.description || '',
          status: a.status,
          provider: a.provider,
          model: a.model,
          temperature: a.temperature,
          maxTokens: a.maxTokens,
          lanes: a.lanes,
        })),
        body.projectType
      );

      return { analysis };
    } catch (error: any) {
      console.error('Agent analysis error:', error);
      return reply.status(500).send({
        error: 'Agent analysis failed',
        message: error?.message || 'Unknown error',
      });
    }
  });

  /**
   * Get agent recommendations based on project type
   */
  app.post('/agents/recommend', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = request.body as {
      projectId?: string;
      projectType?: string;
      agents: Array<{
        name: string;
        displayName: string;
        status: 'active' | 'byoa' | 'inactive';
      }>;
    };

    try {
      const { analyzeAgents, getOptimalSettings } = await import('../lib/agent-analyzer.js');

      // Get recommendations based on project type
      const fullAgents = body.agents.map(a => ({
        name: a.name,
        displayName: a.displayName,
        description: '',
        status: a.status,
        provider: undefined,
        model: undefined,
        temperature: undefined,
        maxTokens: undefined,
        lanes: undefined,
      }));

      const analysis = analyzeAgents(fullAgents, body.projectType);

      // Enhance recommendations with optimal settings
      const recommendations = analysis.recommendations.map(rec => ({
        ...rec,
        suggestedSettings: getOptimalSettings(rec.agentName),
      }));

      return { recommendations };
    } catch (error: any) {
      console.error('Agent recommendation error:', error);
      return reply.status(500).send({
        error: 'Agent recommendation failed',
        message: error?.message || 'Unknown error',
      });
    }
  });

  /**
   * Bulk configure agents
   */
  app.post('/agents/bulk-configure', async (request, reply) => {
    const user = (request as any).user;
    if (!user) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const body = request.body as {
      projectId: string;
      configurations: Array<{
        agentName: string;
        provider?: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
      }>;
    };

    if (!body.projectId) {
      return reply.status(400).send({ error: 'Project ID is required' });
    }

    try {
      const results = [];

      for (const config of body.configurations) {
        // Find or create agent config
        const agent = await prisma.agent.findUnique({
          where: { name: config.agentName },
        });

        if (!agent) {
          results.push({ agentName: config.agentName, success: false, error: 'Agent not found' });
          continue;
        }

        // Upsert agent config
        await prisma.agentConfig.upsert({
          where: {
            projectId_agentId: {
              projectId: body.projectId,
              agentId: agent.id,
            },
          },
          update: {
            provider: config.provider,
            model: config.model,
          },
          create: {
            projectId: body.projectId,
            agentId: agent.id,
            provider: config.provider || 'anthropic',
            model: config.model || 'claude-sonnet-4-20250514',
          },
        });

        results.push({ agentName: config.agentName, success: true });
      }

      return { success: true, results };
    } catch (error: any) {
      console.error('Bulk configure error:', error);
      return reply.status(500).send({
        error: 'Bulk configuration failed',
        message: error?.message || 'Unknown error',
      });
    }
  });
};

/**
 * Generate card-specific instructions using CoPilot LLM
 */
async function generateCardInstructions(
  projectId: string,
  project: { name: string; description: string | null; blueprint?: string | null },
  card: { title: string; description: string | null; type: string; priority: string; lane?: { name: string; laneNumber: number } | null },
  agentName: string
): Promise<string> {
  const gateway = createGateway();
  const agentConfig = await getAgentProviderConfig(projectId, 'ceo_copilot');

  const laneDescription = card.lane ? `Lane ${card.lane.laneNumber}: ${card.lane.name}` : 'Unknown Lane';

  const prompt = `You are the CEO CoPilot for AgentWorks, generating task-specific instructions for an AI agent.

PROJECT CONTEXT:
- Project: ${project.name}
- Description: ${project.description || 'No description available'}

CARD DETAILS:
- Title: ${card.title}
- Description: ${card.description || 'No description provided'}
- Type: ${card.type}
- Priority: ${card.priority}
- Lane: ${laneDescription}

ASSIGNED AGENT: ${agentName}

Generate clear, actionable instructions for the ${agentName} agent to complete this card.

Your instructions should include:
1. **Primary Objective**: A 1-2 sentence summary of what needs to be accomplished
2. **Specific Tasks**: 3-5 bullet points of concrete steps to complete
3. **Acceptance Criteria**: What defines "done" for this card
4. **Notes**: Any relevant context, patterns to follow, or constraints

Keep instructions concise but specific. Focus on actionable guidance that helps the agent succeed.

Output only the instructions, no additional commentary.`;

  try {
    const response = await gateway.chat(
      [
        { role: 'system', content: 'You are a technical project manager generating clear task instructions for AI developer agents.' },
        { role: 'user', content: prompt },
      ],
      {
        provider: agentConfig.provider,
        model: agentConfig.model,
        temperature: 0.7,
        maxTokens: 1000,
      }
    );

    return response.content || 'No instructions generated.';
  } catch (error) {
    console.error('Failed to generate instructions:', error);
    return `**Primary Objective**: Complete the ${card.title} task as specified.

**Specific Tasks**:
- Review the card description and requirements
- Implement the necessary changes
- Test your implementation
- Document any important decisions

**Acceptance Criteria**:
- All requirements from the description are met
- Code follows project patterns and conventions
- No regressions introduced

**Notes**: This is an auto-generated fallback. Please review and adjust as needed.`;
  }
}

interface CardTemplate {
  title: string;
  description: string;
  type: string;
  priority: string;
  laneNumber: number;
  assignedAgent?: string;
}

// Map lane numbers to default agents
const LANE_TO_AGENT: Record<number, string> = {
  0: 'ceo_copilot',    // Vision & Planning
  1: 'prd',            // PRD / MVP Definition
  2: 'research',       // Research
  3: 'architect',      // Architecture & Stack
  4: 'planner',        // Planning & Task Breakdown
  5: 'dev_backend',    // Build (backend/frontend determined by card type)
  6: 'dev_frontend',   // Build
  7: 'qa',             // Test & QA
  8: 'devops',         // Deploy
  9: 'docs',           // Docs & Training
  10: 'refactor',      // Learn & Optimize
};

/**
 * Orchestrate agent execution for auto-run cards.
 * Cards with autoRun agents are queued for execution in lane order.
 * Cards with high-risk agents (autoRun: false) are left in "Ready" status for human approval.
 */
async function orchestrateAutoRunAgents(
  project: { id: string; name: string; localPath: string | null; workspaceId: string },
  cards: { id: string; assignedAgent: string | null; status: string }[],
  userId: string
): Promise<void> {
  const orchestrator = getOrchestratorClient();

  // Filter to only auto-run cards with agents
  const autoRunCards = cards.filter(card => {
    if (!card.assignedAgent) return false;
    const agentMode = AGENT_EXECUTION_MODE[card.assignedAgent];
    return agentMode?.autoRun === true;
  });

  if (autoRunCards.length === 0) {
    console.log('No auto-run cards to orchestrate');
    return;
  }

  console.log(`Orchestrating ${autoRunCards.length} auto-run cards for project ${project.name}`);

  // Queue each auto-run card for execution
  // Note: We execute sequentially by lane order to respect dependencies
  for (const card of autoRunCards) {
    if (!card.assignedAgent) continue;

    try {
      console.log(`Queueing agent ${card.assignedAgent} for card ${card.id}`);

      await orchestrator.executeAgent({
        projectId: project.id,
        cardId: card.id,
        agentId: card.assignedAgent,
        workspaceId: project.workspaceId,
        userId,
      });

      // Update card status to Running
      await prisma.card.update({
        where: { id: card.id },
        data: { status: 'Running' },
      });
    } catch (error) {
      console.error(`Failed to queue agent for card ${card.id}:`, error);

      // Update card status to reflect the error
      await prisma.card.update({
        where: { id: card.id },
        data: {
          status: 'Error',
          reviewNotes: `Failed to start agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    }
  }
}

function generateCardsFromMVP(
  projectName: string,
  responses: PhaseData,
  lanes: { id: string; laneNumber: number; name: string }[]
): CardTemplate[] {
  const cards: CardTemplate[] = [];

  // NOTE: Document cards (Blueprint, PRD, MVP, Playbook) are now handled by the card state machine
  // in the generateAll() endpoint. This function only creates development task cards.
  // This prevents duplicate cards from being created.

  cards.push({
    title: 'Architecture Design',
    description: `Technical architecture based on:\n${(responses.architecture || '').slice(0, 300)}`,
    type: 'task',
    priority: 'High',
    laneNumber: 3,
    assignedAgent: 'architect',
  });

  cards.push({
    title: 'Database Schema Design',
    description: 'Design and implement database schema based on requirements.',
    type: 'task',
    priority: 'High',
    laneNumber: 3,
    assignedAgent: 'architect',
  });

  cards.push({
    title: 'API Design & Documentation',
    description: 'Design REST API endpoints and generate documentation.',
    type: 'task',
    priority: 'High',
    laneNumber: 3,
    assignedAgent: 'architect',
  });

  cards.push({
    title: 'Core Backend Implementation',
    description: 'Implement core backend services and business logic.',
    type: 'task',
    priority: 'High',
    laneNumber: 5,
    assignedAgent: 'dev_backend',
  });

  cards.push({
    title: 'Core Frontend Implementation',
    description: 'Implement core UI components and user flows.',
    type: 'task',
    priority: 'High',
    laneNumber: 5,
    assignedAgent: 'dev_frontend',
  });

  cards.push({
    title: 'Authentication & Authorization',
    description: 'Implement user authentication and role-based access control.',
    type: 'task',
    priority: 'High',
    laneNumber: 5,
    assignedAgent: 'dev_backend',
  });

  cards.push({
    title: 'Test Suite Setup',
    description: 'Set up testing infrastructure and write initial tests.',
    type: 'task',
    priority: 'Medium',
    laneNumber: 7,
    assignedAgent: 'qa',
  });

  cards.push({
    title: 'Deployment Pipeline',
    description: 'Configure CI/CD pipeline and deployment scripts.',
    type: 'task',
    priority: 'Medium',
    laneNumber: 8,
    assignedAgent: 'devops',
  });

  return cards;
}

function generateBlueprint(projectName: string, responses: PhaseData): string {
  return `# ${projectName} Blueprint

## Vision
${responses.vision || 'Not defined yet'}

## Problem Statement
${responses.welcome || 'Not defined yet'}

## Requirements
${responses.requirements || 'Not defined yet'}

## Goals & Success Metrics
${responses.goals || 'Not defined yet'}

## Team & Roles
${responses.roles || 'Not defined yet'}

## Technical Architecture
${responses.architecture || 'Not defined yet'}

---
Generated by AgentWorks CoPilot
`;
}

function generatePRD(projectName: string, responses: PhaseData): string {
  return `# ${projectName} - Product Requirements Document

## 1. Overview
${responses.welcome || 'Not defined yet'}

## 2. Vision & Goals
${responses.vision || 'Not defined yet'}

### Success Metrics
${responses.goals || 'Not defined yet'}

## 3. Functional Requirements
${responses.requirements || 'Not defined yet'}

## 4. User Stories
Based on the requirements above, implement the following user stories:

- As a user, I want to...
- As an admin, I want to...

## 5. Technical Requirements
${responses.architecture || 'Not defined yet'}

## 6. Team & Resources
${responses.roles || 'Not defined yet'}

---
Generated by AgentWorks CoPilot
`;
}

function generateMVP(projectName: string, responses: PhaseData): string {
  return `# ${projectName} - MVP Definition

## MVP Scope
Based on the project requirements, the following features are included in MVP:

### Core Features (Must Have)
- Feature 1: Core functionality
- Feature 2: Essential UI
- Feature 3: Basic authentication

### Nice to Have (Post-MVP)
- Advanced features
- Integrations
- Analytics

## Agent Playbook

| Feature | Agent | Lane | Priority |
|---------|-------|------|----------|
| Core Backend | Backend Agent | Lane 5 | P0 |
| Core UI | Frontend Agent | Lane 5 | P0 |
| Database | DB Agent | Lane 4 | P0 |
| Testing | QA Agent | Lane 7 | P1 |

## Timeline Estimate
- Week 1-2: Architecture & Setup
- Week 3-4: Core Development
- Week 5: Testing & QA
- Week 6: Launch Prep

## Requirements Summary
${responses.requirements || 'Not defined yet'}

## Architecture Notes
${responses.architecture || 'Not defined yet'}

---
Generated by AgentWorks CoPilot
`;
}

function generatePlaybook(projectName: string, responses: PhaseData): string {
  return `# ${projectName} - Agent Playbook

## Overview
This playbook defines the agent execution plan for building ${projectName}.

## Agent Execution Order

### Phase 1: Planning & Architecture (Lane 0-3)
| Agent | Responsibility | Inputs | Outputs |
|-------|---------------|--------|---------|
| CEO CoPilot | Project oversight | Blueprint, PRD, MVP | Progress reports |
| Architect Agent | System design | Requirements | Architecture docs |
| Research Agent | Tech research | Requirements | Research briefs |

### Phase 2: Development (Lane 5-6)
| Agent | Responsibility | Inputs | Outputs |
|-------|---------------|--------|---------|
| Backend Agent | API & services | Architecture | Backend code |
| Frontend Agent | UI components | UX specs | Frontend code |
| DB Agent | Data layer | Schema design | Database code |

### Phase 3: Quality & Deploy (Lane 7-8)
| Agent | Responsibility | Inputs | Outputs |
|-------|---------------|--------|---------|
| QA Agent | Testing | Code | Test reports |
| DevOps Agent | Deployment | Tested code | Live system |

## Execution Rules

1. **Approval Gates**: Code-writing agents require human approval
2. **Auto-Run Agents**: Planning agents run automatically
3. **Dependencies**: Each lane depends on previous lane completion

## Agent Configuration

### Vision from Discovery
${responses.vision || 'Not defined yet'}

### Technical Architecture
${responses.architecture || 'Not defined yet'}

### Team Roles
${responses.roles || 'Not defined yet'}

---
Generated by AgentWorks CoPilot
`;
}
