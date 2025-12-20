/**
 * WordPress Theme Generator Template
 *
 * Visual Layout:
 *               [Theme Request]
 *                      │
 *               [Architect Agent]
 *                      │
 *               [Create theme.json]
 *                      │
 *         ┌────────────┼────────────┐
 *         │            │            │
 *   [Header.php]  [Footer.php]  [functions.php]
 *         │            │            │
 *         └────────────┼────────────┘
 *                      │
 *               [Block Patterns]
 *                      │
 *               [Style Variations]
 *                      │
 *               [WP CLI Activate]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';

export const WP_THEME: WorkflowTemplateDefinition = {
  id: 'wp-theme',
  name: 'WordPress Theme',
  description: 'Modern block-based WordPress theme with FSE support',
  category: 'wordpress',
  complexity: 'medium',
  platform: 'wordpress',

  nodes: [
    {
      id: 'trigger-request',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Theme Request',
        nodeType: 'trigger',
        description: 'Define theme requirements and style',
        config: { event: 'theme-request' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design theme architecture and structure',
        config: { agentName: 'cms_wordpress' },
      },
    },
    {
      id: 'action-themejson',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Create theme.json',
        nodeType: 'action',
        description: 'Block theme configuration and settings',
        config: { command: 'create-theme-json' },
      },
    },
    {
      id: 'ui-header',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Header Template',
        nodeType: 'ui',
        description: 'Site header block template',
        config: { component: 'header' },
      },
    },
    {
      id: 'ui-footer',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Footer Template',
        nodeType: 'ui',
        description: 'Site footer block template',
        config: { component: 'footer' },
      },
    },
    {
      id: 'action-functions',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'functions.php',
        nodeType: 'action',
        description: 'Theme functions and hooks',
        config: { command: 'create-functions' },
      },
    },
    {
      id: 'ui-patterns',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Block Patterns',
        nodeType: 'ui',
        description: 'Reusable block patterns library',
        config: { component: 'patterns' },
      },
    },
    {
      id: 'action-styles',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Style Variations',
        nodeType: 'action',
        description: 'Color and typography presets',
        config: { command: 'create-variations' },
      },
    },
    {
      id: 'action-activate',
      type: 'workflow',
      position: { x: 250, y: 600 },
      data: {
        label: 'WP CLI Activate',
        nodeType: 'action',
        description: 'Activate theme via WP-CLI',
        config: { command: 'wp theme activate' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-request', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'action-themejson', animated: true },
    { id: 'e3', source: 'action-themejson', target: 'ui-header', animated: true },
    { id: 'e4', source: 'action-themejson', target: 'ui-footer', animated: true },
    { id: 'e5', source: 'action-themejson', target: 'action-functions', animated: true },
    { id: 'e6', source: 'ui-header', target: 'ui-patterns', animated: true },
    { id: 'e7', source: 'ui-footer', target: 'ui-patterns', animated: true },
    { id: 'e8', source: 'action-functions', target: 'ui-patterns', animated: true },
    { id: 'e9', source: 'ui-patterns', target: 'action-styles', animated: true },
    { id: 'e10', source: 'action-styles', target: 'action-activate', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'theme',
    stackProfile: {
      frontend: { framework: 'wordpress', styling: 'sass' },
      backend: { runtime: 'php', framework: 'wordpress', database: 'mysql' },
      infrastructure: { containerization: 'docker', hosting: 'self-hosted' },
    },
    fileSpecs: [
      { path: 'theme.json', template: 'wp-theme-json', variables: {} },
      { path: 'functions.php', template: 'wp-functions', variables: { themeName: 'my-theme', prefix: 'mt' } },
      { path: 'style.css', template: 'wp-functions', variables: {} },
    ],
    dependencies: [],
  },

  variables: [
    {
      name: 'themeName',
      label: 'Theme Name',
      type: 'string',
      default: 'My Theme',
      description: 'Display name for the theme',
      required: true,
    },
    {
      name: 'themeType',
      label: 'Theme Type',
      type: 'select',
      default: 'block',
      options: [
        { label: 'Block Theme (FSE)', value: 'block' },
        { label: 'Classic Theme', value: 'classic' },
        { label: 'Hybrid Theme', value: 'hybrid' },
      ],
      description: 'WordPress theme architecture',
    },
    {
      name: 'styleVariations',
      label: 'Style Variations',
      type: 'number',
      default: 3,
      description: 'Number of color/typography variations',
    },
  ],

  tags: ['wordpress', 'theme', 'fse', 'block-editor'],
  requiredAgents: ['architect', 'dev_frontend'],
};
