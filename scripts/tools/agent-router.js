#!/usr/bin/env node

/**
 * AgentWorks - Multi-Provider LLM Router
 * Routes agent requests to appropriate LLM providers with usage tracking
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AgentRouter {
  constructor(configPath = './projects') {
    this.configPath = configPath;
    this.providers = new Map();
    this.usageLog = [];
    this.initializeProviders();
  }

  initializeProviders() {
    // Provider configurations (would load from environment/secrets)
    this.providers.set('openai', {
      name: 'OpenAI',
      models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
      rateLimits: { rpm: 500, tpm: 90000 },
      costPer1kTokens: { input: 0.01, output: 0.03 },
      enabled: true
    });

    this.providers.set('anthropic', {
      name: 'Anthropic',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku', 'claude-3-opus'],
      rateLimits: { rpm: 1000, tpm: 100000 },
      costPer1kTokens: { input: 0.003, output: 0.015 },
      enabled: true
    });

    this.providers.set('google', {
      name: 'Google AI',
      models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
      rateLimits: { rpm: 300, tpm: 32000 },
      costPer1kTokens: { input: 0.0007, output: 0.0021 },
      enabled: true
    });

    this.providers.set('nanobanana', {
      name: 'Nano Banana',
      models: ['nb-video-1'],
      rateLimits: { rpm: 60, tpm: 10000 },
      costPer1kTokens: { input: 0.01, output: 0.05 },
      enabled: false // Placeholder for video processing
    });
  }

  async routeRequest(agentName, prompt, projectId, cardId = null) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    
    console.log(`🤖 Agent Router: ${agentName} request ${requestId}`);
    
    try {
      // Load agent configuration
      const agentConfig = await this.loadAgentConfig(projectId, agentName);
      const provider = agentConfig.provider;
      const model = agentConfig.model;

      // Validate provider and model
      if (!this.providers.has(provider)) {
        throw new Error(`Provider ${provider} not available`);
      }

      const providerConfig = this.providers.get(provider);
      if (!providerConfig.models.includes(model)) {
        throw new Error(`Model ${model} not available for provider ${provider}`);
      }

      // Simulate LLM API call (would make real HTTP requests)
      const response = await this.simulateLLMCall(provider, model, prompt, agentName);
      
      // Calculate usage and cost
      const usage = this.calculateUsage(prompt, response.content);
      const cost = this.calculateCost(usage, providerConfig);
      const price = this.calculatePrice(cost);

      // Log usage event
      const usageEvent = {
        id: requestId,
        timestamp: new Date().toISOString(),
        projectId,
        cardId,
        agentName,
        provider,
        model,
        prompt: prompt.substring(0, 100) + '...',
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.totalTokens
        },
        cost: {
          provider: cost,
          price: price,
          margin: price - cost
        },
        duration: Date.now() - startTime,
        success: true
      };

      await this.logUsage(projectId, usageEvent);
      
      console.log(`✅ Agent Router: ${agentName} completed (${usage.totalTokens} tokens, $${price.toFixed(4)})`);
      
      return {
        success: true,
        requestId,
        content: response.content,
        usage: usageEvent.usage,
        cost: usageEvent.cost,
        metadata: {
          provider,
          model,
          duration: usageEvent.duration
        }
      };

    } catch (error) {
      console.error(`❌ Agent Router: ${agentName} failed - ${error.message}`);
      
      // Log failure
      const failureEvent = {
        id: requestId,
        timestamp: new Date().toISOString(),
        projectId,
        cardId,
        agentName,
        provider: agentConfig?.provider || 'unknown',
        model: agentConfig?.model || 'unknown',
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      };

      await this.logUsage(projectId, failureEvent);
      
      return {
        success: false,
        requestId,
        error: error.message
      };
    }
  }

  async loadAgentConfig(projectId, agentName) {
    const projectConfigPath = path.join(this.configPath, projectId, 'project.json');
    
    if (!fs.existsSync(projectConfigPath)) {
      throw new Error(`Project configuration not found: ${projectId}`);
    }

    const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));
    const agentConfig = projectConfig.agents[agentName];
    
    if (!agentConfig) {
      throw new Error(`Agent configuration not found: ${agentName}`);
    }

    return agentConfig;
  }

  async simulateLLMCall(provider, model, prompt, agentName) {
    // Simulate network delay and processing
    const delay = Math.random() * 2000 + 500; // 0.5-2.5 second delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Generate realistic response based on agent type
    const responseTemplates = {
      ceo_copilot: "I'll help guide this project strategically. Based on your input, I recommend focusing on...",
      strategy: "From a strategic perspective, the market analysis shows...",
      architect: "For the technical architecture, I propose using a microservices approach with...",
      dev_backend: "I'll implement this backend feature using RESTful APIs with proper validation...",
      dev_frontend: "For the frontend component, I'll create a responsive React component that...",
      qa: "The test plan should cover the following scenarios and edge cases...",
      docs: "Here's the comprehensive documentation for this feature..."
    };

    const template = responseTemplates[agentName] || "I'll help you with this task...";
    const response = `${template}\n\n[This is a simulated ${provider}/${model} response for ${agentName} agent]\n\nPrompt context: ${prompt.substring(0, 50)}...`;

    return {
      content: response,
      model: model,
      provider: provider
    };
  }

  calculateUsage(prompt, response) {
    // Simple token estimation (4 chars ≈ 1 token)
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(response.length / 4);
    
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    };
  }

  calculateCost(usage, providerConfig) {
    const inputCost = (usage.inputTokens / 1000) * providerConfig.costPer1kTokens.input;
    const outputCost = (usage.outputTokens / 1000) * providerConfig.costPer1kTokens.output;
    return inputCost + outputCost;
  }

  calculatePrice(cost) {
    // AgentWorks pricing: 5x markup, rounded up to $0.25 increments
    const markup = cost * 5;
    return Math.ceil(markup / 0.25) * 0.25;
  }

  async logUsage(projectId, usageEvent) {
    const logDir = path.join(this.configPath, projectId, 'logs', 'usage');
    const logFile = path.join(logDir, `usage_${new Date().toISOString().split('T')[0]}.json`);
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Append to daily log file
    let existingLogs = [];
    if (fs.existsSync(logFile)) {
      existingLogs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    existingLogs.push(usageEvent);
    fs.writeFileSync(logFile, JSON.stringify(existingLogs, null, 2));

    // Update project totals
    await this.updateProjectUsage(projectId, usageEvent);
  }

  async updateProjectUsage(projectId, usageEvent) {
    const projectConfigPath = path.join(this.configPath, projectId, 'project.json');
    const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'));

    if (usageEvent.success) {
      projectConfig.usage.total_calls += 1;
      projectConfig.usage.total_cost += usageEvent.cost.provider;
      projectConfig.usage.total_price += usageEvent.cost.price;

      // Update agent-specific usage
      const agentKey = usageEvent.agentName;
      if (!projectConfig.usage.calls_by_agent[agentKey]) {
        projectConfig.usage.calls_by_agent[agentKey] = { calls: 0, cost: 0, price: 0 };
      }
      projectConfig.usage.calls_by_agent[agentKey].calls += 1;
      projectConfig.usage.calls_by_agent[agentKey].cost += usageEvent.cost.provider;
      projectConfig.usage.calls_by_agent[agentKey].price += usageEvent.cost.price;

      // Update provider-specific usage
      const providerKey = usageEvent.provider;
      if (!projectConfig.usage.calls_by_provider[providerKey]) {
        projectConfig.usage.calls_by_provider[providerKey] = { calls: 0, cost: 0, price: 0 };
      }
      projectConfig.usage.calls_by_provider[providerKey].calls += 1;
      projectConfig.usage.calls_by_provider[providerKey].cost += usageEvent.cost.provider;
      projectConfig.usage.calls_by_provider[providerKey].price += usageEvent.cost.price;
    }

    fs.writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2));
  }

  async generateUsageReport(projectId, timeframe = '7d') {
    const logDir = path.join(this.configPath, projectId, 'logs', 'usage');
    
    if (!fs.existsSync(logDir)) {
      return { error: 'No usage data found' };
    }

    // Load recent usage logs
    const logFiles = fs.readdirSync(logDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .slice(-7); // Last 7 days

    let allEvents = [];
    for (const file of logFiles) {
      const events = JSON.parse(fs.readFileSync(path.join(logDir, file), 'utf8'));
      allEvents = allEvents.concat(events);
    }

    // Generate summary
    const summary = {
      projectId,
      timeframe,
      totalCalls: allEvents.length,
      successfulCalls: allEvents.filter(e => e.success).length,
      totalCost: allEvents.reduce((sum, e) => sum + (e.cost?.provider || 0), 0),
      totalPrice: allEvents.reduce((sum, e) => sum + (e.cost?.price || 0), 0),
      byAgent: {},
      byProvider: {},
      dailyBreakdown: {}
    };

    // Group by agent
    allEvents.forEach(event => {
      if (!summary.byAgent[event.agentName]) {
        summary.byAgent[event.agentName] = { calls: 0, cost: 0, price: 0 };
      }
      summary.byAgent[event.agentName].calls += 1;
      if (event.success) {
        summary.byAgent[event.agentName].cost += event.cost.provider;
        summary.byAgent[event.agentName].price += event.cost.price;
      }
    });

    // Group by provider
    allEvents.forEach(event => {
      if (!summary.byProvider[event.provider]) {
        summary.byProvider[event.provider] = { calls: 0, cost: 0, price: 0 };
      }
      summary.byProvider[event.provider].calls += 1;
      if (event.success) {
        summary.byProvider[event.provider].cost += event.cost.provider;
        summary.byProvider[event.provider].price += event.cost.price;
      }
    });

    return summary;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const router = new AgentRouter();

  switch (command) {
    case 'route':
      const [agentName, projectId, cardId] = args.slice(1);
      const prompt = process.env.AGENT_PROMPT || "Default prompt for testing";
      
      const result = await router.routeRequest(agentName, prompt, projectId, cardId);
      console.log(JSON.stringify(result, null, 2));
      break;

    case 'report':
      const [reportProjectId, timeframe] = args.slice(1);
      const report = await router.generateUsageReport(reportProjectId, timeframe);
      console.log(JSON.stringify(report, null, 2));
      break;

    case 'providers':
      console.log('Available providers:');
      for (const [key, config] of router.providers.entries()) {
        console.log(`- ${key}: ${config.name} (${config.models.join(', ')})`);
      }
      break;

    default:
      console.log(`
AgentWorks Agent Router

Usage:
  node agent-router.js route <agent> <project-id> [card-id]
  node agent-router.js report <project-id> [timeframe]
  node agent-router.js providers

Environment Variables:
  AGENT_PROMPT - The prompt to send to the agent

Examples:
  AGENT_PROMPT="Analyze this code" node agent-router.js route architect my-project-1 FEATURE_001
  node agent-router.js report my-project-1 7d
  node agent-router.js providers
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AgentRouter };