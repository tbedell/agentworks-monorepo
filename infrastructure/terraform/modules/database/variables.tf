# Database Module Variables

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "zone" {
  description = "GCP zone"
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
variable "vpc_network_id" {
  description = "VPC network ID"
  type        = string
}

variable "private_subnet_id" {
  description = "Private subnet ID"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_vpc_connection" {
  description = "Private VPC connection for managed services"
  type        = string
  default     = ""
}

# Database configuration
variable "database_tier" {
  description = "Database instance tier"
  type        = string
  default     = "db-custom-2-8192"
}

variable "database_disk_size" {
  description = "Database disk size in GB"
  type        = number
  default     = 100
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "agentworks"
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "backup_retention_days" {
  description = "Database backup retention period in days"
  type        = number
  default     = 7
}

# AlloyDB configuration
variable "enable_alloy_db" {
  description = "Enable AlloyDB instead of Cloud SQL"
  type        = bool
  default     = false
}

variable "alloydb_cpu_count" {
  description = "CPU count for AlloyDB instances"
  type        = number
  default     = 2
}

variable "enable_read_replica" {
  description = "Enable read replica for AlloyDB"
  type        = bool
  default     = false
}

variable "enable_connection_pool" {
  description = "Enable connection pooling with PgBouncer"
  type        = bool
  default     = false
}

variable "kms_key_name" {
  description = "KMS key name for encryption"
  type        = string
  default     = ""
}

# Firestore configuration
variable "enable_firestore" {
  description = "Enable Firestore for document storage"
  type        = bool
  default     = true
}

variable "firestore_location" {
  description = "Firestore location"
  type        = string
  default     = "us-central"
}

# Development configuration
variable "enable_sql_proxy" {
  description = "Enable SQL Proxy instance for development"
  type        = bool
  default     = false
}

variable "cloud_run_service_account_email" {
  description = "Cloud Run service account email"
  type        = string
  default     = ""
}

# Monitoring configuration
variable "notification_channels" {
  description = "Notification channels for alerts"
  type        = list(string)
  default     = []
}