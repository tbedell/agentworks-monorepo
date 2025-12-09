import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { FastifyRequest, FastifyReply } from 'fastify';
import { createLogger, createServiceError, type AuthToken } from '@agentworks/shared';
import { getDatabase } from './database.js';
import { getSession, setSession, deleteSession } from './redis.js';

const logger = createLogger('core-service:auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-token-dev';
const SESSION_TTL = 86400 * 7; // 7 days

// Check if token is an internal service token (for service-to-service communication)
function isInternalServiceToken(token: string): boolean {
  return token === INTERNAL_SERVICE_TOKEN;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    workspaceId: string;
    role: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64MB
      timeCost: 3,
      parallelism: 1,
    });
  } catch (error) {
    logger.error('Failed to hash password', { error });
    throw createServiceError('HASH_ERROR', 'Failed to hash password');
  }
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    logger.error('Failed to verify password', { error });
    return false;
  }
}

export function generateAccessToken(payload: AuthToken): string {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '15m',
    issuer: 'agentworks-core',
    audience: 'agentworks',
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { 
    expiresIn: '7d',
    issuer: 'agentworks-core',
    audience: 'agentworks',
  });
}

export function verifyToken(token: string): AuthToken {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'agentworks-core',
      audience: 'agentworks',
    }) as AuthToken;
    
    return decoded;
  } catch (error) {
    logger.warn('Token verification failed', { error });
    throw createServiceError('INVALID_TOKEN', 'Invalid or expired token');
  }
}

export async function createSession(userId: string, workspaceId: string, role: string): Promise<{
  sessionId: string;
  accessToken: string;
  refreshToken: string;
}> {
  const sessionId = `${userId}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  
  const tokenPayload: AuthToken = {
    userId,
    workspaceId,
    role,
    exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
  };
  
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(userId);
  
  // Store session in Redis
  await setSession(sessionId, {
    userId,
    workspaceId,
    role,
    refreshToken,
    createdAt: new Date(),
  }, SESSION_TTL);
  
  return {
    sessionId,
    accessToken,
    refreshToken,
  };
}

export async function refreshTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    const db = getDatabase();
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        ownedWorkspaces: true,
        workspaceMemberships: {
          include: {
            workspace: true,
          },
        },
      },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get primary workspace (owned or first membership)
    const workspace = user.ownedWorkspaces[0] || user.workspaceMemberships[0]?.workspace;
    if (!workspace) {
      throw new Error('No workspace found');
    }
    
    const role = user.ownedWorkspaces[0] ? 'owner' : user.workspaceMemberships[0]?.role || 'viewer';
    
    const tokenPayload: AuthToken = {
      userId: user.id,
      workspaceId: workspace.id,
      role,
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    };
    
    return {
      accessToken: generateAccessToken(tokenPayload),
      refreshToken: generateRefreshToken(user.id),
    };
  } catch (error) {
    logger.warn('Token refresh failed', { error });
    return null;
  }
}

export async function destroySession(sessionId: string): Promise<void> {
  await deleteSession(sessionId);
}

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createServiceError('MISSING_TOKEN', 'Authorization token required');
    }

    const token = authHeader.split(' ')[1];

    // Check if this is an internal service token (service-to-service communication)
    if (isInternalServiceToken(token)) {
      // For internal service calls, create a system user context
      // This allows services like agent-orchestrator to make authenticated calls
      (request as AuthenticatedRequest).user = {
        id: 'system-service',
        email: 'system@agentworks.ai',
        name: 'System Service',
        workspaceId: 'system',
        role: 'owner', // Internal services have full access
      };
      logger.debug('Internal service authenticated', { url: request.url });
      return;
    }

    const decoded = verifyToken(token);

    // Get user details from database
    const db = getDatabase();
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        ownedWorkspaces: {
          where: { id: decoded.workspaceId },
        },
        workspaceMemberships: {
          where: { workspaceId: decoded.workspaceId },
          include: { workspace: true },
        },
      },
    });

    if (!user) {
      throw createServiceError('USER_NOT_FOUND', 'User not found');
    }

    // Verify workspace access
    const hasAccess = user.ownedWorkspaces.length > 0 ||
                     user.workspaceMemberships.length > 0;

    if (!hasAccess) {
      throw createServiceError('WORKSPACE_ACCESS_DENIED', 'Access denied to workspace');
    }

    // Add user to request
    (request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      workspaceId: decoded.workspaceId,
      role: decoded.role,
    };

  } catch (error) {
    const err = error as any;
    logger.warn('Authentication failed', {
      error: err.message,
      url: request.url,
    });

    const statusCode = err.code === 'INVALID_TOKEN' ? 401 : 403;
    return reply.status(statusCode).send({
      error: err.code || 'AUTHENTICATION_FAILED',
      message: err.message || 'Authentication failed',
    });
  }
}

export async function requireWorkspaceAccess(
  request: AuthenticatedRequest,
  reply: FastifyReply,
  workspaceId: string,
  requiredRole: 'owner' | 'member' | 'viewer' = 'viewer'
): Promise<boolean> {
  if (!request.user) {
    reply.status(401).send({ error: 'Authentication required' });
    return false;
  }

  // Internal service users (system-service) have access to all workspaces
  if (request.user.id === 'system-service' && request.user.workspaceId === 'system') {
    return true;
  }

  if (request.user.workspaceId !== workspaceId) {
    reply.status(403).send({ error: 'Access denied to workspace' });
    return false;
  }

  const roleHierarchy = { owner: 3, member: 2, viewer: 1 };
  const userRoleLevel = roleHierarchy[request.user.role as keyof typeof roleHierarchy] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole];

  if (userRoleLevel < requiredRoleLevel) {
    reply.status(403).send({ error: 'Insufficient permissions' });
    return false;
  }

  return true;
}