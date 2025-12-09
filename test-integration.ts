#!/usr/bin/env tsx

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
    port: 8000,
    dir: './apps/core-service',
    env: {
      PORT: '8000',
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test-secret',
    },
  },
  {
    name: 'Agent Orchestrator',
    port: 8001,
    dir: './apps/agent-orchestrator',
    env: {
      PORT: '8001',
      NODE_ENV: 'development',
      REDIS_URL: 'redis://localhost:6379',
      CORE_SERVICE_URL: 'http://localhost:8000',
      PROVIDER_ROUTER_URL: 'http://localhost:8002',
    },
  },
  {
    name: 'Provider Router',
    port: 8002,
    dir: './apps/provider-router',
    env: {
      PORT: '8002',
      NODE_ENV: 'development',
      REDIS_URL: 'redis://localhost:6379',
      OPENAI_API_KEY: 'test-key',
      ANTHROPIC_API_KEY: 'test-key',
    },
  },
  {
    name: 'Log Streaming',
    port: 8003,
    dir: './apps/log-streaming',
    env: {
      PORT: '8003',
      NODE_ENV: 'development',
      REDIS_URL: 'redis://localhost:6379',
    },
  },
  {
    name: 'Billing Service',
    port: 8004,
    dir: './apps/billing-service',
    env: {
      PORT: '8004',
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
    },
  },
];

const processes: ChildProcess[] = [];

async function startService(service: ServiceConfig): Promise<boolean> {
  console.log(`🚀 Starting ${service.name}...`);
  
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
      console.log(`✅ ${service.name}: ${output.trim()}`);
    }
  });

  serviceProcess.stderr?.on('data', (data) => {
    const error = data.toString();
    if (error.includes('Error') || error.includes('Failed')) {
      console.error(`❌ ${service.name}: ${error.trim()}`);
    }
  });

  serviceProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${service.name} exited with code ${code}`);
    }
  });

  // Give the service time to start
  await setTimeout(3000);
  
  return true;
}

async function checkHealth(service: ServiceConfig): Promise<boolean> {
  try {
    console.log(`🔍 Checking health of ${service.name}...`);
    
    const response = await fetch(`http://localhost:${service.port}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const health = await response.json();
      console.log(`✅ ${service.name} health check passed:`, health.status);
      return true;
    } else {
      console.error(`❌ ${service.name} health check failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${service.name} health check failed:`, error.message);
    return false;
  }
}

function cleanup() {
  console.log('\n🧹 Cleaning up processes...');
  
  for (const serviceProcess of processes) {
    if (serviceProcess.pid) {
      try {
        serviceProcess.kill('SIGTERM');
      } catch (error) {
        console.error('Error killing process:', (error as any).message);
      }
    }
  }
}

async function runIntegrationTest() {
  console.log('🔬 Starting AgentWorks Microservices Integration Test\n');
  
  try {
    // Build packages first
    console.log('📦 Building packages...');
    const packagesResult = await new Promise((resolve) => {
      const packagesProcess = spawn('pnpm', ['--filter=./packages/*', 'run', 'build'], {
        stdio: 'pipe',
      });
      
      packagesProcess.on('exit', (code) => {
        resolve(code === 0);
      });
    });
    
    if (!packagesResult) {
      console.error('❌ Failed to build packages');
      process.exit(1);
    }
    
    console.log('📦 Building backend services...');
    const buildResult = await new Promise((resolve) => {
      const buildProcess = spawn('pnpm', ['--filter=./apps/core-service', '--filter=./apps/agent-orchestrator', '--filter=./apps/provider-router', '--filter=./apps/log-streaming', '--filter=./apps/billing-service', 'run', 'build'], {
        stdio: 'pipe',
      });
      
      buildProcess.on('exit', (code) => {
        resolve(code === 0);
      });
    });
    
    if (!buildResult) {
      console.error('❌ Failed to build backend services');
      process.exit(1);
    }
    
    console.log('✅ Packages built successfully\n');

    // Start all services
    for (const service of services) {
      await startService(service);
    }

    // Wait a bit more for all services to fully initialize
    console.log('\n⏳ Waiting for services to initialize...');
    await setTimeout(5000);

    // Check health of all services
    console.log('\n🏥 Running health checks...');
    let allHealthy = true;
    
    for (const service of services) {
      const healthy = await checkHealth(service);
      allHealthy = allHealthy && healthy;
      await setTimeout(1000); // Brief pause between checks
    }

    if (allHealthy) {
      console.log('\n✨ All services are healthy! Integration test passed.');
      console.log('\nService endpoints:');
      for (const service of services) {
        console.log(`  - ${service.name}: http://localhost:${service.port}`);
      }
    } else {
      console.log('\n❌ Some services are unhealthy. Integration test failed.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Integration test failed with error:', error.message);
    process.exit(1);
  } finally {
    // Keep services running for manual testing
    console.log('\n⏰ Services will continue running. Press Ctrl+C to stop all services.');
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

// Start the test
runIntegrationTest().catch((error) => {
  console.error('Test failed:', error);
  cleanup();
  process.exit(1);
});