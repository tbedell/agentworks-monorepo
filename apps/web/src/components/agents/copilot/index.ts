/**
 * Agent CoPilot Components
 *
 * Intelligent agent management with AI-powered recommendations and presets.
 */

export { AgentCoPilotPanel } from './AgentCoPilotPanel';
export { AgentRecommendationCard } from './AgentRecommendationCard';
export { AgentPresetSelector } from './AgentPresetSelector';

// Types
export type {
  AgentRecommendation,
  AgentPreset,
  PresetAgentConfig,
  ProjectType,
  AgentCoPilotAction,
  AgentCoPilotActionType,
  AgentAnalysis,
  AgentMisconfiguration,
  AgentCoPilotMessage,
  AgentContext,
  AgentFilter,
  QuickAction,
} from './types';

// Presets
export {
  AGENT_PRESETS,
  SAAS_FULLSTACK_PRESET,
  WORDPRESS_PRESET,
  API_ONLY_PRESET,
  MOBILE_APP_PRESET,
  ECOMMERCE_PRESET,
  MINIMAL_PRESET,
  getPresetById,
  getPresetsByType,
  suggestPreset,
  countEnabledAgents,
} from './presets';
