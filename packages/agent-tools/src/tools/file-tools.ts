import { createLogger } from '@agentworks/shared';
import { ProjectFileSystem } from '@agentworks/project-files';
import type { AgentTool, ToolContext, ToolResult } from '../types.js';

const logger = createLogger('agent-tools:file-tools');
const projectFs = new ProjectFileSystem('/projects');

export const readFileTool: AgentTool = {
  name: 'read_file',
  description: 'Read the contents of a file from the project. Returns the file content as a string.',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'The relative path to the file within the project (e.g., "src/index.ts")',
      required: true,
    },
    {
      name: 'encoding',
      type: 'string',
      description: 'The encoding to use when reading the file (default: utf-8)',
      required: false,
      default: 'utf-8',
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const path = args.path as string;

    if (!path) {
      return { success: false, error: 'Path is required' };
    }

    try {
      const content = await projectFs.readFile(context.projectId, path);
      logger.info('File read', { projectId: context.projectId, path, agent: context.agentName });

      return {
        success: true,
        data: {
          path,
          content,
          size: content.length,
        },
      };
    } catch (error) {
      logger.error('Failed to read file', {
        projectId: context.projectId,
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read file',
      };
    }
  },
};

export const writeFileTool: AgentTool = {
  name: 'write_file',
  description: 'Write content to a file in the project. Creates the file if it does not exist, or overwrites if it does.',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'The relative path to the file within the project (e.g., "src/utils/helper.ts")',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'The content to write to the file',
      required: true,
    },
    {
      name: 'createDirectories',
      type: 'boolean',
      description: 'Whether to create parent directories if they do not exist (default: true)',
      required: false,
      default: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const path = args.path as string;
    const content = args.content as string;

    if (!path) {
      return { success: false, error: 'Path is required' };
    }

    if (content === undefined || content === null) {
      return { success: false, error: 'Content is required' };
    }

    try {
      const fileInfo = await projectFs.createFile(context.projectId, path, content, {
        agentId: context.agentRunId,
        type: inferFileType(path),
        language: inferLanguage(path),
      });

      logger.info('File written', {
        projectId: context.projectId,
        path,
        agent: context.agentName,
        size: content.length,
      });

      return {
        success: true,
        data: {
          path: fileInfo.path,
          size: fileInfo.size,
          created: true,
        },
      };
    } catch (error) {
      logger.error('Failed to write file', {
        projectId: context.projectId,
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to write file',
      };
    }
  },
};

export const updateFileTool: AgentTool = {
  name: 'update_file',
  description: 'Update an existing file in the project. The file must already exist.',
  category: 'file',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'The relative path to the file within the project',
      required: true,
    },
    {
      name: 'content',
      type: 'string',
      description: 'The new content for the file',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const path = args.path as string;
    const content = args.content as string;

    if (!path) {
      return { success: false, error: 'Path is required' };
    }

    if (content === undefined || content === null) {
      return { success: false, error: 'Content is required' };
    }

    try {
      const fileInfo = await projectFs.updateFile(context.projectId, path, content, {
        agentId: context.agentRunId,
      });

      logger.info('File updated', {
        projectId: context.projectId,
        path,
        agent: context.agentName,
        size: content.length,
      });

      return {
        success: true,
        data: {
          path: fileInfo.path,
          size: fileInfo.size,
          updated: true,
        },
      };
    } catch (error) {
      logger.error('Failed to update file', {
        projectId: context.projectId,
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update file',
      };
    }
  },
};

export const listFilesTool: AgentTool = {
  name: 'list_files',
  description: 'List files in a directory within the project. Returns file paths and metadata.',
  category: 'file',
  parameters: [
    {
      name: 'directory',
      type: 'string',
      description: 'The relative directory path to list (e.g., "src" or "src/components"). Defaults to root if not specified.',
      required: false,
      default: '',
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: 'Whether to list files recursively (default: false)',
      required: false,
      default: false,
    },
    {
      name: 'pattern',
      type: 'string',
      description: 'Glob pattern to filter files (e.g., "*.ts" or "**/*.tsx")',
      required: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const directory = (args.directory as string) || '';
    const recursive = (args.recursive as boolean) ?? false;
    const pattern = args.pattern as string | undefined;

    try {
      const files = await projectFs.listFiles(context.projectId, {
        directory,
        recursive,
      });

      logger.info('Files listed', {
        projectId: context.projectId,
        directory,
        count: files.length,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          directory,
          files: files.map((f) => ({
            path: f.path,
            type: f.type,
            language: f.language,
            size: f.size,
          })),
          count: files.length,
        },
      };
    } catch (error) {
      logger.error('Failed to list files', {
        projectId: context.projectId,
        directory,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files',
      };
    }
  },
};

export const deleteFileTool: AgentTool = {
  name: 'delete_file',
  description: 'Delete a file from the project. This action cannot be undone.',
  category: 'file',
  requiresApproval: true,
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'The relative path to the file to delete',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const path = args.path as string;

    if (!path) {
      return { success: false, error: 'Path is required' };
    }

    try {
      await projectFs.deleteFile(context.projectId, path);

      logger.info('File deleted', {
        projectId: context.projectId,
        path,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          path,
          deleted: true,
        },
      };
    } catch (error) {
      logger.error('Failed to delete file', {
        projectId: context.projectId,
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      };
    }
  },
};

function inferFileType(path: string): 'source' | 'test' | 'config' | 'doc' {
  if (path.includes('.test.') || path.includes('.spec.') || path.includes('__tests__')) {
    return 'test';
  }
  if (
    path.endsWith('.json') ||
    path.endsWith('.yaml') ||
    path.endsWith('.yml') ||
    path.endsWith('.toml') ||
    path.endsWith('.env') ||
    path.includes('config')
  ) {
    return 'config';
  }
  if (path.endsWith('.md') || path.endsWith('.txt') || path.includes('docs/')) {
    return 'doc';
  }
  return 'source';
}

function inferLanguage(path: string): string | undefined {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
  };

  return ext ? langMap[ext] : undefined;
}

export const fileTools = [
  readFileTool,
  writeFileTool,
  updateFileTool,
  listFilesTool,
  deleteFileTool,
];
