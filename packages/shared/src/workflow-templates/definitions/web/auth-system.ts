/**
 * Authentication System Template
 *
 * Visual Layout:
 *                     [Auth Init]
 *                            │
 *                     [User Schema]
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Login API]  [Register]  [OAuth API]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *               ┌────────────┼────────────┐
 *               │            │            │
 *         [Login UI]   [Register UI]  [OAuth UI]
 *               │            │            │
 *               └────────────┼────────────┘
 *                            │
 *                     [Session Mgmt]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const AUTH_SYSTEM: WorkflowTemplateDefinition = {
  id: 'auth-system',
  name: 'Authentication System',
  description: 'Complete auth system with login, register, OAuth, and session management',
  category: 'web',
  complexity: 'medium',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 250, y: 0 },
      data: {
        label: 'Auth Init',
        nodeType: 'trigger',
        description: 'Initialize authentication module',
        config: { event: 'auth-init' },
      },
    },
    {
      id: 'db-user',
      type: 'workflow',
      position: { x: 250, y: 100 },
      data: {
        label: 'User Schema',
        nodeType: 'database',
        description: 'User, Session, and Account models',
        config: { tableName: 'User' },
      },
    },
    {
      id: 'api-login',
      type: 'workflow',
      position: { x: 100, y: 200 },
      data: {
        label: 'Login API',
        nodeType: 'api',
        description: 'Email/password login endpoint',
        config: { endpoint: 'auth/login' },
      },
    },
    {
      id: 'api-register',
      type: 'workflow',
      position: { x: 250, y: 200 },
      data: {
        label: 'Register API',
        nodeType: 'api',
        description: 'User registration endpoint',
        config: { endpoint: 'auth/register' },
      },
    },
    {
      id: 'api-oauth',
      type: 'workflow',
      position: { x: 400, y: 200 },
      data: {
        label: 'OAuth API',
        nodeType: 'api',
        description: 'Google/GitHub OAuth endpoints',
        config: { endpoint: 'auth/oauth' },
      },
    },
    {
      id: 'ui-login',
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: {
        label: 'Login Page',
        nodeType: 'ui',
        description: 'Login form with validation',
        config: { component: 'LoginPage' },
      },
    },
    {
      id: 'ui-register',
      type: 'workflow',
      position: { x: 250, y: 300 },
      data: {
        label: 'Register Page',
        nodeType: 'ui',
        description: 'Registration form with validation',
        config: { component: 'RegisterPage' },
      },
    },
    {
      id: 'ui-oauth',
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: {
        label: 'OAuth Buttons',
        nodeType: 'ui',
        description: 'Social login buttons',
        config: { component: 'OAuthButtons' },
      },
    },
    {
      id: 'action-session',
      type: 'workflow',
      position: { x: 250, y: 400 },
      data: {
        label: 'Session Management',
        nodeType: 'action',
        description: 'JWT tokens and refresh logic',
        config: { command: 'setup-sessions' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'db-user', animated: true },
    { id: 'e2', source: 'db-user', target: 'api-login', animated: true },
    { id: 'e3', source: 'db-user', target: 'api-register', animated: true },
    { id: 'e4', source: 'db-user', target: 'api-oauth', animated: true },
    { id: 'e5', source: 'api-login', target: 'ui-login', animated: true },
    { id: 'e6', source: 'api-register', target: 'ui-register', animated: true },
    { id: 'e7', source: 'api-oauth', target: 'ui-oauth', animated: true },
    { id: 'e8', source: 'ui-login', target: 'action-session', animated: true },
    { id: 'e9', source: 'ui-register', target: 'action-session', animated: true },
    { id: 'e10', source: 'ui-oauth', target: 'action-session', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('react'),
    fileSpecs: [
      { path: 'apps/api/src/routes/auth/login.ts', template: 'api-route', variables: { routeName: 'Login', endpoint: 'auth/login' } },
      { path: 'apps/api/src/routes/auth/register.ts', template: 'api-route', variables: { routeName: 'Register', endpoint: 'auth/register' } },
      { path: 'apps/web/src/pages/auth/login.tsx', template: 'react-component', variables: { componentName: 'LoginPage' } },
    ],
    dependencies: [
      { name: 'bcryptjs', version: '^2.4.3', workspace: 'apps/api' },
      { name: 'jsonwebtoken', version: '^9.0.0', workspace: 'apps/api' },
      { name: '@auth/core', version: '^0.28.0', workspace: 'apps/api' },
    ],
  },

  variables: [
    {
      name: 'oauthProviders',
      label: 'OAuth Providers',
      type: 'select',
      default: 'google',
      options: [
        { label: 'Google Only', value: 'google' },
        { label: 'GitHub Only', value: 'github' },
        { label: 'Both', value: 'both' },
        { label: 'None', value: 'none' },
      ],
      description: 'Social login providers',
    },
    {
      name: 'sessionStrategy',
      label: 'Session Strategy',
      type: 'select',
      default: 'jwt',
      options: [
        { label: 'JWT', value: 'jwt' },
        { label: 'Database Sessions', value: 'database' },
      ],
      description: 'How to manage user sessions',
    },
  ],

  tags: ['auth', 'login', 'oauth', 'security'],
  requiredAgents: ['dev_backend', 'dev_frontend'],
};
