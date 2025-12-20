/**
 * Cloud Deployment Template
 *
 * Visual Layout:
 *                     [Deploy Init]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [Infrastructure Plan]
 *                            │
 *        ┌────────────┬──────┼──────┬────────────┐
 *        │            │      │      │            │
 *   [Networking]  [Database] [Storage] [Secrets] [IAM]
 *        │            │      │      │            │
 *        └────────────┴──────┼──────┴────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Container]  [Load Balancer]  [CDN]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Monitoring]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const CLOUD_DEPLOY: WorkflowTemplateDefinition = {
  id: 'cloud-deploy',
  name: 'Cloud Deployment',
  description: 'Full cloud infrastructure setup with networking, database, and monitoring',
  category: 'devops',
  complexity: 'complex',
  platform: 'gcp',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 300, y: 0 },
      data: {
        label: 'Deploy Init',
        nodeType: 'trigger',
        description: 'Initialize cloud deployment',
        config: { event: 'deploy-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 300, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design cloud architecture',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'action-plan',
      type: 'workflow',
      position: { x: 300, y: 200 },
      data: {
        label: 'Infrastructure Plan',
        nodeType: 'action',
        description: 'Plan infrastructure resources',
        config: { command: 'plan-infra' },
      },
    },
    {
      id: 'action-network',
      type: 'workflow',
      position: { x: 75, y: 300 },
      data: {
        label: 'Networking',
        nodeType: 'action',
        description: 'VPC, subnets, firewall rules',
        config: { command: 'setup-networking' },
      },
    },
    {
      id: 'action-database',
      type: 'workflow',
      position: { x: 187, y: 300 },
      data: {
        label: 'Database',
        nodeType: 'database',
        description: 'Cloud SQL PostgreSQL',
        config: { tableName: 'cloud_sql' },
      },
    },
    {
      id: 'action-storage',
      type: 'workflow',
      position: { x: 300, y: 300 },
      data: {
        label: 'Storage',
        nodeType: 'action',
        description: 'Cloud Storage buckets',
        config: { command: 'setup-storage' },
      },
    },
    {
      id: 'action-secrets',
      type: 'workflow',
      position: { x: 412, y: 300 },
      data: {
        label: 'Secrets',
        nodeType: 'action',
        description: 'Secret Manager configuration',
        config: { command: 'setup-secrets' },
      },
    },
    {
      id: 'action-iam',
      type: 'workflow',
      position: { x: 525, y: 300 },
      data: {
        label: 'IAM',
        nodeType: 'action',
        description: 'Service accounts and roles',
        config: { command: 'setup-iam' },
      },
    },
    {
      id: 'action-container',
      type: 'workflow',
      position: { x: 150, y: 400 },
      data: {
        label: 'Container Service',
        nodeType: 'action',
        description: 'Cloud Run deployment',
        config: { command: 'deploy-cloudrun' },
      },
    },
    {
      id: 'action-lb',
      type: 'workflow',
      position: { x: 300, y: 400 },
      data: {
        label: 'Load Balancer',
        nodeType: 'action',
        description: 'HTTPS load balancer',
        config: { command: 'setup-lb' },
      },
    },
    {
      id: 'action-cdn',
      type: 'workflow',
      position: { x: 450, y: 400 },
      data: {
        label: 'CDN',
        nodeType: 'action',
        description: 'Cloud CDN configuration',
        config: { command: 'setup-cdn' },
      },
    },
    {
      id: 'action-monitoring',
      type: 'workflow',
      position: { x: 300, y: 500 },
      data: {
        label: 'Monitoring',
        nodeType: 'action',
        description: 'Cloud Monitoring and alerting',
        config: { command: 'setup-monitoring' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'action-plan', animated: true },
    { id: 'e3', source: 'action-plan', target: 'action-network', animated: true },
    { id: 'e4', source: 'action-plan', target: 'action-database', animated: true },
    { id: 'e5', source: 'action-plan', target: 'action-storage', animated: true },
    { id: 'e6', source: 'action-plan', target: 'action-secrets', animated: true },
    { id: 'e7', source: 'action-plan', target: 'action-iam', animated: true },
    { id: 'e8', source: 'action-network', target: 'action-container', animated: true },
    { id: 'e9', source: 'action-database', target: 'action-container', animated: true },
    { id: 'e10', source: 'action-storage', target: 'action-lb', animated: true },
    { id: 'e11', source: 'action-secrets', target: 'action-lb', animated: true },
    { id: 'e12', source: 'action-iam', target: 'action-cdn', animated: true },
    { id: 'e13', source: 'action-container', target: 'action-monitoring', animated: true },
    { id: 'e14', source: 'action-lb', target: 'action-monitoring', animated: true },
    { id: 'e15', source: 'action-cdn', target: 'action-monitoring', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'service',
    stackProfile: getDefaultStackProfile('gcp'),
    fileSpecs: [
      { path: 'infra/main.tf', template: 'docker-service', variables: {} },
      { path: 'infra/variables.tf', template: 'docker-service', variables: {} },
      { path: 'cloudbuild.yaml', template: 'docker-service', variables: {} },
    ],
    dependencies: [],
  },

  variables: [
    {
      name: 'cloudProvider',
      label: 'Cloud Provider',
      type: 'select',
      default: 'gcp',
      options: [
        { label: 'Google Cloud Platform', value: 'gcp' },
        { label: 'Amazon Web Services', value: 'aws' },
        { label: 'Azure', value: 'azure' },
      ],
      description: 'Target cloud platform',
    },
    {
      name: 'region',
      label: 'Region',
      type: 'select',
      default: 'us-central1',
      options: [
        { label: 'US Central', value: 'us-central1' },
        { label: 'US East', value: 'us-east1' },
        { label: 'Europe West', value: 'europe-west1' },
      ],
      description: 'Deployment region',
    },
    {
      name: 'environment',
      label: 'Environment',
      type: 'select',
      default: 'production',
      options: [
        { label: 'Production', value: 'production' },
        { label: 'Staging', value: 'staging' },
        { label: 'Development', value: 'development' },
      ],
      description: 'Target environment',
    },
  ],

  tags: ['cloud', 'deployment', 'infrastructure', 'gcp'],
  requiredAgents: ['architect', 'devops'],
};
