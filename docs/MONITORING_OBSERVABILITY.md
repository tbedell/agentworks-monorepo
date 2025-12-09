# AgentWorks - Monitoring, Observability, and Cost Tracking

**Version:** 1.0  
**Date:** 2025-12-02  
**Owner:** Architect Agent  
**Status:** Production Ready  

---

## 1. Observability Overview

The AgentWorks platform implements comprehensive monitoring, observability, and cost tracking systems designed for multi-tenant SaaS operations. The architecture provides real-time insights into system performance, user behavior, cost attribution, and business metrics while maintaining strict data isolation and privacy.

### 1.1 Observability Pillars

- **Metrics**: Quantitative measurements of system and business performance
- **Logs**: Detailed event records for debugging and audit trails  
- **Traces**: Distributed request tracking across microservices
- **Profiles**: Performance profiling for optimization opportunities
- **Costs**: Real-time cost attribution and optimization recommendations

---

## 2. Metrics Collection and Analysis

### 2.1 Application Metrics Architecture

```typescript
interface MetricsCollector {
  // System metrics
  recordSystemMetric(metric: SystemMetric): Promise<void>;
  recordBusinessMetric(metric: BusinessMetric): Promise<void>;
  recordPerformanceMetric(metric: PerformanceMetric): Promise<void>;
  
  // Custom metrics
  incrementCounter(name: string, labels: Labels, value?: number): void;
  recordHistogram(name: string, labels: Labels, value: number): void;
  setGauge(name: string, labels: Labels, value: number): void;
  
  // Batch operations
  recordMetrics(metrics: Metric[]): Promise<void>;
  flush(): Promise<void>;
}

interface SystemMetric {
  name: string;
  value: number;
  timestamp: Date;
  labels: {
    service: string;
    environment: string;
    version: string;
    region: string;
  };
  metadata?: Record<string, any>;
}

interface BusinessMetric {
  name: string;
  value: number;
  timestamp: Date;
  workspaceId: string;
  labels: {
    metric_type: 'usage' | 'engagement' | 'revenue' | 'conversion';
    category: string;
  };
  dimensions?: Record<string, string>;
}

class CloudMonitoringCollector implements MetricsCollector {
  private monitoringClient: MetricServiceClient;
  private metricBuffer: TimeSeries[] = [];
  private flushInterval: NodeJS.Timer;
  
  constructor(projectId: string) {
    this.monitoringClient = new MetricServiceClient();
    
    // Flush metrics every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);
  }
  
  async recordSystemMetric(metric: SystemMetric): Promise<void> {
    const timeSeries: TimeSeries = {
      metric: {
        type: `custom.googleapis.com/agentworks/${metric.name}`,
        labels: metric.labels
      },
      resource: {
        type: 'cloud_run_revision',
        labels: {
          project_id: this.projectId,
          service_name: metric.labels.service,
          revision_name: `${metric.labels.service}-${metric.labels.version}`
        }
      },
      points: [{
        interval: {
          endTime: {
            seconds: Math.floor(metric.timestamp.getTime() / 1000)
          }
        },
        value: {
          doubleValue: metric.value
        }
      }]
    };
    
    this.metricBuffer.push(timeSeries);
    
    // Flush if buffer is getting large
    if (this.metricBuffer.length >= 200) {
      await this.flush();
    }
  }
  
  async recordBusinessMetric(metric: BusinessMetric): Promise<void> {
    // Store business metrics in BigQuery for analysis
    await this.insertBusinessMetric(metric);
    
    // Also send to monitoring for alerting
    await this.recordSystemMetric({
      name: `business/${metric.name}`,
      value: metric.value,
      timestamp: metric.timestamp,
      labels: {
        service: 'business-metrics',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || 'unknown',
        region: process.env.GCP_REGION || 'us-central1'
      }
    });
  }
  
  async flush(): Promise<void> {
    if (this.metricBuffer.length === 0) return;
    
    try {
      const projectPath = this.monitoringClient.projectPath(this.projectId);
      
      await this.monitoringClient.createTimeSeries({
        name: projectPath,
        timeSeries: this.metricBuffer
      });
      
      this.metricBuffer = [];
      
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Keep metrics in buffer for retry
    }
  }
}
```

### 2.2 Key Performance Indicators (KPIs)

```typescript
// Application Performance Metrics
const APPLICATION_METRICS = {
  // Request metrics
  HTTP_REQUEST_DURATION: 'http_request_duration_seconds',
  HTTP_REQUEST_COUNT: 'http_request_count_total',
  HTTP_REQUEST_SIZE: 'http_request_size_bytes',
  HTTP_RESPONSE_SIZE: 'http_response_size_bytes',
  
  // Agent execution metrics
  AGENT_RUN_DURATION: 'agent_run_duration_seconds',
  AGENT_RUN_COUNT: 'agent_run_count_total',
  AGENT_SUCCESS_RATE: 'agent_success_rate',
  AGENT_TOKEN_USAGE: 'agent_token_usage_total',
  
  // Database metrics
  DB_CONNECTION_COUNT: 'database_connections_active',
  DB_QUERY_DURATION: 'database_query_duration_seconds',
  DB_TRANSACTION_COUNT: 'database_transactions_total',
  
  // Cache metrics
  CACHE_HIT_RATE: 'cache_hit_rate',
  CACHE_OPERATION_DURATION: 'cache_operation_duration_seconds',
  
  // WebSocket metrics
  WS_CONNECTION_COUNT: 'websocket_connections_active',
  WS_MESSAGE_COUNT: 'websocket_messages_total',
  WS_CONNECTION_DURATION: 'websocket_connection_duration_seconds'
} as const;

// Business Metrics
const BUSINESS_METRICS = {
  // User engagement
  DAILY_ACTIVE_USERS: 'daily_active_users',
  WEEKLY_ACTIVE_USERS: 'weekly_active_users',
  MONTHLY_ACTIVE_USERS: 'monthly_active_users',
  SESSION_DURATION: 'user_session_duration_seconds',
  
  // Usage patterns
  CARDS_CREATED: 'cards_created_total',
  AGENT_RUNS_TRIGGERED: 'agent_runs_triggered_total',
  PROJECTS_CREATED: 'projects_created_total',
  WORKSPACES_CREATED: 'workspaces_created_total',
  
  // Revenue metrics
  MONTHLY_RECURRING_REVENUE: 'monthly_recurring_revenue',
  AVERAGE_REVENUE_PER_USER: 'average_revenue_per_user',
  USAGE_REVENUE: 'usage_revenue_total',
  CUSTOMER_LIFETIME_VALUE: 'customer_lifetime_value',
  
  // Cost metrics
  INFRASTRUCTURE_COST: 'infrastructure_cost_total',
  LLM_PROVIDER_COST: 'llm_provider_cost_total',
  COST_PER_REQUEST: 'cost_per_request',
  GROSS_MARGIN: 'gross_margin_percentage'
} as const;

class BusinessMetricsCollector {
  private bigqueryClient: BigQuery;
  private metricsTable: string;
  
  async recordUserEngagement(event: UserEngagementEvent): Promise<void> {
    const metric: BusinessMetric = {
      name: 'user_engagement',
      value: 1,
      timestamp: new Date(),
      workspaceId: event.workspaceId,
      labels: {
        metric_type: 'engagement',
        category: event.action
      },
      dimensions: {
        user_id: event.userId,
        feature: event.feature,
        duration: event.duration?.toString()
      }
    };
    
    await this.insertMetric(metric);
  }
  
  async recordRevenueEvent(event: RevenueEvent): Promise<void> {
    const metric: BusinessMetric = {
      name: 'revenue',
      value: event.amount,
      timestamp: new Date(),
      workspaceId: event.workspaceId,
      labels: {
        metric_type: 'revenue',
        category: event.type
      },
      dimensions: {
        currency: event.currency,
        plan: event.plan,
        billing_period: event.billingPeriod
      }
    };
    
    await this.insertMetric(metric);
  }
  
  async recordCostEvent(event: CostEvent): Promise<void> {
    const metric: BusinessMetric = {
      name: 'cost',
      value: event.amount,
      timestamp: new Date(),
      workspaceId: event.workspaceId,
      labels: {
        metric_type: 'cost',
        category: event.category
      },
      dimensions: {
        provider: event.provider,
        service: event.service,
        resource_type: event.resourceType
      }
    };
    
    await this.insertMetric(metric);
  }
}
```

---

## 3. Distributed Tracing

### 3.1 OpenTelemetry Integration

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { GoogleCloudTraceExporter } from '@opentelemetry/exporter-gcp-trace';

interface TracingService {
  startSpan(name: string, attributes?: SpanAttributes): Span;
  recordException(span: Span, exception: Error): void;
  addEvent(span: Span, name: string, attributes?: SpanAttributes): void;
  setStatus(span: Span, status: SpanStatus): void;
}

interface SpanAttributes {
  [key: string]: string | number | boolean;
}

interface SpanStatus {
  code: 'OK' | 'ERROR' | 'TIMEOUT';
  message?: string;
}

class AgentWorksTracing implements TracingService {
  private sdk: NodeSDK;
  
  constructor() {
    this.sdk = new NodeSDK({
      resource: Resource.default().merge(
        new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: 'agentworks',
          [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
        })
      ),
      traceExporter: new GoogleCloudTraceExporter({
        projectId: process.env.GOOGLE_CLOUD_PROJECT
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false // Disable filesystem instrumentation for performance
          },
          '@opentelemetry/instrumentation-http': {
            requestHook: this.httpRequestHook,
            responseHook: this.httpResponseHook
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true
          },
          '@opentelemetry/instrumentation-prisma': {
            enabled: true
          }
        })
      ]
    });
    
    this.sdk.start();
  }
  
  startSpan(name: string, attributes?: SpanAttributes): Span {
    const tracer = trace.getTracer('agentworks');
    
    return tracer.startSpan(name, {
      attributes: {
        'service.name': 'agentworks',
        'service.version': process.env.APP_VERSION || '1.0.0',
        ...attributes
      }
    });
  }
  
  private httpRequestHook(span: Span, request: IncomingMessage): void {
    const userAgent = request.headers['user-agent'];
    const workspace = request.headers['x-workspace-id'];
    
    span.setAttributes({
      'http.user_agent': userAgent || '',
      'agentworks.workspace_id': workspace || '',
      'agentworks.request_id': request.headers['x-request-id'] || ''
    });
  }
  
  private httpResponseHook(span: Span, response: ServerResponse): void {
    const statusCode = response.statusCode;
    
    if (statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${statusCode}`
      });
    }
  }
}

// Custom instrumentation for agent operations
class AgentOperationTracing {
  async traceAgentRun<T>(
    agentId: string,
    cardId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const span = trace.getActiveTracer().startSpan('agent.run', {
      attributes: {
        'agent.id': agentId,
        'agent.card_id': cardId,
        'agent.operation': 'execute'
      }
    });
    
    try {
      const result = await operation();
      
      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        'agent.result.success': true
      });
      
      return result;
      
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message
      });
      
      throw error;
      
    } finally {
      span.end();
    }
  }
  
  async traceLLMCall<T>(
    provider: string,
    model: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const span = trace.getActiveTracer().startSpan('llm.call', {
      attributes: {
        'llm.provider': provider,
        'llm.model': model,
        'llm.operation': 'chat_completion'
      }
    });
    
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      span.setAttributes({
        'llm.duration_ms': duration,
        'llm.success': true
      });
      
      return result;
      
    } catch (error) {
      span.recordException(error as Error);
      span.setAttributes({
        'llm.error': (error as Error).message
      });
      
      throw error;
      
    } finally {
      span.end();
    }
  }
}
```

---

## 4. Comprehensive Logging Strategy

### 4.1 Structured Logging

```typescript
interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  
  // Business event logging
  logBusinessEvent(event: BusinessEvent): void;
  logSecurityEvent(event: SecurityEvent): void;
  logAuditEvent(event: AuditEvent): void;
}

interface LogContext {
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  requestId?: string;
  sessionId?: string;
  [key: string]: any;
}

interface BusinessEvent {
  type: string;
  category: 'user_action' | 'system_event' | 'business_metric';
  workspaceId: string;
  userId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

class StructuredLogger implements Logger {
  private winston: winston.Logger;
  
  constructor() {
    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format((info) => {
          // Add common fields
          info.service = 'agentworks';
          info.version = process.env.APP_VERSION || '1.0.0';
          info.environment = process.env.NODE_ENV || 'development';
          
          // Add trace context if available
          const span = trace.getActiveSpan();
          if (span) {
            const spanContext = span.spanContext();
            info.trace_id = spanContext.traceId;
            info.span_id = spanContext.spanId;
          }
          
          return info;
        })()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ]
    });
    
    // Add Cloud Logging transport in production
    if (process.env.NODE_ENV === 'production') {
      this.winston.add(new winston.transports.Http({
        host: 'logging.googleapis.com',
        path: '/v2/entries:write',
        ssl: true
      }));
    }
  }
  
  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, { context });
  }
  
  info(message: string, context?: LogContext): void {
    this.winston.info(message, { context });
  }
  
  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, { context });
  }
  
  error(message: string, error?: Error, context?: LogContext): void {
    this.winston.error(message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      context
    });
  }
  
  logBusinessEvent(event: BusinessEvent): void {
    this.winston.info('Business event', {
      event_type: 'business',
      business_event: event
    });
  }
  
  logSecurityEvent(event: SecurityEvent): void {
    this.winston.warn('Security event', {
      event_type: 'security',
      security_event: event
    });
  }
  
  logAuditEvent(event: AuditEvent): void {
    this.winston.info('Audit event', {
      event_type: 'audit',
      audit_event: event
    });
  }
}
```

### 4.2 Log Aggregation and Analysis

```typescript
interface LogAnalyzer {
  analyzeErrorPatterns(timeRange: TimeRange): Promise<ErrorPattern[]>;
  detectAnomalies(timeRange: TimeRange): Promise<LogAnomaly[]>;
  generateInsights(workspaceId: string, timeRange: TimeRange): Promise<LogInsight[]>;
}

interface ErrorPattern {
  errorMessage: string;
  frequency: number;
  affectedServices: string[];
  suggestedFix?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface LogAnomaly {
  type: 'spike' | 'drop' | 'pattern_change';
  metric: string;
  description: string;
  severity: number; // 0-100
  timestamp: Date;
  affectedResources: string[];
}

class BigQueryLogAnalyzer implements LogAnalyzer {
  private bigquery: BigQuery;
  
  async analyzeErrorPatterns(timeRange: TimeRange): Promise<ErrorPattern[]> {
    const query = `
      SELECT 
        JSON_EXTRACT_SCALAR(jsonPayload, '$.error.message') as error_message,
        COUNT(*) as frequency,
        ARRAY_AGG(DISTINCT jsonPayload.service) as affected_services,
        severity
      FROM \`${this.getLogTable()}\`
      WHERE timestamp BETWEEN @start_time AND @end_time
        AND severity IN ('ERROR', 'CRITICAL')
        AND jsonPayload.error.message IS NOT NULL
      GROUP BY error_message, severity
      HAVING frequency > 10
      ORDER BY frequency DESC
      LIMIT 50
    `;
    
    const [rows] = await this.bigquery.query({
      query,
      params: {
        start_time: timeRange.start.toISOString(),
        end_time: timeRange.end.toISOString()
      }
    });
    
    return rows.map(row => ({
      errorMessage: row.error_message,
      frequency: row.frequency,
      affectedServices: row.affected_services,
      severity: this.mapSeverity(row.severity),
      suggestedFix: this.generateSuggestedFix(row.error_message)
    }));
  }
  
  async detectAnomalies(timeRange: TimeRange): Promise<LogAnomaly[]> {
    // Use statistical analysis to detect anomalies
    const query = `
      WITH hourly_stats AS (
        SELECT 
          DATETIME_TRUNC(DATETIME(timestamp), HOUR) as hour,
          severity,
          COUNT(*) as log_count
        FROM \`${this.getLogTable()}\`
        WHERE timestamp BETWEEN @start_time AND @end_time
        GROUP BY hour, severity
      ),
      stats_with_avg AS (
        SELECT 
          *,
          AVG(log_count) OVER (
            PARTITION BY severity 
            ORDER BY hour 
            ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
          ) as rolling_avg,
          STDDEV(log_count) OVER (
            PARTITION BY severity 
            ORDER BY hour 
            ROWS BETWEEN 23 PRECEDING AND CURRENT ROW
          ) as rolling_stddev
        FROM hourly_stats
      )
      SELECT 
        hour,
        severity,
        log_count,
        rolling_avg,
        rolling_stddev,
        ABS(log_count - rolling_avg) / NULLIF(rolling_stddev, 0) as z_score
      FROM stats_with_avg
      WHERE ABS(log_count - rolling_avg) / NULLIF(rolling_stddev, 0) > 3
      ORDER BY z_score DESC
    `;
    
    const [rows] = await this.bigquery.query({
      query,
      params: {
        start_time: timeRange.start.toISOString(),
        end_time: timeRange.end.toISOString()
      }
    });
    
    return rows.map(row => ({
      type: row.log_count > row.rolling_avg ? 'spike' : 'drop',
      metric: `${row.severity}_logs_per_hour`,
      description: `${row.severity} log ${row.log_count > row.rolling_avg ? 'spike' : 'drop'} detected`,
      severity: Math.min(100, Math.floor(row.z_score * 10)),
      timestamp: new Date(row.hour),
      affectedResources: ['logging_system']
    }));
  }
  
  private generateSuggestedFix(errorMessage: string): string | undefined {
    const fixes = {
      'connection timeout': 'Consider increasing connection timeout or implementing retry logic',
      'rate limit exceeded': 'Implement exponential backoff and respect rate limits',
      'authentication failed': 'Check API key validity and rotation schedule',
      'database deadlock': 'Review transaction isolation levels and query optimization'
    };
    
    for (const [pattern, fix] of Object.entries(fixes)) {
      if (errorMessage.toLowerCase().includes(pattern)) {
        return fix;
      }
    }
    
    return undefined;
  }
}
```

---

## 5. Real-Time Cost Tracking

### 5.1 Cost Attribution System

```typescript
interface CostTracker {
  trackResourceCost(cost: ResourceCost): Promise<void>;
  getWorkspaceCosts(workspaceId: string, timeRange: TimeRange): Promise<CostBreakdown>;
  getCostTrends(workspaceId: string, timeRange: TimeRange): Promise<CostTrend[]>;
  generateCostOptimizationReport(workspaceId: string): Promise<OptimizationReport>;
}

interface ResourceCost {
  workspaceId: string;
  projectId?: string;
  cardId?: string;
  resourceType: 'compute' | 'storage' | 'network' | 'llm_api' | 'database';
  resourceId: string;
  provider: string;
  cost: number;
  currency: 'USD';
  timestamp: Date;
  metadata: Record<string, any>;
}

interface CostBreakdown {
  totalCost: number;
  currency: string;
  period: TimeRange;
  breakdown: {
    byResourceType: Record<string, number>;
    byProvider: Record<string, number>;
    byProject: Record<string, number>;
    byDay: Array<{ date: Date; cost: number }>;
  };
  projectedMonthlyCost: number;
}

class RealTimeCostTracker implements CostTracker {
  private bigquery: BigQuery;
  private redis: Redis;
  private pubsub: PubSub;
  
  async trackResourceCost(cost: ResourceCost): Promise<void> {
    // Real-time cost accumulation in Redis
    await this.updateRealTimeCosts(cost);
    
    // Batch insert to BigQuery for analysis
    await this.insertCostRecord(cost);
    
    // Emit cost event for real-time alerts
    await this.publishCostEvent(cost);
  }
  
  private async updateRealTimeCosts(cost: ResourceCost): Promise<void> {
    const pipe = this.redis.pipeline();
    const hour = new Date(cost.timestamp).toISOString().substring(0, 13);
    
    // Update workspace hourly costs
    const wsHourKey = `cost:ws:${cost.workspaceId}:${hour}`;
    pipe.hincrbyfloat(wsHourKey, 'total', cost.cost);
    pipe.hincrbyfloat(wsHourKey, cost.resourceType, cost.cost);
    pipe.hincrbyfloat(wsHourKey, cost.provider, cost.cost);
    pipe.expire(wsHourKey, 86400 * 7); // 7 day TTL
    
    // Update project costs if specified
    if (cost.projectId) {
      const projHourKey = `cost:proj:${cost.projectId}:${hour}`;
      pipe.hincrbyfloat(projHourKey, 'total', cost.cost);
      pipe.hincrbyfloat(projHourKey, cost.resourceType, cost.cost);
      pipe.expire(projHourKey, 86400 * 7);
    }
    
    // Update daily totals
    const day = cost.timestamp.toISOString().substring(0, 10);
    const wsDayKey = `cost:ws:${cost.workspaceId}:${day}`;
    pipe.hincrbyfloat(wsDayKey, 'total', cost.cost);
    pipe.expire(wsDayKey, 86400 * 90); // 90 day TTL
    
    await pipe.exec();
  }
  
  async getWorkspaceCosts(
    workspaceId: string,
    timeRange: TimeRange
  ): Promise<CostBreakdown> {
    const query = `
      SELECT 
        resource_type,
        provider,
        project_id,
        DATE(timestamp) as date,
        SUM(cost) as total_cost
      FROM \`${this.getCostTable()}\`
      WHERE workspace_id = @workspace_id
        AND timestamp BETWEEN @start_time AND @end_time
      GROUP BY resource_type, provider, project_id, date
      ORDER BY date DESC
    `;
    
    const [rows] = await this.bigquery.query({
      query,
      params: {
        workspace_id: workspaceId,
        start_time: timeRange.start.toISOString(),
        end_time: timeRange.end.toISOString()
      }
    });
    
    const totalCost = rows.reduce((sum, row) => sum + row.total_cost, 0);
    
    // Calculate breakdowns
    const byResourceType = this.groupBy(rows, 'resource_type', 'total_cost');
    const byProvider = this.groupBy(rows, 'provider', 'total_cost');
    const byProject = this.groupBy(rows, 'project_id', 'total_cost');
    const byDay = this.groupByDate(rows, 'date', 'total_cost');
    
    // Project monthly cost based on daily average
    const days = Math.max(1, (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = totalCost / days;
    const projectedMonthlyCost = dailyAverage * 30;
    
    return {
      totalCost,
      currency: 'USD',
      period: timeRange,
      breakdown: {
        byResourceType,
        byProvider,
        byProject,
        byDay
      },
      projectedMonthlyCost
    };
  }
  
  async generateCostOptimizationReport(workspaceId: string): Promise<OptimizationReport> {
    // Analyze last 30 days of costs
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const costs = await this.getWorkspaceCosts(workspaceId, {
      start: startDate,
      end: endDate
    });
    
    const recommendations: OptimizationRecommendation[] = [];
    
    // Check for high LLM API costs
    const llmCost = costs.breakdown.byResourceType['llm_api'] || 0;
    const llmPercentage = (llmCost / costs.totalCost) * 100;
    
    if (llmPercentage > 60) {
      recommendations.push({
        type: 'cost_optimization',
        priority: 'high',
        category: 'llm_usage',
        description: 'LLM API costs represent a high percentage of total costs',
        recommendation: 'Consider optimizing agent configurations or using more cost-effective models',
        potentialSavings: llmCost * 0.2, // Estimate 20% savings
        implementationEffort: 'medium'
      });
    }
    
    // Check for unused resources
    const computeCost = costs.breakdown.byResourceType['compute'] || 0;
    if (computeCost > 0) {
      recommendations.push({
        type: 'resource_optimization',
        priority: 'medium',
        category: 'compute',
        description: 'Review compute resource utilization',
        recommendation: 'Consider right-sizing or implementing auto-scaling',
        potentialSavings: computeCost * 0.15,
        implementationEffort: 'low'
      });
    }
    
    return {
      workspaceId,
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      totalCost: costs.totalCost,
      potentialSavings: recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0),
      recommendations
    };
  }
}
```

### 5.2 Cost Alerting System

```typescript
interface CostAlerting {
  setupBudgetAlert(workspaceId: string, budget: BudgetConfig): Promise<void>;
  checkCostThresholds(): Promise<void>;
  sendCostAlert(alert: CostAlert): Promise<void>;
}

interface BudgetConfig {
  workspaceId: string;
  monthlyLimit: number;
  currency: 'USD';
  alertThresholds: number[]; // Percentage thresholds [50, 75, 90, 100]
  notificationChannels: string[];
}

interface CostAlert {
  workspaceId: string;
  alertType: 'budget_threshold' | 'anomaly' | 'spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentCost: number;
  threshold: number;
  projectedMonthlyCost: number;
  message: string;
  recommendations?: string[];
}

class CostAlertingService implements CostAlerting {
  private scheduler: JobScheduler;
  private notificationService: NotificationService;
  private costTracker: CostTracker;
  
  async setupBudgetAlert(workspaceId: string, budget: BudgetConfig): Promise<void> {
    // Store budget configuration
    await this.storeBudgetConfig(budget);
    
    // Schedule daily cost checks
    await this.scheduler.scheduleJob(
      `cost-check-${workspaceId}`,
      '0 9 * * *', // Daily at 9 AM
      async () => {
        await this.checkWorkspaceCosts(workspaceId);
      }
    );
  }
  
  async checkCostThresholds(): Promise<void> {
    const budgets = await this.getAllBudgetConfigs();
    
    for (const budget of budgets) {
      await this.checkWorkspaceCosts(budget.workspaceId);
    }
  }
  
  private async checkWorkspaceCosts(workspaceId: string): Promise<void> {
    const budget = await this.getBudgetConfig(workspaceId);
    if (!budget) return;
    
    // Get month-to-date costs
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const now = new Date();
    
    const costs = await this.costTracker.getWorkspaceCosts(workspaceId, {
      start: monthStart,
      end: now
    });
    
    // Check each threshold
    for (const threshold of budget.alertThresholds) {
      const thresholdAmount = (budget.monthlyLimit * threshold) / 100;
      
      if (costs.totalCost >= thresholdAmount && !await this.hasRecentAlert(workspaceId, threshold)) {
        const alert: CostAlert = {
          workspaceId,
          alertType: 'budget_threshold',
          severity: this.getSeverityForThreshold(threshold),
          currentCost: costs.totalCost,
          threshold: thresholdAmount,
          projectedMonthlyCost: costs.projectedMonthlyCost,
          message: `Monthly cost budget ${threshold}% threshold reached`,
          recommendations: this.generateCostRecommendations(costs, budget)
        };
        
        await this.sendCostAlert(alert);
        await this.recordAlert(workspaceId, threshold);
      }
    }
    
    // Check for cost anomalies
    await this.checkCostAnomalies(workspaceId, costs);
  }
  
  private async checkCostAnomalies(workspaceId: string, currentCosts: CostBreakdown): Promise<void> {
    // Compare with historical patterns
    const historicalPeriod = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)     // 7 days ago
    };
    
    const historicalCosts = await this.costTracker.getWorkspaceCosts(workspaceId, historicalPeriod);
    
    // Calculate daily average costs
    const currentDailyAvg = currentCosts.totalCost / currentCosts.breakdown.byDay.length;
    const historicalDailyAvg = historicalCosts.totalCost / historicalCosts.breakdown.byDay.length;
    
    const percentageIncrease = ((currentDailyAvg - historicalDailyAvg) / historicalDailyAvg) * 100;
    
    // Alert on significant increases
    if (percentageIncrease > 50) {
      const alert: CostAlert = {
        workspaceId,
        alertType: 'spike',
        severity: percentageIncrease > 100 ? 'critical' : 'high',
        currentCost: currentCosts.totalCost,
        threshold: historicalCosts.totalCost,
        projectedMonthlyCost: currentCosts.projectedMonthlyCost,
        message: `Cost spike detected: ${percentageIncrease.toFixed(1)}% increase in daily average`,
        recommendations: [
          'Review recent agent usage patterns',
          'Check for any unusual LLM API usage',
          'Verify compute resource utilization'
        ]
      };
      
      await this.sendCostAlert(alert);
    }
  }
  
  async sendCostAlert(alert: CostAlert): Promise<void> {
    // Send to multiple channels
    await Promise.all([
      this.sendEmailAlert(alert),
      this.sendSlackAlert(alert),
      this.recordAlertInDatabase(alert)
    ]);
  }
  
  private generateCostRecommendations(costs: CostBreakdown, budget: BudgetConfig): string[] {
    const recommendations: string[] = [];
    
    // Analyze cost breakdown for recommendations
    const llmCostPercentage = ((costs.breakdown.byResourceType['llm_api'] || 0) / costs.totalCost) * 100;
    
    if (llmCostPercentage > 50) {
      recommendations.push('Consider optimizing LLM usage - switch to more cost-effective models where appropriate');
    }
    
    if (costs.projectedMonthlyCost > budget.monthlyLimit) {
      recommendations.push('Current usage trend will exceed monthly budget - consider implementing usage limits');
    }
    
    return recommendations;
  }
}
```

---

## 6. Performance Monitoring Dashboard

### 6.1 Real-Time Dashboard Configuration

```typescript
interface DashboardConfig {
  workspaceId: string;
  dashboardType: 'operational' | 'business' | 'cost' | 'security';
  widgets: DashboardWidget[];
  refreshInterval: number; // seconds
  alerts: DashboardAlert[];
}

interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'gauge';
  title: string;
  dataSource: DataSource;
  visualization: VisualizationConfig;
  size: { width: number; height: number };
  position: { x: number; y: number };
}

const OPERATIONAL_DASHBOARD: DashboardConfig = {
  workspaceId: 'system',
  dashboardType: 'operational',
  refreshInterval: 30,
  widgets: [
    {
      id: 'request_rate',
      type: 'chart',
      title: 'Request Rate',
      dataSource: {
        query: `
          SELECT timestamp, SUM(request_count) as requests
          FROM monitoring_metrics
          WHERE metric_name = 'http_request_count'
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
          GROUP BY timestamp
          ORDER BY timestamp
        `,
        refreshInterval: 30
      },
      visualization: {
        type: 'line_chart',
        xAxis: 'timestamp',
        yAxis: 'requests',
        color: '#4285F4'
      },
      size: { width: 6, height: 4 },
      position: { x: 0, y: 0 }
    },
    {
      id: 'error_rate',
      type: 'gauge',
      title: 'Error Rate',
      dataSource: {
        query: `
          SELECT 
            SAFE_DIVIDE(
              SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END),
              COUNT(*)
            ) * 100 as error_rate
          FROM request_logs
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 5 MINUTE)
        `,
        refreshInterval: 30
      },
      visualization: {
        type: 'gauge',
        min: 0,
        max: 10,
        thresholds: [
          { value: 1, color: 'green' },
          { value: 3, color: 'yellow' },
          { value: 5, color: 'red' }
        ]
      },
      size: { width: 3, height: 3 },
      position: { x: 6, y: 0 }
    },
    {
      id: 'active_users',
      type: 'metric',
      title: 'Active Users (Last Hour)',
      dataSource: {
        query: `
          SELECT COUNT(DISTINCT user_id) as active_users
          FROM user_activity
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
        `,
        refreshInterval: 60
      },
      visualization: {
        type: 'single_value',
        format: 'number'
      },
      size: { width: 3, height: 2 },
      position: { x: 9, y: 0 }
    }
  ],
  alerts: [
    {
      condition: 'error_rate > 5',
      severity: 'high',
      notification: 'email'
    }
  ]
};

const BUSINESS_DASHBOARD: DashboardConfig = {
  workspaceId: 'system',
  dashboardType: 'business',
  refreshInterval: 300, // 5 minutes
  widgets: [
    {
      id: 'daily_revenue',
      type: 'chart',
      title: 'Daily Revenue',
      dataSource: {
        query: `
          SELECT DATE(created_at) as date, SUM(amount) as revenue
          FROM usage_events
          WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
          GROUP BY date
          ORDER BY date
        `,
        refreshInterval: 300
      },
      visualization: {
        type: 'bar_chart',
        xAxis: 'date',
        yAxis: 'revenue',
        color: '#34A853'
      },
      size: { width: 6, height: 4 },
      position: { x: 0, y: 0 }
    },
    {
      id: 'agent_usage',
      type: 'table',
      title: 'Top Agents by Usage',
      dataSource: {
        query: `
          SELECT agent_name, COUNT(*) as runs, SUM(cost) as total_cost
          FROM agent_runs
          WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
          GROUP BY agent_name
          ORDER BY runs DESC
          LIMIT 10
        `,
        refreshInterval: 300
      },
      visualization: {
        type: 'table',
        columns: [
          { field: 'agent_name', title: 'Agent' },
          { field: 'runs', title: 'Runs', format: 'number' },
          { field: 'total_cost', title: 'Cost', format: 'currency' }
        ]
      },
      size: { width: 6, height: 4 },
      position: { x: 6, y: 0 }
    }
  ],
  alerts: []
};
```

This comprehensive monitoring, observability, and cost tracking system provides AgentWorks with real-time visibility into system performance, user behavior, and cost attribution while enabling proactive optimization and alerting capabilities.