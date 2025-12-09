# AgentWorks - Deployment and Infrastructure-as-Code

**Version:** 1.0  
**Date:** 2025-12-02  
**Owner:** Architect Agent  
**Status:** Production Ready  

---

## 1. Infrastructure Overview

The AgentWorks platform is deployed on Google Cloud Platform (GCP) using Infrastructure-as-Code (IaC) with Terraform, containerized services on Cloud Run, and managed databases with AlloyDB. The infrastructure follows cloud-native patterns with auto-scaling, high availability, and security best practices.

### 1.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Production Environment                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Global CDN    │  │  Load Balancer  │  │   Cloud Armor   │
│   (Cloud CDN)   │→ │  (HTTPS/SSL)    │→ │  (DDoS/WAF)     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │    API Gateway    │
                    │   (Cloud Run)     │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────┐    ┌──────────▼──────┐    ┌─────────▼──────┐
│   Core     │    │     Agent       │    │   Provider     │
│  Service   │    │  Orchestrator   │    │    Router      │
│(Cloud Run) │    │  (Cloud Run)    │    │  (Cloud Run)   │
└───────┬────┘    └──────────┬──────┘    └─────────┬──────┘
        │                    │                     │
        └─────────┬──────────┼─────────────────────┘
                  │          │
            ┌─────▼──────────▼─────┐
            │    Event Bus         │
            │    (Pub/Sub)         │
            └─────────┬────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼────┐ ┌──────▼──────┐ ┌───▼────────┐
│  AlloyDB   │ │ Firestore   │ │   Redis    │
│(PostgreSQL)│ │ (Documents) │ │  (Cache)   │
└────────────┘ └─────────────┘ └────────────┘
```

---

## 2. Terraform Infrastructure Configuration

### 2.1 Main Infrastructure Configuration

```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
  
  backend "gcs" {
    bucket  = "agentworks-terraform-state"
    prefix  = "terraform/state"
  }
}

# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "agentworks.dev"
}

# Local values
locals {
  common_labels = {
    project     = "agentworks"
    environment = var.environment
    managed-by  = "terraform"
  }
  
  db_name = "${var.environment}-agentworks-db"
  vpc_name = "${var.environment}-agentworks-vpc"
}
```

### 2.2 Networking Infrastructure

```hcl
# terraform/networking.tf

# VPC Network
resource "google_compute_network" "agentworks_vpc" {
  name                    = local.vpc_name
  auto_create_subnetworks = false
  description            = "AgentWorks ${var.environment} VPC"
  
  depends_on = [google_project_service.compute]
}

# Public subnet for load balancers
resource "google_compute_subnetwork" "public" {
  name          = "${var.environment}-agentworks-public"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.agentworks_vpc.id
  description   = "Public subnet for load balancers"
  
  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling       = 0.5
    metadata           = "INCLUDE_ALL_METADATA"
  }
}

# Private subnet for services
resource "google_compute_subnetwork" "private" {
  name                     = "${var.environment}-agentworks-private"
  ip_cidr_range           = "10.0.2.0/24"
  region                  = var.region
  network                 = google_compute_network.agentworks_vpc.id
  private_ip_google_access = true
  description             = "Private subnet for Cloud Run services"
  
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }
  
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/16"
  }
}

# Database subnet
resource "google_compute_subnetwork" "database" {
  name          = "${var.environment}-agentworks-database"
  ip_cidr_range = "10.0.3.0/24"
  region        = var.region
  network       = google_compute_network.agentworks_vpc.id
  description   = "Database subnet with restricted access"
}

# VPC Connector for Cloud Run
resource "google_vpc_access_connector" "agentworks_connector" {
  name           = "${var.environment}-agentworks-connector"
  ip_cidr_range  = "10.8.0.0/28"
  network        = google_compute_network.agentworks_vpc.id
  region         = var.region
  max_throughput = var.environment == "prod" ? 1000 : 200
  
  depends_on = [google_project_service.vpcaccess]
}

# Cloud NAT for outbound traffic
resource "google_compute_router" "agentworks_router" {
  name    = "${var.environment}-agentworks-router"
  region  = var.region
  network = google_compute_network.agentworks_vpc.id
  
  bgp {
    asn = 64514
  }
}

resource "google_compute_router_nat" "agentworks_nat" {
  name                               = "${var.environment}-agentworks-nat"
  router                            = google_compute_router.agentworks_router.name
  region                            = var.region
  nat_ip_allocate_option            = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
```

### 2.3 Security Configuration

```hcl
# terraform/security.tf

# Cloud Armor security policy
resource "google_compute_security_policy" "agentworks_security_policy" {
  name        = "${var.environment}-agentworks-security-policy"
  description = "Security policy for AgentWorks ${var.environment}"
  
  # Default rule - allow
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }
  
  # Block known malicious IPs
  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = var.blocked_ip_ranges
      }
    }
    description = "Block malicious IP ranges"
  }
  
  # Rate limiting rule
  rule {
    action   = "throttle"
    priority = "2000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Throttle requests"
    
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }
  }
  
  # Geographic restrictions for production
  dynamic "rule" {
    for_each = var.environment == "prod" ? [1] : []
    content {
      action   = "deny(403)"
      priority = "1500"
      match {
        expr {
          expression = "origin.region_code == 'CN' || origin.region_code == 'RU' || origin.region_code == 'KP'"
        }
      }
      description = "Block high-risk countries"
    }
  }
}

# Firewall rules
resource "google_compute_firewall" "deny_all_ingress" {
  name    = "${var.environment}-agentworks-deny-all"
  network = google_compute_network.agentworks_vpc.name
  
  deny {
    protocol = "all"
  }
  
  direction     = "INGRESS"
  priority      = 65534
  source_ranges = ["0.0.0.0/0"]
  description   = "Deny all ingress traffic by default"
}

resource "google_compute_firewall" "allow_lb_to_backends" {
  name    = "${var.environment}-agentworks-allow-lb"
  network = google_compute_network.agentworks_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["8080"]
  }
  
  direction     = "INGRESS"
  priority      = 1000
  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"] # Google LB ranges
  target_tags   = ["cloud-run-service"]
  description   = "Allow load balancer health checks and traffic"
}

resource "google_compute_firewall" "allow_internal" {
  name    = "${var.environment}-agentworks-allow-internal"
  network = google_compute_network.agentworks_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080", "9090"]
  }
  
  allow {
    protocol = "icmp"
  }
  
  direction     = "INGRESS"
  priority      = 1000
  source_ranges = ["10.0.0.0/8"]
  description   = "Allow internal VPC communication"
}
```

### 2.4 Database Infrastructure

```hcl
# terraform/database.tf

# AlloyDB Cluster
resource "google_alloydb_cluster" "agentworks_cluster" {
  cluster_id   = "${var.environment}-agentworks-cluster"
  location     = var.region
  network      = google_compute_network.agentworks_vpc.id
  display_name = "AgentWorks ${var.environment} Cluster"
  
  database_version = "POSTGRES_15"
  
  initial_user {
    user     = "agentworks_admin"
    password = random_password.db_admin_password.result
  }
  
  automated_backup_policy {
    location      = var.region
    backup_window = "23:00"
    
    enabled = true
    
    weekly_schedule {
      days_of_week = ["SUNDAY"]
      start_times = ["23:00"]
    }
    
    quantity_based_retention {
      count = var.environment == "prod" ? 30 : 7
    }
  }
  
  encryption_config {
    kms_key_name = google_kms_crypto_key.database_key.id
  }
  
  labels = local.common_labels
  
  depends_on = [
    google_project_service.alloydb,
    google_service_networking_connection.private_service_connection
  ]
}

# Primary AlloyDB Instance
resource "google_alloydb_instance" "agentworks_primary" {
  cluster       = google_alloydb_cluster.agentworks_cluster.name
  instance_id   = "${var.environment}-agentworks-primary"
  instance_type = "PRIMARY"
  display_name  = "AgentWorks ${var.environment} Primary"
  
  machine_config {
    cpu_count = var.environment == "prod" ? 8 : 2
  }
  
  database_flags = {
    "log_statement" = "all"
    "log_duration"  = "on"
    "shared_preload_libraries" = "pg_stat_statements"
  }
  
  availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
}

# Read Replica (Production only)
resource "google_alloydb_instance" "agentworks_replica" {
  count = var.environment == "prod" ? 1 : 0
  
  cluster       = google_alloydb_cluster.agentworks_cluster.name
  instance_id   = "${var.environment}-agentworks-replica"
  instance_type = "READ_POOL"
  display_name  = "AgentWorks ${var.environment} Read Replica"
  
  machine_config {
    cpu_count = 4
  }
  
  read_pool_config {
    node_count = 2
  }
}

# Database password
resource "random_password" "db_admin_password" {
  length  = 32
  special = true
}

# Store database credentials in Secret Manager
resource "google_secret_manager_secret" "db_admin_password" {
  secret_id = "${var.environment}-db-admin-password"
  
  replication {
    auto {}
  }
  
  labels = local.common_labels
}

resource "google_secret_manager_secret_version" "db_admin_password" {
  secret      = google_secret_manager_secret.db_admin_password.id
  secret_data = random_password.db_admin_password.result
}

# Private Service Connection for AlloyDB
resource "google_compute_global_address" "private_ip_address" {
  name          = "${var.environment}-agentworks-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.agentworks_vpc.id
}

resource "google_service_networking_connection" "private_service_connection" {
  network                 = google_compute_network.agentworks_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}
```

### 2.5 Cloud Run Services

```hcl
# terraform/cloudrun.tf

# API Gateway Service
resource "google_cloud_run_v2_service" "api_gateway" {
  name     = "${var.environment}-agentworks-api"
  location = var.region
  
  template {
    max_instance_request_concurrency = 100
    timeout                          = "300s"
    service_account                  = google_service_account.api_gateway.email
    
    scaling {
      min_instance_count = var.environment == "prod" ? 2 : 1
      max_instance_count = var.environment == "prod" ? 100 : 10
    }
    
    vpc_access {
      connector = google_vpc_access_connector.agentworks_connector.id
      egress    = "ALL_TRAFFIC"
    }
    
    containers {
      image = "gcr.io/${var.project_id}/agentworks-api:${var.app_version}"
      
      resources {
        limits = {
          cpu    = var.environment == "prod" ? "2000m" : "1000m"
          memory = var.environment == "prod" ? "2Gi" : "1Gi"
        }
        cpu_idle = true
      }
      
      ports {
        container_port = 8080
      }
      
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      
      env {
        name  = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name  = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.redis_url.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name  = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt_secret.secret_id
            version = "latest"
          }
        }
      }
      
      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 30
        timeout_seconds      = 5
        period_seconds       = 10
        failure_threshold    = 3
      }
      
      liveness_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 30
        timeout_seconds      = 5
        period_seconds       = 30
        failure_threshold    = 3
      }
    }
    
    labels = local.common_labels
  }
  
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
  
  depends_on = [
    google_project_service.run,
    google_secret_manager_secret.database_url
  ]
}

# Agent Orchestrator Service
resource "google_cloud_run_v2_service" "agent_orchestrator" {
  name     = "${var.environment}-agentworks-orchestrator"
  location = var.region
  
  template {
    max_instance_request_concurrency = 10 # Lower concurrency for agent processing
    timeout                          = "900s" # 15 minutes for long-running agent tasks
    service_account                  = google_service_account.agent_orchestrator.email
    
    scaling {
      min_instance_count = var.environment == "prod" ? 1 : 0
      max_instance_count = var.environment == "prod" ? 20 : 5
    }
    
    vpc_access {
      connector = google_vpc_access_connector.agentworks_connector.id
      egress    = "ALL_TRAFFIC"
    }
    
    containers {
      image = "gcr.io/${var.project_id}/agentworks-orchestrator:${var.app_version}"
      
      resources {
        limits = {
          cpu    = "2000m"
          memory = "2Gi"
        }
        cpu_idle = false # Keep CPU active for agent processing
      }
      
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      
      env {
        name  = "PUBSUB_PROJECT_ID"
        value = var.project_id
      }
      
      env {
        name  = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.openai_api_key.secret_id
            version = "latest"
          }
        }
      }
      
      env {
        name  = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.anthropic_api_key.secret_id
            version = "latest"
          }
        }
      }
    }
  }
  
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# Provider Router Service
resource "google_cloud_run_v2_service" "provider_router" {
  name     = "${var.environment}-agentworks-provider-router"
  location = var.region
  
  template {
    max_instance_request_concurrency = 50
    timeout                          = "120s"
    service_account                  = google_service_account.provider_router.email
    
    scaling {
      min_instance_count = var.environment == "prod" ? 2 : 1
      max_instance_count = var.environment == "prod" ? 30 : 10
    }
    
    vpc_access {
      connector = google_vpc_access_connector.agentworks_connector.id
      egress    = "ALL_TRAFFIC"
    }
    
    containers {
      image = "gcr.io/${var.project_id}/agentworks-provider-router:${var.app_version}"
      
      resources {
        limits = {
          cpu    = "1000m"
          memory = "1Gi"
        }
      }
      
      # Environment variables for all provider API keys
      dynamic "env" {
        for_each = var.llm_providers
        content {
          name = "${upper(env.key)}_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.llm_api_keys[env.key].secret_id
              version = "latest"
            }
          }
        }
      }
    }
  }
  
  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}
```

### 2.6 Service Accounts and IAM

```hcl
# terraform/iam.tf

# API Gateway Service Account
resource "google_service_account" "api_gateway" {
  account_id   = "${var.environment}-agentworks-api"
  display_name = "AgentWorks API Gateway Service Account"
  description  = "Service account for AgentWorks API Gateway"
}

# Agent Orchestrator Service Account
resource "google_service_account" "agent_orchestrator" {
  account_id   = "${var.environment}-agentworks-orchestrator"
  display_name = "AgentWorks Agent Orchestrator Service Account"
  description  = "Service account for AgentWorks Agent Orchestrator"
}

# Provider Router Service Account
resource "google_service_account" "provider_router" {
  account_id   = "${var.environment}-agentworks-router"
  display_name = "AgentWorks Provider Router Service Account"
  description  = "Service account for AgentWorks Provider Router"
}

# IAM bindings for API Gateway
resource "google_project_iam_member" "api_gateway_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_gateway.email}"
}

resource "google_project_iam_member" "api_gateway_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api_gateway.email}"
}

resource "google_project_iam_member" "api_gateway_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.api_gateway.email}"
}

# IAM bindings for Agent Orchestrator
resource "google_project_iam_member" "orchestrator_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.agent_orchestrator.email}"
}

resource "google_project_iam_member" "orchestrator_pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.agent_orchestrator.email}"
}

resource "google_project_iam_member" "orchestrator_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.agent_orchestrator.email}"
}

# IAM bindings for Provider Router
resource "google_project_iam_member" "router_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.provider_router.email}"
}

resource "google_project_iam_member" "router_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.provider_router.email}"
}

# Custom IAM role for database access
resource "google_project_iam_custom_role" "database_accessor" {
  role_id     = "${var.environment}_agentworks_db_accessor"
  title       = "AgentWorks Database Accessor"
  description = "Custom role for AgentWorks database access"
  
  permissions = [
    "alloydb.clusters.get",
    "alloydb.instances.get",
    "alloydb.instances.list"
  ]
}
```

---

## 3. Container Configuration

### 3.1 Dockerfile for API Gateway

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile --production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./

# Copy source code
COPY . .

# Install pnpm and all dependencies (including dev)
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build the application
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set environment
ENV NODE_ENV=production

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Create directory for logs
RUN mkdir logs && chown nextjs:nodejs logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
```

### 3.2 Multi-stage Build for Frontend

```dockerfile
# apps/web/Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_ENVIRONMENT

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT

RUN npm install -g pnpm
RUN pnpm build

# Production image with Nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy startup script
COPY startup.sh /docker-entrypoint.d/

# Make startup script executable
RUN chmod +x /docker-entrypoint.d/startup.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

### 3.3 Docker Compose for Local Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: agentworks
      POSTGRES_PASSWORD: development
      POSTGRES_DB: agentworks_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agentworks"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      target: base
    command: pnpm --filter @agentworks/api dev
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://agentworks:development@postgres:5432/agentworks_dev
      REDIS_URL: redis://redis:6379
      JWT_SECRET: development-secret-key
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      target: base
    command: pnpm --filter @agentworks/web dev
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:8080
      VITE_WS_URL: ws://localhost:8080
      VITE_ENVIRONMENT: development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - api

  orchestrator:
    build:
      context: .
      dockerfile: apps/orchestrator/Dockerfile
      target: base
    command: pnpm --filter @agentworks/orchestrator dev
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://agentworks:development@postgres:5432/agentworks_dev
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    driver: bridge
```

---

## 4. CI/CD Pipeline Configuration

### 4.1 Cloud Build Configuration

```yaml
# cloudbuild.yaml
steps:
  # Install dependencies
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm install -g pnpm
        pnpm install --frozen-lockfile
    
  # Run tests
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm install -g pnpm
        pnpm test
        pnpm lint
        pnpm typecheck
    env:
      - 'NODE_ENV=test'
    
  # Build API image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/agentworks-api:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/agentworks-api:latest'
      - '-f'
      - 'apps/api/Dockerfile'
      - '.'
    
  # Build Web image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/agentworks-web:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/agentworks-web:latest'
      - '-f'
      - 'apps/web/Dockerfile'
      - '--build-arg'
      - 'VITE_API_URL=${_API_URL}'
      - '--build-arg'
      - 'VITE_ENVIRONMENT=${_ENVIRONMENT}'
      - '.'
    
  # Build Orchestrator image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/agentworks-orchestrator:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/agentworks-orchestrator:latest'
      - '-f'
      - 'apps/orchestrator/Dockerfile'
      - '.'
    
  # Push images
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/agentworks-api:$COMMIT_SHA']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/agentworks-api:latest']
    
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/agentworks-web:$COMMIT_SHA']
    
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/agentworks-web:latest']
    
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/agentworks-orchestrator:$COMMIT_SHA']
    
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/agentworks-orchestrator:latest']
  
  # Deploy to Cloud Run (production only)
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        if [ "$BRANCH_NAME" = "main" ]; then
          echo "Deploying to production..."
          
          # Deploy API service
          gcloud run deploy agentworks-api \
            --image gcr.io/$PROJECT_ID/agentworks-api:$COMMIT_SHA \
            --region us-central1 \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars="NODE_ENV=production" \
            --memory=1Gi \
            --cpu=1 \
            --max-instances=100 \
            --min-instances=2
          
          # Deploy Web service  
          gcloud run deploy agentworks-web \
            --image gcr.io/$PROJECT_ID/agentworks-web:$COMMIT_SHA \
            --region us-central1 \
            --platform managed \
            --allow-unauthenticated \
            --memory=512Mi \
            --cpu=1 \
            --max-instances=50 \
            --min-instances=1
            
          # Deploy Orchestrator service
          gcloud run deploy agentworks-orchestrator \
            --image gcr.io/$PROJECT_ID/agentworks-orchestrator:$COMMIT_SHA \
            --region us-central1 \
            --platform managed \
            --no-allow-unauthenticated \
            --memory=2Gi \
            --cpu=2 \
            --max-instances=20 \
            --min-instances=1
        else
          echo "Skipping deployment for branch: $BRANCH_NAME"
        fi

# Build timeout
timeout: 3600s

# Build options
options:
  machineType: 'E2_HIGHCPU_8'
  diskSizeGb: 100
  
# Substitutions
substitutions:
  _API_URL: 'https://api.agentworks.dev'
  _ENVIRONMENT: 'production'

# Images to be pushed to Container Registry
images:
  - 'gcr.io/$PROJECT_ID/agentworks-api:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/agentworks-api:latest'
  - 'gcr.io/$PROJECT_ID/agentworks-web:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/agentworks-web:latest'
  - 'gcr.io/$PROJECT_ID/agentworks-orchestrator:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/agentworks-orchestrator:latest'
```

### 4.2 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy AgentWorks

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  PROJECT_ID: agentworks-prod
  REGION: us-central1
  SERVICE_NAME: agentworks

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: agentworks_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 3s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run linting
        run: pnpm lint
      
      - name: Run type checking
        run: pnpm typecheck
      
      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/agentworks_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
      
      - name: Build packages
        run: pnpm build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: [test, security]
    runs-on: ubuntu-latest
    
    permissions:
      contents: read
      id-token: write
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Configure Docker
        run: gcloud auth configure-docker
      
      - name: Build and Deploy with Cloud Build
        run: |
          gcloud builds submit \
            --config cloudbuild.yaml \
            --substitutions=_ENVIRONMENT=production,_API_URL=https://api.agentworks.dev
      
      - name: Verify deployment
        run: |
          # Wait for deployment to complete
          sleep 60
          
          # Check service health
          API_URL=$(gcloud run services describe agentworks-api --region=$REGION --format='value(status.url)')
          curl -f "$API_URL/health" || exit 1
          
          WEB_URL=$(gcloud run services describe agentworks-web --region=$REGION --format='value(status.url)')
          curl -f "$WEB_URL" || exit 1
      
      - name: Notify deployment
        if: success()
        run: |
          echo "✅ Deployment successful!"
          echo "API: https://api.agentworks.dev"
          echo "Web: https://app.agentworks.dev"
```

---

## 5. Monitoring and Observability Setup

### 5.1 Monitoring Configuration

```hcl
# terraform/monitoring.tf

# Notification channel for alerts
resource "google_monitoring_notification_channel" "email" {
  display_name = "AgentWorks ${var.environment} Email Alerts"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }
  force_delete = false
}

# Uptime check for API health
resource "google_monitoring_uptime_check_config" "api_health" {
  display_name = "AgentWorks API Health Check"
  timeout      = "10s"
  period       = "300s"
  
  http_check {
    path           = "/health"
    port           = "443"
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
  }
  
  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.domain_name
    }
  }
  
  content_matchers {
    content = "healthy"
    matcher = "CONTAINS_STRING"
  }
  
  selected_regions = ["USA", "EUROPE"]
}

# Alert policy for API downtime
resource "google_monitoring_alert_policy" "api_downtime" {
  display_name = "AgentWorks API Downtime"
  combiner     = "OR"
  
  conditions {
    display_name = "Uptime check failure"
    
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\""
      duration        = "300s"
      comparison      = "COMPARISON_EQUAL"
      threshold_value = 1
      
      trigger {
        count = 1
      }
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_NEXT_OLDER"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
  
  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert policy for high error rate
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "High Error Rate"
  combiner     = "OR"
  
  conditions {
    display_name = "Error rate > 5%"
    
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\""
      duration        = "300s"
      comparison      = "COMPARISON_GREATER_THAN"
      threshold_value = 0.05
      
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
}

# Dashboard for service metrics
resource "google_monitoring_dashboard" "agentworks_dashboard" {
  dashboard_json = jsonencode({
    displayName = "AgentWorks ${var.environment} Dashboard"
    
    gridLayout = {
      widgets = [
        {
          title = "Request Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\""
                  aggregation = {
                    alignmentPeriod = "300s"
                    perSeriesAligner = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields = ["resource.label.service_name"]
                  }
                }
              }
            }]
          }
        },
        {
          title = "Error Rate"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\""
                  aggregation = {
                    alignmentPeriod = "300s"
                    perSeriesAligner = "ALIGN_RATE"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields = ["metric.label.response_code_class"]
                  }
                }
              }
            }]
          }
        },
        {
          title = "Response Latency"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_latencies\" AND resource.type=\"cloud_run_revision\""
                  aggregation = {
                    alignmentPeriod = "300s"
                    perSeriesAligner = "ALIGN_DELTA"
                    crossSeriesReducer = "REDUCE_PERCENTILE_95"
                    groupByFields = ["resource.label.service_name"]
                  }
                }
              }
            }]
          }
        }
      ]
    }
  })
}
```

This comprehensive deployment and infrastructure-as-code specification provides AgentWorks with a production-ready, scalable, and secure foundation on Google Cloud Platform with automated CI/CD pipelines and comprehensive monitoring.