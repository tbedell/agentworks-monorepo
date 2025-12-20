/**
 * API Backend Template
 *
 * Visual Layout:
 *                     [API Init]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [Database Schema]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [CRUD Routes]  [Auth MW]  [Validation]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Error Handling]
 *                            │
 *                     [API Docs]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const API_BACKEND: WorkflowTemplateDefinition = {
  id: 'api-backend',
  name: 'API Backend',
  description: 'RESTful API backend with authentication, validation, and documentation',
  category: 'saas',
  complexity: 'medium',
  platform: 'node',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'API Init',
        nodeType: 'trigger',
        description: 'Initialize API backend structure',
        config: { event: 'api-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design API structure and data models',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'db-schema',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Database Schema',
        nodeType: 'database',
        description: 'Define Prisma models and relationships',
        config: { tableName: 'Resource' },
      },
    },
    {
      id: 'api-crud',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'CRUD Routes',
        nodeType: 'api',
        description: 'Generate CRUD endpoints for all models',
        config: { endpoint: 'resources' },
      },
    },
    {
      id: 'action-auth',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Auth Middleware',
        nodeType: 'action',
        description: 'JWT authentication and authorization',
        config: { command: 'setup-auth' },
      },
    },
    {
      id: 'action-validation',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Validation',
        nodeType: 'action',
        description: 'Request validation with Zod schemas',
        config: { command: 'setup-validation' },
      },
    },
    {
      id: 'action-errors',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Error Handling',
        nodeType: 'action',
        description: 'Global error handler and logging',
        config: { command: 'setup-errors' },
      },
    },
    {
      id: 'action-docs',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'API Documentation',
        nodeType: 'action',
        description: 'OpenAPI/Swagger documentation',
        config: { command: 'generate-docs' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'db-schema', animated: true },
    { id: 'e3', source: 'db-schema', target: 'api-crud', animated: true },
    { id: 'e4', source: 'db-schema', target: 'action-auth', animated: true },
    { id: 'e5', source: 'db-schema', target: 'action-validation', animated: true },
    { id: 'e6', source: 'api-crud', target: 'action-errors', animated: true },
    { id: 'e7', source: 'action-auth', target: 'action-errors', animated: true },
    { id: 'e8', source: 'action-validation', target: 'action-errors', animated: true },
    { id: 'e9', source: 'action-errors', target: 'action-docs', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'single-app',
    stackProfile: getDefaultStackProfile('node'),
    fileSpecs: [
      { path: 'src/index.ts', template: 'api-route', variables: { routeName: 'App', endpoint: '' } },
      { path: 'src/middleware/auth.ts', template: 'api-route', variables: { routeName: 'Auth', endpoint: 'auth' } },
      { path: 'src/lib/errors.ts', template: 'api-route', variables: { routeName: 'Errors', endpoint: 'errors' } },
    ],
    dependencies: [
      { name: 'fastify', version: '^4.0.0', workspace: 'root' },
      { name: '@fastify/jwt', version: '^8.0.0', workspace: 'root' },
      { name: '@fastify/swagger', version: '^8.0.0', workspace: 'root' },
      { name: 'zod', version: '^3.0.0', workspace: 'root' },
    ],
  },

  variables: [
    {
      name: 'apiFramework',
      label: 'API Framework',
      type: 'select',
      default: 'fastify',
      options: [
        { label: 'Fastify', value: 'fastify' },
        { label: 'Express', value: 'express' },
        { label: 'Hono', value: 'hono' },
      ],
      description: 'Backend framework',
    },
    {
      name: 'authMethod',
      label: 'Auth Method',
      type: 'select',
      default: 'jwt',
      options: [
        { label: 'JWT', value: 'jwt' },
        { label: 'Session', value: 'session' },
        { label: 'API Key', value: 'apikey' },
      ],
      description: 'Authentication method',
    },
  ],

  tags: ['api', 'backend', 'rest', 'crud'],
  requiredAgents: ['architect', 'dev_backend'],
};
