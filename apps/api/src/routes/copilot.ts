import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '@agentworks/db';
import { z } from 'zod';
import { createGateway } from '@agentworks/ai-gateway';
import { AGENT_EXECUTION_MODE } from '@agentworks/shared';
import { lucia } from '../lib/auth.js';
import { getOrchestratorClient } from '../lib/orchestrator-client.js';
import { promises as fs } from 'fs';
import path from 'path';

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  context: z.string(),
  projectId: z.string().optional(),
  cardId: z.string().optional(),
  phase: z.enum(['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture', 'general']).optional(),
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
          // Get max position in lane
          const maxPos = await prisma.card.aggregate({
            where: { laneId: lane.id },
            _max: { position: true },
          });

          const card = await prisma.card.create({
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
          console.log('[CoPilot] SUCCESS - Created card:', card.id, '-', card.title);
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
    architecture: ['planning complete', 'blueprint', 'ready to generate', 'prd', 'complete', 'finished planning'],
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
  const phaseOrder = ['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture'];
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
  phase: z.enum(['welcome', 'vision', 'requirements', 'goals', 'roles', 'architecture']),
  response: z.string(),
});

const generateDocumentSchema = z.object({
  projectId: z.string(),
  documentType: z.enum(['blueprint', 'prd', 'mvp']),
});

const generateCardsSchema = z.object({
  projectId: z.string(),
});

type PhaseData = Record<string, string>;

// Helper function to save document to project filesystem
async function saveDocumentToFilesystem(
  localPath: string | null,
  docType: 'blueprint' | 'prd' | 'mvp',
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

Valid agents: frontend-agent, backend-agent, database-agent, qa-agent, devops-agent, architect-agent, research-agent, docs-agent, ceo-copilot
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

    // Call AI Gateway with OpenAI (CEO CoPilot uses gpt-4-turbo)
    let assistantResponse: string;
    try {
      const gateway = createGateway();
      const response = await gateway.chat(aiMessages, {
        provider: 'openai',
        model: 'gpt-4-turbo',
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

    return {
      success: true,
      doc,
      filesystem: filesystemResult,
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

      const maxPosition = await prisma.card.aggregate({
        where: { laneId: lane.id },
        _max: { position: true },
      });

      const createdCard = await prisma.card.create({
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

    // Call AI to review
    const gateway = createGateway();

    const completion = await gateway.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        provider: 'openai',
        model: 'gpt-4-turbo',
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

    // Generate instructions using LLM
    const instructions = await generateCardInstructions(project, card, card.assignedAgent || 'unknown');

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
};

/**
 * Generate card-specific instructions using CoPilot LLM
 */
async function generateCardInstructions(
  project: { name: string; description: string | null; blueprint?: string | null },
  card: { title: string; description: string | null; type: string; priority: string; lane?: { name: string; laneNumber: number } | null },
  agentName: string
): Promise<string> {
  const gateway = createGateway();

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
        provider: 'openai',
        model: 'gpt-4o',
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

  cards.push({
    title: `${projectName} - Blueprint`,
    description: `Project Blueprint document.\n\nVision: ${(responses.vision || '').slice(0, 200)}...`,
    type: 'document',
    priority: 'High',
    laneNumber: 0,
    assignedAgent: 'ceo_copilot',
  });

  cards.push({
    title: `${projectName} - PRD`,
    description: `Product Requirements Document.\n\nRequirements: ${(responses.requirements || '').slice(0, 200)}...`,
    type: 'document',
    priority: 'High',
    laneNumber: 1,
    assignedAgent: 'prd',
  });

  cards.push({
    title: `${projectName} - MVP Scope`,
    description: 'MVP feature scope and definition.',
    type: 'document',
    priority: 'High',
    laneNumber: 1,
    assignedAgent: 'mvp_scope',
  });

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
