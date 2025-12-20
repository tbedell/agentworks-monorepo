import { createLogger } from '@agentworks/shared';

const logger = createLogger('command-parser');

/**
 * Command types that can be detected from terminal input
 */
export type CommandType =
  | 'build'       // Creating new features/components
  | 'fix'         // Fixing bugs
  | 'test'        // Running or creating tests
  | 'refactor'    // Improving existing code
  | 'plan'        // Planning work
  | 'document'    // Creating documentation
  | 'deploy'      // Deployment tasks
  | 'research'    // Research/investigation
  | 'agent_invoke' // Explicit agent invocation with @agent syntax
  | 'other';      // Unclassified commands

/**
 * Parsed command from terminal input
 */
export interface ParsedCommand {
  type: CommandType;
  description: string;
  raw: string;
  confidence: number; // 0-1 indicating how confident we are in the classification
  suggestedAgent?: string; // Suggested agent to handle this command
  suggestedLane?: number; // Suggested Kanban lane for the card
}

/**
 * Patterns for detecting build-type commands
 */
const BUILD_PATTERNS = [
  { pattern: /build\s+(?:me\s+)?(?:a\s+)?(.+)/i, confidence: 0.9 },
  { pattern: /create\s+(?:a\s+)?(?:new\s+)?(.+)/i, confidence: 0.9 },
  { pattern: /implement\s+(.+)/i, confidence: 0.85 },
  { pattern: /add\s+(?:a\s+)?(?:new\s+)?(.+)/i, confidence: 0.8 },
  { pattern: /make\s+(?:me\s+)?(?:a\s+)?(.+)/i, confidence: 0.75 },
  { pattern: /write\s+(?:a\s+)?(.+)/i, confidence: 0.7 },
  { pattern: /generate\s+(.+)/i, confidence: 0.7 },
  { pattern: /scaffold\s+(.+)/i, confidence: 0.85 },
  { pattern: /set\s+up\s+(.+)/i, confidence: 0.8 },
];

/**
 * Patterns for detecting fix-type commands
 */
const FIX_PATTERNS = [
  { pattern: /fix\s+(?:the\s+)?(.+)/i, confidence: 0.9 },
  { pattern: /debug\s+(.+)/i, confidence: 0.85 },
  { pattern: /resolve\s+(?:the\s+)?(.+)/i, confidence: 0.8 },
  { pattern: /repair\s+(.+)/i, confidence: 0.8 },
  { pattern: /(?:there'?s?\s+)?(?:a\s+)?bug\s+(?:in\s+)?(.+)/i, confidence: 0.75 },
  { pattern: /(.+)\s+(?:is|are)\s+(?:broken|not working)/i, confidence: 0.7 },
];

/**
 * Patterns for detecting test-type commands
 */
const TEST_PATTERNS = [
  { pattern: /test\s+(.+)/i, confidence: 0.85 },
  { pattern: /write\s+tests?\s+(?:for\s+)?(.+)/i, confidence: 0.9 },
  { pattern: /add\s+tests?\s+(?:for\s+)?(.+)/i, confidence: 0.9 },
  { pattern: /run\s+(?:the\s+)?tests?/i, confidence: 0.8 },
  { pattern: /verify\s+(.+)/i, confidence: 0.6 },
];

/**
 * Patterns for detecting refactor-type commands
 */
const REFACTOR_PATTERNS = [
  { pattern: /refactor\s+(.+)/i, confidence: 0.9 },
  { pattern: /clean\s+up\s+(.+)/i, confidence: 0.8 },
  { pattern: /improve\s+(.+)/i, confidence: 0.7 },
  { pattern: /optimize\s+(.+)/i, confidence: 0.8 },
  { pattern: /reorganize\s+(.+)/i, confidence: 0.75 },
  { pattern: /simplify\s+(.+)/i, confidence: 0.7 },
];

/**
 * Patterns for detecting plan-type commands
 */
const PLAN_PATTERNS = [
  { pattern: /plan\s+(.+)/i, confidence: 0.9 },
  { pattern: /design\s+(.+)/i, confidence: 0.8 },
  { pattern: /architect\s+(.+)/i, confidence: 0.85 },
  { pattern: /outline\s+(.+)/i, confidence: 0.7 },
  { pattern: /how\s+(?:should|would|can)\s+(?:i|we)\s+(.+)/i, confidence: 0.6 },
];

/**
 * Patterns for detecting document-type commands
 */
const DOCUMENT_PATTERNS = [
  { pattern: /document\s+(.+)/i, confidence: 0.9 },
  { pattern: /write\s+(?:the\s+)?(?:documentation|docs)\s+(?:for\s+)?(.+)/i, confidence: 0.9 },
  { pattern: /add\s+(?:documentation|docs)\s+(?:for\s+)?(.+)/i, confidence: 0.85 },
  { pattern: /update\s+(?:the\s+)?readme/i, confidence: 0.8 },
];

/**
 * Patterns for detecting deploy-type commands
 */
const DEPLOY_PATTERNS = [
  { pattern: /deploy\s+(.+)/i, confidence: 0.9 },
  { pattern: /release\s+(.+)/i, confidence: 0.85 },
  { pattern: /ship\s+(.+)/i, confidence: 0.7 },
  { pattern: /push\s+to\s+(?:prod|production)/i, confidence: 0.85 },
];

/**
 * Patterns for detecting research-type commands
 */
const RESEARCH_PATTERNS = [
  { pattern: /research\s+(.+)/i, confidence: 0.9 },
  { pattern: /investigate\s+(.+)/i, confidence: 0.85 },
  { pattern: /look\s+(?:into|at)\s+(.+)/i, confidence: 0.7 },
  { pattern: /find\s+(?:out|about)\s+(.+)/i, confidence: 0.7 },
  { pattern: /what\s+(?:is|are)\s+(.+)/i, confidence: 0.5 },
  { pattern: /explain\s+(.+)/i, confidence: 0.6 },
];

/**
 * Pattern for explicit agent invocation: @agent_name prompt
 */
const AGENT_INVOCATION_PATTERN = /^@(\w+)\s+(.+)$/i;

/**
 * Map short agent names to full agent registry names
 */
const AGENT_NAME_MAP: Record<string, string> = {
  'ceo': 'ceo_copilot',
  'copilot': 'ceo_copilot',
  'strategy': 'strategy',
  'storyboard': 'storyboard_ux',
  'ux': 'storyboard_ux',
  'prd': 'prd',
  'mvp': 'mvp_scope',
  'research': 'research',
  'architect': 'architect',
  'planner': 'planner',
  'standards': 'code_standards',
  'backend': 'dev_backend',
  'frontend': 'dev_frontend',
  'devops': 'devops',
  'qa': 'qa',
  'troubleshooter': 'troubleshooter',
  'debug': 'troubleshooter',
  'docs': 'docs',
  'documentation': 'docs',
  'refactor': 'refactor',
  'claude': 'claude_code_agent',
  'code': 'claude_code_agent',
};

/**
 * Map agent names to their default lanes
 */
const AGENT_LANE_MAP: Record<string, number> = {
  'ceo_copilot': 0,
  'strategy': 0,
  'storyboard_ux': 0,
  'prd': 1,
  'mvp_scope': 1,
  'research': 2,
  'architect': 3,
  'planner': 4,
  'code_standards': 4,
  'dev_backend': 5,
  'dev_frontend': 6,
  'devops': 5,
  'qa': 7,
  'troubleshooter': 7,
  'docs': 9,
  'refactor': 10,
  'claude_code_agent': 5,
};

/**
 * Map command types to suggested agents and lanes
 */
const COMMAND_TYPE_METADATA: Record<CommandType, { agent: string; lane: number }> = {
  build: { agent: 'dev_frontend', lane: 5 },  // Lane 5: Scaffolding
  fix: { agent: 'troubleshooter', lane: 7 },  // Lane 7: Test & QA
  test: { agent: 'qa', lane: 7 },             // Lane 7: Test & QA
  refactor: { agent: 'refactor', lane: 10 },  // Lane 10: Learn & Optimize
  plan: { agent: 'planner', lane: 4 },        // Lane 4: Planning & Task Breakdown
  document: { agent: 'docs', lane: 9 },       // Lane 9: Docs & Training
  deploy: { agent: 'devops', lane: 8 },       // Lane 8: Deploy
  research: { agent: 'research', lane: 2 },   // Lane 2: Research
  agent_invoke: { agent: 'claude_code_agent', lane: 5 }, // Explicit agent - will be overridden
  other: { agent: 'ceo_copilot', lane: 0 },   // Lane 0: Vision & CoPilot
};

/**
 * Try to match input against a list of patterns
 */
function tryMatch(
  input: string,
  patterns: Array<{ pattern: RegExp; confidence: number }>
): { match: RegExpMatchArray; confidence: number } | null {
  for (const { pattern, confidence } of patterns) {
    const match = input.match(pattern);
    if (match) {
      return { match, confidence };
    }
  }
  return null;
}

/**
 * Parse terminal input to detect command intent
 *
 * @param input - The raw terminal input from the user
 * @returns ParsedCommand if a command is detected, null otherwise
 */
export function parseClaudeCommand(input: string): ParsedCommand | null {
  // Clean input - remove leading/trailing whitespace
  const cleanInput = input.trim();

  // Skip very short inputs or shell commands
  if (cleanInput.length < 3) {
    return null;
  }

  // Skip obvious shell commands (not Claude prompts)
  if (/^(ls|cd|pwd|cat|grep|git|npm|pnpm|yarn|node|python|bash|sh|mv|cp|rm|mkdir)\s/i.test(cleanInput)) {
    return null;
  }

  // Check for explicit @agent invocation first (highest priority)
  const agentMatch = cleanInput.match(AGENT_INVOCATION_PATTERN);
  if (agentMatch) {
    const shortName = agentMatch[1].toLowerCase();
    const prompt = agentMatch[2];
    const fullAgentName = AGENT_NAME_MAP[shortName];

    if (fullAgentName) {
      const lane = AGENT_LANE_MAP[fullAgentName] ?? 5;
      logger.info('Parsed @agent command', { shortName, fullAgentName, lane });
      return {
        type: 'agent_invoke',
        description: prompt.trim(),
        raw: cleanInput,
        confidence: 1.0, // Explicit invocation = 100% confidence
        suggestedAgent: fullAgentName,
        suggestedLane: lane,
      };
    } else {
      // Unknown agent name - log warning but continue to try other patterns
      logger.warn('Unknown agent name in @agent command', { shortName, validAgents: Object.keys(AGENT_NAME_MAP) });
    }
  }

  // Skip remaining pattern matching for very short inputs
  if (cleanInput.length < 10) {
    return null;
  }

  // Try each pattern type in order of specificity
  const patternSets: Array<{ type: CommandType; patterns: typeof BUILD_PATTERNS }> = [
    { type: 'build', patterns: BUILD_PATTERNS },
    { type: 'fix', patterns: FIX_PATTERNS },
    { type: 'test', patterns: TEST_PATTERNS },
    { type: 'refactor', patterns: REFACTOR_PATTERNS },
    { type: 'plan', patterns: PLAN_PATTERNS },
    { type: 'document', patterns: DOCUMENT_PATTERNS },
    { type: 'deploy', patterns: DEPLOY_PATTERNS },
    { type: 'research', patterns: RESEARCH_PATTERNS },
  ];

  let bestMatch: ParsedCommand | null = null;
  let bestConfidence = 0;

  for (const { type, patterns } of patternSets) {
    const result = tryMatch(cleanInput, patterns);
    if (result && result.confidence > bestConfidence) {
      const description = result.match[1] || cleanInput;
      const metadata = COMMAND_TYPE_METADATA[type];

      bestMatch = {
        type,
        description: description.trim(),
        raw: cleanInput,
        confidence: result.confidence,
        suggestedAgent: metadata.agent,
        suggestedLane: metadata.lane,
      };
      bestConfidence = result.confidence;
    }
  }

  if (bestMatch) {
    logger.debug('Parsed command', { type: bestMatch.type, description: bestMatch.description, confidence: bestMatch.confidence });
  }

  return bestMatch;
}

/**
 * Detect if the input is the start of a Claude CLI session
 * (e.g., user typed "claude" and is now in the Claude prompt)
 */
export function isClaudeCliStart(input: string): boolean {
  const cleanInput = input.trim().toLowerCase();
  return cleanInput === 'claude' || cleanInput.startsWith('claude ');
}

/**
 * Extract the prompt from a Claude CLI invocation
 * e.g., "claude build me a tic-tac-toe game" -> "build me a tic-tac-toe game"
 */
export function extractClaudePrompt(input: string): string | null {
  const cleanInput = input.trim();
  const match = cleanInput.match(/^claude\s+(.+)$/i);
  return match ? match[1] : null;
}
