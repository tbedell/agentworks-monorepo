# Pub/Sub Module Variables

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

# Service account for IAM permissions
variable "service_account_email" {
  description = "Service account email for Pub/Sub access"
  type        = string
}

# Service URLs for push subscriptions
variable "agent_orchestrator_url" {
  description = "Agent Orchestrator service URL"
  type        = string
  default     = ""
}

variable "log_streaming_url" {
  description = "Log Streaming service URL"
  type        = string
  default     = ""
}

variable "billing_service_url" {
  description = "Billing service URL"
  type        = string
  default     = ""
}

# Monitoring configuration
variable "notification_channels" {
  description = "Notification channels for alerts"
  type        = list(string)
  default     = []
}

# Message retention configuration
variable "message_retention_hours" {
  description = "Message retention in hours"
  type        = number
  default     = 24
}

variable "dead_letter_retention_days" {
  description = "Dead letter message retention in days"
  type        = number
  default     = 7
}

# Subscription configuration
variable "ack_deadline_seconds" {
  description = "Acknowledgment deadline in seconds"
  type        = number
  default     = 60
}

variable "max_delivery_attempts" {
  description = "Maximum delivery attempts before dead letter"
  type        = number
  default     = 5
}

# Feature flags
variable "enable_message_ordering" {
  description = "Enable message ordering for subscriptions"
  type        = bool
  default     = true
}

variable "enable_push_subscriptions" {
  description = "Enable push subscriptions to Cloud Run services"
  type        = bool
  default     = true
}

variable "enable_dead_letter_queue" {
  description = "Enable dead letter queue for failed messages"
  type        = bool
  default     = true
}