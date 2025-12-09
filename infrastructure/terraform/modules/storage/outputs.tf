# Storage Module Outputs

# Bucket names
output "logs_bucket_name" {
  description = "Logs storage bucket name"
  value       = google_storage_bucket.logs.name
}

output "exports_bucket_name" {
  description = "Exports storage bucket name"
  value       = google_storage_bucket.exports.name
}

output "uploads_bucket_name" {
  description = "Uploads storage bucket name"
  value       = google_storage_bucket.uploads.name
}

output "terraform_state_bucket_name" {
  description = "Terraform state storage bucket name"
  value       = var.create_terraform_state_bucket ? google_storage_bucket.terraform_state[0].name : null
}

output "static_assets_bucket_name" {
  description = "Static assets storage bucket name"
  value       = var.enable_cdn ? google_storage_bucket.static_assets[0].name : null
}

# Bucket URLs
output "logs_bucket_url" {
  description = "Logs storage bucket URL"
  value       = google_storage_bucket.logs.url
}

output "exports_bucket_url" {
  description = "Exports storage bucket URL"
  value       = google_storage_bucket.exports.url
}

output "uploads_bucket_url" {
  description = "Uploads storage bucket URL"
  value       = google_storage_bucket.uploads.url
}

output "static_assets_bucket_url" {
  description = "Static assets storage bucket URL"
  value       = var.enable_cdn ? google_storage_bucket.static_assets[0].url : null
}

# Bucket self links
output "logs_bucket_self_link" {
  description = "Logs storage bucket self link"
  value       = google_storage_bucket.logs.self_link
}

output "exports_bucket_self_link" {
  description = "Exports storage bucket self link"
  value       = google_storage_bucket.exports.self_link
}

output "uploads_bucket_self_link" {
  description = "Uploads storage bucket self link"
  value       = google_storage_bucket.uploads.self_link
}

# Bucket configuration for applications
output "storage_config" {
  description = "Storage configuration for applications"
  value = {
    logs = {
      name     = google_storage_bucket.logs.name
      url      = google_storage_bucket.logs.url
      location = google_storage_bucket.logs.location
      class    = google_storage_bucket.logs.storage_class
    }
    exports = {
      name     = google_storage_bucket.exports.name
      url      = google_storage_bucket.exports.url
      location = google_storage_bucket.exports.location
      class    = google_storage_bucket.exports.storage_class
    }
    uploads = {
      name     = google_storage_bucket.uploads.name
      url      = google_storage_bucket.uploads.url
      location = google_storage_bucket.uploads.location
      class    = google_storage_bucket.uploads.storage_class
    }
    static_assets = var.enable_cdn ? {
      name     = google_storage_bucket.static_assets[0].name
      url      = google_storage_bucket.static_assets[0].url
      location = google_storage_bucket.static_assets[0].location
      class    = google_storage_bucket.static_assets[0].storage_class
    } : null
    terraform_state = var.create_terraform_state_bucket ? {
      name     = google_storage_bucket.terraform_state[0].name
      url      = google_storage_bucket.terraform_state[0].url
      location = google_storage_bucket.terraform_state[0].location
      class    = google_storage_bucket.terraform_state[0].storage_class
    } : null
  }
}

# All bucket names as a map
output "bucket_names" {
  description = "Map of all bucket names"
  value = merge(
    {
      logs    = google_storage_bucket.logs.name
      exports = google_storage_bucket.exports.name
      uploads = google_storage_bucket.uploads.name
    },
    var.create_terraform_state_bucket ? {
      terraform_state = google_storage_bucket.terraform_state[0].name
    } : {},
    var.enable_cdn ? {
      static_assets = google_storage_bucket.static_assets[0].name
    } : {}
  )
}

# Notification configuration
output "upload_notification_name" {
  description = "Upload notification name"
  value       = google_storage_notification.upload_notification.notification_id
}

# Alert policy names
output "alert_policy_names" {
  description = "Storage monitoring alert policy names"
  value = [
    google_monitoring_alert_policy.storage_usage.name
  ]
}

# Access logging configuration
output "access_logging_config" {
  description = "Access logging configuration"
  value = var.enable_access_logging ? {
    bucket_id = google_logging_bucket_config.storage_logs[0].bucket_id
    sink_name = google_logging_project_sink.storage_sink[0].name
  } : null
}