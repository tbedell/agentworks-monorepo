import { createLogger } from '@agentworks/shared';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { AgentTool, ToolContext, ToolResult } from '../types.js';

const execAsync = promisify(exec);
const logger = createLogger('agent-tools:code-tools');

const MAX_OUTPUT_LENGTH = 10000;

interface ExecOptions {
  cwd: string;
  timeout?: number;
  maxBuffer?: number;
}

async function safeExec(
  command: string,
  options: ExecOptions
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd,
      timeout: options.timeout || 60000,
      maxBuffer: options.maxBuffer || 1024 * 1024,
    });

    return {
      stdout: stdout.slice(0, MAX_OUTPUT_LENGTH),
      stderr: stderr.slice(0, MAX_OUTPUT_LENGTH),
      exitCode: 0,
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: (execError.stdout || '').slice(0, MAX_OUTPUT_LENGTH),
      stderr: (execError.stderr || '').slice(0, MAX_OUTPUT_LENGTH),
      exitCode: execError.code || 1,
    };
  }
}

export const runTestsTool: AgentTool = {
  name: 'run_tests',
  description: 'Run tests in the project using the configured test runner (npm test, jest, vitest, etc.).',
  category: 'code',
  parameters: [
    {
      name: 'testPath',
      type: 'string',
      description: 'Specific test file or directory to run. If not specified, runs all tests.',
      required: false,
    },
    {
      name: 'testPattern',
      type: 'string',
      description: 'Pattern to match test names (e.g., "should validate")',
      required: false,
    },
    {
      name: 'watch',
      type: 'boolean',
      description: 'Run tests in watch mode (not recommended for agents)',
      required: false,
      default: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const testPath = args.testPath as string | undefined;
    const testPattern = args.testPattern as string | undefined;

    try {
      let command = 'npm test';

      if (testPath) {
        command += ` -- ${testPath}`;
      }

      if (testPattern) {
        command += ` -t "${testPattern}"`;
      }

      command += ' --passWithNoTests --no-coverage';

      logger.info('Running tests', {
        projectId: context.projectId,
        testPath,
        agent: context.agentName,
      });

      const result = await safeExec(command, {
        cwd: context.projectPath,
        timeout: 120000,
      });

      const success = result.exitCode === 0;

      logger.info('Tests completed', {
        projectId: context.projectId,
        success,
        exitCode: result.exitCode,
        agent: context.agentName,
      });

      return {
        success,
        data: {
          passed: success,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          testPath: testPath || 'all',
        },
      };
    } catch (error) {
      logger.error('Failed to run tests', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run tests',
      };
    }
  },
};

export const runLinterTool: AgentTool = {
  name: 'run_linter',
  description: 'Run the linter (ESLint) on the project to check for code style issues.',
  category: 'code',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Specific file or directory to lint. If not specified, lints the entire project.',
      required: false,
      default: '.',
    },
    {
      name: 'fix',
      type: 'boolean',
      description: 'Automatically fix fixable issues (use with caution)',
      required: false,
      default: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const path = (args.path as string) || '.';
    const fix = (args.fix as boolean) ?? false;

    try {
      let command = `npx eslint ${path} --format json`;

      if (fix) {
        command += ' --fix';
      }

      logger.info('Running linter', {
        projectId: context.projectId,
        path,
        fix,
        agent: context.agentName,
      });

      const result = await safeExec(command, {
        cwd: context.projectPath,
        timeout: 60000,
      });

      let lintResults: Array<{ filePath: string; errorCount: number; warningCount: number; messages: unknown[] }> = [];
      let parseError = false;

      try {
        if (result.stdout.trim()) {
          lintResults = JSON.parse(result.stdout);
        }
      } catch {
        parseError = true;
      }

      const totalErrors = lintResults.reduce((sum, file) => sum + file.errorCount, 0);
      const totalWarnings = lintResults.reduce((sum, file) => sum + file.warningCount, 0);

      const success = result.exitCode === 0 && totalErrors === 0;

      logger.info('Linting completed', {
        projectId: context.projectId,
        success,
        errors: totalErrors,
        warnings: totalWarnings,
        agent: context.agentName,
      });

      return {
        success,
        data: parseError
          ? {
              rawOutput: result.stdout,
              stderr: result.stderr,
              exitCode: result.exitCode,
            }
          : {
              files: lintResults.map((file) => ({
                path: file.filePath,
                errors: file.errorCount,
                warnings: file.warningCount,
                messages: file.messages.slice(0, 20),
              })),
              totalErrors,
              totalWarnings,
              fixed: fix,
            },
      };
    } catch (error) {
      logger.error('Failed to run linter', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run linter',
      };
    }
  },
};

export const runTypeCheckTool: AgentTool = {
  name: 'run_typecheck',
  description: 'Run TypeScript type checking on the project.',
  category: 'code',
  parameters: [
    {
      name: 'project',
      type: 'string',
      description: 'Path to tsconfig.json file. If not specified, uses the default tsconfig.json.',
      required: false,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const project = args.project as string | undefined;

    try {
      let command = 'npx tsc --noEmit';

      if (project) {
        command += ` -p ${project}`;
      }

      logger.info('Running type check', {
        projectId: context.projectId,
        project,
        agent: context.agentName,
      });

      const result = await safeExec(command, {
        cwd: context.projectPath,
        timeout: 120000,
      });

      const success = result.exitCode === 0;

      const errors = result.stdout
        .split('\n')
        .filter((line) => line.includes('error TS'))
        .map((line) => {
          const match = line.match(/^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
          if (match) {
            return {
              file: match[1],
              line: parseInt(match[2]),
              column: parseInt(match[3]),
              code: match[4],
              message: match[5],
            };
          }
          return { raw: line };
        });

      logger.info('Type check completed', {
        projectId: context.projectId,
        success,
        errorCount: errors.length,
        agent: context.agentName,
      });

      return {
        success,
        data: {
          passed: success,
          exitCode: result.exitCode,
          errors,
          errorCount: errors.length,
          rawOutput: success ? undefined : result.stdout,
        },
      };
    } catch (error) {
      logger.error('Failed to run type check', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run type check',
      };
    }
  },
};

export const runBuildTool: AgentTool = {
  name: 'run_build',
  description: 'Run the build process for the project.',
  category: 'code',
  parameters: [],
  execute: async (_args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    try {
      const command = 'npm run build';

      logger.info('Running build', {
        projectId: context.projectId,
        agent: context.agentName,
      });

      const result = await safeExec(command, {
        cwd: context.projectPath,
        timeout: 180000,
      });

      const success = result.exitCode === 0;

      logger.info('Build completed', {
        projectId: context.projectId,
        success,
        exitCode: result.exitCode,
        agent: context.agentName,
      });

      return {
        success,
        data: {
          passed: success,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
        },
      };
    } catch (error) {
      logger.error('Failed to run build', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run build',
      };
    }
  },
};

export const codeTools = [
  runTestsTool,
  runLinterTool,
  runTypeCheckTool,
  runBuildTool,
];
