import { createLogger } from '@agentworks/shared';
import { StyleGuideService, StyleGuideValidator } from '@agentworks/style-guide';
import type { AgentTool, ToolContext, ToolResult } from '../types.js';

const logger = createLogger('agent-tools:style-tools');
const styleGuideService = new StyleGuideService();

export const validateStyleTool: AgentTool = {
  name: 'validate_style',
  description: 'Validate code against the project style guide. Returns style violations and suggestions.',
  category: 'style',
  parameters: [
    {
      name: 'code',
      type: 'string',
      description: 'The code to validate',
      required: true,
    },
    {
      name: 'language',
      type: 'string',
      description: 'The programming language of the code (e.g., "typescript", "javascript", "python")',
      required: true,
    },
  ],
  execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const code = args.code as string;
    const language = args.language as string;

    if (!code) {
      return { success: false, error: 'Code is required' };
    }

    if (!language) {
      return { success: false, error: 'Language is required' };
    }

    try {
      const styleGuide = await styleGuideService.getStyleGuide(context.projectId);

      if (!styleGuide) {
        logger.info('No style guide found, using defaults', {
          projectId: context.projectId,
        });

        return {
          success: true,
          data: {
            valid: true,
            message: 'No style guide configured for this project',
            errors: [],
            warnings: [],
            suggestions: [],
          },
        };
      }

      const validation = styleGuideService.validateCode(styleGuide, code, language);

      logger.info('Style validation completed', {
        projectId: context.projectId,
        valid: validation.valid,
        errors: validation.errors.length,
        warnings: validation.warnings.length,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          valid: validation.valid,
          errors: validation.errors.map((e) => ({
            rule: e.rule,
            message: e.message,
            line: e.line,
            column: e.column,
          })),
          warnings: validation.warnings.map((w) => ({
            rule: w.rule,
            message: w.message,
            line: w.line,
            column: w.column,
          })),
          suggestions: validation.suggestions.map((s) => ({
            rule: s.rule,
            message: s.message,
            line: s.line,
            column: s.column,
          })),
        },
      };
    } catch (error) {
      logger.error('Failed to validate style', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate style',
      };
    }
  },
};

export const getStyleGuideTool: AgentTool = {
  name: 'get_style_guide',
  description: 'Get the project style guide configuration. Returns naming conventions, formatting rules, and code standards.',
  category: 'style',
  parameters: [],
  execute: async (_args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    try {
      const styleGuide = await styleGuideService.getStyleGuide(context.projectId);

      if (!styleGuide) {
        logger.info('No style guide found', {
          projectId: context.projectId,
        });

        return {
          success: true,
          data: {
            configured: false,
            message: 'No style guide configured for this project',
          },
        };
      }

      const formatted = styleGuideService.formatStyleGuideForPrompt(styleGuide);

      logger.info('Style guide retrieved', {
        projectId: context.projectId,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          configured: true,
          styleGuide: {
            naming: {
              variableCase: styleGuide.variableCase,
              functionCase: styleGuide.functionCase,
              classCase: styleGuide.classCase,
              constantCase: styleGuide.constantCase,
              fileCase: styleGuide.fileCase,
            },
            formatting: {
              indentStyle: styleGuide.indentStyle,
              indentSize: styleGuide.indentSize,
              maxLineLength: styleGuide.maxLineLength,
              semicolons: styleGuide.semicolons,
              singleQuotes: styleGuide.singleQuotes,
            },
            codeStandards: {
              maxFunctionLength: styleGuide.maxFunctionLength,
              maxFileLength: styleGuide.maxFileLength,
              requireDocstrings: styleGuide.requireDocstrings,
              testNamingPattern: styleGuide.testNamingPattern,
            },
            dataFormats: {
              dateFormat: styleGuide.dateFormat,
              currencyFormat: styleGuide.currencyFormat,
              phoneFormat: styleGuide.phoneFormat,
              zipCodeFormat: styleGuide.zipCodeFormat,
              numberFormat: styleGuide.numberFormat,
            },
          },
          formatted,
        },
      };
    } catch (error) {
      logger.error('Failed to get style guide', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get style guide',
      };
    }
  },
};

export const generateConfigsTool: AgentTool = {
  name: 'generate_style_configs',
  description: 'Generate configuration files (.eslintrc, .prettierrc, .editorconfig) from the project style guide.',
  category: 'style',
  allowedAgents: ['code_standards', 'architect', 'devops'],
  parameters: [],
  execute: async (_args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    try {
      const styleGuide = await styleGuideService.getStyleGuide(context.projectId);

      if (!styleGuide) {
        return {
          success: false,
          error: 'No style guide configured for this project',
        };
      }

      const configs = styleGuideService.generateConfigs(styleGuide);

      logger.info('Style configs generated', {
        projectId: context.projectId,
        agent: context.agentName,
      });

      return {
        success: true,
        data: {
          configs: {
            eslint: configs.eslintrc,
            prettier: configs.prettierrc,
            editorconfig: configs.editorconfig,
          },
        },
      };
    } catch (error) {
      logger.error('Failed to generate style configs', {
        projectId: context.projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate style configs',
      };
    }
  },
};

export const styleTools = [
  validateStyleTool,
  getStyleGuideTool,
  generateConfigsTool,
];
