# AgentWorks - Terraform Outputs

# Project information
output "project_id" {
  description = "GCP project ID"
  value       = var.project_id
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "region" {
  description = "GCP region"
  value       = var.region
}

# Networking outputs
output "vpc_network_id" {
  description = "VPC network ID"
  value       = module.networking.vpc_network_id
}

output "vpc_network_name" {
  description = "VPC network name"
  value       = module.networking.vpc_network_name
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = module.networking.public_subnet_id
}

output "private_subnet_id" {
  description = "Private subnet ID"
  value       = module.networking.private_subnet_id
}

output "vpc_connector_id" {
  description = "VPC connector ID"
  value       = module.networking.vpc_connector_id
}

# Database outputs
output "database_connection_name" {
  description = "Database connection name"
  value       = module.database.connection_name
}

output "database_host" {
  description = "Database host (private IP)"
  value       = module.database.private_ip_address
  sensitive   = true
}

output "database_port" {
  description = "Database port"
  value       = module.database.port
}

output "database_name" {
  description = "Database name"
  value       = module.database.database_name
}

# AlloyDB outputs (when enabled)
output "alloydb_cluster_id" {
  description = "AlloyDB cluster ID"
  value       = try(module.database.alloydb_cluster_id, null)
}

output "alloydb_instance_id" {
  description = "AlloyDB primary instance ID"
  value       = try(module.database.alloydb_instance_id, null)
}

# Cloud Run service outputs
output "cloud_run_services" {
  description = "Cloud Run service information"
  value = {
    api_gateway = {
      url  = module.cloud_run.api_gateway_url
      name = module.cloud_run.service_names["api_gateway"]
    }
    core_service = {
      url  = module.cloud_run.core_service_url
      name = module.cloud_run.service_names["core_service"]
    }
    agent_orchestrator = {
      url  = module.cloud_run.agent_orchestrator_url
      name = module.cloud_run.service_names["agent_orchestrator"]
    }
    provider_router = {
      url  = module.cloud_run.provider_router_url
      name = module.cloud_run.service_names["provider_router"]
    }
    log_streaming = {
      url  = module.cloud_run.log_streaming_url
      name = module.cloud_run.service_names["log_streaming"]
    }
    billing_service = {
      url  = module.cloud_run.billing_service_url
      name = module.cloud_run.service_names["billing_service"]
    }
  }
}

output "frontend_url" {
  description = "Frontend application URL"
  value       = module.cloud_run.frontend_url
}

output "api_gateway_url" {
  description = "API Gateway URL"
  value       = module.cloud_run.api_gateway_url
}

# Storage outputs
output "storage_buckets" {
  description = "Storage bucket information"
  value = {
    logs    = module.storage.logs_bucket_name
    exports = module.storage.exports_bucket_name
    uploads = module.storage.uploads_bucket_name
  }
}

# Secret Manager outputs
output "secret_manager_secrets" {
  description = "Secret Manager secret names"
  value       = module.security.secret_names
  sensitive   = true
}

# Pub/Sub outputs
output "pubsub_topics" {
  description = "Pub/Sub topic names"
  value       = module.pubsub.topic_names
}

output "pubsub_subscriptions" {
  description = "Pub/Sub subscription names"
  value       = module.pubsub.subscription_names
}

# Monitoring outputs
output "monitoring_dashboards" {
  description = "Monitoring dashboard URLs"
  value       = try(module.monitoring.dashboard_urls, {})
}

output "monitoring_alerts" {
  description = "Monitoring alert policy names"
  value       = try(module.monitoring.alert_policy_names, [])
}

# Build outputs
output "build_trigger_ids" {
  description = "Cloud Build trigger IDs"
  value       = module.build.trigger_ids
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository name"
  value       = module.build.repository_name
}

# Application configuration
output "application_config" {
  description = "Application configuration for environment variables"
  value = {
    PROJECT_ID                = var.project_id
    ENVIRONMENT              = var.environment
    REGION                   = var.region
    
    # Database configuration
    DATABASE_CONNECTION_NAME = module.database.connection_name
    DATABASE_NAME           = module.database.database_name
    DATABASE_PORT           = module.database.port
    
    # Pub/Sub configuration
    CARD_EVENTS_TOPIC       = module.pubsub.topic_names["card_events"]
    AGENT_RUNS_TOPIC        = module.pubsub.topic_names["agent_runs"]
    USAGE_EVENTS_TOPIC      = module.pubsub.topic_names["usage_events"]
    
    # Storage configuration
    LOGS_BUCKET             = module.storage.logs_bucket_name
    EXPORTS_BUCKET          = module.storage.exports_bucket_name
    UPLOADS_BUCKET          = module.storage.uploads_bucket_name
    
    # Service URLs (internal)
    CORE_SERVICE_URL        = module.cloud_run.core_service_url
    AGENT_ORCHESTRATOR_URL  = module.cloud_run.agent_orchestrator_url
    PROVIDER_ROUTER_URL     = module.cloud_run.provider_router_url
    LOG_STREAMING_URL       = module.cloud_run.log_streaming_url
    BILLING_SERVICE_URL     = module.cloud_run.billing_service_url
  }
  sensitive = true
}

# Deployment information
output "deployment_info" {
  description = "Information needed for deployment scripts"
  value = {
    project_id              = var.project_id
    region                  = var.region
    environment             = var.environment
    artifact_registry_repo  = module.build.repository_name
    services               = module.cloud_run.service_names
  }
}