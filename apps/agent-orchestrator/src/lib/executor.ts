import { createLogger, generateCorrelationId, withTimeout, retryWithBackoff } from '@agentworks/shared';
import type {
  AgentExecutionRequest,
  AgentExecutionResponse,
  LogStreamEvent,
  BillingUsageEvent,
  AgentName,
} from '@agentworks/shared';
import { createGateway, type AIGateway, type LLMProviderName, type UsageRecord, type ToolDefinition, type Message } from '@agentworks/ai-gateway';
import {
  toolRegistry,
  registerAllTools,
  registerClaudeCodeTools,
  type ToolContext,
  type ToolCall,
} from '@agentworks/agent-tools';
import { getAgent } from './agent-registry.js';
import {
  addToQueue,
  getFromQueue,
  setAgentState,
  getAgentState,
  deleteAgentState,
  setRunStatus,
  addActiveRun,
  removeActiveRun
} from './redis.js';
import { getCoreServiceClient } from './core-service-client.js';
import { getLogStreamingClient } from './log-streaming-client.js';
import { getContextFileService } from './context-file-service.js';
import {
  getContextService,
  type ConversationMessage,
  type SSEEvent,
} from '@agentworks/context-service';

const logger = createLogger('agent-orchestrator:executor');

// Track if tools have been registered
let toolsRegistered = false;

let isProcessing = false;
let shouldStop = false;

export async function initializeExecutor(): Promise<void> {
  try {
    // Register tools if not already done
    if (!toolsRegistered) {
      logger.info('Registering agent tools...');
      registerAllTools();
      registerClaudeCodeTools();
      toolsRegistered = true;
      logger.info('Agent tools registered');
    }

    // Start the execution worker
    if (!isProcessing) {
      startExecutionWorker();
      logger.info('Agent executor initialized');
    }
  } catch (error) {
    logger.error('Failed to initialize executor', { error });
    throw error;
  }
}

export async function executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
  const correlationId = generateCorrelationId();
  
  try {
    logger.info('Agent execution requested', {
      correlationId,
      cardId: request.cardId,
      agentId: request.agentId,
      userId: request.userId,
    });
    
    // Get agent configuration
    const agent = await getAgent(request.agentId as any);
    if (!agent) {
      throw new Error(`Agent not found: ${request.agentId}`);
    }
    
    // Create run ID
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    // Add to execution queue
    await addToQueue('agent-execution', {
      runId,
      ...request,
      agent,
      correlationId,
    });
    
    logger.info('Agent execution queued', {
      correlationId,
      runId,
      agentId: request.agentId,
    });
    
    return {
      runId,
      status: 'started',
      message: 'Agent execution queued successfully',
    };
    
  } catch (error) {
    logger.error('Failed to queue agent execution', {
      correlationId,
      error,
      request,
    });
    
    return {
      runId: '',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function startExecutionWorker(): Promise<void> {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  logger.info('Starting agent execution worker');
  
  while (!shouldStop) {
    try {
      // Get next execution request (blocking with timeout)
      const queueItem = await getFromQueue('agent-execution', 5);

      if (!queueItem) {
        // No work available - sleep before checking again to avoid tight loop
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      const { runId, ...executionData } = queueItem.data;
      
      // Process the execution
      await processExecution(runId, executionData);
      
    } catch (error) {
      logger.error('Error in execution worker', { error });
      
      // Brief pause before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  isProcessing = false;
  logger.info('Agent execution worker stopped');
}

async function processExecution(runId: string, executionData: any): Promise<void> {
  const correlationId = executionData.correlationId;
  const loggerWithContext = createLogger('agent-orchestrator:executor', correlationId);
  const contextService = getContextFileService();

  // We'll set projectPath once we have project info
  let projectPath: string | null = null;
  const cardId = executionData.cardId;
  const agentName = executionData.agentId;

  try {
    loggerWithContext.info('Processing agent execution', {
      runId,
      agentId: executionData.agentId,
      cardId: executionData.cardId,
    });

    // Mark run as active
    await addActiveRun(runId, executionData.agentId, executionData.cardId);
    await setRunStatus(runId, 'running', { startTime: Date.now() });

    // Send initial log event
    await sendLogEvent(runId, {
      runId,
      type: 'status',
      data: {
        status: 'running',
        message: 'Agent execution started',
      },
      timestamp: new Date(),
    });
    
    // Create run record in core service
    const coreService = getCoreServiceClient();
    const agentRun = await coreService.createAgentRun({
      cardId: executionData.cardId,
      agentId: executionData.agentId,
      provider: executionData.agent.defaultProvider,
      model: executionData.agent.defaultModel,
      userId: executionData.userId,
    });

    // Transition card to "Running" state
    try {
      await coreService.transitionCard(
        executionData.cardId,
        'agent_start',
        executionData.agentId,
        {
          details: `Agent ${executionData.agentId} started execution`,
          metadata: { runId: agentRun.id },
        }
      );
      loggerWithContext.info('Card transitioned to Running', { cardId: executionData.cardId });
    } catch (transitionError) {
      loggerWithContext.warn('Failed to transition card to Running', { transitionError });
      // Continue execution even if transition fails
    }
    
    // Get card context
    const card = await coreService.getCard(executionData.cardId);
    if (!card) {
      throw new Error('Card not found');
    }
    
    // Get project context
    const project = await coreService.getProject(card.board.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Set project path for context file writing
    projectPath = project.localPath || `/projects/${project.workspace?.slug || 'default'}/${project.slug || project.id}`;

    // Initialize context file for this card
    if (projectPath) {
      try {
        await contextService.initializeContext(projectPath, cardId, card.title, agentName);
        await contextService.logStatus(projectPath, cardId, agentName, 'running', 'Agent execution started');
      } catch (contextError) {
        loggerWithContext.warn('Failed to initialize context file', { contextError });
        // Continue execution even if context file fails
      }
    }

    // Initialize Redis context for this card
    try {
      const redisContextService = getContextService();
      await redisContextService.initCardContext(cardId, card.board.projectId, agentName);
      loggerWithContext.info('Initialized Redis context for card', { cardId, agentName });

      // Broadcast SSE event for agent start
      await broadcastSSEEvent(cardId, {
        type: 'iteration_start',
        timestamp: new Date().toISOString(),
        data: { runId, agentName, status: 'running' },
      });
    } catch (redisContextError) {
      loggerWithContext.warn('Failed to initialize Redis context', { redisContextError });
      // Continue execution even if Redis context fails
    }

    // Prepare agent context
    const agentContext = {
      card,
      project,
      lane: card.lane,
      workspace: project.workspace,
      userContext: executionData.context || {},
    };
    
    // Store agent state
    await setAgentState(runId, {
      runId: agentRun.id,
      context: agentContext,
      status: 'running',
      startTime: Date.now(),
    });
    
    // Execute agent with provider router
    // Pass BYOA provider/model overrides from the execution request
    const executionMode = executionData.mode || 'standard';
    const result = await executeAgentWithProvider(
      runId,
      executionData.agent,
      agentContext,
      projectPath,
      cardId,
      executionMode,
      executionData.provider,  // BYOA provider override from request
      executionData.model      // BYOA model override from request
    );
    
    // Update run with results
    await coreService.updateAgentRun(agentRun.id, {
      status: 'completed',
      inputTokens: result.usage.inputTokens || 0,
      outputTokens: result.usage.outputTokens || 0,
      cost: result.usage.providerCost,
      price: result.usage.billedAmount,
      completedAt: new Date(),
    });
    
    // Send billing event
    await sendBillingEvent({
      workspaceId: executionData.workspaceId,
      projectId: card.board.projectId,
      cardId: executionData.cardId,
      agentId: executionData.agentId,
      runId: agentRun.id,
      provider: result.provider as any,
      model: result.model,
      inputTokens: result.usage.inputTokens || 0,
      outputTokens: result.usage.outputTokens || 0,
      cost: result.usage.providerCost,
      price: result.usage.billedAmount,
      timestamp: new Date(),
    });
    
    // Send completion log event
    await sendLogEvent(runId, {
      runId,
      type: 'completion',
      data: {
        status: 'completed',
        result: {
          content: result.content,
          usage: result.usage,
        },
      },
      timestamp: new Date(),
    });

    // Log completion to context file
    if (projectPath) {
      try {
        // In conversation mode, log the agent's response as a chat message
        if (executionMode === 'conversation' && result.content) {
          await contextService.logAgentMessage(
            projectPath,
            cardId,
            agentName,
            result.content
          );
          loggerWithContext.info('Logged agent message to conversation', { cardId, agentName });
        }

        await contextService.logCompletion(
          projectPath,
          cardId,
          agentName,
          result.content.slice(0, 500) + (result.content.length > 500 ? '...' : ''),
          {
            inputTokens: result.usage.inputTokens || 0,
            outputTokens: result.usage.outputTokens || 0,
            cost: result.usage.providerCost,
          }
        );
      } catch (contextError) {
        loggerWithContext.warn('Failed to log completion to context file', { contextError });
      }
    }

    // Append agent response to Redis context
    if (result.content) {
      await appendMessageToContext(cardId, 'assistant', result.content, {
        agentName,
        runId,
        toolsUsed: result.toolsUsed,
        iterations: result.iterations,
      });
    }

    // Broadcast SSE completion event
    await broadcastSSEEvent(cardId, {
      type: 'agent_complete',
      timestamp: new Date().toISOString(),
      data: {
        runId,
        agentName,
        status: 'completed',
        usage: {
          inputTokens: result.usage.inputTokens || 0,
          outputTokens: result.usage.outputTokens || 0,
          cost: result.usage.providerCost,
        },
      },
    });

    // Transition card to completed/review state
    try {
      await coreService.transitionCard(
        executionData.cardId,
        'agent_complete',
        executionData.agentId,
        {
          details: `Agent ${executionData.agentId} completed execution`,
          metadata: {
            runId: agentRun.id,
            inputTokens: result.usage.inputTokens || 0,
            outputTokens: result.usage.outputTokens || 0,
            cost: result.usage.providerCost,
          },
        }
      );
      loggerWithContext.info('Card transitioned to Review', { cardId: executionData.cardId });
    } catch (transitionError) {
      loggerWithContext.warn('Failed to transition card to Review', { transitionError });
      // Continue execution even if transition fails
    }

    // Clean up
    await removeActiveRun(runId);
    await deleteAgentState(runId);
    await setRunStatus(runId, 'completed', {
      endTime: Date.now(),
      success: true,
    });

    loggerWithContext.info('Agent execution completed successfully', {
      runId,
      inputTokens: result.usage.inputTokens || 0,
      outputTokens: result.usage.outputTokens || 0,
      cost: result.usage.providerCost,
      billedAmount: result.usage.billedAmount,
    });
    
  } catch (error) {
    loggerWithContext.error('Agent execution failed', { runId, error });

    // Log error to context file
    if (projectPath) {
      try {
        await contextService.logError(
          projectPath,
          cardId,
          agentName,
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error.stack : undefined
        );
      } catch (contextError) {
        loggerWithContext.warn('Failed to log error to context file', { contextError });
      }
    }

    try {
      // Send error log event
      await sendLogEvent(runId, {
        runId,
        type: 'error',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed',
        },
        timestamp: new Date(),
      });

      // Update run status
      await setRunStatus(runId, 'failed', {
        endTime: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clean up
      await removeActiveRun(runId);
      await deleteAgentState(runId);

    } catch (cleanupError) {
      loggerWithContext.error('Failed to clean up after execution failure', {
        runId,
        cleanupError,
      });
    }
  }
}

interface GatewayResponse {
  content: string;
  provider: string;
  model: string;
  usage: UsageRecord;
}

interface ExtendedGatewayResponse extends GatewayResponse {
  toolsUsed: string[];
  iterations: number;
}

let gateway: AIGateway | null = null;

function getGateway(): AIGateway {
  if (!gateway) {
    gateway = createGateway({
      onUsage: async (record) => {
        logger.debug('Usage tracked', { record });
      },
    });
  }
  return gateway;
}

const MAX_TOOL_ITERATIONS = 10;

async function executeAgentWithProvider(
  runId: string,
  agent: any,
  context: any,
  projectPath: string | null,
  cardId: string,
  mode: 'standard' | 'conversation' = 'standard',
  providerOverride?: string,
  modelOverride?: string
): Promise<ExtendedGatewayResponse> {
  const contextService = getContextFileService();
  const aiGateway = getGateway();
  const agentName = agent.name as AgentName;

  // Get available tools for this agent
  const agentTools = toolRegistry.getToolDefinitions(agentName);
  const hasTools = agentTools.length > 0;

  // Build initial messages with instructions
  const messages: Message[] = [
    {
      role: 'system',
      content: agent.systemPrompt,
    },
  ];

  // In conversation mode, read conversation history from context file
  if (mode === 'conversation' && projectPath) {
    try {
      const contextContent = await contextService.readContext(projectPath, cardId);
      const conversation = contextService.parseConversation(contextContent);

      // Add conversation history
      for (const entry of conversation) {
        messages.push({
          role: entry.role === 'human' ? 'user' : 'assistant',
          content: entry.content,
        });
      }

      logger.info('Loaded conversation history', {
        runId,
        messageCount: conversation.length,
      });
    } catch (error) {
      logger.warn('Failed to load conversation history', { runId, error });
    }

    // In conversation mode, add context about what the agent should do
    messages.push({
      role: 'user',
      content: `Continue the conversation above. Review what the human has said and respond appropriately. If they have requested changes or provided feedback, address those points. If they are satisfied, ask if there's anything else or suggest next steps.

Remember to use your tools (read_file, write_file, update_file, etc.) to actually make code changes - don't just describe what should be done.`,
    });
  } else {
    // Standard mode - use the full user message with instructions
    const userMessage = await buildUserMessage(context, projectPath, cardId, contextService);
    messages.push({
      role: 'user',
      content: userMessage,
    });
  }

  // Build tool context
  const toolContext: ToolContext = {
    projectId: context.project.id,
    agentName,
    agentRunId: runId,
    tenantSlug: context.workspace.slug || context.workspace.id,
    projectSlug: context.project.slug || context.project.id,
    projectPath: context.project.localPath || `/projects/${context.workspace.slug}/${context.project.slug}`,
  };

  // Log BYOA overrides if provided
  if (providerOverride || modelOverride) {
    logger.info('Using BYOA overrides', {
      runId,
      agentName,
      providerOverride,
      modelOverride,
      defaultProvider: agent.defaultProvider,
      defaultModel: agent.defaultModel,
    });
  }

  // Track cumulative usage
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;
  let totalBilledAmount = 0;
  const toolsUsed: string[] = [];
  let iterations = 0;
  let finalContent = '';
  let lastProvider = providerOverride || agent.defaultProvider;
  let lastModel = modelOverride || agent.defaultModel;

  // Tool calling loop
  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    logger.debug('Agent iteration', { runId, iteration: iterations, messageCount: messages.length });

    // Make LLM call - use BYOA overrides if provided, otherwise fall back to agent defaults
    const effectiveProvider = (providerOverride || agent.defaultProvider) as LLMProviderName;
    const effectiveModel = modelOverride || agent.defaultModel;

    const result = await retryWithBackoff(
      () => withTimeout(
        aiGateway.chat(messages, {
          provider: effectiveProvider,
          model: effectiveModel,
          workspaceId: context.workspace.id,
          tenantId: context.workspace.tenantId ?? undefined,
          projectId: context.project.id,
          agentId: agent.id,
          maxTokens: agent.maxTokens ?? 4096,
          temperature: agent.temperature ?? 0.7,
          tools: hasTools ? agentTools : undefined,
        }),
        300000, // 5 minute timeout
        'Agent execution timed out'
      ),
      3, // Max 3 retries
      2000, // Start with 2 second delay
      30000 // Max 30 second delay
    );

    // Accumulate usage
    totalInputTokens += result.usage?.inputTokens || 0;
    totalOutputTokens += result.usage?.outputTokens || 0;
    totalCost += result.cost || 0;
    totalBilledAmount += result.usage?.billedAmount || result.cost * 2 || 0;
    lastProvider = result.provider || agent.defaultProvider;
    lastModel = result.model;

    // If no tool calls, we're done
    if (!result.toolCalls || result.toolCalls.length === 0) {
      finalContent = result.content;
      break;
    }

    // Send tool call log event
    await sendLogEvent(runId, {
      runId,
      type: 'log',
      data: {
        level: 'info',
        message: `Calling tools: ${result.toolCalls.map((tc: ToolCall) => tc.name).join(', ')}`,
        metadata: {
          eventType: 'tool_calls',
          toolCalls: result.toolCalls.map((tc: ToolCall) => ({
            name: tc.name,
            arguments: tc.arguments,
          })),
        },
      },
      timestamp: new Date(),
    });

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: result.content || '',
      toolCalls: result.toolCalls as ToolCall[],
    });

    // Execute tool calls
    for (const toolCall of result.toolCalls as ToolCall[]) {
      logger.info('Executing tool call', {
        runId,
        tool: toolCall.name,
        args: toolCall.arguments,
      });

      toolsUsed.push(toolCall.name);

      // Log tool call to context file
      if (projectPath) {
        try {
          await contextService.logToolCall(
            projectPath,
            cardId,
            agentName,
            toolCall.name,
            toolCall.arguments
          );
        } catch (contextError) {
          logger.warn('Failed to log tool call to context', { contextError });
        }
      }

      const toolResult = await toolRegistry.executeTool(
        toolCall.name,
        toolCall.arguments,
        toolContext
      );

      logger.info('Tool call completed', {
        runId,
        tool: toolCall.name,
        success: toolResult.success,
      });

      // Log tool result to context file
      if (projectPath) {
        try {
          await contextService.logToolResult(
            projectPath,
            cardId,
            agentName,
            toolCall.name,
            toolResult.success ? toolResult.data : toolResult.error,
            toolResult.success
          );
        } catch (contextError) {
          logger.warn('Failed to log tool result to context', { contextError });
        }
      }

      // Send tool result log event
      await sendLogEvent(runId, {
        runId,
        type: 'log',
        data: {
          level: toolResult.success ? 'info' : 'warn',
          message: `Tool ${toolCall.name} ${toolResult.success ? 'succeeded' : 'failed'}`,
          metadata: {
            eventType: 'tool_result',
            tool: toolCall.name,
            success: toolResult.success,
            result: toolResult.success ? toolResult.data : toolResult.error,
          },
        },
        timestamp: new Date(),
      });

      // Add tool result to messages
      messages.push({
        role: 'tool',
        content: JSON.stringify(toolResult.success ? toolResult.data : { error: toolResult.error }),
        toolCallId: toolCall.id,
        name: toolCall.name,
      });
    }
  }

  if (iterations >= MAX_TOOL_ITERATIONS) {
    logger.warn('Agent reached maximum tool iterations', { runId, iterations });
    finalContent = finalContent || 'Maximum tool iterations reached. Please review the results.';
  }

  return {
    content: finalContent,
    provider: lastProvider,
    model: lastModel,
    usage: {
      provider: lastProvider,
      model: lastModel,
      operation: 'chat',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      providerCost: totalCost,
      billedAmount: totalBilledAmount,
      workspaceId: context.workspace.id,
      projectId: context.project.id,
      agentId: agent.id,
      timestamp: new Date(),
    },
    toolsUsed: [...new Set(toolsUsed)],
    iterations,
  };
}

async function buildUserMessage(
  context: any,
  projectPath: string | null,
  cardId: string,
  contextService: ReturnType<typeof getContextFileService>
): Promise<string> {
  const { card, project, lane, workspace } = context;

  // Fetch CoPilot instructions from context file
  let instructions: string | null = null;
  if (projectPath) {
    try {
      instructions = await contextService.getInstructions(projectPath, cardId);
    } catch (error) {
      logger.debug('No instructions found for card', { cardId, error });
    }
  }

  return `
Please help with the following task:

**Workspace:** ${workspace.name}
**Project:** ${project.name}
**Lane:** ${lane.name}

**Card Details:**
- Title: ${card.title}
- Type: ${card.type}
- Priority: ${card.priority}
- Status: ${card.status}
${card.description ? `- Description: ${card.description}` : ''}

${instructions ? `**CoPilot Instructions:**
${instructions}

` : ''}**Context:**
${card.parent ? `- Parent Card: ${card.parent.title} (${card.parent.type})` : ''}
${card.children?.length > 0 ? `- Child Cards: ${card.children.map((c: any) => `${c.title} (${c.type})`).join(', ')}` : ''}

Please provide specific, actionable guidance for this task based on your expertise.
`.trim();
}

async function sendLogEvent(runId: string, event: LogStreamEvent): Promise<void> {
  try {
    const logStreaming = getLogStreamingClient();
    await logStreaming.sendEvent(runId, event);
  } catch (error) {
    logger.error('Failed to send log event', { runId, error });
    // Don't throw - logging failures shouldn't stop execution
  }
}

async function sendBillingEvent(event: BillingUsageEvent): Promise<void> {
  try {
    // Add to billing queue for processing
    await addToQueue('billing-events', event);
  } catch (error) {
    logger.error('Failed to send billing event', { event, error });
    // Don't throw - billing failures shouldn't stop execution
  }
}

async function broadcastSSEEvent(cardId: string, event: SSEEvent): Promise<void> {
  try {
    // Broadcast to API's SSE endpoint
    const apiUrl = process.env.API_URL || 'http://localhost:3010';
    const response = await fetch(`${apiUrl}/api/context/cards/${cardId}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      logger.warn('Failed to broadcast SSE event', { cardId, status: response.status });
    }
  } catch (error) {
    logger.debug('Could not broadcast SSE event (API may be unavailable)', { cardId, error });
    // Don't throw - SSE broadcast failures shouldn't stop execution
  }
}

async function appendMessageToContext(
  cardId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const redisContextService = getContextService();
    const message: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata,
    };
    await redisContextService.appendCardMessage(cardId, message);

    // Broadcast SSE event
    await broadcastSSEEvent(cardId, {
      type: 'message',
      timestamp: new Date().toISOString(),
      data: message,
    });
  } catch (error) {
    logger.warn('Failed to append message to Redis context', { cardId, role, error });
    // Don't throw - context failures shouldn't stop execution
  }
}

export async function stopExecutor(): Promise<void> {
  shouldStop = true;
  logger.info('Stopping agent executor...');
  
  // Wait for current processing to finish
  while (isProcessing) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  logger.info('Agent executor stopped');
}

export async function getExecutorStatus(): Promise<any> {
  const activeRuns = await getFromQueue('agent-execution');
  
  return {
    isProcessing,
    shouldStop,
    queueLength: activeRuns ? 1 : 0, // Simplified queue length check
  };
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, stopping executor...');
  await stopExecutor();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, stopping executor...');
  await stopExecutor();
});