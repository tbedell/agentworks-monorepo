# Cloud Run Module Variables

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "common_labels" {
  description = "Common labels for all resources"
  type        = map(string)
  default     = {}
}

# Network configuration
variable "vpc_connector_id" {
  description = "VPC connector ID for Cloud Run services"
  type        = string
}

# Service account
variable "service_account_email" {
  description = "Service account email for Cloud Run services"
  type        = string
}

# Database configuration
variable "database_connection_name" {
  description = "Database connection name"
  type        = string
}

variable "database_url_secret" {
  description = "Secret Manager secret ID for database URL"
  type        = string
}

# Authentication secrets
variable "jwt_secret" {
  description = "Secret Manager secret ID for JWT signing key"
  type        = string
}

variable "session_secret" {
  description = "Secret Manager secret ID for session encryption key"
  type        = string
}

# LLM Provider API Keys (Secret Manager secret IDs)
variable "openai_api_key_secret" {
  description = "Secret Manager secret ID for OpenAI API key"
  type        = string
}

variable "anthropic_api_key_secret" {
  description = "Secret Manager secret ID for Anthropic API key"
  type        = string
}

variable "google_ai_api_key_secret" {
  description = "Secret Manager secret ID for Google AI API key"
  type        = string
}

variable "nanobanana_api_key_secret" {
  description = "Secret Manager secret ID for Nano Banana API key"
  type        = string
}

# Billing secrets
variable "stripe_secret_key_secret" {
  description = "Secret Manager secret ID for Stripe secret key"
  type        = string
}

variable "stripe_publishable_key_secret" {
  description = "Secret Manager secret ID for Stripe publishable key"
  type        = string
}

# Pub/Sub topics and subscriptions
variable "card_events_topic" {
  description = "Card events Pub/Sub topic name"
  type        = string
  default     = ""
}

variable "card_events_subscription" {
  description = "Card events Pub/Sub subscription name"
  type        = string
  default     = ""
}

variable "agent_runs_topic" {
  description = "Agent runs Pub/Sub topic name"
  type        = string
  default     = ""
}

variable "agent_runs_subscription" {
  description = "Agent runs Pub/Sub subscription name"
  type        = string
  default     = ""
}

variable "usage_events_topic" {
  description = "Usage events Pub/Sub topic name"
  type        = string
  default     = ""
}

variable "usage_events_subscription" {
  description = "Usage events Pub/Sub subscription name"
  type        = string
  default     = ""
}

# Storage buckets
variable "logs_bucket" {
  description = "Cloud Storage bucket for logs"
  type        = string
  default     = ""
}

# Container registry
variable "artifact_registry_repo" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "agentworks"
}

# Cloud Run configuration
variable "cpu" {
  description = "CPU allocation for Cloud Run services"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory allocation for Cloud Run services"
  type        = string
  default     = "1Gi"
}

variable "min_instances" {
  description = "Minimum instances for Cloud Run services"
  type        = string
  default     = "0"
}

variable "max_instances" {
  description = "Maximum instances for Cloud Run services"
  type        = string
  default     = "10"
}

variable "concurrency" {
  description = "Request concurrency per Cloud Run instance"
  type        = number
  default     = 100
}

# Feature flags
variable "enable_request_timeout" {
  description = "Enable custom request timeout"
  type        = bool
  default     = true
}

variable "enable_cpu_throttling" {
  description = "Enable CPU throttling for cost optimization"
  type        = bool
  default     = false
}