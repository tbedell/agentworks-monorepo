#!/usr/bin/env node

/**
 * AgentWorks - Card Automator
 * Automates Kanban card workflows and lane transitions
 */

const fs = require('fs');
const path = require('path');
const { AgentRouter } = require('./agent-router');
const { TerminalLogger } = require('./terminal-logger');

class CardAutomator {
  constructor(configPath = './projects') {
    this.configPath = configPath;
    this.agentRouter = new AgentRouter(configPath);
    this.terminalLogger = new TerminalLogger(configPath);
    
    // Lane automation rules
    this.laneRules = {
      0: { // Vision & CoPilot Planning
        agents: ['ceo_copilot', 'strategy', 'storyboard_ux'],
        auto_triggers: ['ceo_copilot'],
        completion_criteria: ['blueprint_approved'],
        next_lane: 1
      },
      1: { // PRD / MVP Definition
        agents: ['prd', 'mvp'],
        auto_triggers: ['prd'],
        completion_criteria: ['prd_generated', 'mvp_defined', 'feature_cards_created'],
        next_lane: 2
      },
      2: { // Research
        agents: ['research'],
        auto_triggers: [],
        completion_criteria: ['research_complete'],
        next_lane: 3
      },
      3: { // Architecture & Stack
        agents: ['architect'],
        auto_triggers: ['architect'],
        completion_criteria: ['architecture_designed'],
        next_lane: 4
      },
      4: { // Planning & Task Breakdown
        agents: ['planner'],
        auto_triggers: ['planner'],
        completion_criteria: ['tasks_created'],
        next_lane: 5
      },
      5: { // Scaffolding / Setup
        agents: ['devops'],
        auto_triggers: ['devops'],
        completion_criteria: ['infrastructure_setup'],
        next_lane: 6
      },
      6: { // Build
        agents: ['dev_backend', 'dev_frontend'],
        auto_triggers: [],
        completion_criteria: ['implementation_complete'],
        next_lane: 7
      },
      7: { // Test & QA
        agents: ['qa', 'troubleshooter'],
        auto_triggers: ['qa'],
        completion_criteria: ['tests_passing'],
        next_lane: 8
      },
      8: { // Deploy
        agents: ['devops'],
        auto_triggers: ['devops'],
        completion_criteria: ['deployed'],
        next_lane: 9
      },
      9: { // Docs & Training
        agents: ['docs'],
        auto_triggers: ['docs'],
        completion_criteria: ['documentation_complete'],
        next_lane: 10
      },
      10: { // Learn & Optimize
        agents: ['refactor'],
        auto_triggers: [],
        completion_criteria: ['optimization_complete'],
        next_lane: null // End of pipeline
      }
    };
  }

  async moveCard(projectId, cardId, targetLane, reason = 'manual') {
    console.log(`🎯 Moving card ${cardId} to Lane ${targetLane} (${reason})`);

    const card = await this.loadCard(projectId, cardId);
    const oldLane = card.lane;
    
    // Update card
    card.lane = targetLane;
    card.status = targetLane === oldLane + 1 ? 'ready' : 'moved';
    card.updated = new Date().toISOString();
    card.lane_history = card.lane_history || [];
    card.lane_history.push({
      from: oldLane,
      to: targetLane,
      timestamp: card.updated,
      reason
    });

    await this.saveCard(projectId, card);

    // Update project lane tracking
    await this.updateProjectLanes(projectId, cardId, oldLane, targetLane);

    // Check for auto-triggers in new lane
    await this.checkAutoTriggers(projectId, cardId, targetLane);

    console.log(`✅ Card ${cardId} moved: Lane ${oldLane} → Lane ${targetLane}`);
    return card;
  }

  async updateCardStatus(projectId, cardId, status, metadata = {}) {
    console.log(`📝 Updating card ${cardId} status: ${status}`);

    const card = await this.loadCard(projectId, cardId);
    const oldStatus = card.status;
    
    card.status = status;
    card.updated = new Date().toISOString();
    card.status_history = card.status_history || [];
    card.status_history.push({
      from: oldStatus,
      to: status,
      timestamp: card.updated,
      metadata
    });

    await this.saveCard(projectId, card);

    // Check for lane completion
    if (status === 'completed') {
      await this.checkLaneCompletion(projectId, cardId);
    }

    console.log(`✅ Card ${cardId} status updated: ${oldStatus} → ${status}`);
    return card;
  }

  async runAgent(projectId, cardId, agentName, prompt = null, autoMode = false) {
    console.log(`🤖 Running ${agentName} agent on card ${cardId}`);

    try {
      // Start terminal session
      const runId = await this.terminalLogger.startSession(
        projectId, 
        cardId, 
        agentName, 
        autoMode ? 'auto' : 'manual'
      );

      this.terminalLogger.log(runId, 'agent', `Starting ${agentName} agent execution`);
      
      // Update card status
      await this.updateCardStatus(projectId, cardId, 'in_progress', { 
        agentName, 
        runId,
        startTime: new Date().toISOString()
      });

      // Generate appropriate prompt if not provided
      if (!prompt) {
        prompt = await this.generateAgentPrompt(projectId, cardId, agentName);
      }

      this.terminalLogger.log(runId, 'info', `Executing with prompt: ${prompt.substring(0, 100)}...`);

      // Route to appropriate LLM provider
      const result = await this.agentRouter.routeRequest(agentName, prompt, projectId, cardId);

      if (result.success) {
        this.terminalLogger.log(runId, 'success', `Agent execution completed successfully`);
        this.terminalLogger.log(runId, 'info', `Usage: ${result.usage.totalTokens} tokens, $${result.cost.price.toFixed(4)}`);
        
        // Process agent output
        await this.processAgentOutput(projectId, cardId, agentName, result.content);
        
        // Update card with success
        await this.updateCardStatus(projectId, cardId, 'review', {
          agentName,
          runId,
          endTime: new Date().toISOString(),
          success: true,
          usage: result.usage,
          cost: result.cost
        });

        await this.terminalLogger.endSession(runId, 'completed', 
          `Agent ${agentName} completed successfully`);

      } else {
        this.terminalLogger.log(runId, 'error', `Agent execution failed: ${result.error}`);
        
        await this.updateCardStatus(projectId, cardId, 'error', {
          agentName,
          runId,
          endTime: new Date().toISOString(),
          success: false,
          error: result.error
        });

        await this.terminalLogger.endSession(runId, 'failed', 
          `Agent ${agentName} failed: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Agent execution failed:`, error);
      
      await this.updateCardStatus(projectId, cardId, 'error', {
        agentName,
        error: error.message,
        endTime: new Date().toISOString()
      });

      throw error;
    }
  }

  async generateAgentPrompt(projectId, cardId, agentName) {
    const card = await this.loadCard(projectId, cardId);
    const project = await this.loadProject(projectId);

    // Load relevant context documents
    const contextDocs = await this.loadContextDocuments(projectId);

    // Generate agent-specific prompt
    const prompts = {
      ceo_copilot: this.generateCEOPrompt(project, card, contextDocs),
      strategy: this.generateStrategyPrompt(project, card, contextDocs),
      architect: this.generateArchitectPrompt(project, card, contextDocs),
      dev_backend: this.generateDevPrompt(project, card, contextDocs, 'backend'),
      dev_frontend: this.generateDevPrompt(project, card, contextDocs, 'frontend'),
      qa: this.generateQAPrompt(project, card, contextDocs),
      docs: this.generateDocsPrompt(project, card, contextDocs)
    };

    return prompts[agentName] || this.generateGenericPrompt(project, card, agentName);
  }

  generateCEOPrompt(project, card, context) {
    return `As the CEO CoPilot Agent for project "${project.name}", analyze the current state and provide strategic guidance.

Project Context:
- Blueprint: ${context.blueprint ? 'Available' : 'Missing'}
- PRD: ${context.prd ? 'Available' : 'Missing'}
- MVP: ${context.mvp ? 'Available' : 'Missing'}

Current Card: ${card.title}
Description: ${card.description}
Lane: ${card.lane} (${this.getLaneName(card.lane)})

Tasks:
1. Review current project progress and alignment with Blueprint
2. Identify any risks or blockers
3. Provide strategic recommendations for next steps
4. Ensure work stays aligned with project vision

Please provide your analysis and recommendations.`;
  }

  generateArchitectPrompt(project, card, context) {
    return `As the Architect Agent for project "${project.name}", design the technical architecture for this feature.

Project Context:
- Blueprint: ${context.blueprint?.substring(0, 500) || 'Not available'}...
- PRD Requirements: ${context.prd?.substring(0, 500) || 'Not available'}...

Feature Card: ${card.title}
Description: ${card.description}
Acceptance Criteria: ${card.acceptance_criteria?.join(', ') || 'Not specified'}

Tasks:
1. Design system architecture for this feature
2. Choose appropriate technology stack
3. Define data models and API contracts
4. Identify infrastructure requirements
5. Document security and scalability considerations

Please provide a detailed technical architecture plan.`;
  }

  generateDevPrompt(project, card, context, type) {
    return `As the ${type} Development Agent for project "${project.name}", implement this feature.

Project Context:
- Architecture: ${context.architecture?.substring(0, 300) || 'Not available'}...
- Feature: ${card.title}
- Description: ${card.description}
- Acceptance Criteria: ${card.acceptance_criteria?.join(', ') || 'Not specified'}

Tasks:
1. Implement the ${type} code for this feature
2. Follow the defined architecture patterns
3. Write appropriate tests
4. Ensure proper error handling
5. Document the implementation

Please provide the implementation code and documentation.`;
  }

  async processAgentOutput(projectId, cardId, agentName, output) {
    // Save agent output to card artifacts
    const card = await this.loadCard(projectId, cardId);
    
    if (!card.agent_outputs) card.agent_outputs = {};
    card.agent_outputs[agentName] = {
      content: output,
      timestamp: new Date().toISOString(),
      processed: false
    };

    // Create artifacts based on agent type
    const outputDir = path.join(this.configPath, projectId, 'artifacts', cardId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `${agentName}_output.md`);
    fs.writeFileSync(outputFile, output);

    card.artifacts = card.artifacts || {};
    card.artifacts[agentName] = `artifacts/${cardId}/${agentName}_output.md`;

    await this.saveCard(projectId, card);
  }

  async checkAutoTriggers(projectId, cardId, lane) {
    const rules = this.laneRules[lane];
    if (!rules || rules.auto_triggers.length === 0) return;

    console.log(`🔄 Checking auto-triggers for Lane ${lane}`);

    for (const agentName of rules.auto_triggers) {
      try {
        await this.runAgent(projectId, cardId, agentName, null, true);
      } catch (error) {
        console.error(`❌ Auto-trigger failed for ${agentName}:`, error.message);
      }
    }
  }

  async checkLaneCompletion(projectId, cardId) {
    const card = await this.loadCard(projectId, cardId);
    const rules = this.laneRules[card.lane];
    
    if (!rules || !rules.completion_criteria) return;

    // Check if completion criteria are met
    const criteriaMet = await this.evaluateCompletionCriteria(projectId, cardId, rules.completion_criteria);
    
    if (criteriaMet && rules.next_lane !== null) {
      console.log(`✅ Lane ${card.lane} completion criteria met, moving to Lane ${rules.next_lane}`);
      await this.moveCard(projectId, cardId, rules.next_lane, 'auto_completion');
    }
  }

  async evaluateCompletionCriteria(projectId, cardId, criteria) {
    // Simple criteria evaluation - would be more sophisticated in real implementation
    const card = await this.loadCard(projectId, cardId);
    
    return criteria.every(criterion => {
      switch (criterion) {
        case 'blueprint_approved':
          return card.status === 'completed';
        case 'prd_generated':
          return card.artifacts?.prd || card.agent_outputs?.prd;
        case 'mvp_defined':
          return card.artifacts?.mvp || card.agent_outputs?.mvp;
        case 'architecture_designed':
          return card.artifacts?.architect || card.agent_outputs?.architect;
        case 'tests_passing':
          return card.status === 'completed' && card.test_results?.success;
        default:
          return false;
      }
    });
  }

  async loadCard(projectId, cardId) {
    const cardsDir = path.join(this.configPath, projectId, 'cards');
    
    // Search in different card type directories
    const cardTypes = ['features', 'tasks', 'bugs', 'docs'];
    
    for (const type of cardTypes) {
      const typeDir = path.join(cardsDir, type);
      if (!fs.existsSync(typeDir)) continue;
      
      const files = fs.readdirSync(typeDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const cardPath = path.join(typeDir, file);
        const card = JSON.parse(fs.readFileSync(cardPath, 'utf8'));
        
        if (card.id === cardId || file.includes(cardId)) {
          card._filePath = cardPath;
          return card;
        }
      }
    }
    
    throw new Error(`Card ${cardId} not found in project ${projectId}`);
  }

  async saveCard(projectId, card) {
    if (card._filePath) {
      fs.writeFileSync(card._filePath, JSON.stringify(card, null, 2));
    } else {
      throw new Error(`Cannot save card ${card.id} - no file path`);
    }
  }

  async loadProject(projectId) {
    const projectFile = path.join(this.configPath, projectId, 'project.json');
    return JSON.parse(fs.readFileSync(projectFile, 'utf8'));
  }

  async loadContextDocuments(projectId) {
    const docsDir = path.join(this.configPath, projectId, 'docs');
    const context = {};

    const docFiles = {
      blueprint: 'BLUEPRINT.md',
      prd: 'PRD.md',
      mvp: 'MVP.md',
      strategy: 'STRATEGY_ANALYSIS.md',
      architecture: 'ARCHITECTURE.md'
    };

    for (const [key, filename] of Object.entries(docFiles)) {
      const filePath = path.join(docsDir, filename);
      if (fs.existsSync(filePath)) {
        context[key] = fs.readFileSync(filePath, 'utf8');
      }
    }

    return context;
  }

  async updateProjectLanes(projectId, cardId, fromLane, toLane) {
    const project = await this.loadProject(projectId);
    
    // Update lane card tracking
    if (project.lanes[fromLane]?.cards) {
      project.lanes[fromLane].cards = project.lanes[fromLane].cards.filter(
        c => c.id !== cardId && c !== cardId
      );
    }

    if (!project.lanes[toLane]) project.lanes[toLane] = { cards: [] };
    if (!project.lanes[toLane].cards) project.lanes[toLane].cards = [];
    
    project.lanes[toLane].cards.push({
      id: cardId,
      movedAt: new Date().toISOString()
    });

    const projectFile = path.join(this.configPath, projectId, 'project.json');
    fs.writeFileSync(projectFile, JSON.stringify(project, null, 2));
  }

  getLaneName(lane) {
    const laneNames = {
      0: 'Vision & CoPilot Planning',
      1: 'PRD / MVP Definition',
      2: 'Research',
      3: 'Architecture & Stack',
      4: 'Planning & Task Breakdown',
      5: 'Scaffolding / Setup',
      6: 'Build',
      7: 'Test & QA',
      8: 'Deploy',
      9: 'Docs & Training',
      10: 'Learn & Optimize'
    };
    return laneNames[lane] || `Lane ${lane}`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const automator = new CardAutomator();

  switch (command) {
    case 'move':
      const [projectId, cardId, targetLane, reason] = args.slice(1);
      await automator.moveCard(projectId, cardId, parseInt(targetLane), reason);
      break;

    case 'status':
      const [statusProjectId, statusCardId, status] = args.slice(1);
      await automator.updateCardStatus(statusProjectId, statusCardId, status);
      break;

    case 'run':
      const [runProjectId, runCardId, agentName, ...promptParts] = args.slice(1);
      const prompt = promptParts.length > 0 ? promptParts.join(' ') : null;
      const result = await automator.runAgent(runProjectId, runCardId, agentName, prompt);
      console.log('Agent result:', result.success ? 'Success' : 'Failed');
      break;

    case 'trigger':
      const [triggerProjectId, triggerCardId, triggerLane] = args.slice(1);
      await automator.checkAutoTriggers(triggerProjectId, triggerCardId, parseInt(triggerLane));
      break;

    default:
      console.log(`
AgentWorks Card Automator

Usage:
  node card-automator.js move <project-id> <card-id> <target-lane> [reason]
  node card-automator.js status <project-id> <card-id> <status>
  node card-automator.js run <project-id> <card-id> <agent-name> [prompt]
  node card-automator.js trigger <project-id> <card-id> <lane>

Examples:
  node card-automator.js move my-proj FEATURE_001 3 "ready for architecture"
  node card-automator.js status my-proj FEATURE_001 in_progress
  node card-automator.js run my-proj FEATURE_001 architect
  node card-automator.js trigger my-proj FEATURE_001 3
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CardAutomator };