# Cloud Run Module Outputs

# Service URLs
output "frontend_url" {
  description = "Frontend service URL"
  value       = google_cloud_run_service.frontend.status[0].url
}

output "api_gateway_url" {
  description = "API Gateway service URL"
  value       = google_cloud_run_service.api_gateway.status[0].url
}

output "core_service_url" {
  description = "Core service URL"
  value       = google_cloud_run_service.core_service.status[0].url
}

output "agent_orchestrator_url" {
  description = "Agent Orchestrator service URL"
  value       = google_cloud_run_service.agent_orchestrator.status[0].url
}

output "provider_router_url" {
  description = "Provider Router service URL"
  value       = google_cloud_run_service.provider_router.status[0].url
}

output "log_streaming_url" {
  description = "Log Streaming service URL"
  value       = google_cloud_run_service.log_streaming.status[0].url
}

output "billing_service_url" {
  description = "Billing service URL"
  value       = google_cloud_run_service.billing_service.status[0].url
}

# Service names
output "service_names" {
  description = "Map of service names"
  value = {
    frontend           = google_cloud_run_service.frontend.name
    api_gateway        = google_cloud_run_service.api_gateway.name
    core_service       = google_cloud_run_service.core_service.name
    agent_orchestrator = google_cloud_run_service.agent_orchestrator.name
    provider_router    = google_cloud_run_service.provider_router.name
    log_streaming      = google_cloud_run_service.log_streaming.name
    billing_service    = google_cloud_run_service.billing_service.name
  }
}

# Service IDs
output "service_ids" {
  description = "Map of service IDs"
  value = {
    frontend           = google_cloud_run_service.frontend.id
    api_gateway        = google_cloud_run_service.api_gateway.id
    core_service       = google_cloud_run_service.core_service.id
    agent_orchestrator = google_cloud_run_service.agent_orchestrator.id
    provider_router    = google_cloud_run_service.provider_router.id
    log_streaming      = google_cloud_run_service.log_streaming.id
    billing_service    = google_cloud_run_service.billing_service.id
  }
}

# Service locations
output "service_locations" {
  description = "Map of service locations"
  value = {
    frontend           = google_cloud_run_service.frontend.location
    api_gateway        = google_cloud_run_service.api_gateway.location
    core_service       = google_cloud_run_service.core_service.location
    agent_orchestrator = google_cloud_run_service.agent_orchestrator.location
    provider_router    = google_cloud_run_service.provider_router.location
    log_streaming      = google_cloud_run_service.log_streaming.location
    billing_service    = google_cloud_run_service.billing_service.location
  }
}

# Public service URLs (for external access)
output "public_urls" {
  description = "Publicly accessible service URLs"
  value = {
    frontend    = google_cloud_run_service.frontend.status[0].url
    api_gateway = google_cloud_run_service.api_gateway.status[0].url
  }
}

# Internal service URLs (for service-to-service communication)
output "internal_urls" {
  description = "Internal service URLs"
  value = {
    core_service       = google_cloud_run_service.core_service.status[0].url
    agent_orchestrator = google_cloud_run_service.agent_orchestrator.status[0].url
    provider_router    = google_cloud_run_service.provider_router.status[0].url
    log_streaming      = google_cloud_run_service.log_streaming.status[0].url
    billing_service    = google_cloud_run_service.billing_service.status[0].url
  }
}

# Service configuration for deployment scripts
output "deployment_config" {
  description = "Service configuration for deployment"
  value = {
    frontend = {
      name     = google_cloud_run_service.frontend.name
      location = google_cloud_run_service.frontend.location
      url      = google_cloud_run_service.frontend.status[0].url
      image    = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/frontend:latest"
      port     = 3000
      public   = true
    }
    api_gateway = {
      name     = google_cloud_run_service.api_gateway.name
      location = google_cloud_run_service.api_gateway.location
      url      = google_cloud_run_service.api_gateway.status[0].url
      image    = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/api-gateway:latest"
      port     = 8080
      public   = true
    }
    core_service = {
      name     = google_cloud_run_service.core_service.name
      location = google_cloud_run_service.core_service.location
      url      = google_cloud_run_service.core_service.status[0].url
      image    = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/core-service:latest"
      port     = 8000
      public   = false
    }
    agent_orchestrator = {
      name     = google_cloud_run_service.agent_orchestrator.name
      location = google_cloud_run_service.agent_orchestrator.location
      url      = google_cloud_run_service.agent_orchestrator.status[0].url
      image    = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/agent-orchestrator:latest"
      port     = 8001
      public   = false
    }
    provider_router = {
      name     = google_cloud_run_service.provider_router.name
      location = google_cloud_run_service.provider_router.location
      url      = google_cloud_run_service.provider_router.status[0].url
      image    = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/provider-router:latest"
      port     = 8002
      public   = false
    }
    log_streaming = {
      name     = google_cloud_run_service.log_streaming.name
      location = google_cloud_run_service.log_streaming.location
      url      = google_cloud_run_service.log_streaming.status[0].url
      image    = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/log-streaming:latest"
      port     = 8003
      public   = false
    }
    billing_service = {
      name     = google_cloud_run_service.billing_service.name
      location = google_cloud_run_service.billing_service.location
      url      = google_cloud_run_service.billing_service.status[0].url
      image    = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/billing-service:latest"
      port     = 8004
      public   = false
    }
  }
}