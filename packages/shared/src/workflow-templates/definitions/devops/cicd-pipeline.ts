/**
 * CI/CD Pipeline Template
 *
 * Visual Layout:
 *               [Git Push Trigger]
 *                       │
 *                 [Run Linter]
 *                       │
 *                [Run Typecheck]
 *                       │
 *                 [Run Tests]
 *                       │
 *               ┌───────┴───────┐
 *               │               │
 *        [Tests Pass?]──No──>[Notify Failure]
 *               │
 *              Yes
 *               │
 *          [Build Image]
 *               │
 *         [Deploy to Cloud]
 *               │
 *         [Notify Success]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const CICD_PIPELINE: WorkflowTemplateDefinition = {
  id: 'cicd-pipeline',
  name: 'CI/CD Pipeline',
  description: 'Complete CI/CD pipeline with testing, building, and deployment',
  category: 'devops',
  complexity: 'medium',
  platform: 'docker',

  nodes: [
    {
      id: 'trigger-push',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Git Push',
        nodeType: 'trigger',
        description: 'Triggered on push to main',
        config: { event: 'git-push' },
      },
    },
    {
      id: 'action-lint',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Run Linter',
        nodeType: 'action',
        description: 'ESLint/Prettier checks',
        config: { command: 'pnpm lint' },
      },
    },
    {
      id: 'action-typecheck',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Run Typecheck',
        nodeType: 'action',
        description: 'TypeScript compilation',
        config: { command: 'pnpm typecheck' },
      },
    },
    {
      id: 'action-test',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Run Tests',
        nodeType: 'action',
        description: 'Jest/Vitest test suite',
        config: { command: 'pnpm test' },
      },
    },
    {
      id: 'condition-pass',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Tests Pass?',
        nodeType: 'condition',
        description: 'Check test results',
        config: { condition: 'testsPassed' },
      },
    },
    {
      id: 'notify-fail',
      type: 'workflow',
      position: { x: 450, y: 400 },
      data: {
        label: 'Notify Failure',
        nodeType: 'notification',
        description: 'Slack failure alert',
        config: { channel: 'slack' },
      },
    },
    {
      id: 'action-build',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Build Image',
        nodeType: 'action',
        description: 'Docker build and push',
        config: { command: 'docker build' },
      },
    },
    {
      id: 'action-deploy',
      type: 'workflow',
      position: { x: 250, y: 600 },
      data: {
        label: 'Deploy',
        nodeType: 'action',
        description: 'Deploy to Cloud Run',
        config: { command: 'gcloud run deploy' },
      },
    },
    {
      id: 'notify-success',
      type: 'workflow',
      position: { x: 250, y: 700 },
      data: {
        label: 'Notify Success',
        nodeType: 'notification',
        description: 'Deployment complete',
        config: { channel: 'slack' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-push', target: 'action-lint', animated: true },
    { id: 'e2', source: 'action-lint', target: 'action-typecheck', animated: true },
    { id: 'e3', source: 'action-typecheck', target: 'action-test', animated: true },
    { id: 'e4', source: 'action-test', target: 'condition-pass', animated: true },
    { id: 'e5', source: 'condition-pass', target: 'notify-fail', label: 'No', animated: true },
    { id: 'e6', source: 'condition-pass', target: 'action-build', label: 'Yes', animated: true },
    { id: 'e7', source: 'action-build', target: 'action-deploy', animated: true },
    { id: 'e8', source: 'action-deploy', target: 'notify-success', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'service',
    stackProfile: getDefaultStackProfile('docker'),
    fileSpecs: [
      { path: '.github/workflows/ci.yml', template: 'github-action', variables: { workflowName: 'CI' } },
      { path: '.github/workflows/deploy.yml', template: 'github-action', variables: { workflowName: 'Deploy' } },
    ],
    dependencies: [],
  },

  variables: [
    {
      name: 'ciProvider',
      label: 'CI Provider',
      type: 'select',
      default: 'github',
      options: [
        { label: 'GitHub Actions', value: 'github' },
        { label: 'GitLab CI', value: 'gitlab' },
        { label: 'Cloud Build', value: 'cloudbuild' },
      ],
      description: 'CI/CD platform',
    },
    {
      name: 'deployTarget',
      label: 'Deploy Target',
      type: 'select',
      default: 'cloudrun',
      options: [
        { label: 'Cloud Run', value: 'cloudrun' },
        { label: 'Kubernetes', value: 'k8s' },
        { label: 'Vercel', value: 'vercel' },
      ],
      description: 'Deployment destination',
    },
  ],

  tags: ['devops', 'cicd', 'automation', 'deployment'],
  requiredAgents: ['devops'],
};
