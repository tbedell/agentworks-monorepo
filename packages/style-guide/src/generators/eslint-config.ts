import { StyleGuideConfig } from '../types.js';

export function generateESLintConfig(config: StyleGuideConfig): string {
  const eslintConfig = {
    root: true,
    env: {
      browser: config.frameworks.includes('react') || config.frameworks.includes('vue'),
      node: config.frameworks.includes('express') || config.frameworks.includes('fastify') || config.primaryLanguage === 'typescript',
      es2022: true,
    },
    extends: getExtends(config),
    parser: config.primaryLanguage === 'typescript' ? '@typescript-eslint/parser' : undefined,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: config.frameworks.includes('react') ? { jsx: true } : undefined,
    },
    plugins: getPlugins(config),
    rules: getRules(config),
    settings: getSettings(config),
  };

  // Remove undefined values
  const cleanConfig = JSON.parse(JSON.stringify(eslintConfig));

  return JSON.stringify(cleanConfig, null, 2);
}

function getExtends(config: StyleGuideConfig): string[] {
  const extensions: string[] = ['eslint:recommended'];

  if (config.primaryLanguage === 'typescript') {
    extensions.push('@typescript-eslint/recommended');
  }

  if (config.frameworks.includes('react')) {
    extensions.push('plugin:react/recommended');
    extensions.push('plugin:react-hooks/recommended');
  }

  if (config.frameworks.includes('vue')) {
    extensions.push('plugin:vue/vue3-recommended');
  }

  return extensions;
}

function getPlugins(config: StyleGuideConfig): string[] {
  const plugins: string[] = [];

  if (config.primaryLanguage === 'typescript') {
    plugins.push('@typescript-eslint');
  }

  if (config.frameworks.includes('react')) {
    plugins.push('react');
    plugins.push('react-hooks');
  }

  if (config.frameworks.includes('vue')) {
    plugins.push('vue');
  }

  return plugins;
}

function getRules(config: StyleGuideConfig): Record<string, unknown> {
  const rules: Record<string, unknown> = {
    // Formatting
    indent: ['error', config.indentSize],
    'max-len': ['warn', { code: config.maxLineLength, ignoreUrls: true, ignoreStrings: true }],
    semi: ['error', config.semicolons ? 'always' : 'never'],
    quotes: ['error', config.singleQuotes ? 'single' : 'double', { avoidEscape: true }],
    'comma-dangle': ['error', config.trailingCommas === 'none' ? 'never' : config.trailingCommas === 'all' ? 'always-multiline' : 'only-multiline'],

    // Code quality
    'max-lines-per-function': ['warn', { max: config.maxFunctionLength, skipBlankLines: true, skipComments: true }],
    'max-lines': ['warn', { max: config.maxFileLength, skipBlankLines: true, skipComments: true }],

    // Naming conventions
    camelcase: config.variableCase === 'camelCase' ? ['warn', { properties: 'never' }] : 'off',

    // Best practices
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'prefer-const': 'error',
    eqeqeq: ['error', 'always'],
  };

  if (config.primaryLanguage === 'typescript') {
    // Override some rules with TypeScript-specific versions
    rules['@typescript-eslint/no-unused-vars'] = 'warn';
    rules['no-unused-vars'] = 'off';
    rules['@typescript-eslint/explicit-function-return-type'] = config.requireDocstrings ? 'warn' : 'off';
  }

  if (config.frameworks.includes('react')) {
    rules['react/react-in-jsx-scope'] = 'off'; // Not needed in React 17+
    rules['react/prop-types'] = 'off'; // Not needed with TypeScript
  }

  return rules;
}

function getSettings(config: StyleGuideConfig): Record<string, unknown> | undefined {
  if (config.frameworks.includes('react')) {
    return {
      react: {
        version: 'detect',
      },
    };
  }
  return undefined;
}
