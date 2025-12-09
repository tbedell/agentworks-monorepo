# AgentWorks - Terraform Variables

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
  description = "Environment name (dev, staging, prod)"
  type        = string
  
  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Geographic configuration
variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}

variable "multi_region" {
  description = "Multi-region location for global resources"
  type        = string
  default     = "US"
}

# Networking configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for private subnet"
  type        = string
  default     = "10.0.2.0/24"
}

# Database configuration
variable "database_tier" {
  description = "Database instance tier"
  type        = string
  default     = "db-custom-2-8192"  # 2 vCPUs, 8GB RAM for dev
}

variable "database_disk_size" {
  description = "Database disk size in GB"
  type        = number
  default     = 100
}

variable "database_backup_retention_days" {
  description = "Database backup retention period in days"
  type        = number
  default     = 7
}

variable "enable_alloy_db" {
  description = "Enable AlloyDB for production environments"
  type        = bool
  default     = false
}

# Cloud Run configuration
variable "cloud_run_cpu" {
  description = "CPU allocation for Cloud Run services"
  type        = string
  default     = "1"
}

variable "cloud_run_memory" {
  description = "Memory allocation for Cloud Run services"
  type        = string
  default     = "1Gi"
}

variable "cloud_run_min_instances" {
  description = "Minimum instances for Cloud Run services"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum instances for Cloud Run services"
  type        = number
  default     = 10
}

variable "cloud_run_concurrency" {
  description = "Request concurrency per Cloud Run instance"
  type        = number
  default     = 100
}

# Security configuration
variable "allowed_ip_ranges" {
  description = "IP ranges allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Open by default, restrict in production
}

variable "enable_armor" {
  description = "Enable Google Cloud Armor for DDoS protection"
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

# External API keys (stored in Secret Manager)
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
  description = "Stripe secret key for billing"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key for billing"
  type        = string
  sensitive   = true
  default     = ""
}

# Feature flags
variable "enable_redis_cache" {
  description = "Enable Redis cache for session storage"
  type        = bool
  default     = false
}

variable "enable_cdn" {
  description = "Enable Cloud CDN for static assets"
  type        = bool
  default     = false
}

variable "enable_firestore" {
  description = "Enable Firestore for document storage"
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Enable comprehensive monitoring and alerting"
  type        = bool
  default     = true
}

# Resource limits
variable "max_replicas" {
  description = "Maximum number of replicas per service"
  type        = number
  default     = 10
}

variable "request_timeout" {
  description = "Request timeout in seconds"
  type        = number
  default     = 300
}

# Environment-specific overrides
variable "environment_config" {
  description = "Environment-specific configuration overrides"
  type = map(object({
    database_tier              = string
    cloud_run_min_instances   = number
    cloud_run_max_instances   = number
    enable_alloy_db           = bool
    enable_armor              = bool
    enable_redis_cache        = bool
    backup_retention_days     = number
  }))
  
  default = {
    dev = {
      database_tier              = "db-custom-1-3840"  # 1 vCPU, 3.75GB RAM
      cloud_run_min_instances   = 0
      cloud_run_max_instances   = 3
      enable_alloy_db           = false
      enable_armor              = false
      enable_redis_cache        = false
      backup_retention_days     = 3
    }
    staging = {
      database_tier              = "db-custom-2-8192"  # 2 vCPUs, 8GB RAM
      cloud_run_min_instances   = 1
      cloud_run_max_instances   = 5
      enable_alloy_db           = false
      enable_armor              = false
      enable_redis_cache        = true
      backup_retention_days     = 7
    }
    prod = {
      database_tier              = "db-custom-4-16384"  # 4 vCPUs, 16GB RAM
      cloud_run_min_instances   = 2
      cloud_run_max_instances   = 20
      enable_alloy_db           = true
      enable_armor              = true
      enable_redis_cache        = true
      backup_retention_days     = 30
    }
  }
}