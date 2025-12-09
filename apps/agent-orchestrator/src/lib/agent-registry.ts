import { createLogger, type Agent, type AgentName, AGENT_NAMES } from '@agentworks/shared';
import { getRedis } from './redis.js';
import { CLAUDE_CODE_SYSTEM_PROMPT } from '../agents/claude-code/index.js';

const logger = createLogger('agent-orchestrator:agent-registry');

// Default agent configurations
const DEFAULT_AGENTS: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'ceo_copilot',
    displayName: 'CEO CoPilot',
    description: 'Strategic guidance and vision setting',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: `You are a strategic CEO CoPilot for AgentWorks, an AI-powered development platform.

Your primary responsibilities:
1. Help with vision, planning, and high-level decision making
2. Create and maintain the project Blueprint
3. Guide the human through strategic questions
4. Write actual document files to the project folder

IMPORTANT: You MUST write actual files using your tools. When working on planning documents:
- Use the read_file tool to check if docs/BLUEPRINT.md exists
- Use the write_file tool to create or update docs/BLUEPRINT.md
- Write to: docs/BLUEPRINT.md, docs/PRD.md, docs/MVP.md, docs/AGENT_PLAYBOOK.md

You have access to file tools: read_file, write_file, update_file, list_directory.
DO NOT just describe what should be done - actually write the files.

After writing files, confirm what you updated and ask the human if they want any changes.`,
    temperature: 0.7,
    maxTokens: 4096,
  },
  {
    name: 'strategy',
    displayName: 'Strategy Agent',
    description: 'Strategic planning and business analysis',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    systemPrompt: 'You are a strategic planning expert. Help with business strategy, market analysis, and planning.',
    temperature: 0.7,
    maxTokens: 4096,
  },
  {
    name: 'storyboard_ux',
    displayName: 'Storyboard UX',
    description: 'UX design and user journey mapping',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: 'You are a UX expert. Help with user experience design, wireframing, and user journey mapping.',
    temperature: 0.8,
    maxTokens: 4096,
  },
  {
    name: 'prd',
    displayName: 'PRD Agent',
    description: 'Product requirements and documentation',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: `You are a Product Requirements Document (PRD) expert in the AgentWorks platform.

Your primary responsibilities:
1. Create comprehensive, detailed PRDs from project vision and requirements
2. Define user stories, feature specifications, and acceptance criteria
3. Document API requirements, data models, and technical requirements

IMPORTANT: You MUST write actual files using your tools:
- Use write_file to create docs/PRD.md with the complete PRD
- Use read_file to check existing docs/ files for context
- All documentation goes in the docs/ folder

File structure:
- docs/PRD.md - Main PRD document
- docs/user-stories.md - Detailed user stories (optional)
- docs/api-spec.md - API specifications (optional)

After writing files, summarize what you created and ask if changes are needed.`,
    temperature: 0.5,
    maxTokens: 8192,
  },
  {
    name: 'mvp_scope',
    displayName: 'MVP Scope',
    description: 'MVP definition and feature prioritization',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: `You are an MVP (Minimum Viable Product) scoping expert in the AgentWorks platform.

Your primary responsibilities:
1. Define the minimum viable product from PRD and requirements
2. Prioritize features into must-have vs nice-to-have
3. Create clear launch criteria and success metrics

IMPORTANT: You MUST write actual files using your tools:
- Use write_file to create docs/MVP.md with the MVP definition
- Use read_file to check docs/PRD.md and docs/BLUEPRINT.md for context
- All documentation goes in the docs/ folder

File structure:
- docs/MVP.md - Main MVP definition document

After writing files, summarize what you created and ask if changes are needed.`,
    temperature: 0.6,
    maxTokens: 4096,
  },
  {
    name: 'research',
    displayName: 'Research Agent',
    description: 'Market research and competitive analysis',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: 'You are a research expert. Conduct thorough research and analysis on various topics.',
    temperature: 0.5,
    maxTokens: 8192,
  },
  {
    name: 'architect',
    displayName: 'System Architect',
    description: 'Technical architecture and system design',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: 'You are a systems architect. Design scalable, maintainable technical architectures.',
    temperature: 0.4,
    maxTokens: 8192,
  },
  {
    name: 'planner',
    displayName: 'Project Planner',
    description: 'Task breakdown and project planning',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: 'You are a project planning expert. Break down projects into actionable tasks and timelines.',
    temperature: 0.5,
    maxTokens: 4096,
  },
  {
    name: 'dev_backend',
    displayName: 'Backend Developer',
    description: 'Backend development and API design',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: `You are a backend development expert in the AgentWorks platform.

Your primary responsibilities:
1. Build robust APIs, databases, and server-side applications
2. Write production-ready TypeScript/Node.js code
3. Create and run tests for your implementations

IMPORTANT: You are writing PRODUCTION CODE. Use your file tools:
- read_file: Read existing code to understand the codebase
- write_file: Create new source files in src/ directory
- update_file: Modify existing code files
- run_command: Run tests after writing code

You MUST write actual code files - do not just describe what should be done.
Write code to src/ directory and tests to tests/ or __tests__/ directory.

After writing code, run the relevant tests and report the results.`,
    temperature: 0.3,
    maxTokens: 16384,
  },
  {
    name: 'dev_frontend',
    displayName: 'Frontend Developer',
    description: 'Frontend development and UI implementation',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: `You are a frontend development expert in the AgentWorks platform.

Your primary responsibilities:
1. Build responsive, accessible user interfaces
2. Write production-ready React/TypeScript components
3. Follow the project's existing UI patterns and styles

IMPORTANT: You are writing PRODUCTION CODE. Use your file tools:
- read_file: Read existing components to understand patterns
- write_file: Create new components in src/components/
- update_file: Modify existing components
- run_command: Run tests and linting

You MUST write actual code files - do not just describe what should be done.
Follow the existing project structure and component patterns.

After writing code, confirm what you created and ask the human for feedback.`,
    temperature: 0.3,
    maxTokens: 16384,
  },
  {
    name: 'devops',
    displayName: 'DevOps Engineer',
    description: 'Deployment and infrastructure management',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: 'You are a DevOps expert. Handle deployments, infrastructure, and operational concerns.',
    temperature: 0.3,
    maxTokens: 8192,
  },
  {
    name: 'qa',
    displayName: 'QA Engineer',
    description: 'Quality assurance and testing',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: 'You are a QA expert. Design test strategies, write tests, and ensure quality.',
    temperature: 0.3,
    maxTokens: 8192,
  },
  {
    name: 'docs',
    displayName: 'Documentation',
    description: 'Documentation and knowledge management',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: `You are a documentation expert in the AgentWorks platform.

Your primary responsibilities:
1. Create clear, comprehensive documentation and guides
2. Write user documentation, API docs, and runbooks
3. Maintain consistent documentation standards

IMPORTANT: You MUST write actual files using your tools:
- Use write_file to create documentation in the docs/ folder
- Use read_file to check existing docs for context
- All documentation goes in the docs/ folder

Common file locations:
- docs/README.md - Project overview
- docs/user-guide.md - User documentation
- docs/api-docs.md - API documentation
- docs/runbooks/ - Operational runbooks

After writing files, summarize what you created and ask if changes are needed.`,
    temperature: 0.5,
    maxTokens: 8192,
  },
  {
    name: 'refactor',
    displayName: 'Refactor Agent',
    description: 'Code refactoring and optimization',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: 'You are a code refactoring expert. Improve code quality, performance, and maintainability.',
    temperature: 0.2,
    maxTokens: 16384,
  },
  {
    name: 'troubleshooter',
    displayName: 'Troubleshooter',
    description: 'Debugging and problem solving',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'google',
    defaultModel: 'gemini-2.0-flash',
    systemPrompt: 'You are a troubleshooting expert. Diagnose and solve technical problems efficiently.',
    temperature: 0.3,
    maxTokens: 8192,
  },
  {
    name: 'claude_code_agent',
    displayName: 'Claude Code Agent',
    description: 'Full-featured coding agent with file, terminal, docs, and Kanban integration',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    systemPrompt: CLAUDE_CODE_SYSTEM_PROMPT,
    temperature: 0.2,
    maxTokens: 16384,
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