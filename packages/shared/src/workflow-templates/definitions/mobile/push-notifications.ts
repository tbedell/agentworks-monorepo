/**
 * Push Notifications Template
 *
 * Visual Layout:
 *                     [Notifications Init]
 *                            │
 *                     [Expo Push Setup]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Token Mgmt]  [Backend API]  [Handlers]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Permission UI] [Inbox UI]  [Settings]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Test Notifications]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';

export const PUSH_NOTIFICATIONS: WorkflowTemplateDefinition = {
  id: 'push-notifications',
  name: 'Push Notifications',
  description: 'Complete push notification system for iOS and Android',
  category: 'mobile',
  complexity: 'medium',
  platform: 'expo',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Notifications Init',
        nodeType: 'trigger',
        description: 'Initialize push notification system',
        config: { event: 'notifications-init' },
      },
    },
    {
      id: 'action-setup',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Expo Push Setup',
        nodeType: 'action',
        description: 'Configure Expo Push Notifications',
        config: { command: 'setup-expo-push' },
      },
    },
    {
      id: 'action-tokens',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'Token Management',
        nodeType: 'action',
        description: 'Store and refresh push tokens',
        config: { command: 'manage-tokens' },
      },
    },
    {
      id: 'api-backend',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Backend API',
        nodeType: 'api',
        description: 'Notification sending endpoints',
        config: { endpoint: 'notifications' },
      },
    },
    {
      id: 'action-handlers',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: {
        label: 'Notification Handlers',
        nodeType: 'action',
        description: 'Handle received notifications',
        config: { command: 'setup-handlers' },
      },
    },
    {
      id: 'ui-permission',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Permission Request',
        nodeType: 'ui',
        description: 'Notification permission prompt',
        config: { component: 'PermissionPrompt' },
      },
    },
    {
      id: 'ui-inbox',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Notification Inbox',
        nodeType: 'ui',
        description: 'List of received notifications',
        config: { component: 'NotificationInbox' },
      },
    },
    {
      id: 'ui-settings',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Notification Settings',
        nodeType: 'ui',
        description: 'User notification preferences',
        config: { component: 'NotificationSettings' },
      },
    },
    {
      id: 'action-test',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Test Notifications',
        nodeType: 'action',
        description: 'Send test push notifications',
        config: { command: 'test-push' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'action-setup', animated: true },
    { id: 'e2', source: 'action-setup', target: 'action-tokens', animated: true },
    { id: 'e3', source: 'action-setup', target: 'api-backend', animated: true },
    { id: 'e4', source: 'action-setup', target: 'action-handlers', animated: true },
    { id: 'e5', source: 'action-tokens', target: 'ui-permission', animated: true },
    { id: 'e6', source: 'api-backend', target: 'ui-inbox', animated: true },
    { id: 'e7', source: 'action-handlers', target: 'ui-settings', animated: true },
    { id: 'e8', source: 'ui-permission', target: 'action-test', animated: true },
    { id: 'e9', source: 'ui-inbox', target: 'action-test', animated: true },
    { id: 'e10', source: 'ui-settings', target: 'action-test', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: {
      frontend: { framework: 'expo', styling: 'tailwind', state: 'zustand' },
      backend: { runtime: 'node', framework: 'fastify', database: 'postgresql', orm: 'prisma' },
      infrastructure: { containerization: 'docker', hosting: 'gcp', ci: 'github-actions' },
    },
    fileSpecs: [
      { path: 'apps/mobile/src/lib/notifications.ts', template: 'react-component', variables: { componentName: 'Notifications' } },
      { path: 'apps/api/src/routes/notifications.ts', template: 'api-route', variables: { routeName: 'Notifications', endpoint: 'notifications' } },
    ],
    dependencies: [
      { name: 'expo-notifications', version: '^0.27.0', workspace: 'apps/mobile' },
      { name: 'expo-device', version: '^5.0.0', workspace: 'apps/mobile' },
    ],
  },

  variables: [
    {
      name: 'provider',
      label: 'Push Provider',
      type: 'select',
      default: 'expo',
      options: [
        { label: 'Expo Push', value: 'expo' },
        { label: 'Firebase FCM', value: 'fcm' },
        { label: 'OneSignal', value: 'onesignal' },
      ],
      description: 'Push notification service provider',
    },
    {
      name: 'scheduledNotifications',
      label: 'Scheduled Notifications',
      type: 'boolean',
      default: true,
      description: 'Support scheduled/local notifications',
    },
  ],

  tags: ['mobile', 'notifications', 'push', 'expo'],
  requiredAgents: ['dev_frontend', 'dev_backend'],
};
