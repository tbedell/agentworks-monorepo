# AgentWorks - Multi-Provider LLM Routing Architecture

**Version:** 1.0  
**Date:** 2025-12-02  
**Owner:** Architect Agent  
**Status:** Implementation Ready  

---

## 1. System Overview

The AgentWorks LLM Routing System provides a unified abstraction layer over multiple LLM providers with intelligent routing, cost optimization, usage tracking, and billing management. The system ensures 5x markup pricing with $0.25 billing increments while maintaining high availability and performance.

### 1.1 Design Principles

- **Provider Abstraction**: Unified API hiding provider-specific implementations
- **Intelligent Routing**: Context-aware provider selection based on agent requirements
- **Cost Transparency**: Real-time cost calculation and margin enforcement
- **High Availability**: Circuit breaker patterns with automatic failover
- **Usage Attribution**: Granular tracking for accurate billing and analytics
- **Scalable Architecture**: Support for new providers without system changes

---

## 2. Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Applications                          │
│              Agent Orchestrator, Direct API Calls              │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Unified LLM API
┌─────────────────▼───────────────────────────────────────────────┐
│                   LLM Routing Service                           │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │   Request   │ │   Provider   │ │    Cost     │ │  Circuit │ │
│  │ Validation  │ │   Selector   │ │ Calculator  │ │ Breaker  │ │
│  │ & Context   │ │              │ │             │ │ Manager  │ │
│  └─────────────┘ └──────────────┘ └─────────────┘ └──────────┘ │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┼─────────┬─────────┬─────────┬─────────┐
        │         │         │         │         │         │
┌───────▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│  OpenAI   │ │Anthropic│ │ Google│ │  Nano │ │ Custom│
│ Provider  │ │Provider │ │   AI  │ │Banana │ │Provider│
│  Adapter  │ │ Adapter │ │Adapter│ │Adapter│ │Adapter │
└───┬───────┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
    │             │         │         │         │
┌───▼─────────────▼─────────▼─────────▼─────────▼───┐
│              Usage Tracking Service                │
│    Real-time cost calculation & event emission    │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                Event Bus (Pub/Sub)                 │
│           Topic: llm-usage-events                  │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│               Billing Service                       │
│     Usage aggregation & invoice generation         │
└─────────────────────────────────────────────────────┘
```

---

## 3. Provider Adapter System

### 3.1 Unified Provider Interface

```typescript
interface LLMProvider {
  // Provider identification
  readonly name: string;
  readonly models: readonly string[];
  readonly capabilities: ProviderCapabilities;
  
  // Core LLM operations
  chat(request: ChatRequest): Promise<ChatResponse>;
  embed?(request: EmbedRequest): Promise<EmbedResponse>;
  moderate?(request: ModerationRequest): Promise<ModerationResponse>;
  
  // Provider management
  healthCheck(): Promise<ProviderHealth>;
  getRateLimit(): Promise<RateLimitInfo>;
  getModelInfo(model: string): Promise<ModelInfo>;
}

interface ChatRequest {
  // Core request parameters
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  
  // AgentWorks context
  agentId: string;
  cardId: string;
  workspaceId: string;
  projectId: string;
  
  // Request metadata
  requestId: string;
  userId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  
  // Provider-specific parameters
  providerOptions?: Record<string, any>;
}

interface ChatResponse {
  // Response content
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'function_call';
  
  // Usage metrics
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  
  // Cost information
  cost: {
    input: number;    // Cost for input tokens
    output: number;   // Cost for output tokens
    total: number;    // Total provider cost
    currency: string; // Usually 'USD'
  };
  
  // Response metadata
  model: string;
  provider: string;
  responseTime: number; // Milliseconds
  requestId: string;
  
  // Provider-specific data
  providerMetadata?: Record<string, any>;
}
```

### 3.2 OpenAI Provider Implementation

```typescript
class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly models = [
    'gpt-4-turbo-preview',
    'gpt-4-turbo',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-3.5-turbo'
  ] as const;
  
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    embed: true,
    moderate: true,
    functionCalling: true,
    vision: true,
    streaming: true
  };
  
  private client: OpenAI;
  private rateLimiter: RateLimiter;
  private costCalculator: OpenAICostCalculator;
  
  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organization,
    });
    this.rateLimiter = new RateLimiter(config.rateLimits);
    this.costCalculator = new OpenAICostCalculator();
  }
  
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Rate limiting
    await this.rateLimiter.acquire(request.priority);
    
    const startTime = Date.now();
    
    try {
      // Convert to OpenAI format
      const openaiRequest = this.formatRequest(request);
      
      // Make API call
      const response = await this.client.chat.completions.create(openaiRequest);
      
      const responseTime = Date.now() - startTime;
      
      // Calculate costs
      const cost = this.costCalculator.calculate(
        request.model,
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0
      );
      
      // Format response
      return {
        content: response.choices[0]?.message?.content || '',
        finishReason: this.mapFinishReason(response.choices[0]?.finish_reason),
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        cost,
        model: request.model,
        provider: this.name,
        responseTime,
        requestId: request.requestId,
        providerMetadata: {
          openaiId: response.id,
          created: response.created,
        }
      };
      
    } catch (error) {
      // Handle provider-specific errors
      throw this.handleError(error, request);
    }
  }
  
  private formatRequest(request: ChatRequest): OpenAI.Chat.ChatCompletionCreateParams {
    return {
      model: request.model,
      messages: request.messages.map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      })),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop: request.stop,
      ...request.providerOptions
    };
  }
}
```

### 3.3 Anthropic Provider Implementation

```typescript
class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly models = [
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
    'claude-3-opus-20240229'
  ] as const;
  
  readonly capabilities: ProviderCapabilities = {
    chat: true,
    embed: false,
    moderate: false,
    functionCalling: true,
    vision: true,
    streaming: true
  };
  
  private client: Anthropic;
  private rateLimiter: RateLimiter;
  private costCalculator: AnthropicCostCalculator;
  
  async chat(request: ChatRequest): Promise<ChatResponse> {
    await this.rateLimiter.acquire(request.priority);
    
    const startTime = Date.now();
    
    try {
      // Convert messages to Anthropic format
      const { system, messages } = this.formatMessages(request.messages);
      
      const response = await this.client.messages.create({
        model: request.model,
        system,
        messages,
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature,
        ...request.providerOptions
      });
      
      const responseTime = Date.now() - startTime;
      
      // Calculate costs using Anthropic pricing
      const cost = this.costCalculator.calculate(
        request.model,
        response.usage.input_tokens,
        response.usage.output_tokens
      );
      
      return {
        content: response.content[0]?.text || '',
        finishReason: this.mapStopReason(response.stop_reason),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        cost,
        model: request.model,
        provider: this.name,
        responseTime,
        requestId: request.requestId,
        providerMetadata: {
          claudeId: response.id,
          stopSequence: response.stop_sequence,
        }
      };
      
    } catch (error) {
      throw this.handleError(error, request);
    }
  }
  
  private formatMessages(messages: Message[]): {
    system: string;
    messages: Anthropic.MessageParam[];
  } {
    const systemMessages = messages.filter(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    return {
      system: systemMessages.map(m => m.content).join('\n\n'),
      messages: chatMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))
    };
  }
}
```

---

## 4. Provider Selection Engine

### 4.1 Selection Strategy

```typescript
interface ProviderSelectionStrategy {
  selectProvider(
    request: ProviderSelectionRequest
  ): Promise<ProviderSelectionResult>;
}

interface ProviderSelectionRequest {
  agentId: string;
  taskType: AgentTaskType;
  workspaceId: string;
  projectId: string;
  requirements: {
    capabilities: string[];
    performance: 'fast' | 'balanced' | 'quality';
    costPriority: 'lowest' | 'balanced' | 'premium';
  };
  fallbackOptions?: string[];
}

interface ProviderSelectionResult {
  provider: string;
  model: string;
  confidence: number;
  reasoning: string;
  alternativeOptions: Array<{
    provider: string;
    model: string;
    score: number;
    costEstimate: number;
  }>;
}

class IntelligentProviderSelector implements ProviderSelectionStrategy {
  private agentConfigs: Map<string, AgentConfig>;
  private providerHealth: Map<string, ProviderHealthStatus>;
  private costHistory: CostHistoryService;
  private performanceMetrics: PerformanceMetricsService;
  
  async selectProvider(request: ProviderSelectionRequest): Promise<ProviderSelectionResult> {
    // 1. Get agent's preferred configuration
    const agentConfig = await this.getAgentConfig(request.agentId, request.projectId);
    
    // 2. Check provider health and availability
    const availableProviders = await this.filterHealthyProviders();
    
    // 3. Score providers based on multiple factors
    const providerScores = await this.scoreProviders(request, availableProviders);
    
    // 4. Select best provider
    const bestProvider = this.selectBestProvider(providerScores, agentConfig);
    
    return {
      provider: bestProvider.provider,
      model: bestProvider.model,
      confidence: bestProvider.score,
      reasoning: bestProvider.reasoning,
      alternativeOptions: providerScores.slice(1, 4)
    };
  }
  
  private async scoreProviders(
    request: ProviderSelectionRequest,
    providers: ProviderInfo[]
  ): Promise<ScoredProvider[]> {
    const scores: ScoredProvider[] = [];
    
    for (const provider of providers) {
      const score = await this.calculateProviderScore(provider, request);
      scores.push({
        ...provider,
        score,
        reasoning: this.generateReasoning(provider, request, score)
      });
    }
    
    return scores.sort((a, b) => b.score - a.score);
  }
  
  private async calculateProviderScore(
    provider: ProviderInfo,
    request: ProviderSelectionRequest
  ): Promise<number> {
    let score = 0;
    
    // Capability match (40% weight)
    const capabilityScore = this.scoreCapabilities(provider, request.requirements.capabilities);
    score += capabilityScore * 0.4;
    
    // Performance history (25% weight)
    const performanceScore = await this.performanceMetrics.getAverageScore(
      provider.name,
      request.agentId,
      30 // days
    );
    score += performanceScore * 0.25;
    
    // Cost efficiency (20% weight)
    const costScore = await this.calculateCostScore(provider, request);
    score += costScore * 0.2;
    
    // Current health and availability (15% weight)
    const healthScore = this.providerHealth.get(provider.name)?.score || 0;
    score += healthScore * 0.15;
    
    return Math.min(score, 1.0); // Cap at 1.0
  }
}
```

### 4.2 Agent-Specific Configurations

```typescript
interface AgentProviderConfig {
  agentId: string;
  projectId: string;
  
  // Primary provider preferences
  preferredProvider: string;
  preferredModel: string;
  
  // Fallback hierarchy
  fallbackProviders: Array<{
    provider: string;
    model: string;
    conditions: string[]; // When to use this fallback
  }>;
  
  // Task-specific overrides
  taskOverrides: Record<AgentTaskType, {
    provider?: string;
    model?: string;
    parameters?: Record<string, any>;
  }>;
  
  // Constraints
  maxCostPerRequest: number;
  maxResponseTime: number; // milliseconds
  requiredCapabilities: string[];
  
  // Custom routing rules
  routingRules: RoutingRule[];
}

// Example agent configurations
const AGENT_CONFIGS: Record<string, AgentProviderConfig> = {
  'ceo_copilot': {
    agentId: 'ceo_copilot',
    projectId: '*', // Global default
    preferredProvider: 'openai',
    preferredModel: 'gpt-4-turbo',
    fallbackProviders: [
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', conditions: ['openai_unavailable'] }
    ],
    maxCostPerRequest: 0.50,
    maxResponseTime: 30000,
    requiredCapabilities: ['chat', 'function_calling'],
    routingRules: []
  },
  
  'architect': {
    agentId: 'architect',
    projectId: '*',
    preferredProvider: 'anthropic',
    preferredModel: 'claude-3-5-sonnet-20241022',
    fallbackProviders: [
      { provider: 'openai', model: 'gpt-4-turbo', conditions: ['anthropic_unavailable'] }
    ],
    taskOverrides: {
      'code_generation': {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022'
      },
      'documentation': {
        provider: 'openai',
        model: 'gpt-4-turbo'
      }
    },
    maxCostPerRequest: 1.00,
    maxResponseTime: 60000,
    requiredCapabilities: ['chat', 'code_analysis'],
    routingRules: []
  },
  
  'troubleshooter': {
    agentId: 'troubleshooter',
    projectId: '*',
    preferredProvider: 'google',
    preferredModel: 'gemini-1.5-pro',
    fallbackProviders: [
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', conditions: ['google_unavailable'] },
      { provider: 'openai', model: 'gpt-4-turbo', conditions: ['google_anthropic_unavailable'] }
    ],
    maxCostPerRequest: 0.75,
    maxResponseTime: 45000,
    requiredCapabilities: ['chat', 'analysis'],
    routingRules: [
      {
        condition: 'error_analysis',
        provider: 'google',
        model: 'gemini-1.5-pro',
        reason: 'Superior analytical capabilities for debugging'
      }
    ]
  }
};
```

---

## 5. Cost Management System

### 5.1 Real-Time Cost Calculator

```typescript
interface CostCalculator {
  calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostBreakdown;
  
  calculatePrice(providerCost: number): number;
  estimateCost(request: ChatRequest): Promise<CostEstimate>;
}

interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
  
  // Pricing details
  inputTokenPrice: number; // Cost per 1K tokens
  outputTokenPrice: number;
  
  // AgentWorks pricing
  customerPrice: number; // What we charge
  markup: number; // Actual markup applied
  margin: number; // Gross margin percentage
}

class UnifiedCostCalculator implements CostCalculator {
  private pricingTables: Map<string, ProviderPricing>;
  
  constructor() {
    this.pricingTables = new Map();
    this.initializePricingTables();
  }
  
  calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostBreakdown {
    const pricing = this.getPricing(provider, model);
    
    const inputCost = (inputTokens / 1000) * pricing.inputPrice;
    const outputCost = (outputTokens / 1000) * pricing.outputPrice;
    const totalCost = inputCost + outputCost;
    
    const customerPrice = this.calculateCustomerPrice(totalCost);
    const markup = customerPrice / totalCost;
    const margin = ((customerPrice - totalCost) / customerPrice) * 100;
    
    return {
      inputCost,
      outputCost,
      totalCost,
      currency: 'USD',
      inputTokenPrice: pricing.inputPrice,
      outputTokenPrice: pricing.outputPrice,
      customerPrice,
      markup,
      margin
    };
  }
  
  calculateCustomerPrice(providerCost: number): number {
    // AgentWorks pricing formula: minimum 5x markup, rounded to $0.25
    const minPrice = providerCost * 5; // 5x minimum markup
    const increment = 0.25; // $0.25 billing increments
    
    return Math.ceil(minPrice / increment) * increment;
  }
  
  private initializePricingTables(): void {
    // OpenAI pricing (as of December 2025)
    this.pricingTables.set('openai', {
      models: {
        'gpt-4-turbo': { inputPrice: 0.010, outputPrice: 0.030 },
        'gpt-4o': { inputPrice: 0.005, outputPrice: 0.015 },
        'gpt-4o-mini': { inputPrice: 0.00015, outputPrice: 0.0006 },
        'gpt-3.5-turbo': { inputPrice: 0.001, outputPrice: 0.002 }
      },
      currency: 'USD'
    });
    
    // Anthropic pricing
    this.pricingTables.set('anthropic', {
      models: {
        'claude-3-5-sonnet-20241022': { inputPrice: 0.003, outputPrice: 0.015 },
        'claude-3-haiku-20240307': { inputPrice: 0.00025, outputPrice: 0.00125 },
        'claude-3-opus-20240229': { inputPrice: 0.015, outputPrice: 0.075 }
      },
      currency: 'USD'
    });
    
    // Google AI pricing
    this.pricingTables.set('google', {
      models: {
        'gemini-1.5-pro': { inputPrice: 0.0025, outputPrice: 0.01 },
        'gemini-1.5-flash': { inputPrice: 0.000075, outputPrice: 0.0003 }
      },
      currency: 'USD'
    });
  }
}
```

### 5.2 Usage Tracking Service

```typescript
interface UsageTracker {
  trackUsage(event: UsageEvent): Promise<void>;
  getUsageSummary(
    workspaceId: string,
    timeRange: TimeRange
  ): Promise<UsageSummary>;
}

interface UsageEvent {
  // Attribution
  workspaceId: string;
  projectId: string;
  cardId?: string;
  agentId?: string;
  runId?: string;
  userId?: string;
  
  // Request details
  provider: string;
  model: string;
  requestId: string;
  
  // Usage metrics
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  
  // Cost breakdown
  providerCost: number;
  customerPrice: number;
  markup: number;
  margin: number;
  
  // Timing
  requestTime: Date;
  responseTime: number; // milliseconds
  
  // Metadata
  agentTask?: string;
  requestSize: number; // bytes
  responseSize: number; // bytes
}

class CloudUsageTracker implements UsageTracker {
  private pubsub: PubSub;
  private bigquery: BigQuery;
  
  async trackUsage(event: UsageEvent): Promise<void> {
    try {
      // Immediate event emission for real-time processing
      await this.pubsub.topic('llm-usage-events').publishJSON(event);
      
      // Batch insert to BigQuery for analytics
      await this.insertToBigQuery(event);
      
      // Update real-time usage counters in Redis
      await this.updateRealTimeCounters(event);
      
    } catch (error) {
      console.error('Failed to track usage:', error);
      // Don't throw - usage tracking failures shouldn't block LLM calls
    }
  }
  
  async getUsageSummary(
    workspaceId: string,
    timeRange: TimeRange
  ): Promise<UsageSummary> {
    const query = `
      SELECT 
        provider,
        model,
        agent_id,
        SUM(total_tokens) as total_tokens,
        SUM(provider_cost) as total_cost,
        SUM(customer_price) as total_price,
        COUNT(*) as total_calls,
        AVG(response_time) as avg_response_time
      FROM \`agentworks.usage_events\`
      WHERE workspace_id = @workspaceId
        AND request_time BETWEEN @startTime AND @endTime
      GROUP BY provider, model, agent_id
      ORDER BY total_price DESC
    `;
    
    const [rows] = await this.bigquery.query({
      query,
      params: {
        workspaceId,
        startTime: timeRange.start.toISOString(),
        endTime: timeRange.end.toISOString()
      }
    });
    
    return this.formatUsageSummary(rows);
  }
  
  private async updateRealTimeCounters(event: UsageEvent): Promise<void> {
    const redis = Redis.getInstance();
    const pipe = redis.pipeline();
    
    // Update workspace counters
    const wsKey = `usage:ws:${event.workspaceId}:${this.getCurrentHour()}`;
    pipe.hincrby(wsKey, 'calls', 1);
    pipe.hincrbyfloat(wsKey, 'cost', event.providerCost);
    pipe.hincrbyfloat(wsKey, 'price', event.customerPrice);
    pipe.expire(wsKey, 86400); // 24 hour TTL
    
    // Update project counters
    const projKey = `usage:proj:${event.projectId}:${this.getCurrentHour()}`;
    pipe.hincrby(projKey, 'calls', 1);
    pipe.hincrbyfloat(projKey, 'cost', event.providerCost);
    pipe.hincrbyfloat(projKey, 'price', event.customerPrice);
    pipe.expire(projKey, 86400);
    
    await pipe.exec();
  }
}
```

---

## 6. Circuit Breaker and Reliability

### 6.1 Provider Health Monitoring

```typescript
interface ProviderHealthMonitor {
  checkHealth(provider: string): Promise<ProviderHealth>;
  getCircuitBreakerState(provider: string): CircuitBreakerState;
  recordSuccess(provider: string, responseTime: number): Promise<void>;
  recordFailure(provider: string, error: Error): Promise<void>;
}

interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number; // p95 over last 5 minutes
  errorRate: number; // percentage
  lastChecked: Date;
  
  // Detailed metrics
  metrics: {
    successCount: number;
    errorCount: number;
    avgResponseTime: number;
    rateLimitHits: number;
  };
  
  // Issues if any
  issues: HealthIssue[];
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: Date;
  nextAttemptTime: Date;
  
  // Configuration
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
}

class ProviderCircuitBreaker {
  private states = new Map<string, CircuitBreakerState>();
  private healthMetrics = new Map<string, HealthMetrics>();
  
  private readonly DEFAULT_CONFIG = {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    healthWindow: 300000,   // 5 minutes
  };
  
  async executeWithCircuitBreaker<T>(
    provider: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(provider);
    
    // Check circuit breaker state
    if (state.state === 'open') {
      if (Date.now() < state.nextAttemptTime.getTime()) {
        throw new CircuitBreakerError('Circuit breaker is OPEN', provider);
      }
      // Transition to half-open
      this.setState(provider, { ...state, state: 'half-open' });
    }
    
    try {
      const startTime = Date.now();
      const result = await operation();
      const responseTime = Date.now() - startTime;
      
      await this.recordSuccess(provider, responseTime);
      return result;
      
    } catch (error) {
      await this.recordFailure(provider, error as Error);
      throw error;
    }
  }
  
  async recordSuccess(provider: string, responseTime: number): Promise<void> {
    const state = this.getState(provider);
    
    // Reset circuit breaker on success
    if (state.state !== 'closed') {
      this.setState(provider, {
        ...state,
        state: 'closed',
        failureCount: 0
      });
    }
    
    // Update health metrics
    this.updateHealthMetrics(provider, { success: true, responseTime });
  }
  
  async recordFailure(provider: string, error: Error): Promise<void> {
    const state = this.getState(provider);
    const newFailureCount = state.failureCount + 1;
    
    let newState: CircuitBreakerState['state'] = state.state;
    let nextAttemptTime = state.nextAttemptTime;
    
    // Check if we should open the circuit
    if (newFailureCount >= this.DEFAULT_CONFIG.failureThreshold) {
      newState = 'open';
      nextAttemptTime = new Date(Date.now() + this.DEFAULT_CONFIG.recoveryTimeout);
    }
    
    this.setState(provider, {
      state: newState,
      failureCount: newFailureCount,
      lastFailureTime: new Date(),
      nextAttemptTime
    });
    
    // Update health metrics
    this.updateHealthMetrics(provider, { success: false, error });
  }
  
  private updateHealthMetrics(
    provider: string,
    event: { success: boolean; responseTime?: number; error?: Error }
  ): void {
    let metrics = this.healthMetrics.get(provider) || {
      successCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      recentEvents: []
    };
    
    const now = Date.now();
    const windowStart = now - this.DEFAULT_CONFIG.healthWindow;
    
    // Remove old events
    metrics.recentEvents = metrics.recentEvents.filter(
      e => e.timestamp > windowStart
    );
    
    // Add new event
    metrics.recentEvents.push({
      timestamp: now,
      success: event.success,
      responseTime: event.responseTime,
      error: event.error?.message
    });
    
    // Update counters
    if (event.success) {
      metrics.successCount++;
      metrics.totalResponseTime += event.responseTime || 0;
    } else {
      metrics.errorCount++;
    }
    
    this.healthMetrics.set(provider, metrics);
  }
}
```

### 6.2 Automatic Failover System

```typescript
interface FailoverManager {
  handleProviderFailure(
    originalProvider: string,
    request: ChatRequest
  ): Promise<ChatResponse>;
}

class IntelligentFailoverManager implements FailoverManager {
  private providerSelector: ProviderSelector;
  private circuitBreaker: ProviderCircuitBreaker;
  private usageTracker: UsageTracker;
  
  async handleProviderFailure(
    originalProvider: string,
    request: ChatRequest
  ): Promise<ChatResponse> {
    // Get agent's fallback configuration
    const agentConfig = await this.getAgentConfig(request.agentId);
    const fallbackOptions = agentConfig.fallbackProviders || [];
    
    // Try fallback providers in order
    for (const fallback of fallbackOptions) {
      try {
        // Check if this provider is healthy
        const health = await this.circuitBreaker.getState(fallback.provider);
        if (health.state === 'open') {
          continue; // Skip unhealthy providers
        }
        
        // Modify request for fallback provider
        const fallbackRequest = {
          ...request,
          model: fallback.model,
          provider: fallback.provider
        };
        
        // Attempt the call
        const response = await this.makeProviderCall(fallback.provider, fallbackRequest);
        
        // Track the fallback usage
        await this.trackFailoverUsage(originalProvider, fallback.provider, request);
        
        return response;
        
      } catch (error) {
        console.warn(`Fallback provider ${fallback.provider} also failed:`, error);
        continue;
      }
    }
    
    throw new Error(`All providers failed for agent ${request.agentId}`);
  }
  
  private async trackFailoverUsage(
    originalProvider: string,
    usedProvider: string,
    request: ChatRequest
  ): Promise<void> {
    // Emit failover event for monitoring
    await this.usageTracker.trackEvent({
      type: 'provider_failover',
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      agentId: request.agentId,
      originalProvider,
      usedProvider,
      timestamp: new Date()
    });
  }
}
```

---

## 7. Rate Limiting and Quota Management

### 7.1 Multi-Level Rate Limiting

```typescript
interface RateLimitManager {
  checkRateLimit(
    workspaceId: string,
    provider: string,
    request: ChatRequest
  ): Promise<RateLimitResult>;
}

interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: Date;
  quotaInfo?: QuotaInfo;
}

class HierarchicalRateLimiter implements RateLimitManager {
  private redis: Redis;
  private quotaManager: QuotaManager;
  
  async checkRateLimit(
    workspaceId: string,
    provider: string,
    request: ChatRequest
  ): Promise<RateLimitResult> {
    // Check multiple rate limit layers
    const checks = await Promise.all([
      this.checkProviderRateLimit(provider),
      this.checkWorkspaceRateLimit(workspaceId),
      this.checkAgentRateLimit(request.agentId, workspaceId),
      this.checkUserRateLimit(request.userId, workspaceId)
    ]);
    
    // Find the most restrictive limit
    const restrictiveCheck = checks.find(check => !check.allowed);
    if (restrictiveCheck) {
      return restrictiveCheck;
    }
    
    // All checks passed
    return {
      allowed: true,
      remainingRequests: Math.min(...checks.map(c => c.remainingRequests)),
      resetTime: new Date(Math.max(...checks.map(c => c.resetTime.getTime())))
    };
  }
  
  private async checkWorkspaceRateLimit(workspaceId: string): Promise<RateLimitResult> {
    const key = `rate_limit:workspace:${workspaceId}`;
    const window = 3600; // 1 hour
    const limit = await this.getWorkspaceRateLimit(workspaceId);
    
    return this.slidingWindowRateLimit(key, limit, window);
  }
  
  private async checkAgentRateLimit(
    agentId: string,
    workspaceId: string
  ): Promise<RateLimitResult> {
    const key = `rate_limit:agent:${workspaceId}:${agentId}`;
    const window = 600; // 10 minutes
    const limit = 100; // Max 100 requests per 10 minutes per agent
    
    return this.slidingWindowRateLimit(key, limit, window);
  }
  
  private async slidingWindowRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    const pipe = this.redis.pipeline();
    
    // Remove old entries
    pipe.zremrangebyscore(key, 0, windowStart);
    
    // Count current entries
    pipe.zcard(key);
    
    // Add current request
    pipe.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration
    pipe.expire(key, windowSeconds);
    
    const results = await pipe.exec();
    const currentCount = results?.[1]?.[1] as number || 0;
    
    const allowed = currentCount < limit;
    const remainingRequests = Math.max(0, limit - currentCount - 1);
    const resetTime = new Date(now + (windowSeconds * 1000));
    
    if (!allowed) {
      // Remove the added request since it's not allowed
      await this.redis.zrem(key, `${now}-${Math.random()}`);
    }
    
    return {
      allowed,
      remainingRequests,
      resetTime
    };
  }
}
```

---

## 8. Cost Optimization and Analytics

### 8.1 Cost Optimization Engine

```typescript
interface CostOptimizer {
  analyzeUsagePatterns(workspaceId: string): Promise<OptimizationRecommendations>;
  suggestProviderChanges(agentId: string): Promise<ProviderRecommendation[]>;
  detectAnomalies(workspaceId: string): Promise<CostAnomaly[]>;
}

interface OptimizationRecommendations {
  totalSavingsPotential: number; // USD per month
  recommendations: Recommendation[];
  riskAssessment: RiskLevel;
}

interface Recommendation {
  type: 'provider_change' | 'model_downgrade' | 'usage_optimization' | 'batch_requests';
  description: string;
  potentialSavings: number; // USD per month
  implementation: {
    complexity: 'low' | 'medium' | 'high';
    estimatedTime: string;
    steps: string[];
  };
  risks: string[];
}

class IntelligentCostOptimizer implements CostOptimizer {
  private usageAnalyzer: UsageAnalyzer;
  private performanceTracker: PerformanceTracker;
  
  async analyzeUsagePatterns(workspaceId: string): Promise<OptimizationRecommendations> {
    // Analyze last 30 days of usage
    const usageData = await this.usageAnalyzer.getDetailedUsage(workspaceId, {
      days: 30,
      groupBy: ['agent', 'provider', 'model', 'hour_of_day', 'day_of_week']
    });
    
    const recommendations: Recommendation[] = [];
    let totalSavings = 0;
    
    // Analyze provider efficiency per agent
    for (const agent of usageData.agents) {
      const providerRecs = await this.analyzeAgentProviderEfficiency(agent);
      recommendations.push(...providerRecs);
      totalSavings += providerRecs.reduce((sum, rec) => sum + rec.potentialSavings, 0);
    }
    
    // Analyze model usage patterns
    const modelRecs = await this.analyzeModelUsage(usageData);
    recommendations.push(...modelRecs);
    totalSavings += modelRecs.reduce((sum, rec) => sum + rec.potentialSavings, 0);
    
    // Analyze usage timing patterns
    const timingRecs = await this.analyzeUsageTiming(usageData);
    recommendations.push(...timingRecs);
    totalSavings += timingRecs.reduce((sum, rec) => sum + rec.potentialSavings, 0);
    
    return {
      totalSavingsPotential: totalSavings,
      recommendations: recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings),
      riskAssessment: this.assessOverallRisk(recommendations)
    };
  }
  
  private async analyzeAgentProviderEfficiency(
    agentUsage: AgentUsageData
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // Compare cost vs performance for each provider used by this agent
    const providerPerformance = await this.performanceTracker.getProviderPerformance(
      agentUsage.agentId,
      agentUsage.providers
    );
    
    for (const currentProvider of agentUsage.providers) {
      const alternatives = providerPerformance.filter(p => p.provider !== currentProvider.provider);
      
      for (const alternative of alternatives) {
        // Check if alternative provides similar quality at lower cost
        if (
          alternative.qualityScore >= currentProvider.qualityScore * 0.95 && // Within 5% quality
          alternative.costPerToken < currentProvider.costPerToken * 0.8 // At least 20% cheaper
        ) {
          const monthlySavings = this.calculateMonthlySavings(
            agentUsage,
            currentProvider,
            alternative
          );
          
          if (monthlySavings > 5) { // Only recommend if savings > $5/month
            recommendations.push({
              type: 'provider_change',
              description: `Switch ${agentUsage.agentId} from ${currentProvider.provider} to ${alternative.provider}`,
              potentialSavings: monthlySavings,
              implementation: {
                complexity: 'low',
                estimatedTime: '5 minutes',
                steps: [
                  `Update agent configuration for ${agentUsage.agentId}`,
                  `Change default provider from ${currentProvider.provider} to ${alternative.provider}`,
                  'Test with a few sample requests',
                  'Monitor performance for 48 hours'
                ]
              },
              risks: [
                'Slight difference in response style',
                'Potential latency changes',
                'Different rate limits'
              ]
            });
          }
        }
      }
    }
    
    return recommendations;
  }
}
```

This comprehensive LLM routing architecture provides AgentWorks with a robust, scalable, and cost-effective foundation for managing multiple AI providers while maintaining strict cost controls and high reliability standards.