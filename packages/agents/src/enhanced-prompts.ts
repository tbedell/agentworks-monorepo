import type { AgentName } from '@agentworks/shared';

/**
 * Enhanced prompt sections for each agent.
 * These are appended to the base system prompts to provide:
 * - Tool capabilities
 * - Coordination points
 * - Documentation requirements
 */

export interface EnhancedPromptSection {
  tools: string[];
  coordination: {
    receivesFrom: string[];
    sendsTo: string[];
    collaboratesWith: string[];
  };
  documentation: {
    plan: string;
    task: string;
    todo: string;
  };
}

export const ENHANCED_PROMPT_SECTIONS: Record<AgentName, EnhancedPromptSection> = {
  ceo_copilot: {
    tools: ['read_file', 'list_files', 'validate_style', 'git_status', 'get_style_guide'],
    coordination: {
      receivesFrom: ['All agents (progress reports, blockers, questions)'],
      sendsTo: ['All agents (guidance, approvals, direction changes)'],
      collaboratesWith: ['Strategy (vision alignment)', 'Architect (technical decisions)', 'Planner (prioritization)'],
    },
    documentation: {
      plan: 'Strategic decisions, project vision updates, approval history',
      task: 'Key decisions made, guidance provided, reviews completed',
      todo: 'Pending approvals, blocked items, strategic questions',
    },
  },

  strategy: {
    tools: ['read_file', 'write_file', 'list_files'],
    coordination: {
      receivesFrom: ['CEO CoPilot (project vision, constraints)'],
      sendsTo: ['Storyboard/UX (strategy docs)', 'PRD (strategy alignment)', 'Research (research requests)'],
      collaboratesWith: ['CEO CoPilot (strategy approval)', 'Research (market data)'],
    },
    documentation: {
      plan: 'Strategy approach, positioning decisions, segment analysis',
      task: 'Market research completed, competitive analysis, feature prioritization',
      todo: 'Strategy gaps to fill, segments to validate, risks to assess',
    },
  },

  storyboard_ux: {
    tools: ['read_file', 'write_file', 'list_files'],
    coordination: {
      receivesFrom: ['Strategy (strategy docs, positioning)', 'CEO CoPilot (vision)'],
      sendsTo: ['PRD (UX specs, wireframes)', 'Dev Frontend (design specs)', 'QA (user flows for testing)'],
      collaboratesWith: ['Strategy (user needs)', 'Dev Frontend (implementation feasibility)'],
    },
    documentation: {
      plan: 'UX approach, design principles, accessibility standards',
      task: 'Screen designs completed, user flows documented, wireframes created',
      todo: 'Flows to design, screens to wireframe, usability gaps',
    },
  },

  prd: {
    tools: ['read_file', 'write_file', 'list_files'],
    coordination: {
      receivesFrom: ['Strategy (strategy)', 'Storyboard/UX (wireframes, user flows)'],
      sendsTo: ['MVP Scope (full PRD)', 'Architect (requirements)', 'Planner (feature specs)'],
      collaboratesWith: ['CEO CoPilot (requirement approval)', 'Strategy (alignment)'],
    },
    documentation: {
      plan: 'PRD structure, requirement categories, documentation standards',
      task: 'Requirements written, user stories completed, edge cases documented',
      todo: 'Missing specs, unclear requirements, stakeholder questions',
    },
  },

  mvp_scope: {
    tools: ['read_file', 'write_file', 'list_files'],
    coordination: {
      receivesFrom: ['PRD (full PRD)', 'CEO CoPilot (constraints, priorities)'],
      sendsTo: ['Planner (MVP scope)', 'All Dev Agents (MVP boundaries)', 'QA (MVP acceptance criteria)'],
      collaboratesWith: ['CEO CoPilot (scope decisions)', 'Planner (estimation input)'],
    },
    documentation: {
      plan: 'Scoping decisions, inclusion/exclusion rationale',
      task: 'Feature analysis completed, cards created, estimates gathered',
      todo: 'Scope questions, features to evaluate, trade-offs to decide',
    },
  },

  research: {
    tools: ['read_file', 'write_file', 'list_files', 'grep', 'find_files'],
    coordination: {
      receivesFrom: ['Architect (research requests)', 'CEO CoPilot (strategic questions)', 'Strategy (market research needs)'],
      sendsTo: ['Architect (technology research)', 'Strategy (competitive analysis)', 'Dev Agents (technology recommendations)'],
      collaboratesWith: ['Architect (technology evaluation)', 'Strategy (market analysis)'],
    },
    documentation: {
      plan: 'Research agenda, investigation priorities',
      task: 'Research findings, technology evaluations, recommendations made',
      todo: 'Pending research, technologies to evaluate, questions to answer',
    },
  },

  architect: {
    tools: ['read_file', 'write_file', 'list_files', 'validate_style', 'get_style_guide', 'grep', 'find_files', 'search_symbol'],
    coordination: {
      receivesFrom: ['PRD (requirements)', 'Research (technology research)', 'CEO CoPilot (constraints)'],
      sendsTo: ['Planner (architecture, task structure)', 'DevOps (infra design)', 'Dev Backend/Frontend (tech decisions)', 'Code Standards (language decisions)'],
      collaboratesWith: ['Research (technology evaluation)', 'Code Standards (conventions)', 'DevOps (infrastructure)'],
    },
    documentation: {
      plan: 'Architecture decisions, technology choices, design patterns',
      task: 'Design work completed, ADRs written, diagrams created',
      todo: 'Design gaps, decisions to make, patterns to evaluate',
    },
  },

  code_standards: {
    tools: ['read_file', 'write_file', 'list_files', 'validate_style', 'get_style_guide', 'generate_style_configs', 'run_linter', 'grep'],
    coordination: {
      receivesFrom: ['Architect (language decisions)', 'All Dev Agents (code for review)'],
      sendsTo: ['All Dev Agents (style guide)', 'QA (validation rules)', 'DevOps (linter configs)'],
      collaboratesWith: ['Architect (standards alignment)', 'CEO CoPilot (standards approval)'],
    },
    documentation: {
      plan: 'Standards philosophy, convention rationale, enforcement approach',
      task: 'Reviews completed, configs generated, violations documented',
      todo: 'Violations to fix, standards to define, configs to update',
    },
  },

  planner: {
    tools: ['read_file', 'write_file', 'list_files'],
    coordination: {
      receivesFrom: ['Architect (architecture)', 'MVP Scope (scope)', 'CEO CoPilot (priorities)'],
      sendsTo: ['All Dev Agents (task cards)', 'DevOps (deployment tasks)', 'QA (test tasks)'],
      collaboratesWith: ['Architect (technical breakdown)', 'MVP Scope (scope alignment)'],
    },
    documentation: {
      plan: 'Planning approach, estimation methodology, dependency tracking',
      task: 'Tasks created, dependencies mapped, estimates completed',
      todo: 'Blocking dependencies, tasks to break down, estimates needed',
    },
  },

  devops: {
    tools: ['read_file', 'write_file', 'list_files', 'run_tests', 'run_build', 'git_status', 'git_commit', 'git_push', 'git_create_branch'],
    coordination: {
      receivesFrom: ['Architect (infra design)', 'Planner (DevOps tasks)', 'QA (test environment needs)'],
      sendsTo: ['Dev Agents (deployment readiness, environment info)', 'QA (environment details)', 'Docs (runbooks)'],
      collaboratesWith: ['Architect (infrastructure decisions)', 'QA (test environments)'],
    },
    documentation: {
      plan: 'Infrastructure approach, deployment strategy, monitoring plan',
      task: 'Configs created, pipelines built, deployments completed',
      todo: 'Deployment blockers, infra tasks, monitoring gaps',
    },
  },

  dev_backend: {
    tools: ['read_file', 'write_file', 'update_file', 'list_files', 'delete_file', 'run_tests', 'run_linter', 'run_typecheck', 'validate_style', 'git_status', 'git_diff', 'grep', 'find_files', 'search_symbol'],
    coordination: {
      receivesFrom: ['Architect (design)', 'Planner (tasks)', 'Code Standards (style guide)'],
      sendsTo: ['Dev Frontend (API contracts)', 'QA (features for testing)', 'Docs (API documentation)'],
      collaboratesWith: ['Dev Frontend (API integration)', 'Code Standards (code review)', 'QA (bug fixes)'],
    },
    documentation: {
      plan: 'Implementation approach, API design decisions, testing strategy',
      task: 'Features built, tests written, APIs documented',
      todo: 'Pending work, bugs to fix, APIs to implement',
    },
  },

  dev_frontend: {
    tools: ['read_file', 'write_file', 'update_file', 'list_files', 'delete_file', 'run_tests', 'run_linter', 'run_typecheck', 'validate_style', 'git_status', 'git_diff', 'grep', 'find_files', 'search_symbol'],
    coordination: {
      receivesFrom: ['Storyboard/UX (designs)', 'Dev Backend (API contracts)', 'Code Standards (style guide)', 'Planner (tasks)'],
      sendsTo: ['QA (UI for testing)', 'Docs (component documentation)'],
      collaboratesWith: ['Storyboard/UX (design feedback)', 'Dev Backend (API integration)', 'Code Standards (code review)'],
    },
    documentation: {
      plan: 'UI approach, component architecture, state management strategy',
      task: 'Components built, tests written, integrations completed',
      todo: 'UI gaps, components to build, bugs to fix',
    },
  },

  qa: {
    tools: ['read_file', 'write_file', 'list_files', 'run_tests', 'run_linter', 'grep', 'find_files'],
    coordination: {
      receivesFrom: ['Dev Agents (features for testing)', 'Code Standards (validation rules)', 'PRD (acceptance criteria)'],
      sendsTo: ['Troubleshooter (bugs)', 'Dev Agents (test failures)', 'Docs (test documentation)'],
      collaboratesWith: ['Dev Agents (bug reproduction)', 'Planner (test task creation)'],
    },
    documentation: {
      plan: 'Testing strategy, coverage goals, test automation approach',
      task: 'Tests written, bugs found, coverage measured',
      todo: 'Test gaps, bugs to verify, coverage to improve',
    },
  },

  troubleshooter: {
    tools: ['read_file', 'write_file', 'list_files', 'run_tests', 'run_linter', 'run_typecheck', 'git_status', 'git_diff', 'git_log', 'grep', 'find_files', 'search_symbol'],
    coordination: {
      receivesFrom: ['QA (bugs)', 'Dev Agents (issues)', 'DevOps (deployment issues)'],
      sendsTo: ['Dev Agents (fix patches)', 'QA (fixes for verification)', 'Planner (bug cards)'],
      collaboratesWith: ['Dev Agents (code understanding)', 'DevOps (environment issues)'],
    },
    documentation: {
      plan: 'Debugging approach, investigation methodology',
      task: 'Issues resolved, root causes identified, fixes applied',
      todo: 'Open bugs, investigations in progress, fixes to verify',
    },
  },

  docs: {
    tools: ['read_file', 'write_file', 'list_files', 'grep', 'find_files'],
    coordination: {
      receivesFrom: ['All Agents (technical content)', 'PRD (requirements)', 'Architect (architecture)'],
      sendsTo: ['CEO CoPilot (docs review)', 'Users (published documentation)'],
      collaboratesWith: ['Dev Agents (technical accuracy)', 'QA (test documentation)'],
    },
    documentation: {
      plan: 'Documentation structure, style guide, publishing process',
      task: 'Docs written, reviews completed, updates published',
      todo: 'Docs gaps, sections to write, updates needed',
    },
  },

  refactor: {
    tools: ['read_file', 'write_file', 'update_file', 'list_files', 'run_tests', 'run_linter', 'run_typecheck', 'validate_style', 'git_status', 'git_diff', 'grep', 'find_files', 'search_symbol'],
    coordination: {
      receivesFrom: ['QA (quality issues)', 'Code Standards (violations)', 'Dev Agents (refactor requests)'],
      sendsTo: ['Dev Agents (refactored code)', 'QA (regression testing)', 'Code Standards (review)'],
      collaboratesWith: ['Code Standards (standards compliance)', 'Architect (architectural improvements)'],
    },
    documentation: {
      plan: 'Refactoring priorities, improvement areas, technical debt tracking',
      task: 'Refactors completed, improvements made, debt reduced',
      todo: 'Tech debt backlog, code smells to fix, optimizations to make',
    },
  },
};

/**
 * Build the enhanced section of a prompt for an agent.
 */
export function buildEnhancedPromptSection(agentName: AgentName): string {
  const section = ENHANCED_PROMPT_SECTIONS[agentName];
  if (!section) {
    return '';
  }

  return `

## Available Tools

You have access to the following tools:
${section.tools.map(t => `- \`${t}\``).join('\n')}

Use these tools to accomplish your tasks. Always verify changes with appropriate tests before committing.

## Coordination Points

**Receives From:**
${section.coordination.receivesFrom.map(r => `- ${r}`).join('\n')}

**Sends To:**
${section.coordination.sendsTo.map(s => `- ${s}`).join('\n')}

**Collaborates With:**
${section.coordination.collaboratesWith.map(c => `- ${c}`).join('\n')}

## Documentation Requirements

You are responsible for maintaining three documents for this project:

1. **Plan Document** (${agentName}_Plan.md): ${section.documentation.plan}
2. **Task Document** (${agentName}_Task.md): ${section.documentation.task}
3. **Todo Document** (${agentName}_Todo.md): ${section.documentation.todo}

Update these documents as you work to maintain context across sessions.
`;
}

/**
 * Get the full enhanced prompt for an agent (base + enhanced sections).
 */
export function getEnhancedSystemPrompt(
  agentName: AgentName,
  basePrompt: string,
  additionalContext?: string
): string {
  const enhancedSection = buildEnhancedPromptSection(agentName);

  let fullPrompt = basePrompt + enhancedSection;

  if (additionalContext) {
    fullPrompt += `\n\n## Current Context\n\n${additionalContext}`;
  }

  return fullPrompt;
}
