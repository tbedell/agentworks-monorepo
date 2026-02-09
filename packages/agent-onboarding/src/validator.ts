/**
 * @module @agentworks/agent-onboarding/validator
 * @description Validates AgentOnboardingConfig before processing.
 *
 * Checks:
 * - Required fields are present and well-formed
 * - Tool categories are valid
 * - LLM model exists for the chosen provider
 * - Chain of command has no cycles
 * - Budget limits are within bounds
 * - Lane numbers are valid
 */

import { PROVIDERS, PROVIDER_MODELS, LANES } from '@agentworks/shared';
import type {
  AgentOnboardingConfig,
  ValidationResult,
  ValidationError,
  ValidationErrorCode,
  ToolCategoryName,
} from './types.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const VALID_TOOL_CATEGORIES: ToolCategoryName[] = [
  'file', 'git', 'code', 'search', 'kanban', 'docs', 'builder', 'summary', 'wordpress',
];

const VALID_LANE_IDS = LANES.map(l => l.id);

const MAX_BUDGET_PER_RUN = 100.00;
const MAX_TEMPERATURE = 2.0;
const MAX_NAME_LENGTH = 64;
const MAX_DISPLAY_NAME_LENGTH = 128;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_SYSTEM_PROMPT_LENGTH = 50_000;
const SNAKE_CASE_REGEX = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

// ─── Validator ──────────────────────────────────────────────────────────────

/**
 * Validate an agent onboarding configuration.
 *
 * @param config - The configuration to validate
 * @returns ValidationResult with errors and warnings
 */
export function validateOnboardingConfig(config: AgentOnboardingConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Identity validation
  validateIdentity(config, errors, warnings);

  // Role validation
  validateRole(config, errors);

  // Skills validation
  validateSkills(config, errors, warnings);

  // Tools validation
  validateTools(config, errors, warnings);

  // LLM config validation
  validateLLMConfig(config, errors, warnings);

  // Guardrails validation
  validateGuardrails(config, errors, warnings);

  // Chain of command validation
  validateChainOfCommand(config, errors, warnings);

  // Lanes validation
  validateLanes(config, errors);

  // Execution mode validation
  validateExecutionMode(config, errors, warnings);

  // Communication channels validation
  validateChannels(config, errors);

  // SOP validation
  validateSOPs(config, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Section Validators ─────────────────────────────────────────────────────

function validateIdentity(
  config: AgentOnboardingConfig,
  errors: ValidationError[],
  warnings: string[]
): void {
  // name
  if (!config.name) {
    errors.push(err('name', 'Agent name is required', 'REQUIRED_FIELD'));
  } else if (!SNAKE_CASE_REGEX.test(config.name)) {
    errors.push(err('name', 'Agent name must be snake_case (e.g. "lead_engineer")', 'INVALID_FORMAT'));
  } else if (config.name.length > MAX_NAME_LENGTH) {
    errors.push(err('name', `Agent name must be at most ${MAX_NAME_LENGTH} characters`, 'INVALID_FORMAT'));
  }

  // displayName
  if (!config.displayName) {
    errors.push(err('displayName', 'Display name is required', 'REQUIRED_FIELD'));
  } else if (config.displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    errors.push(err('displayName', `Display name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters`, 'INVALID_FORMAT'));
  }

  // emoji
  if (!config.emoji) {
    errors.push(err('emoji', 'Emoji is required', 'REQUIRED_FIELD'));
  }

  // description
  if (!config.description) {
    errors.push(err('description', 'Description is required', 'REQUIRED_FIELD'));
  } else if (config.description.length > MAX_DESCRIPTION_LENGTH) {
    warnings.push(`Description is ${config.description.length} characters (recommended max: ${MAX_DESCRIPTION_LENGTH})`);
  }
}

function validateRole(
  config: AgentOnboardingConfig,
  errors: ValidationError[]
): void {
  if (!config.role) {
    errors.push(err('role', 'Role is required', 'REQUIRED_FIELD'));
    return;
  }

  if (!config.role.title) {
    errors.push(err('role.title', 'Role title is required', 'REQUIRED_FIELD'));
  }

  const validCategories = [
    'coordinator', 'engineering', 'operations', 'research',
    'marketing', 'design', 'analysis', 'multimedia',
  ];
  if (!validCategories.includes(config.role.category)) {
    errors.push(err('role.category', `Invalid role category. Must be one of: ${validCategories.join(', ')}`, 'INVALID_VALUE'));
  }

  const validSeniorities = ['junior', 'mid', 'senior', 'lead'];
  if (!validSeniorities.includes(config.role.seniority)) {
    errors.push(err('role.seniority', `Invalid seniority. Must be one of: ${validSeniorities.join(', ')}`, 'INVALID_VALUE'));
  }
}

function validateSkills(
  config: AgentOnboardingConfig,
  errors: ValidationError[],
  warnings: string[]
): void {
  if (!config.skills || !Array.isArray(config.skills)) {
    errors.push(err('skills', 'Skills array is required', 'REQUIRED_FIELD'));
    return;
  }

  if (config.skills.length === 0) {
    warnings.push('Agent has no skills defined — consider adding at least one skill');
  }

  const skillNames = new Set<string>();
  for (let i = 0; i < config.skills.length; i++) {
    const skill = config.skills[i];
    const prefix = `skills[${i}]`;

    if (!skill.name) {
      errors.push(err(`${prefix}.name`, 'Skill name is required', 'REQUIRED_FIELD'));
    } else if (skillNames.has(skill.name)) {
      errors.push(err(`${prefix}.name`, `Duplicate skill name: "${skill.name}"`, 'DUPLICATE_NAME'));
    } else {
      skillNames.add(skill.name);
    }

    if (!skill.description) {
      errors.push(err(`${prefix}.description`, 'Skill description is required', 'REQUIRED_FIELD'));
    }

    if (!skill.requiredTools || !Array.isArray(skill.requiredTools)) {
      errors.push(err(`${prefix}.requiredTools`, 'Skill requiredTools must be an array', 'INVALID_FORMAT'));
    }
  }
}

function validateTools(
  config: AgentOnboardingConfig,
  errors: ValidationError[],
  warnings: string[]
): void {
  if (!config.toolCategories || !Array.isArray(config.toolCategories)) {
    errors.push(err('toolCategories', 'Tool categories array is required', 'REQUIRED_FIELD'));
    return;
  }

  for (const category of config.toolCategories) {
    if (!VALID_TOOL_CATEGORIES.includes(category)) {
      errors.push(err(
        'toolCategories',
        `Invalid tool category: "${category}". Valid categories: ${VALID_TOOL_CATEGORIES.join(', ')}`,
        'TOOL_INCOMPATIBLE'
      ));
    }
  }

  // Validate custom tools
  if (config.customTools) {
    const toolNames = new Set<string>();
    for (let i = 0; i < config.customTools.length; i++) {
      const tool = config.customTools[i];
      const prefix = `customTools[${i}]`;

      if (!tool.name) {
        errors.push(err(`${prefix}.name`, 'Custom tool name is required', 'REQUIRED_FIELD'));
      } else if (toolNames.has(tool.name)) {
        errors.push(err(`${prefix}.name`, `Duplicate custom tool name: "${tool.name}"`, 'DUPLICATE_NAME'));
      } else {
        toolNames.add(tool.name);
      }

      if (!tool.description) {
        errors.push(err(`${prefix}.description`, 'Custom tool description is required', 'REQUIRED_FIELD'));
      }
    }
  }

  // Validate MCP servers
  if (config.mcpServers) {
    for (let i = 0; i < config.mcpServers.length; i++) {
      const server = config.mcpServers[i];
      const prefix = `mcpServers[${i}]`;

      if (!server.name) {
        errors.push(err(`${prefix}.name`, 'MCP server name is required', 'REQUIRED_FIELD'));
      }
      if (!server.url) {
        errors.push(err(`${prefix}.url`, 'MCP server URL is required', 'REQUIRED_FIELD'));
      }
      if (!['stdio', 'sse', 'streamable-http'].includes(server.transport)) {
        errors.push(err(`${prefix}.transport`, 'Invalid MCP transport type', 'INVALID_VALUE'));
      }
    }
  }

  // Check that skill tools exist in assigned categories
  if (config.skills && config.toolCategories) {
    const assignedToolNames = getToolNamesFromCategories(config.toolCategories);
    const customToolNames = new Set((config.customTools ?? []).map(t => t.name));
    const mcpToolNames = new Set((config.mcpServers ?? []).flatMap(s => s.tools));

    for (const skill of config.skills) {
      for (const toolName of skill.requiredTools) {
        if (!assignedToolNames.has(toolName) && !customToolNames.has(toolName) && !mcpToolNames.has(toolName)) {
          warnings.push(`Skill "${skill.name}" requires tool "${toolName}" which is not in any assigned tool category, custom tools, or MCP servers`);
        }
      }
    }
  }
}

function validateLLMConfig(
  config: AgentOnboardingConfig,
  errors: ValidationError[],
  warnings: string[]
): void {
  // Provider
  if (!config.provider) {
    errors.push(err('provider', 'Provider is required', 'REQUIRED_FIELD'));
  } else if (!PROVIDERS.includes(config.provider as typeof PROVIDERS[number])) {
    errors.push(err('provider', `Invalid provider. Must be one of: ${PROVIDERS.join(', ')}`, 'INVALID_VALUE'));
  }

  // Model
  if (!config.model) {
    errors.push(err('model', 'Model is required', 'REQUIRED_FIELD'));
  } else if (config.provider) {
    const providerModels = PROVIDER_MODELS[config.provider];
    if (providerModels) {
      const validModelIds = providerModels.map(m => m.id);
      if (!validModelIds.includes(config.model)) {
        errors.push(err(
          'model',
          `Model "${config.model}" is not available for provider "${config.provider}". Valid models: ${validModelIds.join(', ')}`,
          'MODEL_INVALID'
        ));
      }
    }
  }

  // Temperature
  if (config.temperature === undefined || config.temperature === null) {
    errors.push(err('temperature', 'Temperature is required', 'REQUIRED_FIELD'));
  } else if (config.temperature < 0 || config.temperature > MAX_TEMPERATURE) {
    errors.push(err('temperature', `Temperature must be between 0 and ${MAX_TEMPERATURE}`, 'INVALID_VALUE'));
  }

  // Max tokens (0 = model default, which is valid)
  if (config.maxTokens === undefined || config.maxTokens === null) {
    errors.push(err('maxTokens', 'Max tokens is required', 'REQUIRED_FIELD'));
  } else if (config.maxTokens < 0) {
    errors.push(err('maxTokens', 'Max tokens must be 0 (model default) or positive', 'INVALID_VALUE'));
  }

  // System prompt
  if (!config.systemPrompt) {
    errors.push(err('systemPrompt', 'System prompt is required', 'REQUIRED_FIELD'));
  } else if (config.systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
    warnings.push(`System prompt is ${config.systemPrompt.length} characters (max: ${MAX_SYSTEM_PROMPT_LENGTH})`);
  }
}

function validateGuardrails(
  config: AgentOnboardingConfig,
  errors: ValidationError[],
  warnings: string[]
): void {
  if (!config.guardrails) {
    errors.push(err('guardrails', 'Guardrails configuration is required', 'REQUIRED_FIELD'));
    return;
  }

  const g = config.guardrails;

  if (typeof g.canExecuteCode !== 'boolean') {
    errors.push(err('guardrails.canExecuteCode', 'canExecuteCode must be a boolean', 'INVALID_VALUE'));
  }
  if (typeof g.canModifyFiles !== 'boolean') {
    errors.push(err('guardrails.canModifyFiles', 'canModifyFiles must be a boolean', 'INVALID_VALUE'));
  }
  if (typeof g.canAccessNetwork !== 'boolean') {
    errors.push(err('guardrails.canAccessNetwork', 'canAccessNetwork must be a boolean', 'INVALID_VALUE'));
  }
  if (typeof g.canManageGit !== 'boolean') {
    errors.push(err('guardrails.canManageGit', 'canManageGit must be a boolean', 'INVALID_VALUE'));
  }
  if (typeof g.requiresApproval !== 'boolean') {
    errors.push(err('guardrails.requiresApproval', 'requiresApproval must be a boolean', 'INVALID_VALUE'));
  }

  if (g.maxBudgetPerRun === undefined || g.maxBudgetPerRun === null) {
    errors.push(err('guardrails.maxBudgetPerRun', 'maxBudgetPerRun is required', 'REQUIRED_FIELD'));
  } else if (g.maxBudgetPerRun < 0) {
    errors.push(err('guardrails.maxBudgetPerRun', 'maxBudgetPerRun must be non-negative', 'INVALID_VALUE'));
  } else if (g.maxBudgetPerRun > MAX_BUDGET_PER_RUN) {
    errors.push(err('guardrails.maxBudgetPerRun', `maxBudgetPerRun exceeds maximum of $${MAX_BUDGET_PER_RUN}`, 'BUDGET_EXCEEDED'));
  }

  // High-risk agents without approval get a warning
  if (g.canExecuteCode && g.canManageGit && !g.requiresApproval) {
    warnings.push('Agent can execute code and manage git without requiring approval — consider enabling requiresApproval');
  }
}

function validateChainOfCommand(
  config: AgentOnboardingConfig,
  errors: ValidationError[],
  warnings: string[]
): void {
  if (!config.chainOfCommand || !Array.isArray(config.chainOfCommand)) {
    errors.push(err('chainOfCommand', 'Chain of command array is required', 'REQUIRED_FIELD'));
    return;
  }

  const validRelationships = ['reports_to', 'supervises', 'peers_with'];
  const seenPairs = new Set<string>();

  for (let i = 0; i < config.chainOfCommand.length; i++) {
    const entry = config.chainOfCommand[i];
    const prefix = `chainOfCommand[${i}]`;

    if (!entry.agentName) {
      errors.push(err(`${prefix}.agentName`, 'Agent name is required in chain of command', 'REQUIRED_FIELD'));
    }

    if (!validRelationships.includes(entry.relationship)) {
      errors.push(err(`${prefix}.relationship`, `Invalid relationship. Must be one of: ${validRelationships.join(', ')}`, 'INVALID_VALUE'));
    }

    // Check for self-references
    if (entry.agentName === config.name) {
      errors.push(err(`${prefix}.agentName`, 'Agent cannot reference itself in chain of command', 'CHAIN_CYCLE'));
    }

    // Check for duplicate pairs
    const pairKey = `${entry.agentName}:${entry.relationship}`;
    if (seenPairs.has(pairKey)) {
      warnings.push(`Duplicate chain of command entry: ${entry.agentName} (${entry.relationship})`);
    }
    seenPairs.add(pairKey);
  }

  // Check for cycles: A supervises B and B supervises A
  detectChainCycles(config, errors);
}

function validateLanes(
  config: AgentOnboardingConfig,
  errors: ValidationError[]
): void {
  if (!config.allowedLanes || !Array.isArray(config.allowedLanes)) {
    errors.push(err('allowedLanes', 'Allowed lanes array is required', 'REQUIRED_FIELD'));
    return;
  }

  if (config.allowedLanes.length === 0) {
    errors.push(err('allowedLanes', 'Agent must be allowed in at least one lane', 'REQUIRED_FIELD'));
  }

  for (const lane of config.allowedLanes) {
    if (!VALID_LANE_IDS.includes(lane)) {
      errors.push(err('allowedLanes', `Invalid lane number: ${lane}. Valid lanes: ${VALID_LANE_IDS.join(', ')}`, 'LANE_INVALID'));
    }
  }
}

function validateExecutionMode(
  config: AgentOnboardingConfig,
  errors: ValidationError[],
  warnings: string[]
): void {
  if (!config.executionMode) {
    errors.push(err('executionMode', 'Execution mode is required', 'REQUIRED_FIELD'));
    return;
  }

  if (typeof config.executionMode.autoRun !== 'boolean') {
    errors.push(err('executionMode.autoRun', 'autoRun must be a boolean', 'INVALID_VALUE'));
  }

  const validRiskLevels = ['low', 'medium', 'high'];
  if (!validRiskLevels.includes(config.executionMode.riskLevel)) {
    errors.push(err('executionMode.riskLevel', `Invalid risk level. Must be one of: ${validRiskLevels.join(', ')}`, 'INVALID_VALUE'));
  }

  // Warn if high-risk agent is set to auto-run
  if (config.executionMode.riskLevel === 'high' && config.executionMode.autoRun) {
    warnings.push('High-risk agent is set to auto-run — consider requiring manual approval');
  }
}

function validateChannels(
  config: AgentOnboardingConfig,
  errors: ValidationError[]
): void {
  if (!config.communicationChannels || !Array.isArray(config.communicationChannels)) {
    errors.push(err('communicationChannels', 'Communication channels array is required', 'REQUIRED_FIELD'));
    return;
  }

  const validTypes = ['slack', 'discord', 'telegram', 'teams', 'webhook'];
  const validPermissions = ['read', 'write', 'react'];

  for (let i = 0; i < config.communicationChannels.length; i++) {
    const channel = config.communicationChannels[i];
    const prefix = `communicationChannels[${i}]`;

    if (!validTypes.includes(channel.type)) {
      errors.push(err(`${prefix}.type`, `Invalid channel type. Must be one of: ${validTypes.join(', ')}`, 'INVALID_VALUE'));
    }

    if (!channel.permissions || !Array.isArray(channel.permissions) || channel.permissions.length === 0) {
      errors.push(err(`${prefix}.permissions`, 'Channel must have at least one permission', 'REQUIRED_FIELD'));
    } else {
      for (const perm of channel.permissions) {
        if (!validPermissions.includes(perm)) {
          errors.push(err(`${prefix}.permissions`, `Invalid permission: "${perm}". Must be one of: ${validPermissions.join(', ')}`, 'INVALID_VALUE'));
        }
      }
    }
  }
}

function validateSOPs(
  config: AgentOnboardingConfig,
  errors: ValidationError[],
  warnings: string[]
): void {
  if (!config.sopTemplates || config.sopTemplates.length === 0) {
    return; // SOPs are optional
  }

  const sopNames = new Set<string>();

  for (let i = 0; i < config.sopTemplates.length; i++) {
    const sop = config.sopTemplates[i];
    const prefix = `sopTemplates[${i}]`;

    if (!sop.name) {
      errors.push(err(`${prefix}.name`, 'SOP name is required', 'REQUIRED_FIELD'));
    } else if (sopNames.has(sop.name)) {
      errors.push(err(`${prefix}.name`, `Duplicate SOP name: "${sop.name}"`, 'DUPLICATE_NAME'));
    } else {
      sopNames.add(sop.name);
    }

    if (!sop.description) {
      errors.push(err(`${prefix}.description`, 'SOP description is required', 'REQUIRED_FIELD'));
    }

    if (!sop.steps || sop.steps.length === 0) {
      errors.push(err(`${prefix}.steps`, 'SOP must have at least one step', 'REQUIRED_FIELD'));
    } else {
      // Validate step ordering
      const orders = sop.steps.map(s => s.order);
      const expectedOrders = sop.steps.map((_, idx) => idx + 1);
      if (JSON.stringify(orders.sort()) !== JSON.stringify(expectedOrders)) {
        warnings.push(`SOP "${sop.name}" steps have non-sequential ordering`);
      }

      for (let j = 0; j < sop.steps.length; j++) {
        const step = sop.steps[j];
        if (!step.action) {
          errors.push(err(`${prefix}.steps[${j}].action`, 'Step action is required', 'REQUIRED_FIELD'));
        }
        if (!step.acceptanceCriteria) {
          errors.push(err(`${prefix}.steps[${j}].acceptanceCriteria`, 'Step acceptance criteria is required', 'REQUIRED_FIELD'));
        }
      }
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function err(field: string, message: string, code: ValidationErrorCode): ValidationError {
  return { field, message, code };
}

/**
 * Detect cycles in chain of command.
 *
 * A cycle exists when:
 * - Agent A supervises B, and B supervises A (direct cycle)
 * - Agent A reports_to B, and B reports_to A (direct cycle)
 *
 * We only check the config's own entries for direct contradictions,
 * since full cycle detection requires the global agent graph.
 */
function detectChainCycles(
  config: AgentOnboardingConfig,
  errors: ValidationError[]
): void {
  const supervises = new Set<string>();
  const reportsTo = new Set<string>();

  for (const entry of config.chainOfCommand) {
    if (entry.relationship === 'supervises') {
      supervises.add(entry.agentName);
    }
    if (entry.relationship === 'reports_to') {
      reportsTo.add(entry.agentName);
    }
  }

  // If an agent both supervises and reports to the same agent, that's a cycle
  for (const name of supervises) {
    if (reportsTo.has(name)) {
      errors.push(err(
        'chainOfCommand',
        `Cycle detected: "${config.name}" both supervises and reports to "${name}"`,
        'CHAIN_CYCLE'
      ));
    }
  }
}

/**
 * Map tool category names to individual tool names.
 * Mirrors the TOOL_CATEGORIES definition from agent-tools.
 */
function getToolNamesFromCategories(categories: ToolCategoryName[]): Set<string> {
  const categoryToolMap: Record<ToolCategoryName, string[]> = {
    file: ['read_file', 'write_file', 'update_file', 'list_files', 'delete_file'],
    git: ['git_status', 'git_diff', 'git_log', 'git_commit', 'git_push', 'git_pull', 'git_create_branch', 'git_list_branches', 'git_checkout', 'create_pr'],
    code: ['run_tests', 'run_linter', 'run_typecheck', 'run_build'],
    search: ['grep', 'find_files', 'search_symbol'],
    kanban: ['update_kanban_card', 'append_card_todo', 'complete_card_todo'],
    docs: ['update_docs'],
    builder: ['update_ui_builder_state', 'update_db_builder_state', 'update_workflow_builder_state'],
    summary: ['log_run_summary'],
    wordpress: ['wp_cli', 'wp_scaffold_theme', 'wp_scaffold_plugin', 'wp_scaffold_block', 'wp_check_standards', 'wp_deploy'],
  };

  const toolNames = new Set<string>();
  for (const category of categories) {
    const tools = categoryToolMap[category];
    if (tools) {
      for (const tool of tools) {
        toolNames.add(tool);
      }
    }
  }
  return toolNames;
}
