/**
 * Agent Presets
 *
 * Pre-configured agent setups for common project types.
 * Each preset defines which agents should be enabled and their optimal settings.
 */

import type { AgentPreset } from './types';

/**
 * SaaS Full-Stack Preset
 * Complete setup for building SaaS applications with frontend, backend, and infrastructure
 */
export const SAAS_FULLSTACK_PRESET: AgentPreset = {
  id: 'saas-fullstack',
  name: 'SaaS Full-Stack',
  description: 'Complete agent setup for full-stack SaaS development with architecture, backend, frontend, and DevOps',
  projectType: 'saas',
  icon: 'Layers',
  agents: [
    { name: 'ceo_copilot', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.7 },
    { name: 'strategy', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.8 },
    { name: 'storyboard_ux', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 },
    { name: 'prd', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'mvp_scope', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'research', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.6 },
    { name: 'architect', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3 },
    { name: 'planner', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.4 },
    { name: 'code_standards', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'dev_backend', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'dev_frontend', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3 },
    { name: 'devops', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'qa', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'troubleshooter', enabled: true, provider: 'google', model: 'gemini-1.5-pro', temperature: 0.3 },
    { name: 'docs', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'refactor', enabled: false, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'cms_wordpress', enabled: false },
    { name: 'design_ux', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 },
    { name: 'claude_code_agent', enabled: false },
  ],
};

/**
 * WordPress Theme/Plugin Preset
 * Focused on WordPress CMS development
 */
export const WORDPRESS_PRESET: AgentPreset = {
  id: 'wordpress-theme',
  name: 'WordPress Development',
  description: 'Specialized setup for WordPress theme and plugin development with PHP standards',
  projectType: 'wordpress',
  icon: 'Globe',
  agents: [
    { name: 'ceo_copilot', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.7 },
    { name: 'strategy', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 },
    { name: 'storyboard_ux', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 },
    { name: 'prd', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'mvp_scope', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'research', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.6 },
    { name: 'architect', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3 },
    { name: 'planner', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.4 },
    { name: 'code_standards', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'dev_backend', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'dev_frontend', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3 },
    { name: 'devops', enabled: false },
    { name: 'qa', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'troubleshooter', enabled: true, provider: 'google', model: 'gemini-1.5-pro', temperature: 0.3 },
    { name: 'docs', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'refactor', enabled: false },
    { name: 'cms_wordpress', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'design_ux', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 },
    { name: 'claude_code_agent', enabled: false },
  ],
};

/**
 * API-Only Backend Preset
 * Minimal setup for backend API development
 */
export const API_ONLY_PRESET: AgentPreset = {
  id: 'api-only',
  name: 'API Backend',
  description: 'Lean setup for pure backend/API development without frontend agents',
  projectType: 'api',
  icon: 'Server',
  agents: [
    { name: 'ceo_copilot', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.6 },
    { name: 'strategy', enabled: false },
    { name: 'storyboard_ux', enabled: false },
    { name: 'prd', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'mvp_scope', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'research', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.6 },
    { name: 'architect', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3 },
    { name: 'planner', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.4 },
    { name: 'code_standards', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'dev_backend', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'dev_frontend', enabled: false },
    { name: 'devops', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'qa', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'troubleshooter', enabled: true, provider: 'google', model: 'gemini-1.5-pro', temperature: 0.3 },
    { name: 'docs', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'refactor', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'cms_wordpress', enabled: false },
    { name: 'design_ux', enabled: false },
    { name: 'claude_code_agent', enabled: false },
  ],
};

/**
 * Mobile App Preset
 * Setup for mobile application development (React Native / Flutter)
 */
export const MOBILE_APP_PRESET: AgentPreset = {
  id: 'mobile-app',
  name: 'Mobile App',
  description: 'Optimized for React Native or Flutter mobile app development',
  projectType: 'mobile',
  icon: 'Smartphone',
  agents: [
    { name: 'ceo_copilot', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.7 },
    { name: 'strategy', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.8 },
    { name: 'storyboard_ux', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 },
    { name: 'prd', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'mvp_scope', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'research', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.6 },
    { name: 'architect', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3 },
    { name: 'planner', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.4 },
    { name: 'code_standards', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'dev_backend', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'dev_frontend', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3 },
    { name: 'devops', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'qa', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'troubleshooter', enabled: true, provider: 'google', model: 'gemini-1.5-pro', temperature: 0.3 },
    { name: 'docs', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'refactor', enabled: false },
    { name: 'cms_wordpress', enabled: false },
    { name: 'design_ux', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 },
    { name: 'claude_code_agent', enabled: false },
  ],
};

/**
 * E-commerce Preset
 * Setup for e-commerce platforms with payments, inventory, and storefront
 */
export const ECOMMERCE_PRESET: AgentPreset = {
  id: 'ecommerce',
  name: 'E-commerce',
  description: 'Complete setup for building online stores with payments and inventory management',
  projectType: 'ecommerce',
  icon: 'ShoppingCart',
  agents: [
    { name: 'ceo_copilot', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.7 },
    { name: 'strategy', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.8 },
    { name: 'storyboard_ux', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 },
    { name: 'prd', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'mvp_scope', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'research', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.6 },
    { name: 'architect', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3 },
    { name: 'planner', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.4 },
    { name: 'code_standards', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'dev_backend', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'dev_frontend', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.3 },
    { name: 'devops', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'qa', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.2 },
    { name: 'troubleshooter', enabled: true, provider: 'google', model: 'gemini-1.5-pro', temperature: 0.3 },
    { name: 'docs', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.5 },
    { name: 'refactor', enabled: false },
    { name: 'cms_wordpress', enabled: false },
    { name: 'design_ux', enabled: true, provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 },
    { name: 'claude_code_agent', enabled: false },
  ],
};

/**
 * Minimal / Custom Preset
 * Bare minimum agents for custom configuration
 */
export const MINIMAL_PRESET: AgentPreset = {
  id: 'minimal',
  name: 'Minimal (Custom)',
  description: 'Start with just the CEO CoPilot and add agents as needed',
  projectType: 'custom',
  icon: 'Sparkles',
  agents: [
    { name: 'ceo_copilot', enabled: true, provider: 'anthropic', model: 'claude-sonnet-4-20250514', temperature: 0.7 },
    { name: 'strategy', enabled: false },
    { name: 'storyboard_ux', enabled: false },
    { name: 'prd', enabled: false },
    { name: 'mvp_scope', enabled: false },
    { name: 'research', enabled: false },
    { name: 'architect', enabled: false },
    { name: 'planner', enabled: false },
    { name: 'code_standards', enabled: false },
    { name: 'dev_backend', enabled: false },
    { name: 'dev_frontend', enabled: false },
    { name: 'devops', enabled: false },
    { name: 'qa', enabled: false },
    { name: 'troubleshooter', enabled: false },
    { name: 'docs', enabled: false },
    { name: 'refactor', enabled: false },
    { name: 'cms_wordpress', enabled: false },
    { name: 'design_ux', enabled: false },
    { name: 'claude_code_agent', enabled: false },
  ],
};

/**
 * All available presets
 */
export const AGENT_PRESETS: AgentPreset[] = [
  SAAS_FULLSTACK_PRESET,
  WORDPRESS_PRESET,
  API_ONLY_PRESET,
  MOBILE_APP_PRESET,
  ECOMMERCE_PRESET,
  MINIMAL_PRESET,
];

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): AgentPreset | undefined {
  return AGENT_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get presets by project type
 */
export function getPresetsByType(projectType: string): AgentPreset[] {
  return AGENT_PRESETS.filter((preset) => preset.projectType === projectType);
}

/**
 * Get recommended preset for a project description
 * This is a simple keyword-based matcher; the CoPilot AI will provide smarter recommendations
 */
export function suggestPreset(description: string): AgentPreset {
  const lower = description.toLowerCase();

  if (lower.includes('wordpress') || lower.includes('wp') || lower.includes('theme') || lower.includes('plugin')) {
    return WORDPRESS_PRESET;
  }

  if (lower.includes('mobile') || lower.includes('react native') || lower.includes('flutter') || lower.includes('ios') || lower.includes('android')) {
    return MOBILE_APP_PRESET;
  }

  if (lower.includes('ecommerce') || lower.includes('e-commerce') || lower.includes('shop') || lower.includes('store') || lower.includes('payment')) {
    return ECOMMERCE_PRESET;
  }

  if (lower.includes('api') || lower.includes('backend') || lower.includes('microservice') || lower.includes('rest') || lower.includes('graphql')) {
    return API_ONLY_PRESET;
  }

  if (lower.includes('saas') || lower.includes('web app') || lower.includes('full-stack') || lower.includes('fullstack')) {
    return SAAS_FULLSTACK_PRESET;
  }

  // Default to SaaS for general projects
  return SAAS_FULLSTACK_PRESET;
}

/**
 * Count enabled agents in a preset
 */
export function countEnabledAgents(preset: AgentPreset): number {
  return preset.agents.filter((a) => a.enabled).length;
}
