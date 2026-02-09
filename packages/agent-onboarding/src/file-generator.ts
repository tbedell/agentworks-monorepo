/**
 * @module @agentworks/agent-onboarding/file-generator
 * @description Generates workspace markdown files for a newly onboarded agent.
 *
 * Produces:
 * - IDENTITY.md — Who the agent is, what it does, responsibilities
 * - SOUL.md    — Behavioral constraints, personality, guardrails
 * - TOOLS.md   — Assigned tool categories, custom tools, MCP servers
 * - AGENTS.md  — Peer agent registry for cross-agent awareness
 */

import type {
  AgentOnboardingConfig,
  SkillDefinition,
  SOPTemplate,
  SOPStep,
  GuardrailConfig,
  ChainOfCommandEntry,
  ChannelConfig,
  CustomToolDefinition,
  MCPServerConfig,
  ToolCategoryName,
  GeneratedFiles,
} from './types.js';

// ─── Tool Category Descriptions ─────────────────────────────────────────────

const TOOL_CATEGORY_INFO: Record<ToolCategoryName, { emoji: string; label: string; tools: string[] }> = {
  file:      { emoji: '📁', label: 'File Operations',      tools: ['read_file', 'write_file', 'update_file', 'list_files', 'delete_file'] },
  git:       { emoji: '🔀', label: 'Git Operations',       tools: ['git_status', 'git_diff', 'git_log', 'git_commit', 'git_push', 'git_pull', 'git_create_branch', 'git_list_branches', 'git_checkout', 'create_pr'] },
  code:      { emoji: '🧪', label: 'Code Quality',         tools: ['run_tests', 'run_linter', 'run_typecheck', 'run_build'] },
  search:    { emoji: '🔍', label: 'Search & Discovery',   tools: ['grep', 'find_files', 'search_symbol'] },
  kanban:    { emoji: '📋', label: 'Kanban Board',         tools: ['update_kanban_card', 'append_card_todo', 'complete_card_todo'] },
  docs:      { emoji: '📖', label: 'Documentation',        tools: ['update_docs'] },
  builder:   { emoji: '🏗️', label: 'Builder Tools',        tools: ['update_ui_builder_state', 'update_db_builder_state', 'update_workflow_builder_state'] },
  summary:   { emoji: '📝', label: 'Run Summaries',        tools: ['log_run_summary'] },
  wordpress: { emoji: '🌐', label: 'WordPress',            tools: ['wp_cli', 'wp_scaffold_theme', 'wp_scaffold_plugin', 'wp_scaffold_block', 'wp_check_standards', 'wp_deploy'] },
};

// ─── Peer Agent Info (for AGENTS.md) ────────────────────────────────────────

/** Minimal representation of a peer agent for the registry. */
export interface PeerAgentInfo {
  name: string;
  displayName: string;
  emoji: string;
  role: string;
  specializations: string[];
  toolCategories: ToolCategoryName[];
  status: 'active' | 'inactive' | 'onboarding';
}

// ─── IDENTITY.md ────────────────────────────────────────────────────────────

/**
 * Generate IDENTITY.md content for an agent.
 *
 * Contains the agent's name, role, responsibilities, skills, and SOPs.
 */
export function generateIdentityMd(config: AgentOnboardingConfig): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${config.emoji} ${config.displayName}`);
  lines.push('');
  lines.push(`> ${config.description}`);
  lines.push('');

  // Role
  lines.push('## 🏷️ Role');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **Title** | ${config.role.title} |`);
  lines.push(`| **Category** | ${capitalize(config.role.category)} |`);
  lines.push(`| **Seniority** | ${capitalize(config.role.seniority)} |`);
  lines.push(`| **Agent Name** | \`${config.name}\` |`);
  lines.push('');

  // Responsibilities
  lines.push('## ✅ Responsibilities');
  lines.push('');
  for (const r of config.responsibilities) {
    lines.push(`- ${r}`);
  }
  lines.push('');

  // Specializations
  if (config.specializations.length > 0) {
    lines.push('## 🎯 Specializations');
    lines.push('');
    for (const s of config.specializations) {
      lines.push(`- ${s}`);
    }
    lines.push('');
  }

  // Skills
  if (config.skills.length > 0) {
    lines.push('## 🛠️ Skills');
    lines.push('');
    for (const skill of config.skills) {
      lines.push(`### ${skill.name}`);
      lines.push('');
      lines.push(skill.description);
      lines.push('');
      if (skill.requiredTools.length > 0) {
        lines.push(`**Required Tools:** ${skill.requiredTools.map(t => `\`${t}\``).join(', ')}`);
        lines.push('');
      }
      if (skill.location) {
        lines.push(`**Skill File:** \`${skill.location}\``);
        lines.push('');
      }
    }
  }

  // Chain of Command
  if (config.chainOfCommand.length > 0) {
    lines.push('## 🏛️ Chain of Command');
    lines.push('');
    lines.push('| Agent | Relationship |');
    lines.push('|-------|-------------|');
    for (const entry of config.chainOfCommand) {
      const label = formatRelationship(entry.relationship);
      lines.push(`| \`${entry.agentName}\` | ${label} |`);
    }
    lines.push('');
  }

  // SOPs
  if (config.sopTemplates && config.sopTemplates.length > 0) {
    lines.push('## 📋 Standard Operating Procedures');
    lines.push('');
    for (const sop of config.sopTemplates) {
      lines.push(formatSOP(sop));
    }
  }

  // Allowed Lanes
  lines.push('## 🛤️ Allowed Lanes');
  lines.push('');
  lines.push(`Lanes: ${config.allowedLanes.map(l => `\`${l}\``).join(', ')}`);
  lines.push('');

  // Execution Mode
  lines.push('## ⚙️ Execution Mode');
  lines.push('');
  lines.push(`| Setting | Value |`);
  lines.push(`|---------|-------|`);
  lines.push(`| **Auto Run** | ${config.executionMode.autoRun ? '✅ Yes' : '❌ No (requires approval)'} |`);
  lines.push(`| **Risk Level** | ${riskBadge(config.executionMode.riskLevel)} |`);
  lines.push('');

  return lines.join('\n');
}

// ─── SOUL.md ────────────────────────────────────────────────────────────────

/**
 * Generate SOUL.md content for an agent.
 *
 * Contains the system prompt, behavioral constraints, and guardrails.
 */
export function generateSoulMd(config: AgentOnboardingConfig): string {
  const lines: string[] = [];

  lines.push(`# ${config.emoji} ${config.displayName} — Soul`);
  lines.push('');
  lines.push('> This document defines the behavioral constraints, personality, and guardrails for this agent.');
  lines.push('');

  // System Prompt
  lines.push('## 🧠 System Prompt');
  lines.push('');
  lines.push('```');
  lines.push(config.systemPrompt);
  lines.push('```');
  lines.push('');

  // LLM Configuration
  lines.push('## 🤖 LLM Configuration');
  lines.push('');
  lines.push(`| Setting | Value |`);
  lines.push(`|---------|-------|`);
  lines.push(`| **Provider** | ${config.provider} |`);
  lines.push(`| **Model** | \`${config.model}\` |`);
  lines.push(`| **Temperature** | ${config.temperature} |`);
  lines.push(`| **Max Tokens** | ${config.maxTokens === 0 ? 'Model default' : config.maxTokens} |`);
  lines.push('');

  // Guardrails
  lines.push('## 🛡️ Guardrails');
  lines.push('');
  lines.push(formatGuardrails(config.guardrails));
  lines.push('');

  // Behavioral Constraints (from soulMd)
  if (config.guardrails.soulMd) {
    lines.push('## 📜 Behavioral Constraints');
    lines.push('');
    lines.push(config.guardrails.soulMd);
    lines.push('');
  }

  // Communication
  if (config.communicationChannels.length > 0) {
    lines.push('## 💬 Communication Channels');
    lines.push('');
    lines.push('| Platform | Permissions |');
    lines.push('|----------|-------------|');
    for (const ch of config.communicationChannels) {
      const perms = ch.permissions.map(p => `\`${p}\``).join(', ');
      lines.push(`| ${capitalize(ch.type)}${ch.channelId ? ` (\`${ch.channelId}\`)` : ''} | ${perms} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── TOOLS.md ───────────────────────────────────────────────────────────────

/**
 * Generate TOOLS.md content for an agent.
 *
 * Lists assigned tool categories, individual tools, custom tools, and MCP servers.
 */
export function generateToolsMd(config: AgentOnboardingConfig): string {
  const lines: string[] = [];

  lines.push(`# ${config.emoji} ${config.displayName} — Tools`);
  lines.push('');
  lines.push('> Tools available to this agent, organized by category.');
  lines.push('');

  // Tool Categories
  lines.push('## 📦 Assigned Tool Categories');
  lines.push('');
  for (const category of config.toolCategories) {
    const info = TOOL_CATEGORY_INFO[category];
    if (info) {
      lines.push(`### ${info.emoji} ${info.label} (\`${category}\`)`);
      lines.push('');
      for (const tool of info.tools) {
        lines.push(`- \`${tool}\``);
      }
      lines.push('');
    }
  }

  // Full tool index
  const allTools = getAllToolNames(config);
  lines.push('## 🔧 Full Tool Index');
  lines.push('');
  lines.push(`Total tools available: **${allTools.length}**`);
  lines.push('');
  lines.push('| Tool | Source |');
  lines.push('|------|--------|');
  for (const { name, source } of allTools) {
    lines.push(`| \`${name}\` | ${source} |`);
  }
  lines.push('');

  // Custom Tools
  if (config.customTools && config.customTools.length > 0) {
    lines.push('## 🔨 Custom Tools');
    lines.push('');
    for (const tool of config.customTools) {
      lines.push(`### \`${tool.name}\``);
      lines.push('');
      lines.push(tool.description);
      lines.push('');
      if (tool.parameters.length > 0) {
        lines.push('**Parameters:**');
        lines.push('');
        lines.push('| Name | Type | Required | Description |');
        lines.push('|------|------|----------|-------------|');
        for (const param of tool.parameters) {
          lines.push(`| \`${param.name}\` | ${param.type} | ${param.required ? '✅' : '—'} | ${param.description} |`);
        }
        lines.push('');
      }
      if (tool.endpoint) {
        lines.push(`**Endpoint:** \`${tool.endpoint}\``);
        lines.push('');
      }
    }
  }

  // MCP Servers
  if (config.mcpServers && config.mcpServers.length > 0) {
    lines.push('## 🔌 MCP Server Connections');
    lines.push('');
    for (const server of config.mcpServers) {
      lines.push(`### ${server.name}`);
      lines.push('');
      lines.push(`| Setting | Value |`);
      lines.push(`|---------|-------|`);
      lines.push(`| **URL** | \`${server.url}\` |`);
      lines.push(`| **Transport** | ${server.transport} |`);
      lines.push(`| **Auth** | ${server.authType ?? 'none'} |`);
      lines.push(`| **Tools** | ${server.tools.map(t => `\`${t}\``).join(', ')} |`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ─── AGENTS.md ──────────────────────────────────────────────────────────────

/**
 * Generate AGENTS.md content showing the peer agent registry.
 *
 * Gives the agent awareness of all other active agents in the organization.
 */
export function generateAgentsMd(
  config: AgentOnboardingConfig,
  peerAgents: PeerAgentInfo[]
): string {
  const lines: string[] = [];

  lines.push(`# 🏢 Agent Registry — ${config.displayName}'s View`);
  lines.push('');
  lines.push('> This document lists all active agents in the organization.');
  lines.push('> Use this to understand who to collaborate with and how to delegate.');
  lines.push('');

  // Self
  lines.push('## 🪞 You');
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| **Name** | ${config.emoji} ${config.displayName} (\`${config.name}\`) |`);
  lines.push(`| **Role** | ${config.role.title} (${capitalize(config.role.category)}) |`);
  lines.push(`| **Specializations** | ${config.specializations.join(', ') || '—'} |`);
  lines.push('');

  // Chain of command context
  if (config.chainOfCommand.length > 0) {
    lines.push('### Your Reporting Structure');
    lines.push('');
    const supervisors = config.chainOfCommand.filter(e => e.relationship === 'reports_to');
    const subordinates = config.chainOfCommand.filter(e => e.relationship === 'supervises');
    const peers = config.chainOfCommand.filter(e => e.relationship === 'peers_with');

    if (supervisors.length > 0) {
      lines.push(`**Reports to:** ${supervisors.map(s => `\`${s.agentName}\``).join(', ')}`);
    }
    if (subordinates.length > 0) {
      lines.push(`**Supervises:** ${subordinates.map(s => `\`${s.agentName}\``).join(', ')}`);
    }
    if (peers.length > 0) {
      lines.push(`**Peers with:** ${peers.map(s => `\`${s.agentName}\``).join(', ')}`);
    }
    lines.push('');
  }

  // Peer agents
  if (peerAgents.length > 0) {
    lines.push('## 👥 Peer Agents');
    lines.push('');
    lines.push('| Agent | Role | Specializations | Tools |');
    lines.push('|-------|------|-----------------|-------|');
    for (const peer of peerAgents) {
      const statusIcon = peer.status === 'active' ? '🟢' : peer.status === 'onboarding' ? '🟡' : '⚫';
      const specs = peer.specializations.slice(0, 3).join(', ') || '—';
      const tools = peer.toolCategories.slice(0, 4).map(t => `\`${t}\``).join(', ') || '—';
      lines.push(`| ${statusIcon} ${peer.emoji} ${peer.displayName} (\`${peer.name}\`) | ${peer.role} | ${specs} | ${tools} |`);
    }
    lines.push('');

    // Detailed peer profiles
    lines.push('### Detailed Peer Profiles');
    lines.push('');
    for (const peer of peerAgents) {
      const statusIcon = peer.status === 'active' ? '🟢' : peer.status === 'onboarding' ? '🟡' : '⚫';
      lines.push(`#### ${peer.emoji} ${peer.displayName} ${statusIcon}`);
      lines.push('');
      lines.push(`- **Name:** \`${peer.name}\``);
      lines.push(`- **Role:** ${peer.role}`);
      if (peer.specializations.length > 0) {
        lines.push(`- **Specializations:** ${peer.specializations.join(', ')}`);
      }
      if (peer.toolCategories.length > 0) {
        lines.push(`- **Tool Categories:** ${peer.toolCategories.map(t => `\`${t}\``).join(', ')}`);
      }
      lines.push('');
    }
  } else {
    lines.push('## 👥 Peer Agents');
    lines.push('');
    lines.push('_No other agents are currently registered._');
    lines.push('');
  }

  // Communication tips
  lines.push('## 💡 Collaboration Guidelines');
  lines.push('');
  lines.push('1. **Announce** what you\'re about to do');
  lines.push('2. **Report** progress while working');
  lines.push('3. **Summarize** results when done');
  lines.push('4. **Tag** the next agent for handoff');
  lines.push('');
  lines.push('When delegating, always include:');
  lines.push('- Clear description of the task');
  lines.push('- Expected output format');
  lines.push('- Deadline or priority level');
  lines.push('- Any relevant context or dependencies');
  lines.push('');

  return lines.join('\n');
}

// ─── Generate All Files ─────────────────────────────────────────────────────

/**
 * Generate all workspace files for an agent.
 *
 * @returns Record of filename → content
 */
export function generateAllFiles(
  config: AgentOnboardingConfig,
  peerAgents: PeerAgentInfo[] = []
): GeneratedFiles {
  const identityMd = generateIdentityMd(config);
  const soulMd = generateSoulMd(config);
  const toolsMd = generateToolsMd(config);
  const agentsMd = generateAgentsMd(config, peerAgents);

  // Generate skill files
  const skillFiles: Record<string, string> = {};
  for (const skill of config.skills) {
    if (skill.location) {
      skillFiles[skill.location] = generateSkillFile(skill);
    }
  }

  // Generate SOP files
  const sopFiles: Record<string, string> = {};
  if (config.sopTemplates) {
    for (const sop of config.sopTemplates) {
      const filename = `SOP_${sop.name.toUpperCase()}.md`;
      sopFiles[filename] = generateSOPFile(sop, config);
    }
  }

  return {
    identityMd,
    soulMd,
    toolsMd,
    agentsMd,
    skillFiles,
    sopFiles,
  };
}

/**
 * Generate all files as a flat Record<string, string> for simple consumption.
 */
export function generateAllFilesFlat(
  config: AgentOnboardingConfig,
  peerAgents: PeerAgentInfo[] = []
): Record<string, string> {
  const generated = generateAllFiles(config, peerAgents);
  const files: Record<string, string> = {
    'IDENTITY.md': generated.identityMd,
    'SOUL.md': generated.soulMd,
    'TOOLS.md': generated.toolsMd,
    'AGENTS.md': generated.agentsMd,
  };

  for (const [name, content] of Object.entries(generated.skillFiles)) {
    files[name] = content;
  }
  for (const [name, content] of Object.entries(generated.sopFiles)) {
    files[name] = content;
  }

  return files;
}

// ─── Individual File Generators ─────────────────────────────────────────────

function generateSkillFile(skill: SkillDefinition): string {
  const lines: string[] = [];
  lines.push(`# Skill: ${skill.name}`);
  lines.push('');
  lines.push(skill.description);
  lines.push('');
  lines.push('## Required Tools');
  lines.push('');
  for (const tool of skill.requiredTools) {
    lines.push(`- \`${tool}\``);
  }
  lines.push('');
  return lines.join('\n');
}

function generateSOPFile(sop: SOPTemplate, config: AgentOnboardingConfig): string {
  const lines: string[] = [];
  lines.push(`# SOP: ${sop.name}`);
  lines.push('');
  lines.push(`> ${sop.description}`);
  lines.push('');
  lines.push(`**Agent:** ${config.emoji} ${config.displayName}`);
  lines.push(`**Expected Duration:** ${sop.expectedDuration}`);
  lines.push(`**Required Tools:** ${sop.requiredTools.map(t => `\`${t}\``).join(', ')}`);
  lines.push('');
  lines.push('## Steps');
  lines.push('');

  const sorted = [...sop.steps].sort((a, b) => a.order - b.order);
  for (const step of sorted) {
    lines.push(`### Step ${step.order}: ${step.action}`);
    lines.push('');
    lines.push(step.description);
    lines.push('');
    if (step.toolRequired) {
      lines.push(`**Tool:** \`${step.toolRequired}\``);
    }
    lines.push(`**Acceptance Criteria:** ${step.acceptanceCriteria}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Formatting Helpers ─────────────────────────────────────────────────────

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatRelationship(rel: string): string {
  switch (rel) {
    case 'reports_to':   return '⬆️ Reports to';
    case 'supervises':   return '⬇️ Supervises';
    case 'peers_with':   return '↔️ Peers with';
    default:             return rel;
  }
}

function riskBadge(level: string): string {
  switch (level) {
    case 'low':    return '🟢 Low';
    case 'medium': return '🟡 Medium';
    case 'high':   return '🔴 High';
    default:       return level;
  }
}

function formatGuardrails(g: GuardrailConfig): string {
  const lines: string[] = [];
  lines.push('| Permission | Status |');
  lines.push('|------------|--------|');
  lines.push(`| Execute Code | ${g.canExecuteCode ? '✅ Allowed' : '❌ Denied'} |`);
  lines.push(`| Modify Files | ${g.canModifyFiles ? '✅ Allowed' : '❌ Denied'} |`);
  lines.push(`| Network Access | ${g.canAccessNetwork ? '✅ Allowed' : '❌ Denied'} |`);
  lines.push(`| Git Operations | ${g.canManageGit ? '✅ Allowed' : '❌ Denied'} |`);
  lines.push(`| Requires Approval | ${g.requiresApproval ? '✅ Yes' : '❌ No'} |`);
  lines.push(`| Max Budget/Run | $${g.maxBudgetPerRun.toFixed(2)} |`);
  return lines.join('\n');
}

function formatSOP(sop: SOPTemplate): string {
  const lines: string[] = [];
  lines.push(`### 📋 ${sop.name}`);
  lines.push('');
  lines.push(`> ${sop.description}`);
  lines.push('');
  lines.push(`**Expected Duration:** ${sop.expectedDuration}`);
  lines.push('');

  const sorted = [...sop.steps].sort((a, b) => a.order - b.order);
  for (const step of sorted) {
    const toolNote = step.toolRequired ? ` → \`${step.toolRequired}\`` : '';
    lines.push(`${step.order}. **${step.action}**${toolNote} — ${step.description}`);
    lines.push(`   _Criteria: ${step.acceptanceCriteria}_`);
  }
  lines.push('');
  return lines.join('\n');
}

function getAllToolNames(config: AgentOnboardingConfig): Array<{ name: string; source: string }> {
  const tools: Array<{ name: string; source: string }> = [];

  // Standard category tools
  for (const category of config.toolCategories) {
    const info = TOOL_CATEGORY_INFO[category];
    if (info) {
      for (const tool of info.tools) {
        tools.push({ name: tool, source: `${info.label} (\`${category}\`)` });
      }
    }
  }

  // Custom tools
  if (config.customTools) {
    for (const tool of config.customTools) {
      tools.push({ name: tool.name, source: 'Custom Tool' });
    }
  }

  // MCP server tools
  if (config.mcpServers) {
    for (const server of config.mcpServers) {
      for (const tool of server.tools) {
        tools.push({ name: tool, source: `MCP: ${server.name}` });
      }
    }
  }

  return tools;
}
