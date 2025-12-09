# Monitoring Module Outputs

# Notification channels
output "notification_channel_ids" {
  description = "List of all notification channel IDs"
  value = concat(
    google_monitoring_notification_channel.email[*].id,
    google_monitoring_notification_channel.slack[*].id
  )
}

output "email_notification_channels" {
  description = "Email notification channel IDs"
  value = google_monitoring_notification_channel.email[*].id
}

output "slack_notification_channel" {
  description = "Slack notification channel ID"
  value = length(google_monitoring_notification_channel.slack) > 0 ? google_monitoring_notification_channel.slack[0].id : null
}

# Alert policies
output "alert_policy_names" {
  description = "List of all alert policy names"
  value = concat(
    [for policy in google_monitoring_alert_policy.cloud_run_error_rate : policy.name],
    [for policy in google_monitoring_alert_policy.cloud_run_latency : policy.name],
    [for policy in google_monitoring_alert_policy.cloud_run_instance_count : policy.name],
    [
      google_monitoring_alert_policy.database_high_cpu.name,
      google_monitoring_alert_policy.database_connections.name,
      google_monitoring_alert_policy.agent_run_failures.name,
      google_monitoring_alert_policy.billing_anomaly.name
    ]
  )
}

output "cloud_run_alert_policies" {
  description = "Cloud Run alert policy details"
  value = {
    error_rate = {
      for service, policy in google_monitoring_alert_policy.cloud_run_error_rate : service => {
        name         = policy.name
        display_name = policy.display_name
        id          = policy.id
      }
    }
    latency = {
      for service, policy in google_monitoring_alert_policy.cloud_run_latency : service => {
        name         = policy.name
        display_name = policy.display_name
        id          = policy.id
      }
    }
    instance_count = {
      for service, policy in google_monitoring_alert_policy.cloud_run_instance_count : service => {
        name         = policy.name
        display_name = policy.display_name
        id          = policy.id
      }
    }
  }
}

output "database_alert_policies" {
  description = "Database alert policy details"
  value = {
    high_cpu = {
      name         = google_monitoring_alert_policy.database_high_cpu.name
      display_name = google_monitoring_alert_policy.database_high_cpu.display_name
      id          = google_monitoring_alert_policy.database_high_cpu.id
    }
    connections = {
      name         = google_monitoring_alert_policy.database_connections.name
      display_name = google_monitoring_alert_policy.database_connections.display_name
      id          = google_monitoring_alert_policy.database_connections.id
    }
  }
}

output "application_alert_policies" {
  description = "Application-specific alert policy details"
  value = {
    agent_failures = {
      name         = google_monitoring_alert_policy.agent_run_failures.name
      display_name = google_monitoring_alert_policy.agent_run_failures.display_name
      id          = google_monitoring_alert_policy.agent_run_failures.id
    }
    billing_anomaly = {
      name         = google_monitoring_alert_policy.billing_anomaly.name
      display_name = google_monitoring_alert_policy.billing_anomaly.display_name
      id          = google_monitoring_alert_policy.billing_anomaly.id
    }
  }
}

# Uptime checks
output "uptime_check_ids" {
  description = "Uptime check IDs"
  value = {
    frontend    = google_monitoring_uptime_check_config.frontend.uptime_check_id
    api_gateway = google_monitoring_uptime_check_config.api_gateway.uptime_check_id
  }
}

# Dashboard
output "dashboard_url" {
  description = "Monitoring dashboard URL"
  value = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.agentworks_overview.id}?project=${var.project_id}"
}

output "dashboard_id" {
  description = "Dashboard ID"
  value = google_monitoring_dashboard.agentworks_overview.id
}

# Log-based metrics
output "log_metrics" {
  description = "Log-based metric names"
  value = {
    error_rate  = google_logging_metric.error_rate.name
    agent_runs  = google_logging_metric.agent_runs.name
  }
}

# Monitoring URLs for quick access
output "dashboard_urls" {
  description = "Quick access URLs for monitoring resources"
  value = {
    main_dashboard = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.agentworks_overview.id}?project=${var.project_id}"
    alerts         = "https://console.cloud.google.com/monitoring/alerting?project=${var.project_id}"
    uptime_checks  = "https://console.cloud.google.com/monitoring/uptime?project=${var.project_id}"
    metrics        = "https://console.cloud.google.com/monitoring/metrics-explorer?project=${var.project_id}"
    logs           = "https://console.cloud.google.com/logs/query?project=${var.project_id}"
  }
}

# Configuration summary
output "monitoring_config" {
  description = "Monitoring configuration summary"
  value = {
    notification_channels = length(concat(
      google_monitoring_notification_channel.email,
      google_monitoring_notification_channel.slack
    ))
    alert_policies = length(concat(
      [for policy in google_monitoring_alert_policy.cloud_run_error_rate : policy],
      [for policy in google_monitoring_alert_policy.cloud_run_latency : policy],
      [for policy in google_monitoring_alert_policy.cloud_run_instance_count : policy],
      [
        google_monitoring_alert_policy.database_high_cpu,
        google_monitoring_alert_policy.database_connections,
        google_monitoring_alert_policy.agent_run_failures,
        google_monitoring_alert_policy.billing_anomaly
      ]
    ))
    uptime_checks = 2
    dashboards    = 1
    log_metrics   = 2
  }
}