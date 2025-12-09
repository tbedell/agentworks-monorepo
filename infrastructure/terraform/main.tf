# AgentWorks - Main Terraform Configuration
# Infrastructure as Code for GCP deployment

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

  backend "gcs" {
    # Backend configuration will be provided via terraform init
    # bucket = "agentworks-terraform-state-{env}"
    # prefix = "terraform/state"
  }
}

# Configure the Google Cloud Provider
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Local values for resource naming
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
    team        = "platform"
  }
}

# Core infrastructure modules
module "networking" {
  source = "./modules/networking"
  
  project_id    = var.project_id
  region        = var.region
  environment   = var.environment
  name_prefix   = local.name_prefix
  common_labels = local.common_labels
}

module "security" {
  source = "./modules/security"
  
  project_id    = var.project_id
  region        = var.region
  environment   = var.environment
  name_prefix   = local.name_prefix
  common_labels = local.common_labels
}

module "database" {
  source = "./modules/database"
  
  project_id       = var.project_id
  region           = var.region
  environment      = var.environment
  name_prefix      = local.name_prefix
  common_labels    = local.common_labels
  
  # Network configuration
  vpc_network_id   = module.networking.vpc_network_id
  private_subnet_id = module.networking.private_subnet_id
  
  depends_on = [module.networking]
}

module "cloud_run" {
  source = "./modules/cloud_run"
  
  project_id    = var.project_id
  region        = var.region
  environment   = var.environment
  name_prefix   = local.name_prefix
  common_labels = local.common_labels
  
  # Network configuration
  vpc_connector_id = module.networking.vpc_connector_id
  
  # Database connection
  database_connection_name = module.database.connection_name
  database_url_secret     = module.security.database_url_secret_id
  
  depends_on = [module.networking, module.database, module.security]
}

module "monitoring" {
  source = "./modules/monitoring"
  
  project_id       = var.project_id
  region           = var.region
  environment      = var.environment
  name_prefix      = local.name_prefix
  common_labels    = local.common_labels
  
  # Cloud Run services
  cloud_run_services = module.cloud_run.service_names
  
  depends_on = [module.cloud_run]
}

module "storage" {
  source = "./modules/storage"
  
  project_id    = var.project_id
  region        = var.region
  environment   = var.environment
  name_prefix   = local.name_prefix
  common_labels = local.common_labels
}

module "pubsub" {
  source = "./modules/pubsub"
  
  project_id    = var.project_id
  region        = var.region
  environment   = var.environment
  name_prefix   = local.name_prefix
  common_labels = local.common_labels
}

module "build" {
  source = "./modules/build"
  
  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  name_prefix     = local.name_prefix
  common_labels   = local.common_labels
  
  # Repository configuration
  github_repo_owner = var.github_repo_owner
  github_repo_name  = var.github_repo_name
  
  depends_on = [module.cloud_run]
}