# Development Environment Configuration

# Project configuration
project_id   = "agentworks-dev"  # Replace with your actual GCP project ID
project_name = "agentworks"
environment  = "dev"

# Geographic configuration
region       = "us-central1"
zone         = "us-central1-a"
multi_region = "US"

# Networking
vpc_cidr            = "10.0.0.0/16"
public_subnet_cidr  = "10.0.1.0/24"
private_subnet_cidr = "10.0.2.0/24"

# Database configuration
database_tier              = "db-custom-1-3840"  # 1 vCPU, 3.75GB RAM
database_disk_size         = 50
database_backup_retention_days = 3
enable_alloy_db           = false

# Cloud Run configuration
cloud_run_cpu         = "1"
cloud_run_memory      = "1Gi"
cloud_run_min_instances = 0
cloud_run_max_instances = 3
cloud_run_concurrency = 80

# Security
allowed_ip_ranges = ["0.0.0.0/0"]  # Open for development
enable_armor      = false

# Repository configuration
github_repo_owner = "your-github-username"  # Replace with your GitHub username
github_repo_name  = "agentworks"

# Feature flags
enable_redis_cache = false
enable_cdn        = false
enable_firestore  = true
enable_monitoring = true

# Resource limits (cost optimization for dev)
max_replicas    = 3
request_timeout = 300

# API keys (set via environment variables or terraform.tfvars.local)
# openai_api_key     = "sk-..."
# anthropic_api_key  = "sk-ant-..."
# google_ai_api_key  = "..."
# nanobanana_api_key = "..."
# stripe_secret_key  = "sk_test_..."
# stripe_publishable_key = "pk_test_..."