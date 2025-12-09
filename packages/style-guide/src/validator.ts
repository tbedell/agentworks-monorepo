import {
  StyleGuideConfig,
  ValidationResult,
  ValidationIssue,
  CASE_STYLE_PATTERNS,
  CaseStyle,
} from './types.js';

export class StyleGuideValidator {
  validate(config: StyleGuideConfig, code: string, language: string): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const suggestions: ValidationIssue[] = [];

    const lines = code.split('\n');

    this.validateLineLength(config, lines, warnings);
    this.validateFileLength(config, lines, warnings);
    this.validateIndentation(config, lines, errors);
    this.validateSemicolons(config, code, language, errors);
    this.validateQuotes(config, code, language, errors);
    this.validateNamingConventions(config, code, language, errors, warnings);
    this.validateFunctionLength(config, code, language, warnings);

    if (config.requireDocstrings) {
      this.validateDocstrings(code, language, suggestions);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  private validateLineLength(
    config: StyleGuideConfig,
    lines: string[],
    warnings: ValidationIssue[]
  ): void {
    lines.forEach((line, index) => {
      if (line.length > config.maxLineLength) {
        warnings.push({
          type: 'warning',
          rule: 'max-line-length',
          message: `Line ${index + 1} exceeds maximum length of ${config.maxLineLength} characters (${line.length})`,
          line: index + 1,
          column: config.maxLineLength,
          fixable: false,
        });
      }
    });
  }

  private validateFileLength(
    config: StyleGuideConfig,
    lines: string[],
    warnings: ValidationIssue[]
  ): void {
    if (lines.length > config.maxFileLength) {
      warnings.push({
        type: 'warning',
        rule: 'max-file-length',
        message: `File exceeds maximum length of ${config.maxFileLength} lines (${lines.length})`,
        line: config.maxFileLength,
        fixable: false,
      });
    }
  }

  private validateIndentation(
    config: StyleGuideConfig,
    lines: string[],
    errors: ValidationIssue[]
  ): void {
    const indentChar = config.indentStyle === 'spaces' ? ' ' : '\t';
    const indentPattern = config.indentStyle === 'spaces'
      ? new RegExp(`^(${' '.repeat(config.indentSize)})*\\S`)
      : /^(\t)*\S/;

    const wrongIndentPattern = config.indentStyle === 'spaces' ? /^\t/ : /^ /;

    lines.forEach((line, index) => {
      if (line.trim() === '') return;

      if (wrongIndentPattern.test(line)) {
        errors.push({
          type: 'error',
          rule: 'indent-style',
          message: `Line ${index + 1} uses ${config.indentStyle === 'spaces' ? 'tabs' : 'spaces'} instead of ${config.indentStyle}`,
          line: index + 1,
          column: 1,
          fixable: true,
          suggestedFix: line.replace(
            config.indentStyle === 'spaces' ? /^\t+/ : /^ +/,
            (match) => {
              if (config.indentStyle === 'spaces') {
                return ' '.repeat(match.length * config.indentSize);
              }
              return '\t'.repeat(Math.ceil(match.length / config.indentSize));
            }
          ),
        });
      }
    });
  }

  private validateSemicolons(
    config: StyleGuideConfig,
    code: string,
    language: string,
    errors: ValidationIssue[]
  ): void {
    if (!['typescript', 'javascript'].includes(language)) return;

    const lines = code.split('\n');
    const statementEndPattern = /^.*[^;{}\s]\s*$/;
    const controlStatements = /^\s*(if|else|for|while|switch|try|catch|finally|function|class|interface|type|enum)\b/;
    const objectOrArrayEnd = /^.*[}\]]\s*$/;
    const arrowFunctionEnd = /=>\s*[{(]/;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || controlStatements.test(line) || objectOrArrayEnd.test(line) || arrowFunctionEnd.test(line)) {
        return;
      }

      const needsSemicolon = statementEndPattern.test(line) &&
        !line.includes('//') &&
        !trimmedLine.startsWith('*') &&
        !trimmedLine.startsWith('/*') &&
        !trimmedLine.endsWith(',');

      if (config.semicolons && needsSemicolon && !line.trimEnd().endsWith(';')) {
        // Simplified check - only flag obvious missing semicolons
        if (/^(const|let|var|return|throw|import|export)\s/.test(trimmedLine) &&
            !trimmedLine.endsWith(';') &&
            !trimmedLine.endsWith('{') &&
            !trimmedLine.includes('=>')) {
          errors.push({
            type: 'error',
            rule: 'semicolons',
            message: `Line ${index + 1} is missing semicolon`,
            line: index + 1,
            column: line.length,
            fixable: true,
            suggestedFix: line.trimEnd() + ';',
          });
        }
      }
    });
  }

  private validateQuotes(
    config: StyleGuideConfig,
    code: string,
    language: string,
    errors: ValidationIssue[]
  ): void {
    if (!['typescript', 'javascript'].includes(language)) return;

    const expectedQuote = config.singleQuotes ? "'" : '"';
    const wrongQuote = config.singleQuotes ? '"' : "'";
    const quotePattern = config.singleQuotes
      ? /"([^"\\]|\\.)*"/g
      : /'([^'\\]|\\.)*'/g;

    const lines = code.split('\n');
    lines.forEach((line, index) => {
      // Skip template literals and JSX
      if (line.includes('`') || line.includes('<')) return;

      let match;
      while ((match = quotePattern.exec(line)) !== null) {
        // Skip if it's part of a nested string (e.g., "he said 'hello'")
        if (match[0].includes(expectedQuote)) continue;

        errors.push({
          type: 'error',
          rule: 'quote-style',
          message: `Line ${index + 1}: Use ${config.singleQuotes ? 'single' : 'double'} quotes instead of ${config.singleQuotes ? 'double' : 'single'}`,
          line: index + 1,
          column: match.index + 1,
          fixable: true,
          suggestedFix: match[0].replace(/^["']|["']$/g, expectedQuote),
        });
      }
    });
  }

  private validateNamingConventions(
    config: StyleGuideConfig,
    code: string,
    language: string,
    errors: ValidationIssue[],
    warnings: ValidationIssue[]
  ): void {
    if (!['typescript', 'javascript'].includes(language)) return;

    // Validate variable names
    const varPattern = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;
    while ((match = varPattern.exec(code)) !== null) {
      const name = match[1];
      if (!this.matchesCaseStyle(name, config.variableCase)) {
        // Check if it might be a constant (all caps)
        if (/^[A-Z][A-Z0-9_]*$/.test(name) && name.includes('_')) {
          if (!this.matchesCaseStyle(name, config.constantCase)) {
            warnings.push({
              type: 'warning',
              rule: 'constant-naming',
              message: `Constant "${name}" should use ${config.constantCase}`,
              fixable: false,
            });
          }
        } else {
          warnings.push({
            type: 'warning',
            rule: 'variable-naming',
            message: `Variable "${name}" should use ${config.variableCase}`,
            fixable: false,
          });
        }
      }
    }

    // Validate function names
    const funcPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    while ((match = funcPattern.exec(code)) !== null) {
      const name = match[1];
      if (!this.matchesCaseStyle(name, config.functionCase)) {
        warnings.push({
          type: 'warning',
          rule: 'function-naming',
          message: `Function "${name}" should use ${config.functionCase}`,
          fixable: false,
        });
      }
    }

    // Validate class names
    const classPattern = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    while ((match = classPattern.exec(code)) !== null) {
      const name = match[1];
      if (!this.matchesCaseStyle(name, config.classCase)) {
        errors.push({
          type: 'error',
          rule: 'class-naming',
          message: `Class "${name}" should use ${config.classCase}`,
          fixable: false,
        });
      }
    }
  }

  private validateFunctionLength(
    config: StyleGuideConfig,
    code: string,
    language: string,
    warnings: ValidationIssue[]
  ): void {
    if (!['typescript', 'javascript'].includes(language)) return;

    const funcPattern = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:async\s+)?(\w+)\s*\([^)]*\)\s*{)/g;
    const lines = code.split('\n');

    let match;
    while ((match = funcPattern.exec(code)) !== null) {
      const startLine = code.substring(0, match.index).split('\n').length;
      let braceCount = 0;
      let foundStart = false;
      let endLine = startLine;

      for (let i = startLine - 1; i < lines.length; i++) {
        const line = lines[i];
        for (const char of line) {
          if (char === '{') {
            braceCount++;
            foundStart = true;
          } else if (char === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              endLine = i + 1;
              break;
            }
          }
        }
        if (foundStart && braceCount === 0) break;
      }

      const funcLength = endLine - startLine + 1;
      if (funcLength > config.maxFunctionLength) {
        warnings.push({
          type: 'warning',
          rule: 'max-function-length',
          message: `Function starting at line ${startLine} exceeds maximum length of ${config.maxFunctionLength} lines (${funcLength})`,
          line: startLine,
          fixable: false,
        });
      }
    }
  }

  private validateDocstrings(
    code: string,
    language: string,
    suggestions: ValidationIssue[]
  ): void {
    if (!['typescript', 'javascript'].includes(language)) return;

    const funcPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
    const classPattern = /(?:export\s+)?class\s+(\w+)/g;

    let match;
    while ((match = funcPattern.exec(code)) !== null) {
      const prevLines = code.substring(0, match.index).split('\n').slice(-3).join('\n');
      if (!prevLines.includes('/**') && !prevLines.includes('//')) {
        suggestions.push({
          type: 'suggestion',
          rule: 'require-docstring',
          message: `Function "${match[1]}" should have a JSDoc comment`,
          fixable: false,
        });
      }
    }

    while ((match = classPattern.exec(code)) !== null) {
      const prevLines = code.substring(0, match.index).split('\n').slice(-3).join('\n');
      if (!prevLines.includes('/**') && !prevLines.includes('//')) {
        suggestions.push({
          type: 'suggestion',
          rule: 'require-docstring',
          message: `Class "${match[1]}" should have a JSDoc comment`,
          fixable: false,
        });
      }
    }
  }

  private matchesCaseStyle(name: string, caseStyle: CaseStyle): boolean {
    // Allow common exceptions
    if (['_', '$', '__'].includes(name)) return true;
    if (name.startsWith('_') || name.startsWith('$')) {
      name = name.substring(1);
    }

    return CASE_STYLE_PATTERNS[caseStyle].test(name);
  }
}

export const styleGuideValidator = new StyleGuideValidator();
