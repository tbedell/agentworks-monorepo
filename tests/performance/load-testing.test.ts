import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  percentile95: number;
  percentile99: number;
  requestsPerSecond: number;
  duration: number;
}

interface AgentExecutionMetrics {
  agentType: string;
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  tokenUsage: {
    totalInputTokens: number;
    totalOutputTokens: number;
    averageInputTokens: number;
    averageOutputTokens: number;
  };
  cost: {
    totalCost: number;
    averageCost: number;
  };
}

class LoadTestRunner {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; responseTime: number; data?: any; error?: string }> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
          ...options.headers,
        },
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        return { success: true, responseTime, data };
      } else {
        const error = await response.text();
        return { success: false, responseTime, error };
      }
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      return { success: false, responseTime, error: error.message };
    }
  }

  async runLoadTest(
    endpoint: string,
    options: RequestInit,
    concurrency: number,
    duration: number
  ): Promise<LoadTestResult> {
    const startTime = performance.now();
    const endTime = startTime + duration;
    const results: Array<{ success: boolean; responseTime: number }> = [];
    const promises: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      promises.push(
        (async () => {
          while (performance.now() < endTime) {
            const result = await this.makeRequest(endpoint, options);
            results.push(result);
            
            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        })()
      );
    }

    await Promise.all(promises);

    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const responseTimes = results.map(r => r.responseTime);
    
    responseTimes.sort((a, b) => a - b);
    
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = responseTimes[0];
    const maxResponseTime = responseTimes[responseTimes.length - 1];
    const percentile95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const percentile99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
    
    const actualDuration = performance.now() - startTime;
    const requestsPerSecond = (totalRequests / actualDuration) * 1000;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      percentile95,
      percentile99,
      requestsPerSecond,
      duration: actualDuration,
    };
  }

  async simulateAgentExecution(cardId: string, agentId: string): Promise<AgentExecutionMetrics> {
    const startTime = performance.now();
    
    // Start execution
    const executeResult = await this.makeRequest(`/execution/cards/${cardId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    });

    if (!executeResult.success) {
      throw new Error(`Failed to start agent execution: ${executeResult.error}`);
    }

    const runId = executeResult.data.id;
    
    // Poll for completion
    let completed = false;
    let finalResult: any = null;
    
    while (!completed && (performance.now() - startTime) < 300000) { // 5 minute timeout
      await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every second
      
      const statusResult = await this.makeRequest(`/runs/${runId}`);
      if (statusResult.success) {
        const run = statusResult.data;
        if (run.status === 'completed' || run.status === 'failed') {
          completed = true;
          finalResult = run;
        }
      }
    }

    const executionTime = performance.now() - startTime;
    
    if (!completed) {
      throw new Error('Agent execution timed out');
    }

    return {
      agentType: agentId,
      executionCount: 1,
      averageExecutionTime: executionTime,
      successRate: finalResult.status === 'completed' ? 1 : 0,
      tokenUsage: {
        totalInputTokens: finalResult.inputTokens || 0,
        totalOutputTokens: finalResult.outputTokens || 0,
        averageInputTokens: finalResult.inputTokens || 0,
        averageOutputTokens: finalResult.outputTokens || 0,
      },
      cost: {
        totalCost: finalResult.cost || 0,
        averageCost: finalResult.cost || 0,
      },
    };
  }
}

describe('Performance and Load Testing', () => {
  let loadTester: LoadTestRunner;
  let authToken: string;
  let testWorkspaceId: string;
  let testProjectId: string;
  let testBoardId: string;

  beforeAll(async () => {
    // Setup test environment
    const loginResponse = await fetch('http://localhost:9000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'loadtest@example.com',
        password: 'LoadTest123!',
      }),
    });

    if (!loginResponse.ok) {
      // Register if login fails
      const registerResponse = await fetch('http://localhost:9000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'loadtest@example.com',
          name: 'Load Test User',
          password: 'LoadTest123!',
          workspaceName: 'Load Test Workspace',
        }),
      });
      
      const registerData = await registerResponse.json();
      authToken = registerData.token;
      testWorkspaceId = registerData.workspace.id;
    } else {
      const loginData = await loginResponse.json();
      authToken = loginData.token;
      testWorkspaceId = loginData.workspace.id;
    }

    loadTester = new LoadTestRunner('http://localhost:9000/api', authToken);
    
    // Create test project and board
    const projectResponse = await fetch('http://localhost:9000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Load Test Project',
        description: 'Project for load testing',
        workspaceId: testWorkspaceId,
      }),
    });
    
    const project = await projectResponse.json();
    testProjectId = project.id;

    const boardsResponse = await fetch('http://localhost:9000/api/boards', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    
    const boards = await boardsResponse.json();
    testBoardId = boards.find((b: any) => b.projectId === testProjectId)?.id;
  });

  describe('Core Service Load Testing', () => {
    it('should handle high concurrent user authentication', async () => {
      const result = await loadTester.runLoadTest(
        '/auth/me',
        { method: 'GET' },
        50, // 50 concurrent users
        30000 // 30 seconds
      );

      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(result.averageResponseTime).toBeLessThan(500); // Under 500ms
      expect(result.percentile95).toBeLessThan(1000); // 95th percentile under 1s
      
      console.log('Authentication Load Test Results:', result);
    });

    it('should handle concurrent card creation', async () => {
      const cardData = {
        title: 'Load Test Card',
        description: 'Generated for load testing',
        type: 'Task',
        priority: 'Medium',
        laneId: 'lane-0',
        boardId: testBoardId,
      };

      const result = await loadTester.runLoadTest(
        '/cards',
        {
          method: 'POST',
          body: JSON.stringify(cardData),
        },
        20, // 20 concurrent card creations
        15000 // 15 seconds
      );

      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThan(0.90); // 90% success rate
      expect(result.averageResponseTime).toBeLessThan(1000); // Under 1s
      
      console.log('Card Creation Load Test Results:', result);
    });

    it('should handle board data retrieval under load', async () => {
      const result = await loadTester.runLoadTest(
        `/boards/${testBoardId}`,
        { method: 'GET' },
        100, // 100 concurrent users viewing board
        30000 // 30 seconds
      );

      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThan(0.98); // 98% success rate
      expect(result.averageResponseTime).toBeLessThan(300); // Under 300ms
      expect(result.percentile95).toBeLessThan(500); // 95th percentile under 500ms
      
      console.log('Board Retrieval Load Test Results:', result);
    });
  });

  describe('Agent Orchestrator Performance', () => {
    it('should handle concurrent agent execution requests', async () => {
      // Create multiple cards for testing
      const cards: string[] = [];
      for (let i = 0; i < 5; i++) {
        const cardResponse = await fetch('http://localhost:9000/api/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            title: `Concurrent Test Card ${i}`,
            description: 'Card for concurrent execution testing',
            type: 'Task',
            priority: 'Medium',
            laneId: 'lane-0',
            boardId: testBoardId,
          }),
        });
        const card = await cardResponse.json();
        cards.push(card.id);
      }

      const orchestratorTester = new LoadTestRunner('http://localhost:9001', authToken);
      
      const result = await orchestratorTester.runLoadTest(
        `/execution/cards/${cards[0]}/execute`,
        {
          method: 'POST',
          body: JSON.stringify({ agentId: 'ceo-copilot' }),
        },
        10, // 10 concurrent executions
        20000 // 20 seconds
      );

      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.successRate).toBeGreaterThan(0.80); // 80% success rate (AI can be flaky)
      expect(result.averageResponseTime).toBeLessThan(2000); // Under 2s to start execution
      
      console.log('Agent Execution Load Test Results:', result);
    });

    it('should measure agent execution performance under load', async () => {
      const agentMetrics: AgentExecutionMetrics[] = [];
      const concurrentExecutions = 3; // Limited due to AI provider rate limits

      const promises = [];
      for (let i = 0; i < concurrentExecutions; i++) {
        // Create card for this execution
        const cardResponse = await fetch('http://localhost:9000/api/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            title: `Performance Test Card ${i}`,
            description: `Strategic vision for performance testing execution ${i}`,
            type: 'Epic',
            priority: 'High',
            laneId: 'lane-0',
            boardId: testBoardId,
          }),
        });
        const card = await cardResponse.json();

        const orchestratorTester = new LoadTestRunner('http://localhost:9001', authToken);
        promises.push(
          orchestratorTester.simulateAgentExecution(card.id, 'ceo-copilot')
            .then(metrics => agentMetrics.push(metrics))
            .catch(error => console.error(`Agent execution failed:`, error))
        );
      }

      await Promise.all(promises);

      expect(agentMetrics.length).toBeGreaterThan(0);
      
      // Calculate aggregate metrics
      const successfulExecutions = agentMetrics.filter(m => m.successRate === 1);
      const totalSuccessRate = successfulExecutions.length / agentMetrics.length;
      
      expect(totalSuccessRate).toBeGreaterThan(0.66); // At least 2/3 should succeed
      
      if (successfulExecutions.length > 0) {
        const avgExecutionTime = successfulExecutions.reduce((sum, m) => sum + m.averageExecutionTime, 0) / successfulExecutions.length;
        const avgTokens = successfulExecutions.reduce((sum, m) => sum + m.tokenUsage.totalInputTokens + m.tokenUsage.totalOutputTokens, 0) / successfulExecutions.length;
        const avgCost = successfulExecutions.reduce((sum, m) => sum + m.cost.totalCost, 0) / successfulExecutions.length;

        expect(avgExecutionTime).toBeLessThan(120000); // Under 2 minutes
        expect(avgTokens).toBeGreaterThan(0);
        expect(avgCost).toBeGreaterThan(0);

        console.log('Agent Performance Metrics:', {
          concurrentExecutions,
          successRate: totalSuccessRate,
          averageExecutionTime: avgExecutionTime,
          averageTokenUsage: avgTokens,
          averageCost: avgCost,
        });
      }
    });
  });

  describe('WebSocket Performance (Log Streaming)', () => {
    it('should handle multiple concurrent WebSocket connections', async () => {
      return new Promise<void>((resolve, reject) => {
        const connections: WebSocket[] = [];
        const connectionCount = 20;
        let connectedCount = 0;
        let messageCount = 0;
        const expectedMessages = connectionCount * 5; // 5 messages per connection

        const cleanup = () => {
          connections.forEach(ws => ws.close());
        };

        const timeout = setTimeout(() => {
          cleanup();
          reject(new Error('WebSocket performance test timed out'));
        }, 30000);

        for (let i = 0; i < connectionCount; i++) {
          const ws = new WebSocket('ws://localhost:9003/ws/logs');
          connections.push(ws);

          ws.onopen = () => {
            connectedCount++;
            
            // Subscribe to logs
            ws.send(JSON.stringify({
              action: 'subscribe',
              runId: `perf-test-${i}`,
            }));

            if (connectedCount === connectionCount) {
              // All connections established, start sending messages
              connections.forEach((connection, index) => {
                for (let j = 0; j < 5; j++) {
                  setTimeout(() => {
                    // Simulate log message
                    fetch('http://localhost:9003/api/logs', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                      },
                      body: JSON.stringify({
                        runId: `perf-test-${index}`,
                        level: 'info',
                        message: `Performance test message ${j}`,
                        timestamp: new Date().toISOString(),
                      }),
                    });
                  }, j * 100);
                }
              });
            }
          };

          ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'log') {
              messageCount++;
              
              if (messageCount >= expectedMessages * 0.8) { // Allow for some message loss
                clearTimeout(timeout);
                cleanup();
                
                console.log('WebSocket Performance Results:', {
                  connections: connectionCount,
                  connectedSuccessfully: connectedCount,
                  messagesReceived: messageCount,
                  expectedMessages,
                  messageDeliveryRate: messageCount / expectedMessages,
                });

                expect(connectedCount).toBe(connectionCount);
                expect(messageCount).toBeGreaterThan(expectedMessages * 0.7); // 70% delivery rate
                resolve();
              }
            }
          };

          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
          };

          ws.onclose = () => {
            console.log('WebSocket closed');
          };
        }
      });
    });
  });

  describe('Database Performance', () => {
    it('should handle high-volume card queries efficiently', async () => {
      // Create many cards for testing
      const cardPromises = [];
      for (let i = 0; i < 100; i++) {
        cardPromises.push(
          fetch('http://localhost:9000/api/cards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              title: `DB Test Card ${i}`,
              description: 'Database performance testing card',
              type: 'Task',
              priority: 'Medium',
              laneId: 'lane-1',
              boardId: testBoardId,
            }),
          })
        );
      }

      await Promise.all(cardPromises);

      // Test querying performance
      const startTime = performance.now();
      
      const queryPromises = [];
      for (let i = 0; i < 20; i++) {
        queryPromises.push(
          fetch(`http://localhost:9000/api/boards/${testBoardId}`, {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          })
        );
      }

      const responses = await Promise.all(queryPromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgResponseTime = totalTime / responses.length;

      expect(responses.every(r => r.ok)).toBe(true);
      expect(avgResponseTime).toBeLessThan(200); // Under 200ms per query
      
      console.log('Database Query Performance:', {
        totalQueries: responses.length,
        totalTime,
        averageResponseTime: avgResponseTime,
        cardsInBoard: 100,
      });
    });

    it('should handle concurrent write operations', async () => {
      const concurrentWrites = 20;
      const startTime = performance.now();

      const writePromises = [];
      for (let i = 0; i < concurrentWrites; i++) {
        writePromises.push(
          fetch('http://localhost:9000/api/cards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              title: `Concurrent Write Card ${i}`,
              description: 'Testing concurrent database writes',
              type: 'Task',
              priority: 'Low',
              laneId: 'lane-2',
              boardId: testBoardId,
            }),
          })
        );
      }

      const responses = await Promise.all(writePromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const successfulWrites = responses.filter(r => r.ok).length;

      expect(successfulWrites).toBe(concurrentWrites);
      expect(totalTime).toBeLessThan(5000); // Under 5 seconds for all writes
      
      console.log('Concurrent Write Performance:', {
        concurrentWrites,
        successfulWrites,
        totalTime,
        averageWriteTime: totalTime / concurrentWrites,
      });
    });
  });

  afterAll(async () => {
    // Cleanup test data
    console.log('Load testing completed');
  });
});