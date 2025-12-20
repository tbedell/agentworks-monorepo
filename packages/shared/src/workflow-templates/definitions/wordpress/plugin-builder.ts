/**
 * WordPress Plugin Builder Template
 *
 * Visual Layout:
 *               [Plugin Request]
 *                      │
 *               [Architect Agent]
 *                      │
 *               [Plugin Structure]
 *                      │
 *         ┌────────────┼────────────┐
 *         │            │            │
 *   [Main Plugin]  [Admin UI]  [REST API]
 *         │            │            │
 *         └────────────┼────────────┘
 *                      │
 *               [Database Tables]
 *                      │
 *               [Hooks & Filters]
 *                      │
 *               [Activate Plugin]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';

export const WP_PLUGIN: WorkflowTemplateDefinition = {
  id: 'wp-plugin',
  name: 'WordPress Plugin',
  description: 'Custom WordPress plugin with admin UI, REST API, and custom database tables',
  category: 'wordpress',
  complexity: 'medium',
  platform: 'wordpress',

  nodes: [
    {
      id: 'trigger-request',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Plugin Request',
        nodeType: 'trigger',
        description: 'Define plugin requirements and features',
        config: { event: 'plugin-request' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design plugin architecture',
        config: { agentName: 'cms_wordpress' },
      },
    },
    {
      id: 'action-structure',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Plugin Structure',
        nodeType: 'action',
        description: 'Create plugin directory and main file',
        config: { command: 'create-plugin-structure' },
      },
    },
    {
      id: 'action-main',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Main Plugin File',
        nodeType: 'action',
        description: 'Plugin header and initialization',
        config: { command: 'create-main-file' },
      },
    },
    {
      id: 'ui-admin',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Admin UI',
        nodeType: 'ui',
        description: 'Admin menu pages and settings',
        config: { component: 'AdminPages' },
      },
    },
    {
      id: 'api-rest',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'REST API',
        nodeType: 'api',
        description: 'Custom REST endpoints',
        config: { endpoint: 'wp-json/plugin/v1' },
      },
    },
    {
      id: 'db-tables',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Database Tables',
        nodeType: 'database',
        description: 'Custom database tables with dbDelta',
        config: { tableName: 'plugin_data' },
      },
    },
    {
      id: 'action-hooks',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Hooks & Filters',
        nodeType: 'action',
        description: 'Action and filter registrations',
        config: { command: 'setup-hooks' },
      },
    },
    {
      id: 'action-activate',
      type: 'workflow',
      position: { x: 250, y: 600 },
      data: {
        label: 'Activate Plugin',
        nodeType: 'action',
        description: 'Activate plugin via WP-CLI',
        config: { command: 'wp plugin activate' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-request', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'action-structure', animated: true },
    { id: 'e3', source: 'action-structure', target: 'action-main', animated: true },
    { id: 'e4', source: 'action-structure', target: 'ui-admin', animated: true },
    { id: 'e5', source: 'action-structure', target: 'api-rest', animated: true },
    { id: 'e6', source: 'action-main', target: 'db-tables', animated: true },
    { id: 'e7', source: 'ui-admin', target: 'db-tables', animated: true },
    { id: 'e8', source: 'api-rest', target: 'db-tables', animated: true },
    { id: 'e9', source: 'db-tables', target: 'action-hooks', animated: true },
    { id: 'e10', source: 'action-hooks', target: 'action-activate', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'plugin',
    stackProfile: {
      frontend: { framework: 'wordpress', styling: 'css-modules' },
      backend: { runtime: 'php', framework: 'wordpress', database: 'mysql' },
      infrastructure: { containerization: 'docker', hosting: 'self-hosted' },
    },
    fileSpecs: [
      { path: 'my-plugin.php', template: 'wp-functions', variables: { themeName: 'my-plugin', prefix: 'mp' } },
      { path: 'includes/class-admin.php', template: 'wp-functions', variables: {} },
      { path: 'includes/class-rest-api.php', template: 'wp-functions', variables: {} },
    ],
    dependencies: [],
  },

  variables: [
    {
      name: 'pluginName',
      label: 'Plugin Name',
      type: 'string',
      default: 'My Plugin',
      description: 'Display name for the plugin',
      required: true,
    },
    {
      name: 'pluginSlug',
      label: 'Plugin Slug',
      type: 'string',
      default: 'my-plugin',
      description: 'URL-friendly plugin identifier',
      required: true,
    },
    {
      name: 'includeGutenberg',
      label: 'Include Gutenberg Blocks',
      type: 'boolean',
      default: false,
      description: 'Add custom Gutenberg blocks',
    },
  ],

  tags: ['wordpress', 'plugin', 'admin', 'rest-api'],
  requiredAgents: ['architect', 'dev_backend'],
};
