/**
 * Tests for the onboarding config validator.
 */

import { validateOnboardingConfig } from '../src/validator.js';
import { createTestConfig } from './helpers.js';

describe('validateOnboardingConfig', () => {
  describe('valid configurations', () => {
    it('should accept a valid minimal config', () => {
      const config = createTestConfig();
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a config with all optional fields', () => {
      const config = createTestConfig({
        customTools: [
          {
            name: 'custom_lint',
            description: 'Custom linting tool',
            category: 'code',
            parameters: [
              { name: 'path', type: 'string', description: 'File path', required: true },
            ],
            endpoint: 'http://localhost:9999/lint',
          },
        ],
        mcpServers: [
          {
            name: 'code-server',
            url: 'http://localhost:3001',
            transport: 'sse',
            authType: 'bearer',
            tools: ['mcp_read', 'mcp_write'],
          },
        ],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should accept temperature of 0', () => {
      const config = createTestConfig({ temperature: 0 });
      const result = validateOnboardingConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should accept maxTokens of 0 (model default)', () => {
      const config = createTestConfig({ maxTokens: 0 });
      const result = validateOnboardingConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('identity validation', () => {
    it('should reject empty name', () => {
      const config = createTestConfig({ name: '' });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should reject non-snake_case name', () => {
      const config = createTestConfig({ name: 'TestAgent' });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.code === 'INVALID_FORMAT')).toBe(true);
    });

    it('should reject name with hyphens', () => {
      const config = createTestConfig({ name: 'test-agent' });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should reject name starting with number', () => {
      const config = createTestConfig({ name: '1test_agent' });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should accept valid snake_case names', () => {
      const validNames = ['agent', 'test_agent', 'lead_backend_dev', 'qa3'];
      for (const name of validNames) {
        const config = createTestConfig({ name });
        const result = validateOnboardingConfig(config);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject empty displayName', () => {
      const config = createTestConfig({ displayName: '' });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'displayName')).toBe(true);
    });

    it('should reject empty emoji', () => {
      const config = createTestConfig({ emoji: '' });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'emoji')).toBe(true);
    });

    it('should reject empty description', () => {
      const config = createTestConfig({ description: '' });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });
  });

  describe('role validation', () => {
    it('should reject invalid role category', () => {
      const config = createTestConfig({
        role: { title: 'Test', category: 'invalid' as any, seniority: 'mid' },
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'role.category')).toBe(true);
    });

    it('should reject invalid seniority', () => {
      const config = createTestConfig({
        role: { title: 'Test', category: 'engineering', seniority: 'cto' as any },
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'role.seniority')).toBe(true);
    });

    it('should reject missing role title', () => {
      const config = createTestConfig({
        role: { title: '', category: 'engineering', seniority: 'mid' },
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });
  });

  describe('skills validation', () => {
    it('should warn on empty skills array', () => {
      const config = createTestConfig({ skills: [] });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('no skills'))).toBe(true);
    });

    it('should reject duplicate skill names', () => {
      const config = createTestConfig({
        skills: [
          { name: 'test', description: 'Test skill', requiredTools: [] },
          { name: 'test', description: 'Duplicate', requiredTools: [] },
        ],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_NAME')).toBe(true);
    });

    it('should reject skill without name', () => {
      const config = createTestConfig({
        skills: [{ name: '', description: 'No name', requiredTools: [] }],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });
  });

  describe('tool validation', () => {
    it('should reject invalid tool category', () => {
      const config = createTestConfig({
        toolCategories: ['file', 'invalid_category' as any],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'TOOL_INCOMPATIBLE')).toBe(true);
    });

    it('should warn when skill tools not in assigned categories', () => {
      const config = createTestConfig({
        toolCategories: ['file'], // No 'code' category
        skills: [
          {
            name: 'test_skill',
            description: 'Requires code tools',
            requiredTools: ['run_tests'], // run_tests is in 'code' category
          },
        ],
      });
      const result = validateOnboardingConfig(config);

      expect(result.warnings.some(w => w.includes('run_tests'))).toBe(true);
    });

    it('should reject duplicate custom tool names', () => {
      const config = createTestConfig({
        customTools: [
          { name: 'my_tool', description: 'First', category: 'custom', parameters: [] },
          { name: 'my_tool', description: 'Duplicate', category: 'custom', parameters: [] },
        ],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_NAME')).toBe(true);
    });
  });

  describe('LLM config validation', () => {
    it('should reject invalid provider', () => {
      const config = createTestConfig({ provider: 'invalid' as any });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'provider')).toBe(true);
    });

    it('should reject model not available for provider', () => {
      const config = createTestConfig({
        provider: 'openai',
        model: 'claude-sonnet-4-20250514', // Anthropic model, not OpenAI
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MODEL_INVALID')).toBe(true);
    });

    it('should accept valid provider/model combinations', () => {
      const combos = [
        { provider: 'openai' as const, model: 'gpt-4o' },
        { provider: 'anthropic' as const, model: 'claude-sonnet-4-20250514' },
        { provider: 'google' as const, model: 'gemini-2.5-pro' },
      ];

      for (const combo of combos) {
        const config = createTestConfig(combo);
        const result = validateOnboardingConfig(config);
        expect(result.errors.filter(e => e.field === 'model')).toHaveLength(0);
      }
    });

    it('should reject temperature above 2.0', () => {
      const config = createTestConfig({ temperature: 2.5 });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'temperature')).toBe(true);
    });

    it('should reject negative temperature', () => {
      const config = createTestConfig({ temperature: -0.5 });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should reject negative maxTokens', () => {
      const config = createTestConfig({ maxTokens: -1 });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });
  });

  describe('guardrails validation', () => {
    it('should reject budget exceeding maximum', () => {
      const config = createTestConfig({
        guardrails: {
          ...createTestConfig().guardrails,
          maxBudgetPerRun: 150.00, // Exceeds $100 limit
        },
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'BUDGET_EXCEEDED')).toBe(true);
    });

    it('should reject negative budget', () => {
      const config = createTestConfig({
        guardrails: {
          ...createTestConfig().guardrails,
          maxBudgetPerRun: -5,
        },
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should warn when code + git execution without approval', () => {
      const config = createTestConfig({
        guardrails: {
          canExecuteCode: true,
          canModifyFiles: true,
          canAccessNetwork: true,
          canManageGit: true,
          requiresApproval: false,
          maxBudgetPerRun: 25.00,
          soulMd: 'Test constraints',
        },
      });
      const result = validateOnboardingConfig(config);

      expect(result.warnings.some(w => w.includes('requiresApproval'))).toBe(true);
    });
  });

  describe('chain of command validation', () => {
    it('should reject self-referencing chain of command', () => {
      const config = createTestConfig({
        chainOfCommand: [
          { agentName: 'test_agent', relationship: 'reports_to' }, // self-reference
        ],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CHAIN_CYCLE')).toBe(true);
    });

    it('should detect supervises + reports_to cycle', () => {
      const config = createTestConfig({
        chainOfCommand: [
          { agentName: 'other_agent', relationship: 'supervises' },
          { agentName: 'other_agent', relationship: 'reports_to' },
        ],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CHAIN_CYCLE')).toBe(true);
    });

    it('should allow valid chain of command', () => {
      const config = createTestConfig({
        chainOfCommand: [
          { agentName: 'supervisor', relationship: 'reports_to' },
          { agentName: 'peer_agent', relationship: 'peers_with' },
          { agentName: 'junior_agent', relationship: 'supervises' },
        ],
      });
      const result = validateOnboardingConfig(config);

      expect(result.errors.filter(e => e.code === 'CHAIN_CYCLE')).toHaveLength(0);
    });
  });

  describe('lanes validation', () => {
    it('should reject empty lanes array', () => {
      const config = createTestConfig({ allowedLanes: [] });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should reject invalid lane numbers', () => {
      const config = createTestConfig({ allowedLanes: [0, 99] });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'LANE_INVALID')).toBe(true);
    });

    it('should accept valid lane numbers', () => {
      const config = createTestConfig({ allowedLanes: [0, 1, 2, 3, 4, 5, 6, 7] });
      const result = validateOnboardingConfig(config);

      expect(result.errors.filter(e => e.code === 'LANE_INVALID')).toHaveLength(0);
    });
  });

  describe('execution mode validation', () => {
    it('should warn when high risk + auto run', () => {
      const config = createTestConfig({
        executionMode: { autoRun: true, riskLevel: 'high' },
      });
      const result = validateOnboardingConfig(config);

      expect(result.warnings.some(w => w.includes('High-risk') && w.includes('auto-run'))).toBe(true);
    });

    it('should reject invalid risk level', () => {
      const config = createTestConfig({
        executionMode: { autoRun: true, riskLevel: 'extreme' as any },
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });
  });

  describe('communication channels validation', () => {
    it('should reject channel with no permissions', () => {
      const config = createTestConfig({
        communicationChannels: [{ type: 'slack', permissions: [] }],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should reject invalid channel type', () => {
      const config = createTestConfig({
        communicationChannels: [{ type: 'irc' as any, permissions: ['read'] }],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });

    it('should reject invalid permission', () => {
      const config = createTestConfig({
        communicationChannels: [{ type: 'slack', permissions: ['admin' as any] }],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });
  });

  describe('SOP validation', () => {
    it('should accept config without SOPs (optional)', () => {
      const config = createTestConfig({ sopTemplates: undefined });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should reject duplicate SOP names', () => {
      const config = createTestConfig({
        sopTemplates: [
          {
            name: 'test_sop',
            description: 'First',
            steps: [{ order: 1, action: 'do', description: 'Do it', acceptanceCriteria: 'Done' }],
            expectedDuration: '5m',
            requiredTools: [],
          },
          {
            name: 'test_sop',
            description: 'Duplicate',
            steps: [{ order: 1, action: 'do', description: 'Do it', acceptanceCriteria: 'Done' }],
            expectedDuration: '5m',
            requiredTools: [],
          },
        ],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_NAME')).toBe(true);
    });

    it('should reject SOP with no steps', () => {
      const config = createTestConfig({
        sopTemplates: [
          {
            name: 'empty_sop',
            description: 'No steps',
            steps: [],
            expectedDuration: '5m',
            requiredTools: [],
          },
        ],
      });
      const result = validateOnboardingConfig(config);

      expect(result.valid).toBe(false);
    });
  });
});
