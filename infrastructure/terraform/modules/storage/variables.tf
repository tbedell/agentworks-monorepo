# Storage Module Variables

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "multi_region_location" {
  description = "Multi-region location for global resources"
  type        = string
  default     = "US"
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

# Service account for IAM permissions
variable "service_account_email" {
  description = "Service account email for storage access"
  type        = string
}

# Retention policies
variable "logs_retention_days" {
  description = "Log retention period in days"
  type        = number
  default     = 90
}

variable "exports_retention_days" {
  description = "Export files retention period in days"
  type        = number
  default     = 365
}

variable "uploads_retention_days" {
  description = "User uploads retention period in days"
  type        = number
  default     = 2555  # 7 years for compliance
}

# CORS configuration
variable "cors_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["*"]
}

# Feature flags
variable "enable_upload_versioning" {
  description = "Enable versioning for user uploads"
  type        = bool
  default     = true
}

variable "enable_cdn" {
  description = "Enable CDN with static assets bucket"
  type        = bool
  default     = false
}

variable "enable_access_logging" {
  description = "Enable access logging for security"
  type        = bool
  default     = true
}

variable "create_terraform_state_bucket" {
  description = "Create bucket for Terraform state storage"
  type        = bool
  default     = true
}

# Pub/Sub integration
variable "upload_notification_topic" {
  description = "Pub/Sub topic for upload notifications"
  type        = string
  default     = ""
}

variable "upload_notification_topic_iam" {
  description = "IAM dependency for upload notification topic"
  type        = string
  default     = ""
}

# Monitoring
variable "notification_channels" {
  description = "Notification channels for alerts"
  type        = list(string)
  default     = []
}

variable "storage_alert_threshold_gb" {
  description = "Storage usage threshold in GB for alerts"
  type        = number
  default     = 100
}

# Security
variable "enforce_public_access_prevention" {
  description = "Enforce public access prevention on buckets"
  type        = bool
  default     = true
}