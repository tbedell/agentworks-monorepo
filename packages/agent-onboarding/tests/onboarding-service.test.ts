/**
 * Tests for the onboarding service.
 */

import {
  onboardAgent,
  validateConfig,
  addSOPToAgent,
  getAgentOnboardingStatus,
  getAgentFiles,
  listOnboardedAgents,
  removeAgent,
  clearAllAgents,
} from '../src/onboarding-service.js';
import { createTestConfig } from './helpers.js';

describe('OnboardingService', () => {
  // Clean up between tests
  beforeEach(() => {
    clearAllAgents();
  });

  describe('onboardAgent', () => {
    it('should successfully onboard a valid agent', async () => {
      const config = createTestConfig();
      const result = await onboardAgent(config);

      expect(result.success).toBe(true);
      expect(result.status).toBe('complete');
      expect(result.agentName).toBe('test_agent');
      expect(result.assignedTools.length).toBeGreaterThan(0);
      expect(result.generatedFiles).toContain('IDENTITY.md');
      expect(result.generatedFiles).toContain('SOUL.md');
      expect(result.generatedFiles).toContain('TOOLS.md');
      expect(result.generatedFiles).toContain('AGENTS.md');
      expect(result.errors).toBeUndefined();
    });

    it('should include skill files in generated files', async () => {
      const config = createTestConfig();
      const result = await onboardAgent(config);

      expect(result.generatedFiles).toContain('SKILL_TEST_EXECUTION.md');
    });

    it('should include SOP files in generated files', async () => {
      const config = createTestConfig();
      const result = await onboardAgent(config);

      expect(result.generatedFiles).toContain('SOP_RUN_TEST_SUITE.md');
    });

    it('should assign tools from all specified categories', async () => {
      const config = createTestConfig({
        toolCategories: ['file', 'code', 'search'],
      });
      const result = await onboardAgent(config);

      expect(result.assignedTools).toContain('read_file');
      expect(result.assignedTools).toContain('write_file');
      expect(result.assignedTools).toContain('run_tests');
      expect(result.assignedTools).toContain('grep');
    });

    it('should include custom tools in assigned tools', async () => {
      const config = createTestConfig({
        customTools: [
          {
            name: 'my_custom_tool',
            description: 'Custom tool',
            category: 'custom',
            parameters: [],
          },
        ],
      });
      const result = await onboardAgent(config);

      expect(result.assignedTools).toContain('my_custom_tool');
    });

    it('should include MCP server tools in assigned tools', async () => {
      const config = createTestConfig({
        mcpServers: [
          {
            name: 'test-server',
            url: 'http://localhost:3001',
            transport: 'sse',
            tools: ['mcp_tool_1', 'mcp_tool_2'],
          },
        ],
      });
      const result = await onboardAgent(config);

      expect(result.assignedTools).toContain('mcp_tool_1');
      expect(result.assignedTools).toContain('mcp_tool_2');
    });

    it('should fail for invalid config', async () => {
      const config = createTestConfig({ name: '' });
      const result = await onboardAgent(config);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should reject duplicate agent names', async () => {
      const config = createTestConfig();
      await onboardAgent(config);

      const result = await onboardAgent(config);
      expect(result.success).toBe(false);
      expect(result.errors![0]).toContain('already onboarded');
    });

    it('should preserve chain of command in result', async () => {
      const config = createTestConfig({
        chainOfCommand: [
          { agentName: 'coordinator', relationship: 'reports_to' },
          { agentName: 'junior_dev', relationship: 'supervises' },
        ],
      });
      const result = await onboardAgent(config);

      expect(result.chainOfCommand).toHaveLength(2);
      expect(result.chainOfCommand[0].agentName).toBe('coordinator');
    });
  });

  describe('validateConfig', () => {
    it('should return valid for correct config', () => {
      const config = createTestConfig();
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid config', () => {
      const config = createTestConfig({ name: 'INVALID-NAME' });
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('addSOPToAgent', () => {
    it('should add SOP to existing agent', async () => {
      const config = createTestConfig();
      await onboardAgent(config);

      const newSOP = {
        name: 'new_procedure',
        description: 'A new SOP',
        steps: [
          {
            order: 1,
            action: 'do_thing',
            description: 'Do the thing',
            acceptanceCriteria: 'Thing done',
          },
        ],
        expectedDuration: '5m',
        requiredTools: ['read_file'],
      };

      const result = await addSOPToAgent('test_agent', newSOP);

      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.generatedFiles).toContain('SOP_NEW_PROCEDURE.md');
    });

    it('should return null for non-existent agent', async () => {
      const result = await addSOPToAgent('nonexistent_agent', {
        name: 'test',
        description: 'Test',
        steps: [{ order: 1, action: 'test', description: 'Test', acceptanceCriteria: 'Pass' }],
        expectedDuration: '5m',
        requiredTools: [],
      });

      expect(result).toBeNull();
    });
  });

  describe('getAgentOnboardingStatus', () => {
    it('should return status for onboarded agent', async () => {
      const config = createTestConfig();
      await onboardAgent(config);

      const status = getAgentOnboardingStatus('test_agent');

      expect(status).not.toBeNull();
      expect(status!.agentName).toBe('test_agent');
      expect(status!.status).toBe('complete');
      expect(status!.assignedTools.length).toBeGreaterThan(0);
      expect(status!.generatedFiles.length).toBeGreaterThan(0);
    });

    it('should return null for non-existent agent', () => {
      const status = getAgentOnboardingStatus('nonexistent');
      expect(status).toBeNull();
    });
  });

  describe('getAgentFiles', () => {
    it('should return generated files for onboarded agent', async () => {
      const config = createTestConfig();
      await onboardAgent(config);

      const files = getAgentFiles('test_agent');

      expect(files).not.toBeNull();
      expect(files!.identityMd).toContain('Test Agent');
      expect(files!.soulMd).toContain('SOUL');
      expect(files!.toolsMd).toContain('Tools');
      expect(files!.agentsMd).toContain('Organization');
    });

    it('should return null for non-existent agent', () => {
      const files = getAgentFiles('nonexistent');
      expect(files).toBeNull();
    });
  });

  describe('listOnboardedAgents', () => {
    it('should return empty list when no agents onboarded', () => {
      const agents = listOnboardedAgents();
      expect(agents).toHaveLength(0);
    });

    it('should list all onboarded agents', async () => {
      await onboardAgent(createTestConfig({ name: 'agent_one', displayName: 'Agent One' }));
      await onboardAgent(createTestConfig({ name: 'agent_two', displayName: 'Agent Two' }));

      const agents = listOnboardedAgents();

      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.name)).toContain('agent_one');
      expect(agents.map(a => a.name)).toContain('agent_two');
    });
  });

  describe('removeAgent', () => {
    it('should remove an onboarded agent', async () => {
      await onboardAgent(createTestConfig());

      const removed = removeAgent('test_agent');
      expect(removed).toBe(true);

      const status = getAgentOnboardingStatus('test_agent');
      expect(status).toBeNull();
    });

    it('should return false for non-existent agent', () => {
      const removed = removeAgent('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('clearAllAgents', () => {
    it('should remove all onboarded agents', async () => {
      await onboardAgent(createTestConfig({ name: 'agent_a', displayName: 'A' }));
      await onboardAgent(createTestConfig({ name: 'agent_b', displayName: 'B' }));

      clearAllAgents();

      const agents = listOnboardedAgents();
      expect(agents).toHaveLength(0);
    });
  });
});
