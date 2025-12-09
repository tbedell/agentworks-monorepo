import type { FastifyPluginAsync } from 'fastify';
import { lucia } from '../lib/auth.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface BrowseResponse {
  currentPath: string;
  parentPath: string | null;
  entries: DirectoryEntry[];
  roots: { name: string; path: string }[];
}

export const filesystemRoutes: FastifyPluginAsync = async (app) => {
  // Authentication hook
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

  // GET /api/filesystem/browse - Browse directories
  app.get('/browse', async (request, reply) => {
    const { path: requestedPath } = request.query as { path?: string };

    // Determine starting path
    let browsePath: string;
    if (requestedPath) {
      browsePath = requestedPath;
    } else {
      // Default to user's home directory
      browsePath = os.homedir();
    }

    // Normalize the path
    browsePath = path.resolve(browsePath);

    // Get filesystem roots based on OS
    const roots = getFilesystemRoots();

    try {
      // Read directory contents
      const entries = await fs.readdir(browsePath, { withFileTypes: true });

      // Filter to only directories and sort alphabetically
      const directories: DirectoryEntry[] = entries
        .filter(entry => entry.isDirectory())
        .filter(entry => !entry.name.startsWith('.')) // Hide hidden directories
        .map(entry => ({
          name: entry.name,
          path: path.join(browsePath, entry.name),
          isDirectory: true,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Get parent path (null if at root)
      const parentPath = getParentPath(browsePath);

      return {
        currentPath: browsePath,
        parentPath,
        entries: directories,
        roots,
      } as BrowseResponse;
    } catch (error: any) {
      // If directory doesn't exist or can't be read, return error with roots
      return reply.status(400).send({
        error: `Cannot access directory: ${error.message}`,
        currentPath: browsePath,
        roots,
      });
    }
  });

  // POST /api/filesystem/create-directory - Create a new directory
  app.post('/create-directory', async (request, reply) => {
    const { path: dirPath } = request.body as { path: string };

    if (!dirPath) {
      return reply.status(400).send({ error: 'Path is required' });
    }

    const resolvedPath = path.resolve(dirPath);

    try {
      await fs.mkdir(resolvedPath, { recursive: true });
      return { success: true, path: resolvedPath };
    } catch (error: any) {
      return reply.status(400).send({
        error: `Failed to create directory: ${error.message}`,
      });
    }
  });

  // GET /api/filesystem/validate - Check if a path exists and is a directory
  app.get('/validate', async (request, reply) => {
    const { path: dirPath } = request.query as { path: string };

    if (!dirPath) {
      return reply.status(400).send({ error: 'Path is required' });
    }

    const resolvedPath = path.resolve(dirPath);

    try {
      const stats = await fs.stat(resolvedPath);
      return {
        exists: true,
        isDirectory: stats.isDirectory(),
        path: resolvedPath,
      };
    } catch {
      return {
        exists: false,
        isDirectory: false,
        path: resolvedPath,
      };
    }
  });
};

function getFilesystemRoots(): { name: string; path: string }[] {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: Return common drive letters
    // In a real implementation, you'd enumerate actual drives
    return [
      { name: 'C:', path: 'C:\\' },
      { name: 'D:', path: 'D:\\' },
      { name: 'Home', path: os.homedir() },
    ];
  } else {
    // Linux/macOS
    return [
      { name: 'Home', path: os.homedir() },
      { name: 'Root', path: '/' },
      { name: 'Tmp', path: '/tmp' },
    ];
  }
}

function getParentPath(currentPath: string): string | null {
  const parent = path.dirname(currentPath);

  // Check if we're at the root
  if (parent === currentPath) {
    return null;
  }

  return parent;
}
