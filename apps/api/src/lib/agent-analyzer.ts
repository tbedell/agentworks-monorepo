/**
 * Agent Analyzer
 *
 * Logic for analyzing agent configurations and generating recommendations.
 */

interface AgentInfo {
  name: string;
  displayName: string;
  description: string;
  status: 'active' | 'byoa' | 'inactive';
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  lanes?: string[];
}

interface AgentAnalysis {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  byoaAgents: number;
  misconfigurations: AgentMisconfiguration[];
  recommendations: AgentRecommendation[];
  summary: string;
}

interface AgentMisconfiguration {
  agentName: string;
  displayName: string;
  issue: string;
  severity: 'warning' | 'error';
  suggestion: string;
}

interface AgentRecommendation {
  agentName: string;
  displayName: string;
  reason: string;
  suggestedSettings?: {
    temperature?: number;
    maxTokens?: number;
    provider?: string;
    model?: string;
  };
  priority: 'essential' | 'recommended' | 'optional';
}

// Optimal temperature ranges by agent type
const TEMPERATURE_RECOMMENDATIONS: Record<string, { min: number; max: number; optimal: number }> = {
  // Code agents - precise
  dev_backend: { min: 0.1, max: 0.4, optimal: 0.2 },
  dev_frontend: { min: 0.2, max: 0.5, optimal: 0.3 },
  architect: { min: 0.2, max: 0.5, optimal: 0.3 },
  qa: { min: 0.1, max: 0.3, optimal: 0.2 },
  code_standards: { min: 0.1, max: 0.3, optimal: 0.2 },
  troubleshooter: { min: 0.2, max: 0.4, optimal: 0.3 },
  devops: { min: 0.1, max: 0.4, optimal: 0.2 },
  refactor: { min: 0.1, max: 0.4, optimal: 0.2 },
  cms_wordpress: { min: 0.1, max: 0.4, optimal: 0.2 },
  claude_code_agent: { min: 0.1, max: 0.4, optimal: 0.2 },

  // Balanced agents
  prd: { min: 0.3, max: 0.6, optimal: 0.5 },
  mvp_scope: { min: 0.3, max: 0.6, optimal: 0.5 },
  planner: { min: 0.3, max: 0.5, optimal: 0.4 },
  docs: { min: 0.4, max: 0.6, optimal: 0.5 },
  research: { min: 0.4, max: 0.7, optimal: 0.6 },

  // Creative agents
  ceo_copilot: { min: 0.5, max: 0.8, optimal: 0.7 },
  strategy: { min: 0.5, max: 0.9, optimal: 0.8 },
  storyboard_ux: { min: 0.5, max: 0.8, optimal: 0.7 },
  design_ux: { min: 0.5, max: 0.8, optimal: 0.7 },
};

// Best providers for each agent type
const PROVIDER_RECOMMENDATIONS: Record<string, { preferred: string; acceptable: string[] }> = {
  // Claude excels at code
  dev_backend: { preferred: 'anthropic', acceptable: ['openai'] },
  dev_frontend: { preferred: 'anthropic', acceptable: ['openai'] },
  architect: { preferred: 'anthropic', acceptable: ['openai'] },
  qa: { preferred: 'anthropic', acceptable: ['openai'] },
  devops: { preferred: 'anthropic', acceptable: ['openai'] },
  refactor: { preferred: 'anthropic', acceptable: ['openai'] },
  code_standards: { preferred: 'anthropic', acceptable: ['openai'] },
  cms_wordpress: { preferred: 'anthropic', acceptable: ['openai'] },
  claude_code_agent: { preferred: 'anthropic', acceptable: [] },

  // GPT-4 good for planning/docs
  prd: { preferred: 'openai', acceptable: ['anthropic'] },
  mvp_scope: { preferred: 'openai', acceptable: ['anthropic'] },
  planner: { preferred: 'openai', acceptable: ['anthropic'] },
  docs: { preferred: 'openai', acceptable: ['anthropic'] },
  strategy: { preferred: 'openai', acceptable: ['anthropic'] },
  storyboard_ux: { preferred: 'openai', acceptable: ['anthropic'] },
  design_ux: { preferred: 'openai', acceptable: ['anthropic'] },
  ceo_copilot: { preferred: 'anthropic', acceptable: ['openai'] },
  research: { preferred: 'openai', acceptable: ['anthropic', 'google'] },

  // Gemini good for troubleshooting
  troubleshooter: { preferred: 'google', acceptable: ['anthropic', 'openai'] },
};

// Essential agents by project type
const PROJECT_TYPE_ESSENTIAL_AGENTS: Record<string, string[]> = {
  saas: ['ceo_copilot', 'architect', 'dev_backend', 'dev_frontend', 'qa'],
  wordpress: ['ceo_copilot', 'architect', 'cms_wordpress', 'dev_frontend', 'qa'],
  ecommerce: ['ceo_copilot', 'architect', 'dev_backend', 'dev_frontend', 'qa', 'devops'],
  mobile: ['ceo_copilot', 'architect', 'dev_backend', 'dev_frontend', 'design_ux', 'qa'],
  api: ['ceo_copilot', 'architect', 'dev_backend', 'qa', 'devops'],
  custom: ['ceo_copilot'],
};

const PROJECT_TYPE_RECOMMENDED_AGENTS: Record<string, string[]> = {
  saas: ['strategy', 'prd', 'mvp_scope', 'planner', 'devops', 'docs'],
  wordpress: ['design_ux', 'storyboard_ux', 'docs'],
  ecommerce: ['strategy', 'prd', 'mvp_scope', 'design_ux', 'docs'],
  mobile: ['storyboard_ux', 'prd', 'planner', 'docs'],
  api: ['prd', 'planner', 'docs', 'refactor'],
  custom: ['architect', 'planner'],
};

export function analyzeAgents(
  agents: AgentInfo[],
  projectType?: string
): AgentAnalysis {
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const byoaAgents = agents.filter(a => a.status === 'byoa').length;
  const inactiveAgents = agents.filter(a => a.status === 'inactive').length;

  const misconfigurations: AgentMisconfiguration[] = [];
  const recommendations: AgentRecommendation[] = [];

  // Check each active agent for misconfigurations
  for (const agent of agents) {
    if (agent.status === 'inactive') continue;

    // Check temperature
    const tempRec = TEMPERATURE_RECOMMENDATIONS[agent.name];
    if (tempRec && agent.temperature !== undefined) {
      if (agent.temperature < tempRec.min) {
        misconfigurations.push({
          agentName: agent.name,
          displayName: agent.displayName,
          issue: `Temperature (${agent.temperature}) is too low for ${agent.name}`,
          severity: 'warning',
          suggestion: `Increase temperature to ${tempRec.optimal} for better results`,
        });
      } else if (agent.temperature > tempRec.max) {
        misconfigurations.push({
          agentName: agent.name,
          displayName: agent.displayName,
          issue: `Temperature (${agent.temperature}) is too high for ${agent.name}`,
          severity: 'warning',
          suggestion: `Decrease temperature to ${tempRec.optimal} for more consistent results`,
        });
      }
    }

    // Check provider
    const providerRec = PROVIDER_RECOMMENDATIONS[agent.name];
    if (providerRec && agent.provider) {
      if (agent.provider !== providerRec.preferred && !providerRec.acceptable.includes(agent.provider)) {
        misconfigurations.push({
          agentName: agent.name,
          displayName: agent.displayName,
          issue: `${agent.provider} is not optimal for ${agent.name}`,
          severity: 'warning',
          suggestion: `Consider using ${providerRec.preferred} for better performance`,
        });
      }
    }
  }

  // Generate recommendations for inactive essential agents
  if (projectType && PROJECT_TYPE_ESSENTIAL_AGENTS[projectType]) {
    const essentialAgents = PROJECT_TYPE_ESSENTIAL_AGENTS[projectType];
    const recommendedAgents = PROJECT_TYPE_RECOMMENDED_AGENTS[projectType] || [];

    for (const agentName of essentialAgents) {
      const agent = agents.find(a => a.name === agentName);
      if (agent && agent.status === 'inactive') {
        const providerRec = PROVIDER_RECOMMENDATIONS[agentName];
        const tempRec = TEMPERATURE_RECOMMENDATIONS[agentName];

        recommendations.push({
          agentName,
          displayName: agent.displayName,
          reason: `Essential for ${projectType} development`,
          priority: 'essential',
          suggestedSettings: {
            provider: providerRec?.preferred || 'anthropic',
            model: providerRec?.preferred === 'openai' ? 'gpt-4-turbo' : 'claude-sonnet-4-20250514',
            temperature: tempRec?.optimal || 0.5,
          },
        });
      }
    }

    for (const agentName of recommendedAgents) {
      const agent = agents.find(a => a.name === agentName);
      if (agent && agent.status === 'inactive') {
        const providerRec = PROVIDER_RECOMMENDATIONS[agentName];
        const tempRec = TEMPERATURE_RECOMMENDATIONS[agentName];

        recommendations.push({
          agentName,
          displayName: agent.displayName,
          reason: `Recommended for better ${projectType} workflow`,
          priority: 'recommended',
          suggestedSettings: {
            provider: providerRec?.preferred || 'openai',
            model: providerRec?.preferred === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4-turbo',
            temperature: tempRec?.optimal || 0.5,
          },
        });
      }
    }
  }

  // Generate summary
  let summary = `Configuration Summary: ${activeAgents + byoaAgents} of ${totalAgents} agents are active`;
  if (byoaAgents > 0) {
    summary += ` (${byoaAgents} using BYOA credentials)`;
  }
  summary += '.';

  if (misconfigurations.length > 0) {
    summary += ` Found ${misconfigurations.length} configuration issue(s).`;
  }

  if (recommendations.length > 0) {
    const essentialCount = recommendations.filter(r => r.priority === 'essential').length;
    if (essentialCount > 0) {
      summary += ` ${essentialCount} essential agent(s) need to be enabled.`;
    }
  }

  return {
    totalAgents,
    activeAgents: activeAgents + byoaAgents,
    inactiveAgents,
    byoaAgents,
    misconfigurations,
    recommendations,
    summary,
  };
}

export function getOptimalSettings(agentName: string): {
  provider: string;
  model: string;
  temperature: number;
} {
  const providerRec = PROVIDER_RECOMMENDATIONS[agentName];
  const tempRec = TEMPERATURE_RECOMMENDATIONS[agentName];

  const provider = providerRec?.preferred || 'anthropic';
  const model = provider === 'openai'
    ? 'gpt-4-turbo'
    : provider === 'google'
      ? 'gemini-1.5-pro'
      : 'claude-sonnet-4-20250514';
  const temperature = tempRec?.optimal || 0.5;

  return { provider, model, temperature };
}
