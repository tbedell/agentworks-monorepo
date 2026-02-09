import { mkdir, readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { createLogger } from '@agentworks/shared';
import type { AgentTool, ToolContext, ToolResult } from '../types.js';

const logger = createLogger('agent-tools:document-tools');

/**
 * Base directory for agent document storage.
 * Structure:
 *   /projects/{projectId}/.agent-docs/{agentName}/{docType}.md
 *   /projects/{projectId}/.agent-docs/_registry.json
 *   /projects/{projectId}/.agent-docs/_shared/{docId}.json
 */
const PROJECTS_ROOT = '/projects';

function getAgentDocsRoot(projectId: string): string {
  return join(PROJECTS_ROOT, projectId, '.agent-docs');
}

function getAgentDir(projectId: string, agentName: string): string {
  return join(getAgentDocsRoot(projectId), agentName);
}

function getRegistryPath(projectId: string): string {
  return join(getAgentDocsRoot(projectId), '_registry.json');
}

function getSharedDir(projectId: string): string {
  return join(getAgentDocsRoot(projectId), '_shared');
}

async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

async function safeReadJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function safeWriteJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── publish_brief ───────────────────────────────────────────────────────────

export const publishBriefTool: AgentTool = {
  name: 'publish_brief',
  description:
    'Publish a document (plan, analysis, report, brief) to shared agent storage. ' +
    'Other agents can discover and read it via read_agent_briefs or list_agent_documents.',
  category: 'document',
  parameters: [
    {
      name: 'docType',
      type: 'string',
      description:
        'The type/name of the document (e.g., "plan", "analysis", "status-report", "architecture"). ' +
        'Used as the filename stem.',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'The full markdown content of the document.',
      required: true,
    },
    {
      name: 'title',
      type: 'string',
      description: 'A human-readable title for the document.',
      required: false,
    },
    {
      name: 'tags',
      type: 'array',
      description: 'Optional tags for categorizing the document (e.g., ["sprint-1", "backend"]).',
      required: false,
      items: { type: 'string' },
    },
  ],
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const docType = args.docType as string;
    const content = args.content as string;
    const title = (args.title as string) || docType;
    const tags = (args.tags as string[]) || [];

    if (!docType) {
      return { success: false, error: 'docType is required' };
    }
    if (!content) {
      return { success: false, error: 'content is required' };
    }

    // Sanitise docType to a safe filename
    const safeDocType = docType.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

    try {
      const agentDir = getAgentDir(context.projectId, context.agentName);
      await ensureDir(agentDir);

      // Write the markdown content
      const docPath = join(agentDir, `${safeDocType}.md`);
      await writeFile(docPath, content, 'utf-8');

      // Write/update the manifest entry alongside the doc
      const manifestPath = join(agentDir, `${safeDocType}.meta.json`);
      const existing = await safeReadJson<{ version: number }>(manifestPath, {
        version: 0,
      });
      const meta = {
        docType: safeDocType,
        title,
        agent: context.agentName,
        tags,
        version: existing.version + 1,
        size: content.length,
        createdAt:
          existing.version === 0 ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      };
      await safeWriteJson(manifestPath, meta);

      logger.info('Brief published', {
        projectId: context.projectId,
        agent: context.agentName,
        docType: safeDocType,
        version: meta.version,
      });

      return {
        success: true,
        data: {
          docType: safeDocType,
          title,
          agent: context.agentName,
          version: meta.version,
          size: content.length,
          path: docPath,
        },
      };
    } catch (error) {
      logger.error('Failed to publish brief', {
        projectId: context.projectId,
        agent: context.agentName,
        docType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish brief',
      };
    }
  },
};

// ─── read_agent_briefs ───────────────────────────────────────────────────────

export const readAgentBriefsTool: AgentTool = {
  name: 'read_agent_briefs',
  description:
    'Read briefs published by a specific agent or all agents. ' +
    'Returns the document content along with metadata. ' +
    'Filter by agent name and/or document type.',
  category: 'document',
  parameters: [
    {
      name: 'agentName',
      type: 'string',
      description:
        'The name of the agent whose briefs to read. Leave empty to search all agents.',
      required: false,
    },
    {
      name: 'docType',
      type: 'string',
      description:
        'The specific document type to read (e.g., "plan"). Leave empty to read all briefs for the agent.',
      required: false,
    },
  ],
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const agentName = args.agentName as string | undefined;
    const docType = args.docType as string | undefined;
    const safeDocType = docType
      ? docType.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
      : undefined;

    try {
      const docsRoot = getAgentDocsRoot(context.projectId);
      await ensureDir(docsRoot);

      // Determine which agent dirs to scan
      let agentDirs: string[];
      if (agentName) {
        agentDirs = [agentName];
      } else {
        const entries = await readdir(docsRoot, { withFileTypes: true });
        agentDirs = entries
          .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
          .map((e) => e.name);
      }

      const results: Array<{
        agent: string;
        docType: string;
        title: string;
        version: number;
        updatedAt: string;
        content: string;
        tags: string[];
      }> = [];

      for (const agent of agentDirs) {
        const agentDir = join(docsRoot, agent);

        let mdFiles: string[];
        try {
          const files = await readdir(agentDir);
          mdFiles = files.filter((f) => f.endsWith('.md'));
        } catch {
          continue; // agent dir doesn't exist yet
        }

        for (const mdFile of mdFiles) {
          const dt = mdFile.replace(/\.md$/, '');
          if (safeDocType && dt !== safeDocType) continue;

          const content = await readFile(join(agentDir, mdFile), 'utf-8');
          const meta = await safeReadJson<{
            title?: string;
            version?: number;
            updatedAt?: string;
            tags?: string[];
          }>(join(agentDir, `${dt}.meta.json`), {});

          results.push({
            agent,
            docType: dt,
            title: meta.title || dt,
            version: meta.version || 1,
            updatedAt: meta.updatedAt || 'unknown',
            content,
            tags: meta.tags || [],
          });
        }
      }

      logger.info('Briefs read', {
        projectId: context.projectId,
        requestedBy: context.agentName,
        agentFilter: agentName || 'all',
        docTypeFilter: safeDocType || 'all',
        count: results.length,
      });

      return {
        success: true,
        data: {
          briefs: results,
          count: results.length,
        },
      };
    } catch (error) {
      logger.error('Failed to read briefs', {
        projectId: context.projectId,
        agent: context.agentName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read briefs',
      };
    }
  },
};

// ─── list_agent_documents ────────────────────────────────────────────────────

export const listAgentDocumentsTool: AgentTool = {
  name: 'list_agent_documents',
  description:
    'List all documents published by agents. Returns a summary (agent, docType, title, version, updatedAt) ' +
    'without the full content. Useful for discovering what information is available.',
  category: 'document',
  parameters: [
    {
      name: 'agentName',
      type: 'string',
      description:
        'Optionally filter to a specific agent. Leave empty to list all agents\' documents.',
      required: false,
    },
  ],
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const agentName = args.agentName as string | undefined;

    try {
      const docsRoot = getAgentDocsRoot(context.projectId);
      await ensureDir(docsRoot);

      let agentDirs: string[];
      if (agentName) {
        agentDirs = [agentName];
      } else {
        const entries = await readdir(docsRoot, { withFileTypes: true });
        agentDirs = entries
          .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
          .map((e) => e.name);
      }

      const documents: Array<{
        agent: string;
        docType: string;
        title: string;
        version: number;
        size: number;
        updatedAt: string;
        tags: string[];
      }> = [];

      for (const agent of agentDirs) {
        const agentDir = join(docsRoot, agent);

        let metaFiles: string[];
        try {
          const files = await readdir(agentDir);
          metaFiles = files.filter((f) => f.endsWith('.meta.json'));
        } catch {
          continue;
        }

        for (const metaFile of metaFiles) {
          const meta = await safeReadJson<{
            docType?: string;
            title?: string;
            version?: number;
            size?: number;
            updatedAt?: string;
            tags?: string[];
          }>(join(agentDir, metaFile), {});

          const dt = metaFile.replace(/\.meta\.json$/, '');

          documents.push({
            agent,
            docType: meta.docType || dt,
            title: meta.title || dt,
            version: meta.version || 1,
            size: meta.size || 0,
            updatedAt: meta.updatedAt || 'unknown',
            tags: meta.tags || [],
          });
        }
      }

      // Sort by most recently updated
      documents.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      logger.info('Documents listed', {
        projectId: context.projectId,
        requestedBy: context.agentName,
        count: documents.length,
      });

      return {
        success: true,
        data: {
          documents,
          count: documents.length,
        },
      };
    } catch (error) {
      logger.error('Failed to list documents', {
        projectId: context.projectId,
        agent: context.agentName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to list documents',
      };
    }
  },
};

// ─── share_document ──────────────────────────────────────────────────────────

export const shareDocumentTool: AgentTool = {
  name: 'share_document',
  description:
    'Share a document with one or more specific agents by creating a reference in the shared namespace. ' +
    'The target agents can then find it via read_agent_briefs or list_agent_documents.',
  category: 'document',
  parameters: [
    {
      name: 'docType',
      type: 'string',
      description:
        'The document type to share (must already be published by the current agent).',
      required: true,
    },
    {
      name: 'targetAgents',
      type: 'array',
      description:
        'List of agent names to share the document with (e.g., ["dev_backend", "architect"]).',
      required: true,
      items: { type: 'string' },
    },
    {
      name: 'message',
      type: 'string',
      description:
        'Optional message or note to include with the share notification.',
      required: false,
    },
  ],
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const docType = args.docType as string;
    const targetAgents = args.targetAgents as string[];
    const message = (args.message as string) || '';

    if (!docType) {
      return { success: false, error: 'docType is required' };
    }
    if (!targetAgents || targetAgents.length === 0) {
      return { success: false, error: 'targetAgents is required and must not be empty' };
    }

    const safeDocType = docType.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

    try {
      // Verify the source document exists
      const sourceDocPath = join(
        getAgentDir(context.projectId, context.agentName),
        `${safeDocType}.md`,
      );
      let sourceContent: string;
      try {
        sourceContent = await readFile(sourceDocPath, 'utf-8');
      } catch {
        return {
          success: false,
          error: `Document "${safeDocType}" not found in your published briefs. Publish it first.`,
        };
      }

      const sourceMeta = await safeReadJson<Record<string, unknown>>(
        join(
          getAgentDir(context.projectId, context.agentName),
          `${safeDocType}.meta.json`,
        ),
        {},
      );

      // Create a shared reference
      const sharedDir = getSharedDir(context.projectId);
      await ensureDir(sharedDir);

      const shareId = `${context.agentName}_${safeDocType}_${Date.now()}`;
      const shareRecord = {
        shareId,
        fromAgent: context.agentName,
        docType: safeDocType,
        targetAgents,
        message,
        sharedAt: new Date().toISOString(),
        sourceMeta,
      };

      await safeWriteJson(join(sharedDir, `${shareId}.json`), shareRecord);

      // Also copy the document into each target agent's directory for easy access
      const copiedTo: string[] = [];
      for (const target of targetAgents) {
        const targetDir = getAgentDir(context.projectId, target);
        await ensureDir(targetDir);

        const sharedDocType = `shared-${context.agentName}-${safeDocType}`;
        await writeFile(
          join(targetDir, `${sharedDocType}.md`),
          sourceContent,
          'utf-8',
        );
        await safeWriteJson(join(targetDir, `${sharedDocType}.meta.json`), {
          docType: sharedDocType,
          title: `[Shared by ${context.agentName}] ${sourceMeta.title || safeDocType}`,
          agent: target,
          sharedBy: context.agentName,
          originalDocType: safeDocType,
          message,
          version: 1,
          size: sourceContent.length,
          tags: ['shared', ...(Array.isArray(sourceMeta.tags) ? sourceMeta.tags : [])],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        copiedTo.push(target);
      }

      logger.info('Document shared', {
        projectId: context.projectId,
        fromAgent: context.agentName,
        docType: safeDocType,
        targetAgents: copiedTo,
      });

      return {
        success: true,
        data: {
          shareId,
          docType: safeDocType,
          sharedWith: copiedTo,
          message,
        },
      };
    } catch (error) {
      logger.error('Failed to share document', {
        projectId: context.projectId,
        agent: context.agentName,
        docType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to share document',
      };
    }
  },
};

// ─── get_peer_registry ───────────────────────────────────────────────────────

/**
 * Default team roster — baked in as a fallback. Projects can override
 * by writing a custom _registry.json.
 */
const DEFAULT_PEER_REGISTRY = [
  {
    agent: 'ceo_copilot',
    role: 'CEO Co-Pilot',
    focus: 'Strategic oversight, executive decisions, vision alignment',
    tools: ['file', 'git-read', 'search', 'kanban', 'docs'],
  },
  {
    agent: 'strategy',
    role: 'Strategy',
    focus: 'Business strategy, competitive analysis, go-to-market',
    tools: ['file', 'search', 'kanban', 'docs'],
  },
  {
    agent: 'storyboard_ux',
    role: 'Storyboard & UX',
    focus: 'User flows, storyboards, wireframes, UX research',
    tools: ['file', 'search', 'kanban', 'ui-builder'],
  },
  {
    agent: 'prd',
    role: 'Product Requirements',
    focus: 'PRD authoring, feature specifications, acceptance criteria',
    tools: ['file', 'search', 'kanban', 'docs'],
  },
  {
    agent: 'mvp_scope',
    role: 'MVP Scope',
    focus: 'MVP definition, scope management, prioritisation',
    tools: ['file', 'search', 'kanban', 'docs'],
  },
  {
    agent: 'research',
    role: 'Research',
    focus: 'Market research, competitor analysis, technology research',
    tools: ['file-read', 'search', 'kanban', 'docs'],
  },
  {
    agent: 'architect',
    role: 'Architect',
    focus: 'System architecture, data modelling, API design, tech decisions',
    tools: ['file', 'git-read', 'search', 'kanban', 'db-builder', 'workflow-builder'],
  },
  {
    agent: 'planner',
    role: 'Planner',
    focus: 'Sprint planning, task breakdown, scheduling, dependency management',
    tools: ['file', 'git-read', 'search', 'kanban', 'docs'],
  },
  {
    agent: 'code_standards',
    role: 'Code Standards',
    focus: 'Coding standards, linting rules, style guides, code review criteria',
    tools: ['file', 'git-read', 'code-lint', 'search'],
  },
  {
    agent: 'dev_backend',
    role: 'Backend Developer',
    focus: 'Server-side code, APIs, databases, integrations',
    tools: ['file', 'git', 'code', 'search', 'kanban', 'db-builder'],
  },
  {
    agent: 'dev_frontend',
    role: 'Frontend Developer',
    focus: 'UI components, client-side logic, styling, state management',
    tools: ['file', 'git', 'code', 'search', 'kanban', 'ui-builder'],
  },
  {
    agent: 'devops',
    role: 'DevOps',
    focus: 'CI/CD, infrastructure, deployment, monitoring, containerisation',
    tools: ['file', 'git', 'code', 'kanban', 'workflow-builder'],
  },
  {
    agent: 'qa',
    role: 'QA / Testing',
    focus: 'Test strategy, test authoring, quality assurance, bug tracking',
    tools: ['file', 'git-read', 'code', 'search', 'kanban'],
  },
  {
    agent: 'troubleshooter',
    role: 'Troubleshooter',
    focus: 'Debugging, incident response, root-cause analysis, performance',
    tools: ['file-read', 'git-read', 'code', 'search'],
  },
  {
    agent: 'docs',
    role: 'Documentation',
    focus: 'Technical writing, API docs, guides, onboarding material',
    tools: ['file', 'git-read', 'search', 'kanban', 'docs'],
  },
  {
    agent: 'refactor',
    role: 'Refactor / Optimise',
    focus: 'Code refactoring, performance optimisation, tech debt reduction',
    tools: ['file', 'git', 'code', 'search'],
  },
  {
    agent: 'claude_code_agent',
    role: 'Full-Stack Claude Code Agent',
    focus: 'End-to-end development, all tools available',
    tools: ['all'],
  },
  {
    agent: 'cms_wordpress',
    role: 'WordPress CMS Developer',
    focus: 'WordPress themes, plugins, blocks, WP-CLI, PHPCS',
    tools: ['file', 'git', 'code', 'search', 'wordpress', 'kanban'],
  },
  {
    agent: 'design_ux',
    role: 'Design UX',
    focus: 'Visual design, UI mockups, workflow design, brand assets',
    tools: ['file', 'search', 'kanban', 'ui-builder', 'workflow-builder'],
  },
];

export const getPeerRegistryTool: AgentTool = {
  name: 'get_peer_registry',
  description:
    'Returns the team roster with agent names, roles, specialisations, and available tool categories. ' +
    'Use this to understand who does what so you can share documents with the right agents.',
  category: 'document',
  parameters: [
    {
      name: 'agentName',
      type: 'string',
      description:
        'Optionally get info for a specific agent. Leave empty to get the full roster.',
      required: false,
    },
  ],
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolResult> => {
    const agentName = args.agentName as string | undefined;

    try {
      // Try to load project-specific registry, fall back to defaults
      const registryPath = getRegistryPath(context.projectId);
      const registry = await safeReadJson<typeof DEFAULT_PEER_REGISTRY>(
        registryPath,
        DEFAULT_PEER_REGISTRY,
      );

      let results = registry;
      if (agentName) {
        results = registry.filter((r) => r.agent === agentName);
        if (results.length === 0) {
          return {
            success: false,
            error: `Agent "${agentName}" not found in the peer registry.`,
          };
        }
      }

      logger.info('Peer registry queried', {
        projectId: context.projectId,
        requestedBy: context.agentName,
        filter: agentName || 'all',
        count: results.length,
      });

      return {
        success: true,
        data: {
          agents: results,
          count: results.length,
        },
      };
    } catch (error) {
      logger.error('Failed to get peer registry', {
        projectId: context.projectId,
        agent: context.agentName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get peer registry',
      };
    }
  },
};

// ─── Export ──────────────────────────────────────────────────────────────────

export const documentTools: AgentTool[] = [
  publishBriefTool,
  readAgentBriefsTool,
  listAgentDocumentsTool,
  shareDocumentTool,
  getPeerRegistryTool,
];
