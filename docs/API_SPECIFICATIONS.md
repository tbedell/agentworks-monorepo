# AgentWorks - API Specifications and Service Contracts

**Version:** 1.0  
**Date:** 2025-12-02  
**Owner:** Architect Agent  
**Status:** Implementation Ready  

---

## 1. API Overview

The AgentWorks platform exposes a comprehensive REST API with real-time WebSocket capabilities, designed for multi-tenant SaaS operations with strict security and usage tracking. All APIs follow RESTful conventions with OpenAPI 3.0 specifications.

### 1.1 Base Configuration

- **Base URL**: `https://api.agentworks.dev/v1`
- **Authentication**: Bearer tokens (JWT) + Session cookies
- **Content Type**: `application/json`
- **Rate Limiting**: 1000 requests/hour per user, 10000/hour per workspace
- **Versioning**: URL path versioning (`/v1/`, `/v2/`)

---

## 2. Authentication API

### 2.1 Authentication Endpoints

```typescript
// POST /auth/login
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  user: UserProfile;
  token: string;
  refreshToken: string;
  expiresIn: number; // seconds
  workspaces: WorkspaceSummary[];
}

// POST /auth/register
interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  invitationToken?: string; // For workspace invitations
}

interface RegisterResponse {
  user: UserProfile;
  token: string;
  refreshToken: string;
  emailVerificationRequired: boolean;
}

// POST /auth/refresh
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// POST /auth/logout
interface LogoutRequest {
  refreshToken?: string;
}

// POST /auth/forgot-password
interface ForgotPasswordRequest {
  email: string;
}

// POST /auth/reset-password
interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// OAuth endpoints
// GET /auth/oauth/{provider} - Redirect to OAuth provider
// GET /auth/oauth/{provider}/callback - OAuth callback handler
interface OAuthCallbackResponse {
  user: UserProfile;
  token: string;
  refreshToken: string;
  isNewUser: boolean;
}
```

### 2.2 User Profile Management

```typescript
// GET /auth/me
interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt: string;
}

// PUT /auth/me
interface UpdateUserRequest {
  name?: string;
  avatarUrl?: string;
  preferences?: Partial<UserPreferences>;
}

// PUT /auth/me/password
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// POST /auth/verify-email
interface VerifyEmailRequest {
  token: string;
}

// POST /auth/resend-verification
// No request body required

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  notifications: {
    email: boolean;
    browser: boolean;
    agentCompleted: boolean;
    usageAlerts: boolean;
  };
  editor: {
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
  };
}
```

---

## 3. Workspace Management API

### 3.1 Workspace CRUD Operations

```typescript
// GET /workspaces
interface ListWorkspacesResponse {
  workspaces: WorkspaceSummary[];
  total: number;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  memberCount: number;
  projectCount: number;
  createdAt: string;
  lastActivity: string;
}

// GET /workspaces/{id}
interface WorkspaceDetails {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner: UserSummary;
  settings: WorkspaceSettings;
  billing: BillingSummary;
  usage: CurrentUsageSummary;
  createdAt: string;
  updatedAt: string;
}

// POST /workspaces
interface CreateWorkspaceRequest {
  name: string;
  slug: string; // URL-friendly identifier
  description?: string;
  settings?: Partial<WorkspaceSettings>;
}

// PUT /workspaces/{id}
interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  settings?: Partial<WorkspaceSettings>;
}

// DELETE /workspaces/{id}
// Soft delete - returns 202 Accepted

interface WorkspaceSettings {
  maxProjects: number;
  maxMembers: number;
  maxMonthlyUsage: number; // USD
  allowedProviders: string[];
  requireApprovalForAgentRuns: boolean;
  defaultAgentConfigs: Record<string, AgentConfigTemplate>;
}
```

### 3.2 Workspace Member Management

```typescript
// GET /workspaces/{id}/members
interface WorkspaceMembersResponse {
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  total: number;
}

interface WorkspaceMember {
  id: string;
  user: UserSummary;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  lastActiveAt: string;
  permissions: string[];
}

// POST /workspaces/{id}/members/invite
interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member' | 'viewer';
  message?: string;
}

interface InviteMemberResponse {
  invitation: WorkspaceInvitation;
  invitationUrl: string;
}

// PUT /workspaces/{id}/members/{userId}
interface UpdateMemberRequest {
  role: 'admin' | 'member' | 'viewer';
  permissions?: string[];
}

// DELETE /workspaces/{id}/members/{userId}
// Remove member - returns 204 No Content

// POST /workspaces/{id}/invitations/{token}/accept
interface AcceptInvitationRequest {
  token: string;
}

// DELETE /workspaces/{id}/invitations/{invitationId}
// Cancel invitation - returns 204 No Content

interface WorkspaceInvitation {
  id: string;
  email: string;
  role: string;
  invitedBy: UserSummary;
  expiresAt: string;
  createdAt: string;
}
```

---

## 4. Project Management API

### 4.1 Project Operations

```typescript
// GET /workspaces/{workspaceId}/projects
interface ListProjectsQuery {
  status?: 'active' | 'archived';
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastActivity';
  sortOrder?: 'asc' | 'desc';
}

interface ListProjectsResponse {
  projects: ProjectSummary[];
  total: number;
  pagination: PaginationMeta;
}

interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: 'active' | 'archived';
  cardCount: number;
  activeRunCount: number;
  lastActivity: string;
  createdAt: string;
  createdBy: UserSummary;
}

// GET /projects/{id}
interface ProjectDetails {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  status: 'active' | 'archived';
  settings: ProjectSettings;
  agentConfigs: Record<string, AgentConfig>;
  repositoryUrl?: string;
  deploymentUrl?: string;
  documentationUrl?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
}

// POST /workspaces/{workspaceId}/projects
interface CreateProjectRequest {
  name: string;
  slug: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
  repositoryUrl?: string;
  documentationUrl?: string;
}

// PUT /projects/{id}
interface UpdateProjectRequest {
  name?: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
  repositoryUrl?: string;
  deploymentUrl?: string;
  documentationUrl?: string;
}

// POST /projects/{id}/archive
// Archives project - returns 202 Accepted

// POST /projects/{id}/restore
// Restores archived project - returns 200 OK

interface ProjectSettings {
  autoTriggerAgents: boolean;
  requireApprovalForDeployment: boolean;
  maxConcurrentRuns: number;
  defaultWipLimits: Record<number, number>; // lane -> limit
  customLaneConfig?: LaneConfiguration[];
}
```

### 4.2 Board and Lane Management

```typescript
// GET /projects/{id}/boards
interface ListBoardsResponse {
  boards: BoardSummary[];
}

interface BoardSummary {
  id: string;
  name: string;
  cardCount: number;
  lastActivity: string;
}

// GET /boards/{id}
interface BoardDetails {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  lanes: Lane[];
  settings: BoardSettings;
  createdAt: string;
  updatedAt: string;
}

// PUT /boards/{id}
interface UpdateBoardRequest {
  name?: string;
  description?: string;
  settings?: Partial<BoardSettings>;
}

// GET /boards/{id}/lanes
interface Lane {
  id: string;
  laneNumber: number;
  name: string;
  description?: string;
  wipLimit?: number;
  autoTriggerAgent?: string;
  exitCriteria?: string;
  cardCount: number;
  settings: LaneSettings;
}

// PUT /lanes/{id}
interface UpdateLaneRequest {
  name?: string;
  description?: string;
  wipLimit?: number;
  autoTriggerAgent?: string;
  exitCriteria?: string;
  settings?: Partial<LaneSettings>;
}

interface LaneSettings {
  color: string;
  position: number;
  allowedCardTypes: string[];
  requiredFields: string[];
  autoProgressConditions?: AutoProgressCondition[];
}

interface BoardSettings {
  showWipLimits: boolean;
  enableCardDependencies: boolean;
  autoArchiveCompleted: boolean;
  customFields: CustomFieldDefinition[];
}
```

---

## 5. Card Management API

### 5.1 Card Operations

```typescript
// GET /boards/{boardId}/cards
interface ListCardsQuery {
  laneId?: string;
  assigneeId?: string;
  type?: string;
  status?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  includeChildren?: boolean;
}

interface ListCardsResponse {
  cards: Card[];
  total: number;
  pagination: PaginationMeta;
}

interface Card {
  id: string;
  boardId: string;
  laneId: string;
  parentId?: string;
  title: string;
  description?: string;
  type: 'epic' | 'feature' | 'task' | 'bug' | 'blueprint' | 'doc';
  status: 'draft' | 'ready' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: UserSummary;
  reporter?: UserSummary;
  position: number;
  labels: string[];
  tags: TagInfo[];
  estimatedHours?: number;
  loggedHours: number;
  dueDate?: string;
  externalLinks: ExternalLink[];
  attachments: Attachment[];
  customFields: Record<string, any>;
  children?: CardSummary[];
  dependencies?: CardDependency[];
  agentRuns: AgentRunSummary[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  createdBy: UserSummary;
}

// POST /boards/{boardId}/cards
interface CreateCardRequest {
  laneId: string;
  parentId?: string;
  title: string;
  description?: string;
  type: 'epic' | 'feature' | 'task' | 'bug' | 'blueprint' | 'doc';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assigneeId?: string;
  position?: number;
  labels?: string[];
  tags?: TagInfo[];
  estimatedHours?: number;
  dueDate?: string;
  customFields?: Record<string, any>;
}

// GET /cards/{id}
interface CardDetails extends Card {
  comments: CardComment[];
  activities: CardActivity[];
}

// PUT /cards/{id}
interface UpdateCardRequest {
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  labels?: string[];
  tags?: TagInfo[];
  estimatedHours?: number;
  dueDate?: string;
  customFields?: Record<string, any>;
}

// POST /cards/{id}/move
interface MoveCardRequest {
  toLaneId: string;
  position?: number;
  reason?: string;
}

// DELETE /cards/{id}
// Soft delete - returns 204 No Content

interface ExternalLink {
  id: string;
  title: string;
  url: string;
  type: 'github' | 'docs' | 'design' | 'other';
}

interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  uploadedBy: UserSummary;
  uploadedAt: string;
}

interface TagInfo {
  key: string;
  value: string;
  color?: string;
}
```

### 5.2 Card Comments and Activities

```typescript
// GET /cards/{id}/comments
interface ListCommentsResponse {
  comments: CardComment[];
  total: number;
}

interface CardComment {
  id: string;
  content: string;
  contentType: 'markdown' | 'plain_text';
  author: UserSummary;
  parentCommentId?: string;
  replies?: CardComment[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// POST /cards/{id}/comments
interface CreateCommentRequest {
  content: string;
  contentType?: 'markdown' | 'plain_text';
  parentCommentId?: string;
}

// PUT /comments/{id}
interface UpdateCommentRequest {
  content: string;
}

// DELETE /comments/{id}
// Soft delete - returns 204 No Content

// GET /cards/{id}/activities
interface ListActivitiesResponse {
  activities: CardActivity[];
  total: number;
}

interface CardActivity {
  id: string;
  type: 'created' | 'updated' | 'moved' | 'assigned' | 'commented' | 'agent_run';
  actor: UserSummary | AgentSummary;
  description: string;
  fieldChanged?: string;
  oldValue?: any;
  newValue?: any;
  metadata: Record<string, any>;
  createdAt: string;
}
```

### 5.3 Card Dependencies

```typescript
// GET /cards/{id}/dependencies
interface CardDependenciesResponse {
  blockedBy: CardDependency[];
  blocking: CardDependency[];
}

interface CardDependency {
  id: string;
  dependentCardId: string;
  dependencyCardId: string;
  type: 'blocks' | 'relates_to' | 'duplicates';
  dependentCard: CardSummary;
  dependencyCard: CardSummary;
  createdBy: UserSummary;
  createdAt: string;
}

// POST /cards/{id}/dependencies
interface CreateDependencyRequest {
  dependencyCardId: string;
  type: 'blocks' | 'relates_to' | 'duplicates';
}

// DELETE /dependencies/{id}
// Remove dependency - returns 204 No Content
```

---

## 6. Agent System API

### 6.1 Agent Management

```typescript
// GET /agents
interface ListAgentsResponse {
  agents: Agent[];
}

interface Agent {
  id: string;
  name: string;
  displayName: string;
  description: string;
  allowedLanes: number[];
  capabilities: string[];
  defaultProvider: string;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  status: 'active' | 'deprecated' | 'disabled';
  version: string;
  createdAt: string;
  updatedAt: string;
}

// GET /agents/{id}
interface AgentDetails extends Agent {
  systemPrompt: string;
  promptTemplate?: string;
  toolsConfig: ToolConfiguration[];
  usageStats: AgentUsageStats;
}

// GET /projects/{id}/agent-configs
interface ProjectAgentConfigsResponse {
  configs: AgentConfig[];
}

interface AgentConfig {
  id: string;
  projectId: string;
  agentId: string;
  agent: AgentSummary;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPromptAdditions?: string;
  contextInstructions?: string;
  enabled: boolean;
  autoTrigger: boolean;
  createdAt: string;
  updatedAt: string;
}

// PUT /projects/{id}/agent-configs/{agentId}
interface UpdateAgentConfigRequest {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPromptAdditions?: string;
  contextInstructions?: string;
  enabled?: boolean;
  autoTrigger?: boolean;
}

interface AgentUsageStats {
  totalRuns: number;
  successfulRuns: number;
  averageResponseTime: number;
  totalCost: number;
  lastUsed?: string;
}
```

### 6.2 Agent Runs

```typescript
// GET /cards/{id}/runs
interface ListAgentRunsQuery {
  agentId?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  limit?: number;
  offset?: number;
}

interface ListAgentRunsResponse {
  runs: AgentRunSummary[];
  total: number;
  pagination: PaginationMeta;
}

interface AgentRunSummary {
  id: string;
  cardId: string;
  agentId: string;
  agent: AgentSummary;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  provider: string;
  model: string;
  progress: number;
  duration?: number;
  cost?: number;
  tokensUsed?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  triggeredBy?: UserSummary;
}

// POST /cards/{id}/agents/{agentId}/run
interface TriggerAgentRunRequest {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  context?: string; // Additional context for the agent
  parameters?: Record<string, any>; // Agent-specific parameters
}

interface TriggerAgentRunResponse {
  run: AgentRunSummary;
  estimatedCost: number;
  estimatedDuration: number;
}

// GET /runs/{id}
interface AgentRunDetails {
  id: string;
  cardId: string;
  agentId: string;
  agent: AgentSummary;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  providerCost: number;
  customerPrice: number;
  duration?: number;
  resultSummary?: string;
  resultData?: Record<string, any>;
  errorMessage?: string;
  errorCode?: string;
  inputContext: any;
  executionMetadata: Record<string, any>;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  triggeredBy?: UserSummary;
}

// POST /runs/{id}/cancel
interface CancelRunRequest {
  reason?: string;
}

// POST /runs/{id}/retry
interface RetryRunRequest {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
```

---

## 7. Document Management API

### 7.1 Project Documents

```typescript
// GET /projects/{id}/docs
interface ListDocumentsResponse {
  documents: ProjectDocument[];
}

interface ProjectDocument {
  id: string;
  projectId: string;
  type: 'blueprint' | 'prd' | 'mvp' | 'agent_playbook' | 'architecture' | 'custom';
  title: string;
  content: string;
  contentType: 'markdown' | 'html' | 'plain_text';
  version: number;
  isLatest: boolean;
  status: 'draft' | 'review' | 'approved' | 'archived';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdBy: UserSummary;
  updatedBy?: UserSummary;
}

// GET /projects/{id}/docs/{type}
// Returns latest version of document type

// GET /documents/{id}
interface DocumentDetails extends ProjectDocument {
  revisions: DocumentRevision[];
}

// POST /projects/{id}/docs
interface CreateDocumentRequest {
  type: 'blueprint' | 'prd' | 'mvp' | 'agent_playbook' | 'architecture' | 'custom';
  title: string;
  content: string;
  contentType?: 'markdown' | 'html' | 'plain_text';
  tags?: string[];
}

// PUT /documents/{id}
interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  tags?: string[];
  status?: 'draft' | 'review' | 'approved' | 'archived';
}

// POST /documents/{id}/publish
interface PublishDocumentRequest {
  version?: number; // If not provided, creates new version
}

interface DocumentRevision {
  id: string;
  documentId: string;
  changeType: 'created' | 'updated' | 'approved' | 'published';
  summary?: string;
  diffData?: any; // Structured diff information
  oldVersion?: number;
  newVersion: number;
  createdAt: string;
  createdBy: UserSummary;
}
```

---

## 8. Usage and Billing API

### 8.1 Usage Tracking

```typescript
// GET /workspaces/{id}/usage
interface UsageQuery {
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
  breakdown?: 'project' | 'agent' | 'provider' | 'user';
}

interface UsageResponse {
  summary: UsageSummary;
  breakdown: UsageBreakdown[];
  timeline: UsageTimelinePoint[];
}

interface UsageSummary {
  totalCalls: number;
  totalTokens: number;
  totalCost: number; // What we paid providers
  totalPrice: number; // What we charged customer
  grossMargin: number; // Percentage
  period: {
    start: string;
    end: string;
  };
}

interface UsageBreakdown {
  category: string; // project name, agent name, provider name, etc.
  calls: number;
  tokens: number;
  cost: number;
  price: number;
  percentage: number; // Percentage of total usage
}

interface UsageTimelinePoint {
  timestamp: string;
  calls: number;
  cost: number;
  price: number;
}

// GET /projects/{id}/usage
// Similar to workspace usage but filtered by project

// GET /workspaces/{id}/usage/export
interface ExportUsageQuery {
  format: 'csv' | 'xlsx' | 'json';
  startDate: string;
  endDate: string;
  includeDetails?: boolean;
}

interface ExportUsageResponse {
  downloadUrl: string;
  expiresAt: string;
}
```

### 8.2 Billing Information

```typescript
// GET /workspaces/{id}/billing
interface BillingInfoResponse {
  account: BillingAccount;
  currentUsage: CurrentUsageSummary;
  upcomingInvoice?: UpcomingInvoice;
  paymentMethods: PaymentMethod[];
  invoices: InvoiceSummary[];
}

interface BillingAccount {
  id: string;
  workspaceId: string;
  billingEmail: string;
  billingAddress?: Address;
  taxId?: string;
  status: 'active' | 'past_due' | 'suspended';
  nextBillingDate: string;
  plan: BillingPlan;
}

interface CurrentUsageSummary {
  period: {
    start: string;
    end: string;
  };
  calls: number;
  estimatedCost: number;
  usageLimit: number;
  percentageUsed: number;
  projectedMonthlyUsage: number;
}

interface UpcomingInvoice {
  period: {
    start: string;
    end: string;
  };
  subtotal: number;
  tax: number;
  total: number;
  dueDate: string;
  lineItems: InvoiceLineItem[];
}

// GET /workspaces/{id}/billing/invoices
interface ListInvoicesQuery {
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  limit?: number;
  offset?: number;
}

interface ListInvoicesResponse {
  invoices: InvoiceSummary[];
  total: number;
  pagination: PaginationMeta;
}

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  period: {
    start: string;
    end: string;
  };
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issuedAt?: string;
  dueDate?: string;
  paidAt?: string;
}

// GET /invoices/{id}
interface InvoiceDetails extends InvoiceSummary {
  lineItems: InvoiceLineItem[];
  payments: Payment[];
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  period?: {
    start: string;
    end: string;
  };
}
```

---

## 9. WebSocket API Specification

### 9.1 Terminal Streaming

```typescript
// WebSocket endpoint: /api/cards/{cardId}/terminal

// Connection authentication via query parameter or header
// ?token={jwt_token}

// Client -> Server Messages
type WSClientMessage = 
  | { type: 'subscribe_run'; runId: string; }
  | { type: 'replay_run'; runId: string; options?: ReplayOptions; }
  | { type: 'search_logs'; query: string; filters?: LogFilters; }
  | { type: 'pause_stream'; }
  | { type: 'resume_stream'; }
  | { type: 'ping'; timestamp: number; };

// Server -> Client Messages  
type WSServerMessage =
  | { type: 'connected'; data: ConnectionInfo; }
  | { type: 'log_entry'; data: LogEntry; }
  | { type: 'logs_batch'; data: LogEntry[]; }
  | { type: 'run_status'; data: RunStatusUpdate; }
  | { type: 'replay_started'; data: ReplayInfo; }
  | { type: 'replay_log'; data: ReplayLogEntry; }
  | { type: 'replay_completed'; data: ReplayComplete; }
  | { type: 'search_results'; data: LogSearchResult; }
  | { type: 'error'; data: ErrorInfo; }
  | { type: 'pong'; timestamp: number; };

interface ConnectionInfo {
  connectionId: string;
  cardId: string;
  capabilities: string[];
  activeRuns: string[];
}

interface LogEntry {
  id: string;
  runId: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  component: string;
  message: string;
  data?: any;
}

interface RunStatusUpdate {
  runId: string;
  status: string;
  progress?: number;
  estimatedCompletion?: string;
}
```

### 9.2 Real-time Board Updates

```typescript
// WebSocket endpoint: /api/workspaces/{workspaceId}/events

// Real-time workspace events
type WorkspaceEvent =
  | { type: 'card_created'; data: CardCreatedEvent; }
  | { type: 'card_updated'; data: CardUpdatedEvent; }
  | { type: 'card_moved'; data: CardMovedEvent; }
  | { type: 'agent_run_started'; data: AgentRunStartedEvent; }
  | { type: 'agent_run_completed'; data: AgentRunCompletedEvent; }
  | { type: 'member_joined'; data: MemberJoinedEvent; }
  | { type: 'usage_threshold'; data: UsageThresholdEvent; };

interface CardMovedEvent {
  cardId: string;
  projectId: string;
  boardId: string;
  fromLaneId: string;
  toLaneId: string;
  movedBy: UserSummary;
  timestamp: string;
}

interface AgentRunStartedEvent {
  runId: string;
  cardId: string;
  agentId: string;
  agentName: string;
  triggeredBy: UserSummary;
  timestamp: string;
}

interface UsageThresholdEvent {
  workspaceId: string;
  thresholdPercentage: number;
  currentUsage: number;
  usageLimit: number;
  timestamp: string;
}
```

---

## 10. Error Handling and Status Codes

### 10.1 Standard HTTP Status Codes

```typescript
// Success responses
200 // OK - Request successful
201 // Created - Resource created successfully
202 // Accepted - Request accepted for processing
204 // No Content - Request successful, no response body

// Client error responses
400 // Bad Request - Invalid request syntax
401 // Unauthorized - Authentication required
403 // Forbidden - Insufficient permissions
404 // Not Found - Resource not found
409 // Conflict - Resource conflict
422 // Unprocessable Entity - Validation errors
429 // Too Many Requests - Rate limit exceeded

// Server error responses
500 // Internal Server Error - Unexpected server error
502 // Bad Gateway - Upstream service error
503 // Service Unavailable - Service temporarily unavailable
504 // Gateway Timeout - Upstream service timeout
```

### 10.2 Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
  
  // For validation errors
  validationErrors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

// Example error codes
const ERROR_CODES = {
  // Authentication
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
  AUTH_TOKEN_EXPIRED: 'Authentication token has expired',
  AUTH_TOKEN_INVALID: 'Invalid authentication token',
  
  // Authorization
  WORKSPACE_ACCESS_DENIED: 'Access denied to workspace',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this action',
  
  // Resource errors
  WORKSPACE_NOT_FOUND: 'Workspace not found',
  PROJECT_NOT_FOUND: 'Project not found',
  CARD_NOT_FOUND: 'Card not found',
  AGENT_NOT_FOUND: 'Agent not found',
  
  // Business logic
  WORKSPACE_MEMBER_LIMIT: 'Workspace member limit exceeded',
  USAGE_LIMIT_EXCEEDED: 'Monthly usage limit exceeded',
  AGENT_RUN_IN_PROGRESS: 'Agent run already in progress for this card',
  INVALID_LANE_TRANSITION: 'Invalid lane transition',
  
  // External services
  PROVIDER_UNAVAILABLE: 'LLM provider temporarily unavailable',
  PROVIDER_RATE_LIMITED: 'Provider rate limit exceeded',
  
  // Validation
  INVALID_EMAIL_FORMAT: 'Invalid email format',
  PASSWORD_TOO_WEAK: 'Password does not meet requirements',
  SLUG_ALREADY_EXISTS: 'URL slug already exists',
} as const;
```

### 10.3 Rate Limiting Headers

```typescript
// Response headers for rate limiting
interface RateLimitHeaders {
  'X-RateLimit-Limit': string;     // Maximum requests allowed
  'X-RateLimit-Remaining': string; // Remaining requests
  'X-RateLimit-Reset': string;     // Unix timestamp when limit resets
  'X-RateLimit-Window': string;    // Time window in seconds
}

// When rate limited (429 status)
interface RateLimitError extends ErrorResponse {
  error: {
    code: 'RATE_LIMIT_EXCEEDED';
    message: 'Rate limit exceeded';
    details: {
      limit: number;
      window: number;
      retryAfter: number; // Seconds until retry allowed
    };
  };
}
```

This comprehensive API specification provides a complete foundation for implementing the AgentWorks platform with clear contracts, proper error handling, and real-time capabilities.