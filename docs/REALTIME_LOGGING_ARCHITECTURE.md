# AgentWorks - Real-Time Logging and Terminal Streaming Architecture

**Version:** 1.0  
**Date:** 2025-12-02  
**Owner:** Architect Agent  
**Status:** Implementation Ready  

---

## 1. System Overview

The AgentWorks Real-Time Logging System provides live terminal streaming of agent execution logs with replay capabilities, comprehensive log aggregation, and real-time monitoring. The system ensures that every agent action is visible and auditable while maintaining high performance and scalability.

### 1.1 Key Requirements

- **Real-Time Streaming**: Live log updates to connected terminals
- **Replay Functionality**: Complete replay of historical agent runs
- **Multi-Tenant Isolation**: Secure log access per workspace
- **High Throughput**: Handle thousands of concurrent agent runs
- **Durability**: Persistent storage with configurable retention
- **Search & Analytics**: Fast log search and pattern analysis
- **Low Latency**: Sub-second log delivery to connected clients

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Terminals                          │
│            WebSocket Connections per Card                      │
└─────────────────┬───────────────────────────────────────────────┘
                  │ WebSocket Protocol
┌─────────────────▼───────────────────────────────────────────────┐
│                Log Streaming Service                            │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────┐ │
│  │ Connection  │ │   Log        │ │   Replay    │ │  Search  │ │
│  │ Manager     │ │ Aggregator   │ │   Engine    │ │  Engine  │ │
│  └─────────────┘ └──────────────┘ └─────────────┘ └──────────┘ │
└─────────────────┬───────────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬─────────────┬─────────────┐
    │             │             │             │             │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│Agent  │   │Provider│   │Core   │   │Log    │   │External│
│Orchestr│   │Router │   │Service│   │Shipper│   │Services│
│ator   │   │       │   │       │   │       │   │       │
└───┬───┘   └───┬───┘   └───┬───┘   └───┬───┘   └───────┘
    │           │           │           │
┌───▼───────────▼───────────▼───────────▼───┐
│           Event Bus (Pub/Sub)             │
│      Topics: agent-logs, system-logs      │
└───┬───────────────────────────────────────┘
    │
┌───▼─────────────────────────────────────────┐
│              Storage Layer                  │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Redis  │  │PostgreSQL│  │Cloud Storage│ │
│  │ (Live)  │  │(Metadata)│  │  (Archive)  │ │
│  └─────────┘  └──────────┘  └─────────────┘ │
└─────────────────────────────────────────────┘
```

---

## 3. Log Streaming Service

### 3.1 Service Architecture

```typescript
interface LogStreamingService {
  // Connection management
  handleConnection(cardId: string, socket: WebSocket, auth: AuthContext): Promise<void>;
  handleDisconnection(connectionId: string): Promise<void>;
  
  // Real-time streaming
  streamLogs(cardId: string, runId: string): Promise<void>;
  broadcastLog(logEntry: LogEntry): Promise<void>;
  
  // Historical data
  replayRun(runId: string, socket: WebSocket): Promise<void>;
  searchLogs(query: LogSearchQuery, socket: WebSocket): Promise<void>;
  
  // Management
  getActiveConnections(): ConnectionInfo[];
  getStreamingMetrics(): StreamingMetrics;
}

class CloudRunLogStreamingService implements LogStreamingService {
  private connectionManager: ConnectionManager;
  private logAggregator: LogAggregator;
  private replayEngine: ReplayEngine;
  private searchEngine: LogSearchEngine;
  private pubsub: PubSub;
  private redis: Redis;
  
  constructor() {
    this.connectionManager = new WebSocketConnectionManager();
    this.logAggregator = new RedisLogAggregator();
    this.replayEngine = new StorageReplayEngine();
    this.searchEngine = new ElasticsearchLogEngine();
    
    this.initializeEventSubscriptions();
  }
  
  async handleConnection(
    cardId: string,
    socket: WebSocket,
    auth: AuthContext
  ): Promise<void> {
    // Validate workspace access
    const hasAccess = await this.validateCardAccess(cardId, auth.userId);
    if (!hasAccess) {
      socket.close(1008, 'Unauthorized');
      return;
    }
    
    // Register connection
    const connectionId = this.connectionManager.register(cardId, socket, auth);
    
    // Send connection established message
    await this.sendMessage(socket, {
      type: 'connection_established',
      data: {
        cardId,
        connectionId,
        capabilities: ['live_logs', 'replay', 'search']
      }
    });
    
    // Send recent logs (last 100 entries)
    await this.sendRecentLogs(cardId, socket);
    
    // Subscribe to live logs for this card
    await this.subscribeToCardLogs(cardId, connectionId);
  }
  
  private async initializeEventSubscriptions(): Promise<void> {
    // Subscribe to agent logs
    this.pubsub.subscription('agent-logs-streaming').on('message', async (message) => {
      const logEntry: LogEntry = JSON.parse(message.data.toString());
      await this.handleIncomingLog(logEntry);
    });
    
    // Subscribe to system logs
    this.pubsub.subscription('system-logs-streaming').on('message', async (message) => {
      const logEntry: LogEntry = JSON.parse(message.data.toString());
      await this.handleIncomingLog(logEntry);
    });
  }
  
  private async handleIncomingLog(logEntry: LogEntry): Promise<void> {
    // Store in Redis for real-time access
    await this.logAggregator.store(logEntry);
    
    // Broadcast to connected terminals
    await this.broadcastToSubscribers(logEntry);
    
    // Archive to persistent storage
    await this.archiveLog(logEntry);
  }
  
  private async broadcastToSubscribers(logEntry: LogEntry): Promise<void> {
    const connections = this.connectionManager.getConnectionsByCard(logEntry.cardId);
    
    const message = {
      type: 'log_entry',
      data: logEntry
    };
    
    await Promise.allSettled(
      connections.map(conn => this.sendMessage(conn.socket, message))
    );
  }
}
```

### 3.2 Connection Management

```typescript
interface ConnectionManager {
  register(cardId: string, socket: WebSocket, auth: AuthContext): string;
  unregister(connectionId: string): void;
  getConnectionsByCard(cardId: string): Connection[];
  broadcast(cardId: string, message: TerminalMessage): Promise<void>;
  healthCheck(): Promise<ConnectionHealthReport>;
}

interface Connection {
  id: string;
  cardId: string;
  socket: WebSocket;
  userId: string;
  workspaceId: string;
  connectedAt: Date;
  lastActivity: Date;
  subscriptions: Set<string>; // runIds, search queries, etc.
}

class WebSocketConnectionManager implements ConnectionManager {
  private connections = new Map<string, Connection>();
  private cardConnections = new Map<string, Set<string>>(); // cardId -> connectionIds
  private redis: Redis;
  
  register(cardId: string, socket: WebSocket, auth: AuthContext): string {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36)}`;
    
    const connection: Connection = {
      id: connectionId,
      cardId,
      socket,
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscriptions: new Set()
    };
    
    // Store connection
    this.connections.set(connectionId, connection);
    
    // Index by card
    if (!this.cardConnections.has(cardId)) {
      this.cardConnections.set(cardId, new Set());
    }
    this.cardConnections.get(cardId)!.add(connectionId);
    
    // Set up socket event handlers
    this.setupSocketHandlers(connection);
    
    // Track connection metrics
    this.trackConnectionMetric('connected', { cardId, userId: auth.userId });
    
    return connectionId;
  }
  
  private setupSocketHandlers(connection: Connection): void {
    connection.socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleClientMessage(connection, message);
      } catch (error) {
        console.error('Failed to process client message:', error);
      }
    });
    
    connection.socket.on('close', () => {
      this.unregister(connection.id);
    });
    
    connection.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.unregister(connection.id);
    });
    
    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.socket.ping();
      } else {
        clearInterval(heartbeatInterval);
      }
    }, 30000);
  }
  
  private async handleClientMessage(
    connection: Connection,
    message: ClientMessage
  ): Promise<void> {
    connection.lastActivity = new Date();
    
    switch (message.type) {
      case 'subscribe_run':
        await this.subscribeToRun(connection, message.runId);
        break;
        
      case 'replay_run':
        await this.startReplay(connection, message.runId);
        break;
        
      case 'search_logs':
        await this.searchLogs(connection, message.query);
        break;
        
      case 'pause_stream':
        connection.subscriptions.clear();
        break;
        
      case 'resume_stream':
        await this.resumeStream(connection);
        break;
        
      default:
        console.warn('Unknown client message type:', message.type);
    }
  }
}
```

---

## 4. Log Aggregation and Storage

### 4.1 Multi-Tier Storage Strategy

```typescript
interface LogStorage {
  // Hot storage (Redis) - last 24 hours
  storeHot(logEntry: LogEntry): Promise<void>;
  getHotLogs(cardId: string, limit?: number): Promise<LogEntry[]>;
  
  // Warm storage (PostgreSQL) - last 30 days  
  storeWarm(logEntry: LogEntry): Promise<void>;
  getWarmLogs(query: LogQuery): Promise<LogEntry[]>;
  
  // Cold storage (Cloud Storage) - long-term archive
  storeCold(logEntries: LogEntry[]): Promise<void>;
  getColdLogs(archiveKey: string): Promise<LogEntry[]>;
}

interface LogEntry {
  // Identity
  id: string;
  runId: string;
  cardId: string;
  workspaceId: string;
  
  // Timing
  timestamp: Date;
  sequence: number; // Order within run
  
  // Content
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source: 'orchestrator' | 'provider' | 'agent' | 'system';
  component: string; // Which component generated the log
  message: string;
  data?: Record<string, any>; // Structured data
  
  // Context
  agentId?: string;
  provider?: string;
  model?: string;
  userId?: string;
  
  // Metadata
  tags?: string[];
  correlationId?: string;
  parentSpanId?: string;
  traceId?: string;
}

class TieredLogStorage implements LogStorage {
  private redis: Redis;
  private postgres: Pool;
  private storage: Storage;
  
  async storeHot(logEntry: LogEntry): Promise<void> {
    const key = `logs:hot:${logEntry.cardId}`;
    const value = JSON.stringify(logEntry);
    
    // Use sorted set with timestamp as score for ordered retrieval
    await this.redis.pipeline()
      .zadd(key, logEntry.timestamp.getTime(), `${logEntry.id}:${value}`)
      .expire(key, 86400) // 24 hour TTL
      .exec();
    
    // Also store by runId for fast run-specific access
    const runKey = `logs:run:${logEntry.runId}`;
    await this.redis.pipeline()
      .zadd(runKey, logEntry.sequence, `${logEntry.id}:${value}`)
      .expire(runKey, 86400)
      .exec();
  }
  
  async getHotLogs(cardId: string, limit = 100): Promise<LogEntry[]> {
    const key = `logs:hot:${cardId}`;
    
    // Get most recent logs
    const results = await this.redis.zrevrange(key, 0, limit - 1);
    
    return results.map(result => {
      const [id, ...jsonParts] = result.split(':');
      const json = jsonParts.join(':');
      return JSON.parse(json) as LogEntry;
    });
  }
  
  async storeWarm(logEntry: LogEntry): Promise<void> {
    const query = `
      INSERT INTO agent_run_logs (
        id, run_id, card_id, workspace_id, timestamp, sequence,
        level, source, component, message, data,
        agent_id, provider, model, user_id,
        tags, correlation_id, parent_span_id, trace_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `;
    
    const values = [
      logEntry.id,
      logEntry.runId,
      logEntry.cardId,
      logEntry.workspaceId,
      logEntry.timestamp,
      logEntry.sequence,
      logEntry.level,
      logEntry.source,
      logEntry.component,
      logEntry.message,
      logEntry.data ? JSON.stringify(logEntry.data) : null,
      logEntry.agentId,
      logEntry.provider,
      logEntry.model,
      logEntry.userId,
      logEntry.tags,
      logEntry.correlationId,
      logEntry.parentSpanId,
      logEntry.traceId
    ];
    
    await this.postgres.query(query, values);
  }
  
  async storeCold(logEntries: LogEntry[]): Promise<void> {
    // Archive logs to Cloud Storage in compressed format
    const archiveKey = this.generateArchiveKey(logEntries[0]);
    const compressed = await this.compressLogs(logEntries);
    
    const file = this.storage.bucket('agentworks-logs-archive').file(archiveKey);
    await file.save(compressed, {
      metadata: {
        contentType: 'application/gzip',
        contentEncoding: 'gzip',
        custom: {
          logCount: logEntries.length.toString(),
          dateRange: `${logEntries[0].timestamp.toISOString()}_${logEntries[logEntries.length - 1].timestamp.toISOString()}`
        }
      }
    });
  }
}
```

### 4.2 Log Search and Analytics

```typescript
interface LogSearchEngine {
  search(query: LogSearchQuery): Promise<LogSearchResult>;
  createIndex(logEntry: LogEntry): Promise<void>;
  getPopularQueries(workspaceId: string): Promise<string[]>;
  getLogAnalytics(cardId: string, timeRange: TimeRange): Promise<LogAnalytics>;
}

interface LogSearchQuery {
  workspaceId: string;
  cardId?: string;
  runId?: string;
  
  // Search parameters
  text?: string; // Full-text search
  level?: LogLevel[];
  source?: string[];
  timeRange?: TimeRange;
  
  // Advanced filters
  agentId?: string;
  provider?: string;
  tags?: string[];
  
  // Result configuration
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

interface LogSearchResult {
  logs: LogEntry[];
  totalCount: number;
  query: LogSearchQuery;
  executionTime: number;
  
  // Analytics
  levelDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  timelineData: Array<{
    timestamp: Date;
    count: number;
  }>;
}

class ElasticsearchLogEngine implements LogSearchEngine {
  private client: Client;
  
  async search(query: LogSearchQuery): Promise<LogSearchResult> {
    const startTime = Date.now();
    
    // Build Elasticsearch query
    const esQuery = this.buildElasticsearchQuery(query);
    
    // Execute search
    const response = await this.client.search({
      index: 'agentworks-logs',
      body: esQuery,
      size: query.limit || 100,
      from: query.offset || 0
    });
    
    // Process results
    const logs = response.body.hits.hits.map((hit: any) => ({
      ...hit._source,
      id: hit._id,
      timestamp: new Date(hit._source.timestamp)
    }));
    
    // Extract aggregations
    const levelDistribution = this.extractAggregation(
      response.body.aggregations?.levels
    );
    const sourceDistribution = this.extractAggregation(
      response.body.aggregations?.sources
    );
    const timelineData = this.extractTimelineData(
      response.body.aggregations?.timeline
    );
    
    return {
      logs,
      totalCount: response.body.hits.total.value,
      query,
      executionTime: Date.now() - startTime,
      levelDistribution,
      sourceDistribution,
      timelineData
    };
  }
  
  private buildElasticsearchQuery(query: LogSearchQuery) {
    const mustClauses: any[] = [
      { term: { workspace_id: query.workspaceId } }
    ];
    
    if (query.cardId) {
      mustClauses.push({ term: { card_id: query.cardId } });
    }
    
    if (query.runId) {
      mustClauses.push({ term: { run_id: query.runId } });
    }
    
    if (query.text) {
      mustClauses.push({
        multi_match: {
          query: query.text,
          fields: ['message^2', 'component', 'data.*'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }
    
    if (query.level && query.level.length > 0) {
      mustClauses.push({
        terms: { level: query.level }
      });
    }
    
    if (query.source && query.source.length > 0) {
      mustClauses.push({
        terms: { source: query.source }
      });
    }
    
    if (query.timeRange) {
      mustClauses.push({
        range: {
          timestamp: {
            gte: query.timeRange.start.toISOString(),
            lte: query.timeRange.end.toISOString()
          }
        }
      });
    }
    
    const sortField = query.sortBy === 'relevance' ? '_score' : 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    
    return {
      query: {
        bool: {
          must: mustClauses
        }
      },
      sort: [
        { [sortField]: { order: sortOrder } }
      ],
      aggs: {
        levels: {
          terms: { field: 'level' }
        },
        sources: {
          terms: { field: 'source' }
        },
        timeline: {
          date_histogram: {
            field: 'timestamp',
            fixed_interval: '1h'
          }
        }
      }
    };
  }
}
```

---

## 5. Real-Time Replay Engine

### 5.1 Replay System Architecture

```typescript
interface ReplayEngine {
  startReplay(runId: string, socket: WebSocket, options?: ReplayOptions): Promise<void>;
  pauseReplay(replayId: string): Promise<void>;
  resumeReplay(replayId: string): Promise<void>;
  seekReplay(replayId: string, position: number): Promise<void>;
  stopReplay(replayId: string): Promise<void>;
}

interface ReplayOptions {
  speed: number; // Playback speed multiplier (1.0 = real-time)
  startTime?: Date;
  endTime?: Date;
  filters?: {
    levels?: LogLevel[];
    sources?: string[];
    components?: string[];
  };
  includeSystemLogs?: boolean;
}

interface ReplaySession {
  id: string;
  runId: string;
  socket: WebSocket;
  options: ReplayOptions;
  
  // State
  status: 'playing' | 'paused' | 'stopped';
  currentPosition: number; // Current log index
  startedAt: Date;
  pausedAt?: Date;
  totalLogs: number;
  
  // Playback control
  intervalId?: NodeJS.Timer;
  logQueue: LogEntry[];
}

class StorageReplayEngine implements ReplayEngine {
  private activeSessions = new Map<string, ReplaySession>();
  private logStorage: LogStorage;
  
  async startReplay(
    runId: string,
    socket: WebSocket,
    options: ReplayOptions = { speed: 1.0 }
  ): Promise<void> {
    // Load all logs for the run
    const logs = await this.loadRunLogs(runId);
    
    // Apply filters if specified
    const filteredLogs = this.applyReplayFilters(logs, options);
    
    // Create replay session
    const sessionId = `replay_${Date.now()}_${Math.random().toString(36)}`;
    const session: ReplaySession = {
      id: sessionId,
      runId,
      socket,
      options,
      status: 'playing',
      currentPosition: 0,
      startedAt: new Date(),
      totalLogs: filteredLogs.length,
      logQueue: filteredLogs
    };
    
    this.activeSessions.set(sessionId, session);
    
    // Send replay started message
    await this.sendReplayMessage(socket, {
      type: 'replay_started',
      data: {
        sessionId,
        runId,
        totalLogs: filteredLogs.length,
        estimatedDuration: this.calculateReplayDuration(filteredLogs, options.speed)
      }
    });
    
    // Start playback
    await this.startPlayback(session);
  }
  
  private async startPlayback(session: ReplaySession): Promise<void> {
    if (session.status !== 'playing') return;
    
    const logs = session.logQueue;
    let currentIndex = session.currentPosition;
    
    if (currentIndex >= logs.length) {
      await this.completeReplay(session);
      return;
    }
    
    const currentLog = logs[currentIndex];
    const nextLog = logs[currentIndex + 1];
    
    // Send current log
    await this.sendReplayMessage(session.socket, {
      type: 'replay_log',
      data: {
        ...currentLog,
        replayPosition: currentIndex,
        replayTotal: logs.length,
        replayProgress: (currentIndex / logs.length) * 100
      }
    });
    
    session.currentPosition = currentIndex + 1;
    
    // Calculate delay until next log
    let delay = 100; // Default 100ms between logs
    
    if (nextLog && currentLog.timestamp && nextLog.timestamp) {
      const timeDiff = nextLog.timestamp.getTime() - currentLog.timestamp.getTime();
      delay = Math.max(50, Math.min(5000, timeDiff / session.options.speed)); // 50ms-5s range
    }
    
    // Schedule next log
    session.intervalId = setTimeout(() => {
      this.startPlayback(session);
    }, delay);
  }
  
  private async completeReplay(session: ReplaySession): Promise<void> {
    session.status = 'stopped';
    
    await this.sendReplayMessage(session.socket, {
      type: 'replay_completed',
      data: {
        sessionId: session.id,
        totalLogsPlayed: session.currentPosition,
        duration: Date.now() - session.startedAt.getTime()
      }
    });
    
    this.activeSessions.delete(session.id);
  }
  
  async pauseReplay(replayId: string): Promise<void> {
    const session = this.activeSessions.get(replayId);
    if (!session) return;
    
    session.status = 'paused';
    session.pausedAt = new Date();
    
    if (session.intervalId) {
      clearTimeout(session.intervalId);
      session.intervalId = undefined;
    }
    
    await this.sendReplayMessage(session.socket, {
      type: 'replay_paused',
      data: { sessionId: replayId, position: session.currentPosition }
    });
  }
  
  async resumeReplay(replayId: string): Promise<void> {
    const session = this.activeSessions.get(replayId);
    if (!session || session.status !== 'paused') return;
    
    session.status = 'playing';
    session.pausedAt = undefined;
    
    await this.sendReplayMessage(session.socket, {
      type: 'replay_resumed',
      data: { sessionId: replayId, position: session.currentPosition }
    });
    
    await this.startPlayback(session);
  }
  
  async seekReplay(replayId: string, position: number): Promise<void> {
    const session = this.activeSessions.get(replayId);
    if (!session) return;
    
    const wasPlaying = session.status === 'playing';
    
    // Pause if playing
    if (wasPlaying) {
      await this.pauseReplay(replayId);
    }
    
    // Update position
    session.currentPosition = Math.max(0, Math.min(position, session.totalLogs - 1));
    
    await this.sendReplayMessage(session.socket, {
      type: 'replay_seeked',
      data: {
        sessionId: replayId,
        position: session.currentPosition,
        progress: (session.currentPosition / session.totalLogs) * 100
      }
    });
    
    // Resume if was playing
    if (wasPlaying) {
      await this.resumeReplay(replayId);
    }
  }
}
```

---

## 6. WebSocket Protocol Specification

### 6.1 Message Format

```typescript
// Client -> Server Messages
type ClientMessage = 
  | { type: 'subscribe_card'; cardId: string; }
  | { type: 'subscribe_run'; runId: string; }
  | { type: 'unsubscribe_run'; runId: string; }
  | { type: 'replay_run'; runId: string; options?: ReplayOptions; }
  | { type: 'replay_control'; action: 'pause' | 'resume' | 'stop'; sessionId: string; }
  | { type: 'replay_seek'; sessionId: string; position: number; }
  | { type: 'search_logs'; query: LogSearchQuery; }
  | { type: 'get_run_summary'; runId: string; }
  | { type: 'ping'; timestamp: number; };

// Server -> Client Messages
type ServerMessage = 
  | { type: 'connection_established'; data: ConnectionInfo; }
  | { type: 'log_entry'; data: LogEntry; }
  | { type: 'logs_batch'; data: LogEntry[]; }
  | { type: 'replay_started'; data: ReplayStartInfo; }
  | { type: 'replay_log'; data: LogEntry & ReplayMetadata; }
  | { type: 'replay_paused'; data: ReplayStatus; }
  | { type: 'replay_completed'; data: ReplayComplete; }
  | { type: 'search_result'; data: LogSearchResult; }
  | { type: 'run_summary'; data: RunSummary; }
  | { type: 'error'; data: ErrorInfo; }
  | { type: 'pong'; timestamp: number; };

interface ConnectionInfo {
  connectionId: string;
  cardId: string;
  capabilities: string[];
  serverTime: string;
}

interface ReplayStartInfo {
  sessionId: string;
  runId: string;
  totalLogs: number;
  estimatedDuration: number;
  filters?: ReplayFilters;
}

interface ReplayMetadata {
  replayPosition: number;
  replayTotal: number;
  replayProgress: number;
  originalTimestamp: string;
  replayTimestamp: string;
}

interface RunSummary {
  runId: string;
  agentId: string;
  status: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  logCount: number;
  errorCount: number;
  warningCount: number;
  cost?: number;
  tokensUsed?: number;
}
```

### 6.2 Connection Lifecycle

```typescript
class TerminalWebSocketHandler {
  async handleConnection(request: WebSocketRequest): Promise<void> {
    const { cardId, token } = this.parseConnectionParams(request);
    
    // Authenticate the connection
    const auth = await this.authenticateToken(token);
    if (!auth) {
      request.reject(1008, 'Authentication failed');
      return;
    }
    
    // Validate card access
    const hasAccess = await this.validateCardAccess(cardId, auth.userId);
    if (!hasAccess) {
      request.reject(1008, 'Access denied');
      return;
    }
    
    // Accept the connection
    const socket = request.accept();
    
    // Register with connection manager
    const connectionId = await this.connectionManager.register(cardId, socket, auth);
    
    // Set up event handlers
    this.setupEventHandlers(socket, connectionId);
    
    // Send initial data
    await this.sendInitialData(socket, cardId);
  }
  
  private setupEventHandlers(socket: WebSocket, connectionId: string): void {
    // Handle incoming messages
    socket.on('message', async (message) => {
      try {
        const clientMessage: ClientMessage = JSON.parse(message.utf8Data);
        await this.handleClientMessage(connectionId, clientMessage);
      } catch (error) {
        await this.sendError(socket, 'Invalid message format');
      }
    });
    
    // Handle connection close
    socket.on('close', () => {
      this.connectionManager.unregister(connectionId);
    });
    
    // Handle connection errors
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.connectionManager.unregister(connectionId);
    });
    
    // Handle pings
    socket.on('ping', () => {
      socket.pong();
    });
  }
  
  private async sendInitialData(socket: WebSocket, cardId: string): Promise<void> {
    // Send recent logs
    const recentLogs = await this.logStorage.getHotLogs(cardId, 50);
    
    if (recentLogs.length > 0) {
      await this.sendMessage(socket, {
        type: 'logs_batch',
        data: recentLogs.reverse() // Send in chronological order
      });
    }
    
    // Send active run status if any
    const activeRun = await this.getActiveRun(cardId);
    if (activeRun) {
      await this.sendMessage(socket, {
        type: 'run_summary',
        data: activeRun
      });
    }
  }
}
```

---

## 7. Performance Optimization

### 7.1 Caching and Buffering

```typescript
interface LogBuffer {
  add(logEntry: LogEntry): void;
  flush(): Promise<LogEntry[]>;
  size(): number;
}

class BatchedLogBuffer implements LogBuffer {
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timer;
  private readonly maxSize = 100;
  private readonly flushIntervalMs = 1000; // 1 second
  
  constructor(private onFlush: (logs: LogEntry[]) => Promise<void>) {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }
  
  add(logEntry: LogEntry): void {
    this.buffer.push(logEntry);
    
    // Flush if buffer is full
    if (this.buffer.length >= this.maxSize) {
      setImmediate(() => this.flush());
    }
  }
  
  async flush(): Promise<LogEntry[]> {
    if (this.buffer.length === 0) return [];
    
    const logsToFlush = [...this.buffer];
    this.buffer = [];
    
    try {
      await this.onFlush(logsToFlush);
    } catch (error) {
      console.error('Failed to flush log buffer:', error);
      // Re-add failed logs to buffer for retry
      this.buffer.unshift(...logsToFlush);
    }
    
    return logsToFlush;
  }
  
  size(): number {
    return this.buffer.length;
  }
}
```

### 7.2 Connection Pooling and Load Balancing

```typescript
interface LoadBalancer {
  selectInstance(cardId: string): Promise<ServiceInstance>;
  healthCheck(): Promise<HealthReport>;
}

class ConsistentHashLoadBalancer implements LoadBalancer {
  private instances: ServiceInstance[] = [];
  private hashRing: Map<number, ServiceInstance>;
  
  constructor(instances: ServiceInstance[]) {
    this.instances = instances;
    this.buildHashRing();
  }
  
  async selectInstance(cardId: string): Promise<ServiceInstance> {
    const hash = this.hash(cardId);
    
    // Find the first instance on or after this hash
    const sortedHashes = Array.from(this.hashRing.keys()).sort((a, b) => a - b);
    
    for (const instanceHash of sortedHashes) {
      if (instanceHash >= hash) {
        return this.hashRing.get(instanceHash)!;
      }
    }
    
    // Wrap around to the first instance
    return this.hashRing.get(sortedHashes[0])!;
  }
  
  private buildHashRing(): void {
    this.hashRing = new Map();
    
    // Add multiple virtual nodes per instance for better distribution
    const virtualNodes = 100;
    
    for (const instance of this.instances) {
      for (let i = 0; i < virtualNodes; i++) {
        const virtualKey = `${instance.id}:${i}`;
        const hash = this.hash(virtualKey);
        this.hashRing.set(hash, instance);
      }
    }
  }
  
  private hash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
```

---

## 8. Monitoring and Metrics

### 8.1 Real-Time Metrics

```typescript
interface StreamingMetrics {
  // Connection metrics
  activeConnections: number;
  connectionsByCard: Record<string, number>;
  totalConnections: number;
  connectionErrors: number;
  
  // Log metrics  
  logsPerSecond: number;
  avgLogSize: number;
  logLevels: Record<LogLevel, number>;
  
  // Replay metrics
  activeReplays: number;
  replayCompletions: number;
  replayErrors: number;
  
  // Performance metrics
  avgDeliveryLatency: number;
  bufferUtilization: number;
  storageLatency: number;
}

class MetricsCollector {
  private metrics: StreamingMetrics;
  private prometheus: PrometheusRegistry;
  
  constructor() {
    this.initializeMetrics();
    this.setupPrometheusMetrics();
  }
  
  updateConnectionMetrics(event: ConnectionEvent): void {
    switch (event.type) {
      case 'connected':
        this.metrics.activeConnections++;
        this.metrics.totalConnections++;
        break;
      case 'disconnected':
        this.metrics.activeConnections--;
        break;
      case 'error':
        this.metrics.connectionErrors++;
        break;
    }
  }
  
  updateLogMetrics(logEntry: LogEntry, deliveryLatency: number): void {
    this.metrics.logsPerSecond = this.calculateRate('logs', 1);
    this.metrics.avgLogSize = this.updateAverage('logSize', this.getLogSize(logEntry));
    this.metrics.logLevels[logEntry.level] = (this.metrics.logLevels[logEntry.level] || 0) + 1;
    this.metrics.avgDeliveryLatency = this.updateAverage('deliveryLatency', deliveryLatency);
  }
  
  private setupPrometheusMetrics(): void {
    // Connection metrics
    this.prometheus.register.registerMetric(new prometheus.Gauge({
      name: 'agentworks_terminal_active_connections',
      help: 'Number of active WebSocket connections'
    }));
    
    // Log throughput
    this.prometheus.register.registerMetric(new prometheus.Counter({
      name: 'agentworks_logs_processed_total',
      help: 'Total number of logs processed',
      labelNames: ['level', 'source', 'workspace_id']
    }));
    
    // Latency metrics
    this.prometheus.register.registerMetric(new prometheus.Histogram({
      name: 'agentworks_log_delivery_latency_seconds',
      help: 'Time from log generation to client delivery',
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
    }));
  }
}
```

This comprehensive real-time logging and terminal streaming architecture provides AgentWorks with the capability to deliver live, interactive debugging experiences while maintaining high performance and reliability at scale.