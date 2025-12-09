import { createLogger } from '@agentworks/shared';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import type { AgentTool, ToolContext, ToolResult } from '../types.js';

const execAsync = promisify(exec);
const logger = createLogger('agent-tools:search-tools');

const MAX_OUTPUT_LENGTH = 20000;

export const grepTool: AgentTool = {
  name: 'grep',
  description: 'Search for a pattern in files. Returns matching lines with file paths and line numbers.',
  category: 'search',
  parameters: [
    {
      name: 'pattern',
      type: 'string',
      description: 'The regex pattern to search for',
      required: true,
    },
    {
      name: 'path',
      type: 'string',
      description: 'The directory or file to search in (relative to project root). Defaults to "." for entire project.',
      required: false,
      default: '.',
    },
    {
      name: 'filePattern',
      type: 'string',
      description: 'Glob pattern to filter files (e.g., "*.ts", "*.{js,jsx}")',
      required: false,
    },
    {
      name: 'ignoreCase',
      type: 'boolean',
      description: 'Whether to ignore case when matching',
      required: false,
      default: false,
    },
    {
      name: 'maxResults',
      type: 'number',
      description: 'Maximum number of results to return (default: 50)',
      required: false,
      default: 50,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const pattern = args.pattern as string;
    const searchPath = (args.path as string) || '.';
    const filePattern = args.filePattern as string | undefined;
    const ignoreCase = (args.ignoreCase as boolean) ?? false;
    const maxResults = (args.maxResults as number) ?? 50;

    if (!pattern) {
      return { success: false, error: 'Pattern is required' };
    }

    try {
      let command = 'grep -rn';

      if (ignoreCase) {
        command += ' -i';
      }

      if (filePattern) {
        command += ` --include="${filePattern}"`;
      }

      command += ' --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=build';
      command += ` -E "${pattern.replace(/"/g, '\\"')}" ${searchPath}`;
      command += ` | head -n ${maxResults}`;

      logger.info('Searching files', {
        projectId: context.projectId,
        pattern,
        searchPath,
        agent: context.agentName,
      });

      const { stdout, stderr } = await execAsync(command, {
        cwd: context.projectPath,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      }).catch((error: { stdout?: string; stderr?: string }) => ({
        stdout: error.stdout || '',
        stderr: error.stderr || '',
      }));

      const matches = stdout
        .slice(0, MAX_OUTPUT_LENGTH)
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const match = line.match(/^([^:]+):(\d+):(.*)$/);
          if (match) {
            return {
              file: match[1],
              line: parseInt(match[2]),
              content: match[3].trim(),
            };
          }
          return null;
        })
        .filter(Boolean);

      logger.info('Search completed', {
        projectId: context.projectId,
        matchCount: matches.length,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          pattern,
          matches,
          matchCount: matches.length,
          truncated: matches.length >= maxResults,
        },
      };
    } catch (error) {
      logger.error('Failed to search', {
        projectId: context.projectId,
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search files',
      };
    }
  },
};

export const findFilesTool: AgentTool = {
  name: 'find_files',
  description: 'Find files matching a name pattern in the project.',
  category: 'search',
  parameters: [
    {
      name: 'pattern',
      type: 'string',
      description: 'The file name pattern to search for (glob pattern, e.g., "*.ts", "component.tsx")',
      required: true,
    },
    {
      name: 'path',
      type: 'string',
      description: 'The directory to search in (relative to project root). Defaults to "." for entire project.',
      required: false,
      default: '.',
    },
    {
      name: 'type',
      type: 'string',
      description: 'Type of file: "f" for files, "d" for directories, "all" for both',
      required: false,
      default: 'f',
      enum: ['f', 'd', 'all'],
    },
    {
      name: 'maxDepth',
      type: 'number',
      description: 'Maximum directory depth to search (default: unlimited)',
      required: false,
    },
    {
      name: 'maxResults',
      type: 'number',
      description: 'Maximum number of results to return (default: 100)',
      required: false,
      default: 100,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const pattern = args.pattern as string;
    const searchPath = (args.path as string) || '.';
    const type = (args.type as string) || 'f';
    const maxDepth = args.maxDepth as number | undefined;
    const maxResults = (args.maxResults as number) ?? 100;

    if (!pattern) {
      return { success: false, error: 'Pattern is required' };
    }

    try {
      let command = 'find';
      command += ` ${searchPath}`;

      if (maxDepth !== undefined) {
        command += ` -maxdepth ${maxDepth}`;
      }

      if (type !== 'all') {
        command += ` -type ${type}`;
      }

      command += ` -name "${pattern}"`;
      command += ' -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*"';
      command += ` | head -n ${maxResults}`;

      logger.info('Finding files', {
        projectId: context.projectId,
        pattern,
        searchPath,
        agent: context.agentName,
      });

      const { stdout } = await execAsync(command, {
        cwd: context.projectPath,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });

      const files = stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((file) => ({
          path: file.startsWith('./') ? file.slice(2) : file,
          name: path.basename(file),
          directory: path.dirname(file),
        }));

      logger.info('Find completed', {
        projectId: context.projectId,
        fileCount: files.length,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          pattern,
          files,
          fileCount: files.length,
          truncated: files.length >= maxResults,
        },
      };
    } catch (error) {
      logger.error('Failed to find files', {
        projectId: context.projectId,
        pattern,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find files',
      };
    }
  },
};

export const searchSymbolTool: AgentTool = {
  name: 'search_symbol',
  description: 'Search for a symbol (function, class, variable) definition in the codebase.',
  category: 'search',
  parameters: [
    {
      name: 'symbol',
      type: 'string',
      description: 'The symbol name to search for',
      required: true,
    },
    {
      name: 'type',
      type: 'string',
      description: 'Type of symbol: "function", "class", "interface", "type", "const", "any"',
      required: false,
      default: 'any',
      enum: ['function', 'class', 'interface', 'type', 'const', 'any'],
    },
    {
      name: 'filePattern',
      type: 'string',
      description: 'Glob pattern to filter files (default: "*.{ts,tsx,js,jsx}")',
      required: false,
      default: '*.{ts,tsx,js,jsx}',
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const symbol = args.symbol as string;
    const type = (args.type as string) || 'any';
    const filePattern = (args.filePattern as string) || '*.{ts,tsx,js,jsx}';

    if (!symbol) {
      return { success: false, error: 'Symbol name is required' };
    }

    try {
      let pattern: string;

      switch (type) {
        case 'function':
          pattern = `(function\\s+${symbol}\\s*\\(|const\\s+${symbol}\\s*=\\s*(async\\s+)?\\(|${symbol}\\s*:\\s*\\([^)]*\\)\\s*=>)`;
          break;
        case 'class':
          pattern = `class\\s+${symbol}(\\s+|\\s*{|\\s+extends|\\s+implements)`;
          break;
        case 'interface':
          pattern = `interface\\s+${symbol}(\\s+|\\s*{|\\s+extends)`;
          break;
        case 'type':
          pattern = `type\\s+${symbol}\\s*=`;
          break;
        case 'const':
          pattern = `(const|let|var)\\s+${symbol}\\s*[=:]`;
          break;
        default:
          pattern = `(function|class|interface|type|const|let|var|export)\\s+(default\\s+)?(async\\s+)?(function\\s+)?${symbol}\\b`;
      }

      const command = `grep -rn --include="${filePattern}" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist -E "${pattern}" . | head -n 20`;

      logger.info('Searching symbol', {
        projectId: context.projectId,
        symbol,
        type,
        agent: context.agentName,
      });

      const { stdout } = await execAsync(command, {
        cwd: context.projectPath,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      }).catch((error: { stdout?: string }) => ({
        stdout: error.stdout || '',
      }));

      const definitions = stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const match = line.match(/^([^:]+):(\d+):(.*)$/);
          if (match) {
            return {
              file: match[1].startsWith('./') ? match[1].slice(2) : match[1],
              line: parseInt(match[2]),
              definition: match[3].trim(),
            };
          }
          return null;
        })
        .filter(Boolean);

      logger.info('Symbol search completed', {
        projectId: context.projectId,
        symbol,
        resultCount: definitions.length,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          symbol,
          type,
          definitions,
          found: definitions.length > 0,
        },
      };
    } catch (error) {
      logger.error('Failed to search symbol', {
        projectId: context.projectId,
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search symbol',
      };
    }
  },
};

export const searchTools = [
  grepTool,
  findFilesTool,
  searchSymbolTool,
];
