# Cloud Run Module - All AgentWorks Services

# Enable required APIs
resource "google_project_service" "run_api" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "container_registry_api" {
  service            = "containerregistry.googleapis.com"
  disable_on_destroy = false
}

# Frontend Service (Next.js)
resource "google_cloud_run_service" "frontend" {
  name     = "${var.name_prefix}-frontend"
  location = var.region
  
  metadata {
    labels = merge(var.common_labels, {
      service = "frontend"
      tier    = "presentation"
    })
    
    annotations = {
      "run.googleapis.com/ingress" = "all"
    }
  }
  
  template {
    metadata {
      labels = merge(var.common_labels, {
        service = "frontend"
      })
      
      annotations = {
        "autoscaling.knative.dev/minScale"      = var.min_instances
        "autoscaling.knative.dev/maxScale"      = var.max_instances
        "run.googleapis.com/vpc-access-connector" = var.vpc_connector_id
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
        "run.googleapis.com/cpu-throttling"      = "false"
      }
    }
    
    spec {
      service_account_name = var.service_account_email
      container_concurrency = var.concurrency
      timeout_seconds      = 300
      
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/frontend:latest"
        
        ports {
          container_port = 3000
          name          = "http1"
        }
        
        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
        
        env {
          name  = "NODE_ENV"
          value = var.environment == "prod" ? "production" : "development"
        }
        
        env {
          name  = "NEXT_PUBLIC_API_URL"
          value = "https://${google_cloud_run_service.api_gateway.status[0].url}"
        }
        
        env {
          name  = "NEXT_PUBLIC_ENVIRONMENT"
          value = var.environment
        }
        
        # Stripe public key for billing
        env {
          name = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
          value_from {
            secret_key_ref {
              name = var.stripe_publishable_key_secret
              key  = "latest"
            }
          }
        }
        
        # Health check configuration
        liveness_probe {
          http_get {
            path = "/api/health"
            port = 3000
          }
          initial_delay_seconds = 30
          timeout_seconds      = 5
          period_seconds       = 30
          failure_threshold    = 3
        }
        
        startup_probe {
          http_get {
            path = "/api/health"
            port = 3000
          }
          initial_delay_seconds = 10
          timeout_seconds      = 5
          period_seconds       = 10
          failure_threshold    = 10
        }
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [google_project_service.run_api]
}

# API Gateway Service (Fastify)
resource "google_cloud_run_service" "api_gateway" {
  name     = "${var.name_prefix}-api-gateway"
  location = var.region
  
  metadata {
    labels = merge(var.common_labels, {
      service = "api-gateway"
      tier    = "gateway"
    })
    
    annotations = {
      "run.googleapis.com/ingress" = "all"
    }
  }
  
  template {
    metadata {
      labels = merge(var.common_labels, {
        service = "api-gateway"
      })
      
      annotations = {
        "autoscaling.knative.dev/minScale"        = var.min_instances
        "autoscaling.knative.dev/maxScale"        = var.max_instances
        "run.googleapis.com/vpc-access-connector" = var.vpc_connector_id
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
        "run.googleapis.com/cpu-throttling"      = "false"
        "run.googleapis.com/cloudsql-instances"  = var.database_connection_name
      }
    }
    
    spec {
      service_account_name = var.service_account_email
      container_concurrency = var.concurrency
      timeout_seconds      = 300
      
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/api-gateway:latest"
        
        ports {
          container_port = 8080
          name          = "http1"
        }
        
        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
        
        # Environment variables
        env {
          name  = "NODE_ENV"
          value = var.environment == "prod" ? "production" : "development"
        }
        
        env {
          name  = "PORT"
          value = "8080"
        }
        
        env {
          name  = "PROJECT_ID"
          value = var.project_id
        }
        
        env {
          name  = "ENVIRONMENT"
          value = var.environment
        }
        
        env {
          name  = "REGION"
          value = var.region
        }
        
        # Database connection
        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = var.database_url_secret
              key  = "latest"
            }
          }
        }
        
        # JWT and session secrets
        env {
          name = "JWT_SECRET"
          value_from {
            secret_key_ref {
              name = var.jwt_secret
              key  = "latest"
            }
          }
        }
        
        env {
          name = "SESSION_SECRET"
          value_from {
            secret_key_ref {
              name = var.session_secret
              key  = "latest"
            }
          }
        }
        
        # Internal service URLs
        env {
          name  = "CORE_SERVICE_URL"
          value = google_cloud_run_service.core_service.status[0].url
        }
        
        env {
          name  = "AGENT_ORCHESTRATOR_URL"
          value = google_cloud_run_service.agent_orchestrator.status[0].url
        }
        
        env {
          name  = "LOG_STREAMING_URL"
          value = google_cloud_run_service.log_streaming.status[0].url
        }
        
        # Pub/Sub topics
        env {
          name  = "CARD_EVENTS_TOPIC"
          value = var.card_events_topic
        }
        
        env {
          name  = "AGENT_RUNS_TOPIC"
          value = var.agent_runs_topic
        }
        
        # Health check
        liveness_probe {
          http_get {
            path = "/health"
            port = 8080
          }
          initial_delay_seconds = 30
          timeout_seconds      = 5
          period_seconds       = 30
          failure_threshold    = 3
        }
        
        startup_probe {
          http_get {
            path = "/health"
            port = 8080
          }
          initial_delay_seconds = 10
          timeout_seconds      = 5
          period_seconds       = 10
          failure_threshold    = 10
        }
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [google_project_service.run_api]
}

# Core Service (Data Layer)
resource "google_cloud_run_service" "core_service" {
  name     = "${var.name_prefix}-core-service"
  location = var.region
  
  metadata {
    labels = merge(var.common_labels, {
      service = "core-service"
      tier    = "data"
    })
    
    annotations = {
      "run.googleapis.com/ingress" = "internal"
    }
  }
  
  template {
    metadata {
      labels = merge(var.common_labels, {
        service = "core-service"
      })
      
      annotations = {
        "autoscaling.knative.dev/minScale"        = var.min_instances
        "autoscaling.knative.dev/maxScale"        = var.max_instances
        "run.googleapis.com/vpc-access-connector" = var.vpc_connector_id
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
        "run.googleapis.com/cpu-throttling"      = "false"
        "run.googleapis.com/cloudsql-instances"  = var.database_connection_name
      }
    }
    
    spec {
      service_account_name = var.service_account_email
      container_concurrency = var.concurrency
      timeout_seconds      = 300
      
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/core-service:latest"
        
        ports {
          container_port = 8000
          name          = "http1"
        }
        
        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
        
        # Environment variables
        env {
          name  = "NODE_ENV"
          value = var.environment == "prod" ? "production" : "development"
        }
        
        env {
          name  = "PORT"
          value = "8000"
        }
        
        env {
          name  = "PROJECT_ID"
          value = var.project_id
        }
        
        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = var.database_url_secret
              key  = "latest"
            }
          }
        }
        
        # Health check
        liveness_probe {
          http_get {
            path = "/health"
            port = 8000
          }
          initial_delay_seconds = 30
          timeout_seconds      = 5
          period_seconds       = 30
          failure_threshold    = 3
        }
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [google_project_service.run_api]
}

# Agent Orchestrator Service
resource "google_cloud_run_service" "agent_orchestrator" {
  name     = "${var.name_prefix}-agent-orchestrator"
  location = var.region
  
  metadata {
    labels = merge(var.common_labels, {
      service = "agent-orchestrator"
      tier    = "orchestration"
    })
    
    annotations = {
      "run.googleapis.com/ingress" = "internal"
    }
  }
  
  template {
    metadata {
      labels = merge(var.common_labels, {
        service = "agent-orchestrator"
      })
      
      annotations = {
        "autoscaling.knative.dev/minScale"        = var.min_instances
        "autoscaling.knative.dev/maxScale"        = var.max_instances
        "run.googleapis.com/vpc-access-connector" = var.vpc_connector_id
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
        "run.googleapis.com/cpu-throttling"      = "false"
      }
    }
    
    spec {
      service_account_name = var.service_account_email
      container_concurrency = var.concurrency
      timeout_seconds      = 600  # Longer timeout for LLM calls
      
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/agent-orchestrator:latest"
        
        ports {
          container_port = 8001
          name          = "http1"
        }
        
        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
        
        # Environment variables
        env {
          name  = "NODE_ENV"
          value = var.environment == "prod" ? "production" : "development"
        }
        
        env {
          name  = "PORT"
          value = "8001"
        }
        
        env {
          name  = "PROJECT_ID"
          value = var.project_id
        }
        
        env {
          name  = "CORE_SERVICE_URL"
          value = google_cloud_run_service.core_service.status[0].url
        }
        
        env {
          name  = "PROVIDER_ROUTER_URL"
          value = google_cloud_run_service.provider_router.status[0].url
        }
        
        # Pub/Sub configuration
        env {
          name  = "CARD_EVENTS_SUBSCRIPTION"
          value = var.card_events_subscription
        }
        
        env {
          name  = "AGENT_RUNS_TOPIC"
          value = var.agent_runs_topic
        }
        
        # Health check
        liveness_probe {
          http_get {
            path = "/health"
            port = 8001
          }
          initial_delay_seconds = 30
          timeout_seconds      = 5
          period_seconds       = 30
          failure_threshold    = 3
        }
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [google_project_service.run_api]
}

# Provider Router Service
resource "google_cloud_run_service" "provider_router" {
  name     = "${var.name_prefix}-provider-router"
  location = var.region
  
  metadata {
    labels = merge(var.common_labels, {
      service = "provider-router"
      tier    = "integration"
    })
    
    annotations = {
      "run.googleapis.com/ingress" = "internal"
    }
  }
  
  template {
    metadata {
      labels = merge(var.common_labels, {
        service = "provider-router"
      })
      
      annotations = {
        "autoscaling.knative.dev/minScale"        = var.min_instances
        "autoscaling.knative.dev/maxScale"        = var.max_instances
        "run.googleapis.com/vpc-access-connector" = var.vpc_connector_id
        "run.googleapis.com/vpc-access-egress"    = "all"  # Needs internet access for LLM providers
        "run.googleapis.com/cpu-throttling"      = "false"
      }
    }
    
    spec {
      service_account_name = var.service_account_email
      container_concurrency = var.concurrency
      timeout_seconds      = 900  # Longer timeout for LLM providers
      
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/provider-router:latest"
        
        ports {
          container_port = 8002
          name          = "http1"
        }
        
        resources {
          limits = {
            cpu    = "2"      # More CPU for LLM processing
            memory = "2Gi"    # More memory for large contexts
          }
        }
        
        # Environment variables
        env {
          name  = "NODE_ENV"
          value = var.environment == "prod" ? "production" : "development"
        }
        
        env {
          name  = "PORT"
          value = "8002"
        }
        
        env {
          name  = "PROJECT_ID"
          value = var.project_id
        }
        
        # LLM Provider API Keys
        env {
          name = "OPENAI_API_KEY"
          value_from {
            secret_key_ref {
              name = var.openai_api_key_secret
              key  = "latest"
            }
          }
        }
        
        env {
          name = "ANTHROPIC_API_KEY"
          value_from {
            secret_key_ref {
              name = var.anthropic_api_key_secret
              key  = "latest"
            }
          }
        }
        
        env {
          name = "GOOGLE_AI_API_KEY"
          value_from {
            secret_key_ref {
              name = var.google_ai_api_key_secret
              key  = "latest"
            }
          }
        }
        
        env {
          name = "NANOBANANA_API_KEY"
          value_from {
            secret_key_ref {
              name = var.nanobanana_api_key_secret
              key  = "latest"
            }
          }
        }
        
        # Usage tracking
        env {
          name  = "USAGE_EVENTS_TOPIC"
          value = var.usage_events_topic
        }
        
        # Health check
        liveness_probe {
          http_get {
            path = "/health"
            port = 8002
          }
          initial_delay_seconds = 30
          timeout_seconds      = 5
          period_seconds       = 30
          failure_threshold    = 3
        }
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [google_project_service.run_api]
}

# Log Streaming Service
resource "google_cloud_run_service" "log_streaming" {
  name     = "${var.name_prefix}-log-streaming"
  location = var.region
  
  metadata {
    labels = merge(var.common_labels, {
      service = "log-streaming"
      tier    = "observability"
    })
    
    annotations = {
      "run.googleapis.com/ingress" = "internal"
    }
  }
  
  template {
    metadata {
      labels = merge(var.common_labels, {
        service = "log-streaming"
      })
      
      annotations = {
        "autoscaling.knative.dev/minScale"        = var.min_instances
        "autoscaling.knative.dev/maxScale"        = var.max_instances
        "run.googleapis.com/vpc-access-connector" = var.vpc_connector_id
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
        "run.googleapis.com/cpu-throttling"      = "false"
      }
    }
    
    spec {
      service_account_name = var.service_account_email
      container_concurrency = 50  # Lower concurrency for WebSocket connections
      timeout_seconds      = 3600 # Long timeout for persistent connections
      
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/log-streaming:latest"
        
        ports {
          container_port = 8003
          name          = "http1"
        }
        
        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
        
        # Environment variables
        env {
          name  = "NODE_ENV"
          value = var.environment == "prod" ? "production" : "development"
        }
        
        env {
          name  = "PORT"
          value = "8003"
        }
        
        env {
          name  = "PROJECT_ID"
          value = var.project_id
        }
        
        # Pub/Sub configuration for log events
        env {
          name  = "AGENT_RUNS_SUBSCRIPTION"
          value = var.agent_runs_subscription
        }
        
        # Storage for log persistence
        env {
          name  = "LOGS_BUCKET"
          value = var.logs_bucket
        }
        
        # Health check
        liveness_probe {
          http_get {
            path = "/health"
            port = 8003
          }
          initial_delay_seconds = 30
          timeout_seconds      = 5
          period_seconds       = 30
          failure_threshold    = 3
        }
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [google_project_service.run_api]
}

# Billing Service
resource "google_cloud_run_service" "billing_service" {
  name     = "${var.name_prefix}-billing-service"
  location = var.region
  
  metadata {
    labels = merge(var.common_labels, {
      service = "billing-service"
      tier    = "business"
    })
    
    annotations = {
      "run.googleapis.com/ingress" = "internal"
    }
  }
  
  template {
    metadata {
      labels = merge(var.common_labels, {
        service = "billing-service"
      })
      
      annotations = {
        "autoscaling.knative.dev/minScale"        = var.min_instances
        "autoscaling.knative.dev/maxScale"        = var.max_instances
        "run.googleapis.com/vpc-access-connector" = var.vpc_connector_id
        "run.googleapis.com/vpc-access-egress"    = "all"  # Needs internet access for Stripe
        "run.googleapis.com/cpu-throttling"      = "false"
        "run.googleapis.com/cloudsql-instances"  = var.database_connection_name
      }
    }
    
    spec {
      service_account_name = var.service_account_email
      container_concurrency = var.concurrency
      timeout_seconds      = 300
      
      containers {
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/billing-service:latest"
        
        ports {
          container_port = 8004
          name          = "http1"
        }
        
        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
        
        # Environment variables
        env {
          name  = "NODE_ENV"
          value = var.environment == "prod" ? "production" : "development"
        }
        
        env {
          name  = "PORT"
          value = "8004"
        }
        
        env {
          name  = "PROJECT_ID"
          value = var.project_id
        }
        
        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = var.database_url_secret
              key  = "latest"
            }
          }
        }
        
        # Stripe configuration
        env {
          name = "STRIPE_SECRET_KEY"
          value_from {
            secret_key_ref {
              name = var.stripe_secret_key_secret
              key  = "latest"
            }
          }
        }
        
        # Usage events subscription
        env {
          name  = "USAGE_EVENTS_SUBSCRIPTION"
          value = var.usage_events_subscription
        }
        
        # Health check
        liveness_probe {
          http_get {
            path = "/health"
            port = 8004
          }
          initial_delay_seconds = 30
          timeout_seconds      = 5
          period_seconds       = 30
          failure_threshold    = 3
        }
      }
    }
  }
  
  traffic {
    percent         = 100
    latest_revision = true
  }
  
  depends_on = [google_project_service.run_api]
}

# IAM policy for public access to frontend and API gateway
data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

resource "google_cloud_run_service_iam_policy" "frontend_noauth" {
  location = google_cloud_run_service.frontend.location
  project  = google_cloud_run_service.frontend.project
  service  = google_cloud_run_service.frontend.name
  
  policy_data = data.google_iam_policy.noauth.policy_data
}

resource "google_cloud_run_service_iam_policy" "api_gateway_noauth" {
  location = google_cloud_run_service.api_gateway.location
  project  = google_cloud_run_service.api_gateway.project
  service  = google_cloud_run_service.api_gateway.name
  
  policy_data = data.google_iam_policy.noauth.policy_data
}

# Internal service-to-service IAM
data "google_iam_policy" "internal_access" {
  binding {
    role = "roles/run.invoker"
    members = [
      "serviceAccount:${var.service_account_email}",
    ]
  }
}

resource "google_cloud_run_service_iam_policy" "core_service_internal" {
  location = google_cloud_run_service.core_service.location
  project  = google_cloud_run_service.core_service.project
  service  = google_cloud_run_service.core_service.name
  
  policy_data = data.google_iam_policy.internal_access.policy_data
}

resource "google_cloud_run_service_iam_policy" "agent_orchestrator_internal" {
  location = google_cloud_run_service.agent_orchestrator.location
  project  = google_cloud_run_service.agent_orchestrator.project
  service  = google_cloud_run_service.agent_orchestrator.name
  
  policy_data = data.google_iam_policy.internal_access.policy_data
}

resource "google_cloud_run_service_iam_policy" "provider_router_internal" {
  location = google_cloud_run_service.provider_router.location
  project  = google_cloud_run_service.provider_router.project
  service  = google_cloud_run_service.provider_router.name
  
  policy_data = data.google_iam_policy.internal_access.policy_data
}

resource "google_cloud_run_service_iam_policy" "log_streaming_internal" {
  location = google_cloud_run_service.log_streaming.location
  project  = google_cloud_run_service.log_streaming.project
  service  = google_cloud_run_service.log_streaming.name
  
  policy_data = data.google_iam_policy.internal_access.policy_data
}

resource "google_cloud_run_service_iam_policy" "billing_service_internal" {
  location = google_cloud_run_service.billing_service.location
  project  = google_cloud_run_service.billing_service.project
  service  = google_cloud_run_service.billing_service.name
  
  policy_data = data.google_iam_policy.internal_access.policy_data
}