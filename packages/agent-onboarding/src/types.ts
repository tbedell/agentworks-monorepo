/**
 * @module @agentworks/agent-onboarding/types
 * @description Core types for the Agent Onboarding System.
 *
 * Defines the full configuration schema for creating, validating,
 * and deploying AI agents within the AgentWorks platform.
 */

import type { Provider } from '@agentworks/shared';

// ─── Tool Category Names ────────────────────────────────────────────────────

/** Tool categories available in the platform, aligned with TOOL_CATEGORIES in agent-tools. */
export type ToolCategoryName =
  | 'file'
  | 'git'
  | 'code'
  | 'search'
  | 'kanban'
  | 'docs'
  | 'builder'
  | 'summary'
  | 'wordpress';

// ─── Agent Role ─────────────────────────────────────────────────────────────

/** Defines an agent's organizational role within a customer's workforce. */
export interface AgentRole {
  /** Human-readable job title (e.g. "Lead Backend Engineer") */
  title: string;
  /** Functional category the agent belongs to */
  category: AgentRoleCategory;
  /** Experience/authority level */
  seniority: AgentSeniority;
}

export type AgentRoleCategory =
  | 'coordinator'
  | 'engineering'
  | 'operations'
  | 'research'
  | 'marketing'
  | 'design'
  | 'analysis'
  | 'multimedia';

export type AgentSeniority = 'junior' | 'mid' | 'senior' | 'lead';

// ─── Skills ─────────────────────────────────────────────────────────────────

/** A discrete capability an agent can perform. */
export interface SkillDefinition {
  /** Machine-friendly skill name (e.g. "code_review") */
  name: string;
  /** Human-readable description of what this skill does */
  description: string;
  /** Optional path to a SKILL.md file with detailed instructions */
  location?: string;
  /** Tool names required to execute this skill */
  requiredTools: string[];
}

// ─── MCP Server Config ──────────────────────────────────────────────────────

/** Configuration for connecting to an MCP (Model Context Protocol) server. */
export interface MCPServerConfig {
  /** Unique name for this MCP server connection */
  name: string;
  /** Server URL or stdio command */
  url: string;
  /** Transport protocol to use */
  transport: 'stdio' | 'sse' | 'streamable-http';
  /** Authentication method for the server */
  authType?: 'none' | 'bearer' | 'api-key';
  /** List of tool names exposed by this server */
  tools: string[];
}

// ─── Guardrails ─────────────────────────────────────────────────────────────

/** Safety and behavioral constraints for an agent. */
export interface GuardrailConfig {
  /** Whether the agent can execute arbitrary code */
  canExecuteCode: boolean;
  /** Whether the agent can create/modify/delete files */
  canModifyFiles: boolean;
  /** Whether the agent can make outbound network requests */
  canAccessNetwork: boolean;
  /** Whether the agent can perform git operations */
  canManageGit: boolean;
  /** Whether a human must approve actions before execution */
  requiresApproval: boolean;
  /** Maximum cost budget (USD) per single agent run */
  maxBudgetPerRun: number;
  /** Free-form behavioral constraints (SOUL.md content) */
  soulMd: string;
}

// ─── Chain of Command ───────────────────────────────────────────────────────

/** Defines a reporting/supervisory relationship between agents. */
export interface ChainOfCommandEntry {
  /** The other agent's machine name */
  agentName: string;
  /** The relationship direction */
  relationship: 'reports_to' | 'supervises' | 'peers_with';
}

// ─── Communication Channels ─────────────────────────────────────────────────

/** Configuration for an agent's communication channel. */
export interface ChannelConfig {
  /** Platform type */
  type: 'slack' | 'discord' | 'telegram' | 'teams' | 'webhook';
  /** Platform-specific channel/room identifier */
  channelId?: string;
  /** Permissions granted on this channel */
  permissions: ('read' | 'write' | 'react')[];
}

// ─── SOPs (Standard Operating Procedures) ───────────────────────────────────

/** A standard operating procedure template for an agent. */
export interface SOPTemplate {
  /** Human-readable SOP name */
  name: string;
  /** Description of when/why this SOP is used */
  description: string;
  /** Ordered list of steps to execute */
  steps: SOPStep[];
  /** Expected wall-clock duration (e.g. "15m", "2h") */
  expectedDuration: string;
  /** Tool names required across all steps */
  requiredTools: string[];
}

/** A single step within an SOP. */
export interface SOPStep {
  /** Execution order (1-indexed) */
  order: number;
  /** Machine-friendly action name */
  action: string;
  /** Human-readable description of what to do */
  description: string;
  /** Specific tool required for this step (optional) */
  toolRequired?: string;
  /** How to determine this step completed successfully */
  acceptanceCriteria: string;
}

// ─── Custom Tool Definition ─────────────────────────────────────────────────

/** Parameter definition for a custom tool. */
export interface ToolParameter {
  /** Parameter name */
  name: string;
  /** JSON Schema type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Human-readable description */
  description: string;
  /** Whether this parameter is required */
  required: boolean;
  /** Allowed values (for enum constraints) */
  enum?: string[];
  /** Item type (for arrays) */
  items?: { type: string };
  /** Default value */
  default?: unknown;
}

/** A custom tool defined during onboarding (not in the standard registry). */
export interface CustomToolDefinition {
  /** Tool name (must be unique within the agent's tool set) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** Category for organizational purposes */
  category: string;
  /** Input parameters */
  parameters: ToolParameter[];
  /** Optional HTTP endpoint for tool execution */
  endpoint?: string;
}

// ─── Execution Mode ─────────────────────────────────────────────────────────

/** Controls how an agent runs — automatically or with human approval. */
export interface ExecutionMode {
  /** If true, agent runs without human approval */
  autoRun: boolean;
  /** Risk classification for UI indicators */
  riskLevel: 'low' | 'medium' | 'high';
}

// ─── Agent Onboarding Config ────────────────────────────────────────────────

/**
 * Complete configuration required to onboard a new AI agent.
 *
 * This is the single source of truth for everything needed to create,
 * configure, and deploy an agent within the AgentWorks platform.
 */
export interface AgentOnboardingConfig {
  // ── Identity ──────────────────────────────────────────────────────────
  /** Machine name (snake_case, e.g. "lead_backend_engineer") */
  name: string;
  /** Human-readable display name (e.g. "Lead Backend Engineer") */
  displayName: string;
  /** Emoji icon for quick visual identification */
  emoji: string;
  /** Brief description of the agent's purpose */
  description: string;

  // ── Role & Responsibilities ───────────────────────────────────────────
  /** The agent's organizational role */
  role: AgentRole;
  /** Top-level responsibilities (shown in IDENTITY.md) */
  responsibilities: string[];
  /** Specific areas of expertise */
  specializations: string[];

  // ── Skills ────────────────────────────────────────────────────────────
  /** Discrete capabilities the agent can perform */
  skills: SkillDefinition[];

  // ── Tools ─────────────────────────────────────────────────────────────
  /** Standard tool categories to assign */
  toolCategories: ToolCategoryName[];
  /** Custom tools defined specifically for this agent */
  customTools?: CustomToolDefinition[];
  /** MCP server connections for external tool access */
  mcpServers?: MCPServerConfig[];

  // ── LLM Configuration ─────────────────────────────────────────────────
  /** AI provider (openai, anthropic, google, nanobanana) */
  provider: Provider;
  /** Model identifier (e.g. "claude-sonnet-4-20250514") */
  model: string;
  /** Sampling temperature (0.0 – 2.0) */
  temperature: number;
  /** Maximum output tokens (0 = use model default) */
  maxTokens: number;

  // ── Behavioral ────────────────────────────────────────────────────────
  /** System prompt defining the agent's personality and instructions */
  systemPrompt: string;
  /** Safety and behavioral constraints */
  guardrails: GuardrailConfig;

  // ── Organizational ────────────────────────────────────────────────────
  /** Reporting and supervisory relationships */
  chainOfCommand: ChainOfCommandEntry[];
  /** Lane numbers this agent can operate in */
  allowedLanes: number[];
  /** Execution and risk configuration */
  executionMode: ExecutionMode;

  // ── Communication ─────────────────────────────────────────────────────
  /** Channels the agent can communicate on */
  communicationChannels: ChannelConfig[];

  // ── SOPs ──────────────────────────────────────────────────────────────
  /** Standard operating procedures for repeatable workflows */
  sopTemplates?: SOPTemplate[];
}

// ─── Onboarding Result Types ────────────────────────────────────────────────

/** Status of an onboarding operation. */
export type OnboardingStatus = 'pending' | 'validating' | 'generating' | 'registering' | 'complete' | 'failed';

/** Result returned after a successful onboarding. */
export interface OnboardingResult {
  /** Whether the onboarding succeeded */
  success: boolean;
  /** The agent's machine name */
  agentName: string;
  /** Current status */
  status: OnboardingStatus;
  /** Generated file paths */
  generatedFiles: string[];
  /** Assigned tool names */
  assignedTools: string[];
  /** Chain of command relationships created */
  chainOfCommand: ChainOfCommandEntry[];
  /** Timestamp of completion */
  completedAt: Date;
  /** Error messages if any steps failed */
  errors?: string[];
}

/** Validation result for an onboarding config. */
export interface ValidationResult {
  /** Whether the config is valid */
  valid: boolean;
  /** Validation error messages */
  errors: ValidationError[];
  /** Non-blocking warnings */
  warnings: string[];
}

/** A single validation error with context. */
export interface ValidationError {
  /** Dot-notation path to the invalid field */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Error classification */
  code: ValidationErrorCode;
}

export type ValidationErrorCode =
  | 'REQUIRED_FIELD'
  | 'INVALID_FORMAT'
  | 'INVALID_VALUE'
  | 'DUPLICATE_NAME'
  | 'TOOL_INCOMPATIBLE'
  | 'MODEL_INVALID'
  | 'CHAIN_CYCLE'
  | 'BUDGET_EXCEEDED'
  | 'LANE_INVALID';

/** Generated workspace files for an agent. */
export interface GeneratedFiles {
  /** IDENTITY.md content */
  identityMd: string;
  /** SOUL.md content */
  soulMd: string;
  /** TOOLS.md content */
  toolsMd: string;
  /** AGENTS.md content (organizational context) */
  agentsMd: string;
  /** Skill files keyed by filename */
  skillFiles: Record<string, string>;
  /** SOP files keyed by filename */
  sopFiles: Record<string, string>;
}
