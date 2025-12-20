import {
  createLogger,
  type Agent,
  type AgentName,
  AGENT_NAMES,
  DEFAULT_AGENT_TEMPERATURE,
  getMaxTokensForModel,
} from '@agentworks/shared';
import { getRedis } from './redis.js';
import { CLAUDE_CODE_SYSTEM_PROMPT } from '../agents/claude-code/index.js';
import { AGENT_SYSTEM_PROMPTS } from './agent-prompts.js';
import { AGENT_TOOL_ASSIGNMENTS } from './agent-tools.js';

const logger = createLogger('agent-orchestrator:agent-registry');

// Default agent configurations
// All agents use temperature=1.0 and maxTokens=0 (meaning: use model max)
// System prompts come from agent-prompts.ts, tools from agent-tools.ts
const DEFAULT_AGENTS: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'ceo_copilot',
    displayName: 'CEO CoPilot',
    description: 'Executive supervisor for entire project lifecycle - vision, strategy, and coordination',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.ceo_copilot,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0, // Use model max
  },
  {
    name: 'strategy',
    displayName: 'Strategy Agent',
    description: 'Strategic planning and business analysis',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.strategy,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'storyboard_ux',
    displayName: 'Storyboard UX',
    description: 'UX design and user journey mapping',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.storyboard_ux,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'prd',
    displayName: 'PRD Agent',
    description: 'Product requirements and documentation',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.prd,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'mvp_scope',
    displayName: 'MVP Scope',
    description: 'MVP definition and feature prioritization',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.mvp_scope,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'research',
    displayName: 'Research Agent',
    description: 'Market research and competitive analysis',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.research,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'architect',
    displayName: 'System Architect',
    description: 'Technical architecture and system design',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.architect,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'planner',
    displayName: 'Project Planner',
    description: 'Task breakdown and project planning',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.planner,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'code_standards',
    displayName: 'Code Standards',
    description: 'Code quality and standards enforcement',
    allowedLanes: [1, 2, 3, 4],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.code_standards,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'dev_backend',
    displayName: 'Backend Developer',
    description: 'Backend development and API implementation',
    allowedLanes: [1, 2, 3, 4],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.dev_backend,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'dev_frontend',
    displayName: 'Frontend Developer',
    description: 'Frontend development and UI implementation',
    allowedLanes: [1, 2, 3, 4],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.dev_frontend,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'devops',
    displayName: 'DevOps Engineer',
    description: 'Deployment and infrastructure management',
    allowedLanes: [3, 4, 5],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.devops,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'qa',
    displayName: 'QA Engineer',
    description: 'Quality assurance and testing',
    allowedLanes: [4],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.qa,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'docs',
    displayName: 'Documentation',
    description: 'Documentation and knowledge management',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.docs,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'refactor',
    displayName: 'Refactor Agent',
    description: 'Code refactoring and optimization',
    allowedLanes: [4, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.refactor,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'troubleshooter',
    displayName: 'Troubleshooter',
    description: 'Debugging and problem solving',
    allowedLanes: [4],
    defaultProvider: 'google',
    defaultModel: 'gemini-2.0-flash',
    systemPrompt: AGENT_SYSTEM_PROMPTS.troubleshooter,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'claude_code_agent',
    displayName: 'Claude Code Agent',
    description: 'Full-featured coding agent with file, terminal, docs, and Kanban integration',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: CLAUDE_CODE_SYSTEM_PROMPT,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'cms_wordpress',
    displayName: 'WordPress CMS Agent',
    description: 'Expert WordPress developer for themes, plugins, Gutenberg blocks, WooCommerce, and deployment',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.cms_wordpress,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
  {
    name: 'design_ux',
    displayName: 'Design UX Agent',
    description: 'Visual design for workflows, UI mockups, and user experience',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: AGENT_SYSTEM_PROMPTS.design_ux,
    temperature: DEFAULT_AGENT_TEMPERATURE,
    maxTokens: 0,
  },
];

export async function initializeAgentRegistry(): Promise<void> {
  try {
    const redis = getRedis();
    
    // Load default agents into Redis
    for (const agent of DEFAULT_AGENTS) {
      const agentData = {
        ...agent,
        id: `agent-${agent.name}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await redis.hSet('agents', agent.name, JSON.stringify(agentData));
    }
    
    logger.info('Agent registry initialized', { agentCount: DEFAULT_AGENTS.length });
  } catch (error) {
    logger.error('Failed to initialize agent registry', { error });
    throw error;
  }
}

// Normalize agent name: convert hyphens to underscores for consistency
function normalizeAgentName(name: string): string {
  return name.replace(/-/g, '_');
}

export async function getAgent(agentName: AgentName | string): Promise<Agent | null> {
  try {
    const redis = getRedis();
    // Normalize the name to use underscores (registry uses underscores)
    const normalizedName = normalizeAgentName(agentName);
    const agentData = await redis.hGet('agents', normalizedName);

    if (!agentData) {
      // Try the original name as fallback
      const fallbackData = await redis.hGet('agents', agentName);
      if (!fallbackData) {
        logger.warn('Agent not found', { agentName, normalizedName });
        return null;
      }
      return JSON.parse(fallbackData);
    }

    return JSON.parse(agentData);
  } catch (error) {
    logger.error('Failed to get agent', { error, agentName });
    return null;
  }
}

export async function getAllAgents(): Promise<Agent[]> {
  try {
    const redis = getRedis();
    const agentsData = await redis.hGetAll('agents');
    
    return Object.values(agentsData).map(data => JSON.parse(data));
  } catch (error) {
    logger.error('Failed to get all agents', { error });
    return [];
  }
}

export async function getAgentsForLane(laneNumber: number): Promise<Agent[]> {
  try {
    const allAgents = await getAllAgents();
    
    return allAgents.filter(agent => agent.allowedLanes.includes(laneNumber));
  } catch (error) {
    logger.error('Failed to get agents for lane', { error, laneNumber });
    return [];
  }
}

export async function updateAgent(agentName: AgentName, updates: Partial<Agent>): Promise<Agent | null> {
  try {
    const redis = getRedis();
    const existingAgent = await getAgent(agentName);
    
    if (!existingAgent) {
      return null;
    }
    
    const updatedAgent = {
      ...existingAgent,
      ...updates,
      updatedAt: new Date(),
    };
    
    await redis.hSet('agents', agentName, JSON.stringify(updatedAgent));
    
    logger.info('Agent updated', { agentName, updates });
    return updatedAgent;
  } catch (error) {
    logger.error('Failed to update agent', { error, agentName });
    return null;
  }
}

export async function isAgentAllowedInLane(agentName: AgentName, laneNumber: number): Promise<boolean> {
  try {
    const agent = await getAgent(agentName);
    
    if (!agent) {
      return false;
    }
    
    return agent.allowedLanes.includes(laneNumber);
  } catch (error) {
    logger.error('Failed to check agent lane permission', { error, agentName, laneNumber });
    return false;
  }
}

export function validateAgentName(name: string): name is AgentName {
  return AGENT_NAMES.includes(name as AgentName);
}