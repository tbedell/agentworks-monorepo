/**
 * Docker Setup Template
 *
 * Visual Layout:
 *               [Docker Init]
 *                      │
 *               [Dockerfile]
 *                      │
 *         ┌────────────┴────────────┐
 *         │                         │
 *   [Development]            [Production]
 *         │                         │
 *         └────────────┬────────────┘
 *                      │
 *               [Docker Compose]
 *                      │
 *               [Build & Test]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const DOCKER_SETUP: WorkflowTemplateDefinition = {
  id: 'docker-setup',
  name: 'Docker Setup',
  description: 'Docker containerization with multi-stage builds and docker-compose',
  category: 'devops',
  complexity: 'simple',
  platform: 'docker',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Docker Init',
        nodeType: 'trigger',
        description: 'Initialize Docker configuration',
        config: { event: 'docker-init' },
      },
    },
    {
      id: 'action-dockerfile',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Dockerfile',
        nodeType: 'action',
        description: 'Create multi-stage Dockerfile',
        config: { command: 'create-dockerfile' },
      },
    },
    {
      id: 'action-dev',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'Development',
        nodeType: 'action',
        description: 'Development stage with hot reload',
        config: { command: 'dev-stage' },
      },
    },
    {
      id: 'action-prod',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: {
        label: 'Production',
        nodeType: 'action',
        description: 'Production stage optimized',
        config: { command: 'prod-stage' },
      },
    },
    {
      id: 'action-compose',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Docker Compose',
        nodeType: 'action',
        description: 'Create docker-compose.yml',
        config: { command: 'create-compose' },
      },
    },
    {
      id: 'action-build',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Build & Test',
        nodeType: 'action',
        description: 'Build and test containers',
        config: { command: 'docker build' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'action-dockerfile', animated: true },
    { id: 'e2', source: 'action-dockerfile', target: 'action-dev', animated: true },
    { id: 'e3', source: 'action-dockerfile', target: 'action-prod', animated: true },
    { id: 'e4', source: 'action-dev', target: 'action-compose', animated: true },
    { id: 'e5', source: 'action-prod', target: 'action-compose', animated: true },
    { id: 'e6', source: 'action-compose', target: 'action-build', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'service',
    stackProfile: getDefaultStackProfile('docker'),
    fileSpecs: [
      { path: 'Dockerfile', template: 'docker-service', variables: { serviceName: 'app', app: 'api', port: 3000 } },
      { path: 'docker-compose.yml', template: 'docker-service', variables: { serviceName: 'app', app: 'api', port: 3000 } },
      { path: '.dockerignore', template: 'docker-service', variables: {} },
    ],
    dependencies: [],
  },

  variables: [
    {
      name: 'nodeVersion',
      label: 'Node Version',
      type: 'select',
      default: '20',
      options: [
        { label: 'Node 20 LTS', value: '20' },
        { label: 'Node 22', value: '22' },
        { label: 'Node 18 LTS', value: '18' },
      ],
      description: 'Node.js version',
    },
    {
      name: 'includeCompose',
      label: 'Include Docker Compose',
      type: 'boolean',
      default: true,
      description: 'Generate docker-compose.yml',
    },
  ],

  tags: ['docker', 'containerization', 'devops'],
  requiredAgents: ['devops'],
};
