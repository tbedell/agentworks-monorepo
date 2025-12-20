/**
 * Multi-Tenant SaaS Starter Template
 *
 * Visual Layout:
 *                     [Initialize Project]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [Database Schema]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Auth APIs]  [Tenant APIs]  [User APIs]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Frontend Setup]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Admin UI]   [Tenant UI]   [Auth UI]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [DevOps Deploy]
 *                            │
 *                     [Notify Complete]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const MULTI_TENANT_SAAS: WorkflowTemplateDefinition = {
  id: 'multi-tenant-saas',
  name: 'Multi-Tenant SaaS Starter',
  description: 'Complete multi-tenant SaaS application with tenant isolation, user management, and admin dashboard',
  category: 'saas',
  complexity: 'complex',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Initialize Project',
        nodeType: 'trigger',
        description: 'Create monorepo structure with apps and packages',
        config: { event: 'project-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design system architecture and data models',
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
        description: 'Multi-tenant Prisma schema with tenant isolation',
        config: { tableName: 'Tenant', multiTenant: true },
      },
    },
    {
      id: 'api-auth',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Auth APIs',
        nodeType: 'api',
        description: 'Login, register, OAuth, password reset endpoints',
        config: { endpoint: 'auth' },
      },
    },
    {
      id: 'api-tenant',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Tenant APIs',
        nodeType: 'api',
        description: 'Tenant CRUD, isolation middleware, settings',
        config: { endpoint: 'tenants' },
      },
    },
    {
      id: 'api-user',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'User APIs',
        nodeType: 'api',
        description: 'User management, roles, permissions',
        config: { endpoint: 'users' },
      },
    },
    {
      id: 'frontend-setup',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Frontend Setup',
        nodeType: 'action',
        description: 'React app with routing, state management, and API client',
        config: { command: 'setup-frontend' },
      },
    },
    {
      id: 'ui-admin',
      type: 'workflow',
      position: { x: 100, y: 500 },
      data: {
        label: 'Admin Dashboard',
        nodeType: 'ui',
        description: 'Super admin tenant management and analytics',
        config: { component: 'AdminDashboard' },
      },
    },
    {
      id: 'ui-tenant',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Tenant Dashboard',
        nodeType: 'ui',
        description: 'Tenant-specific workspace and settings',
        config: { component: 'TenantDashboard' },
      },
    },
    {
      id: 'ui-auth',
      type: 'workflow',
      position: { x: 400, y: 500 },
      data: {
        label: 'Auth Pages',
        nodeType: 'ui',
        description: 'Login, register, forgot password pages',
        config: { component: 'AuthPages' },
      },
    },
    {
      id: 'devops-deploy',
      type: 'workflow',
      position: { x: 250, y: 600 },
      data: {
        label: 'Deploy to Cloud',
        nodeType: 'action',
        description: 'Docker build and GCP Cloud Run deployment',
        config: { command: 'docker-deploy' },
      },
    },
    {
      id: 'notify-complete',
      type: 'workflow',
      position: { x: 250, y: 700 },
      data: {
        label: 'Notify Complete',
        nodeType: 'notification',
        description: 'Send deployment completion notification',
        config: { channel: 'slack' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'db-schema', animated: true },
    { id: 'e3', source: 'db-schema', target: 'api-auth', animated: true },
    { id: 'e4', source: 'db-schema', target: 'api-tenant', animated: true },
    { id: 'e5', source: 'db-schema', target: 'api-user', animated: true },
    { id: 'e6', source: 'api-auth', target: 'frontend-setup', animated: true },
    { id: 'e7', source: 'api-tenant', target: 'frontend-setup', animated: true },
    { id: 'e8', source: 'api-user', target: 'frontend-setup', animated: true },
    { id: 'e9', source: 'frontend-setup', target: 'ui-admin', animated: true },
    { id: 'e10', source: 'frontend-setup', target: 'ui-tenant', animated: true },
    { id: 'e11', source: 'frontend-setup', target: 'ui-auth', animated: true },
    { id: 'e12', source: 'ui-admin', target: 'devops-deploy', animated: true },
    { id: 'e13', source: 'ui-tenant', target: 'devops-deploy', animated: true },
    { id: 'e14', source: 'ui-auth', target: 'devops-deploy', animated: true },
    { id: 'e15', source: 'devops-deploy', target: 'notify-complete', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('react'),
    fileSpecs: [
      { path: 'packages/db/prisma/schema.prisma', template: 'prisma-schema', variables: { multiTenant: true } },
      { path: 'apps/api/src/routes/auth.ts', template: 'api-route', variables: { routeName: 'Auth', endpoint: 'auth' } },
      { path: 'apps/api/src/routes/tenants.ts', template: 'api-route', variables: { routeName: 'Tenants', endpoint: 'tenants' } },
      { path: 'apps/api/src/routes/users.ts', template: 'api-route', variables: { routeName: 'Users', endpoint: 'users' } },
    ],
    dependencies: [
      { name: '@prisma/client', version: '^5.0.0', workspace: 'packages/db' },
      { name: 'fastify', version: '^4.0.0', workspace: 'apps/api' },
      { name: 'react', version: '^18.0.0', workspace: 'apps/web' },
      { name: 'zustand', version: '^4.0.0', workspace: 'apps/web' },
    ],
  },

  variables: [
    {
      name: 'projectName',
      label: 'Project Name',
      type: 'string',
      default: 'my-saas-app',
      description: 'Name of the project (used for package names)',
      required: true,
    },
    {
      name: 'tenantModel',
      label: 'Tenant Model',
      type: 'select',
      default: 'subdomain',
      options: [
        { label: 'Subdomain-based', value: 'subdomain' },
        { label: 'Path-based', value: 'path' },
        { label: 'Header-based', value: 'header' },
      ],
      description: 'How tenants are identified in requests',
    },
    {
      name: 'authProvider',
      label: 'Auth Provider',
      type: 'select',
      default: 'email',
      options: [
        { label: 'Email/Password', value: 'email' },
        { label: 'OAuth (Google, GitHub)', value: 'oauth' },
        { label: 'Both', value: 'both' },
      ],
      description: 'Authentication method',
    },
  ],

  tags: ['saas', 'multi-tenant', 'authentication', 'full-stack'],
  requiredAgents: ['architect', 'dev_backend', 'dev_frontend', 'devops'],
};
