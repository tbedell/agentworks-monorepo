# Development Environment Variables
# These variables can be overridden via terraform.tfvars

# Project configuration
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "agentworks"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

# Geographic configuration
variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "multi_region" {
  description = "Multi-region location"
  type        = string
  default     = "US"
}

# Networking
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "Public subnet CIDR"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "Private subnet CIDR"
  type        = string
  default     = "10.0.2.0/24"
}

# Database configuration
variable "database_tier" {
  description = "Database instance tier"
  type        = string
  default     = "db-custom-1-3840"
}

variable "database_disk_size" {
  description = "Database disk size in GB"
  type        = number
  default     = 50
}

variable "database_backup_retention_days" {
  description = "Database backup retention in days"
  type        = number
  default     = 3
}

variable "enable_alloy_db" {
  description = "Enable AlloyDB"
  type        = bool
  default     = false
}

# Cloud Run configuration
variable "cloud_run_cpu" {
  description = "Cloud Run CPU allocation"
  type        = string
  default     = "1"
}

variable "cloud_run_memory" {
  description = "Cloud Run memory allocation"
  type        = string
  default     = "1Gi"
}

variable "cloud_run_min_instances" {
  description = "Minimum Cloud Run instances"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
  default     = 3
}

variable "cloud_run_concurrency" {
  description = "Cloud Run concurrency"
  type        = number
  default     = 80
}

# Security
variable "allowed_ip_ranges" {
  description = "Allowed IP ranges"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_armor" {
  description = "Enable Google Cloud Armor"
  type        = bool
  default     = false
}

# Repository configuration
variable "github_repo_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "agentworks"
}

variable "github_repo_name" {
  description = "GitHub repository name"
  type        = string
  default     = "agentworks"
}

# API keys
variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_ai_api_key" {
  description = "Google AI API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "nanobanana_api_key" {
  description = "Nano Banana API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key"
  type        = string
  sensitive   = true
  default     = ""
}

# Feature flags
variable "enable_redis_cache" {
  description = "Enable Redis cache"
  type        = bool
  default     = false
}

variable "enable_cdn" {
  description = "Enable CDN"
  type        = bool
  default     = false
}

variable "enable_firestore" {
  description = "Enable Firestore"
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Enable monitoring"
  type        = bool
  default     = true
}

# Resource limits
variable "max_replicas" {
  description = "Maximum replicas"
  type        = number
  default     = 3
}

variable "request_timeout" {
  description = "Request timeout in seconds"
  type        = number
  default     = 300
}