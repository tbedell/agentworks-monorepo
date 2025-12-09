import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { 
  createTestUser, 
  loginTestUser, 
  createTestWorkspace, 
  createTestProject,
  makeAuthenticatedRequest 
} from '../setup/integration';

describe('Service-to-Service Communication', () => {
  let authToken: string;
  let userId: string;
  let workspaceId: string;
  let projectId: string;
  let boardId: string;

  beforeAll(async () => {
    // Create test user and setup
    const { token, userId: uid } = await createTestUser();
    authToken = token;
    userId = uid;

    // Create workspace and project
    const workspace = await createTestWorkspace(authToken);
    workspaceId = workspace.id;

    const project = await createTestProject(authToken, workspaceId);
    projectId = project.id;

    // Get the default board
    const { data: boards } = await makeAuthenticatedRequest(
      'http://localhost:9000/api/boards',
      { method: 'GET' },
      authToken
    );
    boardId = boards[0].id;
  });

  describe('Core Service to Agent Orchestrator Communication', () => {
    it('should trigger agent execution when card is created', async () => {
      // Create a card in lane 0 (Blueprint)
      const cardData = {
        title: 'Strategic Planning Card',
        description: 'Develop a comprehensive business strategy',
        type: 'Epic',
        priority: 'High',
        laneId: 'lane-0',
        boardId,
      };

      const { response: cardResponse, data: card } = await makeAuthenticatedRequest(
        'http://localhost:9000/api/cards',
        {
          method: 'POST',
          body: JSON.stringify(cardData),
        },
        authToken
      );

      expect(cardResponse.ok).toBe(true);
      expect(card.id).toBeDefined();

      // Execute CEO CoPilot agent on the card
      const { response: executeResponse, data: run } = await makeAuthenticatedRequest(
        `http://localhost:9001/execution/cards/${card.id}/execute`,
        {
          method: 'POST',
          body: JSON.stringify({
            agentId: 'ceo-copilot',
          }),
        },
        authToken
      );

      expect(executeResponse.ok).toBe(true);
      expect(run.id).toBeDefined();
      expect(run.status).toBe('pending');
      expect(run.cardId).toBe(card.id);

      // Check that the run was created in core service
      const { response: runResponse, data: coreRun } = await makeAuthenticatedRequest(
        `http://localhost:9000/api/runs/${run.id}`,
        { method: 'GET' },
        authToken
      );

      expect(runResponse.ok).toBe(true);
      expect(coreRun.id).toBe(run.id);
      expect(coreRun.cardId).toBe(card.id);
    });

    it('should update run status through orchestrator', async () => {
      // Create a card and run
      const cardData = {
        title: 'Test Card for Run Update',
        description: 'Test card description',
        type: 'Task',
        priority: 'Medium',
        laneId: 'lane-1',
        boardId,
      };

      const { data: card } = await makeAuthenticatedRequest(
        'http://localhost:9000/api/cards',
        {
          method: 'POST',
          body: JSON.stringify(cardData),
        },
        authToken
      );

      const { data: run } = await makeAuthenticatedRequest(
        `http://localhost:9001/execution/cards/${card.id}/execute`,
        {
          method: 'POST',
          body: JSON.stringify({
            agentId: 'prd-agent',
          }),
        },
        authToken
      );

      // Update run status through orchestrator
      const { response: updateResponse } = await makeAuthenticatedRequest(
        `http://localhost:9001/runs/${run.id}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status: 'running',
            startedAt: new Date().toISOString(),
          }),
        },
        authToken
      );

      expect(updateResponse.ok).toBe(true);

      // Verify status was updated in core service
      const { data: updatedRun } = await makeAuthenticatedRequest(
        `http://localhost:9000/api/runs/${run.id}`,
        { method: 'GET' },
        authToken
      );

      expect(updatedRun.status).toBe('running');
      expect(updatedRun.startedAt).toBeDefined();
    });
  });

  describe('Agent Orchestrator to Provider Router Communication', () => {
    it('should route requests to correct provider', async () => {
      // Test OpenAI provider
      const openaiRequest = {
        provider: 'openai',
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: 'Write a simple hello world function in Python.',
          },
        ],
      };

      const { response: openaiResponse, data: openaiResult } = await makeAuthenticatedRequest(
        'http://localhost:9002/api/chat/completions',
        {
          method: 'POST',
          body: JSON.stringify(openaiRequest),
        },
        authToken
      );

      expect(openaiResponse.ok).toBe(true);
      expect(openaiResult.choices).toBeDefined();
      expect(openaiResult.choices.length).toBeGreaterThan(0);
      expect(openaiResult.choices[0].message.content).toBeDefined();
      expect(openaiResult.usage).toBeDefined();

      // Test Anthropic provider
      const anthropicRequest = {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: 'Explain the concept of recursion.',
          },
        ],
      };

      const { response: anthropicResponse, data: anthropicResult } = await makeAuthenticatedRequest(
        'http://localhost:9002/api/chat/completions',
        {
          method: 'POST',
          body: JSON.stringify(anthropicRequest),
        },
        authToken
      );

      expect(anthropicResponse.ok).toBe(true);
      expect(anthropicResult.choices).toBeDefined();
      expect(anthropicResult.choices.length).toBeGreaterThan(0);
      expect(anthropicResult.choices[0].message.content).toBeDefined();
      expect(anthropicResult.usage).toBeDefined();
    });

    it('should handle provider errors gracefully', async () => {
      const invalidRequest = {
        provider: 'openai',
        model: 'invalid-model',
        messages: [
          {
            role: 'user',
            content: 'Test message',
          },
        ],
      };

      const { response: errorResponse, data: errorResult } = await makeAuthenticatedRequest(
        'http://localhost:9002/api/chat/completions',
        {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        },
        authToken
      );

      expect(errorResponse.ok).toBe(false);
      expect(errorResult.error).toBeDefined();
    });
  });

  describe('Log Streaming Service Communication', () => {
    it('should receive logs from agent execution', async () => {
      // Create a card and execute agent
      const cardData = {
        title: 'Log Streaming Test Card',
        description: 'Test card for log streaming',
        type: 'Task',
        priority: 'Medium',
        laneId: 'lane-0',
        boardId,
      };

      const { data: card } = await makeAuthenticatedRequest(
        'http://localhost:9000/api/cards',
        {
          method: 'POST',
          body: JSON.stringify(cardData),
        },
        authToken
      );

      const { data: run } = await makeAuthenticatedRequest(
        `http://localhost:9001/execution/cards/${card.id}/execute`,
        {
          method: 'POST',
          body: JSON.stringify({
            agentId: 'ceo-copilot',
          }),
        },
        authToken
      );

      // Send a log message
      const logMessage = {
        runId: run.id,
        level: 'info',
        message: 'Agent execution started',
        timestamp: new Date().toISOString(),
        metadata: {
          agentId: 'ceo-copilot',
          cardId: card.id,
        },
      };

      const { response: logResponse } = await makeAuthenticatedRequest(
        'http://localhost:9003/api/logs',
        {
          method: 'POST',
          body: JSON.stringify(logMessage),
        },
        authToken
      );

      expect(logResponse.ok).toBe(true);

      // Retrieve logs
      const { response: getLogsResponse, data: logs } = await makeAuthenticatedRequest(
        `http://localhost:9003/api/logs/${run.id}`,
        { method: 'GET' },
        authToken
      );

      expect(getLogsResponse.ok).toBe(true);
      expect(logs).toBeInstanceOf(Array);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toBe('Agent execution started');
    });

    it('should stream logs via WebSocket', (done) => {
      const ws = new WebSocket('ws://localhost:9003/ws/logs');

      ws.onopen = () => {
        // Subscribe to run logs
        ws.send(JSON.stringify({
          action: 'subscribe',
          runId: 'test-run-123',
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'log') {
          expect(message.data).toBeDefined();
          expect(message.data.runId).toBe('test-run-123');
          ws.close();
          done();
        }
      };

      ws.onerror = (error) => {
        done(error);
      };

      // Send a test log after connection
      setTimeout(() => {
        makeAuthenticatedRequest(
          'http://localhost:9003/api/logs',
          {
            method: 'POST',
            body: JSON.stringify({
              runId: 'test-run-123',
              level: 'info',
              message: 'WebSocket test message',
              timestamp: new Date().toISOString(),
            }),
          },
          authToken
        );
      }, 100);
    });
  });

  describe('Billing Service Communication', () => {
    it('should track usage events from agent execution', async () => {
      // Execute an agent to generate usage
      const cardData = {
        title: 'Billing Test Card',
        description: 'Test card for billing',
        type: 'Task',
        priority: 'High',
        laneId: 'lane-1',
        boardId,
      };

      const { data: card } = await makeAuthenticatedRequest(
        'http://localhost:9000/api/cards',
        {
          method: 'POST',
          body: JSON.stringify(cardData),
        },
        authToken
      );

      const { data: run } = await makeAuthenticatedRequest(
        `http://localhost:9001/execution/cards/${card.id}/execute`,
        {
          method: 'POST',
          body: JSON.stringify({
            agentId: 'prd-agent',
          }),
        },
        authToken
      );

      // Complete the run with usage data
      await makeAuthenticatedRequest(
        `http://localhost:9001/runs/${run.id}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status: 'completed',
            completedAt: new Date().toISOString(),
            inputTokens: 1000,
            outputTokens: 500,
            cost: 0.025,
          }),
        },
        authToken
      );

      // Check billing service recorded the usage
      const { response: usageResponse, data: usage } = await makeAuthenticatedRequest(
        `http://localhost:9004/api/usage/workspace/${workspaceId}`,
        { method: 'GET' },
        authToken
      );

      expect(usageResponse.ok).toBe(true);
      expect(usage.totalCost).toBeGreaterThan(0);
      expect(usage.totalTokens).toBeGreaterThan(0);
      expect(usage.breakdown).toBeInstanceOf(Array);

      // Find the specific run's usage
      const runUsage = usage.breakdown.find((item: any) => 
        item.runId === run.id
      );

      expect(runUsage).toBeDefined();
      expect(runUsage.inputTokens).toBe(1000);
      expect(runUsage.outputTokens).toBe(500);
      expect(runUsage.cost).toBe(0.025);
    });

    it('should aggregate usage by workspace', async () => {
      const { response: aggregateResponse, data: aggregate } = await makeAuthenticatedRequest(
        `http://localhost:9004/api/usage/workspace/${workspaceId}/aggregate`,
        {
          method: 'GET',
          body: JSON.stringify({
            startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
            endDate: new Date().toISOString(),
          }),
        },
        authToken
      );

      expect(aggregateResponse.ok).toBe(true);
      expect(aggregate.totalCost).toBeDefined();
      expect(aggregate.totalTokens).toBeDefined();
      expect(aggregate.providerBreakdown).toBeDefined();
      expect(aggregate.modelBreakdown).toBeDefined();
      expect(aggregate.dailyUsage).toBeInstanceOf(Array);
    });

    it('should generate usage reports', async () => {
      const { response: reportResponse, data: report } = await makeAuthenticatedRequest(
        `http://localhost:9004/api/reports/usage/${workspaceId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            period: 'last_30_days',
            format: 'json',
            includeDetails: true,
          }),
        },
        authToken
      );

      expect(reportResponse.ok).toBe(true);
      expect(report.summary).toBeDefined();
      expect(report.summary.totalCost).toBeDefined();
      expect(report.summary.totalTokens).toBeDefined();
      expect(report.details).toBeInstanceOf(Array);
    });
  });

  describe('Multi-Service Error Handling', () => {
    it('should handle cascade failures gracefully', async () => {
      // Simulate provider router being down
      const cardData = {
        title: 'Error Handling Test Card',
        description: 'Test error handling across services',
        type: 'Task',
        priority: 'Medium',
        laneId: 'lane-0',
        boardId,
      };

      const { data: card } = await makeAuthenticatedRequest(
        'http://localhost:9000/api/cards',
        {
          method: 'POST',
          body: JSON.stringify(cardData),
        },
        authToken
      );

      // Try to execute with invalid provider
      const { response: executeResponse, data: errorResult } = await makeAuthenticatedRequest(
        `http://localhost:9001/execution/cards/${card.id}/execute`,
        {
          method: 'POST',
          body: JSON.stringify({
            agentId: 'invalid-agent',
          }),
        },
        authToken
      );

      expect(executeResponse.ok).toBe(false);
      expect(errorResult.error).toBeDefined();
    });

    it('should maintain data consistency during partial failures', async () => {
      const cardData = {
        title: 'Consistency Test Card',
        description: 'Test data consistency',
        type: 'Task',
        priority: 'Low',
        laneId: 'lane-1',
        boardId,
      };

      const { data: card } = await makeAuthenticatedRequest(
        'http://localhost:9000/api/cards',
        {
          method: 'POST',
          body: JSON.stringify(cardData),
        },
        authToken
      );

      const { data: run } = await makeAuthenticatedRequest(
        `http://localhost:9001/execution/cards/${card.id}/execute`,
        {
          method: 'POST',
          body: JSON.stringify({
            agentId: 'prd-agent',
          }),
        },
        authToken
      );

      // Verify run exists in core service
      const { response: runResponse, data: coreRun } = await makeAuthenticatedRequest(
        `http://localhost:9000/api/runs/${run.id}`,
        { method: 'GET' },
        authToken
      );

      expect(runResponse.ok).toBe(true);
      expect(coreRun.id).toBe(run.id);
      expect(coreRun.status).toBe('pending');
    });
  });

  describe('Service Health and Dependencies', () => {
    it('should report healthy status when all dependencies are available', async () => {
      const services = [
        { name: 'Core Service', port: 9000 },
        { name: 'Agent Orchestrator', port: 9001 },
        { name: 'Provider Router', port: 9002 },
        { name: 'Log Streaming', port: 9003 },
        { name: 'Billing Service', port: 9004 },
      ];

      for (const service of services) {
        const { response, data } = await makeAuthenticatedRequest(
          `http://localhost:${service.port}/health`,
          { method: 'GET' }
        );

        expect(response.ok).toBe(true);
        expect(data.status).toBe('healthy');
        expect(data.version).toBeDefined();
        expect(data.uptime).toBeGreaterThan(0);
        expect(data.dependencies).toBeDefined();
      }
    });

    it('should handle cross-service authentication', async () => {
      // Test that services can authenticate with each other
      const { response: authResponse, data: authResult } = await makeAuthenticatedRequest(
        'http://localhost:9000/api/auth/me',
        { method: 'GET' },
        authToken
      );

      expect(authResponse.ok).toBe(true);
      expect(authResult.user.id).toBe(userId);
      expect(authResult.workspace.id).toBe(workspaceId);

      // Use same token for orchestrator service
      const { response: orchestratorResponse, data: agents } = await makeAuthenticatedRequest(
        'http://localhost:9001/agents',
        { method: 'GET' },
        authToken
      );

      expect(orchestratorResponse.ok).toBe(true);
      expect(agents).toBeInstanceOf(Array);
    });
  });
});