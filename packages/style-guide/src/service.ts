import { prisma, Prisma } from '@agentworks/db';
import { createLogger } from '@agentworks/shared';
import {
  StyleGuideConfig,
  StyleGuideInput,
  ConfigFiles,
  DEFAULT_STYLE_GUIDE,
  CaseStyle,
  IndentStyle,
  TrailingCommas,
} from './types.js';
import { StyleGuideValidator } from './validator.js';
import { generateESLintConfig } from './generators/eslint-config.js';
import { generatePrettierConfig } from './generators/prettier-config.js';
import { generateEditorConfig } from './generators/editorconfig.js';

const logger = createLogger('style-guide:service');

export class StyleGuideService {
  private validator: StyleGuideValidator;

  constructor() {
    this.validator = new StyleGuideValidator();
  }

  async getStyleGuide(projectId: string): Promise<StyleGuideConfig | null> {
    const styleGuide = await prisma.styleGuide.findUnique({
      where: { projectId },
    });

    if (!styleGuide) {
      return null;
    }

    return this.dbToConfig(styleGuide);
  }

  async getOrCreateStyleGuide(projectId: string): Promise<StyleGuideConfig> {
    const existing = await this.getStyleGuide(projectId);
    if (existing) {
      return existing;
    }

    return this.createStyleGuide(projectId, {});
  }

  async createStyleGuide(projectId: string, input: StyleGuideInput): Promise<StyleGuideConfig> {
    logger.info('Creating style guide', { projectId });

    const config: StyleGuideConfig = {
      ...DEFAULT_STYLE_GUIDE,
      ...input,
    };

    const styleGuide = await prisma.styleGuide.create({
      data: {
        projectId,
        variableCase: config.variableCase,
        functionCase: config.functionCase,
        classCase: config.classCase,
        constantCase: config.constantCase,
        fileCase: config.fileCase,
        componentCase: config.componentCase,
        indentStyle: config.indentStyle,
        indentSize: config.indentSize,
        maxLineLength: config.maxLineLength,
        semicolons: config.semicolons,
        singleQuotes: config.singleQuotes,
        trailingCommas: config.trailingCommas,
        dateFormat: config.dateFormat,
        currencyFormat: config.currencyFormat,
        phoneFormat: config.phoneFormat,
        zipCodeFormat: config.zipCodeFormat,
        numberFormat: config.numberFormat,
        maxFunctionLength: config.maxFunctionLength,
        maxFileLength: config.maxFileLength,
        requireDocstrings: config.requireDocstrings,
        testNamingPattern: config.testNamingPattern,
        primaryLanguage: config.primaryLanguage,
        frameworks: config.frameworks,
        customRules: config.customRules ? (config.customRules as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    logger.info('Style guide created', { projectId, id: styleGuide.id });

    return this.dbToConfig(styleGuide);
  }

  async updateStyleGuide(projectId: string, input: StyleGuideInput): Promise<StyleGuideConfig> {
    logger.info('Updating style guide', { projectId });

    const existing = await this.getStyleGuide(projectId);
    if (!existing) {
      return this.createStyleGuide(projectId, input);
    }

    const config: StyleGuideConfig = {
      ...existing,
      ...input,
    };

    const styleGuide = await prisma.styleGuide.update({
      where: { projectId },
      data: {
        variableCase: config.variableCase,
        functionCase: config.functionCase,
        classCase: config.classCase,
        constantCase: config.constantCase,
        fileCase: config.fileCase,
        componentCase: config.componentCase,
        indentStyle: config.indentStyle,
        indentSize: config.indentSize,
        maxLineLength: config.maxLineLength,
        semicolons: config.semicolons,
        singleQuotes: config.singleQuotes,
        trailingCommas: config.trailingCommas,
        dateFormat: config.dateFormat,
        currencyFormat: config.currencyFormat,
        phoneFormat: config.phoneFormat,
        zipCodeFormat: config.zipCodeFormat,
        numberFormat: config.numberFormat,
        maxFunctionLength: config.maxFunctionLength,
        maxFileLength: config.maxFileLength,
        requireDocstrings: config.requireDocstrings,
        testNamingPattern: config.testNamingPattern,
        primaryLanguage: config.primaryLanguage,
        frameworks: config.frameworks,
        customRules: config.customRules ? (config.customRules as Prisma.InputJsonValue) : Prisma.JsonNull,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    logger.info('Style guide updated', { projectId, version: styleGuide.version });

    return this.dbToConfig(styleGuide);
  }

  async deleteStyleGuide(projectId: string): Promise<void> {
    await prisma.styleGuide.delete({
      where: { projectId },
    });

    logger.info('Style guide deleted', { projectId });
  }

  validateCode(config: StyleGuideConfig, code: string, language: string) {
    return this.validator.validate(config, code, language);
  }

  async validateProjectCode(projectId: string, code: string, language: string) {
    const config = await this.getOrCreateStyleGuide(projectId);
    return this.validator.validate(config, code, language);
  }

  generateConfigs(config: StyleGuideConfig): ConfigFiles {
    return {
      eslintrc: generateESLintConfig(config),
      prettierrc: generatePrettierConfig(config),
      editorconfig: generateEditorConfig(config),
    };
  }

  async generateProjectConfigs(projectId: string): Promise<ConfigFiles> {
    const config = await this.getOrCreateStyleGuide(projectId);
    return this.generateConfigs(config);
  }

  formatStyleGuideForPrompt(config: StyleGuideConfig): string {
    return `## Project Style Guide

### Naming Conventions
- Variables: ${config.variableCase} (e.g., ${this.getCaseExample(config.variableCase)})
- Functions: ${config.functionCase} (e.g., ${this.getCaseExample(config.functionCase)})
- Classes: ${config.classCase} (e.g., ${this.getCaseExample(config.classCase)})
- Constants: ${config.constantCase} (e.g., ${this.getCaseExample(config.constantCase)})
- Files: ${config.fileCase} (e.g., ${this.getCaseExample(config.fileCase)})
- Components: ${config.componentCase} (e.g., ${this.getCaseExample(config.componentCase)})

### Formatting
- Indentation: ${config.indentSize} ${config.indentStyle}
- Max line length: ${config.maxLineLength} characters
- Semicolons: ${config.semicolons ? 'required' : 'not used'}
- Quotes: ${config.singleQuotes ? 'single quotes' : 'double quotes'}
- Trailing commas: ${config.trailingCommas}

### Data Formats
- Dates: ${config.dateFormat} format
- Currency: ${config.currencyFormat}
- Phone numbers: ${config.phoneFormat}
- ZIP codes: ${config.zipCodeFormat}
- Numbers: ${config.numberFormat}

### Code Standards
- Max function length: ${config.maxFunctionLength} lines
- Max file length: ${config.maxFileLength} lines
- Docstrings: ${config.requireDocstrings ? 'required' : 'optional'}
- Test naming: ${config.testNamingPattern}

### Language & Frameworks
- Primary language: ${config.primaryLanguage}
- Frameworks: ${config.frameworks.length > 0 ? config.frameworks.join(', ') : 'none specified'}
`;
  }

  private getCaseExample(caseStyle: CaseStyle): string {
    const examples: Record<CaseStyle, string> = {
      camelCase: 'myVariableName',
      PascalCase: 'MyClassName',
      snake_case: 'my_variable_name',
      UPPER_SNAKE: 'MY_CONSTANT_VALUE',
      'kebab-case': 'my-file-name',
    };
    return examples[caseStyle];
  }

  private dbToConfig(styleGuide: {
    variableCase: string;
    functionCase: string;
    classCase: string;
    constantCase: string;
    fileCase: string;
    componentCase: string;
    indentStyle: string;
    indentSize: number;
    maxLineLength: number;
    semicolons: boolean;
    singleQuotes: boolean;
    trailingCommas: string;
    dateFormat: string;
    currencyFormat: string;
    phoneFormat: string;
    zipCodeFormat: string;
    numberFormat: string;
    maxFunctionLength: number;
    maxFileLength: number;
    requireDocstrings: boolean;
    testNamingPattern: string;
    primaryLanguage: string;
    frameworks: string[];
    customRules: unknown;
  }): StyleGuideConfig {
    return {
      variableCase: styleGuide.variableCase as CaseStyle,
      functionCase: styleGuide.functionCase as CaseStyle,
      classCase: styleGuide.classCase as CaseStyle,
      constantCase: styleGuide.constantCase as CaseStyle,
      fileCase: styleGuide.fileCase as CaseStyle,
      componentCase: styleGuide.componentCase as CaseStyle,
      indentStyle: styleGuide.indentStyle as IndentStyle,
      indentSize: styleGuide.indentSize,
      maxLineLength: styleGuide.maxLineLength,
      semicolons: styleGuide.semicolons,
      singleQuotes: styleGuide.singleQuotes,
      trailingCommas: styleGuide.trailingCommas as TrailingCommas,
      dateFormat: styleGuide.dateFormat,
      currencyFormat: styleGuide.currencyFormat,
      phoneFormat: styleGuide.phoneFormat,
      zipCodeFormat: styleGuide.zipCodeFormat,
      numberFormat: styleGuide.numberFormat,
      maxFunctionLength: styleGuide.maxFunctionLength,
      maxFileLength: styleGuide.maxFileLength,
      requireDocstrings: styleGuide.requireDocstrings,
      testNamingPattern: styleGuide.testNamingPattern,
      primaryLanguage: styleGuide.primaryLanguage,
      frameworks: styleGuide.frameworks,
      customRules: styleGuide.customRules as Record<string, unknown> | undefined,
    };
  }
}

export const styleGuideService = new StyleGuideService();
