/**
 * Offline-First Sync Template
 *
 * Visual Layout:
 *                     [Offline Init]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [Local Database]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Sync Engine]  [Conflict Res]  [Queue]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Network State] [Sync UI]  [Optimistic]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Background Sync]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';

export const OFFLINE_SYNC: WorkflowTemplateDefinition = {
  id: 'offline-sync',
  name: 'Offline-First Sync',
  description: 'Offline-first mobile app with data synchronization and conflict resolution',
  category: 'mobile',
  complexity: 'complex',
  platform: 'expo',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Offline Init',
        nodeType: 'trigger',
        description: 'Initialize offline-first architecture',
        config: { event: 'offline-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design offline-first data architecture',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'db-local',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Local Database',
        nodeType: 'database',
        description: 'SQLite with Watermelon/Realm',
        config: { tableName: 'LocalData' },
      },
    },
    {
      id: 'action-sync',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Sync Engine',
        nodeType: 'action',
        description: 'Two-way data synchronization',
        config: { command: 'setup-sync' },
      },
    },
    {
      id: 'action-conflict',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Conflict Resolution',
        nodeType: 'action',
        description: 'Last-write-wins or merge strategies',
        config: { command: 'setup-conflicts' },
      },
    },
    {
      id: 'action-queue',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Operation Queue',
        nodeType: 'action',
        description: 'Queue offline operations',
        config: { command: 'setup-queue' },
      },
    },
    {
      id: 'action-network',
      type: 'workflow',
      position: { x: 100, y: 400 },
      data: {
        label: 'Network State',
        nodeType: 'action',
        description: 'Detect online/offline state',
        config: { command: 'network-state' },
      },
    },
    {
      id: 'ui-sync',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Sync Status UI',
        nodeType: 'ui',
        description: 'Sync progress and status indicators',
        config: { component: 'SyncStatus' },
      },
    },
    {
      id: 'action-optimistic',
      type: 'workflow',
      position: { x: 400, y: 400 },
      data: {
        label: 'Optimistic Updates',
        nodeType: 'action',
        description: 'Instant UI feedback',
        config: { command: 'optimistic-updates' },
      },
    },
    {
      id: 'action-background',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Background Sync',
        nodeType: 'action',
        description: 'Sync when app is backgrounded',
        config: { command: 'background-sync' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'db-local', animated: true },
    { id: 'e3', source: 'db-local', target: 'action-sync', animated: true },
    { id: 'e4', source: 'db-local', target: 'action-conflict', animated: true },
    { id: 'e5', source: 'db-local', target: 'action-queue', animated: true },
    { id: 'e6', source: 'action-sync', target: 'action-network', animated: true },
    { id: 'e7', source: 'action-conflict', target: 'ui-sync', animated: true },
    { id: 'e8', source: 'action-queue', target: 'action-optimistic', animated: true },
    { id: 'e9', source: 'action-network', target: 'action-background', animated: true },
    { id: 'e10', source: 'ui-sync', target: 'action-background', animated: true },
    { id: 'e11', source: 'action-optimistic', target: 'action-background', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: {
      frontend: { framework: 'expo', styling: 'tailwind', state: 'zustand' },
      backend: { runtime: 'node', framework: 'fastify', database: 'postgresql', orm: 'prisma' },
      infrastructure: { containerization: 'docker', hosting: 'gcp', ci: 'github-actions' },
    },
    fileSpecs: [
      { path: 'apps/mobile/src/lib/sync.ts', template: 'react-component', variables: { componentName: 'SyncEngine' } },
      { path: 'apps/mobile/src/lib/database.ts', template: 'react-component', variables: { componentName: 'Database' } },
      { path: 'apps/api/src/routes/sync.ts', template: 'api-route', variables: { routeName: 'Sync', endpoint: 'sync' } },
    ],
    dependencies: [
      { name: '@nozbe/watermelondb', version: '^0.27.0', workspace: 'apps/mobile' },
      { name: '@react-native-async-storage/async-storage', version: '^1.21.0', workspace: 'apps/mobile' },
      { name: 'expo-network', version: '^5.0.0', workspace: 'apps/mobile' },
    ],
  },

  variables: [
    {
      name: 'localDb',
      label: 'Local Database',
      type: 'select',
      default: 'watermelon',
      options: [
        { label: 'WatermelonDB', value: 'watermelon' },
        { label: 'Realm', value: 'realm' },
        { label: 'SQLite', value: 'sqlite' },
      ],
      description: 'Local database for offline storage',
    },
    {
      name: 'conflictStrategy',
      label: 'Conflict Strategy',
      type: 'select',
      default: 'last-write-wins',
      options: [
        { label: 'Last Write Wins', value: 'last-write-wins' },
        { label: 'Server Wins', value: 'server-wins' },
        { label: 'Custom Merge', value: 'custom' },
      ],
      description: 'How to resolve sync conflicts',
    },
  ],

  tags: ['mobile', 'offline', 'sync', 'database'],
  requiredAgents: ['architect', 'dev_frontend', 'dev_backend'],
};
