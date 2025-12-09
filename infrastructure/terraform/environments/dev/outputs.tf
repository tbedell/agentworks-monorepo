# Development Environment Outputs

# Forward all outputs from the main module
output "project_id" {
  description = "GCP project ID"
  value       = module.agentworks_dev.project_id
}

output "environment" {
  description = "Environment name"
  value       = module.agentworks_dev.environment
}

output "region" {
  description = "GCP region"
  value       = module.agentworks_dev.region
}

# URLs for quick access
output "application_urls" {
  description = "Application URLs"
  value = {
    frontend    = module.agentworks_dev.frontend_url
    api_gateway = module.agentworks_dev.api_gateway_url
  }
}

# Database connection info
output "database_info" {
  description = "Database connection information"
  value = {
    connection_name = module.agentworks_dev.database_connection_name
    host           = module.agentworks_dev.database_host
    port           = module.agentworks_dev.database_port
    database_name  = module.agentworks_dev.database_name
  }
  sensitive = true
}

# Development tools
output "development_tools" {
  description = "Development tools and commands"
  value = {
    cloud_sql_proxy = "cloud_sql_proxy -instances=${module.agentworks_dev.database_connection_name}=tcp:5432"
    
    gcloud_auth = "gcloud auth application-default login"
    
    docker_auth = "gcloud auth configure-docker ${var.region}-docker.pkg.dev"
    
    local_database = "psql postgresql://agentworks:PASSWORD@localhost:5432/agentworks"
    
    build_trigger = module.agentworks_dev.build_trigger_ids["manual_deploy"]
    
    artifact_registry = module.agentworks_dev.artifact_registry_repository
  }
}

# Monitoring URLs
output "monitoring_urls" {
  description = "Monitoring and observability URLs"
  value = {
    dashboard     = module.agentworks_dev.monitoring_dashboards
    logs         = "https://console.cloud.google.com/logs/query?project=${var.project_id}"
    metrics      = "https://console.cloud.google.com/monitoring?project=${var.project_id}"
    cloud_run    = "https://console.cloud.google.com/run?project=${var.project_id}"
    cloud_build  = "https://console.cloud.google.com/cloud-build?project=${var.project_id}"
    storage      = "https://console.cloud.google.com/storage/browser?project=${var.project_id}"
  }
}

# Development scripts
output "development_scripts" {
  description = "Generated development scripts"
  value = {
    setup_script = "${path.root}/../../scripts/dev-setup.sh"
    seed_script  = "${path.root}/../../scripts/seed-dev-data.sh"
  }
}

# Environment configuration for local development
output "local_env_config" {
  description = "Environment configuration for local development"
  value = {
    PROJECT_ID                = var.project_id
    ENVIRONMENT              = var.environment
    REGION                   = var.region
    DATABASE_CONNECTION_NAME = module.agentworks_dev.database_connection_name
    DATABASE_NAME           = module.agentworks_dev.database_name
    CARD_EVENTS_TOPIC       = module.agentworks_dev.pubsub_topics["card_events"]
    AGENT_RUNS_TOPIC        = module.agentworks_dev.pubsub_topics["agent_runs"]
    USAGE_EVENTS_TOPIC      = module.agentworks_dev.pubsub_topics["usage_events"]
    LOGS_BUCKET             = module.agentworks_dev.storage_buckets["logs"]
    EXPORTS_BUCKET          = module.agentworks_dev.storage_buckets["exports"]
    UPLOADS_BUCKET          = module.agentworks_dev.storage_buckets["uploads"]
  }
  sensitive = false
}

# Complete configuration for application setup
output "application_config" {
  description = "Complete application configuration"
  value       = module.agentworks_dev.application_config
  sensitive   = true
}

# Deployment information
output "deployment_info" {
  description = "Deployment configuration"
  value       = module.agentworks_dev.deployment_info
}