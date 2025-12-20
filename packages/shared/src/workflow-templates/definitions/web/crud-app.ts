/**
 * CRUD Application Template
 *
 * Visual Layout:
 *                     [App Init]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [Database Schema]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [List API]   [Create API]  [Update API]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [List View]   [Form View]  [Detail View]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Validation]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const CRUD_APP: WorkflowTemplateDefinition = {
  id: 'crud-app',
  name: 'CRUD Application',
  description: 'Full-stack CRUD application with list, create, edit, and delete functionality',
  category: 'web',
  complexity: 'medium',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'App Init',
        nodeType: 'trigger',
        description: 'Initialize CRUD application',
        config: { event: 'app-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design data models and API structure',
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
        description: 'Define entity models with Prisma',
        config: { tableName: 'Entity' },
      },
    },
    {
      id: 'api-list',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'List API',
        nodeType: 'api',
        description: 'GET endpoint with pagination and filters',
        config: { endpoint: 'entities' },
      },
    },
    {
      id: 'api-create',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Create API',
        nodeType: 'api',
        description: 'POST endpoint for creating entities',
        config: { endpoint: 'entities' },
      },
    },
    {
      id: 'api-update',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Update/Delete API',
        nodeType: 'api',
        description: 'PUT/DELETE endpoints for entities',
        config: { endpoint: 'entities/:id' },
      },
    },
    {
      id: 'ui-list',
      type: 'workflow',
      position: { x: 100, y: 400 },
      data: {
        label: 'List View',
        nodeType: 'ui',
        description: 'Data table with search, sort, pagination',
        config: { component: 'EntityList' },
      },
    },
    {
      id: 'ui-form',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Form View',
        nodeType: 'ui',
        description: 'Create/edit form with validation',
        config: { component: 'EntityForm' },
      },
    },
    {
      id: 'ui-detail',
      type: 'workflow',
      position: { x: 400, y: 400 },
      data: {
        label: 'Detail View',
        nodeType: 'ui',
        description: 'Single entity detail page',
        config: { component: 'EntityDetail' },
      },
    },
    {
      id: 'action-validation',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Form Validation',
        nodeType: 'action',
        description: 'Client and server-side validation',
        config: { command: 'setup-validation' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'db-schema', animated: true },
    { id: 'e3', source: 'db-schema', target: 'api-list', animated: true },
    { id: 'e4', source: 'db-schema', target: 'api-create', animated: true },
    { id: 'e5', source: 'db-schema', target: 'api-update', animated: true },
    { id: 'e6', source: 'api-list', target: 'ui-list', animated: true },
    { id: 'e7', source: 'api-create', target: 'ui-form', animated: true },
    { id: 'e8', source: 'api-update', target: 'ui-detail', animated: true },
    { id: 'e9', source: 'ui-list', target: 'action-validation', animated: true },
    { id: 'e10', source: 'ui-form', target: 'action-validation', animated: true },
    { id: 'e11', source: 'ui-detail', target: 'action-validation', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('react'),
    fileSpecs: [
      { path: 'apps/web/src/pages/entities/index.tsx', template: 'react-component', variables: { componentName: 'EntityList' } },
      { path: 'apps/web/src/pages/entities/[id].tsx', template: 'react-component', variables: { componentName: 'EntityDetail' } },
      { path: 'apps/web/src/components/EntityForm.tsx', template: 'react-component', variables: { componentName: 'EntityForm' } },
    ],
    dependencies: [
      { name: '@tanstack/react-query', version: '^5.0.0', workspace: 'apps/web' },
      { name: 'react-hook-form', version: '^7.0.0', workspace: 'apps/web' },
      { name: 'zod', version: '^3.0.0', workspace: 'apps/web' },
    ],
  },

  variables: [
    {
      name: 'entityName',
      label: 'Entity Name',
      type: 'string',
      default: 'Item',
      description: 'Name of the primary entity',
      required: true,
    },
    {
      name: 'tableLibrary',
      label: 'Table Library',
      type: 'select',
      default: 'tanstack',
      options: [
        { label: 'TanStack Table', value: 'tanstack' },
        { label: 'AG Grid', value: 'aggrid' },
        { label: 'Custom', value: 'custom' },
      ],
      description: 'Data table library',
    },
  ],

  tags: ['crud', 'full-stack', 'forms', 'data-table'],
  requiredAgents: ['architect', 'dev_backend', 'dev_frontend'],
};
