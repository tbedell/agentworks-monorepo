export type CaseStyle = 'camelCase' | 'PascalCase' | 'snake_case' | 'UPPER_SNAKE' | 'kebab-case';
export type IndentStyle = 'spaces' | 'tabs';
export type TrailingCommas = 'none' | 'es5' | 'all';

export interface StyleGuideConfig {
  variableCase: CaseStyle;
  functionCase: CaseStyle;
  classCase: CaseStyle;
  constantCase: CaseStyle;
  fileCase: CaseStyle;
  componentCase: CaseStyle;

  indentStyle: IndentStyle;
  indentSize: number;
  maxLineLength: number;
  semicolons: boolean;
  singleQuotes: boolean;
  trailingCommas: TrailingCommas;

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
  customRules?: Record<string, unknown>;
}

export interface StyleGuideInput {
  variableCase?: CaseStyle;
  functionCase?: CaseStyle;
  classCase?: CaseStyle;
  constantCase?: CaseStyle;
  fileCase?: CaseStyle;
  componentCase?: CaseStyle;
  indentStyle?: IndentStyle;
  indentSize?: number;
  maxLineLength?: number;
  semicolons?: boolean;
  singleQuotes?: boolean;
  trailingCommas?: TrailingCommas;
  dateFormat?: string;
  currencyFormat?: string;
  phoneFormat?: string;
  zipCodeFormat?: string;
  numberFormat?: string;
  maxFunctionLength?: number;
  maxFileLength?: number;
  requireDocstrings?: boolean;
  testNamingPattern?: string;
  primaryLanguage?: string;
  frameworks?: string[];
  customRules?: Record<string, unknown>;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'suggestion';
  rule: string;
  message: string;
  line?: number;
  column?: number;
  fixable?: boolean;
  suggestedFix?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggestions: ValidationIssue[];
}

export interface ConfigFiles {
  eslintrc: string;
  prettierrc: string;
  editorconfig: string;
  tsconfig?: string;
}

export const CASE_STYLE_PATTERNS: Record<CaseStyle, RegExp> = {
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
  snake_case: /^[a-z][a-z0-9_]*$/,
  UPPER_SNAKE: /^[A-Z][A-Z0-9_]*$/,
  'kebab-case': /^[a-z][a-z0-9-]*$/,
};

export const DEFAULT_STYLE_GUIDE: StyleGuideConfig = {
  variableCase: 'camelCase',
  functionCase: 'camelCase',
  classCase: 'PascalCase',
  constantCase: 'UPPER_SNAKE',
  fileCase: 'kebab-case',
  componentCase: 'PascalCase',

  indentStyle: 'spaces',
  indentSize: 2,
  maxLineLength: 100,
  semicolons: true,
  singleQuotes: true,
  trailingCommas: 'es5',

  dateFormat: 'ISO8601',
  currencyFormat: 'USD',
  phoneFormat: 'E164',
  zipCodeFormat: 'US',
  numberFormat: '1,234.56',

  maxFunctionLength: 50,
  maxFileLength: 500,
  requireDocstrings: true,
  testNamingPattern: '*.test.ts',

  primaryLanguage: 'typescript',
  frameworks: [],
};

export const DATA_FORMAT_PATTERNS = {
  ISO8601: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/,
  'MM/DD/YYYY': /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/,
  'DD/MM/YYYY': /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
  E164: /^\+[1-9]\d{1,14}$/,
  'US-PHONE': /^\(?[2-9]\d{2}\)?[-. ]?\d{3}[-. ]?\d{4}$/,
  'US-ZIP': /^\d{5}(-\d{4})?$/,
  'UK-POSTCODE': /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
};
