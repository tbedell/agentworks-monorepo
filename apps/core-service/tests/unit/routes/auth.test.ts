import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import Fastify from 'fastify';
import { authRoutes } from '../../../src/routes/auth.js';
import { createTestUser, createTestWorkspace } from '../../../../tests/setup/backend.js';
import * as auth from '../../../src/lib/auth.js';
import * as database from '../../../src/lib/database.js';

// Mock external dependencies
jest.mock('../../../src/lib/auth.js');
jest.mock('../../../src/lib/database.js');
jest.mock('@agentworks/shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
  createServiceError: (code: string, message: string) => ({ code, message }),
}));

const mockAuth = auth as jest.Mocked<typeof auth>;
const mockDatabase = database as jest.Mocked<typeof database>;

describe('Auth Routes', () => {
  let app: any;
  let mockDb: any;

  beforeEach(async () => {
    app = Fastify();
    
    // Mock database
    mockDb = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      workspace: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      project: {
        create: jest.fn(),
      },
      board: {
        create: jest.fn(),
      },
      lane: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    
    mockDatabase.getDatabase.mockReturnValue(mockDb);
    
    await app.register(authRoutes, { prefix: '/auth' });
  });

  describe('POST /auth/register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      workspaceName: 'Test Workspace',
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
      };
      
      const mockWorkspace = {
        id: 'workspace-123',
        name: 'Test Workspace',
        ownerId: 'user-123',
      };

      const mockSession = {
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      };

      // Mock database operations
      mockDb.user.findUnique.mockResolvedValue(null);
      mockAuth.hashPassword.mockResolvedValue('hashed-password');
      mockDb.$transaction.mockImplementation(async (callback) => {
        return await callback({
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          workspace: {
            create: jest.fn().mockResolvedValue(mockWorkspace),
          },
          project: {
            create: jest.fn().mockResolvedValue({ id: 'project-123' }),
          },
          board: {
            create: jest.fn().mockResolvedValue({ id: 'board-123' }),
          },
          lane: {
            create: jest.fn().mockResolvedValue({ id: 'lane-123' }),
          },
        });
      });
      mockAuth.createSession.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: validRegisterData,
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body).toMatchObject({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
        workspace: {
          id: mockWorkspace.id,
          name: mockWorkspace.name,
        },
        token: mockSession.token,
        refreshToken: mockSession.refreshToken,
        expiresIn: mockSession.expiresIn,
      });

      expect(mockAuth.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockAuth.createSession).toHaveBeenCalledWith('user-123', 'workspace-123', 'owner');
    });

    it('should reject registration with existing email', async () => {
      mockDb.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: validRegisterData,
      });

      expect(response.statusCode).toBe(400);
      
      const body = response.json();
      expect(body).toMatchObject({
        code: 'USER_EXISTS',
        message: 'User with this email already exists',
      });
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: '123', // too short
          // missing name and workspaceName
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle database transaction failure', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      mockAuth.hashPassword.mockResolvedValue('hashed-password');
      mockDb.$transaction.mockRejectedValue(new Error('Database error'));

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: validRegisterData,
      });

      expect(response.statusCode).toBe(500);
      
      const body = response.json();
      expect(body).toMatchObject({
        error: 'REGISTRATION_FAILED',
        message: 'Failed to register user',
      });
    });
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        ownedWorkspaces: [{
          id: 'workspace-123',
          name: 'Test Workspace',
        }],
        workspaceMemberships: [],
      };

      const mockSession = {
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      };

      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockAuth.verifyPassword.mockResolvedValue(true);
      mockAuth.createSession.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: validLoginData,
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body).toMatchObject({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        },
        workspace: {
          id: mockUser.ownedWorkspaces[0].id,
          name: mockUser.ownedWorkspaces[0].name,
        },
        token: mockSession.token,
      });

      expect(mockAuth.verifyPassword).toHaveBeenCalledWith('hashed-password', 'password123');
      expect(mockAuth.createSession).toHaveBeenCalledWith('user-123', 'workspace-123', 'owner');
    });

    it('should reject invalid email', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: validLoginData,
      });

      expect(response.statusCode).toBe(401);
      
      const body = response.json();
      expect(body).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    });

    it('should reject invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        ownedWorkspaces: [],
        workspaceMemberships: [],
      };

      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockAuth.verifyPassword.mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: validLoginData,
      });

      expect(response.statusCode).toBe(401);
      
      const body = response.json();
      expect(body).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    });

    it('should handle user without workspace', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password: 'hashed-password',
        ownedWorkspaces: [],
        workspaceMemberships: [],
      };

      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockAuth.verifyPassword.mockResolvedValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: validLoginData,
      });

      expect(response.statusCode).toBe(401);
      
      const body = response.json();
      expect(body).toMatchObject({
        code: 'NO_WORKSPACE',
        message: 'No workspace found',
      });
    });

    it('should login user as workspace member', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        ownedWorkspaces: [],
        workspaceMemberships: [{
          role: 'member',
          workspace: {
            id: 'workspace-456',
            name: 'Shared Workspace',
          },
        }],
      };

      const mockSession = {
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      };

      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockAuth.verifyPassword.mockResolvedValue(true);
      mockAuth.createSession.mockResolvedValue(mockSession);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: validLoginData,
      });

      expect(response.statusCode).toBe(200);
      
      expect(mockAuth.createSession).toHaveBeenCalledWith('user-123', 'workspace-456', 'member');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockTokens = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };

      mockAuth.refreshTokens.mockResolvedValue(mockTokens);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'old-refresh-token',
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body).toEqual(mockTokens);
      
      expect(mockAuth.refreshTokens).toHaveBeenCalledWith('old-refresh-token');
    });

    it('should reject invalid refresh token', async () => {
      mockAuth.refreshTokens.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'invalid-refresh-token',
        },
      });

      expect(response.statusCode).toBe(401);
      
      const body = response.json();
      expect(body).toMatchObject({
        error: 'REFRESH_FAILED',
        message: 'Failed to refresh tokens',
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      mockAuth.destroySession.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          'x-session-id': 'session-123',
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body).toMatchObject({
        message: 'Logged out successfully',
      });
      
      expect(mockAuth.destroySession).toHaveBeenCalledWith('session-123');
    });

    it('should logout without session id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expect(response.statusCode).toBe(200);
      expect(mockAuth.destroySession).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: null,
        createdAt: new Date(),
      };

      const mockWorkspace = {
        id: 'workspace-123',
        name: 'Test Workspace',
        description: 'A test workspace',
        createdAt: new Date(),
      };

      // Mock authentication
      mockAuth.authenticateRequest.mockImplementation(async (request: any, reply: any) => {
        request.user = {
          id: 'user-123',
          workspaceId: 'workspace-123',
          role: 'owner',
        };
      });

      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockDb.workspace.findUnique.mockResolvedValue(mockWorkspace);

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'Bearer mock-token',
        },
      });

      expect(response.statusCode).toBe(200);
      
      const body = response.json();
      expect(body).toMatchObject({
        user: mockUser,
        workspace: mockWorkspace,
        role: 'owner',
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.authenticateRequest.mockImplementation(async (request: any, reply: any) => {
        reply.status(401).send({ error: 'Authentication required' });
      });

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});