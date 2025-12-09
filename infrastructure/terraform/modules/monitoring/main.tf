# Monitoring Module - Cloud Monitoring and Alerting

# Enable monitoring APIs
resource "google_project_service" "monitoring_api" {
  service            = "monitoring.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "logging_api" {
  service            = "logging.googleapis.com"
  disable_on_destroy = false
}

# Notification channels
resource "google_monitoring_notification_channel" "email" {
  count = length(var.notification_emails)
  
  display_name = "Email - ${var.notification_emails[count.index]}"
  type         = "email"
  
  labels = {
    email_address = var.notification_emails[count.index]
  }
  
  user_labels = var.common_labels
  
  depends_on = [google_project_service.monitoring_api]
}

resource "google_monitoring_notification_channel" "slack" {
  count = var.slack_webhook_url != "" ? 1 : 0
  
  display_name = "Slack - ${var.environment}"
  type         = "slack"
  
  labels = {
    url = var.slack_webhook_url
  }
  
  user_labels = var.common_labels
  
  depends_on = [google_project_service.monitoring_api]
}

# Cloud Run service monitoring
resource "google_monitoring_alert_policy" "cloud_run_error_rate" {
  for_each = var.cloud_run_services
  
  display_name = "${var.name_prefix} ${each.key} Error Rate"
  combiner     = "OR"
  enabled      = true
  
  conditions {
    display_name = "${each.key} error rate > 5%"
    
    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "resource.labels.service_name=\"${each.value}\"",
        "metric.type=\"run.googleapis.com/request_count\""
      ])
      
      duration   = "300s"
      comparison = "GREATER_THAN"
      threshold_value = 0.05
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner  = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields     = ["resource.labels.service_name"]
      }
      
      denominator_filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "resource.labels.service_name=\"${each.value}\"",
        "metric.type=\"run.googleapis.com/request_count\""
      ])
      
      denominator_aggregations {
        alignment_period     = "60s"
        per_series_aligner  = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields     = ["resource.labels.service_name"]
      }
    }
  }
  
  notification_channels = local.all_notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
  
  documentation {
    content = "Cloud Run service ${each.key} is experiencing high error rates."
  }
}

resource "google_monitoring_alert_policy" "cloud_run_latency" {
  for_each = var.cloud_run_services
  
  display_name = "${var.name_prefix} ${each.key} High Latency"
  combiner     = "OR"
  enabled      = true
  
  conditions {
    display_name = "${each.key} 95th percentile latency > 2000ms"
    
    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "resource.labels.service_name=\"${each.value}\"",
        "metric.type=\"run.googleapis.com/request_latencies\""
      ])
      
      duration   = "300s"
      comparison = "GREATER_THAN"
      threshold_value = 2000
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner  = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_PERCENTILE_95"
        group_by_fields     = ["resource.labels.service_name"]
      }
    }
  }
  
  notification_channels = local.all_notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
  
  documentation {
    content = "Cloud Run service ${each.key} is experiencing high latency."
  }
}

resource "google_monitoring_alert_policy" "cloud_run_instance_count" {
  for_each = var.cloud_run_services
  
  display_name = "${var.name_prefix} ${each.key} High Instance Count"
  combiner     = "OR"
  enabled      = true
  
  conditions {
    display_name = "${each.key} instance count > ${var.max_instances_alert_threshold}"
    
    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "resource.labels.service_name=\"${each.value}\"",
        "metric.type=\"run.googleapis.com/container/instance_count\""
      ])
      
      duration   = "300s"
      comparison = "GREATER_THAN"
      threshold_value = var.max_instances_alert_threshold
      
      aggregations {
        alignment_period     = "60s"
        per_series_aligner  = "ALIGN_MEAN"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields     = ["resource.labels.service_name"]
      }
    }
  }
  
  notification_channels = local.all_notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
  
  documentation {
    content = "Cloud Run service ${each.key} is scaling beyond normal limits."
  }
}

# Database monitoring (separate from database module for centralization)
resource "google_monitoring_alert_policy" "database_high_cpu" {
  display_name = "${var.name_prefix} Database High CPU"
  combiner     = "OR"
  enabled      = true
  
  conditions {
    display_name = "Database CPU > 80%"
    
    condition_threshold {
      filter = var.enable_alloy_db ? 
        "resource.type=\"alloydb_database\"" : 
        "resource.type=\"cloudsql_database\""
      
      duration   = "300s"
      comparison = "GREATER_THAN"
      threshold_value = 0.8
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = local.all_notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
  
  documentation {
    content = "Database CPU usage is critically high. Consider scaling up or optimizing queries."
  }
}

resource "google_monitoring_alert_policy" "database_connections" {
  display_name = "${var.name_prefix} Database Connection Limit"
  combiner     = "OR"
  enabled      = true
  
  conditions {
    display_name = "Database connections > 80% of limit"
    
    condition_threshold {
      filter = var.enable_alloy_db ? 
        "resource.type=\"alloydb_database\"" : 
        "resource.type=\"cloudsql_database\""
      
      duration   = "300s"
      comparison = "GREATER_THAN"
      threshold_value = 160  # 80% of typical 200 connection limit
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = local.all_notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
  
  documentation {
    content = "Database connection pool is near capacity. Check for connection leaks."
  }
}

# Custom application metrics
resource "google_monitoring_alert_policy" "agent_run_failures" {
  display_name = "${var.name_prefix} Agent Run Failure Rate"
  combiner     = "OR"
  enabled      = true
  
  conditions {
    display_name = "Agent run failure rate > 10%"
    
    condition_threshold {
      filter = "metric.type=\"custom.googleapis.com/agentworks/agent_runs\" AND metric.labels.status=\"failed\""
      
      duration   = "600s"  # 10 minutes
      comparison = "GREATER_THAN"
      threshold_value = 0.1
      
      aggregations {
        alignment_period     = "300s"
        per_series_aligner  = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
      
      denominator_filter = "metric.type=\"custom.googleapis.com/agentworks/agent_runs\""
      
      denominator_aggregations {
        alignment_period     = "300s"
        per_series_aligner  = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }
  
  notification_channels = local.all_notification_channels
  
  alert_strategy {
    auto_close = "3600s"  # 1 hour
  }
  
  documentation {
    content = "High rate of agent run failures detected. Check provider connectivity and rate limits."
  }
}

resource "google_monitoring_alert_policy" "billing_anomaly" {
  display_name = "${var.name_prefix} Billing Anomaly"
  combiner     = "OR"
  enabled      = true
  
  conditions {
    display_name = "Usage cost spike > 50% increase"
    
    condition_threshold {
      filter = "metric.type=\"custom.googleapis.com/agentworks/usage_cost\""
      
      duration   = "1800s"  # 30 minutes
      comparison = "GREATER_THAN"
      threshold_value = var.billing_anomaly_threshold
      
      aggregations {
        alignment_period     = "600s"
        per_series_aligner  = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields     = ["metric.labels.workspace_id"]
      }
    }
  }
  
  notification_channels = local.all_notification_channels
  
  alert_strategy {
    auto_close = "7200s"  # 2 hours
  }
  
  documentation {
    content = "Unusual spike in usage costs detected. Review recent activity and provider costs."
  }
}

# Uptime checks
resource "google_monitoring_uptime_check_config" "frontend" {
  display_name = "${var.name_prefix} Frontend Uptime"
  timeout      = "10s"
  period       = "60s"
  
  http_check {
    path         = "/api/health"
    port         = "443"
    use_ssl      = true
    validate_ssl = true
  }
  
  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.frontend_url != "" ? replace(var.frontend_url, "https://", "") : "example.com"
    }
  }
  
  content_matchers {
    content = "ok"
    matcher = "CONTAINS_STRING"
  }
}

resource "google_monitoring_uptime_check_config" "api_gateway" {
  display_name = "${var.name_prefix} API Gateway Uptime"
  timeout      = "10s"
  period       = "60s"
  
  http_check {
    path         = "/health"
    port         = "443"
    use_ssl      = true
    validate_ssl = true
  }
  
  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.api_gateway_url != "" ? replace(var.api_gateway_url, "https://", "") : "example.com"
    }
  }
  
  content_matchers {
    content = "ok"
    matcher = "CONTAINS_STRING"
  }
}

# Custom dashboard
resource "google_monitoring_dashboard" "agentworks_overview" {
  dashboard_json = jsonencode({
    displayName = "${var.name_prefix} Overview Dashboard"
    
    gridLayout = {
      widgets = [
        {
          title = "Cloud Run Request Rate"
          xyChart = {
            dataSets = [
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner  = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                      groupByFields     = ["resource.labels.service_name"]
                    }
                  }
                }
                plotType = "LINE"
              }
            ]
            timeshiftDuration = "0s"
            yAxis = {
              label = "Requests/sec"
              scale = "LINEAR"
            }
          }
        },
        {
          title = "Cloud Run Latency (95th percentile)"
          xyChart = {
            dataSets = [
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"run.googleapis.com/request_latencies\" AND resource.type=\"cloud_run_revision\""
                    aggregation = {
                      alignmentPeriod    = "60s"
                      perSeriesAligner  = "ALIGN_DELTA"
                      crossSeriesReducer = "REDUCE_PERCENTILE_95"
                      groupByFields     = ["resource.labels.service_name"]
                    }
                  }
                }
                plotType = "LINE"
              }
            ]
            yAxis = {
              label = "Latency (ms)"
              scale = "LINEAR"
            }
          }
        },
        {
          title = "Database CPU Utilization"
          xyChart = {
            dataSets = [
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = var.enable_alloy_db ? 
                      "metric.type=\"alloydb.googleapis.com/database/cpu/utilization\"" : 
                      "metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\""
                    aggregation = {
                      alignmentPeriod   = "60s"
                      perSeriesAligner = "ALIGN_MEAN"
                    }
                  }
                }
                plotType = "LINE"
              }
            ]
            yAxis = {
              label = "CPU Utilization"
              scale = "LINEAR"
            }
          }
        },
        {
          title = "Agent Run Status"
          xyChart = {
            dataSets = [
              {
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"custom.googleapis.com/agentworks/agent_runs\""
                    aggregation = {
                      alignmentPeriod    = "300s"
                      perSeriesAligner  = "ALIGN_RATE"
                      crossSeriesReducer = "REDUCE_SUM"
                      groupByFields     = ["metric.labels.status"]
                    }
                  }
                }
                plotType = "STACKED_AREA"
              }
            ]
            yAxis = {
              label = "Runs/sec"
              scale = "LINEAR"
            }
          }
        }
      ]
    }
  })
  
  depends_on = [google_project_service.monitoring_api]
}

# Log-based metrics
resource "google_logging_metric" "error_rate" {
  name   = "${var.name_prefix}_error_rate"
  filter = "severity>=ERROR"
  
  metric_descriptor {
    metric_kind = "GAUGE"
    value_type  = "DOUBLE"
    unit        = "1"
    display_name = "Error Rate"
  }
  
  value_extractor = "EXTRACT(jsonPayload.count)"
}

resource "google_logging_metric" "agent_runs" {
  name   = "${var.name_prefix}_agent_runs"
  filter = "jsonPayload.event=\"agent.run.completed\" OR jsonPayload.event=\"agent.run.failed\""
  
  metric_descriptor {
    metric_kind = "COUNTER"
    value_type  = "INT64"
    unit        = "1"
    display_name = "Agent Runs"
  }
  
  label_extractors = {
    status    = "EXTRACT(jsonPayload.status)"
    agent     = "EXTRACT(jsonPayload.agent)"
    workspace = "EXTRACT(jsonPayload.workspace_id)"
  }
}

# Local values
locals {
  all_notification_channels = concat(
    google_monitoring_notification_channel.email[*].id,
    google_monitoring_notification_channel.slack[*].id
  )
}