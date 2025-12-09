# Storage Module - Cloud Storage buckets

# Enable Cloud Storage API
resource "google_project_service" "storage_api" {
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

# Random suffix for bucket names to ensure global uniqueness
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Logs storage bucket
resource "google_storage_bucket" "logs" {
  name     = "${var.name_prefix}-logs-${random_id.bucket_suffix.hex}"
  location = var.region
  
  # Storage class for cost optimization
  storage_class = var.environment == "prod" ? "STANDARD" : "NEARLINE"
  
  # Uniform bucket-level access
  uniform_bucket_level_access = true
  
  # Versioning for important logs
  versioning {
    enabled = var.environment == "prod"
  }
  
  # Lifecycle management
  lifecycle_rule {
    condition {
      age = var.logs_retention_days
    }
    action {
      type = "Delete"
    }
  }
  
  # Archive old logs for compliance
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
  
  # CORS configuration for web uploads
  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
  
  # Labels
  labels = merge(var.common_labels, {
    type    = "logs"
    purpose = "application_logs"
  })
  
  depends_on = [google_project_service.storage_api]
}

# Exports storage bucket for reports and backups
resource "google_storage_bucket" "exports" {
  name     = "${var.name_prefix}-exports-${random_id.bucket_suffix.hex}"
  location = var.region
  
  # Standard storage for active exports
  storage_class = "STANDARD"
  
  # Uniform bucket-level access
  uniform_bucket_level_access = true
  
  # Versioning enabled
  versioning {
    enabled = true
  }
  
  # Lifecycle management
  lifecycle_rule {
    condition {
      age = var.exports_retention_days
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
  
  # Archive after 30 days
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
  
  # CORS configuration
  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "PUT", "POST"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
  
  # Labels
  labels = merge(var.common_labels, {
    type    = "exports"
    purpose = "data_exports"
  })
  
  depends_on = [google_project_service.storage_api]
}

# User uploads storage bucket
resource "google_storage_bucket" "uploads" {
  name     = "${var.name_prefix}-uploads-${random_id.bucket_suffix.hex}"
  location = var.region
  
  # Standard storage for user uploads
  storage_class = "STANDARD"
  
  # Uniform bucket-level access
  uniform_bucket_level_access = true
  
  # Versioning for user content
  versioning {
    enabled = var.enable_upload_versioning
  }
  
  # Lifecycle management
  lifecycle_rule {
    condition {
      age = var.uploads_retention_days
    }
    action {
      type = "Delete"
    }
  }
  
  # Move to cheaper storage after retention period
  dynamic "lifecycle_rule" {
    for_each = var.environment == "prod" ? [1] : []
    content {
      condition {
        age = 90  # 3 months
      }
      action {
        type          = "SetStorageClass"
        storage_class = "NEARLINE"
      }
    }
  }
  
  # CORS configuration for file uploads
  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*", "Content-Type", "x-goog-resumable"]
    max_age_seconds = 3600
  }
  
  # Public access prevention
  public_access_prevention = "enforced"
  
  # Labels
  labels = merge(var.common_labels, {
    type    = "uploads"
    purpose = "user_content"
  })
  
  depends_on = [google_project_service.storage_api]
}

# Terraform state storage bucket (for remote state)
resource "google_storage_bucket" "terraform_state" {
  count = var.create_terraform_state_bucket ? 1 : 0
  
  name     = "${var.name_prefix}-terraform-state-${random_id.bucket_suffix.hex}"
  location = var.region
  
  # Standard storage for state files
  storage_class = "STANDARD"
  
  # Uniform bucket-level access
  uniform_bucket_level_access = true
  
  # Versioning is critical for state files
  versioning {
    enabled = true
  }
  
  # Lifecycle management for state files
  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }
  
  # Public access prevention
  public_access_prevention = "enforced"
  
  # Labels
  labels = merge(var.common_labels, {
    type    = "terraform_state"
    purpose = "infrastructure"
  })
  
  depends_on = [google_project_service.storage_api]
}

# Static assets bucket for CDN (optional)
resource "google_storage_bucket" "static_assets" {
  count = var.enable_cdn ? 1 : 0
  
  name     = "${var.name_prefix}-static-assets-${random_id.bucket_suffix.hex}"
  location = var.multi_region_location
  
  # Multi-regional for CDN
  storage_class = "STANDARD"
  
  # Uniform bucket-level access
  uniform_bucket_level_access = true
  
  # No versioning needed for static assets
  versioning {
    enabled = false
  }
  
  # Website configuration for static hosting
  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }
  
  # CORS configuration for web assets
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["*"]
    max_age_seconds = 86400  # 24 hours
  }
  
  # Labels
  labels = merge(var.common_labels, {
    type    = "static_assets"
    purpose = "cdn_content"
  })
  
  depends_on = [google_project_service.storage_api]
}

# IAM bindings for Cloud Run services
resource "google_storage_bucket_iam_member" "logs_admin" {
  bucket = google_storage_bucket.logs.name
  role   = "roles/storage.admin"
  member = "serviceAccount:${var.service_account_email}"
}

resource "google_storage_bucket_iam_member" "exports_admin" {
  bucket = google_storage_bucket.exports.name
  role   = "roles/storage.admin"
  member = "serviceAccount:${var.service_account_email}"
}

resource "google_storage_bucket_iam_member" "uploads_admin" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.admin"
  member = "serviceAccount:${var.service_account_email}"
}

# Public read access for static assets (if CDN enabled)
resource "google_storage_bucket_iam_member" "static_assets_public" {
  count = var.enable_cdn ? 1 : 0
  
  bucket = google_storage_bucket.static_assets[0].name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Cloud Storage notification for processing
resource "google_storage_notification" "upload_notification" {
  bucket         = google_storage_bucket.uploads.name
  payload_format = "JSON_API_V1"
  topic          = var.upload_notification_topic
  event_types    = ["OBJECT_FINALIZE"]
  
  custom_attributes = {
    environment = var.environment
    bucket_type = "uploads"
  }
  
  depends_on = [var.upload_notification_topic_iam]
}

# Bucket monitoring
resource "google_monitoring_alert_policy" "storage_usage" {
  display_name = "${var.name_prefix} Storage Usage Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "High storage usage"
    
    condition_threshold {
      filter          = "resource.type=\"gcs_bucket\""
      duration        = "300s"
      comparison      = "GREATER_THAN"
      threshold_value = var.storage_alert_threshold_gb * 1024 * 1024 * 1024  # Convert GB to bytes
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }
  
  notification_channels = var.notification_channels
  
  alert_strategy {
    auto_close = "86400s"  # 24 hours
  }
}

# Bucket access logging (for security)
resource "google_logging_bucket_config" "storage_logs" {
  count = var.enable_access_logging ? 1 : 0
  
  location   = var.region
  bucket_id  = "${var.name_prefix}-storage-logs"
  retention_days = 30
  
  description = "Storage access logs for ${var.environment}"
}

resource "google_logging_project_sink" "storage_sink" {
  count = var.enable_access_logging ? 1 : 0
  
  name        = "${var.name_prefix}-storage-sink"
  destination = "logging.googleapis.com/projects/${var.project_id}/locations/${var.region}/buckets/${google_logging_bucket_config.storage_logs[0].bucket_id}"
  
  filter = <<-EOT
    resource.type="gcs_bucket"
    OR resource.type="storage.googleapis.com/Bucket"
  EOT
  
  unique_writer_identity = true
}