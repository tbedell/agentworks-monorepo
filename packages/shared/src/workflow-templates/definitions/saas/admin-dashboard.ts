/**
 * Admin Dashboard Template
 *
 * Visual Layout:
 *                     [Dashboard Init]
 *                            │
 *                     [Data Aggregation]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Users API]  [Metrics API]  [Logs API]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Users Table] [Charts]  [Activity Log]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Export Actions]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const ADMIN_DASHBOARD: WorkflowTemplateDefinition = {
  id: 'admin-dashboard',
  name: 'Admin Dashboard',
  description: 'Complete admin dashboard with user management, metrics, and activity logs',
  category: 'saas',
  complexity: 'medium',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Dashboard Init',
        nodeType: 'trigger',
        description: 'Initialize admin dashboard module',
        config: { event: 'admin-init' },
      },
    },
    {
      id: 'action-aggregate',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Data Aggregation',
        nodeType: 'action',
        description: 'Aggregate metrics and prepare dashboard data',
        config: { command: 'aggregate-metrics' },
      },
    },
    {
      id: 'api-users',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'Users API',
        nodeType: 'api',
        description: 'Admin user management endpoints',
        config: { endpoint: 'admin/users' },
      },
    },
    {
      id: 'api-metrics',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Metrics API',
        nodeType: 'api',
        description: 'Dashboard metrics and statistics',
        config: { endpoint: 'admin/metrics' },
      },
    },
    {
      id: 'api-logs',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: {
        label: 'Logs API',
        nodeType: 'api',
        description: 'Activity and audit logs',
        config: { endpoint: 'admin/logs' },
      },
    },
    {
      id: 'ui-users',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Users Table',
        nodeType: 'ui',
        description: 'Paginated user list with search and filters',
        config: { component: 'UsersTable' },
      },
    },
    {
      id: 'ui-charts',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Metrics Charts',
        nodeType: 'ui',
        description: 'Interactive charts and graphs',
        config: { component: 'MetricsCharts' },
      },
    },
    {
      id: 'ui-activity',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Activity Log',
        nodeType: 'ui',
        description: 'Real-time activity feed',
        config: { component: 'ActivityLog' },
      },
    },
    {
      id: 'action-export',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Export Actions',
        nodeType: 'action',
        description: 'CSV/PDF export functionality',
        config: { command: 'export-data' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'action-aggregate', animated: true },
    { id: 'e2', source: 'action-aggregate', target: 'api-users', animated: true },
    { id: 'e3', source: 'action-aggregate', target: 'api-metrics', animated: true },
    { id: 'e4', source: 'action-aggregate', target: 'api-logs', animated: true },
    { id: 'e5', source: 'api-users', target: 'ui-users', animated: true },
    { id: 'e6', source: 'api-metrics', target: 'ui-charts', animated: true },
    { id: 'e7', source: 'api-logs', target: 'ui-activity', animated: true },
    { id: 'e8', source: 'ui-users', target: 'action-export', animated: true },
    { id: 'e9', source: 'ui-charts', target: 'action-export', animated: true },
    { id: 'e10', source: 'ui-activity', target: 'action-export', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('react'),
    fileSpecs: [
      { path: 'apps/web/src/pages/admin/Dashboard.tsx', template: 'react-component', variables: { componentName: 'AdminDashboard' } },
      { path: 'apps/web/src/components/admin/UsersTable.tsx', template: 'react-component', variables: { componentName: 'UsersTable' } },
      { path: 'apps/web/src/components/admin/MetricsCharts.tsx', template: 'react-component', variables: { componentName: 'MetricsCharts' } },
    ],
    dependencies: [
      { name: 'recharts', version: '^2.0.0', workspace: 'apps/web' },
      { name: '@tanstack/react-table', version: '^8.0.0', workspace: 'apps/web' },
    ],
  },

  variables: [
    {
      name: 'chartLibrary',
      label: 'Chart Library',
      type: 'select',
      default: 'recharts',
      options: [
        { label: 'Recharts', value: 'recharts' },
        { label: 'Chart.js', value: 'chartjs' },
        { label: 'Nivo', value: 'nivo' },
      ],
      description: 'Charting library for visualizations',
    },
    {
      name: 'exportFormats',
      label: 'Export Formats',
      type: 'select',
      default: 'csv',
      options: [
        { label: 'CSV Only', value: 'csv' },
        { label: 'CSV + PDF', value: 'both' },
      ],
      description: 'Data export format options',
    },
  ],

  tags: ['admin', 'dashboard', 'analytics', 'management'],
  requiredAgents: ['dev_frontend', 'dev_backend'],
};
