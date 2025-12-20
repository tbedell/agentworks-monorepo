/**
 * Landing Page Generator Template
 *
 * Visual Layout:
 *               [User Request]
 *                     │
 *               [Design Agent]
 *                     │
 *        ┌──────────┬┴┬──────────┐
 *        │          │           │
 *    [Hero]    [Features]    [CTA]
 *        │          │           │
 *        └──────────┴┬┴─────────┘
 *                    │
 *            [Responsive CSS]
 *                    │
 *              [Preview]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const LANDING_PAGE: WorkflowTemplateDefinition = {
  id: 'landing-page',
  name: 'Landing Page Generator',
  description: 'Beautiful landing page with hero, features, and call-to-action sections',
  category: 'web',
  complexity: 'simple',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-request',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'User Request',
        nodeType: 'trigger',
        description: 'Describe landing page requirements',
        config: { event: 'landing-request' },
      },
    },
    {
      id: 'agent-design',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'Design Agent',
        nodeType: 'agent',
        description: 'Generate design system and layout',
        config: { agentName: 'design_ux' },
      },
    },
    {
      id: 'ui-hero',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'Hero Section',
        nodeType: 'ui',
        description: 'Headline, subtext, primary CTA button',
        config: { component: 'HeroSection' },
      },
    },
    {
      id: 'ui-features',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Features Grid',
        nodeType: 'ui',
        description: '3-6 feature cards with icons',
        config: { component: 'FeaturesGrid' },
      },
    },
    {
      id: 'ui-cta',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: {
        label: 'CTA Section',
        nodeType: 'ui',
        description: 'Final call-to-action with form',
        config: { component: 'CTASection' },
      },
    },
    {
      id: 'action-css',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Responsive CSS',
        nodeType: 'action',
        description: 'Tailwind responsive styling',
        config: { command: 'style-responsive' },
      },
    },
    {
      id: 'ui-preview',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Preview',
        nodeType: 'ui',
        description: 'Live preview in UI Builder',
        config: { component: 'Preview' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-request', target: 'agent-design', animated: true },
    { id: 'e2', source: 'agent-design', target: 'ui-hero', animated: true },
    { id: 'e3', source: 'agent-design', target: 'ui-features', animated: true },
    { id: 'e4', source: 'agent-design', target: 'ui-cta', animated: true },
    { id: 'e5', source: 'ui-hero', target: 'action-css', animated: true },
    { id: 'e6', source: 'ui-features', target: 'action-css', animated: true },
    { id: 'e7', source: 'ui-cta', target: 'action-css', animated: true },
    { id: 'e8', source: 'action-css', target: 'ui-preview', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'single-app',
    stackProfile: getDefaultStackProfile('react'),
    fileSpecs: [
      { path: 'src/components/HeroSection.tsx', template: 'react-component', variables: { componentName: 'HeroSection' } },
      { path: 'src/components/FeaturesGrid.tsx', template: 'react-component', variables: { componentName: 'FeaturesGrid' } },
      { path: 'src/components/CTASection.tsx', template: 'react-component', variables: { componentName: 'CTASection' } },
    ],
    dependencies: [
      { name: 'react', version: '^18.0.0', workspace: 'root' },
      { name: 'tailwindcss', version: '^3.0.0', dev: true, workspace: 'root' },
    ],
  },

  variables: [
    {
      name: 'colorScheme',
      label: 'Color Scheme',
      type: 'select',
      default: 'blue',
      options: [
        { label: 'Blue', value: 'blue' },
        { label: 'Purple', value: 'purple' },
        { label: 'Green', value: 'green' },
        { label: 'Custom', value: 'custom' },
      ],
      description: 'Primary color scheme',
    },
    {
      name: 'featureCount',
      label: 'Feature Count',
      type: 'number',
      default: 3,
      description: 'Number of feature cards',
    },
  ],

  tags: ['landing', 'marketing', 'responsive'],
  requiredAgents: ['design_ux', 'dev_frontend'],
};
