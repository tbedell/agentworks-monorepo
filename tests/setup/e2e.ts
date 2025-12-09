import { beforeAll, afterAll } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';

declare global {
  var __BROWSER__: Browser;
  var __PAGE__: Page;
}

let browser: Browser;
let page: Page;
const services: ChildProcess[] = [];

const serviceConfigs = [
  {
    name: 'Core Service',
    port: 9100,
    dir: './apps/core-service',
    env: {
      PORT: '9100',
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/agentworks_e2e',
      REDIS_URL: 'redis://localhost:6379/3',
      JWT_SECRET: 'test-e2e-secret',
    },
  },
  {
    name: 'Agent Orchestrator',
    port: 9101,
    dir: './apps/agent-orchestrator',
    env: {
      PORT: '9101',
      NODE_ENV: 'test',
      REDIS_URL: 'redis://localhost:6379/3',
      CORE_SERVICE_URL: 'http://localhost:9100',
      PROVIDER_ROUTER_URL: 'http://localhost:9102',
    },
  },
  {
    name: 'Provider Router',
    port: 9102,
    dir: './apps/provider-router',
    env: {
      PORT: '9102',
      NODE_ENV: 'test',
      REDIS_URL: 'redis://localhost:6379/3',
      OPENAI_API_KEY: 'test-key',
      ANTHROPIC_API_KEY: 'test-key',
    },
  },
  {
    name: 'Log Streaming',
    port: 9103,
    dir: './apps/log-streaming',
    env: {
      PORT: '9103',
      NODE_ENV: 'test',
      REDIS_URL: 'redis://localhost:6379/3',
    },
  },
  {
    name: 'Billing Service',
    port: 9104,
    dir: './apps/billing-service',
    env: {
      PORT: '9104',
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/agentworks_e2e',
      REDIS_URL: 'redis://localhost:6379/3',
    },
  },
  {
    name: 'Web App',
    port: 3000,
    dir: './apps/web',
    env: {
      PORT: '3000',
      NODE_ENV: 'test',
      VITE_API_URL: 'http://localhost:9100',
      VITE_WS_URL: 'ws://localhost:9103',
    },
  },
];

async function startServices() {
  console.log('Starting E2E test services...');

  for (const config of serviceConfigs) {
    const serviceProcess = spawn('pnpm', ['dev'], {
      cwd: config.dir,
      env: {
        ...process.env,
        ...config.env,
      },
      stdio: 'pipe',
    });

    services.push(serviceProcess);

    serviceProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('running') || output.includes('listening') || output.includes('ready')) {
        console.log(`${config.name} started: ${output.trim()}`);
      }
    });

    serviceProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      if (!error.includes('DeprecationWarning')) {
        console.error(`${config.name} error: ${error.trim()}`);
      }
    });

    // Stagger service starts
    await setTimeout(2000);
  }

  // Wait for all services to stabilize
  await setTimeout(10000);
}

function stopServices() {
  console.log('Stopping E2E test services...');
  
  for (const service of services) {
    if (service.pid) {
      try {
        service.kill('SIGTERM');
      } catch (error) {
        console.error('Error killing service:', error.message);
      }
    }
  }
}

beforeAll(async () => {
  console.log('Setting up E2E test environment...');
  
  // Start services
  await startServices();

  // Launch browser
  browser = await puppeteer.launch({
    headless: process.env.CI ? true : false, // Show browser in local development
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-running-insecure-content',
    ],
  });

  page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1200, height: 800 });
  
  // Set default timeout
  page.setDefaultTimeout(10000);
  
  // Enable console logs in tests
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('Page error:', msg.text());
    }
  });

  // Global browser and page for tests
  global.__BROWSER__ = browser;
  global.__PAGE__ = page;

  console.log('E2E environment ready');
}, 120000);

afterAll(async () => {
  // Close browser
  if (browser) {
    await browser.close();
  }
  
  // Stop services
  stopServices();
  
  // Give processes time to shut down
  await setTimeout(2000);
}, 30000);

// Helper functions for E2E tests
export async function loginUser(email: string, password: string) {
  await page.goto('http://localhost:3000/auth/login');
  await page.waitForSelector('[data-testid="login-form"]');
  
  await page.type('[data-testid="email-input"]', email);
  await page.type('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for redirect to dashboard
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

export async function registerUser(userData: { email: string; name: string; password: string }) {
  await page.goto('http://localhost:3000/auth/register');
  await page.waitForSelector('[data-testid="register-form"]');
  
  await page.type('[data-testid="name-input"]', userData.name);
  await page.type('[data-testid="email-input"]', userData.email);
  await page.type('[data-testid="password-input"]', userData.password);
  await page.click('[data-testid="register-button"]');
  
  // Wait for redirect to dashboard
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

export async function createWorkspace(name: string, description?: string) {
  await page.click('[data-testid="create-workspace-button"]');
  await page.waitForSelector('[data-testid="workspace-form"]');
  
  await page.type('[data-testid="workspace-name-input"]', name);
  if (description) {
    await page.type('[data-testid="workspace-description-input"]', description);
  }
  
  await page.click('[data-testid="create-workspace-submit"]');
  await page.waitForSelector('[data-testid="workspace-created"]');
}

export async function createProject(workspaceId: string, name: string, description?: string) {
  await page.goto(`http://localhost:3000/workspace/${workspaceId}`);
  await page.waitForSelector('[data-testid="create-project-button"]');
  
  await page.click('[data-testid="create-project-button"]');
  await page.waitForSelector('[data-testid="project-form"]');
  
  await page.type('[data-testid="project-name-input"]', name);
  if (description) {
    await page.type('[data-testid="project-description-input"]', description);
  }
  
  await page.click('[data-testid="create-project-submit"]');
  await page.waitForSelector('[data-testid="project-created"]');
}

export async function navigateToKanbanBoard(workspaceId: string, projectId: string) {
  await page.goto(`http://localhost:3000/workspace/${workspaceId}/project/${projectId}/board`);
  await page.waitForSelector('[data-testid="kanban-board"]');
}

export async function createCard(laneNumber: number, title: string, description?: string) {
  const laneSelector = `[data-testid="lane-${laneNumber}"]`;
  await page.waitForSelector(laneSelector);
  
  await page.click(`${laneSelector} [data-testid="add-card-button"]`);
  await page.waitForSelector('[data-testid="card-form"]');
  
  await page.type('[data-testid="card-title-input"]', title);
  if (description) {
    await page.type('[data-testid="card-description-input"]', description);
  }
  
  await page.click('[data-testid="create-card-submit"]');
  await page.waitForSelector('[data-testid="card-created"]');
}

export async function executeAgent(cardId: string, agentName: string) {
  await page.click(`[data-testid="card-${cardId}"]`);
  await page.waitForSelector('[data-testid="card-details"]');
  
  await page.click('[data-testid="execute-agent-button"]');
  await page.waitForSelector('[data-testid="agent-selector"]');
  
  await page.select('[data-testid="agent-select"]', agentName);
  await page.click('[data-testid="execute-agent-submit"]');
  
  // Wait for execution to start
  await page.waitForSelector('[data-testid="agent-execution-started"]');
}

export async function waitForAgentCompletion(runId: string, timeout: number = 30000) {
  await page.waitForSelector(
    `[data-testid="run-${runId}"][data-status="completed"]`,
    { timeout }
  );
}

export async function openTerminal() {
  await page.click('[data-testid="terminal-button"]');
  await page.waitForSelector('[data-testid="terminal-window"]');
}

export async function waitForTerminalOutput(expectedText: string, timeout: number = 10000) {
  await page.waitForFunction(
    (text) => {
      const terminal = document.querySelector('[data-testid="terminal-output"]');
      return terminal?.textContent?.includes(text);
    },
    { timeout },
    expectedText
  );
}

export async function takeScreenshot(name: string) {
  await page.screenshot({
    path: `tests/e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}

export async function waitForElement(selector: string, timeout: number = 5000) {
  await page.waitForSelector(selector, { timeout });
}

export async function clickAndWait(selector: string, waitForSelector: string) {
  await page.click(selector);
  await page.waitForSelector(waitForSelector);
}