# Development Environment Main Configuration

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.10"
    }
    google-beta = {
      source  = "hashicorp/google-beta" 
      version = "~> 5.10"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }

  # Configure backend for remote state storage
  backend "gcs" {
    bucket = "agentworks-terraform-state-dev"  # Create this bucket manually first
    prefix = "environments/dev"
  }
}

# Use the main module with dev-specific overrides
module "agentworks_dev" {
  source = "../../"
  
  # Project configuration
  project_id   = var.project_id
  project_name = var.project_name
  environment  = var.environment
  
  # Geographic configuration
  region       = var.region
  zone         = var.zone
  multi_region = var.multi_region
  
  # Networking
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidr  = var.public_subnet_cidr
  private_subnet_cidr = var.private_subnet_cidr
  
  # Database configuration
  database_tier                  = var.database_tier
  database_disk_size            = var.database_disk_size
  database_backup_retention_days = var.database_backup_retention_days
  enable_alloy_db               = var.enable_alloy_db
  
  # Cloud Run configuration
  cloud_run_cpu         = var.cloud_run_cpu
  cloud_run_memory      = var.cloud_run_memory
  cloud_run_min_instances = var.cloud_run_min_instances
  cloud_run_max_instances = var.cloud_run_max_instances
  cloud_run_concurrency = var.cloud_run_concurrency
  
  # Security
  allowed_ip_ranges = var.allowed_ip_ranges
  enable_armor      = var.enable_armor
  
  # Repository configuration
  github_repo_owner = var.github_repo_owner
  github_repo_name  = var.github_repo_name
  
  # API keys
  openai_api_key        = var.openai_api_key
  anthropic_api_key     = var.anthropic_api_key
  google_ai_api_key     = var.google_ai_api_key
  nanobanana_api_key    = var.nanobanana_api_key
  stripe_secret_key     = var.stripe_secret_key
  stripe_publishable_key = var.stripe_publishable_key
  
  # Feature flags
  enable_redis_cache = var.enable_redis_cache
  enable_cdn        = var.enable_cdn
  enable_firestore  = var.enable_firestore
  enable_monitoring = var.enable_monitoring
  
  # Resource limits
  max_replicas    = var.max_replicas
  request_timeout = var.request_timeout
}

# Development-specific resources

# Enable additional APIs for development
resource "google_project_service" "dev_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "containerregistry.googleapis.com",
    "clouddebugger.googleapis.com",
    "cloudprofiler.googleapis.com"
  ])
  
  service            = each.value
  disable_on_destroy = false
  project           = var.project_id
}

# Development debugging tools
resource "google_project_service" "cloud_debugger" {
  service            = "clouddebugger.googleapis.com"
  disable_on_destroy = false
  project           = var.project_id
}

# Cloud Shell development environment setup script
resource "local_file" "dev_setup_script" {
  filename = "${path.root}/../../scripts/dev-setup.sh"
  
  content = templatefile("${path.module}/templates/dev-setup.sh.tpl", {
    project_id = var.project_id
    region     = var.region
    environment = var.environment
  })
  
  file_permission = "0755"
}

# Development database seeding (optional)
resource "local_file" "seed_script" {
  filename = "${path.root}/../../scripts/seed-dev-data.sh"
  
  content = templatefile("${path.module}/templates/seed-dev-data.sh.tpl", {
    project_id = var.project_id
    region     = var.region
    database_url = module.agentworks_dev.application_config.DATABASE_CONNECTION_NAME
  })
  
  file_permission = "0755"
}