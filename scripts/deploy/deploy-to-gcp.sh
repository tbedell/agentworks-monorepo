#!/bin/bash
# AgentWorks GCP Deployment Script
# Builds, migrates, and deploys all services to Cloud Run

set -e

PROJECT_ID=${GCP_PROJECT_ID:-engagesuite-prod}
REGION=${GCP_REGION:-us-central1}

echo "============================================"
echo "   AgentWorks GCP Deployment"
echo "============================================"
echo "Project: $PROJECT_ID"
echo "Region:  $REGION"
echo ""

# 1. Validate prerequisites
echo "[1/6] Validating prerequisites..."
if ! gcloud auth print-access-token > /dev/null 2>&1; then
    echo "ERROR: Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
fi

if ! gcloud config get-value project > /dev/null 2>&1; then
    echo "Setting project to $PROJECT_ID..."
    gcloud config set project $PROJECT_ID
fi

echo "   - GCP authentication: OK"
echo "   - Project configured: $PROJECT_ID"
echo ""

# 2. Build and push images via Cloud Build
echo "[2/6] Building Docker images via Cloud Build..."
echo "   This may take several minutes..."
gcloud builds submit --config=cloudbuild.yaml --project=$PROJECT_ID

echo ""
echo "[3/6] Deploying API service..."
gcloud run deploy api \
    --image=us-central1-docker.pkg.dev/$PROJECT_ID/agentworks/api:latest \
    --region=$REGION \
    --project=$PROJECT_ID \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080 \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --set-secrets=DATABASE_URL=AGENTWORKS_DATABASE_URL:latest

echo ""
echo "[4/6] Deploying Web frontend..."
gcloud run deploy web \
    --image=us-central1-docker.pkg.dev/$PROJECT_ID/agentworks/web:latest \
    --region=$REGION \
    --project=$PROJECT_ID \
    --platform=managed \
    --allow-unauthenticated \
    --port=80 \
    --memory=256Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10

echo ""
echo "[5/6] Deploying Admin frontend..."
gcloud run deploy admin \
    --image=us-central1-docker.pkg.dev/$PROJECT_ID/agentworks/admin:latest \
    --region=$REGION \
    --project=$PROJECT_ID \
    --platform=managed \
    --allow-unauthenticated \
    --port=80 \
    --memory=256Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10

echo ""
echo "[6/6] Deploying Marketing site..."
gcloud run deploy marketing \
    --image=us-central1-docker.pkg.dev/$PROJECT_ID/agentworks/marketing:latest \
    --region=$REGION \
    --project=$PROJECT_ID \
    --platform=managed \
    --allow-unauthenticated \
    --port=80 \
    --memory=256Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10

echo ""
echo "============================================"
echo "   Deployment Complete!"
echo "============================================"
echo ""
echo "Service URLs:"
echo "   API:       https://api.agentworksstudio.com"
echo "   Web App:   https://app.agentworksstudio.com"
echo "   Admin:     https://admin.agentworksstudio.com"
echo "   Marketing: https://agentworksstudio.com"
echo ""
echo "Verify with:"
echo "   curl https://api.agentworksstudio.com/health"
echo ""
