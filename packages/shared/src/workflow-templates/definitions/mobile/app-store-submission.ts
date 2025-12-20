/**
 * App Store Submission Template
 *
 * Visual Layout:
 *                     [Submission Init]
 *                            │
 *                     [App Review Prep]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [App Icons]  [Screenshots]  [Metadata]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [iOS Build]  [Android Build]  [Privacy]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Submit to Stores]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';

export const APP_STORE_SUBMISSION: WorkflowTemplateDefinition = {
  id: 'app-store-submission',
  name: 'App Store Submission',
  description: 'Prepare and submit app to Apple App Store and Google Play Store',
  category: 'mobile',
  complexity: 'medium',
  platform: 'expo',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Submission Init',
        nodeType: 'trigger',
        description: 'Start app submission process',
        config: { event: 'submission-init' },
      },
    },
    {
      id: 'action-review',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'App Review Prep',
        nodeType: 'action',
        description: 'Prepare for app review guidelines',
        config: { command: 'review-prep' },
      },
    },
    {
      id: 'action-icons',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'App Icons',
        nodeType: 'action',
        description: 'Generate all required icon sizes',
        config: { command: 'generate-icons' },
      },
    },
    {
      id: 'action-screenshots',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Screenshots',
        nodeType: 'action',
        description: 'Create store screenshots for all devices',
        config: { command: 'generate-screenshots' },
      },
    },
    {
      id: 'action-metadata',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: {
        label: 'Store Metadata',
        nodeType: 'action',
        description: 'App description, keywords, categories',
        config: { command: 'create-metadata' },
      },
    },
    {
      id: 'action-ios',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'iOS Build',
        nodeType: 'action',
        description: 'Production build for App Store',
        config: { command: 'eas-build-ios' },
      },
    },
    {
      id: 'action-android',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Android Build',
        nodeType: 'action',
        description: 'Production build for Play Store',
        config: { command: 'eas-build-android' },
      },
    },
    {
      id: 'action-privacy',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Privacy Labels',
        nodeType: 'action',
        description: 'Generate privacy policy and labels',
        config: { command: 'privacy-policy' },
      },
    },
    {
      id: 'action-submit',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Submit to Stores',
        nodeType: 'action',
        description: 'Upload to App Store Connect and Play Console',
        config: { command: 'eas-submit' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'action-review', animated: true },
    { id: 'e2', source: 'action-review', target: 'action-icons', animated: true },
    { id: 'e3', source: 'action-review', target: 'action-screenshots', animated: true },
    { id: 'e4', source: 'action-review', target: 'action-metadata', animated: true },
    { id: 'e5', source: 'action-icons', target: 'action-ios', animated: true },
    { id: 'e6', source: 'action-screenshots', target: 'action-android', animated: true },
    { id: 'e7', source: 'action-metadata', target: 'action-privacy', animated: true },
    { id: 'e8', source: 'action-ios', target: 'action-submit', animated: true },
    { id: 'e9', source: 'action-android', target: 'action-submit', animated: true },
    { id: 'e10', source: 'action-privacy', target: 'action-submit', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'single-app',
    stackProfile: {
      frontend: { framework: 'expo', styling: 'tailwind' },
      infrastructure: { containerization: 'none', hosting: 'gcp', ci: 'github-actions' },
    },
    fileSpecs: [
      { path: 'eas.json', template: 'expo-app', variables: {} },
      { path: 'store-assets/README.md', template: 'react-component', variables: {} },
    ],
    dependencies: [],
  },

  variables: [
    {
      name: 'stores',
      label: 'Target Stores',
      type: 'select',
      default: 'both',
      options: [
        { label: 'Both Stores', value: 'both' },
        { label: 'App Store Only', value: 'ios' },
        { label: 'Play Store Only', value: 'android' },
      ],
      description: 'Which app stores to submit to',
    },
    {
      name: 'releaseTrack',
      label: 'Release Track',
      type: 'select',
      default: 'production',
      options: [
        { label: 'Production', value: 'production' },
        { label: 'TestFlight/Beta', value: 'beta' },
        { label: 'Internal Testing', value: 'internal' },
      ],
      description: 'Release channel',
    },
  ],

  tags: ['mobile', 'app-store', 'play-store', 'submission'],
  requiredAgents: ['devops'],
};
