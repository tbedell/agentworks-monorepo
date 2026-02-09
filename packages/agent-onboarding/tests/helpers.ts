/**
 * Test helpers for agent onboarding tests.
 */

import type { AgentOnboardingConfig } from '../src/types.js';

/**
 * Create a minimal valid onboarding config for testing.
 * Override any field by passing partial config.
 */
export function createTestConfig(
  overrides: Partial<AgentOnboardingConfig> = {}
): AgentOnboardingConfig {
  return {
    name: 'test_agent',
    displayName: 'Test Agent',
    emoji: '🧪',
    description: 'A test agent for unit testing',
    role: {
      title: 'Test Specialist',
      category: 'engineering',
      seniority: 'mid',
    },
    responsibilities: ['Run tests', 'Verify results'],
    specializations: ['Testing', 'Validation'],
    skills: [
      {
        name: 'test_execution',
        description: 'Execute test suites and report results',
        requiredTools: ['run_tests'],
      },
    ],
    toolCategories: ['file', 'code', 'search'],
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 1.0,
    maxTokens: 0,
    systemPrompt: 'You are a test agent. You run tests and report results.',
    guardrails: {
      canExecuteCode: true,
      canModifyFiles: false,
      canAccessNetwork: false,
      canManageGit: false,
      requiresApproval: false,
      maxBudgetPerRun: 5.00,
      soulMd: '## Constraints\n- Only run tests\n- Never modify production code',
    },
    chainOfCommand: [
      { agentName: 'coordinator', relationship: 'reports_to' },
    ],
    allowedLanes: [4],
    executionMode: { autoRun: true, riskLevel: 'low' },
    communicationChannels: [
      { type: 'slack', permissions: ['read', 'write'] },
    ],
    sopTemplates: [
      {
        name: 'run_test_suite',
        description: 'Execute the full test suite',
        steps: [
          {
            order: 1,
            action: 'run_tests',
            description: 'Run all tests',
            toolRequired: 'run_tests',
            acceptanceCriteria: 'All tests pass',
          },
          {
            order: 2,
            action: 'report',
            description: 'Report test results',
            acceptanceCriteria: 'Results posted to channel',
          },
        ],
        expectedDuration: '10m',
        requiredTools: ['run_tests'],
      },
    ],
    ...overrides,
  };
}
