# Pub/Sub Module - Event-driven messaging

# Enable Pub/Sub API
resource "google_project_service" "pubsub_api" {
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

# Card Events Topic
resource "google_pubsub_topic" "card_events" {
  name = "${var.name_prefix}-card-events"
  
  labels = merge(var.common_labels, {
    type = "card_events"
  })
  
  # Message retention policy
  message_retention_duration = "86400s"  # 24 hours
  
  # Schema validation (optional)
  schema_settings {
    schema   = google_pubsub_schema.card_event_schema.id
    encoding = "JSON"
  }
  
  depends_on = [google_project_service.pubsub_api]
}

# Card Events Subscription for Agent Orchestrator
resource "google_pubsub_subscription" "card_events_orchestrator" {
  name  = "${var.name_prefix}-card-events-orchestrator"
  topic = google_pubsub_topic.card_events.name
  
  labels = merge(var.common_labels, {
    subscriber = "agent_orchestrator"
    type      = "card_events"
  })
  
  # Acknowledgment deadline
  ack_deadline_seconds = 60
  
  # Message retention
  message_retention_duration = "86400s"  # 24 hours
  retain_acked_messages     = false
  
  # Dead letter policy
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 5
  }
  
  # Retry policy
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
  
  # Push configuration for Cloud Run
  push_config {
    push_endpoint = var.agent_orchestrator_url != "" ? "${var.agent_orchestrator_url}/webhooks/card-events" : ""
    
    attributes = {
      x-goog-version = "v1"
    }
    
    # Authentication
    oidc_token {
      service_account_email = var.service_account_email
    }
  }
  
  # Enable message ordering if needed
  enable_message_ordering = true
}

# Agent Runs Topic
resource "google_pubsub_topic" "agent_runs" {
  name = "${var.name_prefix}-agent-runs"
  
  labels = merge(var.common_labels, {
    type = "agent_runs"
  })
  
  # Message retention policy
  message_retention_duration = "86400s"  # 24 hours
  
  # Schema validation
  schema_settings {
    schema   = google_pubsub_schema.agent_run_schema.id
    encoding = "JSON"
  }
  
  depends_on = [google_project_service.pubsub_api]
}

# Agent Runs Subscription for Log Streaming
resource "google_pubsub_subscription" "agent_runs_logging" {
  name  = "${var.name_prefix}-agent-runs-logging"
  topic = google_pubsub_topic.agent_runs.name
  
  labels = merge(var.common_labels, {
    subscriber = "log_streaming"
    type      = "agent_runs"
  })
  
  # Acknowledgment deadline
  ack_deadline_seconds = 60
  
  # Message retention
  message_retention_duration = "86400s"
  retain_acked_messages     = false
  
  # Dead letter policy
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 5
  }
  
  # Retry policy
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
  
  # Push configuration for Cloud Run
  push_config {
    push_endpoint = var.log_streaming_url != "" ? "${var.log_streaming_url}/webhooks/agent-runs" : ""
    
    attributes = {
      x-goog-version = "v1"
    }
    
    # Authentication
    oidc_token {
      service_account_email = var.service_account_email
    }
  }
}

# Usage Events Topic
resource "google_pubsub_topic" "usage_events" {
  name = "${var.name_prefix}-usage-events"
  
  labels = merge(var.common_labels, {
    type = "usage_events"
  })
  
  # Message retention policy
  message_retention_duration = "172800s"  # 48 hours (longer for billing)
  
  # Schema validation
  schema_settings {
    schema   = google_pubsub_schema.usage_event_schema.id
    encoding = "JSON"
  }
  
  depends_on = [google_project_service.pubsub_api]
}

# Usage Events Subscription for Billing Service
resource "google_pubsub_subscription" "usage_events_billing" {
  name  = "${var.name_prefix}-usage-events-billing"
  topic = google_pubsub_topic.usage_events.name
  
  labels = merge(var.common_labels, {
    subscriber = "billing_service"
    type      = "usage_events"
  })
  
  # Acknowledgment deadline
  ack_deadline_seconds = 120  # Longer for billing processing
  
  # Message retention
  message_retention_duration = "172800s"  # 48 hours
  retain_acked_messages     = false
  
  # Dead letter policy
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter.id
    max_delivery_attempts = 10  # More attempts for billing
  }
  
  # Retry policy
  retry_policy {
    minimum_backoff = "30s"
    maximum_backoff = "1800s"  # 30 minutes max
  }
  
  # Push configuration for Cloud Run
  push_config {
    push_endpoint = var.billing_service_url != "" ? "${var.billing_service_url}/webhooks/usage-events" : ""
    
    attributes = {
      x-goog-version = "v1"
    }
    
    # Authentication
    oidc_token {
      service_account_email = var.service_account_email
    }
  }
}

# Dead Letter Topic for failed messages
resource "google_pubsub_topic" "dead_letter" {
  name = "${var.name_prefix}-dead-letter"
  
  labels = merge(var.common_labels, {
    type = "dead_letter"
  })
  
  # Longer retention for investigation
  message_retention_duration = "604800s"  # 7 days
  
  depends_on = [google_project_service.pubsub_api]
}

# Dead Letter Subscription for monitoring
resource "google_pubsub_subscription" "dead_letter_monitoring" {
  name  = "${var.name_prefix}-dead-letter-monitoring"
  topic = google_pubsub_topic.dead_letter.name
  
  labels = merge(var.common_labels, {
    type = "dead_letter_monitoring"
  })
  
  # Longer retention for investigation
  message_retention_duration = "604800s"  # 7 days
  retain_acked_messages     = true
  
  # No dead letter policy (avoid infinite loops)
  # Manual acknowledgment required
}

# Pub/Sub Schemas
resource "google_pubsub_schema" "card_event_schema" {
  name = "${var.name_prefix}-card-event-schema"
  type = "AVRO"
  
  definition = jsonencode({
    type = "record"
    name = "CardEvent"
    fields = [
      {
        name = "type"
        type = {
          type = "enum"
          name = "EventType"
          symbols = ["card.created", "card.updated", "card.moved", "card.deleted"]
        }
      },
      {
        name = "cardId"
        type = "string"
      },
      {
        name = "workspaceId"
        type = "string"
      },
      {
        name = "projectId"
        type = "string"
      },
      {
        name = "userId"
        type = "string"
      },
      {
        name = "fromLane"
        type = ["null", "int"]
        default = null
      },
      {
        name = "toLane"
        type = ["null", "int"]
        default = null
      },
      {
        name = "timestamp"
        type = {
          type = "long"
          logicalType = "timestamp-millis"
        }
      },
      {
        name = "metadata"
        type = ["null", "string"]
        default = null
      }
    ]
  })
}

resource "google_pubsub_schema" "agent_run_schema" {
  name = "${var.name_prefix}-agent-run-schema"
  type = "AVRO"
  
  definition = jsonencode({
    type = "record"
    name = "AgentRunEvent"
    fields = [
      {
        name = "type"
        type = {
          type = "enum"
          name = "RunEventType"
          symbols = ["agent.run.started", "agent.run.progress", "agent.run.completed", "agent.run.failed"]
        }
      },
      {
        name = "runId"
        type = "string"
      },
      {
        name = "cardId"
        type = "string"
      },
      {
        name = "agentId"
        type = "string"
      },
      {
        name = "workspaceId"
        type = "string"
      },
      {
        name = "projectId"
        type = "string"
      },
      {
        name = "provider"
        type = ["null", "string"]
        default = null
      },
      {
        name = "model"
        type = ["null", "string"]
        default = null
      },
      {
        name = "progress"
        type = ["null", "float"]
        default = null
      },
      {
        name = "timestamp"
        type = {
          type = "long"
          logicalType = "timestamp-millis"
        }
      },
      {
        name = "metadata"
        type = ["null", "string"]
        default = null
      }
    ]
  })
}

resource "google_pubsub_schema" "usage_event_schema" {
  name = "${var.name_prefix}-usage-event-schema"
  type = "AVRO"
  
  definition = jsonencode({
    type = "record"
    name = "UsageEvent"
    fields = [
      {
        name = "workspaceId"
        type = "string"
      },
      {
        name = "projectId"
        type = "string"
      },
      {
        name = "runId"
        type = "string"
      },
      {
        name = "provider"
        type = "string"
      },
      {
        name = "model"
        type = "string"
      },
      {
        name = "inputTokens"
        type = "int"
      },
      {
        name = "outputTokens"
        type = "int"
      },
      {
        name = "totalTokens"
        type = "int"
      },
      {
        name = "providerCost"
        type = "double"
      },
      {
        name = "customerPrice"
        type = "double"
      },
      {
        name = "timestamp"
        type = {
          type = "long"
          logicalType = "timestamp-millis"
        }
      },
      {
        name = "metadata"
        type = ["null", "string"]
        default = null
      }
    ]
  })
}

# IAM permissions for Pub/Sub
resource "google_pubsub_topic_iam_member" "card_events_publisher" {
  topic  = google_pubsub_topic.card_events.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${var.service_account_email}"
}

resource "google_pubsub_topic_iam_member" "agent_runs_publisher" {
  topic  = google_pubsub_topic.agent_runs.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${var.service_account_email}"
}

resource "google_pubsub_topic_iam_member" "usage_events_publisher" {
  topic  = google_pubsub_topic.usage_events.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${var.service_account_email}"
}

resource "google_pubsub_subscription_iam_member" "card_events_subscriber" {
  subscription = google_pubsub_subscription.card_events_orchestrator.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${var.service_account_email}"
}

resource "google_pubsub_subscription_iam_member" "agent_runs_subscriber" {
  subscription = google_pubsub_subscription.agent_runs_logging.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${var.service_account_email}"
}

resource "google_pubsub_subscription_iam_member" "usage_events_subscriber" {
  subscription = google_pubsub_subscription.usage_events_billing.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${var.service_account_email}"
}

# Monitoring for Pub/Sub
resource "google_monitoring_alert_policy" "pubsub_undelivered_messages" {
  display_name = "${var.name_prefix} Pub/Sub Undelivered Messages"
  combiner     = "OR"
  
  conditions {
    display_name = "High number of undelivered messages"
    
    condition_threshold {
      filter         = "resource.type=\"pubsub_subscription\""
      duration       = "300s"
      comparison     = "GREATER_THAN"
      threshold_value = 100
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
}

resource "google_monitoring_alert_policy" "pubsub_dead_letter_messages" {
  display_name = "${var.name_prefix} Pub/Sub Dead Letter Messages"
  combiner     = "OR"
  
  conditions {
    display_name = "Messages in dead letter queue"
    
    condition_threshold {
      filter         = "resource.type=\"pubsub_topic\" AND resource.labels.topic_id=\"${google_pubsub_topic.dead_letter.name}\""
      duration       = "60s"
      comparison     = "GREATER_THAN"
      threshold_value = 0
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "900s"
  }
}