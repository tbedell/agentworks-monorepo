import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  hashPassword, 
  verifyPassword, 
  createSession, 
  refreshTokens, 
  destroySession,
  authenticateRequest 
} from '../../../src/lib/auth.js';
import * as redis from '../../../src/lib/redis.js';
import * as database from '../../../src/lib/database.js';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';

// Mock dependencies
jest.mock('../../../src/lib/redis.js');
jest.mock('../../../src/lib/database.js');
jest.mock('jsonwebtoken');
jest.mock('argon2');
jest.mock('@agentworks/shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockRedis = redis as jest.Mocked<typeof redis>;
const mockDatabase = database as jest.Mocked<typeof database>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockArgon2 = argon2 as jest.Mocked<typeof argon2>;

describe('Auth Library', () => {
  let mockRedisClient: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      setex: jest.fn(),
      exists: jest.fn(),
    };
    
    mockRedis.getRedisClient.mockReturnValue(mockRedisClient);
    
    // Mock database
    mockDb = {
      session: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };
    
    mockDatabase.getDatabase.mockReturnValue(mockDb);
    
    // Set environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
  });

  describe('hashPassword', () => {
    it('should hash password using argon2', async () => {
      const password = 'testpassword123';
      const hashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$test';
      
      mockArgon2.hash.mockResolvedValue(hashedPassword);
      
      const result = await hashPassword(password);
      
      expect(result).toBe(hashedPassword);
      expect(mockArgon2.hash).toHaveBeenCalledWith(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      });
    });

    it('should throw error if hashing fails', async () => {
      const password = 'testpassword123';
      
      mockArgon2.hash.mockRejectedValue(new Error('Hashing failed'));
      
      await expect(hashPassword(password)).rejects.toThrow('Hashing failed');
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully', async () => {
      const hashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$test';
      const password = 'testpassword123';
      
      mockArgon2.verify.mockResolvedValue(true);
      
      const result = await verifyPassword(hashedPassword, password);
      
      expect(result).toBe(true);
      expect(mockArgon2.verify).toHaveBeenCalledWith(hashedPassword, password);
    });

    it('should return false for invalid password', async () => {
      const hashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$test';
      const password = 'wrongpassword';
      
      mockArgon2.verify.mockResolvedValue(false);
      
      const result = await verifyPassword(hashedPassword, password);
      
      expect(result).toBe(false);
    });

    it('should handle verification errors', async () => {
      const hashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$test';
      const password = 'testpassword123';
      
      mockArgon2.verify.mockRejectedValue(new Error('Verification failed'));
      
      const result = await verifyPassword(hashedPassword, password);
      
      expect(result).toBe(false);
    });
  });

  describe('createSession', () => {
    const userId = 'user-123';
    const workspaceId = 'workspace-456';
    const role = 'owner';

    it('should create session successfully', async () => {
      const mockToken = 'mock-jwt-token';
      const mockRefreshToken = 'mock-refresh-token';
      const mockSession = {
        id: 'session-123',
        userId,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };

      mockJwt.sign.mockReturnValue(mockToken);
      mockDb.session.create.mockResolvedValue(mockSession);
      mockRedisClient.setex.mockResolvedValue('OK');

      const result = await createSession(userId, workspaceId, role);

      expect(result).toMatchObject({
        token: mockToken,
        refreshToken: expect.any(String),
        expiresIn: 900, // 15 minutes
      });

      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId,
          workspaceId,
          role,
          sessionId: mockSession.id,
        },
        'test-secret',
        { expiresIn: '15m' }
      );

      expect(mockDb.session.create).toHaveBeenCalledWith({
        data: {
          userId,
          expiresAt: expect.any(Date),
        },
      });

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        `refresh:${expect.any(String)}`,
        7 * 24 * 60 * 60, // 7 days
        JSON.stringify({
          userId,
          workspaceId,
          role,
          sessionId: mockSession.id,
        })
      );
    });

    it('should handle session creation failure', async () => {
      mockDb.session.create.mockRejectedValue(new Error('Database error'));

      await expect(createSession(userId, workspaceId, role)).rejects.toThrow('Database error');
    });
  });

  describe('refreshTokens', () => {
    const refreshToken = 'mock-refresh-token';
    const sessionData = {
      userId: 'user-123',
      workspaceId: 'workspace-456',
      role: 'owner',
      sessionId: 'session-123',
    };

    it('should refresh tokens successfully', async () => {
      const mockNewToken = 'new-jwt-token';
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));
      mockDb.session.findUnique.mockResolvedValue(mockSession);
      mockJwt.sign.mockReturnValue(mockNewToken);
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);

      const result = await refreshTokens(refreshToken);

      expect(result).toMatchObject({
        token: mockNewToken,
        refreshToken: expect.any(String),
        expiresIn: 900,
      });

      expect(mockRedisClient.get).toHaveBeenCalledWith(`refresh:${refreshToken}`);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
      expect(mockDb.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
    });

    it('should return null for invalid refresh token', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await refreshTokens(refreshToken);

      expect(result).toBe(null);
    });

    it('should return null for expired session', async () => {
      const expiredSession = {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));
      mockDb.session.findUnique.mockResolvedValue(expiredSession);

      const result = await refreshTokens(refreshToken);

      expect(result).toBe(null);
    });

    it('should return null for non-existent session', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));
      mockDb.session.findUnique.mockResolvedValue(null);

      const result = await refreshTokens(refreshToken);

      expect(result).toBe(null);
    });
  });

  describe('destroySession', () => {
    const sessionId = 'session-123';

    it('should destroy session successfully', async () => {
      mockDb.session.delete.mockResolvedValue({ id: sessionId });
      mockRedisClient.del.mockResolvedValue(1);

      await destroySession(sessionId);

      expect(mockDb.session.delete).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
    });

    it('should handle session not found', async () => {
      mockDb.session.delete.mockRejectedValue(new Error('Session not found'));

      // Should not throw
      await destroySession(sessionId);
    });
  });

  describe('authenticateRequest', () => {
    let mockRequest: any;
    let mockReply: any;

    beforeEach(() => {
      mockRequest = {
        headers: {},
      };
      
      mockReply = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      };
    });

    it('should authenticate valid token successfully', async () => {
      const token = 'Bearer valid-token';
      const decodedToken = {
        userId: 'user-123',
        workspaceId: 'workspace-456',
        role: 'owner',
        sessionId: 'session-123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      };
      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockRequest.headers.authorization = token;
      mockJwt.verify.mockReturnValue(decodedToken);
      mockDb.session.findUnique.mockResolvedValue(mockSession);

      await authenticateRequest(mockRequest, mockReply);

      expect(mockRequest.user).toEqual({
        id: 'user-123',
        workspaceId: 'workspace-456',
        role: 'owner',
        sessionId: 'session-123',
      });

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockDb.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
    });

    it('should reject missing authorization header', async () => {
      await authenticateRequest(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'MISSING_TOKEN',
        message: 'Authorization token required',
      });
    });

    it('should reject invalid token format', async () => {
      mockRequest.headers.authorization = 'InvalidToken';

      await authenticateRequest(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'INVALID_TOKEN',
        message: 'Invalid token format',
      });
    });

    it('should reject expired token', async () => {
      const token = 'Bearer expired-token';
      
      mockRequest.headers.authorization = token;
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      await authenticateRequest(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'TOKEN_EXPIRED',
        message: 'Token has expired',
      });
    });

    it('should reject invalid token signature', async () => {
      const token = 'Bearer invalid-token';
      
      mockRequest.headers.authorization = token;
      mockJwt.verify.mockImplementation(() => {
        const error = new Error('invalid signature');
        (error as any).name = 'JsonWebTokenError';
        throw error;
      });

      await authenticateRequest(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'INVALID_TOKEN',
        message: 'Invalid token',
      });
    });

    it('should reject non-existent session', async () => {
      const token = 'Bearer valid-token';
      const decodedToken = {
        userId: 'user-123',
        workspaceId: 'workspace-456',
        role: 'owner',
        sessionId: 'session-123',
      };

      mockRequest.headers.authorization = token;
      mockJwt.verify.mockReturnValue(decodedToken);
      mockDb.session.findUnique.mockResolvedValue(null);

      await authenticateRequest(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'INVALID_SESSION',
        message: 'Session not found or expired',
      });
    });

    it('should reject expired session', async () => {
      const token = 'Bearer valid-token';
      const decodedToken = {
        userId: 'user-123',
        workspaceId: 'workspace-456',
        role: 'owner',
        sessionId: 'session-123',
      };
      const expiredSession = {
        id: 'session-123',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
      };

      mockRequest.headers.authorization = token;
      mockJwt.verify.mockReturnValue(decodedToken);
      mockDb.session.findUnique.mockResolvedValue(expiredSession);

      await authenticateRequest(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'INVALID_SESSION',
        message: 'Session not found or expired',
      });
    });
  });
});