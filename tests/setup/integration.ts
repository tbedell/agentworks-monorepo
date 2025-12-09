import { beforeAll, afterAll } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';

interface ServiceConfig {
  name: string;
  port: number;
  dir: string;
  env?: Record<string, string>;
}

const services: ServiceConfig[] = [
  {
    name: 'Core Service',
    port: 9000,
    dir: './apps/core-service',
    env: {
      PORT: '9000',
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/agentworks_test',
      REDIS_URL: 'redis://localhost:6379/2',
      JWT_SECRET: 'test-integration-secret',
    },
  },
  {
    name: 'Agent Orchestrator',
    port: 9001,
    dir: './apps/agent-orchestrator',
    env: {
      PORT: '9001',
      NODE_ENV: 'test',
      REDIS_URL: 'redis://localhost:6379/2',
      CORE_SERVICE_URL: 'http://localhost:9000',
      PROVIDER_ROUTER_URL: 'http://localhost:9002',
    },
  },
  {
    name: 'Provider Router',
    port: 9002,
    dir: './apps/provider-router',
    env: {
      PORT: '9002',
      NODE_ENV: 'test',
      REDIS_URL: 'redis://localhost:6379/2',
      OPENAI_API_KEY: 'test-key',
      ANTHROPIC_API_KEY: 'test-key',
    },
  },
  {
    name: 'Log Streaming',
    port: 9003,
    dir: './apps/log-streaming',
    env: {
      PORT: '9003',
      NODE_ENV: 'test',
      REDIS_URL: 'redis://localhost:6379/2',
    },
  },
  {
    name: 'Billing Service',
    port: 9004,
    dir: './apps/billing-service',
    env: {
      PORT: '9004',
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/agentworks_test',
      REDIS_URL: 'redis://localhost:6379/2',
    },
  },
];

const processes: ChildProcess[] = [];

async function startService(service: ServiceConfig): Promise<boolean> {
  console.log(`Starting ${service.name} for integration tests...`);
  
  const serviceProcess = spawn('tsx', ['src/index.ts'], {
    cwd: service.dir,
    env: {
      ...process.env,
      ...service.env,
    },
    stdio: 'pipe',
  });

  processes.push(serviceProcess);

  serviceProcess.stdout?.on('data', (data) => {
    const output = data.toString();
    if (output.includes('running') || output.includes('listening')) {
      console.log(`${service.name} started: ${output.trim()}`);
    }
  });

  serviceProcess.stderr?.on('data', (data) => {
    const error = data.toString();
    console.error(`${service.name} error: ${error.trim()}`);
  });

  // Give the service time to start
  await setTimeout(2000);
  
  return true;
}

async function checkServiceHealth(service: ServiceConfig): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${service.port}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error(`Health check failed for ${service.name}:`, error.message);
    return false;
  }
}

function cleanup() {
  console.log('Stopping integration test services...');
  
  for (const serviceProcess of processes) {
    if (serviceProcess.pid) {
      try {
        serviceProcess.kill('SIGTERM');
      } catch (error) {
        console.error('Error killing process:', error.message);
      }
    }
  }
}

beforeAll(async () => {
  console.log('Setting up integration test environment...');
  
  // Start all services
  for (const service of services) {
    await startService(service);
  }

  // Wait for all services to be healthy
  console.log('Waiting for services to be healthy...');
  await setTimeout(3000);
  
  let retries = 5;
  while (retries > 0) {
    let allHealthy = true;
    
    for (const service of services) {
      const healthy = await checkServiceHealth(service);
      if (!healthy) {
        allHealthy = false;
        break;
      }
    }
    
    if (allHealthy) {
      console.log('All services are healthy for integration tests');
      break;
    }
    
    retries--;
    if (retries > 0) {
      console.log(`Services not ready, retrying... (${retries} attempts left)`);
      await setTimeout(2000);
    }
  }
  
  if (retries === 0) {
    throw new Error('Services failed to start for integration tests');
  }
}, 60000);

afterAll(async () => {
  cleanup();
  await setTimeout(1000); // Give processes time to shut down
});

// Utility functions for integration tests
export async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {},
  token?: string
) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : await response.text();

  return { response, data };
}

export async function createTestUser(userData: any = {}) {
  const user = {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: 'password123',
    ...userData,
  };

  const { response, data } = await makeAuthenticatedRequest(
    'http://localhost:9000/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(user),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create test user: ${JSON.stringify(data)}`);
  }

  return { user, token: data.token, userId: data.user.id };
}

export async function loginTestUser(email: string, password: string) {
  const { response, data } = await makeAuthenticatedRequest(
    'http://localhost:9000/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to login test user: ${JSON.stringify(data)}`);
  }

  return { token: data.token, user: data.user };
}

export async function createTestWorkspace(token: string, workspaceData: any = {}) {
  const workspace = {
    name: `Test Workspace ${Date.now()}`,
    description: 'Test workspace for integration tests',
    ...workspaceData,
  };

  const { response, data } = await makeAuthenticatedRequest(
    'http://localhost:9000/api/workspaces',
    {
      method: 'POST',
      body: JSON.stringify(workspace),
    },
    token
  );

  if (!response.ok) {
    throw new Error(`Failed to create test workspace: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function createTestProject(token: string, workspaceId: string, projectData: any = {}) {
  const project = {
    name: `Test Project ${Date.now()}`,
    description: 'Test project for integration tests',
    workspaceId,
    ...projectData,
  };

  const { response, data } = await makeAuthenticatedRequest(
    'http://localhost:9000/api/projects',
    {
      method: 'POST',
      body: JSON.stringify(project),
    },
    token
  );

  if (!response.ok) {
    throw new Error(`Failed to create test project: ${JSON.stringify(data)}`);
  }

  return data;
}