# AgentWorks Infrastructure Deployment Guide

This guide covers the complete deployment of the AgentWorks platform infrastructure on Google Cloud Platform using Terraform, Docker, and CI/CD automation.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Infrastructure Deployment](#infrastructure-deployment)
- [Application Deployment](#application-deployment)
- [Local Development](#local-development)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## 🚀 Prerequisites

### Required Software

1. **Google Cloud CLI** (gcloud)
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   gcloud init
   ```

2. **Terraform** (>= 1.5.0)
   ```bash
   # macOS
   brew install terraform
   
   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip
   unzip terraform_1.6.6_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

3. **Docker** and **Docker Compose**
   ```bash
   # macOS
   brew install docker docker-compose
   
   # Linux
   sudo apt install docker.io docker-compose
   ```

4. **Node.js** (18.x) and **pnpm**
   ```bash
   # Install Node.js via nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   nvm install 18
   nvm use 18
   
   # Install pnpm
   npm install -g pnpm@9.14.2
   ```

### GCP Prerequisites

1. **Create GCP Projects**
   ```bash
   # Development environment
   gcloud projects create agentworks-dev --name="AgentWorks Development"
   
   # Staging environment (optional)
   gcloud projects create agentworks-staging --name="AgentWorks Staging"
   
   # Production environment
   gcloud projects create agentworks-prod --name="AgentWorks Production"
   ```

2. **Enable Billing**
   - Link billing accounts to all projects
   - Ensure sufficient quotas for Cloud Run, Cloud SQL, etc.

3. **Set up Authentication**
   ```bash
   # Authenticate with GCP
   gcloud auth login
   gcloud auth application-default login
   
   # Set default project
   gcloud config set project agentworks-dev
   ```

## 🛠 Initial Setup

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone <repository-url>
cd agentworks

# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env.local
```

### 2. API Keys Setup

Obtain API keys from the following providers:

1. **OpenAI**: https://platform.openai.com/api-keys
2. **Anthropic**: https://console.anthropic.com/
3. **Google AI**: https://makersuite.google.com/app/apikey
4. **Stripe**: https://dashboard.stripe.com/apikeys (for billing)

### 3. Create Terraform State Buckets

```bash
# Create state buckets for each environment
gsutil mb -p agentworks-dev -l us-central1 gs://agentworks-terraform-state-dev
gsutil mb -p agentworks-staging -l us-central1 gs://agentworks-terraform-state-staging
gsutil mb -p agentworks-prod -l us-central1 gs://agentworks-terraform-state-prod

# Enable versioning
gsutil versioning set on gs://agentworks-terraform-state-dev
gsutil versioning set on gs://agentworks-terraform-state-staging
gsutil versioning set on gs://agentworks-terraform-state-prod
```

## ⚙️ Environment Configuration

### 1. Configure Development Environment

```bash
cd infrastructure/terraform/environments/dev

# Edit terraform.tfvars
vim terraform.tfvars
```

**Required configurations in `terraform.tfvars`:**

```hcl
# Project configuration
project_id = "agentworks-dev"  # Your actual project ID

# Repository configuration
github_repo_owner = "your-github-username"
github_repo_name  = "agentworks"

# API keys (or set via environment variables)
openai_api_key     = "sk-..."
anthropic_api_key  = "sk-ant-..."
google_ai_api_key  = "..."
stripe_secret_key  = "sk_test_..."
stripe_publishable_key = "pk_test_..."
```

### 2. Store Sensitive Variables

For production environments, use environment variables:

```bash
# Set sensitive environment variables
export TF_VAR_openai_api_key="sk-..."
export TF_VAR_anthropic_api_key="sk-ant-..."
export TF_VAR_google_ai_api_key="..."
export TF_VAR_stripe_secret_key="sk_..."
export TF_VAR_stripe_publishable_key="pk_..."
```

## 🗄️ Database Setup

### 1. Initialize Database Schema

The database schema is managed through migrations in `packages/db/migrations/`:

- `001_initial_schema.sql` - Core tables and relationships
- `002_logging_and_billing.sql` - Logging, audit, and billing tables
- `003_seed_data.sql` - Default agents and development data

### 2. Migration Strategy

Migrations are automatically applied during deployment via Cloud Build, but can be run manually:

```bash
# Generate Prisma client
pnpm --filter @agentworks/db generate

# Run migrations manually (if needed)
pnpm --filter @agentworks/db migrate

# Seed development data
pnpm --filter @agentworks/db seed
```

## 🚀 Infrastructure Deployment

### 1. Development Environment

```bash
cd infrastructure/terraform/environments/dev

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply infrastructure
terraform apply
```

### 2. Staging Environment

```bash
cd infrastructure/terraform/environments/staging

# Update project ID and configuration
cp ../dev/terraform.tfvars .
# Edit staging-specific values

terraform init
terraform plan
terraform apply
```

### 3. Production Environment

```bash
cd infrastructure/terraform/environments/prod

# Use production configuration
cp ../staging/terraform.tfvars .
# Edit production-specific values (AlloyDB, higher limits, etc.)

terraform init
terraform plan
terraform apply
```

### 4. Verify Infrastructure

```bash
# Check Cloud Run services
gcloud run services list

# Check database
gcloud sql instances list

# Check Pub/Sub topics
gcloud pubsub topics list

# Check storage buckets
gsutil ls

# Check monitoring
gcloud logging sinks list
```

## 🏗️ Application Deployment

### 1. Manual Deployment (First Time)

```bash
# Build and push all services
./scripts/build-and-deploy.sh

# Or build individual services:
cd apps/web
gcloud builds submit --tag gcr.io/PROJECT-ID/frontend
gcloud run deploy frontend --image gcr.io/PROJECT-ID/frontend
```

### 2. CI/CD Pipeline

The Cloud Build pipeline is automatically configured by Terraform:

1. **Triggers**:
   - Main branch push → Deploy to staging/production
   - Pull request → Run tests
   - Manual trigger → Deploy specific version

2. **Pipeline Steps**:
   - Install dependencies
   - Run tests and linting
   - Build Docker images
   - Push to Artifact Registry
   - Deploy to Cloud Run
   - Run database migrations
   - Health checks

### 3. Manual Trigger

```bash
# Trigger manual deployment
gcloud builds triggers run agentworks-dev-manual-deploy --branch=main
```

## 🛠️ Local Development

### 1. Setup Development Environment

```bash
# Run the development setup script
chmod +x infrastructure/terraform/environments/dev/templates/dev-setup.sh
./scripts/dev-setup.sh
```

### 2. Start Local Services with Docker

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up postgres redis api-gateway

# View logs
docker-compose logs -f api-gateway
```

### 3. Start Local Development Servers

```bash
# Start all development servers
pnpm dev

# Or start individual services:
pnpm --filter @agentworks/web dev
pnpm --filter @agentworks/api dev
```

### 4. Development Tools

```bash
# Database management
./scripts/db-dev.sh migrate    # Run migrations
./scripts/db-dev.sh seed       # Seed data
./scripts/db-dev.sh reset      # Reset database
./scripts/db-dev.sh studio     # Open Prisma Studio

# View development logs
tail -f cloud_sql_proxy.log
```

## 📊 Monitoring & Maintenance

### 1. Monitoring Dashboards

Access monitoring through Terraform outputs:

```bash
# Get monitoring URLs
terraform output monitoring_urls

# Or access directly:
# - Cloud Monitoring: https://console.cloud.google.com/monitoring
# - Cloud Run: https://console.cloud.google.com/run
# - Cloud Build: https://console.cloud.google.com/cloud-build
# - Logs: https://console.cloud.google.com/logs
```

### 2. Health Checks

All services include health check endpoints:

```bash
# Check service health
curl https://your-api-gateway-url/health
curl https://your-frontend-url/api/health
```

### 3. Backup and Recovery

```bash
# Manual database backup
gcloud sql export sql agentworks-dev-postgres-instance \
  gs://agentworks-dev-backups/backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
gcloud sql import sql agentworks-dev-postgres-instance \
  gs://agentworks-dev-backups/backup-YYYYMMDD-HHMMSS.sql
```

### 4. Scaling

```bash
# Scale Cloud Run services
gcloud run services update api-gateway \
  --max-instances=20 \
  --min-instances=2

# Scale database
gcloud sql instances patch agentworks-dev-postgres \
  --tier=db-custom-4-16384
```

## 🔧 Troubleshooting

### Common Issues

1. **Cloud SQL Connection Issues**
   ```bash
   # Check Cloud SQL Proxy
   cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432
   
   # Test connection
   psql postgresql://user:pass@localhost:5432/dbname
   ```

2. **Cloud Build Failures**
   ```bash
   # View build logs
   gcloud builds log BUILD-ID
   
   # Common fixes:
   # - Check API quotas
   # - Verify service account permissions
   # - Check Docker image sizes
   ```

3. **Cloud Run Deployment Issues**
   ```bash
   # Check service logs
   gcloud logs read "resource.type=cloud_run_revision" --limit=50
   
   # Check service configuration
   gcloud run services describe SERVICE-NAME --region=REGION
   ```

4. **Secret Manager Issues**
   ```bash
   # List secrets
   gcloud secrets list
   
   # Check secret access
   gcloud secrets versions access latest --secret="secret-name"
   ```

### Performance Issues

1. **Database Performance**
   ```sql
   -- Check slow queries
   SELECT query, calls, total_time, mean_time 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC;
   
   -- Check connections
   SELECT count(*) FROM pg_stat_activity;
   ```

2. **Cloud Run Performance**
   ```bash
   # Check metrics
   gcloud monitoring metrics list
   
   # Check instance utilization
   gcloud run services describe SERVICE --region=REGION
   ```

### Recovery Procedures

1. **Database Recovery**
   ```bash
   # Point-in-time recovery
   gcloud sql backups restore BACKUP-ID \
     --restore-instance=NEW-INSTANCE-ID \
     --backup-instance=SOURCE-INSTANCE-ID
   ```

2. **Service Recovery**
   ```bash
   # Rollback deployment
   gcloud run services update SERVICE-NAME \
     --image=PREVIOUS-IMAGE-URL
   ```

3. **Complete Environment Recovery**
   ```bash
   # Recreate infrastructure
   cd infrastructure/terraform/environments/ENVIRONMENT
   terraform destroy
   terraform apply
   ```

## 📞 Support and Resources

- **Documentation**: `/docs/` directory
- **API Reference**: `https://your-api-url/docs`
- **Monitoring**: Cloud Monitoring dashboards
- **Logs**: Cloud Logging
- **Issues**: GitHub Issues

## 🔄 Maintenance Schedule

- **Daily**: Health check monitoring
- **Weekly**: Review metrics and logs
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Infrastructure cost review and optimization

---

**Next Steps**: Once infrastructure is deployed, proceed with application development following the AgentWorks agent specifications and lane workflows.