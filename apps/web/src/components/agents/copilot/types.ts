/**
 * Agent CoPilot Types
 *
 * Type definitions for the intelligent Agent CoPilot system that provides
 * recommendations, presets, and natural language agent management.
 */

import type { AgentName } from '@agentworks/shared';

/**
 * Agent recommendation from CoPilot
 */
export interface AgentRecommendation {
  agentName: string; // Use string for flexibility with API responses
  displayName: string;
  reason: string;
  suggestedSettings?: {
    temperature?: number;
    maxTokens?: number;
    provider?: string;
    model?: string;
  };
  priority: 'essential' | 'recommended' | 'optional' | string;
}

/**
 * Agent configuration within a preset
 */
export interface PresetAgentConfig {
  name: AgentName;
  enabled: boolean;
  provider?: string;
  model?: string;
  temperature?: number;
}

/**
 * Project type for preset classification
 */
export type ProjectType = 'saas' | 'wordpress' | 'ecommerce' | 'mobile' | 'api' | 'custom';

/**
 * Agent preset configuration
 */
export interface AgentPreset {
  id: string;
  name: string;
  description: string;
  projectType: ProjectType;
  icon: string;
  agents: PresetAgentConfig[];
}

/**
 * CoPilot action types
 */
export type AgentCoPilotActionType =
  | 'CONFIGURE_AGENT'
  | 'APPLY_PRESET'
  | 'BULK_UPDATE'
  | 'OPTIMIZE_SETTINGS'
  | 'ENABLE_AGENT'
  | 'DISABLE_AGENT'
  | string;

/**
 * Action parsed from CoPilot response
 */
export interface AgentCoPilotAction {
  type: AgentCoPilotActionType;
  agentName?: string;
  settings?: Record<string, unknown>;
  presetId?: string;
  agentNames?: string[];
}

/**
 * Agent analysis result
 */
export interface AgentAnalysis {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  byoaAgents: number;
  misconfigurations: AgentMisconfiguration[];
  recommendations: AgentRecommendation[];
  summary: string;
}

/**
 * Agent misconfiguration details
 */
export interface AgentMisconfiguration {
  agentName: string;
  displayName: string;
  issue: string;
  severity: 'warning' | 'error' | string;
  suggestion: string;
}

/**
 * Chat message in CoPilot
 */
export interface AgentCoPilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  recommendations?: AgentRecommendation[];
  actions?: AgentCoPilotAction[];
  analysis?: AgentAnalysis;
}

/**
 * Agent context passed to CoPilot
 */
export interface AgentContext {
  agents: Array<{
    name: AgentName;
    displayName: string;
    description: string;
    status: 'active' | 'byoa' | 'inactive';
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    lanes?: string[];
  }>;
  projectType?: ProjectType;
  credentials: Array<{
    provider: string;
    status: string;
    assignedAgents: string[];
  }>;
}

/**
 * Filter options for agent display
 */
export type AgentFilter = 'all' | 'active' | 'byoa' | 'inactive' | 'recommended';

/**
 * Quick action for CoPilot
 */
export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: () => void;
}
