# Security Module Outputs

# Service Accounts
output "cloud_run_service_account_email" {
  description = "Cloud Run service account email"
  value       = google_service_account.cloud_run_sa.email
}

output "cloud_build_service_account_email" {
  description = "Cloud Build service account email"
  value       = google_service_account.cloud_build_sa.email
}

# Secret Manager Secret IDs
output "secret_names" {
  description = "Map of secret names"
  value = {
    database_url         = google_secret_manager_secret.database_url.secret_id
    database_password    = google_secret_manager_secret.database_password.secret_id
    jwt_secret          = google_secret_manager_secret.jwt_secret.secret_id
    session_secret      = google_secret_manager_secret.session_secret.secret_id
    openai_api_key      = google_secret_manager_secret.openai_api_key.secret_id
    anthropic_api_key   = google_secret_manager_secret.anthropic_api_key.secret_id
    google_ai_api_key   = google_secret_manager_secret.google_ai_api_key.secret_id
    nanobanana_api_key  = google_secret_manager_secret.nanobanana_api_key.secret_id
    stripe_secret_key   = google_secret_manager_secret.stripe_secret_key.secret_id
    stripe_publishable_key = google_secret_manager_secret.stripe_publishable_key.secret_id
  }
}

# Secret Manager Secret references for Cloud Run environment variables
output "database_url_secret_id" {
  description = "Database URL secret reference"
  value       = google_secret_manager_secret.database_url.secret_id
}

output "database_password_secret_id" {
  description = "Database password secret reference"
  value       = google_secret_manager_secret.database_password.secret_id
}

output "jwt_secret_id" {
  description = "JWT secret reference"
  value       = google_secret_manager_secret.jwt_secret.secret_id
}

output "session_secret_id" {
  description = "Session secret reference"
  value       = google_secret_manager_secret.session_secret.secret_id
}

output "openai_api_key_secret_id" {
  description = "OpenAI API key secret reference"
  value       = google_secret_manager_secret.openai_api_key.secret_id
}

output "anthropic_api_key_secret_id" {
  description = "Anthropic API key secret reference"
  value       = google_secret_manager_secret.anthropic_api_key.secret_id
}

output "google_ai_api_key_secret_id" {
  description = "Google AI API key secret reference"
  value       = google_secret_manager_secret.google_ai_api_key.secret_id
}

output "nanobanana_api_key_secret_id" {
  description = "Nano Banana API key secret reference"
  value       = google_secret_manager_secret.nanobanana_api_key.secret_id
}

output "stripe_secret_key_secret_id" {
  description = "Stripe secret key secret reference"
  value       = google_secret_manager_secret.stripe_secret_key.secret_id
}

output "stripe_publishable_key_secret_id" {
  description = "Stripe publishable key secret reference"
  value       = google_secret_manager_secret.stripe_publishable_key.secret_id
}

# Generated secrets
output "database_password" {
  description = "Generated database password"
  value       = random_password.database_password.result
  sensitive   = true
}

output "jwt_secret" {
  description = "Generated JWT secret"
  value       = random_password.jwt_secret.result
  sensitive   = true
}

output "session_secret" {
  description = "Generated session secret"
  value       = random_password.session_secret.result
  sensitive   = true
}

# Custom IAM role
output "agentworks_service_role_id" {
  description = "Custom AgentWorks service role ID"
  value       = google_project_iam_custom_role.agentworks_service_role.id
}