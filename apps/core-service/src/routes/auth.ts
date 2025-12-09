import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { createLogger, createServiceError } from '@agentworks/shared';
import { getDatabase } from '../lib/database.js';
import { 
  hashPassword, 
  verifyPassword, 
  createSession, 
  refreshTokens, 
  destroySession,
  type AuthenticatedRequest 
} from '../lib/auth.js';

const logger = createLogger('core-service:auth');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  workspaceName: z.string().min(2),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(
  app: FastifyInstance,
  opts: FastifyPluginOptions
) {
  // Register new user and workspace
  app.post('/register', async (request, reply) => {
    try {
      const { email, password, name, workspaceName } = registerSchema.parse(request.body);
      
      const db = getDatabase();
      
      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { email },
      });
      
      if (existingUser) {
        throw createServiceError('USER_EXISTS', 'User with this email already exists');
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user and workspace in transaction
      const result = await db.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
          },
        });
        
        // Create workspace
        const workspace = await tx.workspace.create({
          data: {
            name: workspaceName,
            ownerId: user.id,
          },
        });
        
        // Create default project and board
        const project = await tx.project.create({
          data: {
            name: 'My First Project',
            description: 'Welcome to AgentWorks!',
            workspaceId: workspace.id,
          },
        });
        
        const board = await tx.board.create({
          data: {
            name: 'Development Board',
            projectId: project.id,
          },
        });
        
        // Create default lanes
        const lanes = [
          { laneNumber: 0, name: 'Vision & Planning' },
          { laneNumber: 1, name: 'Research' },
          { laneNumber: 2, name: 'Development' },
          { laneNumber: 3, name: 'Testing' },
          { laneNumber: 4, name: 'Deployment' },
          { laneNumber: 5, name: 'Complete' },
        ];
        
        for (const lane of lanes) {
          await tx.lane.create({
            data: {
              ...lane,
              boardId: board.id,
            },
          });
        }
        
        return { user, workspace };
      });
      
      // Create session
      const session = await createSession(result.user.id, result.workspace.id, 'owner');
      
      logger.info('User registered successfully', {
        userId: result.user.id,
        email: result.user.email,
        workspaceId: result.workspace.id,
      });
      
      return reply.send({
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        workspace: {
          id: result.workspace.id,
          name: result.workspace.name,
        },
        ...session,
      });
      
    } catch (error) {
      const err = error as any;
      logger.error('Registration failed', { error });
      
      if (err.code) {
        return reply.status(400).send(err);
      }
      
      return reply.status(500).send({
        error: 'REGISTRATION_FAILED',
        message: 'Failed to register user',
      });
    }
  });
  
  // Login
  app.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);
      
      const db = getDatabase();
      const user = await db.user.findUnique({
        where: { email },
        include: {
          ownedWorkspaces: true,
          workspaceMemberships: {
            include: {
              workspace: true,
            },
          },
        },
      });
      
      if (!user || !user.password) {
        throw createServiceError('INVALID_CREDENTIALS', 'Invalid email or password');
      }
      
      const passwordValid = await verifyPassword(user.password, password);
      if (!passwordValid) {
        throw createServiceError('INVALID_CREDENTIALS', 'Invalid email or password');
      }
      
      // Get primary workspace (owned or first membership)
      const workspace = user.ownedWorkspaces[0] || user.workspaceMemberships[0]?.workspace;
      if (!workspace) {
        throw createServiceError('NO_WORKSPACE', 'No workspace found');
      }
      
      const role = user.ownedWorkspaces[0] ? 'owner' : user.workspaceMemberships[0]?.role || 'viewer';
      
      // Create session
      const session = await createSession(user.id, workspace.id, role);
      
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        workspaceId: workspace.id,
      });
      
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        workspace: {
          id: workspace.id,
          name: workspace.name,
        },
        ...session,
      });
      
    } catch (error) {
      const err = error as any;
      logger.error('Login failed', { error });
      
      if (err.code) {
        return reply.status(401).send(err);
      }
      
      return reply.status(500).send({
        error: 'LOGIN_FAILED',
        message: 'Login failed',
      });
    }
  });
  
  // Refresh tokens
  app.post('/refresh', async (request, reply) => {
    try {
      const { refreshToken } = refreshSchema.parse(request.body);
      
      const tokens = await refreshTokens(refreshToken);
      if (!tokens) {
        throw createServiceError('INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
      }
      
      return reply.send(tokens);
      
    } catch (error) {
      logger.error('Token refresh failed', { error });
      
      return reply.status(401).send({
        error: 'REFRESH_FAILED',
        message: 'Failed to refresh tokens',
      });
    }
  });
  
  // Logout
  app.post('/logout', async (request, reply) => {
    try {
      const sessionId = request.headers['x-session-id'] as string;
      
      if (sessionId) {
        await destroySession(sessionId);
      }
      
      return reply.send({ message: 'Logged out successfully' });
      
    } catch (error) {
      logger.error('Logout failed', { error });
      
      return reply.status(500).send({
        error: 'LOGOUT_FAILED',
        message: 'Logout failed',
      });
    }
  });
  
  // Get current user
  app.get('/me', {
    preHandler: [
      async (request, reply) => {
        // Import here to avoid circular dependency
        const { authenticateRequest } = await import('../lib/auth.js');
        await authenticateRequest(request, reply);
      },
    ],
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    
    if (!authRequest.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    
    const db = getDatabase();
    const user = await db.user.findUnique({
      where: { id: authRequest.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    
    const workspace = await db.workspace.findUnique({
      where: { id: authRequest.user.workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });
    
    return reply.send({
      user,
      workspace,
      role: authRequest.user.role,
    });
  });
}