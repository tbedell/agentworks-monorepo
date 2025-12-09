# Build Module Outputs

# Artifact Registry
output "repository_name" {
  description = "Artifact Registry repository name"
  value       = google_artifact_registry_repository.agentworks.name
}

output "repository_id" {
  description = "Artifact Registry repository ID"
  value       = google_artifact_registry_repository.agentworks.repository_id
}

output "repository_url" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.agentworks.name}"
}

# Cloud Build triggers
output "trigger_ids" {
  description = "Map of Cloud Build trigger IDs"
  value = merge(
    {
      main_branch   = google_cloudbuild_trigger.main_branch.id
      manual_deploy = google_cloudbuild_trigger.manual_deploy.id
    },
    var.enable_pr_triggers && var.environment != "prod" ? {
      pull_request = google_cloudbuild_trigger.pull_request[0].id
    } : {}
  )
}

output "trigger_names" {
  description = "Map of Cloud Build trigger names"
  value = merge(
    {
      main_branch   = google_cloudbuild_trigger.main_branch.name
      manual_deploy = google_cloudbuild_trigger.manual_deploy.name
    },
    var.enable_pr_triggers && var.environment != "prod" ? {
      pull_request = google_cloudbuild_trigger.pull_request[0].name
    } : {}
  )
}

# Service accounts
output "cloudbuild_service_account" {
  description = "Cloud Build service account email"
  value = var.use_custom_build_sa ? 
    google_service_account.cloudbuild_custom[0].email : 
    "${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

output "custom_build_sa_email" {
  description = "Custom Cloud Build service account email"
  value = var.use_custom_build_sa ? google_service_account.cloudbuild_custom[0].email : null
}

# Worker pool
output "worker_pool_name" {
  description = "Private worker pool name"
  value = var.enable_private_pool ? google_cloudbuild_worker_pool.private_pool[0].name : null
}

output "worker_pool_id" {
  description = "Private worker pool ID"
  value = var.enable_private_pool ? google_cloudbuild_worker_pool.private_pool[0].id : null
}

# Storage buckets
output "build_logs_bucket" {
  description = "Build logs bucket name"
  value = google_storage_bucket.build_logs.name
}

output "build_cache_bucket" {
  description = "Build cache bucket name"
  value = var.enable_build_cache ? google_storage_bucket.build_cache[0].name : null
}

# Secrets
output "github_token_secret_id" {
  description = "GitHub token secret ID"
  value = var.github_token != "" ? google_secret_manager_secret.github_token[0].secret_id : null
}

# Build configuration
output "build_config" {
  description = "Build configuration for CI/CD"
  value = {
    project_id        = var.project_id
    region           = var.region
    environment      = var.environment
    repository_url   = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.agentworks.name}"
    
    triggers = {
      main_branch = {
        id   = google_cloudbuild_trigger.main_branch.id
        name = google_cloudbuild_trigger.main_branch.name
      }
      manual_deploy = {
        id   = google_cloudbuild_trigger.manual_deploy.id
        name = google_cloudbuild_trigger.manual_deploy.name
      }
      pull_request = var.enable_pr_triggers && var.environment != "prod" ? {
        id   = google_cloudbuild_trigger.pull_request[0].id
        name = google_cloudbuild_trigger.pull_request[0].name
      } : null
    }
    
    storage = {
      logs_bucket  = google_storage_bucket.build_logs.name
      cache_bucket = var.enable_build_cache ? google_storage_bucket.build_cache[0].name : null
    }
    
    service_account = var.use_custom_build_sa ? 
      google_service_account.cloudbuild_custom[0].email : 
      "${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
      
    worker_pool = var.enable_private_pool ? {
      name = google_cloudbuild_worker_pool.private_pool[0].name
      id   = google_cloudbuild_worker_pool.private_pool[0].id
    } : null
  }
}

# Alert policies
output "alert_policy_names" {
  description = "Build monitoring alert policy names"
  value = var.enable_build_monitoring ? [
    google_monitoring_alert_policy.build_failures.name,
    google_monitoring_alert_policy.long_build_times.name
  ] : []
}

# Cloud Build URLs
output "build_urls" {
  description = "Cloud Build console URLs"
  value = {
    triggers     = "https://console.cloud.google.com/cloud-build/triggers?project=${var.project_id}"
    history      = "https://console.cloud.google.com/cloud-build/builds?project=${var.project_id}"
    repositories = "https://console.cloud.google.com/gcr/images/${var.project_id}?project=${var.project_id}"
    artifacts    = "https://console.cloud.google.com/artifacts/docker/${var.project_id}/${var.region}/${google_artifact_registry_repository.agentworks.name}?project=${var.project_id}"
  }
}

# Deployment commands
output "deployment_commands" {
  description = "Common deployment commands"
  value = {
    manual_trigger = "gcloud builds triggers run ${google_cloudbuild_trigger.manual_deploy.name} --branch=main --project=${var.project_id}"
    
    docker_build = join(" && ", [
      "docker build -t ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.agentworks.name}/SERVICE_NAME:TAG .",
      "docker push ${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.agentworks.name}/SERVICE_NAME:TAG"
    ])
    
    gcloud_deploy = join(" ", [
      "gcloud run deploy SERVICE_NAME",
      "--image=${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.agentworks.name}/SERVICE_NAME:TAG",
      "--region=${var.region}",
      "--project=${var.project_id}"
    ])
  }
}