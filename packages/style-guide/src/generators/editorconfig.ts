import { StyleGuideConfig } from '../types.js';

export function generateEditorConfig(config: StyleGuideConfig): string {
  const lines: string[] = [
    '# EditorConfig helps maintain consistent coding styles',
    '# https://editorconfig.org',
    '',
    '# Top-most EditorConfig file',
    'root = true',
    '',
    '# Default settings for all files',
    '[*]',
    `indent_style = ${config.indentStyle === 'spaces' ? 'space' : 'tab'}`,
    `indent_size = ${config.indentSize}`,
    'end_of_line = lf',
    'charset = utf-8',
    'trim_trailing_whitespace = true',
    'insert_final_newline = true',
    `max_line_length = ${config.maxLineLength}`,
    '',
  ];

  // TypeScript/JavaScript files
  if (config.primaryLanguage === 'typescript' || config.primaryLanguage === 'javascript') {
    lines.push(
      `[*.{ts,tsx,js,jsx}]`,
      `indent_style = ${config.indentStyle === 'spaces' ? 'space' : 'tab'}`,
      `indent_size = ${config.indentSize}`,
      ''
    );
  }

  // Python files
  if (config.primaryLanguage === 'python') {
    lines.push(
      '[*.py]',
      'indent_style = space',
      'indent_size = 4',
      ''
    );
  }

  // JSON files
  lines.push(
    '[*.json]',
    'indent_style = space',
    'indent_size = 2',
    ''
  );

  // YAML files
  lines.push(
    '[*.{yml,yaml}]',
    'indent_style = space',
    'indent_size = 2',
    ''
  );

  // Markdown files
  lines.push(
    '[*.md]',
    'trim_trailing_whitespace = false',
    ''
  );

  // Makefile (always tabs)
  lines.push(
    '[Makefile]',
    'indent_style = tab',
    ''
  );

  // Shell scripts
  lines.push(
    '[*.sh]',
    'indent_style = space',
    'indent_size = 2',
    ''
  );

  return lines.join('\n');
}
