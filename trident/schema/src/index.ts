/**
 * Trident Schema - AgentWorks Blueprint Types
 *
 * These types define the .AWB (AgentWorks Blueprint) file format
 * that bridges Studio (Builder) and Trident (Runner).
 */

// Industry categories for Trident workflows
export type IndustryCategory =
  | 'finance'
  | 'sales'
  | 'hr'
  | 'healthcare'
  | 'construction'
  | 'legal'
  | 'real_estate'
  | 'marketing'
  | 'ecommerce'
  | 'education';

// Trident-specific node types for business workflows
export type TridentNodeType =
  | 'email_send'
  | 'email_reply'
  | 'invoice_create'
  | 'invoice_send'
  | 'payment_collect'
  | 'calendar_schedule'
  | 'calendar_reminder'
  | 'approval_request'
  | 'approval_gate'
  | 'document_generate'
  | 'document_sign'
  | 'sms_send'
  | 'call_schedule'
  | 'data_lookup'
  | 'data_update'
  | 'webhook_trigger'
  | 'webhook_send'
  | 'conditional_branch'
  | 'loop_iterate'
  | 'delay_wait';

// Configurable variable that business users can modify
export interface ConfigVariable {
  id: string;
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'date' | 'select';
  defaultValue: unknown;
  required: boolean;
  options?: string[]; // For 'select' type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Trident KPI metrics
export interface TridentMetrics {
  velocity: string;      // e.g., "3x faster invoicing"
  leverage: string;      // e.g., "1 person = 10 FTE"
  precision: string;     // e.g., "99.2% accuracy"
}

// Integration requirements
export interface IntegrationRequirement {
  id: string;
  name: string;
  type: 'stripe' | 'quickbooks' | 'google' | 'microsoft' | 'twilio' | 'sendgrid' | 'custom';
  required: boolean;
  scopes?: string[];
}

// Workflow node definition (simplified for blueprints)
export interface BlueprintNode {
  id: string;
  type: TridentNodeType;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

// Workflow edge definition
export interface BlueprintEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

// The main AgentWorks Blueprint interface (.AWB file format)
export interface AgentBlueprint {
  // Metadata
  id: string;
  version: string;
  name: string;
  description: string;
  industry: IndustryCategory;
  tags: string[];

  // Creator info
  creator: {
    id: string;
    name: string;
    verified: boolean;
  };

  // Workflow definition
  workflow: {
    nodes: BlueprintNode[];
    edges: BlueprintEdge[];
    triggers: string[];
  };

  // What users CAN configure (everything else is locked)
  configurableVariables: ConfigVariable[];

  // Required integrations
  requiredIntegrations: IntegrationRequirement[];

  // Trident metrics for marketing
  trident: TridentMetrics;

  // Pricing
  pricing: {
    model: 'free' | 'one_time' | 'subscription';
    price?: number;
    currency?: string;
    interval?: 'month' | 'year';
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Installation record when a business installs a blueprint
export interface BlueprintInstallation {
  id: string;
  blueprintId: string;
  workspaceId: string;
  configuredVariables: Record<string, unknown>;
  connectedIntegrations: string[];
  status: 'pending_setup' | 'active' | 'paused' | 'error';
  installedAt: string;
  lastRunAt?: string;
}

// Review/rating for marketplace
export interface BlueprintReview {
  id: string;
  blueprintId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  verified: boolean;
  createdAt: string;
}

// Build target types for Studio
export type BuildTarget = 'trident_workflow' | 'saas_app' | 'client_delivery';

// Project configuration based on build target
export interface ProjectBuildConfig {
  target: BuildTarget;

  // For trident_workflow
  trident?: {
    industry: IndustryCategory;
    publishToStore: boolean;
  };

  // For saas_app
  saas?: {
    githubRepo?: string;
    deploymentTarget: 'vercel' | 'netlify' | 'aws' | 'manual';
  };

  // For client_delivery
  client?: {
    clientId: string;
    deliveryType: 'blueprint' | 'source_code' | 'both';
  };
}
