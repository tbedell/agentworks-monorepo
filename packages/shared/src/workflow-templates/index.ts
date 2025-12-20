/**
 * Workflow Templates Library
 *
 * Exports all 28 workflow templates organized by category:
 * - SaaS (6): Multi-Tenant, Subscription Billing, User Onboarding, Admin Dashboard, API Backend, Analytics
 * - Web (5): Landing Page, CRUD App, Auth System, E-Commerce, Portfolio/Blog
 * - Mobile (4): Cross-Platform, App Store Submission, Push Notifications, Offline Sync
 * - WordPress (4): Theme, Plugin, WooCommerce, Content Pipeline
 * - MCP (3): Server Scaffold, Tool Integration, Resource Provider
 * - DevOps (3): CI/CD Pipeline, Docker Setup, Cloud Deploy
 * - AI (3): Chatbot, Agent Orchestration, RAG System
 */

// Schema exports
export * from './schema.js';
export * from './code-generation.js';

// SaaS templates
export { MULTI_TENANT_SAAS } from './definitions/saas/multi-tenant-saas.js';
export { SUBSCRIPTION_BILLING } from './definitions/saas/subscription-billing.js';
export { USER_ONBOARDING } from './definitions/saas/user-onboarding.js';
export { ADMIN_DASHBOARD } from './definitions/saas/admin-dashboard.js';
export { API_BACKEND } from './definitions/saas/api-backend.js';
export { ANALYTICS } from './definitions/saas/analytics.js';

// Web templates
export { LANDING_PAGE } from './definitions/web/landing-page.js';
export { CRUD_APP } from './definitions/web/crud-app.js';
export { AUTH_SYSTEM } from './definitions/web/auth-system.js';
export { ECOMMERCE } from './definitions/web/ecommerce.js';
export { PORTFOLIO_BLOG } from './definitions/web/portfolio-blog.js';

// Mobile templates
export { CROSS_PLATFORM } from './definitions/mobile/cross-platform.js';
export { APP_STORE_SUBMISSION } from './definitions/mobile/app-store-submission.js';
export { PUSH_NOTIFICATIONS } from './definitions/mobile/push-notifications.js';
export { OFFLINE_SYNC } from './definitions/mobile/offline-sync.js';

// WordPress templates
export { WP_THEME } from './definitions/wordpress/theme-generator.js';
export { WP_PLUGIN } from './definitions/wordpress/plugin-builder.js';
export { WOOCOMMERCE } from './definitions/wordpress/woocommerce.js';
export { WP_CONTENT_PIPELINE } from './definitions/wordpress/content-pipeline.js';

// MCP templates
export { MCP_SCAFFOLD } from './definitions/mcp/mcp-scaffold.js';
export { MCP_TOOL_INTEGRATION } from './definitions/mcp/tool-integration.js';
export { MCP_RESOURCE_PROVIDER } from './definitions/mcp/resource-provider.js';

// DevOps templates
export { CICD_PIPELINE } from './definitions/devops/cicd-pipeline.js';
export { DOCKER_SETUP } from './definitions/devops/docker.js';
export { CLOUD_DEPLOY } from './definitions/devops/cloud-deploy.js';

// AI templates
export { AI_CHATBOT } from './definitions/ai/chatbot.js';
export { AGENT_ORCHESTRATION } from './definitions/ai/agent-orchestration.js';
export { RAG_SYSTEM } from './definitions/ai/rag-system.js';

// Import all for collections
import { MULTI_TENANT_SAAS } from './definitions/saas/multi-tenant-saas.js';
import { SUBSCRIPTION_BILLING } from './definitions/saas/subscription-billing.js';
import { USER_ONBOARDING } from './definitions/saas/user-onboarding.js';
import { ADMIN_DASHBOARD } from './definitions/saas/admin-dashboard.js';
import { API_BACKEND } from './definitions/saas/api-backend.js';
import { ANALYTICS } from './definitions/saas/analytics.js';
import { LANDING_PAGE } from './definitions/web/landing-page.js';
import { CRUD_APP } from './definitions/web/crud-app.js';
import { AUTH_SYSTEM } from './definitions/web/auth-system.js';
import { ECOMMERCE } from './definitions/web/ecommerce.js';
import { PORTFOLIO_BLOG } from './definitions/web/portfolio-blog.js';
import { CROSS_PLATFORM } from './definitions/mobile/cross-platform.js';
import { APP_STORE_SUBMISSION } from './definitions/mobile/app-store-submission.js';
import { PUSH_NOTIFICATIONS } from './definitions/mobile/push-notifications.js';
import { OFFLINE_SYNC } from './definitions/mobile/offline-sync.js';
import { WP_THEME } from './definitions/wordpress/theme-generator.js';
import { WP_PLUGIN } from './definitions/wordpress/plugin-builder.js';
import { WOOCOMMERCE } from './definitions/wordpress/woocommerce.js';
import { WP_CONTENT_PIPELINE } from './definitions/wordpress/content-pipeline.js';
import { MCP_SCAFFOLD } from './definitions/mcp/mcp-scaffold.js';
import { MCP_TOOL_INTEGRATION } from './definitions/mcp/tool-integration.js';
import { MCP_RESOURCE_PROVIDER } from './definitions/mcp/resource-provider.js';
import { CICD_PIPELINE } from './definitions/devops/cicd-pipeline.js';
import { DOCKER_SETUP } from './definitions/devops/docker.js';
import { CLOUD_DEPLOY } from './definitions/devops/cloud-deploy.js';
import { AI_CHATBOT } from './definitions/ai/chatbot.js';
import { AGENT_ORCHESTRATION } from './definitions/ai/agent-orchestration.js';
import { RAG_SYSTEM } from './definitions/ai/rag-system.js';

import type { WorkflowTemplateDefinition, WorkflowTemplateMetadata, TemplateCategory } from './schema.js';
import { toTemplateMetadata } from './schema.js';

/**
 * All workflow templates as a flat array
 */
export const ALL_TEMPLATES: WorkflowTemplateDefinition[] = [
  // SaaS
  MULTI_TENANT_SAAS,
  SUBSCRIPTION_BILLING,
  USER_ONBOARDING,
  ADMIN_DASHBOARD,
  API_BACKEND,
  ANALYTICS,
  // Web
  LANDING_PAGE,
  CRUD_APP,
  AUTH_SYSTEM,
  ECOMMERCE,
  PORTFOLIO_BLOG,
  // Mobile
  CROSS_PLATFORM,
  APP_STORE_SUBMISSION,
  PUSH_NOTIFICATIONS,
  OFFLINE_SYNC,
  // WordPress
  WP_THEME,
  WP_PLUGIN,
  WOOCOMMERCE,
  WP_CONTENT_PIPELINE,
  // MCP
  MCP_SCAFFOLD,
  MCP_TOOL_INTEGRATION,
  MCP_RESOURCE_PROVIDER,
  // DevOps
  CICD_PIPELINE,
  DOCKER_SETUP,
  CLOUD_DEPLOY,
  // AI
  AI_CHATBOT,
  AGENT_ORCHESTRATION,
  RAG_SYSTEM,
];

/**
 * Templates organized by category
 */
export const TEMPLATES_BY_CATEGORY: Record<TemplateCategory, WorkflowTemplateDefinition[]> = {
  saas: [MULTI_TENANT_SAAS, SUBSCRIPTION_BILLING, USER_ONBOARDING, ADMIN_DASHBOARD, API_BACKEND, ANALYTICS],
  web: [LANDING_PAGE, CRUD_APP, AUTH_SYSTEM, ECOMMERCE, PORTFOLIO_BLOG],
  mobile: [CROSS_PLATFORM, APP_STORE_SUBMISSION, PUSH_NOTIFICATIONS, OFFLINE_SYNC],
  wordpress: [WP_THEME, WP_PLUGIN, WOOCOMMERCE, WP_CONTENT_PIPELINE],
  mcp: [MCP_SCAFFOLD, MCP_TOOL_INTEGRATION, MCP_RESOURCE_PROVIDER],
  devops: [CICD_PIPELINE, DOCKER_SETUP, CLOUD_DEPLOY],
  ai: [AI_CHATBOT, AGENT_ORCHESTRATION, RAG_SYSTEM],
};

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplateDefinition | undefined {
  return ALL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): WorkflowTemplateDefinition[] {
  return TEMPLATES_BY_CATEGORY[category] || [];
}

/**
 * Get all template metadata (lightweight)
 */
export function getAllTemplateMetadata(): WorkflowTemplateMetadata[] {
  return ALL_TEMPLATES.map(toTemplateMetadata);
}

/**
 * Get template metadata by category (lightweight)
 */
export function getTemplateMetadataByCategory(category: TemplateCategory): WorkflowTemplateMetadata[] {
  return getTemplatesByCategory(category).map(toTemplateMetadata);
}

/**
 * Search templates by name, description, or tags
 */
export function searchTemplates(query: string): WorkflowTemplateDefinition[] {
  const lowerQuery = query.toLowerCase();
  return ALL_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Category display names and icons
 */
export const CATEGORY_INFO: Record<TemplateCategory, { name: string; icon: string; description: string }> = {
  saas: {
    name: 'SaaS',
    icon: 'Building2',
    description: 'Software-as-a-Service application templates',
  },
  web: {
    name: 'Web',
    icon: 'Globe',
    description: 'Web application and website templates',
  },
  mobile: {
    name: 'Mobile',
    icon: 'Smartphone',
    description: 'Cross-platform mobile app templates',
  },
  wordpress: {
    name: 'WordPress',
    icon: 'FileCode',
    description: 'WordPress themes, plugins, and customizations',
  },
  mcp: {
    name: 'MCP',
    icon: 'Cpu',
    description: 'Model Context Protocol server and tool templates',
  },
  devops: {
    name: 'DevOps',
    icon: 'Container',
    description: 'CI/CD, Docker, and cloud deployment templates',
  },
  ai: {
    name: 'AI',
    icon: 'Brain',
    description: 'AI-powered applications and agent systems',
  },
};
