export const LANES = [
  { id: 0, name: 'Vision/Planning', icon: 'lightbulb' },
  { id: 1, name: 'Frontend Build', icon: 'layout' },
  { id: 2, name: 'DB Build', icon: 'database' },
  { id: 3, name: 'Workflow Build', icon: 'git-branch' },
  { id: 4, name: 'Test/Troubleshoot', icon: 'check-circle' },
  { id: 5, name: 'Deploy', icon: 'rocket' },
  { id: 6, name: 'Review', icon: 'eye' },
  { id: 7, name: 'Complete', icon: 'check' },
] as const;

export const CARD_TYPES = ['Epic', 'Feature', 'Task', 'Bug', 'Doc', 'Blueprint'] as const;

export const CARD_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export const CARD_STATUSES = ['Draft', 'Ready', 'InProgress', 'Blocked', 'Done'] as const;

export const AGENT_NAMES = [
  'ceo_copilot',
  'strategy',
  'storyboard_ux',
  'prd',
  'mvp_scope',
  'research',
  'architect',
  'planner',
  'code_standards',
  'dev_backend',
  'dev_frontend',
  'devops',
  'qa',
  'docs',
  'refactor',
  'troubleshooter',
  'claude_code_agent',
  'cms_wordpress',
  'design_ux',
] as const;

export const PROVIDERS = ['openai', 'anthropic', 'google', 'nanobanana'] as const;

// Model pricing per 1M tokens (input/output in USD)
export interface ModelPricing {
  id: string;
  name: string;
  inputPer1M: number;   // Cost per 1M input tokens
  outputPer1M: number;  // Cost per 1M output tokens
  contextWindow: number; // Max context window in tokens
}

// Available models for each provider with pricing
export const PROVIDER_MODELS: Record<string, ModelPricing[]> = {
  openai: [
    { id: 'gpt-5', name: 'GPT-5', inputPer1M: 30.00, outputPer1M: 60.00, contextWindow: 256000 },
    { id: 'gpt-4o', name: 'GPT-4o', inputPer1M: 2.50, outputPer1M: 10.00, contextWindow: 128000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', inputPer1M: 0.15, outputPer1M: 0.60, contextWindow: 128000 },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', inputPer1M: 10.00, outputPer1M: 30.00, contextWindow: 128000 },
    { id: 'gpt-4', name: 'GPT-4', inputPer1M: 30.00, outputPer1M: 60.00, contextWindow: 8192 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', inputPer1M: 0.50, outputPer1M: 1.50, contextWindow: 16385 },
    { id: 'o3', name: 'o3', inputPer1M: 10.00, outputPer1M: 40.00, contextWindow: 200000 },
    { id: 'o3-mini', name: 'o3 Mini', inputPer1M: 1.10, outputPer1M: 4.40, contextWindow: 200000 },
    { id: 'o1', name: 'o1', inputPer1M: 15.00, outputPer1M: 60.00, contextWindow: 200000 },
    { id: 'o1-mini', name: 'o1 Mini', inputPer1M: 3.00, outputPer1M: 12.00, contextWindow: 128000 },
    { id: 'o1-preview', name: 'o1 Preview', inputPer1M: 15.00, outputPer1M: 60.00, contextWindow: 128000 },
  ],
  anthropic: [
    { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', inputPer1M: 15.00, outputPer1M: 75.00, contextWindow: 200000 },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', inputPer1M: 15.00, outputPer1M: 75.00, contextWindow: 200000 },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', inputPer1M: 3.00, outputPer1M: 15.00, contextWindow: 200000 },
    { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', inputPer1M: 3.00, outputPer1M: 15.00, contextWindow: 200000 },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', inputPer1M: 3.00, outputPer1M: 15.00, contextWindow: 200000 },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', inputPer1M: 0.80, outputPer1M: 4.00, contextWindow: 200000 },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', inputPer1M: 15.00, outputPer1M: 75.00, contextWindow: 200000 },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', inputPer1M: 3.00, outputPer1M: 15.00, contextWindow: 200000 },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', inputPer1M: 0.25, outputPer1M: 1.25, contextWindow: 200000 },
  ],
  google: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', inputPer1M: 1.25, outputPer1M: 10.00, contextWindow: 1000000 },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', inputPer1M: 0.15, outputPer1M: 0.60, contextWindow: 1000000 },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', inputPer1M: 0.10, outputPer1M: 0.40, contextWindow: 1000000 },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', inputPer1M: 0.075, outputPer1M: 0.30, contextWindow: 1000000 },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', inputPer1M: 1.25, outputPer1M: 5.00, contextWindow: 2000000 },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', inputPer1M: 0.075, outputPer1M: 0.30, contextWindow: 1000000 },
    { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', inputPer1M: 0.0375, outputPer1M: 0.15, contextWindow: 1000000 },
  ],
  nanobanana: [
    { id: 'nb-video-1', name: 'NB Video 1', inputPer1M: 0, outputPer1M: 0, contextWindow: 0 },
    { id: 'nb-image-1', name: 'NB Image 1', inputPer1M: 0, outputPer1M: 0, contextWindow: 0 },
  ],
} as const;

export const PRICING_MULTIPLIER = 5;
export const PRICING_INCREMENT = 0.25;

// Maximum OUTPUT tokens per model (what agents can generate)
// Note: This is different from contextWindow (total input + output)
export const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  // OpenAI models
  'gpt-5': 32768,
  'gpt-4o': 16384,
  'gpt-4o-mini': 16384,
  'gpt-4-turbo': 4096,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 4096,
  'o3': 100000,
  'o3-mini': 65536,
  'o1': 100000,
  'o1-mini': 65536,
  'o1-preview': 32768,
  // Anthropic models
  'claude-opus-4-5-20251101': 32768,
  'claude-opus-4-20250514': 32768,
  'claude-sonnet-4-20250514': 16384,
  'claude-3-7-sonnet-20250219': 8192,
  'claude-3-5-sonnet-20241022': 8192,
  'claude-3-5-haiku-20241022': 8192,
  'claude-3-opus-20240229': 4096,
  'claude-3-sonnet-20240229': 4096,
  'claude-3-haiku-20240307': 4096,
  // Google models
  'gemini-2.5-pro': 65536,
  'gemini-2.5-flash': 65536,
  'gemini-2.0-flash': 8192,
  'gemini-2.0-flash-lite': 8192,
  'gemini-1.5-pro': 8192,
  'gemini-1.5-flash': 8192,
  'gemini-1.5-flash-8b': 8192,
};

// Default max tokens when model not found
export const DEFAULT_MAX_OUTPUT_TOKENS = 8192;

// Default temperature for all agents
export const DEFAULT_AGENT_TEMPERATURE = 1.0;

/**
 * Get the maximum output tokens for a given model
 * Falls back to DEFAULT_MAX_OUTPUT_TOKENS if model not found
 */
export function getMaxTokensForModel(model: string): number {
  return MODEL_MAX_OUTPUT_TOKENS[model] ?? DEFAULT_MAX_OUTPUT_TOKENS;
}

// Agent execution mode classification for hybrid control
// autoRun: true = agent runs automatically without human approval
// autoRun: false = agent requires human approval before execution
// riskLevel: low/medium/high = used for UI indicators
export const AGENT_EXECUTION_MODE: Record<string, { autoRun: boolean; riskLevel: 'low' | 'medium' | 'high' }> = {
  ceo_copilot:    { autoRun: true,  riskLevel: 'low' },
  strategy:       { autoRun: true,  riskLevel: 'low' },
  storyboard_ux:  { autoRun: true,  riskLevel: 'low' },
  prd:            { autoRun: true,  riskLevel: 'low' },
  mvp_scope:      { autoRun: true,  riskLevel: 'low' },
  research:       { autoRun: true,  riskLevel: 'low' },
  architect:      { autoRun: true,  riskLevel: 'medium' },
  planner:        { autoRun: true,  riskLevel: 'medium' },
  code_standards: { autoRun: true,  riskLevel: 'medium' },
  docs:           { autoRun: true,  riskLevel: 'low' },
  qa:             { autoRun: true,  riskLevel: 'medium' },
  troubleshooter: { autoRun: true,  riskLevel: 'medium' },
  // Code-writing agents require human approval
  dev_backend:    { autoRun: false, riskLevel: 'high' },
  dev_frontend:   { autoRun: false, riskLevel: 'high' },
  devops:         { autoRun: false, riskLevel: 'high' },
  refactor:       { autoRun: false, riskLevel: 'high' },
  // Claude Code Agent - full-featured coding agent with tool-calling
  claude_code_agent: { autoRun: false, riskLevel: 'high' },
  // WordPress CMS Agent - full-stack WordPress development
  cms_wordpress: { autoRun: false, riskLevel: 'high' },
  // Design UX Agent - visual workflow and UI design (low risk, generates designs not code)
  design_ux: { autoRun: true, riskLevel: 'low' },
} as const;
