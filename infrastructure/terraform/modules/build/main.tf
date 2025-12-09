# Build Module - Cloud Build CI/CD Pipeline

# Enable required APIs
resource "google_project_service" "cloudbuild_api" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "sourcerepo_api" {
  service            = "sourcerepo.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifactregistry_api" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

# Artifact Registry repository for container images
resource "google_artifact_registry_repository" "agentworks" {
  location      = var.region
  repository_id = "${var.name_prefix}-repo"
  description   = "AgentWorks container images for ${var.environment}"
  format        = "DOCKER"
  
  labels = var.common_labels
  
  depends_on = [google_project_service.artifactregistry_api]
}

# Cloud Build trigger for main branch
resource "google_cloudbuild_trigger" "main_branch" {
  name        = "${var.name_prefix}-main-deploy"
  description = "Deploy to ${var.environment} on main branch push"
  
  github {
    owner = var.github_repo_owner
    name  = var.github_repo_name
    
    push {
      branch = var.environment == "prod" ? "^main$" : "^${var.environment}$"
    }
  }
  
  substitutions = {
    _PROJECT_ID           = var.project_id
    _REGION              = var.region
    _ENVIRONMENT         = var.environment
    _ARTIFACT_REGISTRY   = google_artifact_registry_repository.agentworks.name
    _SERVICE_ACCOUNT     = var.service_account_email
  }
  
  filename = "cloudbuild.yaml"
  
  depends_on = [google_project_service.cloudbuild_api]
}

# Cloud Build trigger for pull requests (staging/testing)
resource "google_cloudbuild_trigger" "pull_request" {
  count = var.environment != "prod" ? 1 : 0
  
  name        = "${var.name_prefix}-pr-test"
  description = "Test build on pull requests"
  
  github {
    owner = var.github_repo_owner
    name  = var.github_repo_name
    
    pull_request {
      branch = ".*"
    }
  }
  
  substitutions = {
    _PROJECT_ID           = var.project_id
    _REGION              = var.region
    _ENVIRONMENT         = "test"
    _ARTIFACT_REGISTRY   = google_artifact_registry_repository.agentworks.name
    _SERVICE_ACCOUNT     = var.service_account_email
    _SKIP_DEPLOY         = "true"
  }
  
  filename = "cloudbuild.yaml"
  
  depends_on = [google_project_service.cloudbuild_api]
}

# Manual trigger for hotfixes
resource "google_cloudbuild_trigger" "manual_deploy" {
  name        = "${var.name_prefix}-manual-deploy"
  description = "Manual deployment trigger for ${var.environment}"
  disabled    = false
  
  source_to_build {
    uri       = "https://github.com/${var.github_repo_owner}/${var.github_repo_name}"
    ref       = "refs/heads/main"
    repo_type = "GITHUB"
  }
  
  substitutions = {
    _PROJECT_ID           = var.project_id
    _REGION              = var.region
    _ENVIRONMENT         = var.environment
    _ARTIFACT_REGISTRY   = google_artifact_registry_repository.agentworks.name
    _SERVICE_ACCOUNT     = var.service_account_email
    _MANUAL_TRIGGER      = "true"
  }
  
  filename = "cloudbuild.yaml"
  
  depends_on = [google_project_service.cloudbuild_api]
}

# Cloud Build configuration file
resource "local_file" "cloudbuild_config" {
  filename = "${path.root}/../cloudbuild.yaml"
  
  content = templatefile("${path.module}/templates/cloudbuild.yaml.tpl", {
    project_id         = var.project_id
    region            = var.region
    artifact_registry = google_artifact_registry_repository.agentworks.name
    services = [
      "frontend",
      "api-gateway", 
      "core-service",
      "agent-orchestrator",
      "provider-router",
      "log-streaming",
      "billing-service"
    ]
  })
}

# IAM permissions for Cloud Build service account
resource "google_project_iam_member" "cloudbuild_editor" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
  
  depends_on = [google_project_service.cloudbuild_api]
}

resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

# Custom Cloud Build service account (optional, more secure)
resource "google_service_account" "cloudbuild_custom" {
  count = var.use_custom_build_sa ? 1 : 0
  
  account_id   = "${var.name_prefix}-cloudbuild"
  display_name = "Custom Cloud Build SA for ${var.environment}"
  description  = "Service account for Cloud Build with minimal required permissions"
}

resource "google_project_iam_member" "custom_cloudbuild_permissions" {
  for_each = var.use_custom_build_sa ? toset(var.build_sa_roles) : toset([])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.cloudbuild_custom[0].email}"
}

# Artifact Registry IAM
resource "google_artifact_registry_repository_iam_member" "cloudbuild_writer" {
  location   = google_artifact_registry_repository.agentworks.location
  repository = google_artifact_registry_repository.agentworks.name
  role       = "roles/artifactregistry.writer"
  member     = var.use_custom_build_sa ? 
    "serviceAccount:${google_service_account.cloudbuild_custom[0].email}" :
    "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

# Cloud Build pool for private builds (optional)
resource "google_cloudbuild_worker_pool" "private_pool" {
  count = var.enable_private_pool ? 1 : 0
  
  name     = "${var.name_prefix}-private-pool"
  location = var.region
  
  worker_config {
    disk_size_gb   = 100
    machine_type   = "e2-medium"
    no_external_ip = true
  }
  
  network_config {
    peered_network = var.vpc_network_id
  }
  
  depends_on = [google_project_service.cloudbuild_api]
}

# Secret Manager secrets for build process
resource "google_secret_manager_secret" "github_token" {
  count = var.github_token != "" ? 1 : 0
  
  secret_id = "${var.name_prefix}-github-token"
  
  replication {
    auto {}
  }
  
  labels = merge(var.common_labels, {
    type = "build_secret"
  })
}

resource "google_secret_manager_secret_version" "github_token" {
  count = var.github_token != "" ? 1 : 0
  
  secret      = google_secret_manager_secret.github_token[0].id
  secret_data = var.github_token
}

# Cloud Build logs bucket
resource "google_storage_bucket" "build_logs" {
  name     = "${var.name_prefix}-build-logs-${random_id.build_suffix.hex}"
  location = var.region
  
  storage_class = "STANDARD"
  
  uniform_bucket_level_access = true
  
  lifecycle_rule {
    condition {
      age = var.build_logs_retention_days
    }
    action {
      type = "Delete"
    }
  }
  
  # Move to cheaper storage after 7 days
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
  
  labels = merge(var.common_labels, {
    type    = "build_logs"
    purpose = "ci_cd"
  })
}

# Build cache bucket
resource "google_storage_bucket" "build_cache" {
  count = var.enable_build_cache ? 1 : 0
  
  name     = "${var.name_prefix}-build-cache-${random_id.build_suffix.hex}"
  location = var.region
  
  storage_class = "STANDARD"
  
  uniform_bucket_level_access = true
  
  lifecycle_rule {
    condition {
      age = var.build_cache_retention_days
    }
    action {
      type = "Delete"
    }
  }
  
  labels = merge(var.common_labels, {
    type    = "build_cache"
    purpose = "ci_cd_optimization"
  })
}

# Random suffix for bucket names
resource "random_id" "build_suffix" {
  byte_length = 4
}

# Build monitoring
resource "google_monitoring_alert_policy" "build_failures" {
  display_name = "${var.name_prefix} Build Failures"
  combiner     = "OR"
  
  conditions {
    display_name = "Build failure rate > 20%"
    
    condition_threshold {
      filter = "resource.type=\"build\" AND metric.type=\"cloudbuild.googleapis.com/build/count\""
      
      duration   = "300s"
      comparison = "GREATER_THAN"
      threshold_value = 0.2
      
      aggregations {
        alignment_period     = "300s"
        per_series_aligner  = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields     = ["metric.labels.status"]
      }
      
      denominator_filter = "resource.type=\"build\" AND metric.type=\"cloudbuild.googleapis.com/build/count\""
      
      denominator_aggregations {
        alignment_period     = "300s"
        per_series_aligner  = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "1800s"
  }
  
  documentation {
    content = "High rate of build failures detected. Check build logs and dependencies."
  }
}

resource "google_monitoring_alert_policy" "long_build_times" {
  display_name = "${var.name_prefix} Long Build Times"
  combiner     = "OR"
  
  conditions {
    display_name = "Build duration > 20 minutes"
    
    condition_threshold {
      filter = "resource.type=\"build\" AND metric.type=\"cloudbuild.googleapis.com/build/duration\""
      
      duration   = "60s"
      comparison = "GREATER_THAN"
      threshold_value = 1200  # 20 minutes in seconds
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_DELTA"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "3600s"
  }
  
  documentation {
    content = "Build taking longer than expected. Check for resource constraints or dependency issues."
  }
}

# Data source for project information
data "google_project" "current" {
  project_id = var.project_id
}