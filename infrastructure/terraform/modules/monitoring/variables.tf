# Monitoring Module Variables

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

# Notification configuration
variable "notification_emails" {
  description = "List of email addresses for alerts"
  type        = list(string)
  default     = []
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  default     = ""
  sensitive   = true
}

# Cloud Run services to monitor
variable "cloud_run_services" {
  description = "Map of Cloud Run service names to monitor"
  type        = map(string)
  default     = {}
}

# Service URLs for uptime checks
variable "frontend_url" {
  description = "Frontend service URL"
  type        = string
  default     = ""
}

variable "api_gateway_url" {
  description = "API Gateway service URL"
  type        = string
  default     = ""
}

# Alert thresholds
variable "error_rate_threshold" {
  description = "Error rate threshold for alerts (percentage)"
  type        = number
  default     = 5.0
}

variable "latency_threshold_ms" {
  description = "Latency threshold for alerts in milliseconds"
  type        = number
  default     = 2000
}

variable "max_instances_alert_threshold" {
  description = "Maximum instances threshold for alerts"
  type        = number
  default     = 8
}

variable "cpu_threshold" {
  description = "CPU utilization threshold for alerts"
  type        = number
  default     = 0.8
}

variable "memory_threshold" {
  description = "Memory utilization threshold for alerts"
  type        = number
  default     = 0.85
}

variable "billing_anomaly_threshold" {
  description = "Billing cost increase threshold for alerts (dollars per hour)"
  type        = number
  default     = 10.0
}

# Database configuration
variable "enable_alloy_db" {
  description = "Whether AlloyDB is enabled (affects monitoring queries)"
  type        = bool
  default     = false
}

# Feature flags
variable "enable_uptime_checks" {
  description = "Enable uptime monitoring for public endpoints"
  type        = bool
  default     = true
}

variable "enable_custom_metrics" {
  description = "Enable custom application metrics"
  type        = bool
  default     = true
}

variable "enable_log_based_metrics" {
  description = "Enable log-based metrics"
  type        = bool
  default     = true
}

variable "enable_billing_alerts" {
  description = "Enable billing anomaly alerts"
  type        = bool
  default     = true
}

# Dashboard configuration
variable "dashboard_time_range" {
  description = "Default time range for dashboard widgets"
  type        = string
  default     = "1h"
}

variable "enable_dashboard" {
  description = "Create monitoring dashboard"
  type        = bool
  default     = true
}

# Alert behavior
variable "alert_auto_close_duration" {
  description = "Auto-close duration for alerts in seconds"
  type        = string
  default     = "1800s"
}

variable "alert_documentation_enabled" {
  description = "Include documentation in alert policies"
  type        = bool
  default     = true
}