# AgentWorks - Security Architecture and Multi-Tenant Isolation

**Version:** 1.0  
**Date:** 2025-12-02  
**Owner:** Architect Agent  
**Status:** Production Ready  

---

## 1. Security Overview

The AgentWorks platform implements a comprehensive security framework designed for multi-tenant SaaS operations with strict data isolation, secure API key management, and robust access controls. The architecture follows defense-in-depth principles with multiple security layers protecting user data and ensuring regulatory compliance.

### 1.1 Security Principles

- **Zero Trust Architecture**: Never trust, always verify
- **Principle of Least Privilege**: Minimal access rights for users and services
- **Defense in Depth**: Multiple security layers at every level
- **Data Isolation**: Strict multi-tenant data separation
- **Audit Everything**: Comprehensive logging of all security-relevant events
- **Encryption Everywhere**: Data protected in transit and at rest
- **Fail Secure**: Security failures result in denial of access, not exposure

---

## 2. Multi-Tenant Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Security Layers                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Layer 7: Application Security (RBAC, Data Validation)          │
├─────────────────────────────────────────────────────────────────┤
│ Layer 6: API Security (Authentication, Rate Limiting)          │
├─────────────────────────────────────────────────────────────────┤
│ Layer 5: Service Mesh Security (mTLS, Service Identity)        │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: Network Security (VPC, Firewall Rules)                │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Container Security (Image Scanning, Runtime)          │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Infrastructure Security (IAM, Encryption)             │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: Hardware Security (GCP Security Foundation)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Authentication and Authorization

### 3.1 Authentication Framework

```typescript
interface AuthenticationService {
  // Primary authentication methods
  authenticateCredentials(email: string, password: string): Promise<AuthResult>;
  authenticateToken(token: string): Promise<TokenValidation>;
  authenticateOAuth(provider: string, code: string): Promise<OAuthResult>;
  
  // Session management
  createSession(userId: string, metadata: SessionMetadata): Promise<Session>;
  validateSession(sessionId: string): Promise<SessionValidation>;
  revokeSession(sessionId: string): Promise<void>;
  
  // Multi-factor authentication
  initiateMFA(userId: string, method: MFAMethod): Promise<MFAChallenge>;
  verifyMFA(challengeId: string, response: string): Promise<MFAResult>;
}

interface AuthResult {
  success: boolean;
  user?: UserProfile;
  token?: JWT;
  refreshToken?: string;
  mfaRequired?: boolean;
  mfaChallenge?: MFAChallenge;
  loginAttempts?: number;
  lockoutUntil?: Date;
}

interface JWT {
  token: string;
  payload: JWTPayload;
  expiresIn: number;
  expiresAt: Date;
}

interface JWTPayload {
  sub: string; // User ID
  iss: 'agentworks-platform';
  aud: string[]; // Allowed workspaces
  iat: number;
  exp: number;
  scope: string[]; // Permissions
  workspace_id?: string; // Current workspace context
  session_id: string;
  device_id?: string;
}

class SecureAuthenticationService implements AuthenticationService {
  private passwordHasher: Argon2Hasher;
  private tokenManager: JWTManager;
  private mfaProvider: TOTPProvider;
  private auditLogger: SecurityAuditLogger;
  private rateLimiter: AuthRateLimiter;
  
  async authenticateCredentials(email: string, password: string): Promise<AuthResult> {
    // Rate limiting check
    const rateLimitResult = await this.rateLimiter.checkLoginAttempt(email);
    if (!rateLimitResult.allowed) {
      await this.auditLogger.logAuthEvent({
        type: 'login_rate_limited',
        email,
        ip: this.getCurrentIP(),
        timestamp: new Date()
      });
      
      throw new RateLimitError('Too many login attempts', rateLimitResult.retryAfter);
    }
    
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        await this.recordFailedLogin(email, 'user_not_found');
        return { success: false };
      }
      
      // Verify password
      const passwordValid = await this.passwordHasher.verify(user.passwordHash, password);
      if (!passwordValid) {
        await this.recordFailedLogin(email, 'invalid_password');
        return { success: false };
      }
      
      // Check if account is locked
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        await this.auditLogger.logAuthEvent({
          type: 'login_locked_account',
          userId: user.id,
          email,
          lockoutUntil: user.lockoutUntil
        });
        
        return { 
          success: false, 
          lockoutUntil: user.lockoutUntil 
        };
      }
      
      // Check if MFA is required
      if (user.mfaEnabled) {
        const mfaChallenge = await this.initiateMFA(user.id, user.preferredMFAMethod);
        return {
          success: false,
          mfaRequired: true,
          mfaChallenge
        };
      }
      
      // Successful authentication
      await this.recordSuccessfulLogin(user);
      
      const session = await this.createSession(user.id, {
        ip: this.getCurrentIP(),
        userAgent: this.getCurrentUserAgent(),
        loginMethod: 'credentials'
      });
      
      const token = await this.tokenManager.createToken(user, session);
      const refreshToken = await this.tokenManager.createRefreshToken(user, session);
      
      return {
        success: true,
        user: this.sanitizeUserProfile(user),
        token,
        refreshToken
      };
      
    } catch (error) {
      await this.auditLogger.logAuthEvent({
        type: 'login_error',
        email,
        error: error.message,
        timestamp: new Date()
      });
      
      throw error;
    }
  }
  
  private async recordFailedLogin(email: string, reason: string): Promise<void> {
    await this.rateLimiter.recordFailedAttempt(email);
    
    await this.auditLogger.logAuthEvent({
      type: 'login_failed',
      email,
      reason,
      ip: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent(),
      timestamp: new Date()
    });
  }
}
```

### 3.2 Role-Based Access Control (RBAC)

```typescript
interface AccessControlService {
  checkPermission(
    userId: string,
    resource: Resource,
    action: Action,
    context?: AccessContext
  ): Promise<AccessDecision>;
  
  getUserPermissions(userId: string, workspaceId: string): Promise<Permission[]>;
  assignRole(userId: string, workspaceId: string, role: Role): Promise<void>;
  revokeRole(userId: string, workspaceId: string, role: Role): Promise<void>;
}

interface Resource {
  type: 'workspace' | 'project' | 'board' | 'card' | 'agent_run' | 'billing';
  id: string;
  workspaceId: string;
  attributes?: Record<string, any>;
}

interface Action {
  type: 'read' | 'write' | 'delete' | 'execute' | 'admin';
  scope?: 'own' | 'workspace' | 'global';
}

interface AccessDecision {
  granted: boolean;
  reason: string;
  requiredPermissions: string[];
  userPermissions: string[];
  conditions?: AccessCondition[];
}

// Predefined roles with permissions
const ROLES = {
  workspace_owner: {
    permissions: [
      'workspace:admin',
      'workspace:billing',
      'project:create',
      'project:delete',
      'member:invite',
      'member:remove',
      'agent:configure',
      'usage:view_all'
    ]
  },
  workspace_admin: {
    permissions: [
      'workspace:write',
      'project:create',
      'project:admin',
      'member:invite',
      'agent:configure',
      'usage:view_workspace'
    ]
  },
  project_member: {
    permissions: [
      'workspace:read',
      'project:read',
      'project:write',
      'card:create',
      'card:edit',
      'agent:run',
      'usage:view_project'
    ]
  },
  project_viewer: {
    permissions: [
      'workspace:read',
      'project:read',
      'card:read'
    ]
  }
} as const;

class EnforcedAccessControl implements AccessControlService {
  private permissionCache: PermissionCache;
  private auditLogger: SecurityAuditLogger;
  
  async checkPermission(
    userId: string,
    resource: Resource,
    action: Action,
    context?: AccessContext
  ): Promise<AccessDecision> {
    // Get user's permissions for this workspace
    const userPermissions = await this.getUserPermissions(userId, resource.workspaceId);
    
    // Build required permission string
    const requiredPermission = this.buildPermissionString(resource, action);
    
    // Check if user has required permission
    const hasPermission = this.evaluatePermission(userPermissions, requiredPermission, context);
    
    // Special checks for ownership-based access
    let ownershipCheck = true;
    if (action.scope === 'own') {
      ownershipCheck = await this.checkOwnership(userId, resource);
    }
    
    const granted = hasPermission && ownershipCheck;
    
    // Log access decision for audit
    await this.auditLogger.logAccessEvent({
      userId,
      resource,
      action,
      granted,
      reason: granted ? 'permission_granted' : 'permission_denied',
      requiredPermissions: [requiredPermission],
      userPermissions: userPermissions.map(p => p.name),
      timestamp: new Date()
    });
    
    return {
      granted,
      reason: granted ? 'Access granted' : 'Insufficient permissions',
      requiredPermissions: [requiredPermission],
      userPermissions: userPermissions.map(p => p.name)
    };
  }
  
  private buildPermissionString(resource: Resource, action: Action): string {
    // Examples:
    // workspace:admin
    // project:write
    // card:read
    // agent:run
    return `${resource.type}:${action.type}`;
  }
  
  private evaluatePermission(
    userPermissions: Permission[],
    requiredPermission: string,
    context?: AccessContext
  ): boolean {
    for (const permission of userPermissions) {
      if (this.permissionMatches(permission.name, requiredPermission)) {
        // Check additional conditions if any
        if (permission.conditions) {
          return this.evaluateConditions(permission.conditions, context);
        }
        return true;
      }
    }
    return false;
  }
  
  private async checkOwnership(userId: string, resource: Resource): Promise<boolean> {
    switch (resource.type) {
      case 'card':
        const card = await this.cardRepository.findById(resource.id);
        return card?.assigneeId === userId || card?.reporterId === userId;
        
      case 'project':
        const project = await this.projectRepository.findById(resource.id);
        return project?.createdBy === userId;
        
      default:
        return false;
    }
  }
}
```

---

## 4. Multi-Tenant Data Isolation

### 4.1 Database-Level Isolation

```sql
-- Row Level Security (RLS) implementation

-- Enable RLS on all tenant-scoped tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Create application role for API services
CREATE ROLE api_service;

-- Workspace access policy - users can only see workspaces they are members of
CREATE POLICY workspace_member_access ON workspaces
FOR ALL TO api_service
USING (
    id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = current_setting('app.current_user_id')::uuid
    )
);

-- Project access through workspace membership
CREATE POLICY project_workspace_access ON projects
FOR ALL TO api_service
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = current_setting('app.current_user_id')::uuid
    )
);

-- Card access through project/workspace hierarchy
CREATE POLICY card_workspace_access ON cards
FOR ALL TO api_service
USING (
    board_id IN (
        SELECT b.id 
        FROM boards b
        JOIN projects p ON p.id = b.project_id
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = current_setting('app.current_user_id')::uuid
    )
);

-- Usage events scoped to workspace
CREATE POLICY usage_workspace_access ON usage_events
FOR ALL TO api_service
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = current_setting('app.current_user_id')::uuid
    )
);

-- Function to safely set current user context
CREATE OR REPLACE FUNCTION set_current_user(user_uuid UUID)
RETURNS void AS $$
BEGIN
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = user_uuid) THEN
        RAISE EXCEPTION 'Invalid user ID';
    END IF;
    
    -- Set context for RLS policies
    PERFORM set_config('app.current_user_id', user_uuid::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO api_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO api_service;
GRANT EXECUTE ON FUNCTION set_current_user TO api_service;
```

### 4.2 Application-Level Isolation Middleware

```typescript
interface TenantIsolationMiddleware {
  validateWorkspaceAccess(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  
  enforceResourceIsolation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void>;
}

class DatabaseIsolationMiddleware implements TenantIsolationMiddleware {
  private database: DatabaseConnection;
  private auditLogger: SecurityAuditLogger;
  
  async validateWorkspaceAccess(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    const userId = req.user.id;
    
    if (!workspaceId) {
      return next(new ValidationError('Workspace ID required'));
    }
    
    try {
      // Check workspace membership
      const membership = await this.checkWorkspaceMembership(userId, workspaceId);
      if (!membership) {
        await this.auditLogger.logSecurityEvent({
          type: 'unauthorized_workspace_access',
          userId,
          workspaceId,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: new Date()
        });
        
        return next(new ForbiddenError('Workspace access denied'));
      }
      
      // Set database context for RLS
      await this.database.query('SELECT set_current_user($1)', [userId]);
      
      // Add workspace context to request
      req.workspace = {
        id: workspaceId,
        role: membership.role,
        permissions: membership.permissions
      };
      
      next();
      
    } catch (error) {
      await this.auditLogger.logSecurityEvent({
        type: 'workspace_access_error',
        userId,
        workspaceId,
        error: error.message,
        timestamp: new Date()
      });
      
      next(error);
    }
  }
  
  async enforceResourceIsolation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Extract resource identifiers from request
    const resourceType = this.getResourceType(req.route.path);
    const resourceId = req.params.id;
    
    if (!resourceId || !resourceType) {
      return next();
    }
    
    try {
      // Verify resource belongs to user's workspace
      const resourceWorkspace = await this.getResourceWorkspace(resourceType, resourceId);
      
      if (resourceWorkspace !== req.workspace.id) {
        await this.auditLogger.logSecurityEvent({
          type: 'cross_tenant_access_attempt',
          userId: req.user.id,
          requestedWorkspace: resourceWorkspace,
          userWorkspace: req.workspace.id,
          resourceType,
          resourceId,
          timestamp: new Date()
        });
        
        return next(new NotFoundError('Resource not found')); // Don't reveal existence
      }
      
      next();
      
    } catch (error) {
      next(error);
    }
  }
  
  private async getResourceWorkspace(
    resourceType: string,
    resourceId: string
  ): Promise<string | null> {
    switch (resourceType) {
      case 'project':
        const projectResult = await this.database.query(
          'SELECT workspace_id FROM projects WHERE id = $1',
          [resourceId]
        );
        return projectResult.rows[0]?.workspace_id || null;
        
      case 'card':
        const cardResult = await this.database.query(`
          SELECT p.workspace_id 
          FROM cards c
          JOIN boards b ON c.board_id = b.id
          JOIN projects p ON b.project_id = p.id
          WHERE c.id = $1
        `, [resourceId]);
        return cardResult.rows[0]?.workspace_id || null;
        
      case 'agent_run':
        const runResult = await this.database.query(`
          SELECT p.workspace_id 
          FROM agent_runs ar
          JOIN cards c ON ar.card_id = c.id
          JOIN boards b ON c.board_id = b.id
          JOIN projects p ON b.project_id = p.id
          WHERE ar.id = $1
        `, [resourceId]);
        return runResult.rows[0]?.workspace_id || null;
        
      default:
        return null;
    }
  }
}
```

---

## 5. API Key and Secrets Management

### 5.1 Secrets Architecture

```typescript
interface SecretsManager {
  // Provider API keys
  getProviderKey(provider: string, environment: string): Promise<string>;
  rotateProviderKey(provider: string, newKey: string): Promise<void>;
  
  // Application secrets
  getApplicationSecret(name: string): Promise<string>;
  setApplicationSecret(name: string, value: string, ttl?: number): Promise<void>;
  
  // Workspace-specific secrets
  getWorkspaceSecret(workspaceId: string, name: string): Promise<string>;
  setWorkspaceSecret(workspaceId: string, name: string, value: string): Promise<void>;
}

class GCPSecretsManager implements SecretsManager {
  private secretManagerClient: SecretManagerServiceClient;
  private encryptionKey: string;
  private auditLogger: SecurityAuditLogger;
  
  async getProviderKey(provider: string, environment: string): Promise<string> {
    const secretName = `provider-keys/${provider}/${environment}`;
    
    try {
      const [response] = await this.secretManagerClient.accessSecretVersion({
        name: this.buildSecretPath(secretName)
      });
      
      const secretValue = response.payload?.data?.toString() || '';
      
      // Audit secret access
      await this.auditLogger.logSecretAccess({
        type: 'provider_key_access',
        secretName,
        service: 'provider_router',
        timestamp: new Date()
      });
      
      return secretValue;
      
    } catch (error) {
      await this.auditLogger.logSecretAccess({
        type: 'provider_key_access_failed',
        secretName,
        error: error.message,
        timestamp: new Date()
      });
      
      throw new SecretsError(`Failed to retrieve provider key: ${error.message}`);
    }
  }
  
  async rotateProviderKey(provider: string, newKey: string): Promise<void> {
    const secretName = `provider-keys/${provider}/${this.getEnvironment()}`;
    
    try {
      // Create new version of secret
      await this.secretManagerClient.addSecretVersion({
        parent: this.buildSecretPath(secretName, false),
        payload: {
          data: Buffer.from(newKey)
        }
      });
      
      // Update configuration to use new key
      await this.updateProviderConfiguration(provider, newKey);
      
      await this.auditLogger.logSecretAccess({
        type: 'provider_key_rotated',
        secretName,
        rotatedBy: 'system', // or user ID if manual rotation
        timestamp: new Date()
      });
      
    } catch (error) {
      await this.auditLogger.logSecretAccess({
        type: 'provider_key_rotation_failed',
        secretName,
        error: error.message,
        timestamp: new Date()
      });
      
      throw new SecretsError(`Failed to rotate provider key: ${error.message}`);
    }
  }
  
  private buildSecretPath(secretName: string, includeVersion = true): string {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const version = includeVersion ? 'latest' : '';
    return `projects/${projectId}/secrets/${secretName}${includeVersion ? '/versions/' + version : ''}`;
  }
}
```

### 5.2 Provider Key Rotation Strategy

```typescript
interface KeyRotationService {
  scheduleRotation(provider: string, rotationInterval: number): void;
  executeRotation(provider: string): Promise<RotationResult>;
  validateKeyHealth(provider: string): Promise<KeyHealthStatus>;
}

interface RotationResult {
  success: boolean;
  oldKeyId?: string;
  newKeyId?: string;
  rotationTime: Date;
  affectedServices: string[];
  rollbackPlan?: RollbackPlan;
}

class AutomatedKeyRotation implements KeyRotationService {
  private secretsManager: SecretsManager;
  private providerClients: Map<string, ProviderClient>;
  private scheduler: JobScheduler;
  
  async executeRotation(provider: string): Promise<RotationResult> {
    const rotationId = `rotation_${provider}_${Date.now()}`;
    
    try {
      // 1. Generate new API key with provider
      const newKey = await this.generateNewProviderKey(provider);
      
      // 2. Test new key validity
      await this.validateNewKey(provider, newKey);
      
      // 3. Store new key in secrets manager
      await this.secretsManager.rotateProviderKey(provider, newKey);
      
      // 4. Update service configurations with new key
      const affectedServices = await this.updateServiceConfigurations(provider, newKey);
      
      // 5. Wait for propagation (30 seconds)
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // 6. Test all services with new key
      await this.testServicesWithNewKey(provider);
      
      // 7. Deactivate old key (after grace period)
      setTimeout(() => {
        this.deactivateOldKey(provider, rotationId);
      }, 300000); // 5 minute grace period
      
      return {
        success: true,
        newKeyId: newKey.substring(0, 8) + '...',
        rotationTime: new Date(),
        affectedServices
      };
      
    } catch (error) {
      // Rollback on failure
      await this.rollbackRotation(provider, rotationId);
      
      return {
        success: false,
        rotationTime: new Date(),
        affectedServices: []
      };
    }
  }
  
  private async validateNewKey(provider: string, key: string): Promise<void> {
    const client = this.createProviderClient(provider, key);
    
    // Test with minimal API call
    switch (provider) {
      case 'openai':
        await client.models.list();
        break;
      case 'anthropic':
        // Anthropic doesn't have a models endpoint, test with a small completion
        await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        });
        break;
      default:
        throw new Error(`Key validation not implemented for provider: ${provider}`);
    }
  }
}
```

---

## 6. Network Security

### 6.1 VPC and Firewall Configuration

```hcl
# VPC configuration
resource "google_compute_network" "agentworks_vpc" {
  name                    = "agentworks-vpc"
  auto_create_subnetworks = false
  description            = "AgentWorks platform VPC with security zones"
}

# Public subnet for load balancers
resource "google_compute_subnetwork" "public" {
  name          = "agentworks-public"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.agentworks_vpc.id
  description   = "Public subnet for load balancers"
}

# Private subnet for application services
resource "google_compute_subnetwork" "private" {
  name                     = "agentworks-private"
  ip_cidr_range           = "10.0.2.0/24"
  region                  = var.region
  network                 = google_compute_network.agentworks_vpc.id
  private_ip_google_access = true
  description             = "Private subnet for Cloud Run services"
  
  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling       = 0.1
    metadata           = "INCLUDE_ALL_METADATA"
  }
}

# Database subnet with strict access controls
resource "google_compute_subnetwork" "database" {
  name          = "agentworks-database"
  ip_cidr_range = "10.0.3.0/24"
  region        = var.region
  network       = google_compute_network.agentworks_vpc.id
  description   = "Database subnet with restricted access"
}

# Firewall rules
resource "google_compute_firewall" "deny_all_ingress" {
  name    = "agentworks-deny-all-ingress"
  network = google_compute_network.agentworks_vpc.name
  
  deny {
    protocol = "all"
  }
  
  direction   = "INGRESS"
  priority    = 65534
  source_ranges = ["0.0.0.0/0"]
  description = "Deny all ingress traffic by default"
}

resource "google_compute_firewall" "allow_https_ingress" {
  name    = "agentworks-allow-https"
  network = google_compute_network.agentworks_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["443"]
  }
  
  direction     = "INGRESS"
  priority      = 1000
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["https-server"]
  description   = "Allow HTTPS traffic to load balancers"
}

resource "google_compute_firewall" "allow_internal" {
  name    = "agentworks-allow-internal"
  network = google_compute_network.agentworks_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080", "9090"]
  }
  
  direction     = "INGRESS"
  priority      = 1000
  source_ranges = ["10.0.0.0/8"]
  description   = "Allow internal service communication"
}

resource "google_compute_firewall" "deny_database_external" {
  name    = "agentworks-deny-database-external"
  network = google_compute_network.agentworks_vpc.name
  
  deny {
    protocol = "tcp"
    ports    = ["5432"]
  }
  
  direction     = "INGRESS"
  priority      = 500
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["database"]
  description   = "Deny external access to database"
}
```

### 6.2 Cloud Run Security Configuration

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: agentworks-api
  annotations:
    run.googleapis.com/ingress: internal-and-cloud-load-balancing
    run.googleapis.com/network-interfaces: |
      [{"network": "agentworks-vpc", "subnetwork": "agentworks-private"}]
spec:
  template:
    metadata:
      annotations:
        # Security annotations
        run.googleapis.com/execution-environment: gen2
        run.googleapis.com/cpu-throttling: "true"
        run.googleapis.com/vpc-access-connector: agentworks-connector
        
        # Resource limits
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "100"
        
        # Security policy
        run.googleapis.com/binary-authorization: "projects/PROJECT_ID/policy"
    spec:
      serviceAccountName: agentworks-api-sa@PROJECT_ID.iam.gserviceaccount.com
      containerConcurrency: 100
      timeoutSeconds: 300
      
      containers:
      - image: gcr.io/PROJECT_ID/agentworks-api:latest
        
        # Security context
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
        
        # Resource limits
        resources:
          limits:
            cpu: 2000m
            memory: 1Gi
          requests:
            cpu: 500m
            memory: 256Mi
        
        # Environment variables (no secrets here)
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        - name: METRICS_PORT
          value: "9090"
        
        # Health checks
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

---

## 7. Data Protection and Encryption

### 7.1 Encryption Strategy

```typescript
interface EncryptionService {
  // Field-level encryption for sensitive data
  encryptField(plaintext: string, fieldType: FieldType): Promise<EncryptedField>;
  decryptField(encryptedField: EncryptedField): Promise<string>;
  
  // Document encryption for large content
  encryptDocument(content: Buffer, metadata: DocumentMetadata): Promise<EncryptedDocument>;
  decryptDocument(encryptedDoc: EncryptedDocument): Promise<Buffer>;
  
  // Key management
  rotateFieldKey(fieldType: FieldType): Promise<void>;
  deriveWorkspaceKey(workspaceId: string): Promise<DerivedKey>;
}

interface EncryptedField {
  ciphertext: string;        // Base64 encoded encrypted data
  keyId: string;            // Key version used for encryption
  algorithm: string;        // Encryption algorithm used
  iv: string;               // Initialization vector
  authTag?: string;         // Authentication tag for AEAD
  fieldType: FieldType;
}

interface FieldType {
  name: string;             // 'email', 'api_key', 'personal_data'
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  retentionPeriod: number;  // Days
  keyRotationInterval: number; // Days
}

class CloudKMSEncryption implements EncryptionService {
  private kmsClient: KeyManagementServiceClient;
  private keyRing: string;
  private encryptionCache: Map<string, CachedKey>;
  
  async encryptField(plaintext: string, fieldType: FieldType): Promise<EncryptedField> {
    try {
      // Get or create key for this field type
      const keyName = await this.getFieldKey(fieldType);
      
      // Generate random IV
      const iv = crypto.randomBytes(16);
      
      // Encrypt using AES-256-GCM
      const cipher = crypto.createCipher('aes-256-gcm', await this.deriveKeyMaterial(keyName));
      cipher.setAAD(Buffer.from(fieldType.name)); // Additional authenticated data
      
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        ciphertext,
        keyId: keyName,
        algorithm: 'AES-256-GCM',
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        fieldType
      };
      
    } catch (error) {
      throw new EncryptionError(`Field encryption failed: ${error.message}`);
    }
  }
  
  async decryptField(encryptedField: EncryptedField): Promise<string> {
    try {
      // Validate key access
      const keyMaterial = await this.deriveKeyMaterial(encryptedField.keyId);
      
      // Decrypt using stored algorithm and IV
      const decipher = crypto.createDecipher(
        encryptedField.algorithm.toLowerCase(),
        keyMaterial
      );
      
      if (encryptedField.authTag) {
        decipher.setAuthTag(Buffer.from(encryptedField.authTag, 'hex'));
        decipher.setAAD(Buffer.from(encryptedField.fieldType.name));
      }
      
      let plaintext = decipher.update(encryptedField.ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
      
    } catch (error) {
      throw new DecryptionError(`Field decryption failed: ${error.message}`);
    }
  }
  
  private async getFieldKey(fieldType: FieldType): Promise<string> {
    const keyName = `field-encryption-${fieldType.name}`;
    
    try {
      // Check if key exists
      const [key] = await this.kmsClient.getCryptoKey({
        name: this.buildKeyPath(keyName)
      });
      
      return key.name!;
      
    } catch (error) {
      if (error.code === 5) { // NOT_FOUND
        // Create new key
        return await this.createFieldKey(keyName, fieldType);
      }
      throw error;
    }
  }
  
  private async createFieldKey(keyName: string, fieldType: FieldType): Promise<string> {
    const [key] = await this.kmsClient.createCryptoKey({
      parent: this.keyRing,
      cryptoKeyId: keyName,
      cryptoKey: {
        purpose: 'ENCRYPT_DECRYPT',
        versionTemplate: {
          algorithm: 'GOOGLE_SYMMETRIC_ENCRYPTION',
          protectionLevel: 'SOFTWARE' // Use HSM for critical data
        },
        rotationPeriod: {
          seconds: fieldType.keyRotationInterval * 24 * 60 * 60 // Convert days to seconds
        },
        nextRotationTime: {
          seconds: Math.floor(Date.now() / 1000) + (fieldType.keyRotationInterval * 24 * 60 * 60)
        }
      }
    });
    
    return key.name!;
  }
}
```

### 7.2 Data Loss Prevention (DLP)

```typescript
interface DLPService {
  scanContent(content: string, context: ScanContext): Promise<DLPResult>;
  redactSensitiveData(content: string, redactionLevel: RedactionLevel): Promise<string>;
  classifyDataSensitivity(content: string): Promise<SensitivityClassification>;
}

interface DLPResult {
  hasViolations: boolean;
  violations: DLPViolation[];
  riskScore: number; // 0-100
  recommendedAction: 'allow' | 'redact' | 'block';
}

interface DLPViolation {
  type: 'PII' | 'API_KEY' | 'CREDIT_CARD' | 'SSN' | 'EMAIL' | 'PHONE';
  confidence: number;
  location: {
    start: number;
    end: number;
  };
  suggestedRedaction: string;
}

class CloudDLPService implements DLPService {
  private dlpClient: DlpServiceClient;
  private auditLogger: SecurityAuditLogger;
  
  async scanContent(content: string, context: ScanContext): Promise<DLPResult> {
    try {
      const [response] = await this.dlpClient.inspectContent({
        parent: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/global`,
        inspectConfig: {
          infoTypes: [
            { name: 'EMAIL_ADDRESS' },
            { name: 'CREDIT_CARD_NUMBER' },
            { name: 'US_SOCIAL_SECURITY_NUMBER' },
            { name: 'API_KEY' },
            { name: 'PHONE_NUMBER' },
            { name: 'PERSON_NAME' }
          ],
          minLikelihood: 'POSSIBLE',
          limits: {
            maxFindingsPerRequest: 100
          },
          includeQuote: true
        },
        item: {
          value: content
        }
      });
      
      const violations: DLPViolation[] = response.result?.findings?.map(finding => ({
        type: finding.infoType?.name as any,
        confidence: this.mapLikelihoodToConfidence(finding.likelihood),
        location: {
          start: finding.location?.byteRange?.start || 0,
          end: finding.location?.byteRange?.end || 0
        },
        suggestedRedaction: this.generateRedaction(finding.infoType?.name)
      })) || [];
      
      const riskScore = this.calculateRiskScore(violations);
      const recommendedAction = this.determineAction(riskScore, violations);
      
      // Log DLP scan for audit
      await this.auditLogger.logDLPScan({
        contentType: context.contentType,
        workspaceId: context.workspaceId,
        violationCount: violations.length,
        riskScore,
        action: recommendedAction,
        timestamp: new Date()
      });
      
      return {
        hasViolations: violations.length > 0,
        violations,
        riskScore,
        recommendedAction
      };
      
    } catch (error) {
      throw new DLPError(`Content scanning failed: ${error.message}`);
    }
  }
  
  private calculateRiskScore(violations: DLPViolation[]): number {
    if (violations.length === 0) return 0;
    
    const weights = {
      'API_KEY': 100,
      'CREDIT_CARD_NUMBER': 90,
      'US_SOCIAL_SECURITY_NUMBER': 85,
      'EMAIL_ADDRESS': 30,
      'PHONE_NUMBER': 25,
      'PERSON_NAME': 20
    };
    
    let totalScore = 0;
    for (const violation of violations) {
      const weight = weights[violation.type] || 10;
      totalScore += weight * (violation.confidence / 100);
    }
    
    return Math.min(100, totalScore / violations.length);
  }
}
```

---

## 8. Security Monitoring and Incident Response

### 8.1 Security Event Detection

```typescript
interface SecurityMonitor {
  detectAnomalies(events: SecurityEvent[]): Promise<Anomaly[]>;
  analyzeLoginPatterns(userId: string): Promise<LoginAnalysis>;
  detectSuspiciousApiUsage(workspaceId: string): Promise<UsageAnomaly[]>;
  monitorPrivilegeEscalation(): Promise<PrivilegeAlert[]>;
}

interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  workspaceId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
}

type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'password_change'
  | 'permission_change'
  | 'api_key_access'
  | 'unusual_api_usage'
  | 'cross_tenant_access'
  | 'data_export'
  | 'admin_action';

class RealTimeSecurityMonitor implements SecurityMonitor {
  private anomalyDetector: AnomalyDetector;
  private alertManager: AlertManager;
  private geoLocationService: GeoLocationService;
  
  async detectAnomalies(events: SecurityEvent[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Group events by user for pattern analysis
    const userEvents = this.groupEventsByUser(events);
    
    for (const [userId, userEventList] of userEvents) {
      // Detect location anomalies
      const locationAnomalies = await this.detectLocationAnomalies(userId, userEventList);
      anomalies.push(...locationAnomalies);
      
      // Detect time-based anomalies
      const timeAnomalies = await this.detectTimeAnomalies(userId, userEventList);
      anomalies.push(...timeAnomalies);
      
      // Detect behavior anomalies
      const behaviorAnomalies = await this.detectBehaviorAnomalies(userId, userEventList);
      anomalies.push(...behaviorAnomalies);
    }
    
    // Process anomalies and trigger alerts
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        await this.alertManager.triggerSecurityAlert(anomaly);
      }
    }
    
    return anomalies;
  }
  
  private async detectLocationAnomalies(
    userId: string,
    events: SecurityEvent[]
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Get user's typical locations
    const userProfile = await this.getUserLocationProfile(userId);
    
    for (const event of events) {
      const location = await this.geoLocationService.getLocation(event.ip);
      
      // Check if location is unusual
      const isUnusualLocation = !userProfile.commonLocations.some(loc => 
        this.calculateDistance(loc, location) < 100 // 100km radius
      );
      
      if (isUnusualLocation && this.isHighRiskEvent(event)) {
        anomalies.push({
          id: `location_${event.id}`,
          type: 'unusual_location',
          severity: 'high',
          userId,
          description: `Login from unusual location: ${location.city}, ${location.country}`,
          evidence: {
            newLocation: location,
            commonLocations: userProfile.commonLocations,
            event
          },
          timestamp: event.timestamp
        });
      }
    }
    
    return anomalies;
  }
  
  private async detectBehaviorAnomalies(
    userId: string,
    events: SecurityEvent[]
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Get user's behavior baseline
    const baseline = await this.getUserBehaviorBaseline(userId);
    
    // Check for unusual activity patterns
    const apiEvents = events.filter(e => e.type === 'unusual_api_usage');
    if (apiEvents.length > baseline.avgApiCallsPerHour * 5) {
      anomalies.push({
        id: `behavior_${userId}_${Date.now()}`,
        type: 'unusual_api_activity',
        severity: 'medium',
        userId,
        description: `Unusual API activity: ${apiEvents.length} calls (baseline: ${baseline.avgApiCallsPerHour})`,
        evidence: { events: apiEvents, baseline },
        timestamp: new Date()
      });
    }
    
    // Check for rapid permission changes
    const permissionEvents = events.filter(e => e.type === 'permission_change');
    if (permissionEvents.length > 3) {
      anomalies.push({
        id: `permission_${userId}_${Date.now()}`,
        type: 'rapid_permission_changes',
        severity: 'high',
        userId,
        description: `Rapid permission changes detected: ${permissionEvents.length} changes`,
        evidence: { events: permissionEvents },
        timestamp: new Date()
      });
    }
    
    return anomalies;
  }
}
```

### 8.2 Automated Incident Response

```typescript
interface IncidentResponse {
  handleSecurityAlert(alert: SecurityAlert): Promise<ResponseAction[]>;
  quarantineUser(userId: string, reason: string): Promise<void>;
  revokeApiKeys(workspaceId: string): Promise<void>;
  enableEmergencyAccess(requestorId: string): Promise<EmergencyAccess>;
}

interface ResponseAction {
  type: 'quarantine' | 'revoke_tokens' | 'lock_account' | 'require_mfa' | 'notify_admin';
  description: string;
  automated: boolean;
  executedAt?: Date;
  success?: boolean;
}

class AutomatedIncidentResponse implements IncidentResponse {
  private userService: UserService;
  private tokenService: TokenService;
  private notificationService: NotificationService;
  private auditLogger: SecurityAuditLogger;
  
  async handleSecurityAlert(alert: SecurityAlert): Promise<ResponseAction[]> {
    const actions: ResponseAction[] = [];
    
    // Determine response based on alert type and severity
    switch (alert.type) {
      case 'unusual_location':
        if (alert.severity === 'critical') {
          actions.push(...await this.handleCriticalLocationAlert(alert));
        } else {
          actions.push(...await this.handleLocationAlert(alert));
        }
        break;
        
      case 'privilege_escalation':
        actions.push(...await this.handlePrivilegeEscalationAlert(alert));
        break;
        
      case 'data_exfiltration':
        actions.push(...await this.handleDataExfiltrationAlert(alert));
        break;
        
      case 'brute_force_attack':
        actions.push(...await this.handleBruteForceAlert(alert));
        break;
        
      default:
        actions.push(...await this.handleGenericAlert(alert));
    }
    
    // Execute automated actions
    for (const action of actions.filter(a => a.automated)) {
      try {
        await this.executeAction(action, alert);
        action.success = true;
        action.executedAt = new Date();
      } catch (error) {
        action.success = false;
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
    
    // Log incident response
    await this.auditLogger.logIncidentResponse({
      alertId: alert.id,
      actions,
      handledAt: new Date()
    });
    
    return actions;
  }
  
  private async handleCriticalLocationAlert(alert: SecurityAlert): Promise<ResponseAction[]> {
    const userId = alert.userId!;
    
    return [
      {
        type: 'quarantine',
        description: 'Temporarily quarantine user due to login from suspicious location',
        automated: true
      },
      {
        type: 'revoke_tokens',
        description: 'Revoke all active sessions and tokens',
        automated: true
      },
      {
        type: 'require_mfa',
        description: 'Force MFA setup for future logins',
        automated: true
      },
      {
        type: 'notify_admin',
        description: 'Notify workspace administrators of security incident',
        automated: true
      }
    ];
  }
  
  private async handleDataExfiltrationAlert(alert: SecurityAlert): Promise<ResponseAction[]> {
    const workspaceId = alert.workspaceId!;
    
    return [
      {
        type: 'quarantine',
        description: 'Quarantine all users in affected workspace',
        automated: false // Requires manual approval
      },
      {
        type: 'revoke_tokens',
        description: 'Revoke all API tokens for workspace',
        automated: true
      },
      {
        type: 'lock_account',
        description: 'Lock workspace account pending investigation',
        automated: false
      },
      {
        type: 'notify_admin',
        description: 'Immediate notification to security team and workspace owners',
        automated: true
      }
    ];
  }
  
  async quarantineUser(userId: string, reason: string): Promise<void> {
    try {
      // Set user status to quarantined
      await this.userService.updateUserStatus(userId, 'quarantined', reason);
      
      // Revoke all active sessions
      await this.tokenService.revokeAllUserSessions(userId);
      
      // Log quarantine action
      await this.auditLogger.logSecurityAction({
        type: 'user_quarantined',
        userId,
        reason,
        executedBy: 'system',
        timestamp: new Date()
      });
      
      // Notify user via email (if email is not compromised)
      await this.notificationService.sendSecurityNotification(userId, {
        type: 'account_quarantined',
        reason,
        nextSteps: 'Contact support to verify your identity and restore access'
      });
      
    } catch (error) {
      throw new SecurityError(`Failed to quarantine user: ${error.message}`);
    }
  }
}
```

This comprehensive security architecture provides AgentWorks with enterprise-grade security controls, multi-tenant isolation, and automated threat detection and response capabilities suitable for production deployment.