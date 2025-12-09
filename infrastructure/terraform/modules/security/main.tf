# Security Module - Secret Manager and IAM

# Enable required APIs
resource "google_project_service" "secretmanager_api" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam_api" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

# Generate random database password
resource "random_password" "database_password" {
  length  = 32
  special = true
}

# Generate JWT signing key
resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

# Generate session encryption key
resource "random_password" "session_secret" {
  length  = 32
  special = false
}

# Database URL secret
resource "google_secret_manager_secret" "database_url" {
  secret_id = "${var.name_prefix}-database-url"
  
  labels = merge(var.common_labels, {
    type = "database"
  })
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = var.database_url
}

# Database password secret
resource "google_secret_manager_secret" "database_password" {
  secret_id = "${var.name_prefix}-database-password"
  
  labels = merge(var.common_labels, {
    type = "database"
  })
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "database_password" {
  secret      = google_secret_manager_secret.database_password.id
  secret_data = random_password.database_password.result
}

# JWT signing secret
resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "${var.name_prefix}-jwt-secret"
  
  labels = merge(var.common_labels, {
    type = "auth"
  })
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

# Session encryption secret
resource "google_secret_manager_secret" "session_secret" {
  secret_id = "${var.name_prefix}-session-secret"
  
  labels = merge(var.common_labels, {
    type = "auth"
  })
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "session_secret" {
  secret      = google_secret_manager_secret.session_secret.id
  secret_data = random_password.session_secret.result
}

# OpenAI API Key
resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "${var.name_prefix}-openai-api-key"
  
  labels = merge(var.common_labels, {
    type     = "llm_provider"
    provider = "openai"
  })
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "openai_api_key" {
  count = var.openai_api_key != "" ? 1 : 0
  
  secret      = google_secret_manager_secret.openai_api_key.id
  secret_data = var.openai_api_key
}

# Anthropic API Key
resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "${var.name_prefix}-anthropic-api-key"
  
  labels = merge(var.common_labels, {
    type     = "llm_provider"
    provider = "anthropic"
  })
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "anthropic_api_key" {
  count = var.anthropic_api_key != "" ? 1 : 0
  
  secret      = google_secret_manager_secret.anthropic_api_key.id
  secret_data = var.anthropic_api_key
}

# Google AI API Key
resource "google_secret_manager_secret" "google_ai_api_key" {
  secret_id = "${var.name_prefix}-google-ai-api-key"
  
  labels = merge(var.common_labels, {
    type     = "llm_provider"
    provider = "google"
  })
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "google_ai_api_key" {
  count = var.google_ai_api_key != "" ? 1 : 0
  
  secret      = google_secret_manager_secret.google_ai_api_key.id
  secret_data = var.google_ai_api_key
}

# Nano Banana API Key
resource "google_secret_manager_secret" "nanobanana_api_key" {
  secret_id = "${var.name_prefix}-nanobanana-api-key"
  
  labels = merge(var.common_labels, {
    type     = "llm_provider"
    provider = "nanobanana"
  })
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "nanobanana_api_key" {
  count = var.nanobanana_api_key != "" ? 1 : 0
  
  secret      = google_secret_manager_secret.nanobanana_api_key.id
  secret_data = var.nanobanana_api_key
}

# Stripe Secret Key
resource "google_secret_manager_secret" "stripe_secret_key" {
  secret_id = "${var.name_prefix}-stripe-secret-key"
  
  labels = merge(var.common_labels, {
    type     = "billing"
    provider = "stripe"
  })
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "stripe_secret_key" {
  count = var.stripe_secret_key != "" ? 1 : 0
  
  secret      = google_secret_manager_secret.stripe_secret_key.id
  secret_data = var.stripe_secret_key
}

# Stripe Publishable Key
resource "google_secret_manager_secret" "stripe_publishable_key" {
  secret_id = "${var.name_prefix}-stripe-publishable-key"
  
  labels = merge(var.common_labels, {
    type     = "billing"
    provider = "stripe"
  })
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "stripe_publishable_key" {
  count = var.stripe_publishable_key != "" ? 1 : 0
  
  secret      = google_secret_manager_secret.stripe_publishable_key.id
  secret_data = var.stripe_publishable_key
}

# Service Account for Cloud Run services
resource "google_service_account" "cloud_run_sa" {
  account_id   = "${var.name_prefix}-cloud-run"
  display_name = "Cloud Run Service Account for ${var.environment}"
  description  = "Service account for Cloud Run services in ${var.environment} environment"
}

# Service Account for Cloud Build
resource "google_service_account" "cloud_build_sa" {
  account_id   = "${var.name_prefix}-cloud-build"
  display_name = "Cloud Build Service Account for ${var.environment}"
  description  = "Service account for Cloud Build in ${var.environment} environment"
}

# IAM roles for Cloud Run service account
resource "google_project_iam_member" "cloud_run_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_trace" {
  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# IAM roles for Cloud Build service account
resource "google_project_iam_member" "cloud_build_dev" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.builder"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

resource "google_project_iam_member" "cloud_build_run_dev" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

resource "google_project_iam_member" "cloud_build_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

resource "google_project_iam_member" "cloud_build_storage" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.cloud_build_sa.email}"
}

# Secret access policies for specific secrets
resource "google_secret_manager_secret_iam_member" "database_url_access" {
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "database_password_access" {
  secret_id = google_secret_manager_secret.database_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "jwt_secret_access" {
  secret_id = google_secret_manager_secret.jwt_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "session_secret_access" {
  secret_id = google_secret_manager_secret.session_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Custom IAM role for AgentWorks services
resource "google_project_iam_custom_role" "agentworks_service_role" {
  role_id     = "${replace(var.name_prefix, "-", "_")}_service_role"
  title       = "AgentWorks Service Role"
  description = "Custom role for AgentWorks services with minimal required permissions"
  
  permissions = [
    # Firestore permissions
    "datastore.entities.create",
    "datastore.entities.delete",
    "datastore.entities.get",
    "datastore.entities.list",
    "datastore.entities.update",
    
    # Additional Cloud Run permissions
    "run.services.get",
    "run.services.list",
    
    # Custom metrics
    "monitoring.timeSeries.create",
  ]
}

resource "google_project_iam_member" "cloud_run_custom_role" {
  project = var.project_id
  role    = google_project_iam_custom_role.agentworks_service_role.id
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}