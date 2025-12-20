/**
 * User Onboarding Template
 *
 * Visual Layout:
 *                     [User Signup]
 *                            │
 *                     [Welcome Email]
 *                            │
 *                     [Profile Setup]
 *                            │
 *               ┌────────────┴────────────┐
 *               │                         │
 *         [Tour Guide]             [Sample Data]
 *               │                         │
 *               └────────────┬────────────┘
 *                            │
 *                     [Completion Check]
 *                            │
 *                     [Notify Success]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const USER_ONBOARDING: WorkflowTemplateDefinition = {
  id: 'user-onboarding',
  name: 'User Onboarding Flow',
  description: 'Guided onboarding experience with profile setup, tour, and sample data',
  category: 'saas',
  complexity: 'simple',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-signup',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'User Signup',
        nodeType: 'trigger',
        description: 'Triggered when new user completes registration',
        config: { event: 'user.created' },
      },
    },
    {
      id: 'action-email',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Welcome Email',
        nodeType: 'notification',
        description: 'Send welcome email with getting started tips',
        config: { channel: 'email' },
      },
    },
    {
      id: 'ui-profile',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Profile Setup',
        nodeType: 'ui',
        description: 'Multi-step profile completion wizard',
        config: { component: 'ProfileSetupWizard' },
      },
    },
    {
      id: 'ui-tour',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Product Tour',
        nodeType: 'ui',
        description: 'Interactive guided tour of key features',
        config: { component: 'ProductTour' },
      },
    },
    {
      id: 'action-sample',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'Sample Data',
        nodeType: 'action',
        description: 'Create sample project and data for user',
        config: { command: 'create-sample-data' },
      },
    },
    {
      id: 'condition-complete',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Onboarding Complete?',
        nodeType: 'condition',
        description: 'Check if all onboarding steps completed',
        config: { condition: 'onboardingComplete' },
      },
    },
    {
      id: 'notify-success',
      type: 'workflow',
      position: { x: 250, y: 500 },
      data: {
        label: 'Completion Celebration',
        nodeType: 'notification',
        description: 'Show success message and unlock features',
        config: { channel: 'in-app' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-signup', target: 'action-email', animated: true },
    { id: 'e2', source: 'action-email', target: 'ui-profile', animated: true },
    { id: 'e3', source: 'ui-profile', target: 'ui-tour', animated: true },
    { id: 'e4', source: 'ui-profile', target: 'action-sample', animated: true },
    { id: 'e5', source: 'ui-tour', target: 'condition-complete', animated: true },
    { id: 'e6', source: 'action-sample', target: 'condition-complete', animated: true },
    { id: 'e7', source: 'condition-complete', target: 'notify-success', label: 'Yes', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('react'),
    fileSpecs: [
      { path: 'apps/web/src/components/onboarding/ProfileSetupWizard.tsx', template: 'react-component', variables: { componentName: 'ProfileSetupWizard' } },
      { path: 'apps/web/src/components/onboarding/ProductTour.tsx', template: 'react-component', variables: { componentName: 'ProductTour' } },
      { path: 'apps/api/src/routes/onboarding.ts', template: 'api-route', variables: { routeName: 'Onboarding', endpoint: 'onboarding' } },
    ],
    dependencies: [
      { name: 'react-joyride', version: '^2.0.0', workspace: 'apps/web' },
      { name: '@sendgrid/mail', version: '^8.0.0', workspace: 'apps/api' },
    ],
  },

  variables: [
    {
      name: 'tourEnabled',
      label: 'Enable Product Tour',
      type: 'boolean',
      default: true,
      description: 'Show interactive product tour',
    },
    {
      name: 'sampleDataEnabled',
      label: 'Create Sample Data',
      type: 'boolean',
      default: true,
      description: 'Auto-create sample project for new users',
    },
    {
      name: 'profileSteps',
      label: 'Profile Steps',
      type: 'number',
      default: 3,
      description: 'Number of profile setup steps',
    },
  ],

  tags: ['onboarding', 'user-experience', 'welcome'],
  requiredAgents: ['dev_frontend', 'dev_backend'],
};
