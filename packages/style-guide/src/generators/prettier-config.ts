import { StyleGuideConfig } from '../types.js';

export function generatePrettierConfig(config: StyleGuideConfig): string {
  const prettierConfig = {
    // Formatting
    printWidth: config.maxLineLength,
    tabWidth: config.indentSize,
    useTabs: config.indentStyle === 'tabs',
    semi: config.semicolons,
    singleQuote: config.singleQuotes,
    trailingComma: config.trailingCommas,

    // JSX
    jsxSingleQuote: config.singleQuotes,
    bracketSpacing: true,
    bracketSameLine: false,

    // Other
    arrowParens: 'always',
    endOfLine: 'lf',
    proseWrap: 'preserve',

    // File-specific overrides
    overrides: getOverrides(config),
  };

  return JSON.stringify(prettierConfig, null, 2);
}

function getOverrides(config: StyleGuideConfig): Array<{ files: string | string[]; options: Record<string, unknown> }> {
  const overrides: Array<{ files: string | string[]; options: Record<string, unknown> }> = [];

  // Markdown files
  overrides.push({
    files: '*.md',
    options: {
      proseWrap: 'always',
    },
  });

  // JSON files
  overrides.push({
    files: '*.json',
    options: {
      tabWidth: 2,
    },
  });

  // YAML files
  overrides.push({
    files: ['*.yaml', '*.yml'],
    options: {
      tabWidth: 2,
    },
  });

  // HTML files (if using frameworks)
  if (config.frameworks.includes('vue') || config.frameworks.includes('svelte')) {
    overrides.push({
      files: ['*.vue', '*.svelte'],
      options: {
        htmlWhitespaceSensitivity: 'ignore',
      },
    });
  }

  return overrides;
}
