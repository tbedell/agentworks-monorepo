import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '@agentworks/shared';

const logger = createLogger('claude-md-generator');

interface PlanningStatus {
  blueprint: { exists: boolean; approved: boolean };
  prd: { exists: boolean; approved: boolean };
  mvp: { exists: boolean; approved: boolean };
  playbook: { exists: boolean; approved: boolean };
}

interface ProjectContext {
  projectId: string;
  projectName: string;
  projectPath: string;
  workspaceId?: string;
  boardId?: string;
}

/**
 * Check if a planning document exists and is approved
 */
function checkDocument(docsPath: string, filename: string): { exists: boolean; approved: boolean } {
  const filePath = path.join(docsPath, filename);
  const exists = fs.existsSync(filePath);

  if (!exists) {
    return { exists: false, approved: false };
  }

  // Check if document contains approval marker
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const approved = content.includes('APPROVED') ||
                     content.includes('Status: Approved') ||
                     content.includes('## Approval') ||
                     content.includes('✓ Approved');
    return { exists: true, approved };
  } catch {
    return { exists: true, approved: false };
  }
}

/**
 * Get the planning status for a project
 */
export function getPlanningStatus(projectPath: string): PlanningStatus {
  const docsPath = path.join(projectPath, 'docs');

  return {
    blueprint: checkDocument(docsPath, 'BLUEPRINT.md'),
    prd: checkDocument(docsPath, 'PRD.md'),
    mvp: checkDocument(docsPath, 'MVP.md'),
    playbook: checkDocument(docsPath, 'PLAYBOOK.md'),
  };
}

/**
 * Check if all planning documents are complete and approved
 */
export function isPlanningComplete(status: PlanningStatus): boolean {
  return status.blueprint.exists && status.blueprint.approved &&
         status.prd.exists && status.prd.approved &&
         status.mvp.exists && status.mvp.approved &&
         status.playbook.exists && status.playbook.approved;
}

/**
 * Get list of missing planning documents
 */
export function getMissingDocuments(status: PlanningStatus): string[] {
  const missing: string[] = [];

  if (!status.blueprint.exists) missing.push('BLUEPRINT.md');
  else if (!status.blueprint.approved) missing.push('BLUEPRINT.md (not approved)');

  if (!status.prd.exists) missing.push('PRD.md');
  else if (!status.prd.approved) missing.push('PRD.md (not approved)');

  if (!status.mvp.exists) missing.push('MVP.md');
  else if (!status.mvp.approved) missing.push('MVP.md (not approved)');

  if (!status.playbook.exists) missing.push('PLAYBOOK.md');
  else if (!status.playbook.approved) missing.push('PLAYBOOK.md (not approved)');

  return missing;
}

/**
 * Generate status indicator
 */
function statusIndicator(doc: { exists: boolean; approved: boolean }): string {
  if (!doc.exists) return '❌ Missing';
  if (!doc.approved) return '⚠️ Pending Approval';
  return '✓ Approved';
}

/**
 * Generate the project-specific CLAUDE.md content
 */
export function generateClaudeMd(context: ProjectContext): string {
  const status = getPlanningStatus(context.projectPath);
  const planningComplete = isPlanningComplete(status);
  const missing = getMissingDocuments(status);

  const content = `# Project: ${context.projectName}

## AgentWorks Integration

This project is managed by AgentWorks. When working in this terminal, your actions
will be tracked and integrated with the Kanban board workflow.

- **Project ID**: ${context.projectId}
- **Project Path**: ${context.projectPath}
${context.workspaceId ? `- **Workspace ID**: ${context.workspaceId}` : ''}
${context.boardId ? `- **Board ID**: ${context.boardId}` : ''}

## Session Context

Context files are maintained in \`.context/\` directory:
- \`.context/PROJECT.context\` - Accumulated project history and decisions
- \`.context/AGENTS.context\` - Agent activity log across sessions
- \`.context/PLANNING.context\` - Document status and CoPilot conversation summary

Review these files to understand the full project context before making changes.

## Planning Status

${planningComplete ? '### ✓ Planning Complete - Ready to Build!' : '### ⚠️ Planning Incomplete'}

| Document | Status |
|----------|--------|
| Blueprint | ${statusIndicator(status.blueprint)} |
| PRD | ${statusIndicator(status.prd)} |
| MVP | ${statusIndicator(status.mvp)} |
| Playbook | ${statusIndicator(status.playbook)} |

${missing.length > 0 ? `
### Missing Documents
${missing.map(m => `- ${m}`).join('\n')}

**Note**: Complete planning before building to ensure alignment with project vision.
` : ''}

## Context Files

When planning or building, refer to these documents:
- \`docs/BLUEPRINT.md\` - Project vision, strategy, and UX storyboards
- \`docs/PRD.md\` - Product requirements document
- \`docs/MVP.md\` - Minimum viable product scope
- \`docs/PLAYBOOK.md\` - Agent execution playbook

## Integration Guidelines

1. **Before Building**: Check planning status above
2. **Create Cards**: Building tasks should create Kanban cards
3. **Follow Playbook**: Use agent assignments from PLAYBOOK.md
4. **Update Status**: Mark cards complete when done

## API Endpoints

- **Planning Status**: \`GET /api/projects/${context.projectId}/planning-status\`
- **Create Card**: \`POST /api/boards/${context.boardId || 'default'}/cards\`
- **Update Card**: \`PUT /api/cards/:cardId\`

---
*Generated by AgentWorks Terminal Gateway*
*This file is auto-generated and will be updated when terminal sessions start*
`;

  return content;
}

/**
 * Generate the pre-tool-use hook script for planning enforcement
 */
function generatePreToolUseHook(context: ProjectContext): string {
  const apiUrl = process.env.AGENTWORKS_API_URL || 'http://localhost:3010';

  return `#!/bin/bash
# AgentWorks Planning Enforcement Hook
# This hook checks if planning documents are complete before allowing build operations
#
# To disable this hook, set AGENTWORKS_SKIP_PLANNING_CHECK=1

TOOL_NAME="\$1"
PROJECT_ID="${context.projectId}"
API_URL="${apiUrl}"

# Allow these tools without checking
ALLOWED_TOOLS="Read|Glob|Grep|Task|WebFetch|WebSearch|AskUserQuestion"

# Check if we should skip the planning check
if [ "\${AGENTWORKS_SKIP_PLANNING_CHECK}" = "1" ]; then
  exit 0
fi

# If tool is a "building" tool (Edit, Write, Bash), check planning status
if [[ "\$TOOL_NAME" =~ ^(Edit|Write|Bash|NotebookEdit)$ ]]; then
  # Try to get planning status from API
  RESPONSE=\$(curl -s --max-time 2 "\${API_URL}/api/projects/\${PROJECT_ID}/planning-status" 2>/dev/null)

  if [ \$? -eq 0 ] && [ -n "\$RESPONSE" ]; then
    COMPLETE=\$(echo "\$RESPONSE" | grep -o '"planningComplete":[^,}]*' | cut -d: -f2)

    if [ "\$COMPLETE" = "false" ]; then
      MISSING=\$(echo "\$RESPONSE" | grep -o '"missing":\\[[^]]*\\]' | sed 's/"missing"://;s/\\[//;s/\\]//;s/"//g')

      echo ""
      echo "⚠️  AgentWorks: Planning documents not complete"
      echo ""
      echo "Missing or unapproved documents:"
      echo "\$MISSING" | tr ',' '\\n' | while read doc; do
        echo "  • \$doc"
      done
      echo ""
      echo "Complete planning before building. Use the CoPilot UI or run:"
      echo "  claude /planning"
      echo ""
      echo "To bypass this check (not recommended):"
      echo "  export AGENTWORKS_SKIP_PLANNING_CHECK=1"
      echo ""

      # Block the tool - exit with non-zero
      exit 1
    fi
  fi

  # If API unreachable or planning complete, allow the tool
fi

# Allow the tool
exit 0
`;
}

/**
 * Generate settings.json for Claude Code
 */
function generateSettingsJson(context: ProjectContext): string {
  return JSON.stringify({
    hooks: {
      'pre-tool-use': [
        {
          command: '.claude/hooks/pre-tool-use.sh "$TOOL_NAME"',
          timeout: 5000,
        }
      ]
    },
    project: {
      id: context.projectId,
      name: context.projectName,
      workspace: context.workspaceId || null,
      board: context.boardId || null,
    }
  }, null, 2);
}

/**
 * Generate the initial PROJECT.context file content
 */
function generateProjectContext(context: ProjectContext): string {
  const timestamp = new Date().toISOString();
  return `# Project Context: ${context.projectName}

## Overview
This file contains accumulated project history and key decisions.
It is updated as the project evolves through AgentWorks sessions.

## Project Details
- **Created**: ${timestamp}
- **Project ID**: ${context.projectId}
${context.workspaceId ? `- **Workspace ID**: ${context.workspaceId}` : ''}
${context.boardId ? `- **Board ID**: ${context.boardId}` : ''}

## Key Decisions
<!-- Add important project decisions and their rationale here -->

## Architecture Notes
<!-- Add architecture decisions and patterns here -->

## Session History
- ${timestamp} - Project context initialized

---
*This file is part of AgentWorks context persistence*
`;
}

/**
 * Generate the initial AGENTS.context file content
 */
function generateAgentsContext(context: ProjectContext): string {
  const timestamp = new Date().toISOString();
  return `# Agent Activity Log: ${context.projectName}

## Overview
This file tracks agent activity across all terminal sessions.
Each agent execution is logged here for context continuity.

## Recent Activity
<!-- Agent executions will be logged here -->

## Active Agents
<!-- Currently configured agents for this project -->

## Session Log
- ${timestamp} - Context initialized

---
*This file is part of AgentWorks context persistence*
`;
}

/**
 * Generate the initial PLANNING.context file content
 */
function generatePlanningContext(context: ProjectContext): string {
  const timestamp = new Date().toISOString();
  const status = getPlanningStatus(context.projectPath);

  return `# Planning Context: ${context.projectName}

## Overview
This file summarizes the CoPilot planning conversation and document status.
It helps maintain context across planning sessions.

## Document Status (as of ${timestamp})
- Blueprint: ${statusIndicator(status.blueprint)}
- PRD: ${statusIndicator(status.prd)}
- MVP: ${statusIndicator(status.mvp)}
- Playbook: ${statusIndicator(status.playbook)}

## CoPilot Conversation Summary
<!-- Key points from CoPilot planning conversations -->

## Vision Summary
<!-- Brief summary of the project vision -->

## Requirements Summary
<!-- Key requirements discussed -->

## Goals Summary
<!-- Main goals and success metrics -->

---
*This file is part of AgentWorks context persistence*
`;
}

/**
 * Ensure the .context directory exists and create context files
 */
async function ensureContextDirectory(context: ProjectContext): Promise<void> {
  const contextDir = path.join(context.projectPath, '.context');
  const projectContextPath = path.join(contextDir, 'PROJECT.context');
  const agentsContextPath = path.join(contextDir, 'AGENTS.context');
  const planningContextPath = path.join(contextDir, 'PLANNING.context');

  try {
    // Create .context directory if it doesn't exist
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
      logger.info('Created .context directory', { projectPath: context.projectPath });
    }

    // Create PROJECT.context if it doesn't exist (don't overwrite existing)
    if (!fs.existsSync(projectContextPath)) {
      fs.writeFileSync(projectContextPath, generateProjectContext(context), 'utf-8');
      logger.debug('Created PROJECT.context', { projectContextPath });
    }

    // Create AGENTS.context if it doesn't exist
    if (!fs.existsSync(agentsContextPath)) {
      fs.writeFileSync(agentsContextPath, generateAgentsContext(context), 'utf-8');
      logger.debug('Created AGENTS.context', { agentsContextPath });
    }

    // Create PLANNING.context if it doesn't exist
    if (!fs.existsSync(planningContextPath)) {
      fs.writeFileSync(planningContextPath, generatePlanningContext(context), 'utf-8');
      logger.debug('Created PLANNING.context', { planningContextPath });
    }
  } catch (error) {
    logger.error('Failed to create .context directory', { error, context });
  }
}

/**
 * Ensure the .claude directory exists and write CLAUDE.md
 */
export async function ensureProjectClaudeMd(context: ProjectContext): Promise<void> {
  const claudeDir = path.join(context.projectPath, '.claude');
  const hooksDir = path.join(claudeDir, 'hooks');
  const claudeMdPath = path.join(claudeDir, 'CLAUDE.md');
  const settingsPath = path.join(claudeDir, 'settings.json');
  const preToolUsePath = path.join(hooksDir, 'pre-tool-use.sh');

  try {
    // Create .claude and hooks directories if they don't exist
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
      logger.info('Created .claude/hooks directory', { projectPath: context.projectPath });
    }

    // Generate and write CLAUDE.md
    const content = generateClaudeMd(context);
    fs.writeFileSync(claudeMdPath, content, 'utf-8');
    logger.info('Generated project CLAUDE.md', { claudeMdPath });

    // Generate and write settings.json
    const settings = generateSettingsJson(context);
    fs.writeFileSync(settingsPath, settings, 'utf-8');
    logger.debug('Generated project settings.json', { settingsPath });

    // Generate and write pre-tool-use hook
    const hookScript = generatePreToolUseHook(context);
    fs.writeFileSync(preToolUsePath, hookScript, { mode: 0o755 });
    logger.debug('Generated pre-tool-use hook', { preToolUsePath });

    // Ensure .context directory and files exist
    await ensureContextDirectory(context);

    // Also ensure .gitignore includes .claude and .context if it exists
    const gitignorePath = path.join(context.projectPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      let gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      let modified = false;

      if (!gitignore.includes('.claude/')) {
        gitignore += '\n# AgentWorks generated\n.claude/\n';
        modified = true;
      }
      if (!gitignore.includes('.context/')) {
        gitignore += '.context/\n';
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(gitignorePath, gitignore, 'utf-8');
        logger.debug('Updated .gitignore with AgentWorks directories');
      }
    }
  } catch (error) {
    logger.error('Failed to generate project CLAUDE.md', { error, context });
  }
}
