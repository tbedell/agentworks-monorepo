/**
 * E-Commerce Store Template
 *
 * Visual Layout:
 *                     [Store Init]
 *                            │
 *                     [Architect Agent]
 *                            │
 *                     [Product Schema]
 *                            │
 *        ┌────────────┬──────┼──────┬────────────┐
 *        │            │      │      │            │
 *   [Products]    [Cart]  [Orders] [Payments] [Users]
 *        │            │      │      │            │
 *        └────────────┴──────┼──────┴────────────┘
 *                            │
 *        ┌────────────┬──────┼──────┬────────────┐
 *        │            │      │      │            │
 *   [Catalog UI] [Cart UI] [Checkout] [Orders UI] [Profile]
 *        │            │      │      │            │
 *        └────────────┴──────┼──────┴────────────┘
 *                            │
 *                     [Stripe Integration]
 *                            │
 *                     [Email Notifications]
 */

import type { WorkflowTemplateDefinition } from '../../schema.js';
import { getDefaultStackProfile } from '../../code-generation.js';

export const ECOMMERCE: WorkflowTemplateDefinition = {
  id: 'ecommerce',
  name: 'E-Commerce Store',
  description: 'Full e-commerce store with products, cart, checkout, and order management',
  category: 'web',
  complexity: 'complex',
  platform: 'react',

  nodes: [
    {
      id: 'trigger-init',
      type: 'workflow',
      position: { x: 300, y: 0 },
      data: {
        label: 'Store Init',
        nodeType: 'trigger',
        description: 'Initialize e-commerce store',
        config: { event: 'store-init' },
      },
    },
    {
      id: 'agent-architect',
      type: 'workflow',
      position: { x: 300, y: 100 },
      data: {
        label: 'Architect Agent',
        nodeType: 'agent',
        description: 'Design store architecture and data models',
        config: { agentName: 'architect' },
      },
    },
    {
      id: 'db-products',
      type: 'workflow',
      position: { x: 300, y: 200 },
      data: {
        label: 'Product Schema',
        nodeType: 'database',
        description: 'Products, categories, variants, inventory',
        config: { tableName: 'Product' },
      },
    },
    {
      id: 'api-products',
      type: 'workflow',
      position: { x: 75, y: 300 },
      data: {
        label: 'Products API',
        nodeType: 'api',
        description: 'Product listing, search, filters',
        config: { endpoint: 'products' },
      },
    },
    {
      id: 'api-cart',
      type: 'workflow',
      position: { x: 187, y: 300 },
      data: {
        label: 'Cart API',
        nodeType: 'api',
        description: 'Cart management and persistence',
        config: { endpoint: 'cart' },
      },
    },
    {
      id: 'api-orders',
      type: 'workflow',
      position: { x: 300, y: 300 },
      data: {
        label: 'Orders API',
        nodeType: 'api',
        description: 'Order creation and history',
        config: { endpoint: 'orders' },
      },
    },
    {
      id: 'api-payments',
      type: 'workflow',
      position: { x: 412, y: 300 },
      data: {
        label: 'Payments API',
        nodeType: 'api',
        description: 'Payment processing with Stripe',
        config: { endpoint: 'payments' },
      },
    },
    {
      id: 'api-users',
      type: 'workflow',
      position: { x: 525, y: 300 },
      data: {
        label: 'Users API',
        nodeType: 'api',
        description: 'Customer accounts and addresses',
        config: { endpoint: 'users' },
      },
    },
    {
      id: 'ui-catalog',
      type: 'workflow',
      position: { x: 75, y: 400 },
      data: {
        label: 'Product Catalog',
        nodeType: 'ui',
        description: 'Product listing and detail pages',
        config: { component: 'ProductCatalog' },
      },
    },
    {
      id: 'ui-cart',
      type: 'workflow',
      position: { x: 187, y: 400 },
      data: {
        label: 'Shopping Cart',
        nodeType: 'ui',
        description: 'Cart sidebar and page',
        config: { component: 'ShoppingCart' },
      },
    },
    {
      id: 'ui-checkout',
      type: 'workflow',
      position: { x: 300, y: 400 },
      data: {
        label: 'Checkout Flow',
        nodeType: 'ui',
        description: 'Multi-step checkout process',
        config: { component: 'CheckoutFlow' },
      },
    },
    {
      id: 'ui-orders',
      type: 'workflow',
      position: { x: 412, y: 400 },
      data: {
        label: 'Order History',
        nodeType: 'ui',
        description: 'Order list and details',
        config: { component: 'OrderHistory' },
      },
    },
    {
      id: 'ui-profile',
      type: 'workflow',
      position: { x: 525, y: 400 },
      data: {
        label: 'User Profile',
        nodeType: 'ui',
        description: 'Account settings and addresses',
        config: { component: 'UserProfile' },
      },
    },
    {
      id: 'action-stripe',
      type: 'workflow',
      position: { x: 300, y: 500 },
      data: {
        label: 'Stripe Integration',
        nodeType: 'action',
        description: 'Payment processing setup',
        config: { command: 'setup-stripe' },
      },
    },
    {
      id: 'notify-email',
      type: 'workflow',
      position: { x: 300, y: 600 },
      data: {
        label: 'Email Notifications',
        nodeType: 'notification',
        description: 'Order confirmation and shipping emails',
        config: { channel: 'email' },
      },
    },
  ],

  edges: [
    { id: 'e1', source: 'trigger-init', target: 'agent-architect', animated: true },
    { id: 'e2', source: 'agent-architect', target: 'db-products', animated: true },
    { id: 'e3', source: 'db-products', target: 'api-products', animated: true },
    { id: 'e4', source: 'db-products', target: 'api-cart', animated: true },
    { id: 'e5', source: 'db-products', target: 'api-orders', animated: true },
    { id: 'e6', source: 'db-products', target: 'api-payments', animated: true },
    { id: 'e7', source: 'db-products', target: 'api-users', animated: true },
    { id: 'e8', source: 'api-products', target: 'ui-catalog', animated: true },
    { id: 'e9', source: 'api-cart', target: 'ui-cart', animated: true },
    { id: 'e10', source: 'api-orders', target: 'ui-checkout', animated: true },
    { id: 'e11', source: 'api-payments', target: 'ui-orders', animated: true },
    { id: 'e12', source: 'api-users', target: 'ui-profile', animated: true },
    { id: 'e13', source: 'ui-catalog', target: 'action-stripe', animated: true },
    { id: 'e14', source: 'ui-cart', target: 'action-stripe', animated: true },
    { id: 'e15', source: 'ui-checkout', target: 'action-stripe', animated: true },
    { id: 'e16', source: 'ui-orders', target: 'action-stripe', animated: true },
    { id: 'e17', source: 'ui-profile', target: 'action-stripe', animated: true },
    { id: 'e18', source: 'action-stripe', target: 'notify-email', animated: true },
  ],

  codeSpecs: {
    scaffoldType: 'monorepo',
    stackProfile: getDefaultStackProfile('react'),
    fileSpecs: [
      { path: 'apps/web/src/pages/products/index.tsx', template: 'react-component', variables: { componentName: 'ProductCatalog' } },
      { path: 'apps/web/src/pages/cart.tsx', template: 'react-component', variables: { componentName: 'ShoppingCart' } },
      { path: 'apps/web/src/pages/checkout.tsx', template: 'react-component', variables: { componentName: 'CheckoutFlow' } },
      { path: 'apps/api/src/routes/products.ts', template: 'api-route', variables: { routeName: 'Products', endpoint: 'products' } },
      { path: 'apps/api/src/routes/orders.ts', template: 'api-route', variables: { routeName: 'Orders', endpoint: 'orders' } },
    ],
    dependencies: [
      { name: 'stripe', version: '^14.0.0', workspace: 'apps/api' },
      { name: '@stripe/stripe-js', version: '^2.0.0', workspace: 'apps/web' },
      { name: 'zustand', version: '^4.0.0', workspace: 'apps/web' },
    ],
  },

  variables: [
    {
      name: 'currency',
      label: 'Currency',
      type: 'select',
      default: 'usd',
      options: [
        { label: 'USD', value: 'usd' },
        { label: 'EUR', value: 'eur' },
        { label: 'GBP', value: 'gbp' },
      ],
      description: 'Store currency',
    },
    {
      name: 'inventoryTracking',
      label: 'Inventory Tracking',
      type: 'boolean',
      default: true,
      description: 'Track product inventory',
    },
    {
      name: 'guestCheckout',
      label: 'Guest Checkout',
      type: 'boolean',
      default: true,
      description: 'Allow checkout without account',
    },
  ],

  tags: ['ecommerce', 'store', 'payments', 'stripe', 'cart'],
  requiredAgents: ['architect', 'dev_backend', 'dev_frontend'],
};
