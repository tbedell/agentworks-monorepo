import type { FastifyPluginAsync } from 'fastify';
import { prisma, Prisma } from '@agentworks/db';
import { createProjectSchema, LANES } from '@agentworks/shared';
import { lucia } from '../lib/auth.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Document type to filename mapping
const DOC_TYPE_TO_FILENAME: Record<string, string> = {
  blueprint: 'BLUEPRINT.md',
  prd: 'PRD.md',
  mvp: 'MVP.md',
  playbook: 'PLAYBOOK.md',
  plan: 'PLAN.md',
};

// Alternative filenames to check (for legacy/agent-written files)
// Order matters - first match wins
const ALTERNATIVE_FILENAMES: Record<string, string[]> = {
  playbook: ['AGENT_PLAYBOOK.md', 'PLAYBOOK.md'],
  blueprint: ['BLUEPRINT.md', 'PROJECT_BLUEPRINT.md'],
  prd: ['PRD.md', 'PRODUCT_REQUIREMENTS.md'],
  mvp: ['MVP.md', 'MVP_DEFINITION.md'],
  plan: ['PLAN.md'],
};

/**
 * Detect if content is just a skeleton header with no real content.
 * Skeleton content should never overwrite real content.
 */
function isSkeletonContent(content: string | null | undefined): boolean {
  if (!content) return true;
  const trimmed = content.trim();
  // Empty or very short content (just a header)
  if (trimmed.length < 50) {
    // Check if it's just a markdown header line
    return /^#\s+[\w\s]+(\n\s*)?$/.test(trimmed);
  }
  return false;
}

/**
 * Synchronize a document to the project's filesystem.
 * This ensures the /docs folder stays in sync with database changes.
 * Works across all projects platform-wide.
 */
async function syncDocumentToFilesystem(
  localPath: string | null,
  docType: string,
  content: string
): Promise<{ synced: boolean; filePath?: string; error?: string }> {
  if (!localPath) {
    return { synced: false, error: 'No local path configured for project' };
  }

  try {
    const docsDir = path.join(localPath, 'docs');
    await fs.mkdir(docsDir, { recursive: true });

    const normalizedType = docType.toLowerCase();
    const fileName = DOC_TYPE_TO_FILENAME[normalizedType] || `${docType.toUpperCase()}.md`;
    const filePath = path.join(docsDir, fileName);

    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`[DocSync] Synced ${docType} to ${filePath}`);

    return { synced: true, filePath };
  } catch (error: any) {
    console.error(`[DocSync] Failed to sync ${docType}:`, error);
    return { synced: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * Read a document directly from the project's filesystem.
 * Used to check if filesystem and database are in sync.
 * Tries alternative filenames (e.g., AGENT_PLAYBOOK.md for playbook).
 */
async function readDocumentFromFilesystem(
  localPath: string | null,
  docType: string
): Promise<{ content: string | null; filePath?: string; fileName?: string; error?: string }> {
  if (!localPath) {
    return { content: null, error: 'No local path configured for project' };
  }

  const normalizedType = docType.toLowerCase();
  const docsDir = path.join(localPath, 'docs');

  // Get list of filenames to try (alternative filenames first, then default)
  const filenamesToTry = ALTERNATIVE_FILENAMES[normalizedType] ||
    [DOC_TYPE_TO_FILENAME[normalizedType] || `${docType.toUpperCase()}.md`];

  // Try each filename until we find one that exists with content
  for (const fileName of filenamesToTry) {
    const filePath = path.join(docsDir, fileName);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      // If we found a file with real content, use it
      if (content && !isSkeletonContent(content)) {
        console.log(`[DocSync] Found ${docType} content in ${fileName}`);
        return { content, filePath, fileName };
      }
      // Keep track of skeleton file in case no better file exists
      if (content) {
        // Continue checking other files, but remember this one
        continue;
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`[DocSync] Error reading ${fileName}:`, error);
      }
      // File not found, try next
      continue;
    }
  }

  // No file with real content found, try to return any file that exists (even skeleton)
  for (const fileName of filenamesToTry) {
    const filePath = path.join(docsDir, fileName);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return { content, filePath, fileName };
    } catch {
      continue;
    }
  }

  return { content: null, error: 'File not found', fileName: filenamesToTry[0] };
}

// Sync state types for timestamp-based synchronization
type SyncState = 'in_sync' | 'db_newer' | 'file_newer' | 'conflict' | 'file_missing' | 'no_local_path';

interface TimestampInfo {
  dbUpdatedAt: Date | null;
  fileMtime: Date | null;
  lastSyncedAt: Date | null;
}

interface SyncAnalysis {
  state: SyncState;
  dbContent: string;
  fileContent: string | null;
  timestamps: TimestampInfo;
}

/**
 * Get file modification time with proper error handling
 */
async function getFileMtime(filePath: string): Promise<Date | null> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch (error: any) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Analyze sync state between DB and filesystem using timestamps.
 * Determines whether the database or filesystem version is newer,
 * or if there's a conflict requiring user resolution.
 *
 * IMPORTANT: Content quality check takes precedence over timestamps.
 * Skeleton content (just a header) should never overwrite real content.
 */
async function analyzeSyncState(
  localPath: string | null,
  docType: string,
  dbDoc: { content: string; updatedAt: Date; lastSyncedAt: Date | null } | null
): Promise<SyncAnalysis> {
  // No local path configured
  if (!localPath) {
    return {
      state: 'no_local_path',
      dbContent: dbDoc?.content || '',
      fileContent: null,
      timestamps: {
        dbUpdatedAt: dbDoc?.updatedAt || null,
        fileMtime: null,
        lastSyncedAt: dbDoc?.lastSyncedAt || null,
      },
    };
  }

  const normalizedType = docType.toLowerCase();

  // Read from filesystem (handles alternative filenames like AGENT_PLAYBOOK.md)
  const fileResult = await readDocumentFromFilesystem(localPath, normalizedType);
  const actualFilePath = fileResult.filePath || path.join(localPath, 'docs',
    DOC_TYPE_TO_FILENAME[normalizedType] || `${docType.toUpperCase()}.md`);

  const fileMtime = await getFileMtime(actualFilePath);
  const dbContent = dbDoc?.content || '';
  const dbUpdatedAt = dbDoc?.updatedAt || null;
  const lastSyncedAt = dbDoc?.lastSyncedAt || null;

  // File doesn't exist (none of the alternative filenames found)
  if (fileMtime === null && !fileResult.content) {
    return {
      state: 'file_missing',
      dbContent,
      fileContent: null,
      timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
    };
  }

  const fileContent = fileResult.content || '';

  // Content matches - they're in sync regardless of timestamps
  if (dbContent === fileContent) {
    return {
      state: 'in_sync',
      dbContent,
      fileContent,
      timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
    };
  }

  // CONTENT QUALITY CHECK - takes precedence over timestamps
  // Skeleton content should NEVER overwrite real content
  const dbIsSkeleton = isSkeletonContent(dbContent);
  const fileIsSkeleton = isSkeletonContent(fileContent);

  // If DB is skeleton but file has real content → file wins (ignore timestamps)
  if (dbIsSkeleton && !fileIsSkeleton) {
    console.log(`[DocSync] ${docType}: DB is skeleton, file has real content - file wins`);
    return {
      state: 'file_newer',
      dbContent,
      fileContent,
      timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
    };
  }

  // If file is skeleton but DB has real content → DB wins (ignore timestamps)
  if (fileIsSkeleton && !dbIsSkeleton) {
    console.log(`[DocSync] ${docType}: File is skeleton, DB has real content - DB wins`);
    return {
      state: 'db_newer',
      dbContent,
      fileContent,
      timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
    };
  }

  // Both have real content (or both skeleton) - use timestamp logic
  // No lastSyncedAt means we've never synced - determine winner by timestamp
  if (!lastSyncedAt) {
    // If no DB timestamp either, prefer file (external edit)
    if (!dbUpdatedAt) {
      return {
        state: 'file_newer',
        dbContent,
        fileContent,
        timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
      };
    }
    // Compare file mtime vs DB updatedAt directly
    if (fileMtime && fileMtime > dbUpdatedAt) {
      return {
        state: 'file_newer',
        dbContent,
        fileContent,
        timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
      };
    }
    return {
      state: 'db_newer',
      dbContent,
      fileContent,
      timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
    };
  }

  // Both have been modified since last sync = CONFLICT
  const dbModifiedSinceSync = dbUpdatedAt && dbUpdatedAt > lastSyncedAt;
  const fileModifiedSinceSync = fileMtime && fileMtime > lastSyncedAt;

  if (dbModifiedSinceSync && fileModifiedSinceSync) {
    return {
      state: 'conflict',
      dbContent,
      fileContent,
      timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
    };
  }

  // Only file was modified since sync
  if (fileModifiedSinceSync) {
    return {
      state: 'file_newer',
      dbContent,
      fileContent,
      timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
    };
  }

  // Only DB was modified since sync
  if (dbModifiedSinceSync) {
    return {
      state: 'db_newer',
      dbContent,
      fileContent,
      timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
    };
  }

  // Neither modified since sync - they're in sync
  return {
    state: 'in_sync',
    dbContent,
    fileContent,
    timestamps: { dbUpdatedAt, fileMtime, lastSyncedAt },
  };
}

/**
 * Update lastSyncedAt timestamp after a successful sync operation
 */
async function updateLastSyncedAt(projectId: string, docType: string): Promise<void> {
  await prisma.projectDoc.update({
    where: { projectId_type: { projectId, type: docType.toLowerCase() } },
    data: { lastSyncedAt: new Date() },
  });
}
import { simpleGit, SimpleGit } from 'simple-git';
import * as crypto from 'crypto';
import { broadcastBuilderUpdate } from './websocket.js';

// Encryption utilities for GitHub token - must match github.ts implementation
function getEncryptionKey(): string {
  return process.env.ENCRYPTION_KEY || '';
}

function decryptToken(encryptedToken: string): string {
  try {
    const [ivHex, encrypted] = encryptedToken.split(':');
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted token format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const encryptionKey = getEncryptionKey();
    // Must match the key derivation method in github.ts
    const key = Buffer.from(encryptionKey.slice(0, 32).padEnd(32, '0'));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Projects] Token decryption failed:', error);
    throw new Error('Failed to decrypt GitHub token');
  }
}

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    const sessionId = request.cookies[lucia.sessionCookieName];
    if (!sessionId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user) {
      return reply.status(401).send({ error: 'Invalid session' });
    }

    (request as any).user = user;
  });

  app.post('/', async (request, reply) => {
    const user = (request as any).user;
    const body = createProjectSchema.parse(request.body);

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: body.workspaceId, userId: user.id } },
    });

    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Create project with board and lanes
    const project = await prisma.project.create({
      data: {
        workspaceId: body.workspaceId,
        name: body.name,
        description: body.description,
        localPath: body.localPath,
        phase: 'planning', // Start in planning phase
        boards: {
          create: {
            name: 'Development Board',
            lanes: {
              create: LANES.map((lane) => ({
                laneNumber: lane.id,
                name: lane.name,
              })),
            },
          },
        },
        docs: {
          create: [
            { type: 'blueprint', content: '# Project Blueprint\n\n' },
            { type: 'prd', content: '# Product Requirements Document\n\n' },
            { type: 'mvp', content: '# MVP Definition\n\n' },
            { type: 'plan', content: '# Project Plan\n\n' },
            { type: 'playbook', content: '# Agent Playbook\n\n' },
          ],
        },
      },
      include: {
        boards: { include: { lanes: { orderBy: { laneNumber: 'asc' } } } },
        docs: true,
      },
    });

    // Get Lane 0 (Planning/Vision) for the default cards
    const board = project.boards[0];
    const lane0 = board.lanes.find(l => l.laneNumber === 0);

    if (lane0) {
      // Create the 5 essential planning cards in Lane 0
      const defaultPlanningCards = [
        {
          title: 'Project Planning',
          description: `## Planning Session\n\nWork with CoPilot to define the project vision, target audience, and core value proposition.\n\n**Status:** Ready for CoPilot Q&A\n\n**Deliverables:**\n- Project vision statement\n- Target audience definition\n- Core problem being solved`,
          type: 'planning',
          priority: 'Critical',
          position: 0,
          assignedAgent: 'ceo-copilot',
        },
        {
          title: 'Blueprint',
          description: `## Project Blueprint\n\nStrategic document outlining the complete project vision.\n\n**Includes:**\n- Vision & Goals\n- Target Users\n- Feature Overview\n- Success Metrics\n- Technical Approach\n\n**Status:** Pending Planning completion`,
          type: 'document',
          priority: 'Critical',
          position: 1,
          assignedAgent: 'ceo-copilot',
        },
        {
          title: 'PRD (Product Requirements)',
          description: `## Product Requirements Document\n\nDetailed specification of what will be built.\n\n**Includes:**\n- User Stories\n- Feature Specifications\n- Acceptance Criteria\n- API Requirements\n- Data Model Overview\n\n**Status:** Pending Blueprint completion`,
          type: 'document',
          priority: 'Critical',
          position: 2,
          assignedAgent: 'ceo-copilot',
        },
        {
          title: 'MVP Definition',
          description: `## Minimum Viable Product\n\nDefines the smallest version that delivers value.\n\n**Includes:**\n- Core Features (Must Have)\n- Deferred Features (Nice to Have)\n- Launch Criteria\n- Timeline Estimate\n\n**Status:** Pending PRD completion`,
          type: 'document',
          priority: 'Critical',
          position: 3,
          assignedAgent: 'ceo-copilot',
        },
        {
          title: 'Agent Playbook',
          description: `## Agent Playbook\n\nDefines which agents handle which tasks.\n\n**Agent Assignments:**\n- **CEO CoPilot** - Project oversight, planning, card management\n- **Frontend Agent** - UI components, styling, user interactions\n- **Backend Agent** - APIs, business logic, data processing\n- **Database Agent** - Schema design, queries, migrations\n- **QA Agent** - Testing, quality assurance, bug tracking\n- **DevOps Agent** - Deployment, CI/CD, infrastructure\n\n**Status:** Pending MVP completion`,
          type: 'document',
          priority: 'High',
          position: 4,
          assignedAgent: 'ceo-copilot',
        },
      ];

      // Create all planning cards
      await prisma.card.createMany({
        data: defaultPlanningCards.map(card => ({
          boardId: board.id,
          laneId: lane0.id,
          title: card.title,
          description: card.description,
          type: card.type,
          priority: card.priority,
          position: card.position,
          assignedAgent: card.assignedAgent,
          status: card.position === 0 ? 'in-progress' : 'pending',
        })),
      });
    }

    // Initialize local file system if localPath is provided
    console.log('[Projects] Creating project with localPath:', body.localPath);
    if (body.localPath) {
      try {
        console.log('[Projects] Creating directory structure at:', body.localPath);
        // Create project directory structure
        await fs.mkdir(body.localPath, { recursive: true });
        await fs.mkdir(path.join(body.localPath, 'docs'), { recursive: true });
        await fs.mkdir(path.join(body.localPath, 'src'), { recursive: true });
        await fs.mkdir(path.join(body.localPath, 'tests'), { recursive: true });
        await fs.mkdir(path.join(body.localPath, 'context'), { recursive: true }); // For card context files
        await fs.mkdir(path.join(body.localPath, '.agentworks'), { recursive: true });

        // Create minimal project configuration (no template docs - agents will generate those)
        const projectJson = JSON.stringify({
          name: body.name,
          description: body.description,
          projectId: project.id,
          workspaceId: body.workspaceId,
          createdAt: new Date().toISOString(),
        }, null, 2);

        const gitignore = `# Dependencies
node_modules/

# Build outputs
dist/
build/
.next/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# AgentWorks
.agentworks/cache/
`;

        const readmeTemplate = `# ${body.name}

${body.description || '_Project description goes here._'}

## Getting Started
_Instructions for setting up the project._

## Documentation
Documentation will be generated by agents in the \`docs/\` folder.

## Built with AgentWorks
This project was created and managed by [AgentWorks](https://agentworks.dev).
`;

        // Write minimal files (docs/ will be populated by agents working on cards)
        await Promise.all([
          fs.writeFile(path.join(body.localPath, 'README.md'), readmeTemplate),
          fs.writeFile(path.join(body.localPath, '.agentworks', 'project.json'), projectJson),
          fs.writeFile(path.join(body.localPath, '.gitignore'), gitignore),
        ]);

        console.log(`[Projects] Successfully initialized local project files at: ${body.localPath}`);
      } catch (fsError: any) {
        // Log full error details
        console.error('[Projects] Failed to create local project files:', {
          error: fsError.message,
          code: fsError.code,
          path: body.localPath,
          stack: fsError.stack,
        });
      }
    } else {
      console.log('[Projects] No localPath provided, skipping local file creation');
    }

    // Fetch the complete project with cards
    const completeProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        boards: {
          include: {
            lanes: {
              orderBy: { laneNumber: 'asc' },
              include: { cards: { orderBy: { position: 'asc' } } }
            }
          }
        },
        docs: true,
      },
    });

    return completeProject;
  });

  // POST /api/projects/import-github - Import a project from GitHub
  app.post('/import-github', async (request, reply) => {
    const user = (request as any).user;
    const body = request.body as {
      workspaceId: string;
      name: string;
      description?: string;
      localPath: string;
      repoOwner: string;
      repoName: string;
      repoFullName: string;
      defaultBranch: string;
    };

    console.log('[Projects] Import from GitHub request:', {
      name: body.name,
      repoFullName: body.repoFullName,
      localPath: body.localPath
    });

    // Verify workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: body.workspaceId, userId: user.id } },
    });

    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Get user's tenant to find GitHub connection
    const userWithTenant = await prisma.user.findUnique({
      where: { id: user.id },
      include: { tenant: true },
    });

    if (!userWithTenant?.tenant) {
      return reply.status(400).send({ error: 'User has no associated tenant' });
    }

    // Get GitHub connection with encrypted token
    const githubConnection = await prisma.gitHubConnection.findFirst({
      where: { tenantId: userWithTenant.tenant.id },
    });

    if (!githubConnection) {
      return reply.status(400).send({ error: 'GitHub is not connected. Please connect GitHub first.' });
    }

    // Decrypt the access token
    let accessToken: string;
    try {
      accessToken = decryptToken(githubConnection.accessToken);
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to access GitHub credentials' });
    }

    // Create the project record first (minimal - imported projects have less scaffolding)
    const project = await prisma.project.create({
      data: {
        workspaceId: body.workspaceId,
        name: body.name,
        description: body.description,
        localPath: body.localPath,
        phase: 'development', // Imported projects start in development phase
        boards: {
          create: {
            name: 'Development Board',
            lanes: {
              create: LANES.map((lane) => ({
                laneNumber: lane.id,
                name: lane.name,
              })),
            },
          },
        },
        docs: {
          create: [
            { type: 'blueprint', content: '# Project Blueprint\n\n_Imported from GitHub - add project documentation here._' },
            { type: 'prd', content: '# Product Requirements Document\n\n_Define product requirements for this project._' },
            { type: 'mvp', content: '# MVP Definition\n\n_Define MVP scope for this project._' },
            { type: 'plan', content: '# Project Plan\n\n_Add project plan here._' },
            { type: 'playbook', content: '# Agent Playbook\n\n_Configure agents for this project._' },
          ],
        },
      },
      include: {
        boards: { include: { lanes: { orderBy: { laneNumber: 'asc' } } } },
        docs: true,
      },
    });

    // Create ProjectRepository link
    await prisma.projectRepository.create({
      data: {
        projectId: project.id,
        githubConnId: githubConnection.id,
        repoOwner: body.repoOwner,
        repoName: body.repoName,
        repoFullName: body.repoFullName,
        defaultBranch: body.defaultBranch,
        syncStatus: 'syncing',
      },
    });

    // Create ProjectGitConfig with sensible defaults
    await prisma.projectGitConfig.create({
      data: {
        projectId: project.id,
        repositoryUrl: `https://github.com/${body.repoFullName}`,
        defaultBranch: body.defaultBranch,
        requireApproval: true,
        autoCommit: false,
        autoPush: false,
      },
    });

    // Clone the repository
    try {
      console.log('[Projects] Cloning repository:', body.repoFullName, 'to', body.localPath);

      // Ensure parent directory exists
      const parentDir = path.dirname(body.localPath);
      await fs.mkdir(parentDir, { recursive: true });

      // Build authenticated clone URL
      const cloneUrl = `https://x-access-token:${accessToken}@github.com/${body.repoFullName}.git`;

      // Use simple-git to clone
      const git: SimpleGit = simpleGit();
      await git.clone(cloneUrl, body.localPath);

      console.log('[Projects] Clone successful');

      // Create .agentworks directory for project metadata
      const agentworksDir = path.join(body.localPath, '.agentworks');
      await fs.mkdir(agentworksDir, { recursive: true });

      // Save project configuration
      const projectJson = JSON.stringify({
        name: body.name,
        description: body.description,
        projectId: project.id,
        workspaceId: body.workspaceId,
        importedFrom: `github:${body.repoFullName}`,
        createdAt: new Date().toISOString(),
      }, null, 2);

      await fs.writeFile(path.join(agentworksDir, 'project.json'), projectJson);

      // Update ProjectRepository status to synced
      await prisma.projectRepository.updateMany({
        where: { projectId: project.id },
        data: {
          syncStatus: 'synced',
          lastSyncedAt: new Date(),
        },
      });

      console.log('[Projects] Successfully imported project from GitHub:', body.repoFullName);
    } catch (cloneError: any) {
      console.error('[Projects] Clone failed:', cloneError.message);

      // Update ProjectRepository status to error
      await prisma.projectRepository.updateMany({
        where: { projectId: project.id },
        data: {
          syncStatus: 'error',
          errorMessage: cloneError.message,
        },
      });

      // Don't delete the project - let user retry or fix
      return reply.status(500).send({
        error: `Failed to clone repository: ${cloneError.message}`,
        projectId: project.id,
        canRetry: true,
      });
    }

    // Get Lane 4 (Development) for imported projects - they skip planning
    const board = project.boards[0];
    const devLane = board.lanes.find(l => l.laneNumber === 4);

    if (devLane) {
      // Create a single initial card for the imported project
      await prisma.card.create({
        data: {
          boardId: board.id,
          laneId: devLane.id,
          title: 'Project Setup',
          description: `## Imported from GitHub\n\n**Repository:** [${body.repoFullName}](https://github.com/${body.repoFullName})\n\n**Tasks:**\n- [ ] Review existing codebase\n- [ ] Configure development environment\n- [ ] Set up CI/CD integration\n- [ ] Define development workflow`,
          type: 'task',
          priority: 'High',
          position: 0,
          status: 'pending',
        },
      });
    }

    // Return complete project
    const completeProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        boards: {
          include: {
            lanes: {
              orderBy: { laneNumber: 'asc' },
              include: { cards: { orderBy: { position: 'asc' } } }
            }
          }
        },
        docs: true,
      },
    });

    return completeProject;
  });

  // GET /api/projects - List projects for a workspace
  app.get('/', async (request, reply) => {
    const user = (request as any).user;
    const { workspaceId } = request.query as { workspaceId?: string };

    if (!workspaceId) {
      return reply.status(400).send({ error: 'workspaceId query parameter is required' });
    }

    // Verify user is member of workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });

    if (!membership) {
      return reply.status(403).send({ error: 'Not a workspace member' });
    }

    const projects = await prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        boards: {
          include: {
            lanes: { orderBy: { laneNumber: 'asc' } },
          },
        },
      },
    });

    return projects;
  });

  app.get('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        workspace: { include: { members: true } },
        boards: { include: { lanes: { orderBy: { laneNumber: 'asc' } } } },
        docs: true,
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    return project;
  });

  app.patch('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { name, description, status, phase } = request.body as any;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { 
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(phase !== undefined && { phase }),
      },
    });

    return updated;
  });

  app.delete('/:id', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    // Allow owners, admins, and members to delete projects (viewers cannot)
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized to delete projects' });
    }

    // Delete related records that don't have onDelete: Cascade
    // These records reference the project but won't auto-delete
    await prisma.$transaction([
      // Delete usage events (no cascade)
      prisma.usageEvent.deleteMany({ where: { projectId: id } }),
      // Delete usage records (no cascade)
      prisma.usageRecord.deleteMany({ where: { projectId: id } }),
      // Delete media jobs (no cascade)
      prisma.mediaJob.deleteMany({ where: { projectId: id } }),
      // Delete git operation requests (no cascade)
      prisma.gitOperationRequest.deleteMany({ where: { projectId: id } }),
      // Now delete the project (cascades to boards, lanes, cards, docs, etc.)
      prisma.project.delete({ where: { id } }),
    ]);

    return { success: true };
  });

  // GET /:id/docs - Get all project documents (from ProjectDoc table)
  // This endpoint returns the actual generated documents (Blueprint, PRD, MVP, Playbook)
  // with normalized lowercase types for frontend compatibility
  app.get('/:id/docs', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const docs = await prisma.projectDoc.findMany({
      where: { projectId: id },
      orderBy: { type: 'asc' },
    });

    // Normalize types to lowercase for frontend compatibility
    // (DB stores as BLUEPRINT, PRD, MVP, PLAYBOOK but frontend expects lowercase)
    return {
      docs: docs.map(doc => ({
        ...doc,
        type: doc.type.toLowerCase(),
      })),
    };
  });

  app.get('/:id/docs/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Support both upper and lowercase type lookups
    const normalizedType = type.toUpperCase();
    const doc = await prisma.projectDoc.findUnique({
      where: { projectId_type: { projectId: id, type: normalizedType } },
    });

    if (doc) {
      return { ...doc, type: doc.type.toLowerCase() };
    }

    return { projectId: id, type: type.toLowerCase(), content: '', version: 0 };
  });

  app.put('/:id/docs/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };
    const { content } = request.body as { content: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Normalize type to handle both upper and lowercase
    const normalizedType = type.toLowerCase();

    const doc = await prisma.projectDoc.upsert({
      where: { projectId_type: { projectId: id, type: normalizedType } },
      update: { content, version: { increment: 1 } },
      create: { projectId: id, type: normalizedType, content },
    });

    // Sync document to filesystem (keeps /docs folder up to date)
    const syncResult = await syncDocumentToFilesystem(project.localPath, normalizedType, content);

    // Update lastSyncedAt if sync succeeded
    if (syncResult.synced) {
      await updateLastSyncedAt(id, normalizedType);
    }

    return {
      ...doc,
      type: doc.type.toLowerCase(),
      filesystem: syncResult,
    };
  });

  // GET /:id/docs/:type/file - Get document directly from filesystem
  // This endpoint reads the actual file from /docs folder for comparison with DB
  app.get('/:id/docs/:type/file', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const normalizedType = type.toLowerCase();
    const result = await readDocumentFromFilesystem(project.localPath, normalizedType);

    // Also get file stats for metadata
    let fileStats = null;
    if (result.filePath) {
      try {
        const stats = await fs.stat(result.filePath);
        fileStats = {
          size: stats.size,
          modified: stats.mtime.toISOString(),
          created: stats.birthtime.toISOString(),
        };
      } catch {
        // File stats not available
      }
    }

    return {
      projectId: id,
      type: normalizedType,
      content: result.content,
      filePath: result.filePath,
      error: result.error,
      exists: result.content !== null,
      stats: fileStats,
    };
  });

  // GET /:id/docs-info - Get info about all documents (both DB and filesystem)
  // This helps the frontend show sync status for all documents
  app.get('/:id/docs-info', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        workspace: { include: { members: true } },
        docs: true,
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const docTypes = ['blueprint', 'prd', 'mvp', 'playbook'];
    const docsInfo = await Promise.all(
      docTypes.map(async (docType) => {
        const dbDoc = project.docs.find(d => d.type.toLowerCase() === docType);

        // Use analyzeSyncState for timestamp-based comparison
        const analysis = await analyzeSyncState(
          project.localPath,
          docType,
          dbDoc ? {
            content: dbDoc.content,
            updatedAt: dbDoc.updatedAt,
            lastSyncedAt: dbDoc.lastSyncedAt,
          } : null
        );

        const normalizedType = docType.toLowerCase();
        const fileName = DOC_TYPE_TO_FILENAME[normalizedType] || `${docType.toUpperCase()}.md`;
        const filePath = project.localPath ? path.join(project.localPath, 'docs', fileName) : null;

        return {
          type: docType,
          fileName,
          filePath,
          hasDbContent: !!dbDoc?.content?.trim(),
          hasFileContent: !!analysis.fileContent?.trim(),
          inSync: analysis.state === 'in_sync',
          syncState: analysis.state, // Detailed sync state for UI
          dbVersion: dbDoc?.version || 0,
          dbUpdatedAt: analysis.timestamps.dbUpdatedAt?.toISOString() || null,
          fileMtime: analysis.timestamps.fileMtime?.toISOString() || null,
          lastSyncedAt: analysis.timestamps.lastSyncedAt?.toISOString() || null,
        };
      })
    );

    return {
      projectId: id,
      projectName: project.name,
      localPath: project.localPath,
      docsDir: project.localPath ? path.join(project.localPath, 'docs') : null,
      documents: docsInfo,
    };
  });

  // POST /:id/docs/:type/sync - Force sync document from DB to filesystem
  // Useful for re-syncing if files got out of sync externally
  app.post('/:id/docs/:type/sync', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const normalizedType = type.toLowerCase();

    // Get document from database
    const doc = await prisma.projectDoc.findUnique({
      where: { projectId_type: { projectId: id, type: normalizedType } },
    });

    if (!doc) {
      return reply.status(404).send({ error: 'Document not found in database' });
    }

    // Sync to filesystem
    const syncResult = await syncDocumentToFilesystem(project.localPath, normalizedType, doc.content);

    // Update lastSyncedAt if sync succeeded
    if (syncResult.synced) {
      await updateLastSyncedAt(id, normalizedType);
    }

    return {
      success: syncResult.synced,
      type: normalizedType,
      filePath: syncResult.filePath,
      error: syncResult.error,
      version: doc.version,
    };
  });

  // POST /:id/docs/:type/import - Import document content from filesystem to DB
  // Useful when files were edited externally (e.g., by Claude Code CLI)
  app.post('/:id/docs/:type/import', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const normalizedType = type.toLowerCase();

    // Read from filesystem
    const fileResult = await readDocumentFromFilesystem(project.localPath, normalizedType);

    if (!fileResult.content) {
      return reply.status(404).send({
        error: 'File not found on filesystem',
        details: fileResult.error,
      });
    }

    // Update database with filesystem content and lastSyncedAt
    const doc = await prisma.projectDoc.upsert({
      where: { projectId_type: { projectId: id, type: normalizedType } },
      update: {
        content: fileResult.content,
        version: { increment: 1 },
        lastSyncedAt: new Date(),
      },
      create: {
        projectId: id,
        type: normalizedType,
        content: fileResult.content,
        lastSyncedAt: new Date(),
      },
    });

    return {
      success: true,
      type: normalizedType,
      filePath: fileResult.filePath,
      version: doc.version,
      contentLength: fileResult.content.length,
    };
  });

  // POST /:id/docs/:type/auto-sync - Automatically sync based on timestamps
  // Returns the sync action taken or conflict info if manual resolution needed
  app.post('/:id/docs/:type/auto-sync', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        workspace: { include: { members: true } },
        docs: true,
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const normalizedType = type.toLowerCase();
    const dbDoc = project.docs.find(d => d.type.toLowerCase() === normalizedType);

    const analysis = await analyzeSyncState(
      project.localPath,
      normalizedType,
      dbDoc ? {
        content: dbDoc.content,
        updatedAt: dbDoc.updatedAt,
        lastSyncedAt: dbDoc.lastSyncedAt,
      } : null
    );

    // Handle different sync states
    switch (analysis.state) {
      case 'in_sync':
        return {
          action: 'none',
          message: 'Already in sync',
          state: analysis.state,
        };

      case 'file_newer':
        // Auto-import from filesystem to DB
        const importedDoc = await prisma.projectDoc.upsert({
          where: { projectId_type: { projectId: id, type: normalizedType } },
          update: {
            content: analysis.fileContent!,
            version: { increment: 1 },
            lastSyncedAt: new Date(),
          },
          create: {
            projectId: id,
            type: normalizedType,
            content: analysis.fileContent!,
            lastSyncedAt: new Date(),
          },
        });
        console.log(`[DocSync] Auto-imported ${normalizedType} from filesystem (file was newer)`);
        return {
          action: 'imported',
          message: 'Imported newer content from filesystem',
          state: analysis.state,
          version: importedDoc.version,
        };

      case 'db_newer':
        // Auto-sync from DB to filesystem
        const syncResult = await syncDocumentToFilesystem(
          project.localPath,
          normalizedType,
          analysis.dbContent
        );
        if (syncResult.synced) {
          await updateLastSyncedAt(id, normalizedType);
        }
        console.log(`[DocSync] Auto-synced ${normalizedType} to filesystem (DB was newer)`);
        return {
          action: 'synced',
          message: 'Synced database content to filesystem',
          state: analysis.state,
          filePath: syncResult.filePath,
        };

      case 'conflict':
        // Return conflict info for frontend to display
        return {
          action: 'conflict',
          message: 'Both database and file have been modified',
          state: analysis.state,
          dbContent: analysis.dbContent,
          fileContent: analysis.fileContent,
          dbUpdatedAt: analysis.timestamps.dbUpdatedAt?.toISOString(),
          fileMtime: analysis.timestamps.fileMtime?.toISOString(),
          lastSyncedAt: analysis.timestamps.lastSyncedAt?.toISOString(),
        };

      case 'file_missing':
        // Create file from DB content
        if (analysis.dbContent.trim()) {
          const createResult = await syncDocumentToFilesystem(
            project.localPath,
            normalizedType,
            analysis.dbContent
          );
          if (createResult.synced) {
            await updateLastSyncedAt(id, normalizedType);
          }
          return {
            action: 'created',
            message: 'Created file from database content',
            state: analysis.state,
            filePath: createResult.filePath,
          };
        }
        return {
          action: 'none',
          message: 'No content to sync',
          state: analysis.state,
        };

      case 'no_local_path':
        return {
          action: 'none',
          message: 'No local path configured for project',
          state: analysis.state,
        };
    }
  });

  // POST /:id/docs/:type/resolve-conflict - Resolve a conflict by choosing a version
  app.post('/:id/docs/:type/resolve-conflict', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };
    const { resolution, customContent } = request.body as {
      resolution: 'keep_db' | 'keep_file' | 'keep_custom';
      customContent?: string;
    };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const normalizedType = type.toLowerCase();
    let finalContent: string;

    if (resolution === 'keep_db') {
      // Keep DB version, sync to file
      const dbDoc = await prisma.projectDoc.findUnique({
        where: { projectId_type: { projectId: id, type: normalizedType } },
      });
      finalContent = dbDoc?.content || '';
      await syncDocumentToFilesystem(project.localPath, normalizedType, finalContent);
    } else if (resolution === 'keep_file') {
      // Keep file version, import to DB
      const fileResult = await readDocumentFromFilesystem(project.localPath, normalizedType);
      finalContent = fileResult.content || '';
      await prisma.projectDoc.upsert({
        where: { projectId_type: { projectId: id, type: normalizedType } },
        update: { content: finalContent, version: { increment: 1 } },
        create: { projectId: id, type: normalizedType, content: finalContent },
      });
    } else if (resolution === 'keep_custom') {
      // Use custom merged content
      if (!customContent) {
        return reply.status(400).send({ error: 'Custom content required for custom resolution' });
      }
      finalContent = customContent;
      await prisma.projectDoc.upsert({
        where: { projectId_type: { projectId: id, type: normalizedType } },
        update: { content: finalContent, version: { increment: 1 } },
        create: { projectId: id, type: normalizedType, content: finalContent },
      });
      await syncDocumentToFilesystem(project.localPath, normalizedType, finalContent);
    } else {
      return reply.status(400).send({ error: 'Invalid resolution option' });
    }

    // Update lastSyncedAt after successful resolution
    await updateLastSyncedAt(id, normalizedType);

    return {
      success: true,
      resolution,
      message: `Conflict resolved by ${resolution.replace('_', ' ')}`,
    };
  });

  app.get('/:id/components', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const components = await prisma.projectComponent.findMany({
      where: { projectId: id },
      orderBy: { updatedAt: 'desc' },
    });

    return components;
  });

  app.get('/:id/components/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };
    const { name } = request.query as { name?: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (name) {
      const component = await prisma.projectComponent.findUnique({
        where: { projectId_type_name: { projectId: id, type, name } },
      });
      return component || null;
    }

    const components = await prisma.projectComponent.findMany({
      where: { projectId: id, type },
      orderBy: { updatedAt: 'desc' },
    });

    return components;
  });

  app.post('/:id/components', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { type, name, data } = request.body as { type: string; name: string; data: any };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const component = await prisma.projectComponent.upsert({
      where: { projectId_type_name: { projectId: id, type, name } },
      update: { 
        data, 
        version: { increment: 1 },
        lastSavedAt: new Date(),
      },
      create: { 
        projectId: id, 
        type, 
        name, 
        data,
        lastSavedAt: new Date(),
      },
    });

    return component;
  });

  app.delete('/:id/components/:componentId', async (request, reply) => {
    const user = (request as any).user;
    const { id, componentId } = request.params as { id: string; componentId: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const component = await prisma.projectComponent.findFirst({
      where: { id: componentId, projectId: id },
    });

    if (!component) {
      return reply.status(404).send({ error: 'Component not found' });
    }

    await prisma.projectComponent.delete({ where: { id: componentId } });

    return { success: true };
  });

  app.get('/:id/todos', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const todos = await prisma.projectTodo.findMany({
      where: { projectId: id },
      orderBy: [{ completed: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });

    return todos;
  });

  app.post('/:id/todos', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { content, cardId, category, priority } = request.body as {
      content: string;
      cardId?: string;
      category?: string;
      priority?: number;
    };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const todo = await prisma.projectTodo.create({
      data: {
        projectId: id,
        content,
        cardId,
        category: category || 'general',
        priority: priority || 0,
      },
    });

    return todo;
  });

  app.patch('/:id/todos/:todoId', async (request, reply) => {
    const user = (request as any).user;
    const { id, todoId } = request.params as { id: string; todoId: string };
    const { completed, content, priority } = request.body as {
      completed?: boolean;
      content?: string;
      priority?: number;
    };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const todo = await prisma.projectTodo.update({
      where: { id: todoId },
      data: {
        ...(completed !== undefined && { 
          completed, 
          completedAt: completed ? new Date() : null 
        }),
        ...(content !== undefined && { content }),
        ...(priority !== undefined && { priority }),
      },
    });

    return todo;
  });

  app.delete('/:id/todos/:todoId', async (request, reply) => {
    const user = (request as any).user;
    const { id, todoId } = request.params as { id: string; todoId: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    await prisma.projectTodo.delete({ where: { id: todoId } });

    return { success: true };
  });

  app.get('/:id/sessions', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const sessions = await prisma.agentSession.findMany({
      where: { projectId: id },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    return sessions;
  });

  app.get('/:id/sessions/:sessionId', async (request, reply) => {
    const user = (request as any).user;
    const { id, sessionId } = request.params as { id: string; sessionId: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.projectId !== id) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    return session;
  });

  app.post('/:id/sessions', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { cardId, context, phase } = request.body as {
      cardId?: string;
      context: string;
      phase?: string;
    };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const session = await prisma.agentSession.create({
      data: {
        projectId: id,
        cardId,
        context,
        phase,
        status: 'active',
      },
    });

    return session;
  });

  app.post('/:id/sessions/:sessionId/log', async (request, reply) => {
    const user = (request as any).user;
    const { id, sessionId } = request.params as { id: string; sessionId: string };
    const { entry } = request.body as { entry: any };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.projectId !== id) {
      return reply.status(404).send({ error: 'Session not found' });
    }

    const logData = (session.logData as any[]) || [];
    logData.push({ ...entry, timestamp: new Date().toISOString() });

    const updated = await prisma.agentSession.update({
      where: { id: sessionId },
      data: { logData },
    });

    return updated;
  });

  app.post('/:id/sessions/:sessionId/end', async (request, reply) => {
    const user = (request as any).user;
    const { id, sessionId } = request.params as { id: string; sessionId: string };
    const { summary } = request.body as { summary?: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const session = await prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        summary,
        endedAt: new Date(),
      },
    });

    return session;
  });

  // ============================================
  // Builder State Routes (UI, DB, Workflow)
  // ============================================

  // GET /api/projects/:id/builders/:type - Get builder state
  app.get('/:id/builders/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };

    if (!['ui', 'db', 'workflow'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid builder type. Must be: ui, db, or workflow' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const builderState = await prisma.builderState.findUnique({
      where: { projectId_builderType: { projectId: id, builderType: type } },
    });

    return builderState || { projectId: id, builderType: type, state: {}, version: 0 };
  });

  // PUT /api/projects/:id/builders/:type - Update builder state (creates revision)
  app.put('/:id/builders/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };
    const { state, screenshot, description, createdBy } = request.body as {
      state: any;
      screenshot?: string;
      description?: string;
      createdBy?: string;
    };

    if (!['ui', 'db', 'workflow'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid builder type. Must be: ui, db, or workflow' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Get current version for revision numbering
    const existing = await prisma.builderState.findUnique({
      where: { projectId_builderType: { projectId: id, builderType: type } },
    });
    const newVersion = (existing?.version || 0) + 1;

    // Update or create the builder state
    const builderState = await prisma.builderState.upsert({
      where: { projectId_builderType: { projectId: id, builderType: type } },
      update: { state, version: newVersion },
      create: { projectId: id, builderType: type, state, version: 1 },
    });

    // Create revision snapshot for history
    const revision = await prisma.builderRevision.create({
      data: {
        projectId: id,
        builderType: type,
        version: builderState.version,
        state,
        screenshot,
        createdBy: createdBy || user.id,
        description: description || `Updated by ${createdBy || 'user'}`,
      },
    });

    // Broadcast update to all subscribed clients via WebSocket
    broadcastBuilderUpdate(id, type, {
      state,
      version: builderState.version,
      revision: {
        id: revision.id,
        version: revision.version,
        screenshot: revision.screenshot || undefined,
        createdBy: revision.createdBy || undefined,
        description: revision.description || undefined,
        createdAt: revision.createdAt.toISOString(),
      },
    });

    return { builderState, revision };
  });

  // GET /api/projects/:id/builders/:type/revisions - List revision history
  app.get('/:id/builders/:type/revisions', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };
    const { limit = '20', offset = '0' } = request.query as { limit?: string; offset?: string };

    if (!['ui', 'db', 'workflow'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid builder type. Must be: ui, db, or workflow' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const revisions = await prisma.builderRevision.findMany({
      where: { projectId: id, builderType: type },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true,
        version: true,
        screenshot: true,
        createdBy: true,
        description: true,
        createdAt: true,
      },
    });

    const total = await prisma.builderRevision.count({
      where: { projectId: id, builderType: type },
    });

    return { revisions, total, limit: parseInt(limit), offset: parseInt(offset) };
  });

  // GET /api/projects/:id/builders/:type/revisions/:revisionId - Get full revision state
  app.get('/:id/builders/:type/revisions/:revisionId', async (request, reply) => {
    const user = (request as any).user;
    const { id, type, revisionId } = request.params as { id: string; type: string; revisionId: string };

    if (!['ui', 'db', 'workflow'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid builder type. Must be: ui, db, or workflow' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const revision = await prisma.builderRevision.findFirst({
      where: { id: revisionId, projectId: id, builderType: type },
    });

    if (!revision) {
      return reply.status(404).send({ error: 'Revision not found' });
    }

    return { revision };
  });

  // POST /api/projects/:id/builders/:type/revisions/:revisionId/restore - Restore a revision
  app.post('/:id/builders/:type/revisions/:revisionId/restore', async (request, reply) => {
    const user = (request as any).user;
    const { id, type, revisionId } = request.params as { id: string; type: string; revisionId: string };

    if (!['ui', 'db', 'workflow'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid builder type. Must be: ui, db, or workflow' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    const revision = await prisma.builderRevision.findFirst({
      where: { id: revisionId, projectId: id, builderType: type },
    });

    if (!revision) {
      return reply.status(404).send({ error: 'Revision not found' });
    }

    // Get current version
    const existing = await prisma.builderState.findUnique({
      where: { projectId_builderType: { projectId: id, builderType: type } },
    });
    const newVersion = (existing?.version || 0) + 1;

    // Update builder state with revision content
    // Cast state to InputJsonValue to satisfy Prisma's type requirements
    const stateValue = revision.state as Prisma.InputJsonValue;
    const builderState = await prisma.builderState.upsert({
      where: { projectId_builderType: { projectId: id, builderType: type } },
      update: { state: stateValue, version: newVersion },
      create: { projectId: id, builderType: type, state: stateValue, version: 1 },
    });

    // Create a new revision marking this as a restore
    const newRevision = await prisma.builderRevision.create({
      data: {
        projectId: id,
        builderType: type,
        version: builderState.version,
        state: stateValue,
        createdBy: user.id,
        description: `Restored from v${revision.version}`,
      },
    });

    return { builderState, revision: newRevision, restoredFrom: revision.version };
  });

  // GET /api/projects/:id/planning-status - Get planning document status
  // Used by Claude CLI hooks to check if planning is complete before building
  app.get('/:id/planning-status', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        workspace: { include: { members: true } },
        docs: true,
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    // Helper to check if a document exists and is approved
    const checkDocument = (type: string): { exists: boolean; approved: boolean } => {
      const doc = project.docs.find(d => d.type === type);
      if (!doc || !doc.content || doc.content.trim().length < 50) {
        return { exists: false, approved: false };
      }
      // Check for approval markers in content
      const content = doc.content;
      const approved = content.includes('APPROVED') ||
                       content.includes('Status: Approved') ||
                       content.includes('## Approval') ||
                       content.includes('✓ Approved') ||
                       content.includes('[x] Approved');
      return { exists: true, approved };
    };

    const documents = {
      blueprint: checkDocument('blueprint'),
      prd: checkDocument('prd'),
      mvp: checkDocument('mvp'),
      playbook: checkDocument('playbook'),
    };

    // Check if all documents exist and are approved
    const planningComplete = Object.values(documents).every(
      doc => doc.exists && doc.approved
    );

    // Get list of missing/unapproved documents
    const missing: string[] = [];
    if (!documents.blueprint.exists) missing.push('blueprint');
    else if (!documents.blueprint.approved) missing.push('blueprint (not approved)');

    if (!documents.prd.exists) missing.push('prd');
    else if (!documents.prd.approved) missing.push('prd (not approved)');

    if (!documents.mvp.exists) missing.push('mvp');
    else if (!documents.mvp.approved) missing.push('mvp (not approved)');

    if (!documents.playbook.exists) missing.push('playbook');
    else if (!documents.playbook.approved) missing.push('playbook (not approved)');

    return {
      projectId: id,
      projectName: project.name,
      planningComplete,
      documents,
      missing,
      localPath: project.localPath,
    };
  });

  // DELETE /api/projects/:id/builders/:type - Reset builder state
  app.delete('/:id/builders/:type', async (request, reply) => {
    const user = (request as any).user;
    const { id, type } = request.params as { id: string; type: string };

    if (!['ui', 'db', 'workflow'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid builder type. Must be: ui, db, or workflow' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    await prisma.builderState.deleteMany({
      where: { projectId: id, builderType: type },
    });

    return { success: true };
  });

  // ============================================
  // UI Builder Screenshot Management
  // ============================================

  // POST /api/projects/:id/screenshots - Save a screenshot to project folder
  app.post('/:id/screenshots', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (!project.localPath) {
      return reply.status(400).send({ error: 'Project has no local path configured' });
    }

    try {
      // Get screenshot from multipart form data
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const buffer = await data.toBuffer();

      // Create UI-screenshots folder in project directory
      const screenshotsDir = path.join(project.localPath, 'UI-screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });

      // Generate filename with timestamp: UI-screenshot_2025-12-19_14-30-45.png
      const now = new Date();
      const timestamp = now.toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .slice(0, 19);
      const filename = `UI-screenshot_${timestamp}.png`;
      const filepath = path.join(screenshotsDir, filename);

      // Save the file
      await fs.writeFile(filepath, buffer);
      console.log(`[Screenshots] Saved screenshot: ${filepath}`);

      return {
        success: true,
        path: filepath,
        filename,
        url: `/api/projects/${id}/screenshots/${filename}`,
        createdAt: now.toISOString(),
      };
    } catch (error: any) {
      console.error('[Screenshots] Failed to save screenshot:', error);
      return reply.status(500).send({
        error: 'Failed to save screenshot',
        details: error?.message || 'Unknown error',
      });
    }
  });

  // GET /api/projects/:id/screenshots - List all screenshots for a project
  app.get('/:id/screenshots', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (!project.localPath) {
      return { screenshots: [] };
    }

    const screenshotsDir = path.join(project.localPath, 'UI-screenshots');

    try {
      const files = await fs.readdir(screenshotsDir);
      const screenshots = await Promise.all(
        files
          .filter((f) => f.endsWith('.png'))
          .map(async (filename) => {
            const filepath = path.join(screenshotsDir, filename);
            const stat = await fs.stat(filepath);
            return {
              filename,
              url: `/api/projects/${id}/screenshots/${filename}`,
              createdAt: stat.mtime.toISOString(),
            };
          })
      );

      // Sort by date, newest first
      screenshots.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return { screenshots };
    } catch (error: any) {
      // Directory might not exist yet
      if (error.code === 'ENOENT') {
        return { screenshots: [] };
      }
      console.error('[Screenshots] Failed to list screenshots:', error);
      return reply.status(500).send({ error: 'Failed to list screenshots' });
    }
  });

  // GET /api/projects/:id/screenshots/:filename - Serve a screenshot file
  app.get('/:id/screenshots/:filename', async (request, reply) => {
    const user = (request as any).user;
    const { id, filename } = request.params as { id: string; filename: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (!project.localPath) {
      return reply.status(404).send({ error: 'Screenshot not found' });
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join(project.localPath, 'UI-screenshots', sanitizedFilename);

    try {
      const buffer = await fs.readFile(filepath);
      return reply
        .header('Content-Type', 'image/png')
        .header('Cache-Control', 'public, max-age=31536000')
        .send(buffer);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return reply.status(404).send({ error: 'Screenshot not found' });
      }
      console.error('[Screenshots] Failed to serve screenshot:', error);
      return reply.status(500).send({ error: 'Failed to serve screenshot' });
    }
  });

  // DELETE /api/projects/:id/screenshots/:filename - Delete a screenshot
  app.delete('/:id/screenshots/:filename', async (request, reply) => {
    const user = (request as any).user;
    const { id, filename } = request.params as { id: string; filename: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (!project.localPath) {
      return reply.status(404).send({ error: 'Screenshot not found' });
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join(project.localPath, 'UI-screenshots', sanitizedFilename);

    try {
      await fs.unlink(filepath);
      console.log(`[Screenshots] Deleted screenshot: ${filepath}`);
      return { success: true };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return reply.status(404).send({ error: 'Screenshot not found' });
      }
      console.error('[Screenshots] Failed to delete screenshot:', error);
      return reply.status(500).send({ error: 'Failed to delete screenshot' });
    }
  });

  // ============================================
  // Workflow Template Management
  // ============================================

  // POST /api/projects/:id/workflows/template - Save a workflow template to project
  app.post('/:id/workflows/template', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { name, description, nodes, edges } = request.body as {
      name: string;
      description?: string;
      nodes: any[];
      edges: any[];
    };

    if (!name || typeof name !== 'string') {
      return reply.status(400).send({ error: 'Workflow name is required' });
    }

    // Validate name format
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return reply.status(400).send({ error: 'Name can only contain letters, numbers, dashes, and underscores' });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (!project.localPath) {
      return reply.status(400).send({ error: 'Project has no local path configured' });
    }

    try {
      // Create workflows folder in project directory
      const workflowsDir = path.join(project.localPath, 'workflows');
      await fs.mkdir(workflowsDir, { recursive: true });

      const now = new Date();
      const workflowData = {
        name,
        description: description || '',
        nodes,
        edges,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        metadata: {
          author: user.id,
          version: 1,
        },
      };

      const filename = `${name}.json`;
      const filepath = path.join(workflowsDir, filename);

      await fs.writeFile(filepath, JSON.stringify(workflowData, null, 2), 'utf-8');
      console.log(`[Workflows] Saved workflow template: ${filepath}`);

      return {
        success: true,
        path: filepath,
        name,
        createdAt: now.toISOString(),
      };
    } catch (error: any) {
      console.error('[Workflows] Failed to save workflow template:', error);
      return reply.status(500).send({
        error: 'Failed to save workflow template',
        details: error?.message || 'Unknown error',
      });
    }
  });

  // GET /api/projects/:id/workflows/templates - List all workflow templates
  app.get('/:id/workflows/templates', async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (!project.localPath) {
      return { templates: [] };
    }

    const workflowsDir = path.join(project.localPath, 'workflows');

    try {
      const files = await fs.readdir(workflowsDir);
      const templates = await Promise.all(
        files
          .filter((f) => f.endsWith('.json'))
          .map(async (filename) => {
            const filepath = path.join(workflowsDir, filename);
            try {
              const content = await fs.readFile(filepath, 'utf-8');
              const data = JSON.parse(content);
              const stat = await fs.stat(filepath);
              return {
                name: data.name || filename.replace('.json', ''),
                description: data.description || '',
                path: filepath,
                createdAt: data.createdAt || stat.birthtime.toISOString(),
                updatedAt: data.updatedAt || stat.mtime.toISOString(),
                nodeCount: Array.isArray(data.nodes) ? data.nodes.length : 0,
                edgeCount: Array.isArray(data.edges) ? data.edges.length : 0,
              };
            } catch {
              return null;
            }
          })
      );

      // Filter out null entries and sort by date
      const validTemplates = templates.filter(Boolean) as any[];
      validTemplates.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return { templates: validTemplates };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { templates: [] };
      }
      console.error('[Workflows] Failed to list templates:', error);
      return reply.status(500).send({ error: 'Failed to list workflow templates' });
    }
  });

  // GET /api/projects/:id/workflows/templates/:name - Get a specific workflow template
  app.get('/:id/workflows/templates/:name', async (request, reply) => {
    const user = (request as any).user;
    const { id, name } = request.params as { id: string; name: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const isMember = project.workspace.members.some((m) => m.userId === user.id);
    if (!isMember) {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (!project.localPath) {
      return reply.status(404).send({ error: 'Workflow template not found' });
    }

    // Sanitize name to prevent path traversal
    const sanitizedName = path.basename(name);
    const filepath = path.join(project.localPath, 'workflows', `${sanitizedName}.json`);

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);
      return {
        name: data.name || sanitizedName,
        description: data.description || '',
        nodes: data.nodes || [],
        edges: data.edges || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return reply.status(404).send({ error: 'Workflow template not found' });
      }
      console.error('[Workflows] Failed to read template:', error);
      return reply.status(500).send({ error: 'Failed to read workflow template' });
    }
  });

  // DELETE /api/projects/:id/workflows/templates/:name - Delete a workflow template
  app.delete('/:id/workflows/templates/:name', async (request, reply) => {
    const user = (request as any).user;
    const { id, name } = request.params as { id: string; name: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: { workspace: { include: { members: true } } },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const membership = project.workspace.members.find((m) => m.userId === user.id);
    if (!membership || membership.role === 'viewer') {
      return reply.status(403).send({ error: 'Not authorized' });
    }

    if (!project.localPath) {
      return reply.status(404).send({ error: 'Workflow template not found' });
    }

    // Sanitize name to prevent path traversal
    const sanitizedName = path.basename(name);
    const filepath = path.join(project.localPath, 'workflows', `${sanitizedName}.json`);

    try {
      await fs.unlink(filepath);
      console.log(`[Workflows] Deleted workflow template: ${filepath}`);
      return { success: true };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return reply.status(404).send({ error: 'Workflow template not found' });
      }
      console.error('[Workflows] Failed to delete template:', error);
      return reply.status(500).send({ error: 'Failed to delete workflow template' });
    }
  });
};
