# Pub/Sub Module Outputs

# Topic names
output "topic_names" {
  description = "Map of Pub/Sub topic names"
  value = {
    card_events   = google_pubsub_topic.card_events.name
    agent_runs    = google_pubsub_topic.agent_runs.name
    usage_events  = google_pubsub_topic.usage_events.name
    dead_letter   = google_pubsub_topic.dead_letter.name
  }
}

# Topic IDs
output "topic_ids" {
  description = "Map of Pub/Sub topic IDs"
  value = {
    card_events   = google_pubsub_topic.card_events.id
    agent_runs    = google_pubsub_topic.agent_runs.id
    usage_events  = google_pubsub_topic.usage_events.id
    dead_letter   = google_pubsub_topic.dead_letter.id
  }
}

# Subscription names
output "subscription_names" {
  description = "Map of Pub/Sub subscription names"
  value = {
    card_events_orchestrator = google_pubsub_subscription.card_events_orchestrator.name
    agent_runs_logging      = google_pubsub_subscription.agent_runs_logging.name
    usage_events_billing    = google_pubsub_subscription.usage_events_billing.name
    dead_letter_monitoring  = google_pubsub_subscription.dead_letter_monitoring.name
  }
}

# Subscription IDs
output "subscription_ids" {
  description = "Map of Pub/Sub subscription IDs"
  value = {
    card_events_orchestrator = google_pubsub_subscription.card_events_orchestrator.id
    agent_runs_logging      = google_pubsub_subscription.agent_runs_logging.id
    usage_events_billing    = google_pubsub_subscription.usage_events_billing.id
    dead_letter_monitoring  = google_pubsub_subscription.dead_letter_monitoring.id
  }
}

# Schema IDs
output "schema_ids" {
  description = "Map of Pub/Sub schema IDs"
  value = {
    card_event_schema   = google_pubsub_schema.card_event_schema.id
    agent_run_schema    = google_pubsub_schema.agent_run_schema.id
    usage_event_schema  = google_pubsub_schema.usage_event_schema.id
  }
}

# Topic and subscription configuration for applications
output "pubsub_config" {
  description = "Pub/Sub configuration for applications"
  value = {
    topics = {
      card_events = {
        name = google_pubsub_topic.card_events.name
        id   = google_pubsub_topic.card_events.id
      }
      agent_runs = {
        name = google_pubsub_topic.agent_runs.name
        id   = google_pubsub_topic.agent_runs.id
      }
      usage_events = {
        name = google_pubsub_topic.usage_events.name
        id   = google_pubsub_topic.usage_events.id
      }
      dead_letter = {
        name = google_pubsub_topic.dead_letter.name
        id   = google_pubsub_topic.dead_letter.id
      }
    }
    subscriptions = {
      card_events_orchestrator = {
        name = google_pubsub_subscription.card_events_orchestrator.name
        id   = google_pubsub_subscription.card_events_orchestrator.id
        topic = google_pubsub_topic.card_events.name
      }
      agent_runs_logging = {
        name = google_pubsub_subscription.agent_runs_logging.name
        id   = google_pubsub_subscription.agent_runs_logging.id
        topic = google_pubsub_topic.agent_runs.name
      }
      usage_events_billing = {
        name = google_pubsub_subscription.usage_events_billing.name
        id   = google_pubsub_subscription.usage_events_billing.id
        topic = google_pubsub_topic.usage_events.name
      }
      dead_letter_monitoring = {
        name = google_pubsub_subscription.dead_letter_monitoring.name
        id   = google_pubsub_subscription.dead_letter_monitoring.id
        topic = google_pubsub_topic.dead_letter.name
      }
    }
  }
}

# Alert policy names
output "alert_policy_names" {
  description = "Pub/Sub monitoring alert policy names"
  value = [
    google_monitoring_alert_policy.pubsub_undelivered_messages.name,
    google_monitoring_alert_policy.pubsub_dead_letter_messages.name
  ]
}