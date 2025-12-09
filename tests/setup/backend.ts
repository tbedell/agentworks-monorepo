import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

declare global {
  var __PRISMA__: PrismaClient;
  var __REDIS__: Redis;
}

// Test database configuration
const testDatabaseUrl = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/agentworks_test';
const testRedisUrl = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';

let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  // Initialize test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: testDatabaseUrl,
      },
    },
  });

  // Initialize test Redis
  redis = new Redis(testRedisUrl, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  await redis.connect();

  // Make them available globally
  global.__PRISMA__ = prisma;
  global.__REDIS__ = redis;

  // Run migrations
  // Note: In a real scenario, you'd run migrations here
  console.log('Test database initialized');
});

afterAll(async () => {
  // Cleanup
  if (prisma) {
    await prisma.$disconnect();
  }
  if (redis) {
    await redis.disconnect();
  }
});

beforeEach(async () => {
  // Clear Redis test database
  if (redis) {
    await redis.flushdb();
  }
});

afterEach(async () => {
  // Cleanup database after each test
  if (prisma) {
    // Delete in correct order due to foreign key constraints
    await prisma.runLog.deleteMany();
    await prisma.agentRun.deleteMany();
    await prisma.usageEvent.deleteMany();
    await prisma.card.deleteMany();
    await prisma.lane.deleteMany();
    await prisma.board.deleteMany();
    await prisma.projectDoc.deleteMany();
    await prisma.agentConfig.deleteMany();
    await prisma.project.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.agent.deleteMany();
  }
});

// Helper functions for tests
export async function createTestUser(overrides: Partial<any> = {}) {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      password: '$argon2id$v=19$m=65536,t=3,p=4$test',
      ...overrides,
    },
  });
}

export async function createTestWorkspace(userId: string, overrides: Partial<any> = {}) {
  return prisma.workspace.create({
    data: {
      name: 'Test Workspace',
      description: 'A test workspace',
      ownerId: userId,
      ...overrides,
    },
  });
}

export async function createTestProject(workspaceId: string, overrides: Partial<any> = {}) {
  return prisma.project.create({
    data: {
      name: 'Test Project',
      description: 'A test project',
      workspaceId,
      ...overrides,
    },
  });
}

export async function createTestBoard(projectId: string, overrides: Partial<any> = {}) {
  return prisma.board.create({
    data: {
      name: 'Test Board',
      projectId,
      ...overrides,
    },
  });
}

export async function createTestLane(boardId: string, laneNumber: number, overrides: Partial<any> = {}) {
  return prisma.lane.create({
    data: {
      boardId,
      laneNumber,
      name: `Lane ${laneNumber}`,
      ...overrides,
    },
  });
}

export async function createTestCard(boardId: string, laneId: string, overrides: Partial<any> = {}) {
  return prisma.card.create({
    data: {
      title: 'Test Card',
      description: 'A test card',
      type: 'Task',
      priority: 'Medium',
      status: 'Draft',
      boardId,
      laneId,
      ...overrides,
    },
  });
}

export async function createTestAgent(overrides: Partial<any> = {}) {
  return prisma.agent.create({
    data: {
      name: 'test-agent',
      displayName: 'Test Agent',
      description: 'A test agent',
      allowedLanes: [0, 1],
      defaultProvider: 'openai',
      defaultModel: 'gpt-4',
      systemPrompt: 'You are a test agent.',
      ...overrides,
    },
  });
}

export async function createTestAgentRun(cardId: string, agentId: string, overrides: Partial<any> = {}) {
  return prisma.agentRun.create({
    data: {
      cardId,
      agentId,
      status: 'pending',
      provider: 'openai',
      model: 'gpt-4',
      ...overrides,
    },
  });
}

// Mock external services
export const mockProviders = {
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
  anthropic: {
    messages: {
      create: jest.fn(),
    },
  },
};

// Setup environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = testDatabaseUrl;
process.env.REDIS_URL = testRedisUrl;