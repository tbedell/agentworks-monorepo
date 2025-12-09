import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AGENT_DEFINITIONS = [
  {
    name: 'ceo_copilot',
    displayName: 'CEO CoPilot',
    description: 'Executive supervisor for the entire project. Runs Lane 0 Q&A, maintains alignment between Blueprint, PRD, MVP, and actual work.',
    allowedLanes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    systemPrompt: 'You are the CEO CoPilot for AgentWorks...',
  },
  {
    name: 'strategy',
    displayName: 'Strategy Agent',
    description: 'Turns raw Q&A into coherent product strategy including positioning, segments, feature buckets, and risk map.',
    allowedLanes: [0],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    systemPrompt: 'You are the Strategy Agent for AgentWorks...',
  },
  {
    name: 'storyboard_ux',
    displayName: 'Storyboard/UX Agent',
    description: 'Translates strategy into user flows and text-based wireframes.',
    allowedLanes: [0],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    systemPrompt: 'You are the Storyboard/UX Agent for AgentWorks...',
  },
  {
    name: 'prd',
    displayName: 'PRD Agent',
    description: 'Generates and maintains the Product Requirements Document.',
    allowedLanes: [1],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    systemPrompt: 'You are the PRD Agent for AgentWorks...',
  },
  {
    name: 'mvp_scope',
    displayName: 'MVP Scope Agent',
    description: 'Defines the minimal viable product slice and creates MVP feature cards.',
    allowedLanes: [1],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    systemPrompt: 'You are the MVP Scope Agent for AgentWorks...',
  },
  {
    name: 'research',
    displayName: 'Research Agent',
    description: 'Performs external research on technologies, competitors, and patterns.',
    allowedLanes: [2],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    systemPrompt: 'You are the Research Agent for AgentWorks...',
  },
  {
    name: 'architect',
    displayName: 'Architect Agent',
    description: 'Designs system architecture and chooses technology stack.',
    allowedLanes: [3],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are the Architect Agent for AgentWorks...',
  },
  {
    name: 'planner',
    displayName: 'Planner Agent',
    description: 'Breaks features into development tasks with dependencies and acceptance criteria.',
    allowedLanes: [4],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    systemPrompt: 'You are the Planner Agent for AgentWorks...',
  },
  {
    name: 'dev_backend',
    displayName: 'Dev Backend Agent',
    description: 'Implements backend APIs and services.',
    allowedLanes: [6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are the Dev Backend Agent for AgentWorks...',
  },
  {
    name: 'dev_frontend',
    displayName: 'Dev Frontend Agent',
    description: 'Implements frontend UI components and pages.',
    allowedLanes: [6],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are the Dev Frontend Agent for AgentWorks...',
  },
  {
    name: 'devops',
    displayName: 'DevOps Agent',
    description: 'Creates infrastructure-as-code, CI/CD pipelines, and deployment configs.',
    allowedLanes: [5, 8],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are the DevOps Agent for AgentWorks...',
  },
  {
    name: 'qa',
    displayName: 'QA Agent',
    description: 'Generates test plans and executes tests.',
    allowedLanes: [7],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are the QA Agent for AgentWorks...',
  },
  {
    name: 'docs',
    displayName: 'Docs Agent',
    description: 'Creates user documentation, API docs, and runbooks.',
    allowedLanes: [9],
    defaultProvider: 'openai',
    defaultModel: 'gpt-4o',
    systemPrompt: 'You are the Docs Agent for AgentWorks...',
  },
  {
    name: 'refactor',
    displayName: 'Refactor Agent',
    description: 'Improves code quality while maintaining functionality.',
    allowedLanes: [6, 10],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are the Refactor Agent for AgentWorks...',
  },
  {
    name: 'troubleshooter',
    displayName: 'Troubleshooter Agent',
    description: 'Debugs failing builds, tests, and production issues.',
    allowedLanes: [7],
    defaultProvider: 'anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are the Troubleshooter Agent for AgentWorks...',
  },
];

const FOUNDER_PLANS = [
  {
    tier: 'founding_50',
    name: 'Founding 50',
    price: 149,
    totalSpots: 50,
    remainingSpots: 50,
    features: [
      'Lifetime access to all features',
      'Priority support',
      'Founding member badge',
      'Exclusive Discord channel',
      'Direct founder access',
      'Shape the roadmap',
    ],
    affiliateBonus: 150,
  },
  {
    tier: 'early_bird',
    name: 'Early Bird',
    price: 199,
    totalSpots: 200,
    remainingSpots: 200,
    features: [
      'Lifetime access to all features',
      'Priority support',
      'Early adopter badge',
      'Beta feature access',
      'Quarterly founder calls',
    ],
    affiliateBonus: 100,
  },
  {
    tier: 'launch_week',
    name: 'Launch Week',
    price: 249,
    totalSpots: 500,
    remainingSpots: 500,
    features: [
      'Lifetime access to all features',
      'Standard support',
      'Launch supporter badge',
      'Beta feature access',
    ],
    affiliateBonus: 50,
  },
];

async function main() {
  console.log('Seeding database...');

  for (const agent of AGENT_DEFINITIONS) {
    await prisma.agent.upsert({
      where: { name: agent.name },
      update: agent,
      create: agent,
    });
    console.log(`  Created/updated agent: ${agent.displayName}`);
  }

  console.log('Seeding Founder plans...');
  for (const plan of FOUNDER_PLANS) {
    await prisma.founderPlan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
    console.log(`  Created/updated plan: ${plan.name}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
