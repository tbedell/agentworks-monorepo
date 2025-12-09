import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgentExecutor } from '../../../src/lib/executor.js';
import * as redis from '../../../src/lib/redis.js';
import * as coreServiceClient from '../../../src/lib/core-service-client.js';
import * as providerRouterClient from '../../../src/lib/provider-router-client.js';
import * as logStreamingClient from '../../../src/lib/log-streaming-client.js';

// Mock dependencies
jest.mock('../../../src/lib/redis.js');
jest.mock('../../../src/lib/core-service-client.js');
jest.mock('../../../src/lib/provider-router-client.js');
jest.mock('../../../src/lib/log-streaming-client.js');
jest.mock('@agentworks/shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockRedis = redis as jest.Mocked<typeof redis>;
const mockCoreService = coreServiceClient as jest.Mocked<typeof coreServiceClient>;
const mockProviderRouter = providerRouterClient as jest.Mocked<typeof providerRouterClient>;
const mockLogStreaming = logStreamingClient as jest.Mocked<typeof logStreamingClient>;

describe('AgentExecutor', () => {
  let executor: AgentExecutor;
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Redis client
    mockRedisClient = {
      publish: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };
    
    mockRedis.getRedisClient.mockReturnValue(mockRedisClient);
    
    executor = new AgentExecutor();
  });

  describe('executeAgent', () => {
    const mockRun = {
      id: 'run-123',
      cardId: 'card-456',
      agentId: 'agent-789',
      status: 'pending' as const,
      provider: 'openai',
      model: 'gpt-4',
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      price: 0,
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
    };

    const mockAgent = {
      id: 'agent-789',
      name: 'test-agent',
      displayName: 'Test Agent',
      description: 'A test agent',
      allowedLanes: [0, 1],
      defaultProvider: 'openai',
      defaultModel: 'gpt-4',
      systemPrompt: 'You are a test agent.',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCard = {
      id: 'card-456',
      title: 'Test Card',
      description: 'A test card for agent execution',
      type: 'Task',
      priority: 'Medium',
      status: 'Draft',
      laneId: 'lane-0',
      boardId: 'board-123',
      assigneeId: null,
      position: 0,
      parentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should execute agent successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a test response from the agent.',
              role: 'assistant' as const,
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };

      const expectedResult = {
        content: 'This is a test response from the agent.',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.003, // Mock cost calculation
      };

      // Mock service calls
      mockCoreService.getAgent.mockResolvedValue(mockAgent);
      mockCoreService.getCard.mockResolvedValue(mockCard);
      mockCoreService.updateAgentRun.mockResolvedValue({
        ...mockRun,
        status: 'running' as const,
        startedAt: new Date(),
      });
      mockProviderRouter.chatCompletion.mockResolvedValue(mockResponse);
      mockCoreService.updateAgentRun.mockResolvedValue({
        ...mockRun,
        status: 'completed' as const,
        completedAt: new Date(),
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.003,
      });

      // Mock log streaming
      mockLogStreaming.sendLog.mockResolvedValue(undefined);

      const result = await executor.executeAgent(mockRun);

      expect(result).toEqual(expectedResult);

      // Verify service calls
      expect(mockCoreService.getAgent).toHaveBeenCalledWith(mockRun.agentId);
      expect(mockCoreService.getCard).toHaveBeenCalledWith(mockRun.cardId);
      
      // Verify status updates
      expect(mockCoreService.updateAgentRun).toHaveBeenCalledWith(mockRun.id, {
        status: 'running',
        startedAt: expect.any(Date),
      });

      expect(mockCoreService.updateAgentRun).toHaveBeenCalledWith(mockRun.id, {
        status: 'completed',
        completedAt: expect.any(Date),
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.003,
      });

      // Verify provider call
      expect(mockProviderRouter.chatCompletion).toHaveBeenCalledWith({
        provider: mockRun.provider,
        model: mockRun.model,
        messages: [
          {
            role: 'system',
            content: mockAgent.systemPrompt,
          },
          {
            role: 'user',
            content: expect.stringContaining(mockCard.title),
          },
        ],
      });

      // Verify log streaming
      expect(mockLogStreaming.sendLog).toHaveBeenCalledWith(mockRun.id, {
        level: 'info',
        message: 'Agent execution started',
        metadata: {
          agentId: mockAgent.id,
          cardId: mockCard.id,
          provider: mockRun.provider,
          model: mockRun.model,
        },
      });
    });

    it('should handle agent not found error', async () => {
      mockCoreService.getAgent.mockRejectedValue(new Error('Agent not found'));

      await expect(executor.executeAgent(mockRun)).rejects.toThrow('Agent not found');

      // Should not update run status on initial failure
      expect(mockCoreService.updateAgentRun).not.toHaveBeenCalled();
    });

    it('should handle card not found error', async () => {
      mockCoreService.getAgent.mockResolvedValue(mockAgent);
      mockCoreService.getCard.mockRejectedValue(new Error('Card not found'));

      await expect(executor.executeAgent(mockRun)).rejects.toThrow('Card not found');
    });

    it('should handle provider router error', async () => {
      mockCoreService.getAgent.mockResolvedValue(mockAgent);
      mockCoreService.getCard.mockResolvedValue(mockCard);
      mockCoreService.updateAgentRun.mockResolvedValue({
        ...mockRun,
        status: 'running' as const,
        startedAt: new Date(),
      });
      mockProviderRouter.chatCompletion.mockRejectedValue(new Error('Provider error'));

      await expect(executor.executeAgent(mockRun)).rejects.toThrow('Provider error');

      // Should mark run as failed
      expect(mockCoreService.updateAgentRun).toHaveBeenCalledWith(mockRun.id, {
        status: 'failed',
        completedAt: expect.any(Date),
      });

      // Should log error
      expect(mockLogStreaming.sendLog).toHaveBeenCalledWith(mockRun.id, {
        level: 'error',
        message: 'Agent execution failed',
        metadata: {
          error: 'Provider error',
        },
      });
    });

    it('should handle empty response from provider', async () => {
      const emptyResponse = {
        choices: [],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 0,
          total_tokens: 100,
        },
      };

      mockCoreService.getAgent.mockResolvedValue(mockAgent);
      mockCoreService.getCard.mockResolvedValue(mockCard);
      mockCoreService.updateAgentRun.mockResolvedValue({
        ...mockRun,
        status: 'running' as const,
        startedAt: new Date(),
      });
      mockProviderRouter.chatCompletion.mockResolvedValue(emptyResponse);

      await expect(executor.executeAgent(mockRun)).rejects.toThrow('No response from provider');

      // Should mark run as failed
      expect(mockCoreService.updateAgentRun).toHaveBeenCalledWith(mockRun.id, {
        status: 'failed',
        completedAt: expect.any(Date),
      });
    });

    it('should handle log streaming failure gracefully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test response',
              role: 'assistant' as const,
            },
          },
        ],
        usage: {
          prompt_tokens: 50,
          completion_tokens: 25,
          total_tokens: 75,
        },
      };

      mockCoreService.getAgent.mockResolvedValue(mockAgent);
      mockCoreService.getCard.mockResolvedValue(mockCard);
      mockCoreService.updateAgentRun.mockResolvedValue({
        ...mockRun,
        status: 'running' as const,
        startedAt: new Date(),
      });
      mockProviderRouter.chatCompletion.mockResolvedValue(mockResponse);
      mockLogStreaming.sendLog.mockRejectedValue(new Error('Log streaming failed'));

      // Should still complete successfully
      const result = await executor.executeAgent(mockRun);
      
      expect(result).toEqual({
        content: 'Test response',
        inputTokens: 50,
        outputTokens: 25,
        cost: expect.any(Number),
      });
    });
  });

  describe('buildPrompt', () => {
    const mockAgent = {
      systemPrompt: 'You are a helpful assistant.',
    };

    const mockCard = {
      title: 'Implement user authentication',
      description: 'Add JWT-based authentication to the API',
      type: 'Task',
      priority: 'High',
    };

    it('should build prompt with system and user messages', () => {
      const prompt = (executor as any).buildPrompt(mockAgent, mockCard);

      expect(prompt).toEqual([
        {
          role: 'system',
          content: mockAgent.systemPrompt,
        },
        {
          role: 'user',
          content: expect.stringContaining(mockCard.title),
        },
      ]);

      expect(prompt[1].content).toContain(mockCard.title);
      expect(prompt[1].content).toContain(mockCard.description);
      expect(prompt[1].content).toContain(mockCard.type);
      expect(prompt[1].content).toContain(mockCard.priority);
    });

    it('should handle missing card description', () => {
      const cardWithoutDescription = {
        ...mockCard,
        description: null,
      };

      const prompt = (executor as any).buildPrompt(mockAgent, cardWithoutDescription);

      expect(prompt[1].content).toContain(mockCard.title);
      expect(prompt[1].content).not.toContain('null');
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for OpenAI GPT-4', () => {
      const cost = (executor as any).calculateCost('openai', 'gpt-4', 1000, 500);
      
      // GPT-4: $0.03/1k input tokens, $0.06/1k output tokens
      const expectedCost = (1000 * 0.03 / 1000) + (500 * 0.06 / 1000);
      
      expect(cost).toBe(expectedCost);
    });

    it('should calculate cost for Anthropic Claude-3', () => {
      const cost = (executor as any).calculateCost('anthropic', 'claude-3-sonnet-20240229', 2000, 800);
      
      // Claude-3: $0.015/1k input tokens, $0.075/1k output tokens (approximate)
      const expectedCost = (2000 * 0.015 / 1000) + (800 * 0.075 / 1000);
      
      expect(cost).toBe(expectedCost);
    });

    it('should return 0 for unknown provider/model', () => {
      const cost = (executor as any).calculateCost('unknown', 'unknown-model', 1000, 500);
      
      expect(cost).toBe(0);
    });
  });

  describe('queueExecution', () => {
    const mockRun = {
      id: 'run-123',
      cardId: 'card-456',
      agentId: 'agent-789',
      status: 'pending' as const,
    };

    it('should queue execution successfully', async () => {
      mockRedisClient.publish.mockResolvedValue(1);

      await executor.queueExecution(mockRun);

      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'agent-execution-queue',
        JSON.stringify(mockRun)
      );
    });

    it('should handle queue failure', async () => {
      mockRedisClient.publish.mockRejectedValue(new Error('Redis error'));

      await expect(executor.queueExecution(mockRun)).rejects.toThrow('Redis error');
    });
  });

  describe('getExecutionStatus', () => {
    const runId = 'run-123';

    it('should get execution status from Redis', async () => {
      const mockStatus = {
        status: 'running',
        progress: 50,
        lastUpdate: new Date().toISOString(),
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockStatus));

      const result = await executor.getExecutionStatus(runId);

      expect(result).toEqual(mockStatus);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`execution:status:${runId}`);
    });

    it('should return null for non-existent status', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await executor.getExecutionStatus(runId);

      expect(result).toBe(null);
    });

    it('should handle Redis error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      await expect(executor.getExecutionStatus(runId)).rejects.toThrow('Redis error');
    });
  });

  describe('cancelExecution', () => {
    const runId = 'run-123';

    it('should cancel execution successfully', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockCoreService.updateAgentRun.mockResolvedValue({
        id: runId,
        status: 'cancelled' as const,
      });

      await executor.cancelExecution(runId);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `execution:cancel:${runId}`,
        'true',
        'EX',
        300 // 5 minutes
      );

      expect(mockCoreService.updateAgentRun).toHaveBeenCalledWith(runId, {
        status: 'cancelled',
        completedAt: expect.any(Date),
      });
    });

    it('should handle cancellation error', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      await expect(executor.cancelExecution(runId)).rejects.toThrow('Redis error');
    });
  });
});