/**
 * Cross-Platform Mobile App Template
 *
 * Visual Layout:
 *                     [App Init]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [Expo Setup]
 *                            │
 *        ┌────────────┬──────┼──────┬────────────┐
 *        │            │      │      │            │
 *   [Navigation]  [Auth]  [State]  [API]   [Storage]
 *        │            │      │      │            │
 *        └────────────┴──────┼──────┴────────────┘
 *                            │
 *        ┌────────────┬──────┼──────┬────────────┐
 *        │            │      │      │            │
 *   [Home Screen] [Auth UI] [List] [Detail] [Settings]
 *        │            │      │      │            │
 *        └────────────┴──────┼──────┴────────────┘
 *                            │
 *                     [EAS Build]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';

export const CROSS_PLATFORM: WorkflowTemplateDefinition = {
  id: 'cross-platform-mobile',
  name: 'Cross-Platform Mobile App',
  description: 'Expo-based React Native app for iOS and Android with shared codebase',
  category: 'mobile',
  complexity: 'complex',
  platform: 'expo',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 300, y: 0 },
      data: {
        label: 'App Init',
        nodeType: 'trigger',
        description: 'Initialize Expo app with TypeScript',
        config: { event: 'app-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 300, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design mobile app architecture',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'action-expo',
      type: 'workflow',
      position: { x: 300, y: 200 },
      data: {
        label: 'Expo Setup',
        nodeType: 'action',
        description: 'Configure Expo with EAS and app.json',
        config: { command: 'setup-expo' },
      },
    },
    {
      id: 'action-nav',
      type: 'workflow',
      position: { x: 75, y: 300 },
      data: {
        label: 'Navigation',
        nodeType: 'action',
        description: 'React Navigation with stack and tabs',
        config: { command: 'setup-navigation' },
      },
    },
    {
      id: 'action-auth',
      type: 'workflow',
      position: { x: 187, y: 300 },
      data: {
        label: 'Auth System',
        nodeType: 'action',
        description: 'Secure authentication with biometrics',
        config: { command: 'setup-auth' },
      },
    },
    {
      id: 'action-state',
      type: 'workflow',
      position: { x: 300, y: 300 },
      data: {
        label: 'State Management',
        nodeType: 'action',
        description: 'Zustand with persist middleware',
        config: { command: 'setup-state' },
      },
    },
    {
      id: 'action-api',
      type: 'workflow',
      position: { x: 412, y: 300 },
      data: {
        label: 'API Client',
        nodeType: 'action',
        description: 'Axios with interceptors and retry',
        config: { command: 'setup-api' },
      },
    },
    {
      id: 'action-storage',
      type: 'workflow',
      position: { x: 525, y: 300 },
      data: {
        label: 'Secure Storage',
        nodeType: 'action',
        description: 'Expo SecureStore for sensitive data',
        config: { command: 'setup-storage' },
      },
    },
    {
      id: 'ui-home',
      type: 'workflow',
      position: { x: 75, y: 400 },
      data: {
        label: 'Home Screen',
        nodeType: 'ui',
        description: 'Main app dashboard',
        config: { component: 'HomeScreen' },
      },
    },
    {
      id: 'ui-auth',
      type: 'workflow',
      position: { x: 187, y: 400 },
      data: {
        label: 'Auth Screens',
        nodeType: 'ui',
        description: 'Login, register, forgot password',
        config: { component: 'AuthScreens' },
      },
    },
    {
      id: 'ui-list',
      type: 'workflow',
      position: { x: 300, y: 400 },
      data: {
        label: 'List Screen',
        nodeType: 'ui',
        description: 'FlatList with pull-to-refresh',
        config: { component: 'ListScreen' },
      },
    },
    {
      id: 'ui-detail',
      type: 'workflow',
      position: { x: 412, y: 400 },
      data: {
        label: 'Detail Screen',
        nodeType: 'ui',
        description: 'Item detail with actions',
        config: { component: 'DetailScreen' },
      },
    },
    {
      id: 'ui-settings',
      type: 'workflow',
      position: { x: 525, y: 400 },
      data: {
        label: 'Settings Screen',
        nodeType: 'ui',
        description: 'App preferences and account',
        config: { component: 'SettingsScreen' },
      },
    },
    {
      id: 'action-build',
      type: 'workflow',
      position: { x: 300, y: 500 },
      data: {
        label: 'EAS Build',
        nodeType: 'action',
        description: 'Configure EAS Build for iOS and Android',
        config: { command: 'eas-build' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'action-expo', animated: true },
    { id: 'e3', source: 'action-expo', target: 'action-nav', animated: true },
    { id: 'e4', source: 'action-expo', target: 'action-auth', animated: true },
    { id: 'e5', source: 'action-expo', target: 'action-state', animated: true },
    { id: 'e6', source: 'action-expo', target: 'action-api', animated: true },
    { id: 'e7', source: 'action-expo', target: 'action-storage', animated: true },
    { id: 'e8', source: 'action-nav', target: 'ui-home', animated: true },
    { id: 'e9', source: 'action-auth', target: 'ui-auth', animated: true },
    { id: 'e10', source: 'action-state', target: 'ui-list', animated: true },
    { id: 'e11', source: 'action-api', target: 'ui-detail', animated: true },
    { id: 'e12', source: 'action-storage', target: 'ui-settings', animated: true },
    { id: 'e13', source: 'ui-home', target: 'action-build', animated: true },
    { id: 'e14', source: 'ui-auth', target: 'action-build', animated: true },
    { id: 'e15', source: 'ui-list', target: 'action-build', animated: true },
    { id: 'e16', source: 'ui-detail', target: 'action-build', animated: true },
    { id: 'e17', source: 'ui-settings', target: 'action-build', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'single-app',
    stackProfile: {
      frontend: { framework: 'expo', styling: 'tailwind', state: 'zustand' },
      infrastructure: { containerization: 'none', hosting: 'gcp', ci: 'github-actions' },
    },
    fileSpecs: [
      { path: 'App.tsx', template: 'expo-app', variables: {} },
      { path: 'src/screens/HomeScreen.tsx', template: 'react-component', variables: { componentName: 'HomeScreen' } },
      { path: 'src/navigation/index.tsx', template: 'react-component', variables: { componentName: 'RootNavigator' } },
    ],
    dependencies: [
      { name: 'expo', version: '^50.0.0', workspace: 'root' },
      { name: '@react-navigation/native', version: '^6.0.0', workspace: 'root' },
      { name: '@react-navigation/native-stack', version: '^6.0.0', workspace: 'root' },
      { name: 'zustand', version: '^4.0.0', workspace: 'root' },
      { name: 'expo-secure-store', version: '^13.0.0', workspace: 'root' },
    ],
  },

  variables: [
    {
      name: 'appName',
      label: 'App Name',
      type: 'string',
      default: 'MyApp',
      description: 'Display name for the app',
      required: true,
    },
    {
      name: 'bundleId',
      label: 'Bundle ID',
      type: 'string',
      default: 'com.example.myapp',
      description: 'iOS bundle identifier / Android package name',
      required: true,
    },
    {
      name: 'navigationStyle',
      label: 'Navigation Style',
      type: 'select',
      default: 'tabs',
      options: [
        { label: 'Tab Navigator', value: 'tabs' },
        { label: 'Drawer Navigator', value: 'drawer' },
        { label: 'Stack Only', value: 'stack' },
      ],
      description: 'Primary navigation pattern',
    },
  ],

  tags: ['mobile', 'expo', 'react-native', 'ios', 'android'],
  requiredAgents: ['architect', 'dev_frontend'],
};
