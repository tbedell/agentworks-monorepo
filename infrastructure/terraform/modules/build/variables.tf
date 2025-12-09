# Build Module Variables

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

# Repository configuration
variable "github_repo_owner" {
  description = "GitHub repository owner"
  type        = string
}

variable "github_repo_name" {
  description = "GitHub repository name"
  type        = string
}

variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
  default     = ""
}

# Service accounts
variable "service_account_email" {
  description = "Cloud Run service account email"
  type        = string
}

variable "use_custom_build_sa" {
  description = "Use custom service account for Cloud Build"
  type        = bool
  default     = false
}

variable "build_sa_roles" {
  description = "IAM roles for custom Cloud Build service account"
  type        = list(string)
  default = [
    "roles/cloudbuild.builds.builder",
    "roles/artifactregistry.writer",
    "roles/run.developer",
    "roles/iam.serviceAccountUser",
    "roles/secretmanager.secretAccessor"
  ]
}

# Network configuration
variable "vpc_network_id" {
  description = "VPC network ID for private pool"
  type        = string
  default     = ""
}

# Build configuration
variable "enable_private_pool" {
  description = "Enable private Cloud Build worker pool"
  type        = bool
  default     = false
}

variable "enable_build_cache" {
  description = "Enable build cache bucket"
  type        = bool
  default     = true
}

variable "build_logs_retention_days" {
  description = "Build logs retention period in days"
  type        = number
  default     = 30
}

variable "build_cache_retention_days" {
  description = "Build cache retention period in days"
  type        = number
  default     = 7
}

# Trigger configuration
variable "enable_pr_triggers" {
  description = "Enable pull request triggers"
  type        = bool
  default     = true
}

variable "enable_manual_triggers" {
  description = "Enable manual deployment triggers"
  type        = bool
  default     = true
}

variable "build_timeout" {
  description = "Build timeout in seconds"
  type        = string
  default     = "1200s"  # 20 minutes
}

# Monitoring
variable "notification_channels" {
  description = "Notification channels for build alerts"
  type        = list(string)
  default     = []
}

variable "enable_build_monitoring" {
  description = "Enable build monitoring and alerts"
  type        = bool
  default     = true
}

# Worker pool configuration
variable "worker_pool_machine_type" {
  description = "Machine type for private worker pool"
  type        = string
  default     = "e2-medium"
}

variable "worker_pool_disk_size" {
  description = "Disk size for private worker pool in GB"
  type        = number
  default     = 100
}

# Security
variable "require_approval" {
  description = "Require approval for production deployments"
  type        = bool
  default     = true
}

variable "allowed_branches" {
  description = "Branches allowed for deployment"
  type        = list(string)
  default     = ["main", "develop", "staging"]
}