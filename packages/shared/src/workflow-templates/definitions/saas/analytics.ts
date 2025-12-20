/**
 * Analytics Integration Template
 *
 * Visual Layout:
 *                     [Analytics Init]
 *                            │
 *                     [Event Tracking]
 *                            │
 *               ┌────────────┴────────────┐
 *               │                         │
 *         [Page Views]             [Custom Events]
 *               │                         │
 *               └────────────┬────────────┘
 *                            │
 *                     [Dashboard UI]
 *                            │
 *                     [Export Reports]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const ANALYTICS: WorkflowTemplateDefinition = {
  id: 'analytics',
  name: 'Analytics Integration',
  description: 'Event tracking, page views, and analytics dashboard integration',
  category: 'saas',
  complexity: 'simple',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Analytics Init',
        nodeType: 'trigger',
        description: 'Initialize analytics module',
        config: { event: 'analytics-init' },
      },
    },
    {
      id: 'action-tracking',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Event Tracking',
        nodeType: 'action',
        description: 'Set up event tracking infrastructure',
        config: { command: 'setup-tracking' },
      },
    },
    {
      id: 'action-pageviews',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'Page Views',
        nodeType: 'action',
        description: 'Automatic page view tracking',
        config: { command: 'track-pageviews' },
      },
    },
    {
      id: 'action-events',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: {
        label: 'Custom Events',
        nodeType: 'action',
        description: 'Custom event tracking helpers',
        config: { command: 'track-events' },
      },
    },
    {
      id: 'ui-dashboard',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Analytics Dashboard',
        nodeType: 'ui',
        description: 'Built-in analytics dashboard',
        config: { component: 'AnalyticsDashboard' },
      },
    },
    {
      id: 'action-export',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Export Reports',
        nodeType: 'action',
        description: 'Generate and export reports',
        config: { command: 'export-reports' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'action-tracking', animated: true },
    { id: 'e2', source: 'action-tracking', target: 'action-pageviews', animated: true },
    { id: 'e3', source: 'action-tracking', target: 'action-events', animated: true },
    { id: 'e4', source: 'action-pageviews', target: 'ui-dashboard', animated: true },
    { id: 'e5', source: 'action-events', target: 'ui-dashboard', animated: true },
    { id: 'e6', source: 'ui-dashboard', target: 'action-export', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('react'),
    fileSpecs: [
      { path: 'apps/web/src/lib/analytics.ts', template: 'react-component', variables: { componentName: 'Analytics' } },
      { path: 'apps/web/src/hooks/useAnalytics.ts', template: 'react-component', variables: { componentName: 'useAnalytics' } },
    ],
    dependencies: [
      { name: 'posthog-js', version: '^1.0.0', workspace: 'apps/web' },
    ],
  },

  variables: [
    {
      name: 'provider',
      label: 'Analytics Provider',
      type: 'select',
      default: 'posthog',
      options: [
        { label: 'PostHog', value: 'posthog' },
        { label: 'Mixpanel', value: 'mixpanel' },
        { label: 'Google Analytics', value: 'ga4' },
        { label: 'Custom', value: 'custom' },
      ],
      description: 'Analytics service provider',
    },
    {
      name: 'dashboardEnabled',
      label: 'Enable Dashboard',
      type: 'boolean',
      default: true,
      description: 'Include built-in analytics dashboard',
    },
  ],

  tags: ['analytics', 'tracking', 'metrics', 'reporting'],
  requiredAgents: ['dev_frontend', 'dev_backend'],
};
