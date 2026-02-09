/**
 * @module @agentworks/agent-onboarding/onboarding-service
 * @description Main orchestration service for the agent onboarding pipeline.
 *
 * Flow:
 * 1. Validate config → fail fast if invalid
 * 2. Generate workspace files (IDENTITY.md, SOUL.md, TOOLS.md, AGENTS.md)
 * 3. Register agent in the platform registry
 * 4. Assign tools based on toolCategories
 * 5. Return OnboardingResult with generated files, agent record, and status
 */

import { createLogger } from '@agentworks/shared';
import { validateOnboardingConfig } from './validator.js';
import {
  generateAllFiles,
  generateAllFilesFlat,
  type PeerAgentInfo,
} from './file-generator.js';
import type {
  AgentOnboardingConfig,
  OnboardingResult,
  OnboardingStatus,
  ValidationResult,
  SkillDefinition,
  GeneratedFiles,
  ToolCategoryName,
} from './types.js';

const logger = createLogger('agent-onboarding:service');

// ─── In-Memory Registry ─────────────────────────────────────────────────────
// In production this would be backed by a database. For now we use an
// in-memory store that persists for the lifetime of the process.

interface OnboardedAgent {
  config: AgentOnboardingConfig;
  generatedFiles: GeneratedFiles;
  status: OnboardingStatus;
  onboardedAt: Date;
  updatedAt: Date;
}

const agentStore = new Map<string, OnboardedAgent>();

// ─── Tool Category → Tool Names Map ─────────────────────────────────────────

const CATEGORY_TOOL_MAP: Record<ToolCategoryName, string[]> = {
  file:      ['read_file', 'write_file', 'update_file', 'list_files', 'delete_file'],
  git:       ['git_status', 'git_diff', 'git_log', 'git_commit', 'git_push', 'git_pull', 'git_create_branch', 'git_list_branches', 'git_checkout', 'create_pr'],
  code:      ['run_tests', 'run_linter', 'run_typecheck', 'run_build'],
  search:    ['grep', 'find_files', 'search_symbol'],
  kanban:    ['update_kanban_card', 'append_card_todo', 'complete_card_todo'],
  docs:      ['update_docs'],
  builder:   ['update_ui_builder_state', 'update_db_builder_state', 'update_workflow_builder_state'],
  summary:   ['log_run_summary'],
  wordpress: ['wp_cli', 'wp_scaffold_theme', 'wp_scaffold_plugin', 'wp_scaffold_block', 'wp_check_standards', 'wp_deploy'],
};

// ─── Service ────────────────────────────────────────────────────────────────

export class AgentOnboardingService {
  /**
   * Full onboarding pipeline.
   *
   * Validates the config, generates workspace files, registers the agent,
   * assigns tools, and returns the result.
   */
  async onboardAgent(config: AgentOnboardingConfig): Promise<OnboardingResult> {
    const startTime = Date.now();
    logger.info('Starting agent onboarding', { agentName: config.name });

    // Step 1: Validate
    const validation = await this.validateConfig(config);
    if (!validation.valid) {
      logger.warn('Onboarding validation failed', {
        agentName: config.name,
        errorCount: validation.errors.length,
      });
      return {
        success: false,
        agentName: config.name,
        status: 'failed',
        generatedFiles: [],
        assignedTools: [],
        chainOfCommand: config.chainOfCommand,
        completedAt: new Date(),
        errors: validation.errors.map(e => `[${e.field}] ${e.message}`),
      };
    }

    // Check for duplicate registration
    if (agentStore.has(config.name)) {
      logger.warn('Agent already registered', { agentName: config.name });
      return {
        success: false,
        agentName: config.name,
        status: 'failed',
        generatedFiles: [],
        assignedTools: [],
        chainOfCommand: config.chainOfCommand,
        completedAt: new Date(),
        errors: [`Agent "${config.name}" is already registered. Use updateAgentSkills or updateAgentMemory to modify.`],
      };
    }

    // Update status
    this.setStatus(config.name, 'generating', config);

    // Step 2: Generate workspace files
    let generatedFiles: GeneratedFiles;
    try {
      const peers = this.getPeerAgents(config.name);
      generatedFiles = generateAllFiles(config, peers);
      logger.info('Workspace files generated', {
        agentName: config.name,
        fileCount: Object.keys(generatedFiles.skillFiles).length +
                   Object.keys(generatedFiles.sopFiles).length + 4, // +4 for the core files
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('File generation failed', { agentName: config.name, error: message });
      return {
        success: false,
        agentName: config.name,
        status: 'failed',
        generatedFiles: [],
        assignedTools: [],
        chainOfCommand: config.chainOfCommand,
        completedAt: new Date(),
        errors: [`File generation failed: ${message}`],
      };
    }

    // Step 3: Register agent
    this.setStatus(config.name, 'registering', config);

    try {
      const entry: OnboardedAgent = {
        config,
        generatedFiles,
        status: 'complete',
        onboardedAt: new Date(),
        updatedAt: new Date(),
      };
      agentStore.set(config.name, entry);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Agent registration failed', { agentName: config.name, error: message });
      return {
        success: false,
        agentName: config.name,
        status: 'failed',
        generatedFiles: [],
        assignedTools: [],
        chainOfCommand: config.chainOfCommand,
        completedAt: new Date(),
        errors: [`Registration failed: ${message}`],
      };
    }

    // Step 4: Assign tools
    const assignedTools = this.resolveAssignedTools(config);

    const elapsed = Date.now() - startTime;
    logger.info('Agent onboarding complete', {
      agentName: config.name,
      toolCount: assignedTools.length,
      elapsedMs: elapsed,
    });

    // Build file list
    const fileList = [
      'IDENTITY.md',
      'SOUL.md',
      'TOOLS.md',
      'AGENTS.md',
      ...Object.keys(generatedFiles.skillFiles),
      ...Object.keys(generatedFiles.sopFiles),
    ];

    return {
      success: true,
      agentName: config.name,
      status: 'complete',
      generatedFiles: fileList,
      assignedTools,
      chainOfCommand: config.chainOfCommand,
      completedAt: new Date(),
    };
  }

  /**
   * Validate an onboarding config without creating anything (dry run).
   */
  async validateConfig(config: AgentOnboardingConfig): Promise<ValidationResult> {
    logger.debug('Validating onboarding config', { agentName: config.name });
    return validateOnboardingConfig(config);
  }

  /**
   * Generate workspace files without registering the agent.
   */
  async generateFiles(config: AgentOnboardingConfig): Promise<Record<string, string>> {
    logger.debug('Generating files (preview)', { agentName: config.name });
    const peers = this.getPeerAgents(config.name);
    return generateAllFilesFlat(config, peers);
  }

  /**
   * Update an existing agent's skills.
   */
  async updateAgentSkills(agentName: string, skills: SkillDefinition[]): Promise<void> {
    const entry = agentStore.get(agentName);
    if (!entry) {
      throw new Error(`Agent "${agentName}" not found`);
    }

    entry.config.skills = skills;
    entry.updatedAt = new Date();

    // Regenerate files with updated skills
    const peers = this.getPeerAgents(agentName);
    entry.generatedFiles = generateAllFiles(entry.config, peers);

    logger.info('Agent skills updated', { agentName, skillCount: skills.length });
  }

  /**
   * Update an agent's memory document (re-generate a specific file).
   *
   * @param docType - One of: 'identity', 'soul', 'tools', 'agents'
   * @param content - Raw content override; if empty, regenerates from config
   */
  async updateAgentMemory(agentName: string, docType: string, content: string): Promise<void> {
    const entry = agentStore.get(agentName);
    if (!entry) {
      throw new Error(`Agent "${agentName}" not found`);
    }

    switch (docType) {
      case 'identity':
        entry.generatedFiles.identityMd = content || (await this.generateFiles(entry.config))['IDENTITY.md'];
        break;
      case 'soul':
        entry.generatedFiles.soulMd = content || (await this.generateFiles(entry.config))['SOUL.md'];
        break;
      case 'tools':
        entry.generatedFiles.toolsMd = content || (await this.generateFiles(entry.config))['TOOLS.md'];
        break;
      case 'agents':
        entry.generatedFiles.agentsMd = content || (await this.generateFiles(entry.config))['AGENTS.md'];
        break;
      default:
        throw new Error(`Unknown document type: "${docType}". Valid types: identity, soul, tools, agents`);
    }

    entry.updatedAt = new Date();
    logger.info('Agent memory updated', { agentName, docType });
  }

  /**
   * Get the onboarding status for an agent.
   */
  async getOnboardingStatus(agentName: string): Promise<{
    status: OnboardingStatus;
    agentName: string;
    onboardedAt?: Date;
    updatedAt?: Date;
    generatedFiles: string[];
    assignedTools: string[];
  }> {
    const entry = agentStore.get(agentName);
    if (!entry) {
      return {
        status: 'pending' as OnboardingStatus,
        agentName,
        generatedFiles: [],
        assignedTools: [],
      };
    }

    const fileList = [
      'IDENTITY.md',
      'SOUL.md',
      'TOOLS.md',
      'AGENTS.md',
      ...Object.keys(entry.generatedFiles.skillFiles),
      ...Object.keys(entry.generatedFiles.sopFiles),
    ];

    return {
      status: entry.status,
      agentName,
      onboardedAt: entry.onboardedAt,
      updatedAt: entry.updatedAt,
      generatedFiles: fileList,
      assignedTools: this.resolveAssignedTools(entry.config),
    };
  }

  /**
   * Get a registered agent's config.
   */
  getAgentConfig(agentName: string): AgentOnboardingConfig | undefined {
    return agentStore.get(agentName)?.config;
  }

  /**
   * Get a registered agent's generated files.
   */
  getAgentFiles(agentName: string): GeneratedFiles | undefined {
    return agentStore.get(agentName)?.generatedFiles;
  }

  /**
   * List all registered agents.
   */
  listAgents(): Array<{ name: string; displayName: string; status: OnboardingStatus; onboardedAt: Date }> {
    const result: Array<{ name: string; displayName: string; status: OnboardingStatus; onboardedAt: Date }> = [];
    for (const [name, entry] of agentStore) {
      result.push({
        name,
        displayName: entry.config.displayName,
        status: entry.status,
        onboardedAt: entry.onboardedAt,
      });
    }
    return result;
  }

  /**
   * Remove an agent from the registry.
   */
  async deregisterAgent(agentName: string): Promise<boolean> {
    const removed = agentStore.delete(agentName);
    if (removed) {
      logger.info('Agent deregistered', { agentName });
    }
    return removed;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Resolve the full list of tool names from an agent's config.
   */
  private resolveAssignedTools(config: AgentOnboardingConfig): string[] {
    const tools = new Set<string>();

    // Category tools
    for (const category of config.toolCategories) {
      const categoryTools = CATEGORY_TOOL_MAP[category];
      if (categoryTools) {
        for (const tool of categoryTools) {
          tools.add(tool);
        }
      }
    }

    // Custom tools
    if (config.customTools) {
      for (const tool of config.customTools) {
        tools.add(tool.name);
      }
    }

    // MCP tools
    if (config.mcpServers) {
      for (const server of config.mcpServers) {
        for (const tool of server.tools) {
          tools.add(tool);
        }
      }
    }

    return Array.from(tools).sort();
  }

  /**
   * Get peer agent info for AGENTS.md generation.
   */
  private getPeerAgents(excludeName: string): PeerAgentInfo[] {
    const peers: PeerAgentInfo[] = [];
    for (const [name, entry] of agentStore) {
      if (name === excludeName) continue;
      peers.push({
        name: entry.config.name,
        displayName: entry.config.displayName,
        emoji: entry.config.emoji,
        role: entry.config.role.title,
        specializations: entry.config.specializations,
        toolCategories: entry.config.toolCategories,
        status: entry.status === 'complete' ? 'active' : 'onboarding',
      });
    }
    return peers;
  }

  /**
   * Update the internal status tracking for an agent being onboarded.
   */
  private setStatus(agentName: string, status: OnboardingStatus, config: AgentOnboardingConfig): void {
    const existing = agentStore.get(agentName);
    if (existing) {
      existing.status = status;
      existing.updatedAt = new Date();
    }
    // If not yet in store, we don't create — that happens in the registering step
    logger.debug('Onboarding status updated', { agentName, status });
  }
}

/** Singleton instance for convenience. */
export const agentOnboardingService = new AgentOnboardingService();
